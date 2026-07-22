import { CARDS, CLASS_BRANCHES, CLASSES, RELIC_REQUIREMENTS, TALENTS, TALENT_LIST } from './data.js';

const $ = (id) => document.getElementById(id);

function relatedTalents(game, card) {
  const keywords = card.keywords || card.tags || [];
  return TALENT_LIST.filter((talent) =>
    talent.classId === game.playerClass &&
    talent.branch !== 'General' &&
    talent.keywords.some((keyword) =>
      card.branch === keyword || card.secondaryBranch === keyword || keywords.includes(keyword)));
}

function primaryBranchCounts(game) {
  const counts = {};
  for (const entry of game.deckIds) {
    const branch = CARDS[entry.id]?.branch || 'Unassigned';
    counts[branch] = (counts[branch] || 0) + 1;
  }
  return counts;
}

function talentBranchCounts(game) {
  const counts = {};
  for (const id of game.chosenTalents) {
    const branch = TALENTS[id]?.branch || 'General';
    counts[branch] = (counts[branch] || 0) + 1;
  }
  return counts;
}

function levelEffect(level) {
  if (level <= 1) return 'Base values';
  if (level === 2) return '+20% damage/healing · +15% duration · +10% control';
  return '+40% damage/healing · +30% duration · +10% area · +20% control';
}

function renderDeck(game) {
  const root = $('build-deck');
  const cls = CLASSES[game.playerClass];
  const counts = primaryBranchCounts(game);
  const average = game.deckIds.reduce((sum, entry) => sum + (CARDS[entry.id]?.cost || 0), 0) / Math.max(1, game.deckIds.length);
  root.innerHTML = `<div class="build-summary">
    <b>${cls.name.toUpperCase()} DECK — ${game.deckIds.length} / 12</b>
    <span>Average cost ${average.toFixed(2)}</span>
    <span>Minimum 6 · Maximum copies 2 · Maximum level 3</span>
  </div>`;

  const order = [...CLASS_BRANCHES[game.playerClass], 'Flexible', 'Legendary'];
  for (const branch of order) {
    const entries = game.deckIds.filter((entry) => (CARDS[entry.id]?.branch || 'Unassigned') === branch);
    const section = document.createElement('section');
    section.className = 'build-branch';
    section.innerHTML = `<h3><span>${branch.toUpperCase()}</span><span>${counts[branch] || 0} ${(counts[branch] || 0) === 1 ? 'CARD' : 'CARDS'}</span></h3>`;
    const grid = document.createElement('div');
    grid.className = 'build-card-grid';
    if (!entries.length) {
      grid.innerHTML = '<div class="build-card-row meta">No cards in this branch.</div>';
    }
    entries.forEach((entry) => {
      const card = CARDS[entry.id];
      const related = relatedTalents(game, card).filter((talent) => game.chosenTalents.includes(talent.id));
      const row = document.createElement('div');
      row.className = 'build-card-row';
      row.innerHTML = `
        <b style="color:${cls.color}">${card.glyph} ${card.name}</b>
        <span class="status">LEVEL ${entry.lvl || 1}</span>
        <span class="meta">${card.cat.toUpperCase()} · COST ${card.cost} · ${(card.keywords || card.tags).join(' · ')}</span>
        <span class="meta">${entry.source === 'acquired' ? 'ACQUIRED' : 'STARTING'}</span>
        <span class="meta">${levelEffect(entry.lvl || 1)}</span>
        <span class="meta">Related talents: ${related.length ? related.map((talent) => talent.name).join(', ') : 'none active'}</span>`;
      grid.appendChild(row);
    });
    section.appendChild(grid);
    root.appendChild(section);
  }
}

