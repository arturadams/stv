// ── Arcana Engine · DOM interface ──────────────────────────────────────────
// The card pipeline UI is the identity of the game: Deck → Queue → Active →
// Discard, rendered as living arcane artifacts. The new rhythm demands
// visibility: power badges, duration bars, the active cast slot, card pops.

import { SCHOOL_COLORS, ELEMENT_COLORS, RARITY_COLORS, CLASSES, CARDS, WORLDS } from './data.js';
import {
  startRun, applyReward, resolveEncounterChoice, colorOf, prepareRun,
  buyCard, sellCard, combineCards, leaveSanctuary, sellPrice, CARD_PRICES, MAX_CARD_LVL,
} from './world.js';
import { initAudio, sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
let els = {};
let knownQueueUids = new Set();
let selectedClass = 'mage';
let pendingRun = null;
let lastPopUid = 0;
let powersSig = '';

export function initUI(game) {
  els = {
    hpFill: $('hp-fill'), hpText: $('hp-text'), armor: $('armor-chip'),
    flowFill: $('flow-fill'), flowText: $('flow-text'), flowBar: $('flow-bar'),
    resWrap: $('res-wrap'), resLabel: $('res-label'), resFill: $('res-fill'), resText: $('res-text'),
    powers: $('powers'),
    combo: $('combo'), encounter: $('encounter-label'),
    relics: $('relics'), chips: $('chips'),
    deckCount: $('deck-count'), discardCount: $('discard-count'),
    queueRow: $('queue-row'), channelSlot: $('channel-slot'), activeName: $('active-name'),
    cardPop: $('card-pop'),
    banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
    bossBar: $('boss-bar'), bossFill: $('boss-fill'), bossName: $('boss-name'),
    overlayTitle: $('title-overlay'), overlayReward: $('reward-overlay'),
    overlayEnd: $('end-overlay'), endTitle: $('end-title'), endSub: $('end-sub'), endStats: $('end-stats'),
    overlayEncounter: $('encounter-overlay'), encName: $('enc-name'), encCards: $('enc-cards'),
    goldChip: $('gold-chip'),
    overlaySanct: $('sanctuary-overlay'), sanctGold: $('sanct-gold'),
    shopStock: $('shop-stock'), sanctDeck: $('sanct-deck'), sanctDeckCount: $('sanct-deck-count'),
    rewardCards: $('reward-cards'), rewardHeading: $('reward-heading'),
    classRow: $('class-row'),
    overlaySetup: $('setup-overlay'), setupClass: $('setup-class'),
    worldRow: $('world-row'), startCards: $('start-cards'),
    tooltip: $('tooltip'), stolen: $('stolen-note'),
    portrait: $('portrait-plate'), portraitGlyph: $('portrait-glyph'), portraitWorld: $('portrait-world'),
    clock: $('run-clock'),
  };

  buildClassSelect(game);

  $('start-btn').addEventListener('click', () => {
    initAudio();
    els.overlayTitle.classList.add('hidden');
    pendingRun = prepareRun(game, selectedClass, 1);
    buildSetup(game);
    els.overlaySetup.classList.remove('hidden');
  });
  $('reroll-btn').addEventListener('click', () => {
    sfx('draw');
    pendingRun = prepareRun(game, pendingRun.classId, pendingRun.world);
    buildSetup(game);
  });
  $('enter-btn').addEventListener('click', () => {
    els.overlaySetup.classList.add('hidden');
    sfx('reward');
    startRun(game, pendingRun.classId, { world: pendingRun.world, deck: pendingRun.deck });
  });
  $('retry-btn').addEventListener('click', () => {
    els.overlayEnd.classList.add('hidden');
    els.overlayTitle.classList.remove('hidden');
    game.state = 'title';
  });
  $('reward-skip').addEventListener('click', () => {
    applyReward(game, null);
    syncOverlays(game);
  });
  $('fight-btn').addEventListener('click', () => {
    els.overlayEncounter.classList.add('hidden');
    resolveEncounterChoice(game, 'fight');
  });
  $('party-btn').addEventListener('click', () => {
    els.overlayEncounter.classList.add('hidden');
    resolveEncounterChoice(game, 'party');
  });
  $('leave-btn').addEventListener('click', () => leaveSanctuary(game));
}

// ── class selection on the title screen ──
function buildClassSelect(game) {
  els.classRow.innerHTML = '';
  for (const cls of Object.values(CLASSES)) {
    const el = document.createElement('div');
    el.className = 'class-card' + (cls.id === selectedClass ? ' selected' : '');
    el.style.setProperty('--c', cls.color);
    el.innerHTML = `
      <div class="class-glyph">${cls.glyph}</div>
      <div class="class-name">${cls.name}</div>
      <div class="class-tagline">${cls.tagline}</div>
      <div class="class-desc">${cls.desc}</div>
      <div class="class-basic">Basic attack — <b>${cls.basic.name}</b></div>`;
    el.addEventListener('click', () => {
      selectedClass = cls.id;
      initAudio(); sfx('engine');
      for (const c of els.classRow.children) c.classList.remove('selected');
      el.classList.add('selected');
    });
    els.classRow.appendChild(el);
  }
}

// ── run setup: the rolled hand + world selection ──
function buildSetup(game) {
  const cls = CLASSES[pendingRun.classId];
  els.setupClass.innerHTML = `<span style="color:${cls.color}">${cls.glyph} ${cls.name}</span>`;

  els.worldRow.innerHTML = '';
  for (const w of WORLDS) {
    const btn = document.createElement('button');
    btn.className = 'world-btn' + (w.num === pendingRun.world ? ' selected' : '');
    btn.innerHTML = `<span class="wb-sub">${w.sub}</span><span class="wb-name">${w.name}</span>`;
    btn.addEventListener('click', () => {
      sfx('engine');
      pendingRun = prepareRun(game, pendingRun.classId, w.num); // reroll for the new world's pool
      buildSetup(game);
    });
    els.worldRow.appendChild(btn);
  }

  els.startCards.innerHTML = '';
  for (const entry of pendingRun.deck) {
    const def = CARDS[entry.id];
    const el = buildCardEl(def, 'mini');
    attachTooltip(el, def);
    els.startCards.appendChild(el);
  }
}

// ── card element factory ──
export function buildCardEl(def, size, lvl = 0) {
  const el = document.createElement('div');
  el.className = `card ${size} school-${def.school.toLowerCase()} rarity-${def.rarity.toLowerCase()}`;
  const schoolC = SCHOOL_COLORS[def.school];
  const elemC = ELEMENT_COLORS[def.element] || schoolC;
  el.style.setProperty('--school', schoolC);
  el.style.setProperty('--elem', elemC);
  el.style.setProperty('--rarity', RARITY_COLORS[def.rarity]);
  const catLabel = def.sub ? `${def.cat} · ${def.sub}` : def.cat;
  const lvlBadge = lvl > 0 ? `<div class="card-lvl">${'★'.repeat(lvl)}</div>` : '';
  if (size === 'mini') {
    el.innerHTML = `
      <div class="card-cost">${def.cost}</div>${lvlBadge}
      <div class="card-art"><span class="card-glyph">${def.glyph}</span></div>
      <div class="card-mininame">${def.name}</div>`;
  } else {
    el.innerHTML = `
      <div class="card-topline"><div class="card-cost">${def.cost}</div><div class="card-name">${def.name}</div></div>${lvlBadge}
      <div class="card-art"><span class="card-glyph">${def.glyph}</span></div>
      <div class="card-type">${def.school} · ${catLabel}</div>
      <div class="card-text">${def.text}</div>
      <div class="card-tags">${def.tags.join(' · ')}</div>`;
  }
  return el;
}

function tooltipHTML(def) {
  const catLabel = def.sub ? `${def.cat} · ${def.sub}` : def.cat;
  return `<div class="tt-name" style="color:${SCHOOL_COLORS[def.school]}">${def.glyph} ${def.name}</div>
    <div class="tt-type">${def.school} · ${catLabel} · ${def.rarity} · Flow ${def.cost} · Channel ${def.channel}s${def.dur ? ' · Active ' + def.dur + 's' : ''}</div>
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

  // touch: tap the card to inspect it, tap anywhere else to dismiss
  el.addEventListener('click', () => {
    if (!document.body.classList.contains('touch-mode')) return;
    els.tooltip.innerHTML = tooltipHTML(def);
    els.tooltip.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    let x = r.left + r.width / 2 - els.tooltip.offsetWidth / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - els.tooltip.offsetWidth - 8));
    let y = r.top - els.tooltip.offsetHeight - 10;
    if (y < 8) y = Math.min(r.bottom + 10, window.innerHeight - els.tooltip.offsetHeight - 8);
    els.tooltip.style.left = x + 'px'; els.tooltip.style.top = y + 'px';
    document.addEventListener('pointerdown', (ev) => {
      if (!el.contains(ev.target)) els.tooltip.classList.add('hidden');
    }, { once: true, capture: true });
  });
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

  // portrait plate: class glyph + world badge, plus the run clock
  const cls = CLASSES[game.playerClass];
  if (els.portrait.dataset.cls !== (game.playerClass || '')) {
    els.portrait.dataset.cls = game.playerClass || '';
    els.portraitGlyph.textContent = cls ? cls.glyph : '✦';
    els.portrait.style.setProperty('--c', cls ? cls.color : '#5c6672');
  }
  els.portraitWorld.textContent = game.state === 'title' ? '' : game.world;
  const rt = Math.floor(game.runTime || 0);
  els.clock.textContent = `${Math.floor(rt / 60)}:${String(rt % 60).padStart(2, '0')}`;

  // class resource (Rage / Opportunity)
  const res = (cls || {}).resource;
  if (res && game.state !== 'title') {
    els.resWrap.classList.remove('hidden');
    els.resLabel.textContent = res.name;
    const val = res.key === 'rage' ? game.rage : game.opportunity;
    els.resFill.style.width = `${(val / res.max) * 100}%`;
    els.resFill.style.background = res.color;
    els.resText.textContent = res.pips ? `${Math.floor(val)} / ${res.max}` : `${Math.floor(val)}`;
  } else {
    els.resWrap.classList.add('hidden');
  }

  updatePowerBadges(game);

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

  // boss / rival duel bar
  const boss = game.enemies.find(e => e.def.boss || e.def.rival);
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

  // active cast: channel progress ring, sustained progress, card name
  const ch = eng.channel;
  const sus = game.sustains[0];
  if (ch) {
    const prog = ch.dur > 0 ? Math.min(1, ch.t / ch.dur) : 1;
    els.channelSlot.style.setProperty('--prog', `${prog * 360}deg`);
    els.channelSlot.style.setProperty('--chcolor', colorOf(ch.inst.def));
    els.activeName.textContent = ch.inst.def.name;
    els.activeName.style.color = colorOf(ch.inst.def);
    if (ch.inst.uid !== lastPopUid) { lastPopUid = ch.inst.uid; popCard(ch.inst.def); }
  } else if (sus) {
    const prog = 1 - Math.min(1, sus.t / sus.dur);
    els.channelSlot.style.setProperty('--prog', `${prog * 360}deg`);
    els.channelSlot.style.setProperty('--chcolor', sus.color);
    els.activeName.textContent = sus.def.name;
    els.activeName.style.color = sus.color;
  } else {
    els.activeName.textContent = '';
  }

  els.goldChip.textContent = game.state === 'title' ? '' : `◈ ${game.gold}`;

  if (eng.uiDirty || game.uiDirty) {
    eng.uiDirty = false; game.uiDirty = false;
    rebuildPipeline(game);
    rebuildChips(game);
    rebuildRelics(game);
    syncOverlays(game);
    syncSanctuary(game);
  }
  if (game.state !== 'sanctuary' && !els.overlaySanct.classList.contains('hidden'))
    els.overlaySanct.classList.add('hidden');
  syncEncounterOverlay(game);
  if (game.state === 'gameover' || game.state === 'victory') syncEndOverlay(game);
  else if (!els.overlayEnd.classList.contains('hidden') && game.state === 'combat') els.overlayEnd.classList.add('hidden');

  els.encounter.textContent = game.stateLabel || '';
}

// ── active power badges: name + remaining duration bar ──
function updatePowerBadges(game) {
  const entries = game.engine.powers.slice();
  if (game.dashOverride) {
    const ov = game.dashOverride;
    entries.push({ id: 'dash:' + ov.def.id, name: 'DASH — ' + ov.def.name, glyph: ov.def.glyph,
      color: ov.color, timeLeft: ov.timeLeft, dur: ov.dur });
  }
  const sig = entries.map(pw => pw.id).join('|');
  if (sig !== powersSig) {
    powersSig = sig;
    els.powers.innerHTML = '';
    for (const pw of entries) {
      const el = document.createElement('div');
      el.className = 'power-badge';
      el.dataset.id = pw.id;
      el.style.setProperty('--c', pw.color);
      el.innerHTML = `
        <span class="pw-glyph">${pw.glyph}</span>
        <span class="pw-name">${pw.name}</span>
        <span class="pw-time"></span>
        <div class="pw-bar"><div class="pw-fill"></div></div>`;
      els.powers.appendChild(el);
    }
  }
  for (const el of els.powers.children) {
    const pw = entries.find(x => x.id === el.dataset.id);
    if (!pw) continue;
    el.querySelector('.pw-fill').style.width = `${Math.max(0, pw.timeLeft / pw.dur) * 100}%`;
    el.querySelector('.pw-time').textContent = `${pw.timeLeft.toFixed(1)}s`;
  }
}

// ── the card pop: every cast is announced, enlarged, readable ──
function popCard(def) {
  els.cardPop.innerHTML = '';
  const el = buildCardEl(def, 'full');
  el.classList.add('pop-in');
  els.cardPop.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 1500);
}

function rebuildPipeline(game) {
  const eng = game.engine;
  els.deckCount.textContent = eng.deck.length;
  els.discardCount.textContent = eng.discard.length;

  // queue row
  els.queueRow.innerHTML = '';
  const newKnown = new Set();
  eng.queue.forEach((inst, i) => {
    const el = buildCardEl(inst.def, 'mini', inst.lvl || 0);
    if (inst.cost !== inst.def.cost) el.querySelector('.card-cost').textContent = inst.cost;
    if (i === 0) {
      if (!eng.canAfford(inst)) el.classList.add('starved');
      else el.classList.add('next-up');
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

  // active slot: the channeling card, or the sustained cast
  els.channelSlot.innerHTML = '';
  const activeDef = eng.channel ? eng.channel.inst.def : (game.sustains[0] ? game.sustains[0].def : null);
  if (activeDef) {
    const el = buildCardEl(activeDef, 'mini');
    el.classList.add('channeling');
    attachTooltip(el, activeDef);
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
  const slots = Math.max(6, Math.ceil(game.relics.length / 3) * 3); // inventory grid, 3 per row
  for (let i = 0; i < slots; i++) {
    const r = game.relics[i];
    const el = document.createElement('div');
    if (r) {
      el.className = 'relic';
      el.style.setProperty('--c', r.color);
      el.textContent = r.glyph;
      el.title = `${r.name} — ${r.text}`;
    } else {
      el.className = 'relic empty';
    }
    els.relics.appendChild(el);
  }
}

// ── the rival encounter: featured cards + Fight / Party Up ──
let encounterShown = false;
function syncEncounterOverlay(game) {
  const active = game.mm.state === 'choice' && game.rival;
  if (active && !encounterShown) {
    encounterShown = true;
    const r = game.rival;
    els.encName.innerHTML = `<span style="color:${r.color}">${r.name}</span>`;
    els.encCards.innerHTML = '';
    for (const def of r.featured) {
      const el = buildCardEl(def, 'full');
      attachTooltip(el, def);
      els.encCards.appendChild(el);
    }
    els.overlayEncounter.classList.remove('hidden');
  } else if (!active && encounterShown) {
    encounterShown = false;
    els.overlayEncounter.classList.add('hidden');
  }
}

// ── the sanctuary: shop + deck table ──
function syncSanctuary(game) {
  const on = game.state === 'sanctuary' && game.sanctuary;
  els.overlaySanct.classList.toggle('hidden', !on);
  if (!on) return;
  const s = game.sanctuary;
  els.sanctGold.innerHTML = `◈ ${game.gold} gold`;
  els.sanctDeckCount.textContent = `(${game.deckIds.length})`;

  // merchant stock: a few seeded cards, gone once bought
  els.shopStock.innerHTML = '';
  if (!s.stock || s.stock.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'sanct-empty';
    empty.textContent = 'The merchant has nothing left to sell.';
    els.shopStock.appendChild(empty);
  }
  (s.stock || []).forEach((def, idx) => {
    const row = document.createElement('div');
    row.className = 'shop-row';
    const el = buildCardEl(def, 'mini');
    attachTooltip(el, def);
    const price = CARD_PRICES[def.rarity];
    const btn = document.createElement('button');
    btn.className = 'sanct-btn';
    btn.textContent = `BUY ◈${price}`;
    if (game.gold < price) btn.disabled = true;
    btn.addEventListener('click', () => { buyCard(game, idx); });
    const name = document.createElement('div');
    name.className = 'shop-name';
    name.textContent = def.name;
    name.style.color = SCHOOL_COLORS[def.school];
    row.appendChild(el); row.appendChild(name); row.appendChild(btn);
    els.shopStock.appendChild(row);
  });

  // the deck, grouped: sell — or combine two duplicates into a stronger card
  els.sanctDeck.innerHTML = '';
  const groups = new Map();
  for (const e of game.deckIds) {
    const key = e.id + ':' + (e.lvl || 0);
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  for (const [key, count] of groups) {
    const [id, lvlStr] = key.split(':');
    const lvl = Number(lvlStr);
    const def = CARDS[id];
    const row = document.createElement('div');
    row.className = 'shop-row';
    const el = buildCardEl(def, 'mini', lvl);
    attachTooltip(el, def);
    const name = document.createElement('div');
    name.className = 'shop-name';
    name.innerHTML = `${def.name}${lvl > 0 ? ' <span class="lvl-note">Lv.' + lvl + '</span>' : ''}${count > 1 ? ' ×' + count : ''}`;
    name.style.color = SCHOOL_COLORS[def.school];
    row.appendChild(el); row.appendChild(name);
    if (count >= 2 && lvl < MAX_CARD_LVL) {
      const cb = document.createElement('button');
      cb.className = 'sanct-btn combine';
      cb.textContent = `COMBINE → Lv.${lvl + 1}`;
      cb.addEventListener('click', () => { combineCards(game, id, lvl); });
      row.appendChild(cb);
    }
    const sb = document.createElement('button');
    sb.className = 'sanct-btn';
    sb.textContent = `SELL ◈${sellPrice({ id, lvl })}`;
    if (game.deckIds.length <= 6) sb.disabled = true;
    sb.addEventListener('click', () => { sellCard(game, id, lvl); });
    row.appendChild(sb);
    els.sanctDeck.appendChild(row);
  }
}

function syncOverlays(game) {
  if (game.state === 'reward' && game.pendingReward) {
    els.overlayReward.classList.remove('hidden');
    els.rewardHeading.textContent = game.pendingReward.heading ||
      (game.pendingReward.type === 'card' ? 'Choose a card to bind into your deck' : 'Choose a relic');
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
  els.endTitle.textContent = 'THE DECK RUNS OUT';
  els.endTitle.style.color = '#c23b4a';
  els.endSub.textContent = 'Your story is reshuffled into the great deck. Draw again.';
  const mins = Math.floor(game.runTime / 60), secs = Math.floor(game.runTime % 60);
  els.endStats.innerHTML = `
    <span>❂ world ${game.world}</span>
    <span>☠ ${game.kills} unmade</span>
    <span>⎘ ${game.deckIds.length} cards</span>
    <span>♅ ${game.campsCleared} camps</span>
    <span>☩ ${game.bossesSlain} bosses</span>
    <span>⚔ ${game.duelsWon} duels</span>
    <span>⌛ ${mins}:${String(secs).padStart(2, '0')}</span>`;
}
