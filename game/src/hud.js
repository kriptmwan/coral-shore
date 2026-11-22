// HUD: wanted stars, cash, health/armor, mission banner, weapon slot, radio,
// a live minimap with GPS route, the weapon wheel, garage, pause and title.
// Everything is drawn on the canvas so screenshots carry the whole game.
import { VIEW_W, VIEW_H, WEAPONS, WEAPON_ORDER, RADIO_STATIONS, GARAGE_TIERS, CAR_TYPES, MISSIONS } from './config.js';

const MINIMAP = { x: VIEW_W - 228, y: VIEW_H - 188, w: 208, h: 168 };

export function drawMinimap(ctx, game) {
  const { x, y, w, h } = MINIMAP;
  const sx = w / 3200;
  const sy = h / 2400;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,18,0.82)';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.strokeStyle = '#e8c85a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // Ocean + districts.
  ctx.fillStyle = '#123a5c';
  ctx.fillRect(x + 2960 * sx, y, w - 2960 * sx, h);
  ctx.fillStyle = '#20262e';
  ctx.fillRect(x, y, 2960 * sx, h);
  // Roads.
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 2;
  for (let rx = 200; rx < 3200; rx += 400) {
    ctx.beginPath(); ctx.moveTo(x + rx * sx, y); ctx.lineTo(x + rx * sx, y + h); ctx.stroke();
  }
  for (let ry = 200; ry < 2400; ry += 400) {
    ctx.beginPath(); ctx.moveTo(x, y + ry * sy); ctx.lineTo(x + w, y + ry * sy); ctx.stroke();
  }
  // GPS route to the mission target.
  const m = game.mission;
  if (m.index >= 0 && m.target && !m.done && !m.failed) {
    ctx.strokeStyle = '#ffcf3d';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x + game.player.x * sx, y + game.player.y * sy);
    ctx.lineTo(x + m.target.x * sx, y + m.target.y * sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffcf3d';
    ctx.beginPath();
    ctx.arc(x + m.target.x * sx, y + m.target.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Blips: cops red/blue, enemies red, player white arrow.
  for (const cop of game.police.cops) {
    ctx.fillStyle = '#3d7bff';
    ctx.fillRect(x + cop.x * sx - 3, y + cop.y * sy - 3, 6, 6);
  }
  if (game.police.heli) {
    ctx.fillStyle = '#ff3d3d';
    ctx.beginPath(); ctx.arc(x + game.police.heli.x * sx, y + game.police.heli.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const e of game.combat.enemies) {
    if (e.dead) continue;
    ctx.fillStyle = '#ff3d3d';
    ctx.fillRect(x + e.x * sx - 2, y + e.y * sy - 2, 5, 5);
  }
  ctx.fillStyle = '#fff';
  ctx.save();
  ctx.translate(x + game.player.x * sx, y + game.player.y * sy);
  ctx.rotate(game.player.angle);
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = '#e8c85a';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('CORAL SHORE', x - 2, y + h + 14);
}

function drawStars(ctx, wanted, time) {
  const x0 = VIEW_W - 220;
  const y0 = 16;
  for (let i = 0; i < 5; i += 1) {
    const on = i < wanted;
    const pulse = on && wanted >= 4 ? 1 + 0.18 * Math.sin(time * 6 + i) : 1;
    ctx.save();
    ctx.translate(x0 + i * 34, y0 + 14);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = on ? '#ffd23d' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
      const px = Math.cos(a) * 13;
      const py = Math.sin(a) * 13;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawBar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, w * frac), h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(label, x + 6, y + h - 4);
}

export function drawHUD(ctx, game) {
  const p = game.player;
  const time = game.time;
  ctx.save();
  // Top-left: cash, respect, mission banner.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 12, 250, 64);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`$${game.cash.toLocaleString('en-US')}`, 24, 40);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`RESPECT ${game.respect}`, 24, 62);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Mara Voss — ${game.districtAtPlayer}`, 130, 62);
  const m = game.mission;
  if (m.index >= 0 && !m.done && !m.failed) {
    const def = MISSIONS[m.index];
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(14, 84, 430, 46);
    ctx.fillStyle = '#ffcf3d';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`MISSION ${def.id}: ${def.title}`, 24, 103);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(m.objective, 24, 121);
    if (m.timer > 0) {
      ctx.fillStyle = m.timer < 15 ? '#ff5a4e' : '#fff';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`${Math.ceil(m.timer)}s`, 400, 103);
    }
  } else if (m.index >= 0 && (m.done || m.failed)) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(14, 84, 430, 30);
    ctx.fillStyle = m.done ? '#7dff8a' : '#ff5a4e';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(m.message, 24, 104);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(14, 84, 430, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    const next = game.stats.missionsDone;
    ctx.fillText(next < 8 ? `Next job: ${MISSIONS[next].title} — press M at a phone booth` : 'All 8 missions done — the city is yours', 24, 104);
  }
  // Wanted stars, top-right.
  drawStars(ctx, game.police.wanted, time);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(game.police.wanted > 0 ? 'VCPD ON YOUR TAIL' : 'VCPD CLEAR', VIEW_W - 220, 52);
  // Bottom-left: health / armor.
  drawBar(ctx, 16, VIEW_H - 66, 220, 18, p.health / 100, '#e33d3d', `HEALTH ${Math.ceil(p.health)}`);
  drawBar(ctx, 16, VIEW_H - 42, 220, 18, p.armor / 100, '#3d7bff', `ARMOR ${Math.ceil(p.armor)}`);
  // Bottom-right above minimap: weapon + radio.
  const w = WEAPONS[p.weapon];
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(VIEW_W - 228, VIEW_H - 236, 208, 40);
  ctx.fillStyle = w.color;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${w.name}  ${p.ammo} / ${w.mag}`, VIEW_W - 218, VIEW_H - 212);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`[Q] wheel  [R] ${RADIO_STATIONS[game.audio.station].name}`, VIEW_W - 218, VIEW_H - 196);
  // Toasts.
  if (game.toast && game.toast.t > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const tw = ctx.measureText(game.toast.text).width + 30;
    ctx.fillRect((VIEW_W - tw) / 2, VIEW_H - 250, tw, 30);
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(game.toast.text, (VIEW_W - tw) / 2 + 15, VIEW_H - 230);
  }
  // Damage vignette.
  if (p.health < 35) {
    const a = (35 - p.health) / 35 * (0.25 + 0.1 * Math.sin(time * 5));
    ctx.fillStyle = `rgba(200,0,0,${a.toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  drawMinimap(ctx, game);
  ctx.restore();
}

export function drawWeaponWheel(ctx, game) {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WEAPON WHEEL', cx, cy - 180);
  ctx.textAlign = 'left';
  WEAPON_ORDER.forEach((id, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / WEAPON_ORDER.length;
    const x = cx + Math.cos(a) * 110;
    const y = cy + Math.sin(a) * 110;
    const w = WEAPONS[id];
    const owned = id === 'pistol' || game.unlocked[id];
    const selected = game.player.weapon === id;
    ctx.fillStyle = selected ? '#ffcf3d' : 'rgba(20,24,32,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = selected ? '#fff' : '#555';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = owned ? '#fff' : '#777';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.name, x, y - 4);
    ctx.font = '11px sans-serif';
    ctx.fillText(owned ? `DMG ${w.damage}` : 'LOCKED', x, y + 14);
    ctx.textAlign = 'left';
  });
  ctx.restore();
}

export function drawGarage(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CORAL GARAGE', VIEW_W / 2, 120);
  ctx.font = '15px sans-serif';
  ctx.fillText(`Cash: $${game.cash.toLocaleString('en-US')} — pick a ride, it spawns outside`, VIEW_W / 2, 150);
  GARAGE_TIERS.forEach((tier, i) => {
    const y = 210 + i * 150;
    const car = CAR_TYPES[tier.car];
    const owned = game.garageTier >= tier.tier;
    const afford = game.cash >= tier.cost;
    ctx.fillStyle = owned ? 'rgba(30,60,40,0.9)' : 'rgba(20,24,32,0.9)';
    ctx.fillRect(340, y, 600, 120);
    ctx.strokeStyle = owned ? '#7dff8a' : '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(340, y, 600, 120);
    // Car silhouette.
    ctx.save();
    ctx.translate(400, y + 60);
    ctx.fillStyle = car.color;
    ctx.fillRect(-34, -13, 68, 26);
    ctx.fillStyle = '#1a2028';
    ctx.fillRect(-14, -9, 26, 18);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`TIER ${tier.tier} — ${tier.name}: ${car.name}`, 470, y + 42);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`Top speed ${car.top} — Acceleration ${car.accel}`, 470, y + 66);
    ctx.fillStyle = owned ? '#7dff8a' : afford ? '#ffcf3d' : '#ff5a4e';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(owned ? 'OWNED — press 1/2/3 to take it' : `$${tier.cost} — press 1/2/3 to buy`, 470, y + 94);
  });
  ctx.fillStyle = '#aaa';
  ctx.font = '13px sans-serif';
  ctx.fillText('Press G or Esc to leave the garage', VIEW_W / 2, 700);
  ctx.restore();
}

