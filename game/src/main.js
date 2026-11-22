// Coral Shore — boot, input, the fixed-step loop, screens and saving.
// ?seed=N fixes the world. ?shot=chase|street|combat|garage stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP, VIEW_W, VIEW_H, MISSIONS, WEAPONS, WEAPON_ORDER, SAVE_KEY, BEST_KEY, CAR_TYPES, GARAGE_TIERS } from './config.js';
import { createRandom } from './random.js';
import { buildCity, nearestRoadPoint, hitsBuilding } from './city.js';
import { makeCar, spawnTrafficCar, driveCar, updateTraffic, nearestCar } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { createPolice, addHeat, updatePolice, loseCops } from './police.js';
import { createCombat, fireWeapon, updateEnemies, updateBullets, updateParticles, spawnSmoke, spawnExplosion, spawnSparks } from './combat.js';
import { createMissionState, startMission, updateMission } from './missions.js';
import { createAudio, startAudio, updateAudio, playShot, playBlip, cycleStation } from './audio.js';
import { createCamera, updateCamera, drawWorld } from './render.js';
import { drawHUD, drawWeaponWheel, drawGarage, drawTitle, drawPaused, drawBusted } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

function createGame() {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const game = {
    time: 0, dayNight: 0.15, cash: 250, respect: 5,
    rng, city,
    player: {
      x: city.playerSpawn.x, y: city.playerSpawn.y, angle: 0,
      health: 100, armor: 50, weapon: 'pistol', ammo: 12,
      car: null, onFootSpeed: 230, fireTimer: 0, reloadTimer: 0,
    },
    cars: [], peds: spawnPeds(rng, 46),
    police: createPolice(),
    combat: createCombat(),
    mission: createMissionState(),
    audio: createAudio(),
    camera: createCamera(),
    stats: { missionsDone: 0, carsStolen: 0, kills: 0, cashEarned: 0 },
    unlocked: { smg: false, shotgun: false },
    garageTier: 1,
    toast: null, screen: 'title', wheelOpen: false, garageOpen: false,
    busted: false, danger: 0, districtAtPlayer: 'Downtown',
    mouse: { x: VIEW_W / 2, y: VIEW_H / 2, down: false },
    keys: {},
  };
  // Seed the streets with traffic.
  for (let i = 0; i < 14; i += 1) game.cars.push(spawnTrafficCar(rng, city, game.cars));
  // The player's own starter car waits on the avenue just south of the spawn.
  const starter = makeCar('sedan', city.playerSpawn.x, city.playerSpawn.y + 100, 0, false);
  game.cars.push(starter);
  return game;
}

const game = createGame();
const p = game.player;

function announce(message) {
  status.textContent = message;
}

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.cash, respect: game.respect, missionsDone: game.stats.missionsDone,
      garageTier: game.garageTier, unlocked: game.unlocked,
    }));
    const best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    if (game.stats.missionsDone > best) window.localStorage.setItem(BEST_KEY, String(game.stats.missionsDone));
  } catch { /* storage off: progress lasts this visit only */ }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    game.cash = s.cash ?? 250;
    game.respect = s.respect ?? 5;
    game.stats.missionsDone = s.missionsDone ?? 0;
    game.garageTier = s.garageTier ?? 1;
    game.unlocked = s.unlocked ?? { smg: false, shotgun: false };
  } catch { /* corrupt save: start fresh */ }
}

function districtAt(x) {
  return x < 2000 ? 'Downtown' : x < 2960 ? 'Beachfront' : 'Ocean';
}

// --- Actions ---------------------------------------------------------------

function enterCar() {
  if (p.car) {
    // Step out beside the car.
    const car = p.car;
    p.car = null;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
    p.angle = car.angle;
    announce('On foot.');
    return;
  }
  const car = nearestCar(game.cars, p.x, p.y, 70);
  if (car) {
    p.car = car;
    car.traffic = false;
    announce(`Driving the ${car.spec.name}.`);
  }
}

