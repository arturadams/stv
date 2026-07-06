// ── Arcana Engine · canvas renderer ────────────────────────────────────────
// Dark arcane fantasy: parchment, ink, gold foil, constellations, ritual circles.

import { ARENA } from './world.js';
import { ELEMENT_COLORS } from './data.js';

const MARGIN = 420; // void border drawn around the arena
let floorCanvas = null;

const RUNE_GLYPHS = '✦✧☽☾♁♆⚶⚸☿♄✺❖'.split('');

function makeFloor() {
  const c = document.createElement('canvas');
  c.width = ARENA.w + MARGIN * 2; c.height = ARENA.h + MARGIN * 2;
  const g = c.getContext('2d');
  g.translate(MARGIN, MARGIN);

  // astral void + constellations
  g.fillStyle = '#05060f';
  g.fillRect(-MARGIN, -MARGIN, c.width, c.height);
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * c.width - MARGIN, y = Math.random() * c.height - MARGIN;
    if (x > -30 && x < ARENA.w + 30 && y > -30 && y < ARENA.h + 30) continue;
    const s = Math.random();
    g.fillStyle = `rgba(${180 + s * 60}, ${190 + s * 50}, 255, ${0.25 + s * 0.55})`;
    g.fillRect(x, y, s < 0.9 ? 1.5 : 2.5, s < 0.9 ? 1.5 : 2.5);
  }
  // floating bookshelf silhouettes in the void
  for (let i = 0; i < 14; i++) {
    const edge = i % 4;
    let x, y;
    if (edge === 0) { x = Math.random() * ARENA.w; y = -MARGIN * (0.3 + Math.random() * 0.5); }
    else if (edge === 1) { x = Math.random() * ARENA.w; y = ARENA.h + MARGIN * (0.25 + Math.random() * 0.5); }
    else if (edge === 2) { x = -MARGIN * (0.3 + Math.random() * 0.55); y = Math.random() * ARENA.h; }
    else { x = ARENA.w + MARGIN * (0.25 + Math.random() * 0.55); y = Math.random() * ARENA.h; }
    const w = 90 + Math.random() * 120, h = 130 + Math.random() * 160;
    g.save(); g.translate(x, y); g.rotate((Math.random() - 0.5) * 0.35);
    g.fillStyle = '#0d0f1e'; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(217,180,91,0.18)'; g.lineWidth = 2; g.strokeRect(-w / 2, -h / 2, w, h);
    for (let s = 0; s < 3; s++) {
      const sy = -h / 2 + (s + 1) * h / 4;
      g.strokeStyle = 'rgba(217,180,91,0.12)'; g.beginPath(); g.moveTo(-w / 2, sy); g.lineTo(w / 2, sy); g.stroke();
      let bx = -w / 2 + 6;
      while (bx < w / 2 - 8) {
        const bw = 5 + Math.random() * 9, bh = 14 + Math.random() * 9;
        const hues = ['#1c2440', '#31203a', '#3a2a1c', '#20303a', '#2b1e2e'];
        g.fillStyle = hues[(Math.random() * hues.length) | 0];
        g.fillRect(bx, sy - bh, bw, bh);
        bx += bw + 2;
      }
    }
    g.restore();
  }

  // marble floor
  g.fillStyle = '#11142a';
  g.fillRect(0, 0, ARENA.w, ARENA.h);
  const tile = 110;
  for (let ty = 0; ty < ARENA.h / tile; ty++) {
    for (let tx = 0; tx < ARENA.w / tile; tx++) {
      const v = Math.random();
      g.fillStyle = `rgba(${20 + v * 14}, ${22 + v * 13}, ${52 + v * 16}, 1)`;
      g.fillRect(tx * tile + 1.5, ty * tile + 1.5, tile - 3, tile - 3);
      if (Math.random() < 0.13) { // broken tile
        g.fillStyle = 'rgba(4,5,12,0.55)';
        g.fillRect(tx * tile + 1.5, ty * tile + 1.5, tile - 3, tile - 3);
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
        g.beginPath();
        let cx = tx * tile + Math.random() * tile, cy = ty * tile;
        g.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) { cx += (Math.random() - 0.5) * 50; cy += tile / 4; g.lineTo(cx, cy); }
        g.stroke();
      }
    }
  }
  // grout
  g.strokeStyle = 'rgba(5,6,15,0.85)'; g.lineWidth = 3;
  for (let x = 0; x <= ARENA.w; x += tile) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ARENA.h); g.stroke(); }
  for (let y = 0; y <= ARENA.h; y += tile) { g.beginPath(); g.moveTo(0, y); g.lineTo(ARENA.w, y); g.stroke(); }

  // central ritual circle in worn gold
  const cx = ARENA.w / 2, cy = ARENA.h / 2;
  g.strokeStyle = 'rgba(217,180,91,0.16)';
  for (const [r, w] of [[420, 5], [385, 2], [255, 3], [140, 2]]) {
    g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = 'rgba(217,180,91,0.2)';
  g.font = '28px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save(); g.translate(cx + Math.cos(a) * 320, cy + Math.sin(a) * 320); g.rotate(a + Math.PI / 2);
    g.fillText(RUNE_GLYPHS[i % RUNE_GLYPHS.length], 0, 0);
    g.restore();
  }
  // connecting star lines
  g.strokeStyle = 'rgba(217,180,91,0.08)'; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 7; i++) {
    const a = (i * 3 / 7) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * 255, py = cy + Math.sin(a) * 255;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.stroke();

  // torn cards scattered on the floor
  for (let i = 0; i < 26; i++) {
    const x = 60 + Math.random() * (ARENA.w - 120), y = 60 + Math.random() * (ARENA.h - 120);
    g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI * 2);
    g.fillStyle = 'rgba(210,196,160,0.10)';
    g.fillRect(-11, -16, 22, 32);
    g.strokeStyle = 'rgba(217,180,91,0.12)'; g.lineWidth = 1; g.strokeRect(-11, -16, 22, 32);
    g.fillStyle = 'rgba(217,180,91,0.14)'; g.font = '13px Georgia, serif';
    g.fillText(RUNE_GLYPHS[(Math.random() * RUNE_GLYPHS.length) | 0], 0, 2);
    g.restore();
  }

  // arena border: gold trim over the void edge
  g.strokeStyle = 'rgba(217,180,91,0.45)'; g.lineWidth = 4; g.strokeRect(0, 0, ARENA.w, ARENA.h);
  g.strokeStyle = 'rgba(217,180,91,0.18)'; g.lineWidth = 12; g.strokeRect(-10, -10, ARENA.w + 20, ARENA.h + 20);
  return c;
}

