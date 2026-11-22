// Coral Shore city: a road grid, two districts, the beach and the ocean.
// Buildings are solid rectangles; roads are the lanes traffic and the player use.
import { WORLD_W, WORLD_H, ROAD_SPACING, ROAD_HALF, OCEAN_X, DISTRICTS } from './config.js';

const DOWNTOWN_COLORS = ['#4a5a78', '#5d6f8f', '#3c4a63', '#6b7a99', '#54648a', '#7a6a9e'];
const BEACH_COLORS = ['#d8c9a3', '#e0cfae', '#c9b48a', '#e8dcc0', '#d0bd96'];

// Road centre lines (x for avenues, y for streets).
export function roadLines() {
  const avenues = [];
  const streets = [];
  for (let x = 200; x < WORLD_W; x += ROAD_SPACING) avenues.push(x);
  for (let y = 200; y < WORLD_H; y += ROAD_SPACING) streets.push(y);
  return { avenues, streets };
}

export function isOnRoad(x, y) {
  const { avenues, streets } = roadLines();
  for (const ax of avenues) if (Math.abs(x - ax) < ROAD_HALF + 6) return true;
  for (const sy of streets) if (Math.abs(y - sy) < ROAD_HALF + 6) return true;
  return false;
}

// Nearest road centre point to (x, y) — used to snap spawns onto lanes.
export function nearestRoadPoint(x, y) {
  const { avenues, streets } = roadLines();
  let best = null;
  let bestD = Infinity;
  for (const ax of avenues) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, y, vertical: true }; }
  }
  for (const sy of streets) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy, vertical: false }; }
  }
  return best;
}

export function buildCity(rng) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const hydrants = [];
  // One building per block BETWEEN the roads: block i spans from road
  // (200 + i*400) to the next road, inset from both road edges.
  for (let bx = 0; bx < 7; bx += 1) {
    for (let by = 0; by < 5; by += 1) {
      const x0 = 200 + bx * ROAD_SPACING + ROAD_HALF + 14;
      const y0 = 200 + by * ROAD_SPACING + ROAD_HALF + 14;
      const w = ROAD_SPACING - ROAD_HALF * 2 - 28;
      const h = ROAD_SPACING - ROAD_HALF * 2 - 28;
      if (x0 + w > OCEAN_X - 60) continue;
      const cx = x0 + w / 2;
      const downtown = cx < 2000;
      const color = rng.pick(downtown ? DOWNTOWN_COLORS : BEACH_COLORS);
      const height = downtown ? rng.int(3, 9) : rng.int(1, 3);
      buildings.push({ x: x0, y: y0, w, h, color, height, district: downtown ? 'Downtown' : 'Beachfront' });
      // Street props around each block.
      const nPalms = downtown ? rng.int(0, 2) : rng.int(2, 5);
      for (let i = 0; i < nPalms; i += 1) {
        palms.push({ x: x0 + rng.range(0, w), y: y0 - 8 + rng.range(0, 4), s: rng.range(0.8, 1.3) });
      }
      if (rng.chance(0.5)) lamps.push({ x: x0 + w + 4, y: y0 + rng.range(0, h) });
      if (rng.chance(0.4)) hydrants.push({ x: x0 - 6, y: y0 + rng.range(0, h) });
    }
  }
  // Landmarks: named places the missions and the minimap point at.
  const landmarks = [
    { name: 'Pier', x: 2900, y: 2200, kind: 'pier' },
    { name: 'Marina', x: 2780, y: 200, kind: 'marina' },
    { name: 'Coral Bank', x: 1000, y: 1000, kind: 'bank' },
    { name: 'Ocean Tower', x: 2200, y: 1400, kind: 'tower' },
    { name: 'Garage', x: 600, y: 1800, kind: 'garage' },
    { name: 'Docks', x: 200, y: 2200, kind: 'docks' },
    { name: 'Ammu-Nation', x: 1400, y: 600, kind: 'shop' },
    { name: 'Hospital', x: 1800, y: 1000, kind: 'hospital' },
  ];
  return {
    buildings, palms, lamps, hydrants, landmarks,
    districts: DISTRICTS,
    oceanX: OCEAN_X,
    // Fixed spawn points (all on roads).
    playerSpawn: { x: 600, y: 600 },
    garage: { x: 600, y: 1800 },
    docks: { x: 200, y: 2200 },
    pier: { x: 2900, y: 2200 },
    marina: { x: 2780, y: 200 },
    bank: { x: 1000, y: 1000 },
    tower: { x: 2200, y: 1400 },
  };
}

// Solid rectangle test against every building (used for collision).
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function clampToWorld(x, y) {
  return {
    x: Math.max(24, Math.min(WORLD_W - 24, x)),
    y: Math.max(24, Math.min(WORLD_H - 24, y)),
  };
}
