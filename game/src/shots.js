// Staged screenshot scenes: each one builds a real game state (the same world,
// the same systems) and steps it forward a few seconds with scripted inputs,
// so the frame is what a short burst of real play looks like. Same seed,
// same frame.
import { makeCar } from './vehicles.js';
import { makeEnemy } from './combat.js';
import { startMission } from './missions.js';
import { addHeat } from './police.js';

function placeChaseCars(game) {
  const p = game.player;
  // Three cop cars in pursuit behind and beside the player.
  const offsets = [
    { dx: -180, dy: 60 }, { dx: -260, dy: -40 }, { dx: -120, dy: 120 },
  ];
  for (const o of offsets) {
    const cop = makeCar('cop', p.x + o.dx, p.y + o.dy, p.angle, false);
    cop.vx = Math.cos(p.angle) * 380;
    cop.vy = Math.sin(p.angle) * 380;
    game.police.cops.push(cop);
  }
}

export function stageShot(name, game) {
  const p = game.player;
  if (name === 'chase') {
    // Money shot: dusk police chase in the Comet S, wanted 4, heli overhead.
    startMission(game, 1);
    game.dayNight = 0.55;
    const car = makeCar('sport', 1400, 1000, 0, false);
    car.vx = 420;
    car.vy = 0;
    car.smoke = 1;
    game.cars.push(car);
    p.car = car;
    p.x = car.x;
    p.y = car.y;
    p.angle = 0;
    addHeat(game.police, 80);
    placeChaseCars(game);
    game.police.heli = { x: p.x + 40, y: p.y - 60, angle: 0, rotor: 1.2 };
    game.police.spotlight = { x: p.x, y: p.y };
    game.camera.x = p.x - 640;
    game.camera.y = p.y - 400;
    game.mission.objective = 'Steal the Comet S and lose the VCPD tail';
    return { wheel: false, garage: false };
  }
  if (name === 'street') {
    // On foot in Downtown: peds, traffic, the first mission marker ahead.
    startMission(game, 0);
    game.dayNight = 0.08;
    p.x = 600;
    p.y = 620;
    p.angle = Math.PI / 2;
    game.camera.x = p.x - 640;
    game.camera.y = p.y - 400;
    return { wheel: false, garage: false };
  }
  if (name === 'combat') {
    // Shootout at the docks: weapon wheel open, enemies closing in, roadblock.
    startMission(game, 2);
    game.dayNight = 0.4;
    p.x = 200;
    p.y = 2080;
    p.angle = -Math.PI / 2;
    p.weapon = 'smg';
    p.ammo = 28;
    game.unlocked.smg = true;
    game.unlocked.shotgun = true;
    addHeat(game.police, 55);
    game.police.roadblocks = [
      makeCar('cop', 170, 1960, Math.PI / 2, false),
      makeCar('cop', 230, 1960, Math.PI / 2, false),
    ];
    for (let i = 0; i < 4; i += 1) {
      game.combat.enemies.push(makeEnemy(200 + (i % 2 === 0 ? -26 : 26), 1920 + Math.floor(i / 2) * 60, 100));
    }
    game.combat.muzzle = 0.06;
    game.camera.x = p.x - 640;
    game.camera.y = p.y - 400;
    return { wheel: true, garage: false };
  }
  // garage: night at the Coral Garage, supercar unlocked, garage menu open.
  game.dayNight = 0.7;
  game.cash = 5200;
  game.garageTier = 3;
  game.stats.missionsDone = 5;
  p.x = 600;
  p.y = 1740;
  p.angle = Math.PI;
  const car = makeCar('sport', 660, 1800, Math.PI / 2, false);
  game.cars.push(car);
  game.camera.x = p.x - 640;
  game.camera.y = p.y - 400;
  return { wheel: false, garage: true };
}
