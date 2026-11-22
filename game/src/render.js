// Renderer: a smooth camera over the city, day/night tint, and every system
// drawn so a single frame shows the whole game — roads, traffic, peds,
// cops, the helicopter spotlight, buildings, beach and ocean.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, ROAD_SPACING, ROAD_HALF } from './config.js';

export function createCamera() {
  return { x: 0, y: 0 };
}

export function updateCamera(camera, targetX, targetY, shake) {
  const tx = targetX - VIEW_W / 2;
  const ty = targetY - VIEW_H / 2;
  camera.x += (tx - camera.x) * 0.12;
  camera.y += (ty - camera.y) * 0.12;
  camera.x = Math.max(-80, Math.min(WORLD_W - VIEW_W + 80, camera.x));
  camera.y = Math.max(-80, Math.min(WORLD_H - VIEW_H + 80, camera.y));
  if (shake > 0) {
    camera.x += (Math.random() - 0.5) * shake;
    camera.y += (Math.random() - 0.5) * shake;
  }
}

function drawCarShape(ctx, car) {
  const spec = car.spec;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-spec.w / 2 + 3, -spec.h / 2 + 4, spec.w, spec.h);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-spec.w / 2, -spec.h / 2, spec.w, spec.h, 7);
  ctx.fill();
  // Cabin + windshield.
  ctx.fillStyle = '#141a22';
  ctx.fillRect(-spec.w / 2 + 10, -spec.h / 2 + 4, spec.w / 2 - 6, spec.h - 8);
  ctx.fillStyle = 'rgba(160,210,255,0.5)';
  ctx.fillRect(spec.w / 2 - 12, -spec.h / 2 + 4, 6, spec.h - 8);
  // Headlights at night.
  if (car.headlights) {
    ctx.fillStyle = '#fff8c0';
    ctx.beginPath();
    ctx.arc(spec.w / 2, -spec.h / 2 + 4, 3, 0, Math.PI * 2);
    ctx.arc(spec.w / 2, spec.h / 2 - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cop livery.
  if (car.type === 'cop') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-8, -spec.h / 2, 16, spec.h);
    ctx.fillStyle = '#0a0f16';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VCPD', 0, 3);
    ctx.textAlign = 'left';
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e7bff';
    ctx.beginPath();
    ctx.arc(-4, -spec.h / 2 - 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#2e7bff' : '#ff2e2e';
    ctx.beginPath();
    ctx.arc(4, -spec.h / 2 - 1, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.type === 'taxi') {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

export function drawWorld(ctx, game) {
  const cam = game.camera;
  const city = game.city;
  const time = game.time;
  const night = game.dayNight; // 0 = noon, 1 = deep night
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  const vx0 = cam.x - 60;
  const vy0 = cam.y - 60;
  const vx1 = cam.x + VIEW_W + 60;
  const vy1 = cam.y + VIEW_H + 60;
  // Ground: district grass/sand.
  ctx.fillStyle = '#3d4a3a';
  ctx.fillRect(0, 0, 2000, WORLD_H);
  ctx.fillStyle = '#c9b489';
  ctx.fillRect(2000, 0, 960, WORLD_H);
  // Ocean.
  ctx.fillStyle = '#155a8a';
  ctx.fillRect(2960, 0, WORLD_W - 2960, WORLD_H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 10; i += 1) {
    const wy = (i * 260 + time * 12) % WORLD_H;
    ctx.fillRect(2970, wy, 90, 3);
  }
  // Beach strip.
  ctx.fillStyle = '#e8d9ae';
  ctx.fillRect(2880, 0, 80, WORLD_H);
  // Roads.
  ctx.fillStyle = '#23272e';
  for (let x = 200; x < WORLD_W; x += ROAD_SPACING) ctx.fillRect(x - ROAD_HALF, 0, ROAD_HALF * 2, WORLD_H);
  for (let y = 200; y < WORLD_H; y += ROAD_SPACING) ctx.fillRect(0, y - ROAD_HALF, 2960, ROAD_HALF * 2);
  // Lane dashes.
  ctx.fillStyle = '#e8c85a';
  for (let x = 200; x < WORLD_W; x += ROAD_SPACING) {
    for (let y = 0; y < WORLD_H; y += 56) {
      if (y % 112 < 56) ctx.fillRect(x - 2, y, 4, 26);
    }
  }
  for (let y = 200; y < WORLD_H; y += ROAD_SPACING) {
    for (let x = 0; x < 2960; x += 56) {
      if (x % 112 < 56) ctx.fillRect(x, y - 2, 26, 4);
    }
  }
  // Sidewalks.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 10;
  for (let x = 200; x < WORLD_W; x += ROAD_SPACING) {
    ctx.beginPath(); ctx.moveTo(x - ROAD_HALF - 6, 0); ctx.lineTo(x - ROAD_HALF - 6, WORLD_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + ROAD_HALF + 6, 0); ctx.lineTo(x + ROAD_HALF + 6, WORLD_H); ctx.stroke();
  }
  // Buildings with height shadows and lit windows.
  for (const b of city.buildings) {
    if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + b.height * 3, b.y + b.height * 3, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Windows.
    const cols = Math.floor(b.w / 26);
    const rows = Math.floor(b.h / 26);
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        const lit = ((cx * 7 + cy * 13 + b.height) % 5) < 2;
        ctx.fillStyle = lit ? '#ffe9a8' : 'rgba(20,30,50,0.55)';
        ctx.fillRect(b.x + 8 + cx * 26, b.y + 8 + cy * 26, 14, 16);
      }
    }
  }
  // Landmark labels.
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const lm of city.landmarks) {
    if (lm.x < vx0 || lm.x > vx1 || lm.y < vy0 || lm.y > vy1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const tw = ctx.measureText(lm.name).width + 14;
    ctx.fillRect(lm.x - tw / 2, lm.y - 44, tw, 20);
    ctx.fillStyle = '#ffcf3d';
    ctx.fillText(lm.name, lm.x, lm.y - 29);
  }
  ctx.textAlign = 'left';
  // Palms on the beachfront.
  for (const palm of city.palms) {
    if (palm.x < vx0 || palm.x > vx1 || palm.y < vy0 || palm.y > vy1) continue;
    ctx.save();
    ctx.translate(palm.x, palm.y);
    ctx.scale(palm.s, palm.s);
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
    ctx.fillStyle = '#3f8a4a';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 10, -22 + Math.sin(a) * 6, 12, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Mission target ring + GPS line.
  const m = game.mission;
  if (m.index >= 0 && m.target && !m.done && !m.failed) {
    const pulse = 1 + 0.12 * Math.sin(time * 4);
    ctx.strokeStyle = '#ffcf3d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(m.target.x, m.target.y, m.target.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,207,61,0.12)';
    ctx.fill();
    ctx.fillStyle = '#ffcf3d';
    ctx.beginPath();
    ctx.arc(m.target.x, m.target.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Roadblocks.
  for (const rb of game.police.roadblocks) drawCarShape(ctx, rb);
  // Traffic + player car.
  for (const car of game.cars) {
    if (car.dead) continue;
    car.headlights = night > 0.4;
    drawCarShape(ctx, car);
  }
  // Pedestrians.
  for (const ped of game.peds) {
    if (ped.dead) continue;
    if (ped.x < vx0 || ped.x > vx1 || ped.y < vy0 || ped.y > vy1) continue;
    const bob = Math.sin(ped.walkPhase) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(ped.x, ped.y + 7, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.pants;
    ctx.fillRect(ped.x - 4, ped.y + bob, 8, 7);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(ped.x, ped.y + bob - 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(ped.x, ped.y + bob - 9, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  // Enemies (red jackets, health bars).
  for (const e of game.combat.enemies) {
    if (e.dead) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c22e2e';
    ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(e.x, e.y - 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(e.x - 12, e.y - 22, 24, 4);
    ctx.fillStyle = '#ff5a4e';
    ctx.fillRect(e.x - 12, e.y - 22, 24 * (e.hp / e.maxHp), 4);
  }
  // Player on foot (Mara: teal jacket) or driving (car already drawn).
  const p = game.player;
  if (!p.car) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0e7a6b';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(2, -9, 5, 0, Math.PI * 2); ctx.fill();
    // Gun in hand.
    ctx.fillStyle = '#222';
    ctx.fillRect(6, -2, 12, 3);
    ctx.restore();
    // Aim line.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 60, p.y + Math.sin(p.angle) * 60);
    ctx.stroke();
  }
  // Bullets.
  for (const b of game.combat.bullets) {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Particles.
  for (const pt of game.combat.particles) {
    const a = pt.life / pt.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    if (pt.kind === 'smoke') {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
  }
  ctx.globalAlpha = 1;
  // Muzzle flash.
  if (game.combat.muzzle > 0) {
    const mx = p.x + Math.cos(p.angle) * 34;
    const my = p.y + Math.sin(p.angle) * 34;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.fill();
  }
  // Police cars + helicopter.
  for (const cop of game.police.cops) {
    if (cop.dead) continue;
    cop.headlights = night > 0.4;
    drawCarShape(ctx, cop);
  }
  if (game.police.heli) {
    const h = game.police.heli;
    // Spotlight cone on the ground.
    const grad = ctx.createRadialGradient(h.x, h.y + 60, 10, h.x, h.y + 60, 190);
    grad.addColorStop(0, 'rgba(255,244,180,0.28)');
    grad.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(h.x, h.y + 60, 190, 0, Math.PI * 2); ctx.fill();
    // Heli body + rotor blur.
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 14, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2733';
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    const r = h.rotor;
    ctx.beginPath();
    ctx.moveTo(Math.cos(r) * 34, Math.sin(r) * 6);
    ctx.lineTo(-Math.cos(r) * 34, -Math.sin(r) * 6);
    ctx.stroke();
    ctx.restore();
  }
  // Day/night tint: dusk falls as the clock runs.
  if (night > 0) {
    ctx.fillStyle = `rgba(16,20,64,${(night * 0.34).toFixed(3)})`;
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  }
  ctx.restore();
}