function renderTalents(game) {
  const root = $('build-talents');
  root.innerHTML = '<div class="build-summary"><b>TALENT BRANCHES</b><span>Chosen talents stay illuminated; prior offers remain visible.</span></div>';
  const columns = document.createElement('div');
  columns.className = 'talent-branches';
  for (const branch of CLASS_BRANCHES[game.playerClass]) {
    const column = document.createElement('section');
    column.className = 'build-branch';
    column.innerHTML = `<h3><span>${branch.toUpperCase()}</span></h3>`;
    for (const talent of TALENT_LIST.filter((entry) => entry.classId === game.playerClass && entry.branch === branch)) {
      const chosen = game.chosenTalents.includes(talent.id);
      const offered = game.offeredTalents.includes(talent.id);
      const card = document.createElement('div');
      card.className = 'build-talent' + (chosen ? ' chosen' : offered ? ' offered' : '');
      card.innerHTML = `<b>${talent.name}</b><div class="meta">${chosen ? 'CHOSEN' : offered ? 'OFFERED · SKIPPED' : 'NOT YET OFFERED'}</div><p>${talent.text}</p>`;
      column.appendChild(card);
    }
    columns.appendChild(column);
  }
  root.appendChild(columns);

  const general = TALENT_LIST.find((talent) => talent.classId === game.playerClass && talent.branch === 'General');
  if (general) {
    const chosen = game.chosenTalents.includes(general.id);
    const block = document.createElement('section');
    block.className = 'build-branch';
    block.innerHTML = `<h3><span>GENERAL</span></h3><div class="build-talent ${chosen ? 'chosen' : game.offeredTalents.includes(general.id) ? 'offered' : ''}"><b>${general.name}</b><p>${general.text}</p></div>`;
    root.appendChild(block);
  }
}

function renderSynergies(game) {
  const root = $('build-synergies');
  const cardCounts = {};
  for (const branch of CLASS_BRANCHES[game.playerClass]) {
    cardCounts[branch] = game.deckIds.filter((entry) => {
      const card = CARDS[entry.id];
      return card?.branch === branch || card?.secondaryBranch === branch || card?.keywords?.includes(branch);
    }).length;
  }
  const chosenCounts = talentBranchCounts(game);
  const dominant = [...CLASS_BRANCHES[game.playerClass]].sort((a, b) => cardCounts[b] - cardCounts[a])[0];
  const signatures = game.deckIds.filter((entry) => CARDS[entry.id]?.cat === 'Signature').length;
  const zones = game.deckIds.filter((entry) => CARDS[entry.id]?.keywords?.includes('Zone')).length;
  const duplicateCount = game.deckIds.length - new Set(game.deckIds.map((entry) => entry.id)).size;

  root.innerHTML = `
    <div class="synergy-heading">CURRENT BUILD</div>
    <div class="synergy-row"><b>${dominant.toUpperCase()}</b><br>${cardCounts[dominant]} ${dominant} cards · ${chosenCounts[dominant] || 0} ${dominant} talents</div>
    <div class="synergy-heading">EXACT BUILD TOTALS</div>
    <div class="synergy-row">${signatures} Signature cards</div>
    <div class="synergy-row">${zones} persistent-zone cards</div>
    <div class="synergy-row">${duplicateCount} duplicate ${duplicateCount === 1 ? 'copy' : 'copies'}</div>
    <div class="synergy-heading">ACTIVE INTERACTIONS</div>`;

  const chosen = game.chosenTalents.map((id) => TALENTS[id]).filter(Boolean);
  if (!chosen.length) {
    root.insertAdjacentHTML('beforeend', '<div class="synergy-row">No talent effects selected yet.</div>');
  }
  for (const talent of chosen) {
    root.insertAdjacentHTML('beforeend', `<div class="synergy-row">• ${talent.text}</div>`);
  }
  for (const entry of game.deckIds.filter((card) => (card.lvl || 1) > 1)) {
    root.insertAdjacentHTML('beforeend', `<div class="synergy-row">• ${CARDS[entry.id].name} is Level ${entry.lvl}: ${levelEffect(entry.lvl)}</div>`);
  }
}

const RELIC_CATEGORY_LABELS = {
  combat: 'COMBAT', economy: 'ECONOMY', engine: 'ENGINE', legendary: 'LEGENDARY', class: 'CLASS',
};

