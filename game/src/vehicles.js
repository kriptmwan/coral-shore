// Cars: player driving physics (acceleration, steering, drift smoke) and
// traffic that follows the road grid, stops for nothing and flees a chase.
import { CAR_TYPES } from './config.js';
import { roadLines, hitsBuilding, clampToWorld, nearestRoadPoint } from './city.js';

let nextId = 1;

export function makeCar(type, x, y, angle = 0, traffic = false) {
  const spec = CAR_TYPES[type];
  return {
    id: nextId += 1, type, spec,
    x, y, angle, speed: 0,
    vx: 0, vy: 0, // velocity vector (for drift)
    traffic, color: spec.color,
    // Traffic state: which road it follows and which way it drives.
    lane: null, dir: 1, cruise: 0, stopped: 0, honk: 0,
    smoke: 0, damaged: 0, dead: false,
  };
}

export function spawnTrafficCar(rng, city, cars) {
  const { avenues, streets } = roadLines();
  const vertical = rng.chance(0.5);
  let x; let y; let angle;
  const type = rng.pick(['sedan', 'sedan', 'taxi', 'coupe', 'truck', 'van']);
  if (vertical) {
    x = rng.pick(avenues) + (rng.chance(0.5) ? -12 : 12);
    y = rng.range(100, 2300);
    angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
  } else {
    y = rng.pick(streets) + (rng.chance(0.5) ? -12 : 12);
    x = rng.range(100, 2900);
    angle = rng.chance(0.5) ? 0 : Math.PI;
  }
  const car = makeCar(type, x, y, angle, true);
  car.cruise = rng.range(120, 210);
  car.lane = { vertical, line: vertical ? x : y };
  return car;
}

// Player car physics: arcade model with lateral grip (drift when steering hard).
export function driveCar(car, input, dt, city) {
  const spec = car.spec;
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const fSpeed = car.vx * forward.x + car.vy * forward.y;
  const accel = input.up ? spec.accel : input.down ? -spec.accel * 0.7 : 0;
  let newF = fSpeed + accel * dt;
  newF -= newF * 0.55 * dt; // rolling drag
  newF = Math.max(-spec.top * 0.45, Math.min(spec.top, newF));
  // Steering scales with speed; hard steering at speed breaks grip and drifts.
  const steer = input.left ? -1 : input.right ? 1 : 0;
  const steerAmount = steer * 2.6 * dt * Math.min(1, Math.abs(newF) / 120) * (newF < 0 ? -1 : 1);
  car.angle += steerAmount;
  const grip = Math.abs(steer) > 0 && Math.abs(newF) > 260 ? spec.grip * 0.45 : spec.grip;
  const nForward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const right = { x: -nForward.y, y: nForward.x };
  const lat = car.vx * right.x + car.vy * right.y;
  const newLat = lat * Math.max(0, 1 - grip * dt);
  car.vx = nForward.x * newF + right.x * newLat;
  car.vy = nForward.y * newF + right.y * newLat;
  car.speed = Math.hypot(car.vx, car.vy);
  // Drift smoke when sliding sideways fast.
  car.smoke = Math.abs(newLat) > 90 && Math.abs(newF) > 200 ? 1 : Math.max(0, car.smoke - dt * 3);
  moveCarWithCollision(car, dt, city);
}

function moveCarWithCollision(car, dt, city) {
  let nx = car.x + car.vx * dt;
  let ny = car.y + car.vy * dt;
  const r = 20;
  const hit = hitsBuilding(city, nx, ny, r);
  if (hit) {
    // Slide along the building face: kill the blocked axis.
    if (!hitsBuilding(city, nx, car.y, r)) ny = car.y;
    else if (!hitsBuilding(city, car.x, ny, r)) nx = car.x;
    else { nx = car.x; ny = car.y; }
    car.vx *= 0.4;
    car.vy *= 0.4;
    car.damaged = Math.min(100, car.damaged + 2);
  }
  const clamped = clampToWorld(nx, ny);
  car.x = clamped.x;
  car.y = clamped.y;
}

// Traffic: follow the road line, turn at random intersections, brake for cars ahead.
export function updateTraffic(car, dt, city, cars, rng) {
  if (car.stopped > 0) { car.stopped -= dt; car.speed = 0; return; }
  const { avenues, streets } = roadLines();
  const vertical = car.lane.vertical;
  const step = car.cruise * dt;
  // Car ahead on the same lane? Brake.
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = vertical ? Math.abs(dx) < 26 && dy * Math.sin(car.angle) > 0 && Math.abs(dy) < 70
      : Math.abs(dy) < 26 && dx * Math.cos(car.angle) > 0 && Math.abs(dx) < 70;
    if (ahead) { car.stopped = 0.4; return; }
  }
  if (vertical) {
    car.y += Math.sin(car.angle) * step;
    car.x = car.lane.line + (Math.sin(car.angle) > 0 ? 12 : -12);
    if (car.y < 60 || car.y > 2340) car.angle += Math.PI;
    // Random turn at an intersection.
    if (rng.chance(0.004)) {
      const street = streets[Math.floor(rng.next() * streets.length)];
      if (Math.abs(car.y - street) < 30) {
        car.lane = { vertical: false, line: street };
        car.angle = rng.chance(0.5) ? 0 : Math.PI;
        car.y = street + (car.angle === 0 ? -12 : 12);
      }
    }
  } else {
    car.x += Math.cos(car.angle) * step;
    car.y = car.lane.line + (Math.cos(car.angle) > 0 ? 12 : -12);
    if (car.x < 60 || car.x > 2920) car.angle += Math.PI;
    if (rng.chance(0.004)) {
      const avenue = avenues[Math.floor(rng.next() * avenues.length)];
      if (Math.abs(car.x - avenue) < 30) {
        car.lane = { vertical: true, line: avenue };
        car.angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        car.x = avenue + (car.angle === Math.PI / 2 ? -12 : 12);
      }
    }
  }
  car.speed = car.cruise;
  const snap = nearestRoadPoint(car.x, car.y);
  void snap;
}

// Steal: pull the player out of their car (or off foot) into the target car.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