export function render(game, ctx, W, H) {
  if (!floorCanvas) floorCanvas = makeFloor();
  const t = game.time;
  const cam = game.camera;
  const scale = Math.max(0.72, Math.min(1.25, Math.min(W / 1350, H / 880)));

  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  const shx = (Math.random() - 0.5) * cam.shake, shy = (Math.random() - 0.5) * cam.shake;
  ctx.translate(W / 2 + shx, H / 2 + shy);
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  // floor
  ctx.drawImage(floorCanvas, -MARGIN, -MARGIN);

  drawArenaLife(game, ctx, t);
  for (const z of game.zones) drawZone(ctx, z, t);
  for (const tg of game.telegraphs) drawTelegraph(ctx, tg, t);
  drawChannelPreview(game, ctx, t);
  for (const pk of game.pickups) drawPickup(ctx, pk, t);
  for (const e of game.enemies) drawEnemy(ctx, e, t);
  for (const s of game.summons) drawSummon(ctx, s, t);
  drawPlayer(game, ctx, t);
  for (const pr of game.enemyProjectiles) drawEnemyProj(ctx, pr, t);
  for (const pr of game.projectiles) drawProj(ctx, pr, t);
  drawFx(game, ctx);
  drawParticles(game, ctx);
  for (const f of game.floaters) drawFloater(ctx, f);

  ctx.restore();
}

