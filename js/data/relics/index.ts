import type { RelicDef } from '../types.js';
import { NEUTRAL_RELICS } from './neutral.js';
import { MAGE_RELICS } from './mage.js';
import { WARRIOR_RELICS } from './warrior.js';
import { ROGUE_RELICS } from './rogue.js';
import { NECROMANCER_RELICS } from './necromancer.js';
import { DRUID_RELICS } from './druid.js';
import { WARLOCK_RELICS } from './warlock.js';

// Class relic files (js/data/relics/{mage,warrior,rogue,necromancer,druid,warlock}.ts)
// aggregate the full 72-relic class pool (Phases 4-5). Widened to Record<string,
// RelicDef> (rather than the narrower literal union `satisfies` preserves)
// so consumers don't see "category can never be 'class'"-style errors
// before any class relic exists.
export const RELICS: Record<string, RelicDef> = {
  ...NEUTRAL_RELICS,
  ...MAGE_RELICS,
  ...WARRIOR_RELICS,
  ...ROGUE_RELICS,
  ...NECROMANCER_RELICS,
  ...DRUID_RELICS,
  ...WARLOCK_RELICS,
};
