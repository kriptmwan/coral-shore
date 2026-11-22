// The VCPD: wanted stars, patrol cars that chase and ram, roadblocks at 3+
// stars, and a searchlight helicopter at 4+ stars. Wanted decays when the
// player stays clean and out of sight.
import { WANTED, WANTED_MAX } from './config.js';
import { makeCar } from './vehicles.js';
import { nearestRoadPoint, isOnRoad } from './city.js';

export function createPolice() {
  return {
    wanted: 0, heat: 0,
    cops: [], heli: null, roadblocks: [],
    spawnTimer: 0, decayTimer: 0, bustTimer: 0,
    spotlight: { x: 0, y: 0 },
  };
}

export function addHeat(police, amount) {
  police.heat = Math.min(100, police.heat + amount);
  const stars = Math.min(WANTED_MAX, Math.floor(police.heat / 20));
  if (stars > police.wanted) police.wanted = stars;
}

export function loseCops(police) {
  police.wanted = 0;
  police.heat = 0;
  police.cops = [];
  police.heli = null;
  police.roadblocks = [];
}

// Spawn a cop car on a road near the player, facing them.
function spawnCop(police, player, rng) {
  const angle = rng.range(0, Math.PI * 2);
  const dist = rng.range(500, 700);
  const p = nearestRoadPoint(player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist);
  if (!p) return;
  const cop = makeCar('cop', p.x, p.y, Math.atan2(player.y - p.y, player.x - p.x), false);
  cop.cruise = 300;
  police.cops.push(cop);
}

export function updatePolice(police, dt, player, city, rng, onBusted) {
  const level = WANTED[police.wanted];
  // Wanted decays slowly when no crime is happening.
  police.decayTimer += dt;
  if (police.decayTimer > 4) {
    police.decayTimer = 0;
    if (police.heat > 0) police.heat = Math.max(0, police.heat - 1.5);
    const stars = Math.floor(police.heat / 20);
    if (stars < police.wanted) police.wanted = stars;
    if (police.wanted === 0) loseCops(police);
  }
  // Keep the right number of pursuit cars on the road.
  police.spawnTimer -= dt;
  if (police.cops.length < level.cops && police.spawnTimer <= 0) {
    spawnCop(police, player, rng);
    police.spawnTimer = 1.2;
  }
  // Chase: stay on the roads — steer to the nearest road point when off-road,
  // and to the road point nearest the player when on one; ram on contact.
  for (const cop of police.cops) {
    if (cop.dead) continue;
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    let tx = player.x;
    let ty = player.y;
    if (dist > 70) {
      if (!isOnRoad(cop.x, cop.y)) {
        const rp = nearestRoadPoint(cop.x, cop.y);
        tx = rp.x; ty = rp.y;
      } else {
        const rp = nearestRoadPoint(player.x, player.y);
        tx = rp.x; ty = rp.y;
      }
    }
    const want = Math.atan2(ty - cop.y, tx - cop.x);
    let diff = want - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const speed = Math.min(430, 240 + dist * 0.35);
    cop.vx = Math.cos(cop.angle) * speed;
    cop.vy = Math.sin(cop.angle) * speed;
    cop.x += cop.vx * dt;
    cop.y += cop.vy * dt;
    cop.speed = speed;
    // Ram: shove the player's car and raise heat (at most once per 0.6 s).
    if (dist < 46) {
      cop.ramCd = (cop.ramCd ?? 0) - dt;
      if (cop.ramCd <= 0) {
        cop.ramCd = 0.6;
        const push = 26;
        player.x += Math.cos(cop.angle) * push;
        player.y += Math.sin(cop.angle) * push;
        if (player.car) {
          player.car.vx += Math.cos(cop.angle) * 60;
          player.car.vy += Math.sin(cop.angle) * 60;
          player.car.damaged = Math.min(100, player.car.damaged + 4);
        }
      }
      // Busted when a cop sits on the player on foot at low speed.
      if (!player.car && dist < 30) {
        police.bustTimer += dt;
        if (police.bustTimer > 2.5) onBusted();
      } else {
        police.bustTimer = 0;
      }
    }
  }
  police.cops = police.cops.filter((c) => !c.dead);
  // Roadblocks: two cop cars parked across the road ahead of the player.
  if (level.roadblock && police.roadblocks.length === 0) {
    const p = nearestRoadPoint(player.x + 420, player.y);
    if (p) {
      const a = p.vertical ? 0 : Math.PI / 2;
      police.roadblocks = [
        makeCar('cop', p.x - 30, p.y, a, false),
        makeCar('cop', p.x + 30, p.y, a, false),
      ];
    }
  }
  if (!level.roadblock) police.roadblocks = [];
  // Helicopter: hovers above the player, paints a moving spotlight.
  if (level.heli && !police.heli) {
    police.heli = { x: player.x, y: player.y - 260, angle: 0, rotor: 0 };
  }
  if (!level.heli) police.heli = null;
  if (police.heli) {
    const h = police.heli;
    h.rotor += dt * 22;
    h.x += (player.x - h.x) * Math.min(1, dt * 1.4);
    h.y += (player.y - 40 - h.y) * Math.min(1, dt * 1.4);
    police.spotlight.x = player.x;
    police.spotlight.y = player.y;
  }
}