function stealCar() {
  const car = nearestCar(game.cars, p.x, p.y, 80);
  if (!car || p.car) return;
  if (car.traffic) {
    // Yank the driver out: the car is yours, the law is not pleased.
    car.traffic = false;
    p.car = car;
    game.stats.carsStolen += 1;
    addHeat(game.police, 14);
    game.toast = { text: 'Car stolen — the VCPD saw that', t: 3 };
    announce('Car stolen. Wanted level rising.');
  } else {
    enterCar();
  }
}

function shootAt(tx, ty) {
  if (p.fireTimer > 0 || p.reloadTimer > 0) return;
  const w = WEAPONS[p.weapon];
  if (p.ammo <= 0) {
    p.reloadTimer = 1.1;
    playBlip(game.audio, 220);
    return;
  }
  const angle = Math.atan2(ty - p.y, tx - p.x);
  p.angle = angle;
  fireWeapon(game.combat, p.weapon, p.x, p.y, angle, 'player');
  playShot(game.audio);
  p.ammo -= 1;
  p.fireTimer = w.rate;
  game.danger = 1.2;
  addHeat(game.police, 2);
  if (p.ammo === 0) p.reloadTimer = 1.1;
}

function damagePlayer(amount) {
  const absorbed = Math.min(p.armor, amount * 0.6);
  p.armor -= absorbed;
  p.health -= amount - absorbed;
  if (p.health <= 0) {
    p.health = 0;
    game.busted = true;
    game.screen = 'busted';
    announce('Busted. Press Space to post bail.');
  }
}

function onBusted() {
  game.busted = true;
  game.screen = 'busted';
  game.cash = Math.max(0, game.cash - 200);
  loseCops(game.police);
  announce('Busted. Bail posted: $200.');
}

function buyGarageCar(tier) {
  const t = GARAGE_TIERS[tier - 1];
  if (!t) return;
  if (game.garageTier >= tier) {
    spawnGarageCar(t.car);
    game.garageOpen = false;
    game.screen = 'play';
    return;
  }
  if (game.cash >= t.cost) {
    game.cash -= t.cost;
    game.garageTier = tier;
    spawnGarageCar(t.car);
    game.garageOpen = false;
    game.screen = 'play';
    game.toast = { text: `${CAR_TYPES[t.car].name} bought — Tier ${tier} unlocked`, t: 4 };
  } else {
    playBlip(game.audio, 180);
  }
}

function spawnGarageCar(type) {
  const g = game.city.garage;
  const car = makeCar(type, g.x, g.y + 60, 0, false);
  game.cars.push(car);
  p.car = car;
  p.x = car.x;
  p.y = car.y;
}

// --- Update ----------------------------------------------------------------