export function drawTitle(ctx, game) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#ff7a3d');
  grad.addColorStop(0.45, '#c23d7a');
  grad.addColorStop(1, '#1c1440');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sun + skyline silhouette.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 330, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,10,40,0.9)';
  for (let i = 0; i < 14; i += 1) {
    const bw = 60 + ((i * 37) % 50);
    const bh = 140 + ((i * 53) % 180);
    ctx.fillRect(40 + i * 88, 560 - bh, bw, bh);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CORAL SHORE', VIEW_W / 2, 240);
  ctx.fillStyle = '#ffcf3d';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('A GTA 6-style open world — Vice City is waiting', VIEW_W / 2, 290);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Mara Voss is back in town. Eight missions. Five stars. One city to take.', VIEW_W / 2, 600);
  ctx.fillStyle = '#ffcf3d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('WASD move / drive  •  E enter car  •  F steal car  •  Mouse aim + click shoot', VIEW_W / 2, 640);
  ctx.fillText('Q weapon wheel  •  R radio  •  G garage  •  M next mission  •  P pause', VIEW_W / 2, 668);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(game.stats.missionsDone > 0 ? `Missions done: ${game.stats.missionsDone}/8 — press SPACE to continue` : 'Press SPACE to start', VIEW_W / 2, 720);
  ctx.restore();
}

export function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillText('P or Esc to resume — progress autosaves after every mission', VIEW_W / 2, VIEW_H / 2 + 30);
  ctx.restore();
}

export function drawBusted(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,30,0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ff5a4e';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText('The VCPD took Mara in. Press SPACE to post bail ($200) and walk free.', VIEW_W / 2, VIEW_H / 2 + 40);
  ctx.restore();
}
