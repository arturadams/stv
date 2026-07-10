// ── Arcana Engine · canvas renderer ────────────────────────────────────────
// Dark arcane fantasy: parchment, ink, gold foil, ritual circles — now painted
// over an infinite chunk-generated realm.

import { CHUNK, getChunk, colorOf, worldDef } from './world.js';
import { ELEMENT_COLORS, SCHOOL_COLORS, CLASSES } from './data.js';

const RUNE_GLYPHS = '✦✧☽☾♁♆⚶⚸☿♄✺❖'.split('');

// ── chunk floor cache ──
const chunkCanvases = new Map(); // key -> canvas
const CHUNK_CACHE_MAX = 90;

function tileHash(x, y, seed) {
  let h = (x | 0) * 73856093 ^ (y | 0) * 19349663 ^ (seed | 0) * 83492791;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function makeChunkCanvas(game, ch) {
  const c = document.createElement('canvas');
  c.width = CHUNK; c.height = CHUNK;
  const g = c.getContext('2d');
  const b = ch.biome;
  const [fr, fg, fb] = b.floor, [vr, vg, vb] = b.tileVar;

  g.fillStyle = `rgb(${fr},${fg},${fb})`;
  g.fillRect(0, 0, CHUNK, CHUNK);
  const tile = 112;
  const tx0 = ch.cx * CHUNK / tile, ty0 = ch.cy * CHUNK / tile;
  for (let ty = 0; ty < CHUNK / tile; ty++) {
    for (let tx = 0; tx < CHUNK / tile; tx++) {
      const v = tileHash(tx0 + tx, ty0 + ty, game.worldSeed);
      g.fillStyle = `rgb(${fr + v * vr | 0}, ${fg + v * vg | 0}, ${fb + v * vb | 0})`;
      g.fillRect(tx * tile + 1.5, ty * tile + 1.5, tile - 3, tile - 3);
      if (tileHash(tx0 + tx, ty0 + ty, game.worldSeed + 5) < 0.12) { // broken tile
        g.fillStyle = 'rgba(4,5,12,0.5)';
        g.fillRect(tx * tile + 1.5, ty * tile + 1.5, tile - 3, tile - 3);
      }
    }
  }
  // grout
  g.strokeStyle = b.grout; g.lineWidth = 3;
  for (let x = 0; x <= CHUNK; x += tile) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CHUNK); g.stroke(); }
  for (let y = 0; y <= CHUNK; y += tile) { g.beginPath(); g.moveTo(0, y); g.lineTo(CHUNK, y); g.stroke(); }

  const bx = ch.cx * CHUNK, by = ch.cy * CHUNK;
  // scattered deco: torn cards & worn runes
  for (const d of ch.deco) {
    g.save(); g.translate(d.x - bx, d.y - by); g.rotate(d.rot);
    if (d.kind === 'card') {
      g.fillStyle = 'rgba(210,196,160,0.10)';
      g.fillRect(-11, -16, 22, 32);
      g.strokeStyle = 'rgba(217,180,91,0.12)'; g.lineWidth = 1; g.strokeRect(-11, -16, 22, 32);
      g.fillStyle = 'rgba(217,180,91,0.14)'; g.font = '13px Georgia, serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.deco[d.g % b.deco.length], 0, 2);
    } else {
      g.fillStyle = hexA(b.accent, 0.10); g.font = '22px Georgia, serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.deco[d.g % b.deco.length], 0, 0);
    }
    g.restore();
  }
  // hazard pools baked into the floor
  for (const p of ch.pools) {
    g.save();
    g.fillStyle = b.hazard;
    g.beginPath(); g.ellipse(p.x - bx, p.y - by, p.r, p.r * 0.82, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = b.hazardEdge; g.lineWidth = 2;
    g.beginPath(); g.ellipse(p.x - bx, p.y - by, p.r, p.r * 0.82, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  return c;
}

function chunkCanvasFor(game, ch) {
  const key = ch.cx + ',' + ch.cy + ':' + game.worldSeed;
  let c = chunkCanvases.get(key);
  if (!c) {
    c = makeChunkCanvas(game, ch);
    chunkCanvases.set(key, c);
    if (chunkCanvases.size > CHUNK_CACHE_MAX) {
      const first = chunkCanvases.keys().next().value;
      chunkCanvases.delete(first);
    }
  }
  return c;
}

export function render(game, ctx, W, H) {
  const t = game.time;
  const cam = game.camera;
  const scale = Math.max(0.72, Math.min(1.25, Math.min(W / 1350, H / 880)));

  ctx.fillStyle = worldDef(game).sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  const shx = (Math.random() - 0.5) * cam.shake, shy = (Math.random() - 0.5) * cam.shake;
  ctx.translate(W / 2 + shx, H / 2 + shy);
  ctx.scale(scale, scale);
  ctx.translate(-cam.x, -cam.y);

  // visible chunk range
  const halfW = W / 2 / scale + CHUNK, halfH = H / 2 / scale + CHUNK;
  const cx0 = Math.floor((cam.x - halfW) / CHUNK), cx1 = Math.floor((cam.x + halfW) / CHUNK);
  const cy0 = Math.floor((cam.y - halfH) / CHUNK), cy1 = Math.floor((cam.y + halfH) / CHUNK);
  const visible = [];
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const ch = getChunk(game, cx, cy);
      visible.push(ch);
      ctx.drawImage(chunkCanvasFor(game, ch), cx * CHUNK, cy * CHUNK);
    }
  }

  for (const ch of visible) drawChunkLife(game, ctx, ch, t);
  drawPortal(game, ctx, t);
  drawRegionBoundary(game, ctx, t);
  if (worldDef(game).num === 3) drawMarineSnow(game, ctx, t, W, H, scale);
  for (const hz of game.hazards) drawHazard(ctx, hz, t);
  for (const z of game.zones) drawZone(ctx, z, t);
  for (const tr of game.traps) drawTrap(ctx, tr, t);
  for (const tg of game.telegraphs) drawTelegraph(ctx, tg, t);
  drawChannelPreview(game, ctx, t);
  for (const pk of game.pickups) drawPickup(ctx, pk, t);
  for (const e of game.enemies) drawEnemy(ctx, e, t);
  for (const s of game.summons) drawSummon(ctx, s, t);
  if (game.ally) drawCompanion(ctx, game.ally, t, true);
  if (game.rival) drawCompanion(ctx, game.rival, t, false);
  drawPlayer(game, ctx, t);
  for (const pr of game.enemyProjectiles) drawEnemyProj(ctx, pr, t);
  for (const pr of game.projectiles) drawProj(ctx, pr, t);
  drawFx(game, ctx);
  drawParticles(game, ctx);
  for (const f of game.floaters) drawFloater(ctx, f);

  ctx.restore();

  drawCompass(game, ctx, W, H, scale);
}

// the portal a world's last boss tears open — patient, but not eternal.
// In its final seconds it gutters and shows its countdown.
function drawPortal(game, ctx, t) {
  const pt = game.portal;
  if (!pt) return;
  const urgent = pt.timeLeft < 20;
  const flick = urgent ? 0.72 + Math.sin(t * 10) * 0.28 : 1;
  ctx.save();
  glow(ctx, pt.x, pt.y, 120, hexA('#8fd8ff', 0.14 * flick));
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = hexA(urgent ? '#ffb38a' : '#8fd8ff', (0.5 - i * 0.12) * flick);
    ctx.lineWidth = 3 - i * 0.7;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, 34 + i * 10 + Math.sin(t * 2 + i) * 4, 48 + i * 12 + Math.cos(t * 2.4 + i) * 4, t * (0.4 + i * 0.15), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = hexA('#dff4ff', (0.5 + Math.sin(t * 3) * 0.2) * flick);
  ctx.font = '26px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✦', pt.x, pt.y);
  if (urgent) {
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillStyle = hexA('#ffb38a', 0.9);
    ctx.fillText(Math.ceil(pt.timeLeft) + 's', pt.x, pt.y + 72);
  }
  ctx.restore();
}

