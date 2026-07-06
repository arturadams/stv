// ── Arcana Engine · DOM interface ──────────────────────────────────────────
// The card pipeline UI is the identity of the game: Deck → Queue → Channel →
// Resolve → Discard, rendered as living arcane artifacts.

import { SCHOOL_COLORS, ELEMENT_COLORS, RARITY_COLORS } from './data.js';
import { startRun, applyReward, colorOf } from './world.js';
import { initAudio, sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
let els = {};
let knownQueueUids = new Set();

export function initUI(game) {
  els = {
    hpFill: $('hp-fill'), hpText: $('hp-text'), armor: $('armor-chip'),
    flowFill: $('flow-fill'), flowText: $('flow-text'), flowBar: $('flow-bar'),
    combo: $('combo'), encounter: $('encounter-label'), waveLabel: $('wave-label'),
    relics: $('relics'), chips: $('chips'),
    deckCount: $('deck-count'), discardCount: $('discard-count'),
    queueRow: $('queue-row'), channelSlot: $('channel-slot'),
    banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
    bossBar: $('boss-bar'), bossFill: $('boss-fill'), bossName: $('boss-name'),
    overlayTitle: $('title-overlay'), overlayReward: $('reward-overlay'),
    overlayEnd: $('end-overlay'), endTitle: $('end-title'), endSub: $('end-sub'), endStats: $('end-stats'),
    rewardCards: $('reward-cards'), rewardHeading: $('reward-heading'),
    tooltip: $('tooltip'), stolen: $('stolen-note'),
  };

  $('start-btn').addEventListener('click', () => {
    initAudio();
    els.overlayTitle.classList.add('hidden');
    startRun(game);
  });
  $('retry-btn').addEventListener('click', () => {
    els.overlayEnd.classList.add('hidden');
    resetRunState(game);
    startRun(game);
  });
  $('reward-skip').addEventListener('click', () => {
    applyReward(game, null);
    syncOverlays(game);
  });
}

function resetRunState(game) {
  // a fresh run keeps unlocks simple: same starting deck, no relics
  game.deckIds = game.deckIds.slice(0, 10);
  game.relics = [];
  game.relicRadiusMult = 1; game.hasDuelist = false;
  game.engine.maxFlow = 10; game.engine.channelMultGlobal = 1;
  game.engine.modStack = []; game.engine.enchants = []; game.engine.flowJobs = [];
  game.engine.hasteMult = 1; game.engine.combo = 0;
  game.stolen = null;
}

// ── card element factory ──
export function buildCardEl(def, size) {
  const el = document.createElement('div');
  el.className = `card ${size} school-${def.school.toLowerCase()} rarity-${def.rarity.toLowerCase()}`;
  const schoolC = SCHOOL_COLORS[def.school];
  const elemC = ELEMENT_COLORS[def.element] || schoolC;
  el.style.setProperty('--school', schoolC);
  el.style.setProperty('--elem', elemC);
  el.style.setProperty('--rarity', RARITY_COLORS[def.rarity]);
  if (size === 'mini') {
    el.innerHTML = `
      <div class="card-cost">${def.cost}</div>
      <div class="card-art"><span class="card-glyph">${def.glyph}</span></div>
      <div class="card-mininame">${def.name}</div>`;
  } else {
    el.innerHTML = `
      <div class="card-topline"><div class="card-cost">${def.cost}</div><div class="card-name">${def.name}</div></div>
      <div class="card-art"><span class="card-glyph">${def.glyph}</span></div>
      <div class="card-type">${def.school} · ${def.cat}</div>
      <div class="card-text">${def.text}</div>
      <div class="card-tags">${def.tags.join(' · ')}</div>`;
  }
  return el;
}

function tooltipHTML(def) {
  return `<div class="tt-name" style="color:${SCHOOL_COLORS[def.school]}">${def.glyph} ${def.name}</div>
    <div class="tt-type">${def.school} · ${def.cat} · ${def.rarity} · Flow ${def.cost} · Channel ${def.channel}s</div>
    <div class="tt-text">${def.text}</div>
    <div class="tt-tags">${def.tags.join(' · ')}</div>`;
}

function attachTooltip(el, def) {
  el.addEventListener('mouseenter', () => {
    els.tooltip.innerHTML = tooltipHTML(def);
    els.tooltip.classList.remove('hidden');
  });
  el.addEventListener('mousemove', (ev) => {
    const pad = 14;
    let x = ev.clientX + pad, y = ev.clientY - 10 - els.tooltip.offsetHeight;
    if (x + els.tooltip.offsetWidth > window.innerWidth - 8) x = ev.clientX - pad - els.tooltip.offsetWidth;
    if (y < 8) y = ev.clientY + pad;
    els.tooltip.style.left = x + 'px'; els.tooltip.style.top = y + 'px';
  });
  el.addEventListener('mouseleave', () => els.tooltip.classList.add('hidden'));
}

// ── per-frame update ──
export function updateUI(game) {
  const p = game.player, eng = game.engine;

  // bars
  els.hpFill.style.width = `${(p.hp / p.maxHp) * 100}%`;
  els.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  els.armor.textContent = p.armor > 0 ? `⛨ ${Math.ceil(p.armor)}` : '';
  const flowPct = (eng.flow / eng.maxFlow) * 100;
  els.flowFill.style.width = `${flowPct}%`;
  els.flowText.textContent = `${Math.floor(eng.flow)} / ${eng.maxFlow}`;
  els.flowBar.classList.toggle('flow-full', eng.flow >= eng.maxFlow);

  // combo
  if (eng.combo >= 2) {
    els.combo.classList.remove('hidden');
    if (els.combo.dataset.v !== String(eng.combo)) {
      els.combo.dataset.v = String(eng.combo);
      els.combo.textContent = `COMBO ×${eng.combo}`;
      els.combo.classList.remove('pop'); void els.combo.offsetWidth; els.combo.classList.add('pop');
    }
  } else els.combo.classList.add('hidden');

  // banner
  if (game.banner) {
    els.banner.classList.remove('hidden');
    if (els.bannerTitle.textContent !== game.banner.title) {
      els.bannerTitle.textContent = game.banner.title;
      els.bannerSub.textContent = game.banner.sub || '';
      els.banner.classList.remove('banner-in'); void els.banner.offsetWidth; els.banner.classList.add('banner-in');
    }
    els.banner.style.opacity = Math.min(1, game.banner.t / 0.5);
  } else {
    els.banner.classList.add('hidden');
    els.bannerTitle.textContent = '';
  }

  // boss bar
  const boss = game.enemies.find(e => e.def.boss);
  if (boss) {
    els.bossBar.classList.remove('hidden');
    els.bossName.textContent = boss.def.name;
    els.bossFill.style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
  } else els.bossBar.classList.add('hidden');

  // stolen card note
  if (game.stolen) {
    els.stolen.classList.remove('hidden');
    els.stolen.textContent = `“${game.stolen.inst.def.name}” stolen — returns in ${Math.ceil(game.stolen.t)}s`;
  } else els.stolen.classList.add('hidden');

  // channel progress ring (cheap, every frame)
  const ch = eng.channel;
  if (ch) {
    const prog = ch.dur > 0 ? Math.min(1, ch.t / ch.dur) : 1;
    els.channelSlot.style.setProperty('--prog', `${prog * 360}deg`);
    els.channelSlot.style.setProperty('--chcolor', colorOf(ch.inst.def));
  }

  if (eng.uiDirty || game.uiDirty) {
    eng.uiDirty = false; game.uiDirty = false;
    rebuildPipeline(game);
    rebuildChips(game);
    rebuildRelics(game);
    syncOverlays(game);
  }
  if (game.state === 'gameover' || game.state === 'victory') syncEndOverlay(game);

  // encounter labels
  els.encounter.textContent = game.stateLabel || '';
}

function rebuildPipeline(game) {
  const eng = game.engine;
  els.deckCount.textContent = eng.deck.length;
  els.discardCount.textContent = eng.discard.length;

  // queue row
  els.queueRow.innerHTML = '';
  const newKnown = new Set();
  eng.queue.forEach((inst, i) => {
    const el = buildCardEl(inst.def, 'mini');
    if (inst.cost !== inst.def.cost) el.querySelector('.card-cost').textContent = inst.cost;
    if (i === 0 && !eng.canAfford(inst)) {
      el.classList.add('starved');
    }
    if (!knownQueueUids.has(inst.uid)) el.classList.add('card-enter');
    attachTooltip(el, inst.def);
    els.queueRow.appendChild(el);
    newKnown.add(inst.uid);
  });
  knownQueueUids = newKnown;
  for (let i = eng.queue.length; i < eng.queueCap; i++) {
    const ghost = document.createElement('div');
    ghost.className = 'card mini ghost';
    els.queueRow.appendChild(ghost);
  }

  // channel slot
  els.channelSlot.innerHTML = '';
  if (eng.channel) {
    const el = buildCardEl(eng.channel.inst.def, 'mini');
    el.classList.add('channeling');
    attachTooltip(el, eng.channel.inst.def);
    els.channelSlot.appendChild(el);
    els.channelSlot.classList.add('active');
  } else {
    els.channelSlot.classList.remove('active');
    const ghost = document.createElement('div');
    ghost.className = 'card mini ghost';
    els.channelSlot.appendChild(ghost);
  }
}

function rebuildChips(game) {
  const eng = game.engine;
  els.chips.innerHTML = '';
  for (const m of eng.modStack) {
    const chip = document.createElement('div');
    chip.className = 'chip chip-mod';
    chip.style.setProperty('--c', ELEMENT_COLORS[m.color] || '#d9b45b');
    chip.textContent = `${m.glyph} ${m.name}${m.count > 1 ? ' ×' + m.count : ''}`;
    els.chips.appendChild(chip);
  }
  for (const e of eng.enchants) {
    if (e.relic) continue;
    const chip = document.createElement('div');
    chip.className = 'chip chip-ench';
    chip.style.setProperty('--c', e.color || '#d9b45b');
    chip.textContent = `${e.glyph} ${e.name} ${Math.ceil(e.timeLeft)}s`;
    els.chips.appendChild(chip);
  }
}

// enchant chips need their countdown refreshed even when nothing else changes
setInterval(() => {
  const dirty = document.querySelector('.chip-ench');
  if (dirty) window.__game && (window.__game.engine.uiDirty = true);
}, 1000);

function rebuildRelics(game) {
  els.relics.innerHTML = '';
  for (const r of game.relics) {
    const el = document.createElement('div');
    el.className = 'relic';
    el.style.setProperty('--c', r.color);
    el.textContent = r.glyph;
    el.title = `${r.name} — ${r.text}`;
    els.relics.appendChild(el);
  }
}

function syncOverlays(game) {
  if (game.state === 'reward' && game.pendingReward) {
    els.overlayReward.classList.remove('hidden');
    els.rewardHeading.textContent = game.pendingReward.type === 'card'
      ? 'Choose a card to bind into your deck' : 'Choose a relic';
    els.rewardCards.innerHTML = '';
    for (const opt of game.pendingReward.options) {
      let el;
      if (game.pendingReward.type === 'card') {
        el = buildCardEl(opt, 'full');
      } else {
        el = document.createElement('div');
        el.className = 'card full relic-card';
        el.style.setProperty('--school', opt.color);
        el.style.setProperty('--elem', opt.color);
        el.style.setProperty('--rarity', opt.color);
        el.innerHTML = `
          <div class="card-topline"><div class="card-name">${opt.name}</div></div>
          <div class="card-art"><span class="card-glyph">${opt.glyph}</span></div>
          <div class="card-type">Relic</div>
          <div class="card-text">${opt.text}</div>`;
      }
      el.classList.add('pickable');
      el.addEventListener('click', () => {
        sfx('enchant');
        applyReward(game, opt);
        syncOverlays(game);
      });
      els.rewardCards.appendChild(el);
    }
  } else {
    els.overlayReward.classList.add('hidden');
  }
}

function syncEndOverlay(game) {
  if (!els.overlayEnd.classList.contains('hidden')) return;
  els.overlayEnd.classList.remove('hidden');
  const won = game.state === 'victory';
  els.endTitle.textContent = won ? 'THE ARCHIVE FALLS SILENT' : 'THE DECK RUNS OUT';
  els.endTitle.style.color = won ? '#ffd97a' : '#c23b4a';
  els.endSub.textContent = won
    ? 'The Gilded Librarian dissolves into loose pages. Your cards drift home.'
    : 'Your story is reshuffled into the great deck. Draw again.';
  const mins = Math.floor(game.runTime / 60), secs = Math.floor(game.runTime % 60);
  els.endStats.innerHTML = `
    <span>☠ ${game.kills} enemies unmade</span>
    <span>⎘ ${game.deckIds.length} cards bound</span>
    <span>⌛ ${mins}:${String(secs).padStart(2, '0')}</span>`;
}

export function setStateLabel(game, label) { game.stateLabel = label; }