function update(dt) {
  game.time += dt;
  // Day/night: a full cycle every 4 minutes of play.
  game.dayNight = 0.15 + 0.6 * (0.5 - 0.5 * Math.cos(game.time * (Math.PI * 2) / 240));
  game.districtAtPlayer = districtAt(p.x);
  if (game.toast) {
    game.toast.t -= dt;
    if (game.toast.t <= 0) game.toast = null;
  }
  if (game.danger > 0) game.danger -= dt;
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) p.ammo = WEAPONS[p.weapon].mag;
  }
  // Player: on foot or driving.
  if (p.car) {
    const car = p.car;
    driveCar(car, {
      up: game.keys['KeyW'] || game.keys['ArrowUp'],
      down: game.keys['KeyS'] || game.keys['ArrowDown'],
      left: game.keys['KeyA'] || game.keys['ArrowLeft'],
      right: game.keys['KeyD'] || game.keys['ArrowRight'],
    }, dt, game.city);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    if (car.smoke > 0) spawnSmoke(game.combat, car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, 1);
    if (car.damaged >= 100) {
      spawnExplosion(game.combat, car.x, car.y);
      car.dead = true;
      p.car = null;
      damagePlayer(30);
      addHeat(game.police, 10);
    }
    // Speeding past a cop raises heat a little.
    if (car.speed > 380 && game.police.wanted > 0) addHeat(game.police, dt * 1.5);
  } else {
    const mx = (game.keys['KeyD'] || game.keys['ArrowRight'] ? 1 : 0) - (game.keys['KeyA'] || game.keys['ArrowLeft'] ? 1 : 0);
    const my = (game.keys['KeyS'] || game.keys['ArrowDown'] ? 1 : 0) - (game.keys['KeyW'] || game.keys['ArrowUp'] ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    let nx = p.x + (mx / len) * p.onFootSpeed * dt * (mx || my ? 1 : 0);
    let ny = p.y + (my / len) * p.onFootSpeed * dt * (mx || my ? 1 : 0);
    const b = hitsBuilding(game.city, nx, ny, 10);
    if (b) {
      if (!hitsBuilding(game.city, nx, p.y, 10)) ny = p.y;
      else if (!hitsBuilding(game.city, p.x, ny, 10)) nx = p.x;
      else { nx = p.x; ny = p.y; }
    }
    p.x = Math.max(20, Math.min(3180, nx));
    p.y = Math.max(20, Math.min(2380, ny));
    // Aim at the mouse.
    const wx = game.camera.x + game.mouse.x;
    const wy = game.camera.y + game.mouse.y;
    p.angle = Math.atan2(wy - p.y, wx - p.x);
    if (game.mouse.down) shootAt(wx, wy);
  }
  // Traffic, peds, police, combat, missions.
  for (const car of game.cars) {
    if (car.traffic && !car.dead) updateTraffic(car, dt, game.city, game.cars, game.rng);
  }
  game.cars = game.cars.filter((c) => !c.dead || c === p.car);
  updatePeds(game.peds, dt, p, game.danger, game.rng);
  updatePolice(game.police, dt, p, game.city, game.rng, onBusted);
  updateEnemies(game.combat, dt, p, game.city);
  // Bullet targets: enemies, peds, cops, the player (enemy bullets).
  const targets = [];
  for (const e of game.combat.enemies) {
    targets.push({
      x: e.x, y: e.y, radius: 12, dead: e.dead,
      hit(b) {
        e.hp -= b.damage;
        e.knockX += b.vx * 0.25;
        e.knockY += b.vy * 0.25;
        spawnSparks(game.combat, b.x, b.y, 4, '#ff5a4e');
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          game.mission.kills += 1;
          game.stats.kills += 1;
          game.cash += 50;
          addHeat(game.police, 4);
        }
      },
    });
  }
  for (const ped of game.peds) {
    targets.push({
      x: ped.x, y: ped.y, radius: 8, dead: ped.dead,
      hit(b) {
        if (b.owner !== 'player') return;
        ped.dead = true;
        game.cash += ped.cash;
        addHeat(game.police, 8);
        game.danger = 1.5;
      },
    });
  }
  for (const cop of game.police.cops) {
    targets.push({
      x: cop.x, y: cop.y, radius: 22, dead: cop.dead,
      hit(b) {
        if (b.owner !== 'player') return;
        cop.damaged += b.damage;
        if (cop.damaged >= 100 && !cop.dead) {
          cop.dead = true;
          spawnExplosion(game.combat, cop.x, cop.y);
          addHeat(game.police, 12);
        }
      },
    });
  }
  targets.push({
    x: p.x, y: p.y, radius: 10, dead: false,
    hit(b) {
      if (b.owner === 'player') return;
      damagePlayer(b.damage);
    },
  });
  updateBullets(game.combat, dt, targets);
  updateParticles(game.combat, dt);
  updateMission(game, dt);
  updateCamera(game.camera, p.x, p.y, game.combat.shake);
  updateAudio(game.audio, dt, p.car ? p.car.speed : 0, game.police.wanted);
  // Slow health regen out of combat.
  if (game.police.wanted === 0 && p.health > 0 && p.health < 100) p.health = Math.min(100, p.health + dt * 2);
}

