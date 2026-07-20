import { CARDS, CLASS_BRANCHES, TALENTS, TALENT_LIST } from './data.js';
import { canReplaceCard, replaceRewardCard } from './world.js';

function branchCount(game, branch) {
  return game.deckIds.filter((entry) => {
    const card = CARDS[entry.id];
    return card?.branch === branch || card?.secondaryBranch === branch || card?.keywords?.includes(branch);
  }).length;
}

function averageCost(entries) {
  return entries.reduce((sum, entry) => sum + (CARDS[entry.id]?.cost || 0), 0) / Math.max(1, entries.length);
}

export function buildDraftContext(game, card) {
  const box = document.createElement('div');
  box.className = 'draft-build-context';
  const branches = CLASS_BRANCHES[game.playerClass];
  const related = TALENT_LIST.filter((talent) =>
    game.chosenTalents.includes(talent.id) &&
    talent.keywords.some((keyword) => card.keywords?.includes(keyword) || card.branch === keyword));
  const copies = game.deckIds.filter((entry) => entry.id === card.id);
  const currentCount = branchCount(game, card.branch);
  box.innerHTML = `
    <b>YOUR BUILD</b><br>
    ${card.branch}: ${currentCount} cards · ${game.chosenTalents.filter((id) => TALENTS[id]?.branch === card.branch).length} talents<br>
    Deck: ${game.deckIds.length} / 12 · Average cost: ${averageCost(game.deckIds).toFixed(2)}<br>
    Duplicate count: ${copies.length} / 2 · Card level: ${copies[0]?.lvl || 1}<br>
    Affected by: ${related.length ? related.map((talent) => '✓ ' + talent.name).join(' · ') : 'No active talents'}<br>
    ${branches.includes(card.branch) && currentCount === 0 ? 'NEW SYNERGY: enables the ' + card.branch + ' branch' : 'Adds to an existing branch'}`;
  return box;
}

export function renderReplacementPicker(container, heading, game, card, onComplete) {
  const oldAverage = averageCost(game.deckIds);
  const oldBranch = branchCount(game, card.branch);
  heading.textContent = 'ADDING ' + card.name.toUpperCase() + ' — CHOOSE A CARD TO REPLACE';
  container.innerHTML = `<div class="draft-build-context">
    <b>REPLACEMENT PREVIEW</b><br>
    ${card.branch} cards: ${oldBranch} → ${oldBranch + 1}<br>
    Current average cost: ${oldAverage.toFixed(2)}<br>
    Persistent zones: ${game.deckIds.filter((entry) => CARDS[entry.id]?.keywords?.includes('Zone')).length}
      → ${game.deckIds.filter((entry) => CARDS[entry.id]?.keywords?.includes('Zone')).length + (card.keywords?.includes('Zone') ? 1 : 0)}<br>
    Deck size: 12 / 12
  </div><h3 class="replace-heading">CHOOSE A CARD TO REPLACE</h3>`;
  const list = document.createElement('div');
  list.className = 'replace-list';
  game.deckIds.forEach((entry, index) => {
    const existing = CARDS[entry.id];
    const button = document.createElement('button');
    button.className = 'replace-choice';
    const nextEntries = game.deckIds.map((candidate, candidateIndex) =>
      candidateIndex === index ? { id: card.id, lvl: 1 } : candidate);
    button.innerHTML = `<b>${existing.name}</b><br><span class="meta">${existing.branch} · Cost ${existing.cost} · Lv.${entry.lvl || 1}<br>
      Average cost ${oldAverage.toFixed(2)} → ${averageCost(nextEntries).toFixed(2)}</span>`;
    button.disabled = !canReplaceCard(game.deckIds, card.id, index);
    button.addEventListener('click', () => {
      if (replaceRewardCard(game, card, index)) onComplete();
    });
    list.appendChild(button);
  });
  container.appendChild(list);
}
