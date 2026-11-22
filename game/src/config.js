// Coral Shore — shared constants for the open-world crime game.
// A top-down open world: two districts (Downtown glass, Beachfront sand),
// a road grid, traffic, pedestrians, a 0-5 star wanted system and 8 story missions.
export const STEP = 1 / 60;
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const VIEW_W = 1280;
export const VIEW_H = 800;

// Road grid: avenues run north-south, streets east-west, every 400 px.
export const ROAD_SPACING = 400;
export const ROAD_HALF = 34;
export const BLOCK = ROAD_SPACING - ROAD_HALF * 2;

// Districts: west half Downtown, east strip Beachfront, ocean beyond x = 2960.
export const DISTRICTS = [
  { name: 'Downtown', x0: 0, y0: 0, x1: 2000, y1: 2400, ground: '#3d4a3a', road: '#23272e' },
  { name: 'Beachfront', x0: 2000, y0: 0, x1: 2960, y1: 2400, ground: '#c9b489', road: '#2b2b30' },
];
export const OCEAN_X = 2960;

export const WANTED_MAX = 5;
// Heat thresholds: how much heat each star costs, and what each star unlocks.
export const WANTED = [
  { stars: 0, cops: 0, roadblock: false, heli: false },
  { stars: 1, cops: 2, roadblock: false, heli: false },
  { stars: 2, cops: 3, roadblock: false, heli: false },
  { stars: 3, cops: 5, roadblock: true, heli: false },
  { stars: 4, cops: 6, roadblock: true, heli: true },
  { stars: 5, cops: 8, roadblock: true, heli: true },
];

export const CAR_TYPES = {
  sedan: { name: 'Comet Sedan', w: 46, h: 22, accel: 420, top: 330, grip: 3.2, tier: 1, color: '#7a8ba0' },
  taxi: { name: 'Ocean Taxi', w: 46, h: 22, accel: 400, top: 310, grip: 3.2, tier: 1, color: '#e8b73a' },
  coupe: { name: 'Vapid Coupe', w: 48, h: 22, accel: 520, top: 400, grip: 3.6, tier: 2, color: '#b03a3a' },
  sport: { name: 'Pfister Comet S', w: 48, h: 21, accel: 640, top: 480, grip: 4.2, tier: 3, color: '#e05a1e' },
  truck: { name: 'Mule Truck', w: 62, h: 26, accel: 300, top: 260, grip: 2.6, tier: 1, color: '#5d7a52' },
  cop: { name: 'VCPD Interceptor', w: 48, h: 22, accel: 620, top: 460, grip: 4.0, tier: 0, color: '#1c2733' },
  van: { name: 'Speedo Van', w: 56, h: 24, accel: 360, top: 300, grip: 2.9, tier: 1, color: '#8a7fd0' },
};

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, rate: 0.28, spread: 0.05, range: 420, mag: 12, auto: false, color: '#ffd76a' },
  smg: { name: 'SMG', damage: 18, rate: 0.09, spread: 0.11, range: 360, mag: 32, auto: true, color: '#ff9a3d' },
  shotgun: { name: 'Shotgun', damage: 16, rate: 0.75, spread: 0.3, range: 260, mag: 6, auto: false, pellets: 6, color: '#ff5a4e' },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun'];

export const RADIO_STATIONS = [
  { name: 'Vice FM 88.5', desc: 'Neon pop' },
  { name: 'Coral Rock 101', desc: 'Guitar anthems' },
  { name: 'Wave 97.3', desc: 'Late-night synth' },
];

// The story: Mara Voss returns to Coral Shore to settle a debt.
export const MISSIONS = [
  { id: 1, title: 'Homecoming', type: 'drive', brief: 'Dante waits at the pier. Drive there before the meet goes cold.', cash: 400 },
  { id: 2, title: 'Hot Wheels', type: 'chase', brief: 'Steal the Comet S from the marina and lose the VCPD tail.', cash: 900 },
  { id: 3, title: 'Dockside Debt', type: 'shootout', brief: 'The Marabunta crew holds the docks. Clear them out.', cash: 1500 },
  { id: 4, title: 'Tail the Tailor', type: 'stealth', brief: 'Follow the courier through Downtown. Do not be seen.', cash: 1200 },
  { id: 5, title: 'Neon Grand Prix', type: 'race', brief: 'Five checkpoints, one night, no brakes. Win the street race.', cash: 2500 },
  { id: 6, title: 'The Coral Job', type: 'heist', brief: 'Hit the Coral Bank vault, grab the cash, and vanish.', cash: 5000 },
  { id: 7, title: 'Skyhook', type: 'escape', brief: 'A police heli has your name on it. Outrun the spotlight.', cash: 3000 },
  { id: 8, title: 'King of the Shore', type: 'finale', brief: 'End it at the Ocean Tower: storm the penthouse, take the city.', cash: 8000 },
];

export const GARAGE_TIERS = [
  { tier: 1, name: 'Street', car: 'sedan', cost: 0 },
  { tier: 2, name: 'Tuner', car: 'coupe', cost: 1500 },
  { tier: 3, name: 'Supercar', car: 'sport', cost: 4000 },
];

export const SAVE_KEY = 'coral-shore-save-v1';
export const BEST_KEY = 'coral-shore-best-v1';
