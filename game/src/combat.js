// Combat: hitscan-feel bullets with travel, enemy gang members who shoot
// back, knock-back on every hit, muzzle flashes, sparks and explosions.
import { WEAPONS } from './config.js';

let nextId = 1;

export function createCombat() {
  return { bullets: [], particles: [], enemies: [], muzzle: 0, shake: 0 };
}

export function fireWeapon(combat, weaponId, x, y, angle, owner) {
  const w = WEAPONS[weaponId];
  const pellets = w.pellets ?? 1;
  for (let i = 0; i < pellets; i += 1) {
    const spread = (Math.random() - 0.5) * 2 * w.spread;
    combat.bullets.push({
      id: nextId += 1,
      x: x + Math.cos(angle) * 26, y: y + Math.sin(angle) * 26,
      vx: Math.cos(angle + spread) * 900, vy: Math.sin(angle + spread) * 900,
      damage: w.damage, range: w.range, travelled: 0, owner,
    });
  }
  combat.muzzle = 0.06;
  combat.shake = Math.max(combat.shake, weaponId === 'shotgun' ? 7 : 3);
  spawnSparks(combat, x + Math.cos(angle) * 30, y + Math.sin(angle) * 30, 3, '#ffd76a');
}

export function spawnSparks(combat, x, y, n, color) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    combat.particles.push({
      kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.35, max: 0.35, color, size: 2 + Math.random() * 2,
    });
  }
}

export function spawnSmoke(combat, x, y, n) {
  for (let i = 0; i < n; i += 1) {
    combat.particles.push({
      kind: 'smoke', x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30,
      life: 0.9, max: 0.9, color: '#9aa0a8', size: 6 + Math.random() * 8,
    });
  }
}

export function spawnExplosion(combat, x, y) {
  for (let i = 0; i < 26; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 320;
    combat.particles.push({
      kind: 'fire', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.7, max: 0.7, color: ['#ff5a1e', '#ffb03a', '#ff2e2e'][i % 3], size: 4 + Math.random() * 8,
    });
  }
  combat.shake = 14;
}

export function makeEnemy(x, y, hp = 100) {
  return {
    id: nextId += 1, x, y, hp, maxHp: hp,
    angle: 0, shootTimer: 1 + Math.random(), dead: false,
    knockX: 0, knockY: 0, speed: 70,
  };
}

// Enemies advance on the player, shoot when in range, and get knocked back.
export function updateEnemies(combat, dt, player, city) {
  for (const e of combat.enemies) {
    if (e.dead) continue;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    e.angle = Math.atan2(dy, dx);
    // Knock-back decays; movement resumes after it.
    e.x += e.knockX * dt;
    e.y += e.knockY * dt;
    e.knockX *= Math.max(0, 1 - 6 * dt);
    e.knockY *= Math.max(0, 1 - 6 * dt);
    if (dist > 240) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else if (dist < 120) {
      e.x -= Math.cos(e.angle) * e.speed * 0.5 * dt;
      e.y -= Math.sin(e.angle) * e.speed * 0.5 * dt;
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && dist < 420) {
      e.shootTimer = 1.1 + Math.random() * 0.9;
      const aim = e.angle + (Math.random() - 0.5) * 0.24;
      combat.bullets.push({
        id: nextId += 1,
        x: e.x + Math.cos(aim) * 22, y: e.y + Math.sin(aim) * 22,
        vx: Math.cos(aim) * 700, vy: Math.sin(aim) * 700,
        damage: 9, range: 420, travelled: 0, owner: 'enemy',
      });
      combat.muzzle = 0.05;
    }
  }
  combat.enemies = combat.enemies.filter((e) => !e.dead);
}

export function updateBullets(combat, dt, targets) {
  // targets: [{x, y, radius, hit(bullet), kind}] — bullets test each in turn.
  for (const b of combat.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.travelled += Math.hypot(b.vx, b.vy) * dt;
    if (b.travelled > b.range) { b.dead = true; continue; }
    for (const t of targets) {
      if (t.dead) continue;
      const d = Math.hypot(b.x - t.x, b.y - t.y);
      if (d < t.radius) {
        t.hit(b);
        b.dead = true;
        break;
      }
    }
  }
  combat.bullets = combat.bullets.filter((b) => !b.dead);
}

export function updateParticles(combat, dt) {
  for (const p of combat.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.max(0, 1 - 2 * dt);
    p.vy *= Math.max(0, 1 - 2 * dt);
    p.life -= dt;
  }
  combat.particles = combat.particles.filter((p) => p.life > 0);
  if (combat.muzzle > 0) combat.muzzle -= dt;
  if (combat.shake > 0) combat.shake = Math.max(0, combat.shake - dt * 26);
}