// World III: marine snow — the courts sit under a sea that never stops falling
function drawMarineSnow(game, ctx, t, W, H, scale) {
  const cam = game.camera;
  const hw = W / 2 / scale + 30, hh = H / 2 / scale + 30;
  const spanX = hw * 2, spanY = hh * 2;
  ctx.save();
  for (let i = 0; i < 44; i++) {
    // world-anchored specks, wrapped into the visible rect
    const seedX = ((i * 733 + 389) % 1021) * 3.1;
    const seedY = ((i * 967 + 211) % 1013) * 2.7;
    const sway = Math.sin(t * 0.5 + i * 1.7) * 16;
    const sink = t * (7 + (i % 5) * 3.5);
    const x = cam.x - hw + (((seedX + sway - cam.x + hw) % spanX) + spanX) % spanX;
    const y = cam.y - hh + (((seedY + sink - cam.y + hh) % spanY) + spanY) % spanY;
    ctx.fillStyle = hexA('#cfe8ee', Math.max(0.08, 0.14 + 0.1 * Math.sin(t * 1.3 + i * 2.6)));
    ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ── living features per chunk ──
function drawChunkLife(game, ctx, ch, t) {
  // pillars
  for (const pil of ch.pillars) {
    ctx.fillStyle = '#0a0c1c';
    ctx.beginPath(); ctx.ellipse(pil.x, pil.y + 8, pil.r * 1.1, pil.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    const gr = ctx.createLinearGradient(pil.x - pil.r, pil.y, pil.x + pil.r, pil.y);
    gr.addColorStop(0, '#1c2038'); gr.addColorStop(0.5, '#2e3354'); gr.addColorStop(1, '#141830');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(pil.x, pil.y, pil.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(217,180,91,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pil.x, pil.y, pil.r, 0, Math.PI * 2); ctx.stroke();
  }
  // shrines
  if (ch.shrine) {
    const sh = ch.shrine;
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
  // candles
  for (const cd of ch.candles) {
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
  // enemy camp: cursed totem + banner ring
  if (ch.camp && !ch.camp.cleared) {
    const cp = ch.camp;
    ctx.save();
    ctx.strokeStyle = hexA('#c23b4a', cp.engaged ? 0.5 : 0.22); ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 16;
    ctx.beginPath(); ctx.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // totem
    glow(ctx, cp.x, cp.y - 20, 50, 'rgba(194,59,74,0.18)');
    ctx.fillStyle = '#231a26';
    ctx.fillRect(cp.x - 7, cp.y - 46, 14, 52);
    ctx.strokeStyle = 'rgba(194,59,74,0.7)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(cp.x - 7, cp.y - 46, 14, 52);
    ctx.fillStyle = `rgba(255,90,90,${0.6 + Math.sin(t * 4) * 0.3})`;
    ctx.font = '16px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('♅', cp.x, cp.y - 30);
    ctx.restore();
  }
  // boss gate landmark
  if (ch.landmark && !ch.landmark.cleared) {
    const lm = ch.landmark;
    ctx.save();
    glow(ctx, lm.x, lm.y, 130, 'rgba(255,217,122,0.10)');
    ctx.strokeStyle = hexA('#ffd97a', 0.4 + Math.sin(t * 2) * 0.15); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(lm.x, lm.y, lm.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = hexA('#ffd97a', 0.15);
    ctx.beginPath(); ctx.arc(lm.x, lm.y, lm.r * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = hexA('#ffd97a', 0.5);
    ctx.font = '30px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 0.3;
      ctx.fillText(RUNE_GLYPHS[i * 2 % RUNE_GLYPHS.length], lm.x + Math.cos(a) * lm.r * 0.85, lm.y + Math.sin(a) * lm.r * 0.85);
    }
    ctx.font = '44px Georgia, serif';
    ctx.fillStyle = hexA('#ffd97a', 0.6 + Math.sin(t * 3) * 0.2);
    ctx.fillText('☩', lm.x, lm.y);
    ctx.restore();
  }
  // sanctuary: a warded hearth in the dark
  if (ch.sanctuary) {
    const s = ch.sanctuary;
    ctx.save();
    // ward ring
    ctx.strokeStyle = hexA('#8fd8ff', 0.28 + Math.sin(t * 1.5) * 0.08); ctx.lineWidth = 2;
    ctx.setLineDash([4, 14]); ctx.lineDashOffset = -t * 8;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = hexA('#8fd8ff', 0.03);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    // hearth fire
    const fl = 0.8 + Math.sin(t * 8 + s.x) * 0.14 + Math.sin(t * 21) * 0.06;
    glow(ctx, s.x, s.y - 8, 90 * fl, 'rgba(255,180,80,0.16)');
    ctx.fillStyle = '#2c2016';
    for (let i = 0; i < 4; i++) { // log circle
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate((i / 4) * Math.PI + 0.4);
      ctx.fillRect(-16, -3, 32, 6);
      ctx.restore();
    }
    ctx.fillStyle = `rgba(255,${150 + fl * 60 | 0},60,${0.85 * fl})`;
    ctx.beginPath();
    ctx.moveTo(s.x - 8, s.y);
    ctx.quadraticCurveTo(s.x - 6, s.y - 18 * fl, s.x, s.y - 26 * fl);
    ctx.quadraticCurveTo(s.x + 6, s.y - 18 * fl, s.x + 8, s.y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${0.9 * fl})`;
    ctx.beginPath(); ctx.ellipse(s.x, s.y - 6, 3.5, 8 * fl, 0, 0, Math.PI * 2); ctx.fill();
    // card table beside the fire
    ctx.fillStyle = '#241d16'; ctx.fillRect(s.x + 28, s.y - 12, 34, 22);
    ctx.strokeStyle = 'rgba(217,180,91,0.5)'; ctx.lineWidth = 1.2; ctx.strokeRect(s.x + 28, s.y - 12, 34, 22);
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(s.x + 36 + i * 9, s.y - 2); ctx.rotate(-0.2 + i * 0.2);
      ctx.fillStyle = 'rgba(232,220,192,0.75)'; ctx.fillRect(-3.5, -5.5, 7, 11);
      ctx.restore();
    }
    ctx.restore();
  }
  // treasure cache
  if (ch.treasure && !ch.treasure.opened) {
    const tr = ch.treasure;
    const bob = Math.sin(t * 2.5 + tr.x) * 2;
    ctx.save();
    glow(ctx, tr.x, tr.y, 34, 'rgba(255,217,122,0.16)');
    ctx.translate(tr.x, tr.y + bob);
    ctx.fillStyle = '#2c2016';
    ctx.fillRect(-14, -10, 28, 20);
    ctx.strokeStyle = '#d9b45b'; ctx.lineWidth = 2;
    ctx.strokeRect(-14, -10, 28, 20);
    ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(14, -2); ctx.stroke();
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath(); ctx.arc(0, -2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── bounded regions: duel zones & boss gates ──
function drawRegionBoundary(game, ctx, t) {
  const z = game.zoneRegion;
  if (!z) return;
  const color = z.kind === 'duel' ? '#c23b4a' : '#ffd97a';
  ctx.save();
  ctx.strokeStyle = hexA(color, 0.55); ctx.lineWidth = 4;
  ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 24;
  ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = hexA(color, 0.18); ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(z.x, z.y, z.r + 9, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = hexA(color, 0.55);
  ctx.font = '20px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.15;
    ctx.fillText(RUNE_GLYPHS[i % RUNE_GLYPHS.length], z.x + Math.cos(a) * (z.r + 24), z.y + Math.sin(a) * (z.r + 24));
  }
  ctx.restore();
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
  const pulse = 0.06 + 0.04 * Math.sin(t * 5);
  ctx.fillStyle = hexA(color, pulse + prog * 0.10);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.55); ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
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
  ctx.fillStyle = hexA(color, 0.5 + prog * 0.5);
  ctx.font = `${Math.max(20, r * 0.3)}px Georgia, serif`;
  ctx.fillText(ch.inst.def.glyph, x, y);
  if (prog > 0.85) glow(ctx, x, y, r * 0.9, hexA(color, (prog - 0.85) * 1.2));
  ctx.restore();
}

function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

// ── ground hazards: burning slag and leviathan ink — the floor as a weapon ──
function drawHazard(ctx, hz, t) {
  const fade = Math.min(1, (hz.dur - hz.t) * 1.5, hz.t * 5);
  // deterministic per-hazard jitter so embers don't dance every frame
  const seed = (hz.x * 31 + hz.y * 17) % 100;
  ctx.save();
  ctx.globalAlpha = fade;
  if (hz.kind === 'ink') {
    ctx.fillStyle = 'rgba(8,10,24,0.78)';
    ctx.beginPath(); ctx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.82, seed, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(hz.color, 0.4); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.82, seed, 0, Math.PI * 2); ctx.stroke();
    // an oily sheen slides across the pool
    ctx.fillStyle = hexA(hz.color, 0.14 + Math.sin(t * 1.6 + seed) * 0.06);
    ctx.beginPath();
    ctx.ellipse(hz.x + Math.cos(t + seed) * hz.r * 0.25, hz.y + Math.sin(t * 0.7 + seed) * hz.r * 0.2,
      hz.r * 0.5, hz.r * 0.28, t * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (hz.kind === 'brine') {
    // standing seawater: a cold pool the tide forgot to take back
    ctx.fillStyle = 'rgba(8,26,32,0.72)';
    ctx.beginPath(); ctx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.85, seed, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(hz.color, 0.45); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hz.x, hz.y, hz.r, hz.r * 0.85, seed, 0, Math.PI * 2); ctx.stroke();
    // slow ripples spread from where it last swallowed something
    const rip = (t * 0.55 + seed) % 1;
    ctx.strokeStyle = hexA(hz.color, 0.35 * (1 - rip)); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(hz.x, hz.y, hz.r * rip, hz.r * rip * 0.85, seed, 0, Math.PI * 2); ctx.stroke();
    // bubbles rise and pop at the surface
    for (let i = 0; i < 4; i++) {
      const cyc = (t * (0.5 + (i % 3) * 0.2) + i * 1.3 + seed) % 1.4;
      const a = seed * 3 + i * 2.1;
      ctx.strokeStyle = hexA('#d8f2ee', Math.max(0, 0.55 - cyc * 0.4));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hz.x + Math.cos(a) * hz.r * 0.5, hz.y + Math.sin(a) * hz.r * 0.4 - cyc * 6, 1.2 + cyc * 1.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // scorched base
    ctx.fillStyle = 'rgba(16,6,3,0.7)';
    ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2); ctx.fill();
    // molten veins breathe
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + Math.sin(t * 5 + seed) * 0.2;
    ctx.fillStyle = hexA(hz.color, 0.16 * pulse);
    ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(hz.color, 0.5 * pulse); ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = seed + i * 1.257;
      ctx.beginPath();
      ctx.moveTo(hz.x + Math.cos(a) * hz.r * 0.15, hz.y + Math.sin(a) * hz.r * 0.15);
      ctx.quadraticCurveTo(
        hz.x + Math.cos(a + 0.5) * hz.r * 0.55, hz.y + Math.sin(a + 0.5) * hz.r * 0.55,
        hz.x + Math.cos(a + 0.2) * hz.r * 0.9, hz.y + Math.sin(a + 0.2) * hz.r * 0.9);
      ctx.stroke();
    }
    // embers lift off the slag
    for (let i = 0; i < 4; i++) {
      const cycle = (t * (0.6 + (i % 3) * 0.25) + i * 1.7 + seed) % 1.6;
      const a = seed * 2 + i * 2.4;
      ctx.fillStyle = hexA(i % 2 ? '#fff1c9' : hz.color, Math.max(0, 0.7 - cycle * 0.5));
      ctx.beginPath();
      ctx.arc(hz.x + Math.cos(a) * hz.r * 0.5, hz.y + Math.sin(a) * hz.r * 0.5 - cycle * 16, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
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
  for (let i = 0; i < 7; i++) {
    const a = t * (0.5 + i * 0.13) + i * 2.3;
    const rr = z.r * (0.25 + ((i * 37) % 60) / 100);
    ctx.fillStyle = hexA(c, 0.5);
    ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawTrap(ctx, tr, t) {
  const arming = tr.armT > 0;
  const a = arming ? 0.65 : 0.28 + Math.sin(t * 3) * 0.06;
  ctx.save();
  ctx.strokeStyle = hexA(tr.color, a); ctx.lineWidth = arming ? 2.5 : 1.5;
  ctx.setLineDash([5, 7]); ctx.lineDashOffset = t * 10;
  ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r * 0.55, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(tr.x, tr.y);
  ctx.rotate(arming ? t * 6 : Math.PI / 4);
  ctx.fillStyle = hexA(tr.color, arming ? 0.9 : 0.5);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(3, -4); ctx.lineTo(-3, -4); ctx.closePath(); ctx.fill();
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
    ctx.strokeStyle = hexA(c, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * prog, 0, Math.PI * 2); ctx.stroke();
    if (prog > 0.75 && !tg.friendly) {
      ctx.fillStyle = hexA(c, (prog - 0.75) * 0.8 * (0.6 + 0.4 * Math.sin(t * 25)));
      ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (tg.shape === 'rect') {
    const { x, y, w, h } = tg;
    ctx.translate(x, y);
    if (tg.ang) ctx.rotate(tg.ang);
    ctx.fillStyle = hexA(c, 0.08 + prog * 0.18);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = hexA(c, 0.8); ctx.lineWidth = 2.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    const cl = (w / 2) * prog;
    ctx.fillStyle = hexA(c, 0.22);
    ctx.fillRect(-w / 2, -h / 2, cl, h);
    ctx.fillRect(w / 2 - cl, -h / 2, cl, h);
    if (prog > 0.75 && !tg.friendly) {
      ctx.fillStyle = hexA(c, (prog - 0.75) * 0.7 * (0.6 + 0.4 * Math.sin(t * 25)));
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
  } else if (tg.shape === 'ring') {
    // annulus: safe inside, safe outside — the band is the promise
    const { x, y, r, band } = tg;
    ctx.strokeStyle = hexA(c, 0.75); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + band / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, Math.max(4, r - band / 2), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = hexA(c, 0.1 + prog * 0.3); ctx.lineWidth = band;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // the arming sweep runs the band like a fuse
    ctx.strokeStyle = hexA(c, 0.85); ctx.lineWidth = band * 0.55;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
    if (prog > 0.75 && !tg.friendly) {
      ctx.strokeStyle = hexA(c, (prog - 0.75) * 0.9 * (0.6 + 0.4 * Math.sin(t * 25)));
      ctx.lineWidth = band;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPickup(ctx, pk, t) {
  const bob = Math.sin(t * 4 + pk.x) * 3;
  if (pk.kind === 'gold') {
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    glow(ctx, 0, 0, 14, 'rgba(255,217,122,0.3)');
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 5 * (0.4 + Math.abs(Math.sin(t * 3 + pk.x)) * 0.6), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a25'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    return;
  }
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
  if (e.state === 'vanish') {
    if (id === 'leviathan') { // swimming beneath the tiles
      drawLeviathanSubmerged(ctx, e, t);
      ctx.restore();
      return;
    }
    if (id === 'phoenix') { // the ember shell of her moult
      drawPhoenixEgg(ctx, e, t);
      ctx.restore();
      return;
    }
    if (id === 'reliquary') { // sealed nacre — nothing you own can scratch it
      drawReliquaryShell(ctx, e, t);
      ctx.restore();
      return;
    }
    // stalkers phase out into ash
    ctx.fillStyle = hexA(e.def.glow, 0.18 + Math.sin(t * 9) * 0.06);
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  if (id === 'wisp') drawWisp(ctx, e, t);
  else if (id === 'imp') drawImp(ctx, e, t);
  else if (id === 'sentinel') drawSentinel(ctx, e, t);
  else if (id === 'horror') drawHorror(ctx, e, t);
  else if (id === 'knight' || id === 'custodian' || id === 'guardian') drawKnight(ctx, e, t);
  else if (id === 'book') drawBook(ctx, e, t);
  else if (id === 'librarian') drawLibrarian(ctx, e, t);
  else if (id === 'stalker') drawStalker(ctx, e, t);
  else if (id === 'mortar') drawMortar(ctx, e, t);
  else if (id === 'shardling' || id === 'sliver') drawShardling(ctx, e, t);
  else if (id === 'vent') drawVent(ctx, e, t);
  else if (id === 'cinder_ram') drawRam(ctx, e, t);
  else if (id === 'bellows') drawBellows(ctx, e, t);
  else if (id === 'kiln_warden') drawWarden(ctx, e, t);
  else if (id === 'leviathan') drawLeviathan(ctx, e, t);
  else if (id === 'unwritten_king') drawKing(ctx, e, t);
  else if (id === 'sovereign') drawSovereign(ctx, e, t);
  else if (id === 'colossus') drawColossus(ctx, e, t);
  else if (id === 'phoenix') drawPhoenix(ctx, e, t);
  else if (id === 'rival') drawRivalDuelist(ctx, e, t);
  else if (id === 'pallid') drawPallid(ctx, e, t);
  else if (id === 'mote') drawMote(ctx, e, t);
  else if (id === 'siren') drawSiren(ctx, e, t);
  else if (id === 'lancer') drawLancer(ctx, e, t);
  else if (id === 'urchin') drawUrchin(ctx, e, t);
  else if (id === 'maw') drawMaw(ctx, e, t);
  else if (id === 'chorister') drawChorister(ctx, e, t);
  else if (id === 'seneschal') drawSeneschal(ctx, e, t);
  else if (id === 'sunless_queen') drawQueen(ctx, e, t);
  else if (id === 'regent') drawRegent(ctx, e, t);
  else if (id === 'reliquary') drawReliquary(ctx, e, t);

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
  if (e.frenzy > 0) { // stoked white-hot by a Bellows Cantor
    ctx.strokeStyle = hexA('#ffb347', 0.55 + Math.sin(t * 14) * 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = hexA('#fff1c9', 0.7);
    for (let i = 0; i < 3; i++) {
      const cyc = (t * 1.4 + i * 0.53) % 1;
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2.7) * e.r * 0.6, -e.r * 0.3 - cyc * 18, 1.8 * (1 - cyc), 0, Math.PI * 2);
      ctx.fill();
    }
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
  // hp bar (bosses & rivals use the big DOM bar)
  if (!e.def.boss && !e.def.rival && e.hp < e.maxHp) {
    const w = e.r * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-w / 2, -e.r - 8, w, 3.5);
    ctx.fillStyle = e.def.elite ? '#ffd97a' : '#c23b4a';
    ctx.fillRect(-w / 2, -e.r - 8, w * Math.max(0, e.hp / e.maxHp), 3.5);
  }
  ctx.restore();

  // the rival's featured cards hover above it — its build identity
  if (e.def.rival && e.featured) drawFeaturedRow(ctx, e.x, e.y - e.r - 44, e.featured, t, e.ai?.casting);
}

function drawWisp(ctx, e, t) {
  const w = Math.sin(e.wobble) * 2;
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, 0.13));
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r - w);
  ctx.bezierCurveTo(e.r, -e.r, e.r + w, e.r * 0.5, 0, e.r + 3 + Math.sin(e.wobble * 2) * 3);
  ctx.bezierCurveTo(-e.r - w, e.r * 0.5, -e.r, -e.r, 0, -e.r - w);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(35,28,60,0.8)';
  ctx.beginPath(); ctx.ellipse(3, e.r + 6, 2, 4 + Math.sin(e.wobble * 3) * 2, 0, 0, Math.PI * 2); ctx.fill();
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
  const charging = e.ai?.fireT < 0.5;
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
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-e.r, -e.r * 0.5); ctx.lineTo(0, -e.r * 0.2); ctx.lineTo(e.r, -e.r * 0.5);
  ctx.lineTo(e.r, e.r * 0.6); ctx.lineTo(0, e.r * 0.9); ctx.lineTo(-e.r, e.r * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,138,74,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#d9cba8';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * e.r * 0.35 - 3, -e.r * 0.32);
    ctx.lineTo(i * e.r * 0.35, e.r * 0.05 + (i % 2 ? 4 : 0));
    ctx.lineTo(i * e.r * 0.35 + 3, -e.r * 0.32);
    ctx.fill();
  }
  ctx.fillStyle = fusing ? '#fff1c9' : '#ff8a4a';
  ctx.beginPath(); ctx.arc(0, e.r * 0.35, fusing ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawKnight(ctx, e, t) {
  const elite = e.def.elite;
  const tel = e.state === 'telegraph';
  if (elite) glow(ctx, 0, 0, e.r * 2.4, hexA(e.def.glow, 0.14));
  if (tel) {
    ctx.strokeStyle = 'rgba(194,59,74,0.6)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(e.ai?.dir?.x * e.def.lungeSpeed * 0.38, e.ai?.dir?.y * e.def.lungeSpeed * 0.38);
    ctx.stroke(); ctx.setLineDash([]);
  }
  const sh = tel ? Math.sin(t * 40) * 1.5 : 0;
  ctx.save(); ctx.translate(sh, 0);
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r);
  ctx.bezierCurveTo(e.r, -e.r, e.r, -e.r * 0.1, e.r * 0.75, e.r * 0.5);
  ctx.lineTo(0, e.r);
  ctx.lineTo(-e.r * 0.75, e.r * 0.5);
  ctx.bezierCurveTo(-e.r, -e.r * 0.1, -e.r, -e.r, 0, -e.r);
  ctx.fill();
  ctx.strokeStyle = elite ? hexA(e.def.glow, 0.85) : 'rgba(194,59,74,0.55)';
  ctx.lineWidth = elite ? 2.5 : 1.5; ctx.stroke();
  ctx.fillStyle = elite ? e.def.glow : '#ff5d6a';
  ctx.fillRect(-e.r * 0.45, -e.r * 0.45, e.r * 0.9, 3);
  ctx.fillStyle = elite ? hexA(e.def.glow, 0.7) : 'rgba(194,59,74,0.5)';
  ctx.font = `${e.r * 0.8}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(elite ? '♛' : '✠', 0, e.r * 0.25);
  ctx.restore();
}

function drawBook(ctx, e, t) {
  const flap = Math.sin(e.wobble * 3) * 0.5 + 0.6;
  glow(ctx, 0, 0, e.r * 1.8, 'rgba(255,138,74,0.12)');
  ctx.save();
  ctx.rotate(Math.sin(e.wobble) * 0.2);
  ctx.fillStyle = e.def.color;
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
  const ph2 = e.ai?.phase === 2;
  glow(ctx, 0, 0, e.r * 3.2, ph2 ? 'rgba(255,217,122,0.2)' : 'rgba(143,111,255,0.16)');
  const hover = Math.sin(t * 1.6) * 5;
  ctx.save(); ctx.translate(0, hover);
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.5);
  ctx.bezierCurveTo(e.r * 0.9, -e.r * 1.2, e.r * 1.05, -e.r * 0.1, e.r * 0.8, e.r * 0.7);
  for (let i = 3; i >= -3; i--) ctx.lineTo(i * e.r * 0.26, e.r * (i % 2 ? 1.15 : 0.85));
  ctx.bezierCurveTo(-e.r * 1.05, -e.r * 0.1, -e.r * 0.9, -e.r * 1.2, 0, -e.r * 1.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,180,91,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#d9b45b';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.95, e.r * 0.42, e.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6a25'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = ph2 ? '#ff5d6a' : '#1a1430';
  ctx.beginPath(); ctx.ellipse(-e.r * 0.16, -e.r * 1.0, 3.5, 6, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(e.r * 0.16, -e.r * 1.0, 3.5, 6, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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

// ═══ boss: the ink leviathan — a serpent of drowned ink ═══
function drawLeviathan(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  glow(ctx, 0, 0, e.r * 3, hexA(e.def.glow, ph2 ? 0.22 : 0.15));
  drawLeviathanSpine(ctx, e, t, 1);
  // the head: an angular abyssal skull, jaw slung low
  const breathe = Math.sin(t * 2.5) * 0.04;
  ctx.save();
  ctx.scale(1 + breathe, 1 - breathe);
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.25);
  ctx.bezierCurveTo(e.r * 1.15, -e.r * 0.9, e.r * 1.2, e.r * 0.15, e.r * 0.5, e.r * 0.75);
  ctx.lineTo(e.r * 0.62, e.r * 1.2);
  ctx.lineTo(e.r * 0.2, e.r * 0.85);
  ctx.lineTo(-e.r * 0.2, e.r * 0.85);
  ctx.lineTo(-e.r * 0.62, e.r * 1.2);
  ctx.lineTo(-e.r * 0.5, e.r * 0.75);
  ctx.bezierCurveTo(-e.r * 1.2, e.r * 0.15, -e.r * 1.15, -e.r * 0.9, 0, -e.r * 1.25);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.6); ctx.lineWidth = 2; ctx.stroke();
  // crest fins
  ctx.fillStyle = hexA(e.def.glow, 0.3);
  ctx.beginPath(); ctx.moveTo(0, -e.r * 1.2); ctx.lineTo(-e.r * 0.28, -e.r * 1.8); ctx.lineTo(e.r * 0.15, -e.r * 1.32); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(e.r * 0.55, -e.r * 0.95); ctx.lineTo(e.r * 0.5, -e.r * 1.5); ctx.lineTo(e.r * 0.85, -e.r * 0.75); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-e.r * 0.55, -e.r * 0.95); ctx.lineTo(-e.r * 0.5, -e.r * 1.5); ctx.lineTo(-e.r * 0.85, -e.r * 0.75); ctx.closePath(); ctx.fill();
  // pale lantern eyes
  ctx.fillStyle = ph2 ? '#c9e6ff' : e.def.glow;
  ctx.beginPath();
  ctx.ellipse(-e.r * 0.4, -e.r * 0.25, 3.2, 5.5, 0.35, 0, Math.PI * 2);
  ctx.ellipse(e.r * 0.4, -e.r * 0.25, 3.2, 5.5, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // ink weeps from the jaw
  ctx.fillStyle = 'rgba(10,14,34,0.8)';
  ctx.beginPath(); ctx.ellipse(0, e.r * 1.05, 2.4, 4.5 + Math.sin(t * 3) * 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// the spine trails behind wherever the head has been
function drawLeviathanSpine(ctx, e, t, alpha) {
  const segs = e.ai?.segs;
  if (!segs) return;
  ctx.save();
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const k = 1 - i / segs.length;
    const rr = e.r * (0.85 - i * 0.07);
    ctx.globalAlpha = alpha * (0.85 - i * 0.07);
    ctx.fillStyle = e.def.color;
    ctx.beginPath(); ctx.arc(s.x - e.x, s.y - e.y, rr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(e.def.glow, 0.35 * k); ctx.lineWidth = 1.5; ctx.stroke();
    // dorsal ridge glints
    ctx.fillStyle = hexA(e.def.glow, 0.5 * k);
    ctx.beginPath(); ctx.arc(s.x - e.x, s.y - e.y - rr * 0.55, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// submerged: only a bulge under the tiles and a wake of ripples
function drawLeviathanSubmerged(ctx, e, t) {
  drawLeviathanSpine(ctx, e, t, 0.16);
  ctx.fillStyle = 'rgba(8,12,30,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 0, e.r * 1.5, e.r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const cyc = (t * 0.9 + i * 0.33) % 1;
    ctx.strokeStyle = hexA(e.def.glow, 0.4 * (1 - cyc));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, e.r * (0.6 + cyc * 1.6), e.r * (0.35 + cyc), 0, 0, Math.PI * 2); ctx.stroke();
  }
}

// ═══ boss: the unwritten king — a crowned absence ═══
function drawKing(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  glow(ctx, 0, 0, e.r * 3.2, hexA('#b48cff', ph2 ? 0.2 : 0.13));
  const hover = Math.sin(t * 1.4) * 5;
  ctx.save();
  ctx.translate(0, hover);
  // the split torso — two stone halves that no longer meet
  const gap = 4 + Math.sin(t * 2.1) * 1.5;
  ctx.fillStyle = e.def.color;
  ctx.strokeStyle = hexA('#e8dcc0', 0.4); ctx.lineWidth = 1.8;
  ctx.beginPath(); // left half
  ctx.moveTo(-gap, -e.r * 1.1);
  ctx.bezierCurveTo(-e.r * 1.05, -e.r * 0.95, -e.r * 1.0, e.r * 0.4, -e.r * 0.6, e.r * 1.1);
  ctx.lineTo(-gap, e.r * 1.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); // right half
  ctx.moveTo(gap, -e.r * 1.1);
  ctx.bezierCurveTo(e.r * 1.05, -e.r * 0.95, e.r * 1.0, e.r * 0.4, e.r * 0.6, e.r * 1.1);
  ctx.lineTo(gap, e.r * 1.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // pale light bleeds through the chiselled-out seam
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = hexA('#e8dcc0', 0.28 + Math.sin(t * 3.7) * 0.1);
  ctx.fillRect(-gap * 0.6, -e.r * 1.05, gap * 1.2, e.r * 2.1);
  ctx.globalCompositeOperation = 'source-over';
  // the void face: a hood of nothing beneath the crown
  ctx.fillStyle = '#08060f';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.95, e.r * 0.5, e.r * 0.58, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA('#e8dcc0', 0.5); ctx.lineWidth = 1.4; ctx.stroke();
  // the crown floats above what isn't there
  const crownY = -e.r * 1.75 + Math.sin(t * 2.6) * 2.5;
  ctx.fillStyle = '#d9b45b';
  ctx.beginPath();
  ctx.moveTo(-e.r * 0.5, crownY + 8);
  ctx.lineTo(e.r * 0.5, crownY + 8);
  ctx.lineTo(e.r * 0.42, crownY - 2);
  ctx.lineTo(e.r * 0.25, crownY + 4); ctx.lineTo(e.r * 0.08, crownY - 6);
  ctx.lineTo(-e.r * 0.08, crownY + 4); ctx.lineTo(-e.r * 0.25, crownY - 6);
  ctx.lineTo(-e.r * 0.42, crownY + 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a6a25'; ctx.lineWidth = 1.4; ctx.stroke();
  if (ph2) { // the crown fractures with remembering
    ctx.strokeStyle = hexA('#ff5d6a', 0.7 + Math.sin(t * 8) * 0.25);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-e.r * 0.15, crownY - 4); ctx.lineTo(0, crownY + 6); ctx.lineTo(e.r * 0.12, crownY - 2); ctx.stroke();
  }
  ctx.restore();
  // unwritten glyphs orbit — characters scratched out of existence
  for (let i = 0; i < 6; i++) {
    const a = t * 0.9 + (i / 6) * Math.PI * 2;
    const gx = Math.cos(a) * e.r * 2.3, gy = Math.sin(a) * e.r * 1.7 + hover;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(Math.sin(a * 2) * 0.4);
    ctx.strokeStyle = hexA('#e8dcc0', 0.55);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-5, -7, 10, 14);
    ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(5, 7); ctx.moveTo(5, -7); ctx.lineTo(-5, 7); ctx.stroke();
    ctx.restore();
  }
}

// ═══ boss: the cinder sovereign — the forge-king on its cracked throne ═══
function drawSovereign(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  glow(ctx, 0, 0, e.r * 3.4, hexA(e.def.glow, ph2 ? 0.26 : 0.16));
  const breathe = Math.sin(t * 1.8) * 0.03;
  // orbiting throne shards — obsidian fragments that never landed
  for (let i = 0; i < 5; i++) {
    const a = -t * 0.7 + (i / 5) * Math.PI * 2;
    const sx = Math.cos(a) * e.r * 2.4, sy = Math.sin(a) * e.r * 1.9;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(a + t * 0.5);
    ctx.fillStyle = '#12070a';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 3); ctx.lineTo(0, 9); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.scale(1 + breathe, 1 - breathe);
  // massive shouldered bulk
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.2);
  ctx.bezierCurveTo(e.r * 1.35, -e.r * 1.05, e.r * 1.15, e.r * 0.5, e.r * 0.7, e.r * 1.0);
  ctx.lineTo(-e.r * 0.7, e.r * 1.0);
  ctx.bezierCurveTo(-e.r * 1.15, e.r * 0.5, -e.r * 1.35, -e.r * 1.05, 0, -e.r * 1.2);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 2.2; ctx.stroke();
  // magma veins crawl the obsidian hide
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexA(e.def.glow, (ph2 ? 0.85 : 0.55) + Math.sin(t * 5) * 0.15);
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-e.r * 0.85, -e.r * 0.5); ctx.quadraticCurveTo(-e.r * 0.3, 0, -e.r * 0.5, e.r * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(e.r * 0.85, -e.r * 0.5); ctx.quadraticCurveTo(e.r * 0.3, 0, e.r * 0.5, e.r * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-e.r * 0.4, -e.r * 0.9); ctx.quadraticCurveTo(0, -e.r * 0.3, e.r * 0.4, -e.r * 0.9); ctx.stroke();
  // the furnace heart, white when the forge burns white
  ctx.fillStyle = hexA(ph2 ? '#fff1c9' : e.def.glow, 0.85 + Math.sin(t * 4) * 0.15);
  ctx.beginPath(); ctx.arc(0, -e.r * 0.05, e.r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // the crown of flame — living fire, guttering and relighting
  for (let i = 0; i < 5; i++) {
    const fx2 = (i - 2) * e.r * 0.3;
    const fh = e.r * (0.45 + Math.abs(Math.sin(t * 6 + i * 1.9)) * 0.3) * (i === 2 ? 1.4 : 1);
    ctx.fillStyle = hexA(i % 2 ? '#ffb347' : e.def.glow, 0.85);
    ctx.beginPath();
    ctx.moveTo(fx2 - e.r * 0.12, -e.r * 1.1);
    ctx.quadraticCurveTo(fx2 + Math.sin(t * 8 + i) * 3, -e.r * 1.1 - fh, fx2 + e.r * 0.12, -e.r * 1.1);
    ctx.closePath(); ctx.fill();
  }
  // slit eyes of a patient king
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath();
  ctx.ellipse(-e.r * 0.3, -e.r * 0.62, 4.5, 2, 0.15, 0, Math.PI * 2);
  ctx.ellipse(e.r * 0.3, -e.r * 0.62, 4.5, 2, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ═══ boss: the slagheart colossus — a walking kiln ═══
function drawColossus(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  const tel = e.state === 'telegraph';
  const charging = e.state === 'lunging';
  const sh = tel ? Math.sin(t * 40) * 2.5 : 0;
  glow(ctx, 0, 0, e.r * 2.8, hexA(e.def.glow, charging ? 0.3 : ph2 ? 0.22 : 0.13));
  ctx.save();
  ctx.translate(sh, Math.abs(Math.sin(t * 1.1)) * -3);
  // the fists, dragging beside the shell
  const swing = charging ? 0 : Math.sin(t * 1.1) * 0.25;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#170b05';
    ctx.beginPath();
    ctx.arc(side * e.r * 1.05, e.r * 0.55 + side * swing * 14, e.r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexA(e.def.glow, 0.4); ctx.lineWidth = 2; ctx.stroke();
    // knuckle seams
    ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(side * e.r * 1.05, e.r * 0.55 + side * swing * 14, e.r * 0.22, -0.6, 0.6);
    ctx.stroke();
  }
  // the great furnace shell
  ctx.fillStyle = e.def.color;
  ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 2.5; ctx.stroke();
  // iron plates riveted over the heat — the gaps between them glow
  ctx.globalCompositeOperation = 'lighter';
  const heat = (ph2 ? 0.75 : 0.4) + Math.sin(t * 3.2) * 0.12;
  ctx.strokeStyle = hexA(e.def.glow, heat); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.66, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.66, Math.PI + 0.3, -0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-e.r * 0.8, -e.r * 0.25); ctx.lineTo(-e.r * 0.2, -e.r * 0.05); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(e.r * 0.8, -e.r * 0.25); ctx.lineTo(e.r * 0.2, -e.r * 0.05); ctx.stroke();
  // the slag heart, bared in phase 2
  const heartR = e.r * (ph2 ? 0.3 : 0.2);
  ctx.fillStyle = hexA(ph2 ? '#fff1c9' : e.def.glow, 0.85 + Math.sin(t * (ph2 ? 7 : 3)) * 0.15);
  ctx.beginPath(); ctx.arc(0, e.r * 0.15, heartR, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // plate rivets
  ctx.fillStyle = 'rgba(150,120,90,0.55)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    ctx.beginPath(); ctx.arc(Math.cos(a) * e.r * 0.87, Math.sin(a) * e.r * 0.87, 2, 0, Math.PI * 2); ctx.fill();
  }
  // the too-small head, sunk between the shoulders
  ctx.fillStyle = '#170b05';
  ctx.beginPath(); ctx.arc(0, -e.r * 0.82, e.r * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.4); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = tel || charging ? '#fff1c9' : e.def.glow;
  ctx.beginPath(); ctx.arc(-4, -e.r * 0.84, 2.2, 0, Math.PI * 2); ctx.arc(4, -e.r * 0.84, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ═══ boss: the pyre matriarch — the last phoenix, gone to spite ═══
function drawPhoenix(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  const diving = e.state === 'lunging';
  const flap = diving ? 0.25 : Math.sin(t * (ph2 ? 9 : 6)) * 0.55 + 0.75;
  glow(ctx, 0, 0, e.r * 3.2, hexA(e.def.glow, ph2 ? 0.28 : 0.18));
  ctx.save();
  if (diving && e.ai?.dir) ctx.rotate(Math.atan2(e.ai.dir.y, e.ai.dir.x) + Math.PI / 2);
  ctx.globalCompositeOperation = 'lighter';
  // wings: two sheets of flame, each feather its own tongue of fire
  for (const side of [-1, 1]) {
    for (let f = 0; f < 4; f++) {
      const k = f / 4;
      const span = e.r * (2.4 - k * 0.9) * (diving ? 0.55 : 1);
      const lift = -e.r * (0.2 + flap * (0.8 - k * 0.4));
      ctx.fillStyle = hexA(f % 2 ? '#ffb347' : '#ff8a4a', 0.34 - k * 0.05);
      ctx.beginPath();
      ctx.moveTo(side * e.r * 0.2, -e.r * 0.2 + f * 3);
      ctx.quadraticCurveTo(side * span * 0.6, lift - f * 6, side * span, lift * 0.4 + f * 5);
      ctx.quadraticCurveTo(side * span * 0.55, lift * 0.25 + f * 8 + 10, side * e.r * 0.2, e.r * 0.15 + f * 3);
      ctx.closePath(); ctx.fill();
    }
  }
  // tail streamers ripple behind
  for (let i = -1; i <= 1; i++) {
    ctx.strokeStyle = hexA(i === 0 ? '#fff1c9' : '#ffb347', 0.5);
    ctx.lineWidth = 2.5 - Math.abs(i);
    ctx.beginPath();
    ctx.moveTo(i * 4, e.r * 0.5);
    ctx.quadraticCurveTo(
      i * e.r * 0.55 + Math.sin(t * 5 + i * 2) * 6, e.r * 1.4,
      i * e.r * 0.8 + Math.sin(t * 3.4 + i) * 10, e.r * (2.0 + Math.abs(i) * 0.3));
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  // the body: charred bone wrapped in fire
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 0.95);
  ctx.bezierCurveTo(e.r * 0.55, -e.r * 0.55, e.r * 0.4, e.r * 0.35, 0, e.r * 0.65);
  ctx.bezierCurveTo(-e.r * 0.4, e.r * 0.35, -e.r * 0.55, -e.r * 0.55, 0, -e.r * 0.95);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
  // breast ember — her second life sits here
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = hexA(ph2 ? '#fff1c9' : '#ffb347', 0.9 + Math.sin(t * 6) * 0.1);
  ctx.beginPath(); ctx.arc(0, -e.r * 0.1, e.r * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // head, crest, and the hooked beak
  ctx.fillStyle = '#1a0c06';
  ctx.beginPath(); ctx.arc(0, -e.r * 0.78, e.r * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hexA('#ffb347', 0.9);
  for (let i = -1; i <= 1; i++) {
    const ch2 = e.r * (0.35 + Math.abs(Math.sin(t * 7 + i * 2)) * 0.18);
    ctx.beginPath();
    ctx.moveTo(i * 5 - 2.5, -e.r * 0.95);
    ctx.quadraticCurveTo(i * 7, -e.r * 0.95 - ch2, i * 5 + 2.5, -e.r * 0.95);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#d9cba8';
  ctx.beginPath(); ctx.moveTo(-3, -e.r * 0.72); ctx.lineTo(3, -e.r * 0.72); ctx.lineTo(0, -e.r * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath(); ctx.arc(-4.5, -e.r * 0.82, 1.7, 0, Math.PI * 2); ctx.arc(4.5, -e.r * 0.82, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// her moult: an ember shell, seams straining with the life inside
function drawPhoenixEgg(ctx, e, t) {
  glow(ctx, 0, 0, e.r * 2.6, hexA(e.def.glow, 0.3 + Math.sin(t * 6) * 0.1));
  const pulse = 1 + Math.sin(t * 8) * 0.05;
  ctx.save();
  ctx.scale(pulse, 1 / pulse);
  ctx.fillStyle = '#1a0c06';
  ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.85, e.r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.6); ctx.lineWidth = 2; ctx.stroke();
  // cracks of the coming hatch
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexA('#fff1c9', 0.65 + Math.sin(t * 11) * 0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-e.r * 0.3, -e.r * 0.8); ctx.lineTo(-e.r * 0.1, -e.r * 0.3); ctx.lineTo(-e.r * 0.45, e.r * 0.1);
  ctx.moveTo(e.r * 0.35, -e.r * 0.5); ctx.lineTo(e.r * 0.15, 0); ctx.lineTo(e.r * 0.4, e.r * 0.55);
  ctx.moveTo(-e.r * 0.05, e.r * 0.4); ctx.lineTo(e.r * 0.05, e.r * 0.9);
  ctx.stroke();
  ctx.restore();
  // ash motes spiral in as she rebuilds herself
  for (let i = 0; i < 5; i++) {
    const cyc = (t * 0.8 + i * 0.2) % 1;
    const a = i * 2.5 + t * 2;
    ctx.fillStyle = hexA(e.def.glow, cyc * 0.7);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * e.r * 2.2 * (1 - cyc), Math.sin(a) * e.r * 2.2 * (1 - cyc), 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// World II: the ember imp — a grinning flame-devil, all mischief and heat
function drawImp(ctx, e, t) {
  const lick = Math.sin(e.wobble * 3) * 0.15;
  glow(ctx, 0, 0, e.r * 2.2, hexA(e.def.glow, 0.16));
  ctx.save();
  ctx.rotate(Math.sin(e.wobble) * 0.1);
  // outer flame body — a teardrop that gutters
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.45 - Math.sin(e.wobble * 4) * 3);
  ctx.bezierCurveTo(e.r * (1 + lick), -e.r * 0.6, e.r * 0.85, e.r * 0.6, 0, e.r);
  ctx.bezierCurveTo(-e.r * 0.85, e.r * 0.6, -e.r * (1 - lick), -e.r * 0.6, 0, -e.r * 1.45 - Math.sin(e.wobble * 4) * 3);
  ctx.fill();
  // inner fire
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = hexA(e.def.glow, 0.55);
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 0.9 + Math.sin(e.wobble * 5) * 2);
  ctx.bezierCurveTo(e.r * 0.55, -e.r * 0.3, e.r * 0.45, e.r * 0.45, 0, e.r * 0.72);
  ctx.bezierCurveTo(-e.r * 0.45, e.r * 0.45, -e.r * 0.55, -e.r * 0.3, 0, -e.r * 0.9 + Math.sin(e.wobble * 5) * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // horns
  ctx.strokeStyle = '#1a0c06'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-e.r * 0.5, -e.r * 0.7); ctx.quadraticCurveTo(-e.r * 0.9, -e.r * 1.2, -e.r * 0.55, -e.r * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(e.r * 0.5, -e.r * 0.7); ctx.quadraticCurveTo(e.r * 0.9, -e.r * 1.2, e.r * 0.55, -e.r * 1.5); ctx.stroke();
  ctx.lineCap = 'butt';
  // white-hot grin and eyes
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath(); ctx.arc(-3.5, -2, 1.8, 0, Math.PI * 2); ctx.arc(3.5, -2, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff1c9'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 2, 4.5, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.restore();
}

// World II: obsidian shardling — volcanic glass grown wrong, and its slivers
function drawShardling(ctx, e, t) {
  const spin = t * (e.def.id === 'sliver' ? 3.2 : 1.1) + e.wobble;
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, 0.13));
  ctx.save();
  ctx.rotate(spin);
  if (e.def.id === 'sliver') {
    ctx.fillStyle = e.def.color;
    ctx.beginPath();
    ctx.moveTo(0, -e.r * 1.5); ctx.lineTo(e.r * 0.6, 0); ctx.lineTo(0, e.r * 1.5); ctx.lineTo(-e.r * 0.6, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(e.def.glow, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    return;
  }
  // a floating cluster of glass plates around a violet core
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const rr = e.r * (0.95 + Math.sin(e.wobble * 2 + i * 1.7) * 0.12);
    ctx.save();
    ctx.rotate(a);
    ctx.translate(rr * 0.55, 0);
    ctx.rotate(Math.sin(e.wobble + i) * 0.2);
    ctx.fillStyle = e.def.color;
    ctx.beginPath();
    ctx.moveTo(0, -rr * 0.7); ctx.lineTo(rr * 0.34, 0); ctx.lineTo(0, rr * 0.7); ctx.lineTo(-rr * 0.34, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // the core that splits three ways when the cluster breaks
  ctx.fillStyle = hexA(e.def.glow, 0.75 + Math.sin(t * 6) * 0.2);
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
}

// World II: brimstone vent — a crusted polyp; dormant until you're close
function drawVent(ctx, e, t) {
  const awake = e.ai?.awake;
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, awake ? 0.2 : 0.06));
  // cracked crust mound
  ctx.fillStyle = '#0f0d05';
  ctx.beginPath(); ctx.ellipse(0, e.r * 0.45, e.r * 1.25, e.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-e.r * 1.05, e.r * 0.45);
  ctx.quadraticCurveTo(-e.r * 0.7, -e.r * 0.8, -e.r * 0.25, -e.r * 0.9);
  ctx.lineTo(e.r * 0.25, -e.r * 0.9);
  ctx.quadraticCurveTo(e.r * 0.7, -e.r * 0.8, e.r * 1.05, e.r * 0.45);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, awake ? 0.6 : 0.25); ctx.lineWidth = 1.5; ctx.stroke();
  // fissure seams up the cone
  ctx.strokeStyle = hexA(e.def.glow, awake ? 0.8 : 0.3); ctx.lineWidth = 1.4;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * e.r * 0.45, e.r * 0.4);
    ctx.quadraticCurveTo(i * e.r * 0.3 + 3, -e.r * 0.2, i * e.r * 0.2, -e.r * 0.8);
    ctx.stroke();
  }
  // the maw: seething when awake
  const mouth = awake ? 1 + Math.sin(t * 12) * 0.18 : 0.7;
  ctx.fillStyle = hexA(e.def.glow, awake ? 0.9 : 0.35);
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.72, e.r * 0.34 * mouth, e.r * 0.16 * mouth, 0, 0, Math.PI * 2); ctx.fill();
  if (awake) { // sulfur haze curling out
    for (let i = 0; i < 3; i++) {
      const cyc = (t * 0.7 + i * 0.37) % 1;
      ctx.fillStyle = hexA(e.def.glow, 0.3 * (1 - cyc));
      ctx.beginPath();
      ctx.arc(Math.sin(t * 2 + i * 2) * 6 * cyc, -e.r * 0.85 - cyc * 22, 3 + cyc * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// World II: the cinder ram — a battering engine of slag and horn
function drawRam(ctx, e, t) {
  const tel = e.state === 'telegraph';
  const charging = e.state === 'lunging';
  const sh = tel ? Math.sin(t * 45) * 2 : 0;
  glow(ctx, 0, 0, e.r * 2.2, hexA(e.def.glow, charging ? 0.3 : 0.12));
  ctx.save();
  ctx.translate(sh, 0);
  if (charging) { // heat streaks trail the charge
    ctx.strokeStyle = hexA(e.def.glow, 0.5);
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-e.r * 1.6, i * e.r * 0.5); ctx.lineTo(-e.r * 0.7, i * e.r * 0.45); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // hunched bulk
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.05);
  ctx.bezierCurveTo(e.r * 1.15, -e.r * 0.85, e.r * 1.05, e.r * 0.7, e.r * 0.55, e.r * 0.95);
  ctx.lineTo(-e.r * 0.55, e.r * 0.95);
  ctx.bezierCurveTo(-e.r * 1.05, e.r * 0.7, -e.r * 1.15, -e.r * 0.85, 0, -e.r * 1.05);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 1.8; ctx.stroke();
  // molten seams across the shoulders
  ctx.strokeStyle = hexA(e.def.glow, (tel || charging ? 0.9 : 0.55) + Math.sin(t * 7) * 0.1);
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-e.r * 0.7, -e.r * 0.3); ctx.quadraticCurveTo(0, -e.r * 0.05, e.r * 0.7, -e.r * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-e.r * 0.55, e.r * 0.25); ctx.quadraticCurveTo(0, e.r * 0.45, e.r * 0.55, e.r * 0.25); ctx.stroke();
  // the head plate and great curling horns
  ctx.fillStyle = '#1a0c06';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.45, e.r * 0.5, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d9cba8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-e.r * 0.45, -e.r * 0.6);
  ctx.bezierCurveTo(-e.r * 1.05, -e.r * 0.95, -e.r * 1.25, -e.r * 0.25, -e.r * 0.8, -e.r * 0.05); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(e.r * 0.45, -e.r * 0.6);
  ctx.bezierCurveTo(e.r * 1.05, -e.r * 0.95, e.r * 1.25, -e.r * 0.25, e.r * 0.8, -e.r * 0.05); ctx.stroke();
  ctx.lineCap = 'butt';
  // furnace eyes
  ctx.fillStyle = tel || charging ? '#fff1c9' : e.def.glow;
  ctx.beginPath(); ctx.arc(-e.r * 0.2, -e.r * 0.45, 2.4, 0, Math.PI * 2); ctx.arc(e.r * 0.2, -e.r * 0.45, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// World II: the bellows cantor — a robed tender swinging a burning censer
function drawBellows(ctx, e, t) {
  glow(ctx, 0, 0, e.r * 2.2, hexA(e.def.glow, 0.12));
  const bob = Math.sin(e.wobble * 1.5) * 1.5;
  ctx.save();
  ctx.translate(0, bob);
  // ragged robe
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.25);
  ctx.bezierCurveTo(e.r * 0.95, -e.r * 0.9, e.r * 0.9, e.r * 0.4, e.r * 0.6, e.r);
  for (let i = 2; i >= -2; i--) ctx.lineTo(i * e.r * 0.24, e.r * (i % 2 ? 1.15 : 0.85));
  ctx.bezierCurveTo(-e.r * 0.9, e.r * 0.4, -e.r * 0.95, -e.r * 0.9, 0, -e.r * 1.25);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.4); ctx.lineWidth = 1.5; ctx.stroke();
  // deep hood, twin coals within
  ctx.fillStyle = '#120804';
  ctx.beginPath(); ctx.arc(0, -e.r * 0.62, e.r * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.def.glow;
  ctx.beginPath(); ctx.arc(-3.5, -e.r * 0.62, 1.7, 0, Math.PI * 2); ctx.arc(3.5, -e.r * 0.62, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // the censer swings a slow figure past the hem
  const swing = Math.sin(t * 2.2 + e.wobble) * 0.9;
  const cx2 = Math.sin(swing) * e.r * 1.5;
  const cy2 = bob + e.r * 0.4 + Math.abs(Math.cos(swing)) * e.r * 0.55;
  ctx.strokeStyle = 'rgba(120,90,60,0.8)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, bob - e.r * 0.1); ctx.quadraticCurveTo(cx2 * 0.5, cy2 - 14, cx2, cy2); ctx.stroke();
  glow(ctx, cx2, cy2, 16, hexA(e.def.glow, 0.35));
  ctx.fillStyle = '#1a0c06';
  ctx.beginPath(); ctx.arc(cx2, cy2, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hexA(e.def.glow, 0.85 + Math.sin(t * 9) * 0.15);
  ctx.beginPath(); ctx.arc(cx2, cy2, 2.8, 0, Math.PI * 2); ctx.fill();
}

// World II: the kiln warden — an anvil-headed golem, crucibles on chains
function drawWarden(ctx, e, t) {
  glow(ctx, 0, 0, e.r * 2.6, hexA(e.def.glow, 0.16));
  const orbAng = e.ai?.orbAng ?? t * 2.4;
  // chains first, so the body overlaps them
  for (let i = 0; i < 2; i++) {
    const a = orbAng + i * Math.PI;
    const ox = Math.cos(a) * 74, oy = Math.sin(a) * 74;
    ctx.strokeStyle = 'rgba(140,110,80,0.6)'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.setLineDash([]);
    // the crucible: a hanging pot of white-hot slag
    glow(ctx, ox, oy, 22, hexA(e.def.glow, 0.35));
    ctx.fillStyle = '#1a0e06';
    ctx.beginPath(); ctx.arc(ox, oy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(e.def.glow, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = hexA('#fff1c9', 0.8 + Math.sin(t * 10 + i * 3) * 0.2);
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
  }
  const sway = Math.sin(e.wobble * 0.9) * 0.05;
  ctx.save();
  ctx.rotate(sway);
  // anvil torso
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-e.r, -e.r * 0.55);
  ctx.lineTo(e.r, -e.r * 0.55);
  ctx.lineTo(e.r * 0.6, e.r * 0.15);
  ctx.lineTo(e.r * 0.75, e.r);
  ctx.lineTo(-e.r * 0.75, e.r);
  ctx.lineTo(-e.r * 0.6, e.r * 0.15);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.75); ctx.lineWidth = 2.5; ctx.stroke();
  // anvil horn crown
  ctx.fillStyle = '#0f0803';
  ctx.beginPath();
  ctx.moveTo(-e.r * 1.05, -e.r * 0.55);
  ctx.lineTo(e.r * 1.05, -e.r * 0.55);
  ctx.lineTo(e.r * 0.8, -e.r * 0.95);
  ctx.lineTo(-e.r * 0.5, -e.r * 0.95);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
  // furnace grate glowing between the plates
  ctx.fillStyle = hexA(e.def.glow, 0.8 + Math.sin(t * 6) * 0.15);
  for (let i = -1; i <= 1; i++) ctx.fillRect(i * e.r * 0.3 - 2, -e.r * 0.28, 4, e.r * 0.75);
  ctx.fillStyle = hexA('#fff1c9', 0.9);
  ctx.beginPath(); ctx.arc(-e.r * 0.32, -e.r * 0.75, 2.6, 0, Math.PI * 2); ctx.arc(e.r * 0.32, -e.r * 0.75, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// World II: the ash stalker — a hunched shade with burning eyes
function drawStalker(ctx, e, t) {
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, 0.12));
  ctx.save();
  ctx.rotate(Math.sin(e.wobble * 0.8) * 0.12);
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.2);
  ctx.bezierCurveTo(e.r * 1.1, -e.r * 0.6, e.r * 0.9, e.r * 0.6, e.r * 0.4, e.r);
  for (let i = 2; i >= -2; i--) ctx.lineTo(i * e.r * 0.22, e.r * (i % 2 ? 1.1 : 0.8));
  ctx.bezierCurveTo(-e.r * 0.9, e.r * 0.6, -e.r * 1.1, -e.r * 0.6, 0, -e.r * 1.2);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.45); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ff8a4a';
  ctx.beginPath(); ctx.arc(-4, -e.r * 0.5, 2.2, 0, Math.PI * 2); ctx.arc(4, -e.r * 0.5, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// World II: the magma maw — a squat obelisk with a molten mouth
function drawMortar(ctx, e, t) {
  const charging = e.ai?.fireT < 0.6;
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, charging ? 0.25 : 0.12));
  ctx.fillStyle = '#0d0806';
  ctx.beginPath(); ctx.ellipse(0, e.r * 0.5, e.r * 1.15, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-e.r, e.r * 0.5); ctx.lineTo(-e.r * 0.55, -e.r); ctx.lineTo(e.r * 0.55, -e.r); ctx.lineTo(e.r, e.r * 0.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
  const mouth = charging ? 1 + Math.sin(t * 20) * 0.15 : 1;
  ctx.fillStyle = hexA(e.def.glow, charging ? 0.95 : 0.65);
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.3, e.r * 0.4 * mouth, e.r * 0.3 * mouth, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.3, e.r * 0.15 * mouth, e.r * 0.12 * mouth, 0, 0, Math.PI * 2); ctx.fill();
}

// ═══ WORLD III: THE DROWNED COURTS — pale marble, cold light, a court the
// sea kept. Everything here reads teal-and-pearl against the dark water. ═══

// the pallid courtier — finery three centuries underwater, still bowing
function drawPallid(ctx, e, t) {
  const drift = Math.sin(e.wobble) * 0.12;
  glow(ctx, 0, 0, e.r * 1.9, hexA(e.def.glow, 0.12));
  ctx.save();
  ctx.rotate(drift);
  // hair lifts as if the water never left
  ctx.strokeStyle = hexA(e.def.glow, 0.4); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const wave = Math.sin(e.wobble * 2 + i * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(i * 3, -e.r * 0.85);
    ctx.quadraticCurveTo(i * 5 + wave, -e.r * 1.35, i * 7 - wave, -e.r * 1.7);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // a waterlogged frock coat, hem drifting
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.05);
  ctx.bezierCurveTo(e.r * 0.9, -e.r * 0.75, e.r * 0.85, e.r * 0.35, e.r * 0.5, e.r);
  for (let i = 1; i >= -1; i--) ctx.lineTo(i * e.r * 0.3, e.r * (i % 2 ? 0.8 : 1.05));
  ctx.bezierCurveTo(-e.r * 0.85, e.r * 0.35, -e.r * 0.9, -e.r * 0.75, 0, -e.r * 1.05);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.4); ctx.lineWidth = 1.4; ctx.stroke();
  // the ruff collar, still starched by salt
  ctx.strokeStyle = hexA('#d8ece8', 0.7); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -e.r * 0.45, e.r * 0.42, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  // pearl-blank eyes
  ctx.fillStyle = '#e8f4f0';
  ctx.beginPath(); ctx.arc(-3.5, -e.r * 0.68, 1.8, 0, Math.PI * 2); ctx.arc(3.5, -e.r * 0.68, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// the brine mote — a bead of the old sea that wants very badly to be big again
function drawMote(ctx, e, t) {
  const fusing = e.state === 'fuse';
  const swell = fusing ? 1 + Math.sin(t * 26) * 0.15 : 1 + Math.sin(e.wobble * 1.8) * 0.05;
  glow(ctx, 0, 0, e.r * 2.1, hexA(e.def.glow, fusing ? 0.32 : 0.12));
  ctx.save();
  ctx.scale(swell, 1 / swell);
  // a glass bead of seawater
  ctx.fillStyle = e.def.color;
  ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 1.6; ctx.stroke();
  // the sea-light inside, rising to the skin as the fuse runs
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = hexA(e.def.glow, fusing ? 0.75 + Math.sin(t * 30) * 0.25 : 0.45);
  ctx.beginPath(); ctx.arc(0, e.r * 0.1, e.r * (fusing ? 0.62 : 0.4), 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // the glassy highlight
  ctx.strokeStyle = 'rgba(230,248,246,0.7)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.62, -Math.PI * 0.85, -Math.PI * 0.45); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

// the court siren — she never chases; the water brings you to her
function drawSiren(ctx, e, t) {
  const singing = e.ai?.songT > 0;
  glow(ctx, 0, 0, e.r * 2.4, hexA(e.def.glow, singing ? 0.28 : 0.13));
  ctx.save();
  ctx.rotate(Math.sin(e.wobble * 0.9) * 0.08);
  // hair opens like a jellyfish bell above her
  ctx.fillStyle = hexA(e.def.glow, 0.22);
  ctx.beginPath();
  ctx.moveTo(-e.r * 0.9, -e.r * 0.9);
  ctx.quadraticCurveTo(0, -e.r * 1.9 - Math.sin(e.wobble * 2) * 3, e.r * 0.9, -e.r * 0.9);
  ctx.quadraticCurveTo(0, -e.r * 1.15, -e.r * 0.9, -e.r * 0.9);
  ctx.fill();
  // the gown: one long column the current keeps
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.1);
  ctx.bezierCurveTo(e.r * 0.62, -e.r * 0.85, e.r * 0.72, e.r * 0.3, e.r * 0.42 + Math.sin(e.wobble * 1.4) * 3, e.r * 1.15);
  ctx.quadraticCurveTo(0, e.r * 0.95, -e.r * 0.42 + Math.sin(e.wobble * 1.4) * 3, e.r * 1.15);
  ctx.bezierCurveTo(-e.r * 0.72, e.r * 0.3, -e.r * 0.62, -e.r * 0.85, 0, -e.r * 1.1);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
  // her face: a pale oval, the mouth open only for the verse
  ctx.fillStyle = '#dcd4ec';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.72, e.r * 0.3, e.r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  if (singing) {
    ctx.fillStyle = '#2a2440';
    ctx.beginPath(); ctx.ellipse(0, -e.r * 0.58, 2.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    // the song leaves her in slow rings
    for (let i = 0; i < 3; i++) {
      const cyc = (t * 1.4 + i / 3) % 1;
      ctx.strokeStyle = hexA(e.def.glow, 0.5 * (1 - cyc));
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -e.r * 0.6, 6 + cyc * e.r * 1.6, -0.6, 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -e.r * 0.6, 6 + cyc * e.r * 1.6, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#2a2440';
    ctx.beginPath(); ctx.arc(-2.5, -e.r * 0.76, 1.2, 0, Math.PI * 2); ctx.arc(2.5, -e.r * 0.76, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// the tide lancer — a fencer's patience, a current's commitment
function drawLancer(ctx, e, t) {
  const tel = e.state === 'telegraph';
  const lunging = e.state === 'lunging';
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, lunging ? 0.26 : 0.11));
  if (tel && e.ai?.dir) {
    ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(e.ai.dir.x * e.def.lungeSpeed * 0.4, e.ai.dir.y * e.def.lungeSpeed * 0.4);
    ctx.stroke(); ctx.setLineDash([]);
  }
  const quiver = tel ? Math.sin(t * 42) * 1.5 : 0;
  const ang = e.ai?.dir ? Math.atan2(e.ai.dir.y, e.ai.dir.x) : Math.sin(e.wobble * 0.6) * 0.3;
  ctx.save();
  ctx.translate(quiver, 0);
  ctx.rotate(ang);
  if (lunging) { // the wake arrives just behind him
    ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-e.r * 1.8, i * e.r * 0.4); ctx.lineTo(-e.r * 0.9, i * e.r * 0.35); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // he leads with the point: a coral rapier longer than he is
  ctx.strokeStyle = hexA('#e8d8c8', 0.9); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(e.r * 0.5, 0); ctx.lineTo(e.r * 2.1, 0); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = hexA(e.def.glow, tel || lunging ? 0.9 : 0.5); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(e.r * 1.5, 0); ctx.lineTo(e.r * 2.1, 0); ctx.stroke();
  ctx.strokeStyle = hexA(e.def.glow, 0.7); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(e.r * 0.5, 0, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  // a lean body kept side-on to the target
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(e.r * 0.55, 0);
  ctx.bezierCurveTo(e.r * 0.1, -e.r * 0.75, -e.r * 0.75, -e.r * 0.55, -e.r * 0.95, 0);
  ctx.bezierCurveTo(-e.r * 0.75, e.r * 0.55, e.r * 0.1, e.r * 0.75, e.r * 0.55, 0);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 1.6; ctx.stroke();
  // fin crest down the spine
  ctx.fillStyle = hexA(e.def.glow, 0.55);
  for (let i = 0; i < 3; i++) {
    const bx = -e.r * (0.15 + i * 0.28);
    ctx.beginPath();
    ctx.moveTo(bx, -e.r * 0.45); ctx.lineTo(bx + 4, -e.r * 0.72); ctx.lineTo(bx + 8, -e.r * 0.42);
    ctx.closePath(); ctx.fill();
  }
  // one bright eye on the leading side
  ctx.fillStyle = tel || lunging ? '#e8fff8' : e.def.glow;
  ctx.beginPath(); ctx.arc(e.r * 0.28, -e.r * 0.16, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// the reef urchin — coral grew over something the court dropped
function drawUrchin(ctx, e, t) {
  const brew = e.ai ? Math.max(0, 1 - e.ai.volleyT / 0.8) : 0; // it bristles before a volley
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, 0.1 + brew * 0.18));
  // it sits in a skirt of its own debris
  ctx.fillStyle = 'rgba(6,14,20,0.55)';
  ctx.beginPath(); ctx.ellipse(0, e.r * 0.4, e.r * 1.3, e.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  // spines, aligned with where the volley will go
  ctx.strokeStyle = hexA('#c8d8e8', 0.75); ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (e.ai?.baseAng ?? 0);
    const len = e.r * (1.15 + brew * 0.45 + Math.sin(e.wobble + i * 1.9) * 0.08);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * e.r * 0.5, Math.sin(a) * e.r * 0.5);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
    ctx.fillStyle = hexA(e.def.glow, 0.35 + brew * 0.6);
    ctx.beginPath(); ctx.arc(Math.cos(a) * len, Math.sin(a) * len, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'butt';
  // the body under the spines
  ctx.fillStyle = e.def.color;
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.85, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
  // a single mild light — coral does not hurry
  ctx.fillStyle = hexA(e.def.glow, 0.6 + brew * 0.4);
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.22 * (1 + brew * 0.4), 0, Math.PI * 2); ctx.fill();
}

// the undertow maw — drawn flat: it is a place in the floor, not a creature
function drawMaw(ctx, e, t) {
  const awake = e.ai?.awake;
  const spinning = e.ai?.vortexT > 0;
  const spin = t * (spinning ? 5 : 0.8);
  glow(ctx, 0, 0, e.r * 2.2, hexA(e.def.glow, spinning ? 0.28 : awake ? 0.14 : 0.05));
  ctx.save();
  ctx.scale(1, 0.82);
  // the pit
  ctx.fillStyle = '#040c12';
  ctx.beginPath(); ctx.arc(0, 0, e.r * 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, awake ? 0.55 : 0.25); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, e.r * 1.15, 0, Math.PI * 2); ctx.stroke();
  // the water turning in it
  ctx.strokeStyle = hexA(e.def.glow, awake ? 0.5 : 0.2); ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const rr = e.r * (0.35 + i * 0.28);
    const a0 = spin * (1 + i * 0.3) + i * 2;
    ctx.beginPath(); ctx.arc(0, 0, rr, a0, a0 + Math.PI * 1.4); ctx.stroke();
  }
  // teeth around the rim, pointing the way everything goes
  ctx.fillStyle = hexA('#d8e8e4', awake ? 0.85 : 0.4);
  for (let i = 0; i < 9; i++) {
    ctx.save();
    ctx.rotate((i / 9) * Math.PI * 2 + spin * 0.15);
    ctx.translate(e.r * 1.02, 0);
    ctx.beginPath(); ctx.moveTo(0, -3.2); ctx.lineTo(-e.r * 0.34, 0); ctx.lineTo(0, 3.2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // the deep light at the throat
  ctx.fillStyle = hexA(e.def.glow, spinning ? 0.8 + Math.sin(t * 10) * 0.2 : awake ? 0.4 : 0.15);
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// the grief chorister — a veiled mourner who sews the court's wounds shut
function drawChorister(ctx, e, t) {
  const verse = e.ai ? Math.max(0, 1 - e.ai.healT) : 0; // the verse gathers
  glow(ctx, 0, 0, e.r * 2.2, hexA(e.def.glow, 0.1 + verse * 0.16));
  const bob = Math.sin(e.wobble * 1.3) * 1.5;
  ctx.save();
  ctx.translate(0, bob);
  // the mourning veil falls the whole way down
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.4);
  ctx.bezierCurveTo(e.r * 0.85, -e.r * 1.05, e.r * 0.95, e.r * 0.3, e.r * 0.55, e.r);
  for (let i = 2; i >= -2; i--) ctx.lineTo(i * e.r * 0.24, e.r * (i % 2 ? 1.15 : 0.85));
  ctx.bezierCurveTo(-e.r * 0.95, e.r * 0.3, -e.r * 0.85, -e.r * 1.05, 0, -e.r * 1.4);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.45); ctx.lineWidth = 1.5; ctx.stroke();
  // a lace line where a face would be — nothing behind it
  ctx.strokeStyle = hexA(e.def.glow, 0.6); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-e.r * 0.5, -e.r * 0.55); ctx.quadraticCurveTo(0, -e.r * 0.35, e.r * 0.5, -e.r * 0.55); ctx.stroke();
  // her hands hold one pearl of kept grief
  glow(ctx, 0, e.r * 0.25, 10, hexA(e.def.glow, 0.3 + verse * 0.4));
  ctx.fillStyle = hexA('#f4f0fa', 0.85);
  ctx.beginPath(); ctx.arc(0, e.r * 0.25, 3.2 + verse * 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // notes leave the veil while the verse is near
  if (verse > 0.2) {
    ctx.fillStyle = hexA(e.def.glow, 0.7);
    ctx.font = '10px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 2; i++) {
      const cyc = (t * 0.9 + i * 0.5) % 1;
      ctx.globalAlpha = (1 - cyc) * 0.8;
      ctx.fillText('♪', Math.sin(t * 2 + i * 3) * 8 + i * 6 - 3, -e.r - 6 - cyc * 16);
    }
    ctx.globalAlpha = 1;
  }
}

// the tidebound seneschal — the household still runs; the household drowned
function drawSeneschal(ctx, e, t) {
  glow(ctx, 0, 0, e.r * 2.6, hexA(e.def.glow, 0.16));
  const orbAng = e.ai?.orbAng ?? t * 2.4;
  // kelp tethers first, so the coat overlaps them
  for (let i = 0; i < 2; i++) {
    const a = orbAng + i * Math.PI;
    const ox = Math.cos(a) * 74, oy = Math.sin(a) * 74;
    ctx.strokeStyle = 'rgba(60,110,100,0.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(ox * 0.5 + Math.sin(t * 3 + i) * 8, oy * 0.5, ox, oy);
    ctx.stroke();
    // a carried globe of the old sea — the court's light, still lit
    glow(ctx, ox, oy, 22, hexA(e.def.glow, 0.35));
    ctx.fillStyle = 'rgba(10,30,34,0.9)';
    ctx.beginPath(); ctx.arc(ox, oy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(e.def.glow, 0.75); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = hexA('#d8fff4', 0.75 + Math.sin(t * 8 + i * 3) * 0.2);
    ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, Math.PI * 2); ctx.fill();
    // it drips — it always drips
    const drip = (t * 1.3 + i) % 1;
    ctx.fillStyle = hexA(e.def.glow, 0.5 * (1 - drip));
    ctx.beginPath(); ctx.arc(ox, oy + 12 + drip * 10, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.rotate(Math.sin(e.wobble * 0.8) * 0.04);
  // the long formal coat, correct to the last button — tails split at the hem
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 1.05);
  ctx.bezierCurveTo(e.r * 0.8, -e.r * 0.95, e.r * 0.75, e.r * 0.1, e.r * 0.55, e.r);
  ctx.lineTo(e.r * 0.14, e.r * 0.85); ctx.lineTo(0, e.r); ctx.lineTo(-e.r * 0.14, e.r * 0.85); ctx.lineTo(-e.r * 0.55, e.r);
  ctx.bezierCurveTo(-e.r * 0.75, e.r * 0.1, -e.r * 0.8, -e.r * 0.95, 0, -e.r * 1.05);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.75); ctx.lineWidth = 2.5; ctx.stroke();
  // the pale mask above the high collar
  ctx.fillStyle = '#dce8e4';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.68, e.r * 0.3, e.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = e.def.glow;
  ctx.beginPath(); ctx.arc(-3.5, -e.r * 0.7, 1.8, 0, Math.PI * 2); ctx.arc(3.5, -e.r * 0.7, 1.8, 0, Math.PI * 2); ctx.fill();
  // button column — brass, still polished
  ctx.fillStyle = hexA('#ffd97a', 0.8);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, -e.r * 0.25 + i * e.r * 0.28, 1.7, 0, Math.PI * 2); ctx.fill(); }
  // the chatelaine: keys to rooms that are all underwater now
  ctx.strokeStyle = hexA('#ffd97a', 0.7); ctx.lineWidth = 1.4;
  ctx.save(); ctx.translate(e.r * 0.5, e.r * 0.2); ctx.rotate(Math.sin(e.wobble * 1.2) * 0.3);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i * 4, 9); ctx.stroke();
    ctx.strokeRect(i * 4 - 1.5, 9, 3, 4);
  }
  ctx.restore();
  ctx.restore();
}

// ═══ boss: The Sunless Queen — the ballroom's last hostess ═══
function drawQueen(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  const curtsy = e.ai?.curtsyT > 0;
  glow(ctx, 0, 0, e.r * 3, hexA(e.def.glow, ph2 ? 0.22 : 0.14));
  // pearls attend her in slow orbit
  for (let i = 0; i < 4; i++) {
    const a = t * (0.7 + i * 0.08) + (i / 4) * Math.PI * 2;
    ctx.fillStyle = hexA('#f0ecf8', 0.5 + Math.sin(t * 3 + i) * 0.2);
    ctx.beginPath(); ctx.arc(Math.cos(a) * e.r * 1.9, Math.sin(a) * e.r * 1.15 - e.r * 0.3, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(0, curtsy ? e.r * 0.22 : 0);
  if (curtsy) ctx.scale(1.08, 0.9);
  // the gown: a bell that fills the dance floor
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, -e.r * 0.55);
  ctx.bezierCurveTo(e.r * 0.5, -e.r * 0.5, e.r * 1.0, 0, e.r * 1.05, e.r * 0.9);
  for (let i = 3; i >= -3; i--) ctx.lineTo(i * e.r * 0.3, e.r * (i % 2 ? 1.12 : 0.92));
  ctx.bezierCurveTo(-e.r * 1.0, 0, -e.r * 0.5, -e.r * 0.5, 0, -e.r * 0.55);
  ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 2; ctx.stroke();
  // the gown's drowned embroidery — tide-lines that breathe
  ctx.strokeStyle = hexA(ph2 ? '#c9a0ff' : '#7ee8d0', (ph2 ? 0.7 : 0.45) + Math.sin(t * 3) * 0.1);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const yy = e.r * (0.15 + i * 0.3);
    const xx = e.r * (0.55 + i * 0.18);
    ctx.beginPath(); ctx.moveTo(-xx, yy); ctx.quadraticCurveTo(0, yy + e.r * 0.14, xx, yy); ctx.stroke();
  }
  // bodice above the bell
  ctx.fillStyle = e.def.color;
  ctx.beginPath(); ctx.ellipse(0, -e.r * 0.72, e.r * 0.34, e.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.4); ctx.lineWidth = 1.4; ctx.stroke();
  // her face, and one pearl at the throat
  ctx.fillStyle = '#e2dcf0';
  ctx.beginPath(); ctx.ellipse(0, -e.r * 1.02, e.r * 0.22, e.r * 0.27, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ph2 ? '#c9a0ff' : '#141e30';
  ctx.beginPath(); ctx.ellipse(-e.r * 0.08, -e.r * 1.04, 1.8, 2.8, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(e.r * 0.08, -e.r * 1.04, 1.8, 2.8, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0ecf8';
  ctx.beginPath(); ctx.arc(0, -e.r * 0.82, 2.2, 0, Math.PI * 2); ctx.fill();
  // black-coral crown, pearls at the tines
  ctx.strokeStyle = '#0a1018'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * e.r * 0.09, -e.r * 1.2);
    ctx.quadraticCurveTo(i * e.r * 0.16, -e.r * 1.38, i * e.r * 0.2, -e.r * (1.42 + Math.abs(i) * 0.04));
    ctx.stroke();
    ctx.fillStyle = hexA('#f0ecf8', ph2 ? 0.95 : 0.7);
    ctx.beginPath(); ctx.arc(i * e.r * 0.2, -e.r * (1.44 + Math.abs(i) * 0.04), 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'butt';
  ctx.restore();
  if (curtsy) { // the whole court leans toward her
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t * 0.8;
      const cyc = (t * 1.8 + i * 0.37) % 1;
      const rr = e.r * (2.8 - cyc * 1.6);
      ctx.fillStyle = hexA('#c9a0ff', cyc * 0.6);
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.7, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ═══ boss: The Undertow Regent — not a ruler of the tide; the tide, crowned ═══
function drawRegent(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  const tel = e.state === 'telegraph';
  const rushing = e.state === 'lunging';
  glow(ctx, 0, 0, e.r * 3, hexA(e.def.glow, rushing ? 0.3 : ph2 ? 0.2 : 0.13));
  ctx.save();
  ctx.translate(tel ? Math.sin(t * 40) * 2 : 0, 0);
  if (rushing) { // its wake arrives with it
    ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-e.r * 1.9, i * e.r * 0.5); ctx.lineTo(-e.r * 0.8, i * e.r * 0.42); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // the standing wave that decided to be a king
  const churn = Math.sin(t * 2.2) * 0.05;
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-e.r * 1.15, e.r * 0.9);
  ctx.bezierCurveTo(-e.r * 1.2, -e.r * 0.15, -e.r * 0.55, -e.r * (1.0 + churn * 4), 0, -e.r * 1.05);
  ctx.bezierCurveTo(e.r * 0.6, -e.r * (1.12 - churn * 4), e.r * 1.15, -e.r * 0.1, e.r * 1.15, e.r * 0.9);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 2.5; ctx.stroke();
  // currents turning inside the bulk
  ctx.strokeStyle = hexA(e.def.glow, ph2 ? 0.6 : 0.4); ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    const yy = -e.r * 0.35 + i * e.r * 0.42;
    ctx.beginPath();
    ctx.moveTo(-e.r * (0.85 - i * 0.12), yy);
    ctx.bezierCurveTo(-e.r * 0.3, yy + Math.sin(t * 3 + i * 2) * 6, e.r * 0.3, yy - Math.sin(t * 2.6 + i) * 6, e.r * (0.85 - i * 0.12), yy);
    ctx.stroke();
  }
  // foam breaks along the crest
  ctx.fillStyle = hexA('#d8ecf4', 0.75);
  for (let i = 0; i < 5; i++) {
    const fx2 = -e.r * 0.7 + i * e.r * 0.35;
    const fy2 = -e.r * (0.95 + Math.sin(t * 4 + i * 1.7) * 0.06) + Math.abs(fx2) * 0.18;
    ctx.beginPath(); ctx.arc(fx2, fy2, 2.4 + (i % 2), 0, Math.PI * 2); ctx.fill();
  }
  // the drowned crown rides the crest — never quite level
  ctx.save();
  ctx.translate(0, -e.r * 1.18 + Math.sin(t * 2.2) * 2);
  ctx.rotate(Math.sin(t * 1.6) * 0.08);
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(-e.r * 0.42, 0);
  for (let i = 0; i < 4; i++) {
    ctx.lineTo(-e.r * 0.42 + (i + 0.5) * e.r * 0.21, -e.r * 0.22);
    ctx.lineTo(-e.r * 0.42 + (i + 1) * e.r * 0.21, 0);
  }
  ctx.lineTo(e.r * 0.42, e.r * 0.12); ctx.lineTo(-e.r * 0.42, e.r * 0.12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,16,4,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  // two lights far back in the water where eyes ought to be
  ctx.fillStyle = tel || rushing ? '#d8f6ff' : hexA(e.def.glow, 0.9);
  ctx.beginPath(); ctx.arc(-e.r * 0.28, -e.r * 0.35, 3, 0, Math.PI * 2); ctx.arc(e.r * 0.28, -e.r * 0.35, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ═══ boss: The Weeping Reliquary — the court's grief, given a shell ═══
function drawReliquary(ctx, e, t) {
  const ph2 = e.ai?.phase === 2;
  const gape = 0.55 + Math.sin(t * 1.6) * 0.05 + (ph2 ? 0.1 : 0);
  glow(ctx, 0, 0, e.r * 2.8, hexA(e.def.glow, ph2 ? 0.24 : 0.15));
  // a bed of its own salt
  ctx.fillStyle = 'rgba(200,214,224,0.12)';
  ctx.beginPath(); ctx.ellipse(0, e.r * 0.8, e.r * 1.45, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  // the great pearl first — the valves only frame it
  const px2 = e.r * 0.1, py2 = -e.r * 0.15;
  glow(ctx, px2, py2, e.r * 1.1, hexA(e.def.glow, 0.35 + Math.sin(t * 2.4) * 0.08));
  ctx.fillStyle = '#e8e2f0';
  ctx.beginPath(); ctx.arc(px2, py2, e.r * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(px2 - e.r * 0.16, py2 - e.r * 0.18, e.r * 0.09, 0, Math.PI * 2); ctx.fill();
  if (ph2) { // the crack, and what shines through it
    ctx.strokeStyle = hexA('#c9a0ff', 0.85 + Math.sin(t * 9) * 0.15); ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px2 - e.r * 0.12, py2 - e.r * 0.45);
    ctx.lineTo(px2 + e.r * 0.05, py2 - e.r * 0.1);
    ctx.lineTo(px2 - e.r * 0.1, py2 + e.r * 0.2);
    ctx.lineTo(px2 + e.r * 0.12, py2 + e.r * 0.44);
    ctx.stroke();
  }
  // it weeps — brine beads off the pearl and keeps falling
  for (let i = 0; i < 3; i++) {
    const cyc = (t * (0.8 + i * 0.23) + i * 1.1) % 1;
    ctx.fillStyle = hexA('#8fd8ff', (1 - cyc) * 0.7);
    ctx.beginPath();
    ctx.arc(px2 + (i - 1) * e.r * 0.22, py2 + e.r * 0.5 + cyc * e.r * 0.75, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // lower valve: the cradle
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-e.r * 1.15, e.r * 0.05);
  ctx.quadraticCurveTo(-e.r * 0.4, e.r * 1.05, e.r * 0.55, e.r * 0.85);
  ctx.quadraticCurveTo(e.r * 1.1, e.r * 0.6, e.r * 1.15, e.r * 0.05);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 2; ctx.stroke();
  // scallop ridges
  ctx.strokeStyle = hexA(e.def.glow, 0.3); ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * e.r * 0.28, e.r * 0.12);
    ctx.quadraticCurveTo(i * e.r * 0.32, e.r * 0.5, i * e.r * 0.42, e.r * 0.8);
    ctx.stroke();
  }
  // upper valve, hinged wide while it grieves
  ctx.save();
  ctx.translate(-e.r * 0.95, 0);
  ctx.rotate(-gape);
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(e.r * 0.75, -e.r * 1.0, e.r * 2.1, -e.r * 0.05);
  ctx.quadraticCurveTo(e.r * 1.05, -e.r * 0.28, 0, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.55); ctx.lineWidth = 2; ctx.stroke();
  // mother-of-pearl sheen on the inner face
  ctx.strokeStyle = hexA('#e8e2f0', 0.4); ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(e.r * 0.25, -e.r * 0.1);
  ctx.quadraticCurveTo(e.r * 0.95, -e.r * 0.5, e.r * 1.85, -e.r * 0.08);
  ctx.stroke();
  ctx.restore();
}

// sealed: the Reliquary shut tight — endure it while it hides
function drawReliquaryShell(ctx, e, t) {
  glow(ctx, 0, 0, e.r * 2, hexA(e.def.glow, 0.14 + Math.sin(t * 5) * 0.05));
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.scale(1, 0.8); // low in the water of the floor
  ctx.fillStyle = e.def.color;
  ctx.beginPath(); ctx.ellipse(0, 0, e.r * 1.1, e.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(e.def.glow, 0.5); ctx.lineWidth = 2; ctx.stroke();
  // the seam, lit from inside
  ctx.strokeStyle = hexA(e.def.glow, 0.6 + Math.sin(t * 7) * 0.25); ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-e.r * 1.05, 0); ctx.quadraticCurveTo(0, e.r * 0.12, e.r * 1.05, 0); ctx.stroke();
  // ridges
  ctx.strokeStyle = hexA(e.def.glow, 0.25); ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * e.r * 0.3, -e.r * 0.7);
    ctx.quadraticCurveTo(i * e.r * 0.36, -e.r * 0.25, i * e.r * 0.28, -e.r * 0.02);
    ctx.stroke();
  }
  ctx.restore();
  // bubbles slip out of the seam — it is not gone, only patient
  for (let i = 0; i < 4; i++) {
    const cyc = (t * (0.6 + (i % 2) * 0.3) + i * 0.9) % 1.3;
    ctx.strokeStyle = hexA('#d8f2ee', Math.max(0, 0.5 - cyc * 0.35));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(Math.sin(i * 2.4) * e.r * 0.6, -e.r * 0.3 - cyc * 26, 1.5 + cyc * 1.8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// a hooded binder silhouette — used for the dueling rival (world-entity version)
function drawRivalDuelist(ctx, e, t) {
  const glowC = e.def.glow;
  const casting = e.ai?.casting;
  glow(ctx, 0, 0, 46, hexA(glowC, 0.16));
  drawBinderShape(ctx, t, glowC, casting ? 0.9 : 0.75);
  if (casting) {
    // visible casting: the card floats above, growing brighter
    const k = casting.t / casting.dur;
    glow(ctx, 0, -34, 26 + k * 16, hexA(glowC, 0.2 + k * 0.3));
  }
}

// companions drawn from a plain object (ally, or the neutral rival during the choice)
function drawCompanion(ctx, c, t, isAlly) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const glowC = c.color || '#d9b45b';
  glow(ctx, 0, 0, 46, hexA(glowC, isAlly ? 0.14 : 0.2));
  drawBinderShape(ctx, t + (c.wob || 0), glowC, isAlly ? 0.8 : 1);
  ctx.restore();
  // name + featured cards
  ctx.save();
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
  ctx.strokeText(c.name, c.x, c.y - 36);
  ctx.fillStyle = glowC;
  ctx.fillText(c.name, c.x, c.y - 36);
  ctx.restore();
  if (c.featured) drawFeaturedRow(ctx, c.x, c.y - 66, c.featured, t, c.casting);
}

function drawBinderShape(ctx, t, accent, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const bob = Math.sin(t * 5) * 1.2;
  ctx.translate(0, bob);
  const r = 14;
  ctx.fillStyle = '#181c34';
  ctx.beginPath();
  ctx.moveTo(0, -r - 4);
  ctx.bezierCurveTo(r + 4, -r, r + 2, r * 0.6, r * 0.7, r + 2);
  ctx.lineTo(-r * 0.7, r + 2);
  ctx.bezierCurveTo(-r - 2, r * 0.6, -r - 4, -r, 0, -r - 4);
  ctx.fill();
  ctx.strokeStyle = hexA(accent, 0.8); ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = '#101427';
  ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.34, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hexA(accent, 0.7 + Math.sin(t * 3) * 0.25);
  ctx.font = `${r * 0.75}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✦', 0, r * 0.3);
  ctx.restore();
}

// four floating card previews — the build identity of a rival soul
function drawFeaturedRow(ctx, x, y, featured, t, casting) {
  const n = featured.length;
  const w = 22, h = 32, gap = 8;
  const total = n * w + (n - 1) * gap;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const def = featured[i];
    const cx = x - total / 2 + i * (w + gap) + w / 2;
    const cy = y + Math.sin(t * 2 + i * 1.3) * 3;
    const isCasting = casting && casting.def && casting.def.id === def.id;
    const color = ELEMENT_COLORS[def.element] || SCHOOL_COLORS[def.school];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 1.5 + i) * 0.08);
    if (isCasting) { ctx.scale(1.35, 1.35); glow(ctx, 0, 0, 30, hexA(color, 0.35)); }
    ctx.fillStyle = 'rgba(16,18,34,0.95)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = hexA(color, isCasting ? 1 : 0.75); ctx.lineWidth = isCasting ? 2 : 1.2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = hexA(color, 0.9);
    ctx.font = '13px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.glyph, 0, -2);
    ctx.fillStyle = 'rgba(232,220,192,0.6)';
    ctx.fillRect(-w / 2 + 3, h / 2 - 8, w - 6, 1.5);
    ctx.fillRect(-w / 2 + 3, h / 2 - 5, w - 9, 1.5);
    ctx.restore();
  }
  ctx.restore();
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

// ── the player: a hooded card-binder, with power auras & sustained rings ──
function drawPlayer(game, ctx, t) {
  const p = game.player;
  for (const tr of p.trail) {
    const a = 1 - tr.t / 0.3;
    ctx.fillStyle = tr.color ? hexA(tr.color, a * 0.3) : `rgba(217,180,91,${a * 0.25})`;
    ctx.beginPath(); ctx.arc(tr.x, tr.y, p.r * a, 0, Math.PI * 2); ctx.fill();
  }

  const powers = game.engine.powers;
  // power aura: the active Powers make the hero visibly transformed
  if (powers.length > 0) {
    const pw = powers[powers.length - 1];
    glow(ctx, p.x, p.y, 60 + Math.sin(t * 4) * 6, hexA(pw.color, 0.16));
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.untargetable > 0) ctx.globalAlpha = 0.45;
  else if (p.iframes > 0) ctx.globalAlpha = 0.65 + Math.sin(t * 40) * 0.2;
  glow(ctx, 0, 0, 46, 'rgba(217,180,91,0.12)');
  const bob = Math.sin(t * 5) * 1.2;
  ctx.translate(0, bob);
  ctx.fillStyle = '#181c34';
  ctx.beginPath();
  ctx.moveTo(0, -p.r - 4);
  ctx.bezierCurveTo(p.r + 4, -p.r, p.r + 2, p.r * 0.6, p.r * 0.7, p.r + 2);
  ctx.lineTo(-p.r * 0.7, p.r + 2);
  ctx.bezierCurveTo(-p.r - 2, p.r * 0.6, -p.r - 4, -p.r, 0, -p.r - 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,180,91,0.75)'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = '#101427';
  ctx.beginPath(); ctx.arc(0, -p.r * 0.45, p.r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.ellipse(Math.cos(p.facing) * 2.5, -p.r * 0.45 + Math.sin(p.facing) * 1.5, p.r * 0.34, p.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  const clsColor = (CLASSES[game.playerClass] || CLASSES.mage).color;
  ctx.fillStyle = hexA(clsColor, 0.7 + Math.sin(t * 3) * 0.25);
  ctx.font = `${p.r * 0.75}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((CLASSES[game.playerClass] || CLASSES.mage).glyph, 0, p.r * 0.3);
  ctx.restore();

  // orbiting power glyphs: each active Power circles the binder
  powers.forEach((pw, i) => {
    const a = t * 1.4 + (i / Math.max(1, powers.length)) * Math.PI * 2;
    const cx = p.x + Math.cos(a) * 32, cy = p.y + Math.sin(a) * 24 - 6;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(Math.sin(a) * 0.5);
    ctx.fillStyle = 'rgba(20,22,42,0.95)';
    ctx.fillRect(-5, -8, 10, 16);
    ctx.strokeStyle = hexA(pw.color, 0.95); ctx.lineWidth = 1.2;
    ctx.strokeRect(-5, -8, 10, 16);
    ctx.fillStyle = hexA(pw.color, 0.95);
    ctx.font = '8px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pw.glyph, 0, 0.5);
    ctx.restore();
  });
  if (powers.length === 0) {
    // idle: three faint tarot cards orbit the binder
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

  // sustained cast: a rotating rune ring with a progress arc around the hero
  for (const s of game.sustains) {
    const prog = s.t / s.dur;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = hexA(s.color, 0.5); ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = hexA(s.color, 0.95); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 42, -Math.PI / 2, -Math.PI / 2 + (1 - prog) * Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = hexA(s.color, 0.9);
    ctx.font = '16px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const a = -Math.PI / 2 + (1 - prog) * Math.PI * 2;
    ctx.fillText(s.def.glyph, Math.cos(a) * 42, Math.sin(a) * 42);
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
  } else if (pr.r >= 18) {
    ctx.fillStyle = hexA(pr.color, 0.35);
    ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(pr.color, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * (0.75 + Math.sin(t * 6) * 0.1), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  } else {
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
      ctx.translate(fx.x, fx.y);
      if (fx.ang) ctx.rotate(fx.ang);
      ctx.fillRect(-fx.w / 2, -fx.h / 2, fx.w, fx.h);
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

// ── edge compass: the world always offers somewhere to go ──
function drawCompass(game, ctx, W, H, scale) {
  if (game.state !== 'combat' || game.zoneRegion) return;
  const p = game.player;
  const targets = [];
  const cx = Math.floor(p.x / CHUNK), cy = Math.floor(p.y / CHUNK);
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const key = (cx + dx) + ',' + (cy + dy);
      const ch = game.chunks.get(key);
      if (!ch) continue;
      if (ch.camp && !ch.camp.cleared && !ch.camp.engaged) targets.push({ x: ch.camp.x, y: ch.camp.y, color: '#c23b4a', glyph: '♅' });
      if (ch.landmark && !ch.landmark.cleared) targets.push({ x: ch.landmark.x, y: ch.landmark.y, color: '#ffd97a', glyph: '☩' });
      if (ch.sanctuary) targets.push({ x: ch.sanctuary.x, y: ch.sanctuary.y, color: '#8fd8ff', glyph: '⌂' });
    }
  }
  // the open portal is THE objective: always on the compass, however far,
  // and it counts down out loud once it starts guttering
  if (game.portal) {
    const urgent = game.portal.timeLeft < 20;
    targets.push({
      x: game.portal.x, y: game.portal.y, glyph: '✦', always: true,
      color: urgent ? '#ffb38a' : '#dff4ff',
      label: urgent ? Math.ceil(game.portal.timeLeft) + 's' : null,
    });
  }
  // nearest of each color
  const best = {};
  for (const tg of targets) {
    const d = Math.hypot(tg.x - p.x, tg.y - p.y);
    if (d < 500 || (d > 3200 && !tg.always)) continue; // visible or too far
    if (!best[tg.color] || d < best[tg.color].d) best[tg.color] = { ...tg, d };
  }
  for (const tg of Object.values(best)) {
    const a = Math.atan2(tg.y - p.y, tg.x - p.x);
    const rx = W / 2 - 44, ry = H / 2 - 96;
    const px2 = W / 2 + Math.cos(a) * rx, py2 = H / 2 + Math.sin(a) * ry;
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(game.time * 3) * 0.15;
    ctx.translate(px2, py2);
    ctx.rotate(a);
    ctx.fillStyle = tg.color;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -7); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
    ctx.rotate(-a);
    ctx.font = '13px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tg.glyph, -16 * Math.cos(a), -16 * Math.sin(a));
    if (tg.label) {
      ctx.font = 'bold 12px Georgia, serif';
      ctx.fillText(tg.label, -16 * Math.cos(a), -16 * Math.sin(a) + 15);
    }
    ctx.restore();
  }
}