function relicRelatedCards(game, relic) {
  const req = RELIC_REQUIREMENTS[relic.id];
  const ids = new Set(req?.anyCards || []);
  if (relic.branch) {
    for (const entry of game.deckIds) {
      const card = CARDS[entry.id];
      if (card && (card.branch === relic.branch || card.secondaryBranch === relic.branch)) ids.add(card.id);
    }
  }
  return [...ids].map((id) => CARDS[id]).filter(Boolean);
}

function renderRelics(game) {
  const root = $('build-relics');
  root.innerHTML = `<div class="build-summary">
    <b>RELICS — ${game.relics.length}</b>
    <span>Class relics ${game.relics.filter((r) => r.category === 'class').length} / 4 · Neutral Legendary ${game.relics.some((r) => r.category === 'legendary') ? '1' : '0'} / 1</span>
  </div>`;
  const categories = ['combat', 'economy', 'engine', 'legendary', 'class'];
  for (const category of categories) {
    const relics = game.relics.filter((r) => r.category === category);
    if (!relics.length) continue;
    const section = document.createElement('section');
    section.className = 'build-branch';
    section.innerHTML = `<h3><span>${RELIC_CATEGORY_LABELS[category]}</span><span>${relics.length}</span></h3>`;
    const grid = document.createElement('div');
    grid.className = 'build-card-grid';
    for (const relic of relics) {
      const ench = game.engine.enchants.find((e) => e.name === relic.name);
      const counter = (ench && ench.counter) || (game.relicState[relic.id] && game.relicState[relic.id].counter);
      const related = relicRelatedCards(game, relic);
      const row = document.createElement('div');
      row.className = 'build-card-row';
      row.innerHTML = `
        <b style="color:${relic.color}">${relic.glyph} ${relic.name}</b>
        <span class="meta">${relic.text}</span>
        ${counter ? `<span class="status">${counter.label} ${counter.value} / ${counter.max}</span>` : ''}
        <span class="meta">Related cards: ${related.length ? related.map((card) => card.name).join(', ') : 'none in deck'}</span>`;
      grid.appendChild(row);
    }
    section.appendChild(grid);
    root.appendChild(section);
  }
  if (!game.relics.length) {
    root.insertAdjacentHTML('beforeend', '<div class="build-card-row meta">No relics acquired yet — boss gates offer a Golden Chest of three.</div>');
  }
}

function renderHistory(game) {
  const root = $('build-history');
  root.innerHTML = '<div class="build-summary"><b>CHOICE HISTORY</b><span>Important run decisions in chronological order.</span></div>';
  if (!game.choiceHistory.length) {
    root.insertAdjacentHTML('beforeend', '<div class="history-row"><time>RUN START</time><span>No post-start choices yet.</span></div>');
    return;
  }
  for (const event of game.choiceHistory) {
    const mins = Math.floor(event.time / 60);
    const secs = String(Math.floor(event.time % 60)).padStart(2, '0');
    root.insertAdjacentHTML('beforeend', `<div class="history-row"><time>${mins}:${secs}</time><span><b>${event.source}</b> — ${event.text}</span></div>`);
  }
}

export function renderBuildBoard(game) {
  const cls = CLASSES[game.playerClass];
  $('build-title').textContent = cls.name.toUpperCase() + ' RUN BUILD';
  renderDeck(game);
  renderTalents(game);
  renderRelics(game);
  renderSynergies(game);
  renderHistory(game);
}

export function selectBuildTab(tab) {
  for (const button of document.querySelectorAll('[data-build-tab]')) {
    button.classList.toggle('selected', button.dataset.buildTab === tab);
  }
  for (const name of ['deck', 'talents', 'relics', 'synergies', 'history']) {
    $('build-' + name).classList.toggle('hidden', name !== tab);
  }
}

export function openBuildBoard(game) {
  renderBuildBoard(game);
  $('build-overlay').classList.remove('hidden');
}

export function closeBuildBoard() {
  $('build-overlay').classList.add('hidden');
}

export function isBuildBoardOpen() {
  return !$('build-overlay').classList.contains('hidden');
}
