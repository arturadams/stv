import { CARDS, CLASS_BRANCHES, TALENTS, TALENT_LIST } from '../../data/index.js';
import type { CardDef, TalentDefinition } from '../../data/types.js';
import type { ChoiceHistoryEvent, GameState } from '../types.js';

export function recordChoice(game: GameState, source: string, text: string): ChoiceHistoryEvent {
  const event = { time: game.runTime, level: game.runLevel, source, text };
  game.choiceHistory.push(event);
  game.uiDirty = true;
  return event;
}

export function branchCounts(game: Pick<GameState, 'playerClass' | 'deckIds'>): Record<string, number> {
  const branches = CLASS_BRANCHES[game.playerClass];
  const counts: Record<string, number> = Object.fromEntries(branches.map((branch) => [branch, 0]));
  for (const entry of game.deckIds) {
    const card = CARDS[entry.id];
    if (!card) continue;
    for (const branch of branches) {
      if (card.branch === branch || card.secondaryBranch === branch || card.keywords?.includes(branch)) {
        counts[branch] += 1;
      }
    }
  }
  return counts;
}

function unchosen(game: GameState, branch: string): TalentDefinition[] {
  return TALENT_LIST.filter((talent) =>
    talent.classId === game.playerClass &&
    talent.branch === branch &&
    !game.chosenTalents.includes(talent.id));
}

export function makeTalentOffer(game: GameState): TalentDefinition[] {
  const branches = CLASS_BRANCHES[game.playerClass];
  const counts = branchCounts(game);
  const dominant = [...branches].sort((a, b) => counts[b] - counts[a])[0];
  const options: TalentDefinition[] = [];

  const dominantTalent = unchosen(game, dominant)[0];
  if (dominantTalent) options.push(dominantTalent);

  const alternatives = branches
    .filter((branch) => branch !== dominant)
    .flatMap((branch) => unchosen(game, branch));
  if (alternatives.length) options.push(game.rng.pick(alternatives));

  const general = unchosen(game, 'General')[0];
  if (general) options.push(general);

  if (options.length < 3) {
    for (const talent of TALENT_LIST) {
      if (talent.classId !== game.playerClass || game.chosenTalents.includes(talent.id) || options.includes(talent)) continue;
      options.push(talent);
      if (options.length >= 3) break;
    }
  }
  return options;
}

export function offerTalentChoice(game: GameState): boolean {
  if (game.pendingTalentOptions || game.state !== 'combat') return false;
  const options = makeTalentOffer(game);
  if (!options.length) return false;
  game.pendingTalentOptions = options;
  for (const option of options) if (!game.offeredTalents.includes(option.id)) game.offeredTalents.push(option.id);
  game.state = 'talent';
  game.uiDirty = true;
  return true;
}

export function gainRunXp(game: GameState, amount = 1): void {
  game.runXp += amount;
  if (game.runXp < game.nextLevelXp || game.state !== 'combat') return;
  game.runXp -= game.nextLevelXp;
  game.runLevel += 1;
  game.nextLevelXp = 12 + game.runLevel * 4;
  offerTalentChoice(game);
}

export function chooseTalent(game: GameState, id: string): boolean {
  const talent = game.pendingTalentOptions?.find((option) => option.id === id);
  if (!talent) return false;
  game.chosenTalents.push(talent.id);
  if (talent.effect.maxHealth) {
    game.player.maxHp += talent.effect.maxHealth;
    game.player.hp += talent.effect.maxHealth;
  }
  recordChoice(game, 'Level ' + game.runLevel, 'Chose ' + talent.name);
  game.pendingTalentOptions = null;
  game.state = 'combat';
  game.uiDirty = true;
  return true;
}

function cardMatchesTalent(card: CardDef, talent: TalentDefinition): boolean {
  const keywords = card.keywords || card.tags;
  return talent.keywords.some((keyword) =>
    card.branch === keyword || card.secondaryBranch === keyword || keywords.includes(keyword));
}

export function talentDamageMultiplier(game: Pick<GameState, 'chosenTalents'>, card: CardDef): number {
  let multiplier = 1;
  for (const id of game.chosenTalents) {
    const talent = TALENTS[id];
    if (talent?.effect.cardDamageMult && cardMatchesTalent(card, talent)) {
      multiplier *= talent.effect.cardDamageMult;
    }
  }
  return multiplier;
}

export function talentStatusBonuses(
  game: Pick<GameState, 'chosenTalents'>,
  card: CardDef,
): Array<readonly ['burn' | 'poison' | 'bleed' | 'chill', number]> {
  const bonuses: Array<readonly ['burn' | 'poison' | 'bleed' | 'chill', number]> = [];
  for (const id of game.chosenTalents) {
    const talent = TALENTS[id];
    if (talent?.effect.statusBonus && cardMatchesTalent(card, talent)) bonuses.push(talent.effect.statusBonus);
  }
  return bonuses;
}