function draw() {
  if (game.screen === 'title') { drawTitle(ctx, game); return; }
  drawWorld(ctx, game);
  drawHUD(ctx, game);
  if (game.wheelOpen) drawWeaponWheel(ctx, game);
  if (game.garageOpen) drawGarage(ctx, game);
  if (game.screen === 'paused') drawPaused(ctx);
  if (game.screen === 'busted') drawBusted(ctx);
}

// --- Input -----------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  game.keys[e.code] = true;
  if (e.code === 'Space') {
    if (game.screen === 'title') {
      game.screen = 'play';
      startAudio(game.audio);
      loadGame();
      announce('Playing. Mara Voss is back in Coral Shore.');
    } else if (game.screen === 'busted') {
      game.busted = false;
      p.health = 100;
      p.armor = 50;
      p.x = game.city.garage.x;
      p.y = game.city.garage.y;
      game.screen = 'play';
    } else if (game.screen === 'over') {
      game.screen = 'title';
    }
    e.preventDefault();
  }
  if (game.screen !== 'play') return;
  if (e.code === 'KeyE') enterCar();
  if (e.code === 'KeyF') stealCar();
  if (e.code === 'KeyQ') { game.wheelOpen = !game.wheelOpen; playBlip(game.audio, 520); }
  if (e.code === 'KeyR') { cycleStation(game.audio); game.toast = { text: `Radio: ${game.audio.station + 1} — ${['Vice FM 88.5', 'Coral Rock 101', 'Wave 97.3'][game.audio.station]}`, t: 2 }; }
  if (e.code === 'KeyG') {
    const g = game.city.garage;
    if (Math.hypot(p.x - g.x, p.y - g.y) < 160) {
      game.garageOpen = !game.garageOpen;
      playBlip(game.audio, 700);
    }
  }
  if (e.code === 'KeyM') {
    const next = game.stats.missionsDone;
    if (game.mission.index < 0 && next < 8) {
      startMission(game, next);
      playBlip(game.audio, 880);
      announce(`Mission ${next + 1}: ${MISSIONS[next].title}.`);
    }
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    game.screen = 'paused';
    saveGame();
    announce('Paused.');
  }
  if (game.wheelOpen && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
    const id = WEAPON_ORDER[Number(e.code.slice(-1)) - 1];
    if (id === 'pistol' || game.unlocked[id]) {
      p.weapon = id;
      p.ammo = WEAPONS[id].mag;
      p.reloadTimer = 0;
      game.wheelOpen = false;
    }
  }
  if (game.garageOpen && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
    buyGarageCar(Number(e.code.slice(-1)));
  }
});
window.addEventListener('keyup', (e) => { game.keys[e.code] = false; });
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  game.mouse.x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  game.mouse.y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
});
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) game.mouse.down = true;
  startAudio(game.audio);
});
window.addEventListener('mouseup', () => { game.mouse.down = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.screen === 'play') {
    game.screen = 'paused';
    saveGame();
  }
});

// --- Run -------------------------------------------------------------------

function runShot(name) {
  const scene = stageShot(name, game);
  game.wheelOpen = scene.wheel;
  game.garageOpen = scene.garage;
  game.screen = 'play';
  // Step the world a couple of seconds so smoke, spotlight and traffic settle.
  for (let i = 0; i < 120; i += 1) update(STEP);
  game.wheelOpen = scene.wheel;
  game.garageOpen = scene.garage;
  let painted = 0;
  function paint() {
    draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (game.screen === 'paused' && (game.keys['KeyP'] || game.keys['Escape'])) {
      game.screen = 'play';
      game.keys['KeyP'] = false;
      game.keys['Escape'] = false;
    }
    if (game.screen === 'play') {
      while (accumulator >= STEP) {
        update(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    draw();
  }
  announce('Coral Shore. Press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