function drawArenaLife(game, ctx, t) {
  const a = game.arena;
  // ink pools: dark, glossy, slow-swirling
  for (const p of a.inkPools) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,18,0.92)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(143,111,255,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(143,111,255,0.14)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 0.62, p.r * 0.5, t * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // pillars
  for (const pil of a.pillars) {
    ctx.fillStyle = '#0a0c1c';
    ctx.beginPath(); ctx.ellipse(pil.x, pil.y + 8, pil.r * 1.1, pil.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    const gr = ctx.createLinearGradient(pil.x - pil.r, pil.y, pil.x + pil.r, pil.y);
    gr.addColorStop(0, '#1c2038'); gr.addColorStop(0.5, '#2e3354'); gr.addColorStop(1, '#141830');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(pil.x, pil.y, pil.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(217,180,91,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pil.x, pil.y, pil.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(217,180,91,0.12)';
    ctx.beginPath(); ctx.arc(pil.x, pil.y, pil.r - 7, 0, Math.PI * 2); ctx.stroke();
  }
  // shrines
  for (const sh of a.shrines) {
    const ready = sh.cd <= 0;
    const pulse = ready ? 0.5 + Math.sin(t * 3) * 0.25 : 0.12;
    ctx.save();
    ctx.strokeStyle = `rgba(143,216,255,${pulse})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r + 8 + Math.sin(t * 2) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ready ? 'rgba(143,216,255,0.85)' : 'rgba(80,110,140,0.5)';
    ctx.translate(sh.x, sh.y); ctx.rotate(t * 0.8);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a2 = (i / 4) * Math.PI * 2; ctx.lineTo(Math.cos(a2) * sh.r * 0.7, Math.sin(a2) * sh.r * 0.7); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    if (ready) glow(ctx, sh.x, sh.y, 46, 'rgba(143,216,255,0.16)');
  }
  // candles: flickering warm light
  for (const cd of a.candles) {
    const fl = 0.75 + Math.sin(t * 9 + cd.x) * 0.12 + Math.sin(t * 23 + cd.y) * 0.06;
    glow(ctx, cd.x, cd.y - 12, 70 * fl, 'rgba(255,180,80,0.10)');
    ctx.fillStyle = '#d9cba8';
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * 10, oh = 10 + ((cd.x + i * 7) % 8);
      ctx.fillRect(cd.x + ox - 2, cd.y - oh, 4, oh);
      ctx.fillStyle = `rgba(255,${170 + i * 20},60,${fl})`;
      ctx.beginPath(); ctx.ellipse(cd.x + ox, cd.y - oh - 5, 2.4, 5 * fl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9cba8';
    }
  }
}

function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// ── channel preview: the signature ritual circle ──
function drawChannelPreview(game, ctx, t) {
  const ch = game.engine.channel;
  if (!ch || !ch.preview) return;
  const pv = ch.preview;
  const prog = ch.dur > 0 ? Math.min(1, ch.t / ch.dur) : 1;
  const color = pv.color || '#b48cff';

  if (pv.reticle) {
    // small tracking reticle on the projectile's target
    if (pv.enemy && !pv.enemy.dead) { pv.x = pv.enemy.x; pv.y = pv.enemy.y; }
    ctx.save();
    ctx.translate(pv.x, pv.y); ctx.rotate(t * 2);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    const r = pv.r + 4 * Math.sin(t * 6);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.arc(0, 0, r, -0.35, 0.35); ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const { x, y, r } = pv;
  ctx.save();
  // soft fill + pulse
  const pulse = 0.06 + 0.04 * Math.sin(t * 5);
  ctx.fillStyle = hexA(color, pulse + prog * 0.10);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // outer dashed ring, slowly rotating
  ctx.strokeStyle = hexA(color, 0.55); ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // inner rune ring
  ctx.strokeStyle = hexA(color, 0.3);
  ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = hexA(color, 0.75);
  ctx.font = `${Math.max(13, r * 0.14)}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const nG = 8;
  for (let i = 0; i < nG; i++) {
    const a = (i / nG) * Math.PI * 2 + t * 0.5;
    ctx.fillText(RUNE_GLYPHS[i % RUNE_GLYPHS.length], x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
  }
  // clock-like progress arc 0% → 100%
  ctx.strokeStyle = hexA(color, 0.95); ctx.lineWidth = Math.max(4, r * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
  ctx.stroke(); ctx.lineCap = 'butt';
  // card glyph at the heart of the circle
  ctx.fillStyle = hexA(color, 0.5 + prog * 0.5);
  ctx.font = `${Math.max(20, r * 0.3)}px Georgia, serif`;
  ctx.fillText(ch.inst.def.glyph, x, y);
  // nearly-done flare
  if (prog > 0.85) glow(ctx, x, y, r * 0.9, hexA(color, (prog - 0.85) * 1.2));
  ctx.restore();
}

function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

function drawZone(ctx, z, t) {
  const fade = Math.min(1, (z.duration - z.t) * 2, z.t * 4);
  const c = z.color || '#b48cff';
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = hexA(c, 0.10 + 0.03 * Math.sin(t * 4));
  ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(c, 0.4); ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]); ctx.lineDashOffset = t * 20;
  ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // drifting element motes
  for (let i = 0; i < 7; i++) {
    const a = t * (0.5 + i * 0.13) + i * 2.3;
    const rr = z.r * (0.25 + ((i * 37) % 60) / 100);
    ctx.fillStyle = hexA(c, 0.5);
    ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawTelegraph(ctx, tg, t) {
  const prog = tg.t / tg.dur;
  const c = tg.color || '#c23b4a';
  ctx.save();
  if (tg.shape === 'circle') {
    ctx.fillStyle = hexA(c, 0.08 + prog * 0.16);
    ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(c, 0.8); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); ctx.stroke();
    // shrinking inner ring = time remaining
    ctx.strokeStyle = hexA(c, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * prog, 0, Math.PI * 2); ctx.stroke();
    if (prog > 0.75) {
      ctx.fillStyle = hexA(c, (prog - 0.75) * 0.8 * (0.6 + 0.4 * Math.sin(t * 25)));
      ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (tg.shape === 'rect') {
    const { x, y, w, h } = tg;
    ctx.fillStyle = hexA(c, 0.08 + prog * 0.18);
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = hexA(c, 0.8); ctx.lineWidth = 2.5;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    // closing "pages" from both sides
    const cl = (w / 2) * prog;
    ctx.fillStyle = hexA(c, 0.22);
    ctx.fillRect(x - w / 2, y - h / 2, cl, h);
    ctx.fillRect(x + w / 2 - cl, y - h / 2, cl, h);
  }
  ctx.restore();
}

function drawPickup(ctx, pk, t) {
  const bob = Math.sin(t * 4 + pk.x) * 3;
  if (pk.kind === 'shard') {
    ctx.save();
    ctx.translate(pk.x, pk.y + bob); ctx.rotate(t * 2);
    glow(ctx, 0, 0, 16, 'rgba(255,217,122,0.25)');
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4.5, 0); ctx.lineTo(0, 7); ctx.lineTo(-4.5, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff3cf'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    glow(ctx, 0, 0, 18, 'rgba(126,224,138,0.3)');
    ctx.fillStyle = '#7fe08a';
    ctx.font = '15px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✚', 0, 0);
    ctx.restore();
  }
}

// ── enemies: corrupted arcana silhouettes ──
function drawEnemy(ctx, e, t) {
  ctx.save();
  const spawn = e.state === 'spawn';
  if (spawn) { ctx.globalAlpha = 1 - e.stateT / 0.7; }
  const flash = e.hitFlash > 0;
  const frozen = (e.freeze || 0) > 0;
  ctx.translate(e.x, e.y);

  const id = e.def.id;
  if (id === 'wisp') drawWisp(ctx, e, t);
  else if (id === 'sentinel') drawSentinel(ctx, e, t);
  else if (id === 'horror') drawHorror(ctx, e, t);
  else if (id === 'knight' || id === 'custodian') drawKnight(ctx, e, t);
  else if (id === 'book') drawBook(ctx, e, t);
  else if (id === 'librarian') drawLibrarian(ctx, e, t);

  if (flash) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, e.r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (frozen) {
    ctx.fillStyle = 'rgba(143,216,255,0.35)';
    ctx.strokeStyle = 'rgba(200,240,255,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(Math.cos(a) * (e.r + 5), Math.sin(a) * (e.r + 5)); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (e.mark && e.mark.t > 0) {
    ctx.strokeStyle = 'rgba(169,143,224,0.9)'; ctx.lineWidth = 2;
    ctx.save(); ctx.rotate(t * 3);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; ctx.lineTo(Math.cos(a) * (e.r + 9), Math.sin(a) * (e.r + 9)); }
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  // status pips
  let px = -8;
  for (const name of Object.keys(e.statuses)) {
    const colors = { burn: '#ff8a4a', poison: '#8ade6a', bleed: '#ff5d6a', chill: '#8fd8ff' };
    ctx.fillStyle = colors[name] || '#fff';
    ctx.beginPath(); ctx.arc(px, -e.r - 12, 3, 0, Math.PI * 2); ctx.fill();
    px += 8;
  }
  // hp bar (only if damaged, bosses use the big DOM bar)
  if (!e.def.boss && e.hp < e.maxHp) {
    const w = e.r * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-w / 2, -e.r - 8, w, 3.5);
    ctx.fillStyle = e.def.elite ? '#ffd97a' : '#c23b4a';
    ctx.fillRect(-w / 2, -e.r - 8, w * Math.max(0, e.hp / e.maxHp), 3.5);
  }
  ctx.restore();
}

function drawWisp(ctx, e, t) {
  const w = Math.sin(e.wobble) * 2;
  glow(ctx, 0, 0, e.r * 2, 'rgba(143,111,255,0.13)');
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r - w);
  ctx.bezierCurveTo(e.r, -e.r, e.r + w, e.r * 0.5, 0, e.r + 3 + Math.sin(e.wobble * 2) * 3);
  ctx.bezierCurveTo(-e.r - w, e.r * 0.5, -e.r, -e.r, 0, -e.r - w);
  ctx.fill();
  ctx.strokeStyle = 'rgba(143,111,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  // ink drips
  ctx.fillStyle = 'rgba(35,28,60,0.8)';
  ctx.beginPath(); ctx.ellipse(3, e.r + 6, 2, 4 + Math.sin(e.wobble * 3) * 2, 0, 0, Math.PI * 2); ctx.fill();
  // eyes
  ctx.fillStyle = '#c9b6ff';
  ctx.beginPath(); ctx.arc(-4, -2, 2, 0, Math.PI * 2); ctx.arc(4, -2, 2, 0, Math.PI * 2); ctx.fill();
}

function drawSentinel(ctx, e, t) {
  glow(ctx, 0, 0, e.r * 2.2, 'rgba(143,216,255,0.12)');
  ctx.save(); ctx.rotate(t * 0.9);
  ctx.strokeStyle = '#4a6a90'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r); }
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = 'rgba(143,216,255,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.72, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  const charging = e.fireT < 0.5;
  ctx.fillStyle = charging ? '#d8f2ff' : '#8fd8ff';
  ctx.font = `${e.r * 0.9}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('☉', 0, 1);
  if (charging) glow(ctx, 0, 0, e.r * 1.6, 'rgba(200,240,255,0.25)');
}

function drawHorror(ctx, e, t) {
  const fusing = e.state === 'fuse';
  const pulse = fusing ? 1 + Math.sin(t * 30) * 0.12 : 1 + Math.sin(e.wobble) * 0.04;
  ctx.save(); ctx.scale(pulse, pulse);
  ctx.rotate(Math.sin(e.wobble * 0.7) * 0.15);
  glow(ctx, 0, 0, e.r * 2, fusing ? 'rgba(255,138,74,0.3)' : 'rgba(255,138,74,0.1)');
  // open book with fangs of pages
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-e.r, -e.r * 0.5); ctx.lineTo(0, -e.r * 0.2); ctx.lineTo(e.r, -e.r * 0.5);
  ctx.lineTo(e.r, e.r * 0.6); ctx.lineTo(0, e.r * 0.9); ctx.lineTo(-e.r, e.r * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,138,74,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  // page teeth
  ctx.fillStyle = '#d9cba8';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * e.r * 0.35 - 3, -e.r * 0.32);
    ctx.lineTo(i * e.r * 0.35, e.r * 0.05 + (i % 2 ? 4 : 0));
    ctx.lineTo(i * e.r * 0.35 + 3, -e.r * 0.32);
    ctx.fill();
  }
  // burning eye
  ctx.fillStyle = fusing ? '#fff1c9' : '#ff8a4a';
  ctx.beginPath(); ctx.arc(0, e.r * 0.35, fusing ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawKnight(ctx, e, t) {
  const elite = e.def.elite;
  const tel = e.state === 'telegraph';
  if (elite) glow(ctx, 0, 0, e.r * 2.4, 'rgba(255,217,122,0.14)');
  if (tel) {
    // lunge warning line
    ctx.strokeStyle = 'rgba(194,59,74,0.6)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(e.lungeDir.x * e.def.lungeSpeed * 0.38, e.lungeDir.y * e.def.lungeSpeed * 0.38);
    ctx.stroke(); ctx.setLineDash([]);
  }
  const sh = tel ? Math.sin(t * 40) * 1.5 : 0;
  ctx.save(); ctx.translate(sh, 0);
  // shield-shaped body
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r);
  ctx.bezierCurveTo(e.r, -e.r, e.r, -e.r * 0.1, e.r * 0.75, e.r * 0.5);
  ctx.lineTo(0, e.r);
  ctx.lineTo(-e.r * 0.75, e.r * 0.5);
  ctx.bezierCurveTo(-e.r, -e.r * 0.1, -e.r, -e.r, 0, -e.r);
  ctx.fill();
  ctx.strokeStyle = elite ? 'rgba(255,217,122,0.85)' : 'rgba(194,59,74,0.55)';
  ctx.lineWidth = elite ? 2.5 : 1.5; ctx.stroke();
  // helm slit
  ctx.fillStyle = elite ? '#ffd97a' : '#ff5d6a';
  ctx.fillRect(-e.r * 0.45, -e.r * 0.45, e.r * 0.9, 3);
  // emblem
  ctx.fillStyle = elite ? 'rgba(255,217,122,0.7)' : 'rgba(194,59,74,0.5)';
  ctx.font = `${e.r * 0.8}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(elite ? '♛' : '✠', 0, e.r * 0.25);
  ctx.restore();
}

function drawBook(ctx, e, t) {
  const flap = Math.sin(e.wobble * 3) * 0.5 + 0.6;
  glow(ctx, 0, 0, e.r * 1.8, 'rgba(255,138,74,0.12)');
  ctx.save();
  ctx.rotate(Math.atan2(e.y, e.x) * 0 + Math.sin(e.wobble) * 0.2);
  ctx.fillStyle = e.def.color;
  // two wings of pages
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-e.r * 1.4, -e.r * flap, -e.r * 1.7, e.r * 0.2);
  ctx.quadraticCurveTo(-e.r * 0.7, e.r * 0.3, 0, e.r * 0.4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(e.r * 1.4, -e.r * flap, e.r * 1.7, e.r * 0.2);
  ctx.quadraticCurveTo(e.r * 0.7, e.r * 0.3, 0, e.r * 0.4); ctx.fill();
  ctx.fillStyle = '#d9cba8';
  ctx.beginPath(); ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(-e.r * 1.1, -e.r * flap * 0.8, -e.r * 1.4, e.r * 0.1);
  ctx.quadraticCurveTo(-e.r * 0.5, e.r * 0.15, 0, e.r * 0.25); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(e.r * 1.1, -e.r * flap * 0.8, e.r * 1.4, e.r * 0.1);
  ctx.quadraticCurveTo(e.r * 0.5, e.r * 0.15, 0, e.r * 0.25); ctx.fill();
  ctx.fillStyle = '#ff8a4a';
  ctx.beginPath(); ctx.arc(0, 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLibrarian(ctx, e, t) {
  const ph2 = e.bossPhase === 2;
  glow(ctx, 0, 0, e.r * 3.2, ph2 ? 'rgba(255,217,122,0.2)' : 'rgba(143,111,255,0.16)');
  const hover = Math.sin(t * 1.6) * 5;
  ctx.save(); ctx.translate(0, hover);
  // torn robes: tall tapering silhouette
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.5);
  ctx.bezierCurveTo(e.r * 0.9, -e.r * 1.2, e.r * 1.05, -e.r * 0.1, e.r * 0.8, e.r * 0.7);
  for (let i = 3; i >= -3; i--) ctx.lineTo(i * e.r * 0.26, e.r * (i % 2 ? 1.15 : 0.85));
  ctx.bezierCurveTo(-e.r * 1.05, -e.r * 0.1, -e.r * 0.9, -e.r * 1.2, 0, -e.r * 1.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,180,91,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  // golden mask
  ctx.fillStyle = '#d9b45b';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.95, e.r * 0.42, e.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6a25'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = ph2 ? '#ff5d6a' : '#1a1430';
  ctx.beginPath(); ctx.ellipse(-e.r * 0.16, -e.r * 1.0, 3.5, 6, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(e.r * 0.16, -e.r * 1.0, 3.5, 6, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // orbiting cursed books & spinning cards
  for (let i = 0; i < 4; i++) {
    const a = t * 1.1 + (i / 4) * Math.PI * 2;
    const bx = Math.cos(a) * e.r * 1.9, by = Math.sin(a) * e.r * 1.4 + hover;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
    ctx.fillStyle = '#2c2016'; ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = '#d9b45b'; ctx.fillRect(-9, -6, 3, 12);
    ctx.restore();
  }
  for (let i = 0; i < 5; i++) {
    const a = -t * 1.7 + (i / 5) * Math.PI * 2;
    const cx2 = Math.cos(a) * e.r * 2.6, cy2 = Math.sin(a) * e.r * 2.0 + hover;
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(a + t);
    ctx.fillStyle = 'rgba(232,220,192,0.85)'; ctx.fillRect(-5, -8, 10, 16);
    ctx.strokeStyle = 'rgba(217,180,91,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(-5, -8, 10, 16);
    ctx.restore();
  }
}

function drawSummon(ctx, s, t) {
  const fade = Math.min(1, s.t * 3, (s.dur - s.t) * 2);
  ctx.save();
  ctx.globalAlpha = 0.75 * fade;
  ctx.translate(s.x, s.y + Math.sin(t * 3) * 4);
  glow(ctx, 0, 0, 30, 'rgba(169,143,224,0.25)');
  ctx.fillStyle = '#241d3d';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(12, -12, 11, 8, 8, 16);
  ctx.lineTo(-8, 16);
  ctx.bezierCurveTo(-11, 8, -12, -12, 0, -16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(169,143,224,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#c9b6ff';
  ctx.beginPath(); ctx.arc(-3, -6, 1.8, 0, Math.PI * 2); ctx.arc(3, -6, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── the player: a hooded card-binder ──
function drawPlayer(game, ctx, t) {
  const p = game.player;
  // dash trail
  for (const tr of p.trail) {
    const a = 1 - tr.t / 0.3;
    ctx.fillStyle = `rgba(217,180,91,${a * 0.25})`;
    ctx.beginPath(); ctx.arc(tr.x, tr.y, p.r * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.untargetable > 0) ctx.globalAlpha = 0.45;
  else if (p.iframes > 0) ctx.globalAlpha = 0.65 + Math.sin(t * 40) * 0.2;
  glow(ctx, 0, 0, 46, 'rgba(217,180,91,0.12)');
  const bob = Math.sin(t * 5) * 1.2;
  ctx.translate(0, bob);
  // cloak
  ctx.fillStyle = '#181c34';
  ctx.beginPath();
  ctx.moveTo(0, -p.r - 4);
  ctx.bezierCurveTo(p.r + 4, -p.r, p.r + 2, p.r * 0.6, p.r * 0.7, p.r + 2);
  ctx.lineTo(-p.r * 0.7, p.r + 2);
  ctx.bezierCurveTo(-p.r - 2, p.r * 0.6, -p.r - 4, -p.r, 0, -p.r - 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,180,91,0.75)'; ctx.lineWidth = 1.8; ctx.stroke();
  // hood + ivory mask
  ctx.fillStyle = '#101427';
  ctx.beginPath(); ctx.arc(0, -p.r * 0.45, p.r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.ellipse(Math.cos(p.facing) * 2.5, -p.r * 0.45 + Math.sin(p.facing) * 1.5, p.r * 0.34, p.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  // glowing sigil on the chest
  ctx.fillStyle = `rgba(255,217,122,${0.7 + Math.sin(t * 3) * 0.25})`;
  ctx.font = `${p.r * 0.75}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✦', 0, p.r * 0.3);
  ctx.restore();
  // three tarot cards orbit the binder — the deck made visible
  for (let i = 0; i < 3; i++) {
    const a = t * 1.4 + (i / 3) * Math.PI * 2;
    const cx = p.x + Math.cos(a) * 30, cy = p.y + Math.sin(a) * 22 - 6;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(Math.sin(a) * 0.5);
    ctx.fillStyle = 'rgba(20,22,42,0.95)';
    ctx.fillRect(-4.5, -7, 9, 14);
    ctx.strokeStyle = 'rgba(217,180,91,0.9)'; ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -7, 9, 14);
    ctx.fillStyle = 'rgba(255,217,122,0.8)';
    ctx.font = '7px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦', 0, 0.5);
    ctx.restore();
  }
}

function drawProj(ctx, pr, t) {
  ctx.save();
  glow(ctx, pr.x, pr.y, pr.r * 3.4, hexA(pr.color || '#ffffff', 0.22));
  ctx.translate(pr.x, pr.y);
  ctx.rotate(Math.atan2(pr.vy, pr.vx));
  if (pr.boomerang) {
    ctx.rotate(t * 18);
    ctx.fillStyle = '#c9c2b2';
    ctx.beginPath(); ctx.moveTo(-pr.r, -3); ctx.lineTo(pr.r, -pr.r); ctx.lineTo(pr.r, pr.r); ctx.lineTo(-pr.r, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a6a25'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (pr.r >= 18) { // arcane orb
    ctx.fillStyle = hexA(pr.color, 0.35);
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(pr.color, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * (0.75 + Math.sin(t * 6) * 0.1), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  } else {
    // comet: bright head, fading tail
    const grad = ctx.createLinearGradient(-pr.r * 4.5, 0, pr.r, 0);
    grad.addColorStop(0, hexA(pr.color, 0));
    grad.addColorStop(1, hexA(pr.color, 0.8));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-pr.r * 4.5, 0); ctx.lineTo(0, -pr.r * 0.8); ctx.lineTo(pr.r, 0); ctx.lineTo(0, pr.r * 0.8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.65, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawEnemyProj(ctx, pr, t) {
  glow(ctx, pr.x, pr.y, pr.r * 3, hexA(pr.color, 0.25));
  ctx.save();
  ctx.translate(pr.x, pr.y); ctx.rotate(t * 6);
  ctx.fillStyle = pr.color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; ctx.lineTo(Math.cos(a) * pr.r, Math.sin(a) * pr.r); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawFx(game, ctx) {
  for (const fx of game.fx) {
    const k = fx.t / fx.life, inv = 1 - k;
    ctx.save();
    if (fx.kind === 'ring' || fx.kind === 'spawn') {
      const r = fx.kind === 'spawn' ? fx.r * (1.8 - k * 1.2) : fx.r * (0.4 + k);
      ctx.strokeStyle = hexA(fx.color, inv * 0.8); ctx.lineWidth = 3 * inv + 1;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.stroke();
    } else if (fx.kind === 'blast') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA(fx.color, inv * 0.28);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.5 + k * 0.6), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexA(fx.color, inv); ctx.lineWidth = 4 * inv + 1;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.6 + k * 0.5), 0, Math.PI * 2); ctx.stroke();
    } else if (fx.kind === 'rectblast') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA(fx.color, inv * 0.3);
      ctx.fillRect(fx.x - fx.w / 2, fx.y - fx.h / 2, fx.w, fx.h);
    } else if (fx.kind === 'arc') {
      ctx.translate(fx.x, fx.y);
      ctx.fillStyle = hexA(fx.color, inv * 0.3);
      ctx.strokeStyle = hexA(fx.color, inv * 0.9); ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, fx.range * (0.75 + k * 0.3), fx.ang - fx.arc / 2, fx.ang + fx.arc / 2);
      if (fx.arc < Math.PI * 1.9) { ctx.lineTo(0, 0); ctx.closePath(); }
      ctx.fill(); ctx.stroke();
    } else if (fx.kind === 'bolt') {
      ctx.strokeStyle = hexA(fx.color, inv); ctx.lineWidth = 3 * inv + 1;
      ctx.globalCompositeOperation = 'lighter';
      const segs = 6;
      ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
      for (let i = 1; i < segs; i++) {
        const q = i / segs;
        ctx.lineTo(fx.x1 + (fx.x2 - fx.x1) * q + (Math.random() - 0.5) * 22, fx.y1 + (fx.y2 - fx.y1) * q + (Math.random() - 0.5) * 22);
      }
      ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
    } else if (fx.kind === 'streak') {
      ctx.strokeStyle = hexA(fx.color, inv * 0.7); ctx.lineWidth = 10 * inv + 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
    } else if (fx.kind === 'cast') {
      ctx.strokeStyle = hexA(fx.color, inv * 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 20 + k * 26, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawParticles(game, ctx) {
  ctx.save();
  for (const pt of game.particles) {
    const a = 1 - pt.t / pt.life;
    if (pt.add) ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function drawFloater(ctx, f) {
  const a = 1 - (f.t / f.life) ** 2;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `${f.crit ? 'bold ' : ''}${f.size}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
  ctx.strokeText(f.txt, f.x, f.y);
  ctx.fillStyle = f.color;
  ctx.fillText(f.txt, f.x, f.y);
  ctx.restore();
}
