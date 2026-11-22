// Story missions: 8 jobs for Mara Voss, each a different verb — drive, chase,
// shootout, stealth tail, race, heist, helicopter escape, finale. A mission
// is a small state machine: objectives tick off in order, then it pays out.
import { MISSIONS } from './config.js';
import { makeEnemy } from './combat.js';
import { addHeat } from './police.js';
import { makeCar } from './vehicles.js';

export function createMissionState() {
  return {
    index: -1, // -1 = free roam, no mission active
    stage: 0,
    timer: 0,
    objective: '',
    done: false, failed: false,
    target: null, // {x, y, radius} marker for the GPS
    checkpoints: [],
    killsNeeded: 0, kills: 0,
    raceIndex: 0,
    tailTarget: null,
    seen: 0,
    message: '',
  };
}

export function missionDef(index) {
  return MISSIONS[index];
}

export function startMission(game, index) {
  const m = game.mission;
  const def = MISSIONS[index];
  m.index = index;
  m.stage = 0;
  m.timer = 0;
  m.done = false;
  m.failed = false;
  m.kills = 0;
  m.raceIndex = 0;
  m.seen = 0;
  m.checkpoints = [];
  m.target = null;
  m.tailTarget = null;
  const city = game.city;
  if (def.type === 'drive') {
    m.target = { x: city.pier.x, y: city.pier.y, radius: 90 };
    m.objective = 'Drive to the pier — meet Dante';
    m.timer = 90;
  } else if (def.type === 'chase') {
    m.target = { x: city.marina.x, y: city.marina.y, radius: 90 };
    m.objective = 'Steal the Comet S at the marina';
    m.timer = 0;
  } else if (def.type === 'shootout') {
    m.objective = 'Clear the docks — 6 Marabunta gunmen';
    m.killsNeeded = 6;
    for (let i = 0; i < 6; i += 1) {
      game.combat.enemies.push(makeEnemy(city.docks.x + (i % 3) * 70 - 70, city.docks.y + Math.floor(i / 3) * 80 - 40, 100));
    }
    m.target = { x: city.docks.x, y: city.docks.y, radius: 120 };
  } else if (def.type === 'stealth') {
    const car = makeCar('sedan', 1000, 600, 0, true);
    car.cruise = 150;
    car.lane = { vertical: false, line: 600 };
    game.cars.push(car);
    m.tailTarget = car;
    m.objective = 'Tail the courier — stay close, stay unseen';
    m.timer = 75;
    m.target = { x: car.x, y: car.y, radius: 200 };
  } else if (def.type === 'race') {
    m.checkpoints = [
      { x: 1000, y: 200 }, { x: 1800, y: 600 }, { x: 2200, y: 1400 },
      { x: 1400, y: 1800 }, { x: 600, y: 1000 },
    ];
    m.objective = 'Race: hit checkpoint 1 of 5';
    m.timer = 120;
    m.target = { x: 1000, y: 200, radius: 80 };
  } else if (def.type === 'heist') {
    m.objective = 'Reach Coral Bank and crack the vault';
    m.target = { x: city.bank.x, y: city.bank.y, radius: 90 };
    m.timer = 150;
  } else if (def.type === 'escape') {
    addHeat(game.police, 80);
    m.objective = 'Lose the helicopter — stay out of the spotlight for 45s';
    m.timer = 45;
    m.target = null;
  } else if (def.type === 'finale') {
    m.objective = 'Storm Ocean Tower — clear the penthouse guards';
    m.killsNeeded = 8;
    for (let i = 0; i < 8; i += 1) {
      game.combat.enemies.push(makeEnemy(city.tower.x + (i % 4) * 60 - 90, city.tower.y + Math.floor(i / 4) * 70 - 35, 120));
    }
    m.target = { x: city.tower.x, y: city.tower.y, radius: 140 };
  }
  m.message = `${def.title} — ${def.brief}`;
  return m;
}

function completeMission(game) {
  const m = game.mission;
  const def = MISSIONS[m.index];
  m.done = true;
  game.cash += def.cash;
  game.respect = Math.min(100, game.respect + 12);
  game.stats.missionsDone += 1;
  m.message = `Mission complete: ${def.title} — +$${def.cash}`;
  game.toast = { text: m.message, t: 4 };
  // Unlock the next mission and a weapon on milestones.
  if (m.index === 1) game.unlocked.smg = true;
  if (m.index === 2) game.unlocked.shotgun = true;
  if (m.index === 4) game.garageTier = Math.max(game.garageTier, 2);
  if (m.index === 5) game.garageTier = Math.max(game.garageTier, 3);
}

function failMission(game, reason) {
  const m = game.mission;
  m.failed = true;
  m.message = `Mission failed: ${reason}`;
  game.toast = { text: m.message, t: 4 };
}

export function updateMission(game, dt) {
  const m = game.mission;
  if (m.index < 0 || m.done || m.failed) return;
  const def = MISSIONS[m.index];
  const p = game.player;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0 && def.type !== 'escape') {
      failMission(game, 'Out of time');
      return;
    }
  }
  const distTo = (t) => (t ? Math.hypot(p.x - t.x, p.y - t.y) : Infinity);
  if (def.type === 'drive' && distTo(m.target) < m.target.radius) {
    completeMission(game);
  } else if (def.type === 'chase') {
    if (m.stage === 0 && p.car && p.car.type === 'sport') {
      m.stage = 1;
      m.objective = 'Now lose them — drop to 0 stars';
      m.target = null;
    } else if (m.stage === 1 && game.police.wanted === 0) {
      completeMission(game);
    }
  } else if (def.type === 'shootout' || def.type === 'finale') {
    if (m.kills >= m.killsNeeded) completeMission(game);
  } else if (def.type === 'stealth') {
    const t = m.tailTarget;
    if (!t || t.dead) { failMission(game, 'Lost the courier'); return; }
    m.target = { x: t.x, y: t.y, radius: 200 };
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    if (d < 70) {
      m.seen += dt;
      if (m.seen > 2) { failMission(game, 'Spotted'); return; }
    } else {
      m.seen = Math.max(0, m.seen - dt);
    }
    if (d > 520) { failMission(game, 'Lost the courier'); return; }
    if (m.timer <= 0) completeMission(game);
  } else if (def.type === 'race') {
    if (distTo(m.target) < m.target.radius) {
      m.raceIndex += 1;
      if (m.raceIndex >= m.checkpoints.length) {
        completeMission(game);
      } else {
        const c = m.checkpoints[m.raceIndex];
        m.target = { x: c.x, y: c.y, radius: 80 };
        m.objective = `Race: hit checkpoint ${m.raceIndex + 1} of 5`;
      }
    }
  } else if (def.type === 'heist') {
    if (m.stage === 0 && distTo(m.target) < m.target.radius) {
      m.stage = 1;
      m.objective = 'Crack the vault — hold position 10s';
      m.timer = 10;
      addHeat(game.police, 60);
    } else if (m.stage === 1 && m.timer <= 0) {
      m.stage = 2;
      m.objective = 'Escape — drop to 0 stars';
      m.target = null;
    } else if (m.stage === 2 && game.police.wanted === 0) {
      completeMission(game);
    }
  } else if (def.type === 'escape') {
    if (m.timer <= 0) completeMission(game);
  }
  if (p.health <= 0 && !m.done) failMission(game, 'Mara is down');
}
