// Pedestrians: walk the sidewalks, cross at intersections, and flee from
// gunfire, speeding cars and police chases. A few carry cash when mugged.
import { roadLines } from './city.js';

const SHIRTS = ['#e05a5a', '#5a8de0', '#5ad08a', '#e0c25a', '#9a5ad0', '#e08a5a', '#5ad0c2', '#d05a9a'];
const PANTS = ['#2b3242', '#3a2b2b', '#24303a', '#40342a'];

let nextId = 1;

export function makePed(rng, x, y) {
  const { avenues, streets } = roadLines();
  const vertical = rng.chance(0.5);
  return {
    id: nextId += 1,
    x, y,
    shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS),
    speed: rng.range(28, 52),
    angle: vertical ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI),
    vertical,
    flee: 0, dead: false, cash: rng.chance(0.25) ? rng.int(20, 120) : 0,
    walkPhase: rng.range(0, Math.PI * 2),
  };
}

export function spawnPeds(rng, count) {
  const peds = [];
  const { avenues, streets } = roadLines();
  for (let i = 0; i < count; i += 1) {
    const vertical = rng.chance(0.5);
    const x = vertical ? rng.pick(avenues) + rng.range(-52, 52) : rng.range(100, 2900);
    const y = vertical ? rng.range(100, 2300) : rng.pick(streets) + rng.range(-52, 52);
    peds.push(makePed(rng, x, y));
  }
  return peds;
}

export function updatePeds(peds, dt, player, danger, rng) {
  for (const ped of peds) {
    if (ped.dead) continue;
    ped.walkPhase += dt * 6;
    // Flee from danger (gunfire or a car bearing down).
    const dPlayer = Math.hypot(ped.x - player.x, ped.y - player.y);
    if (danger > 0 && dPlayer < 320) ped.flee = 1.5;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const away = Math.atan2(ped.y - player.y, ped.x - player.x);
      ped.x += Math.cos(away) * 130 * dt;
      ped.y += Math.sin(away) * 130 * dt;
      ped.angle = away;
      continue;
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    // Turn around at the world edge; drift across at intersections.
    if (ped.x < 60 || ped.x > 2940 || ped.y < 60 || ped.y > 2340) ped.angle += Math.PI;
    if (rng.chance(0.002)) ped.angle += (rng.chance(0.5) ? 1 : -1) * (Math.PI / 2);
    ped.x = Math.max(30, Math.min(2950, ped.x));
    ped.y = Math.max(30, Math.min(2370, ped.y));
  }
}
