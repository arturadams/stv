# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Arcana Engine** — a real-time deckbuilding action roguelite prototype (despite
the `slayTheVampire` directory/repo name, it is not about vampires). Zero
runtime dependencies, plain ES modules + Canvas2D, currently mid-migration
from vanilla JS to strict TypeScript on the `ts-refactor` branch. See
`README.md` for the player-facing feature list and `roadmap.md` for design
rationale.

## Commands

```bash
npm start              # vite dev server on http://localhost:8123
npm run build           # vite build (static output to dist/)
npm test                 # vitest run (single run)
npm run test:watch      # vitest watch mode
npx vitest run test/combat.test.ts        # run a single test file
npx vitest run -t "test name substring"   # run tests matching a name
npm run typecheck       # tsc --noEmit against tsconfig.json (full tree, DOM lib)
npm run typecheck:sim   # tsc --noEmit against tsconfig.sim.json (js/core, js/data, js/engine, js/sim — NO DOM lib)
npm run lint             # eslint js test
npm run check            # typecheck + typecheck:sim + lint + test — run this (and boot the game) before calling any task done
```

No backend, no database, no auth. `npm start` requires a real server (ES
modules); opening `index.html` via `file://` will not work.

## Architecture

The codebase is being restructured per `REFACTOR_PLAN.md` (read it in full
before doing any structural work — it has numbered tasks R0.0–R4.5, ground
rules, and a dependency graph). The short version of where things stand:

```
js/
  core/        pure engine-agnostic utils: events (typed EventBus), rng (seeded, forkable), ids, math
  data/        pure typed data — cards, classes, relics, enemies, biomes, worlds (barrel: data/index.ts)
    types.ts   the domain model: EffectSpec is a discriminated union over ~22 effect types;
               a malformed card is a compile error on the card's line
    cards/     one file per school (mage/warrior/rogue/colorless) + per-world card sets
  engine.js    CardEngine: Deck → Draw → Queue → Channel → Resolve → Discard → Shuffle.
               Still legacy JS (not yet migrated — see R3.6); world-facing behavior
               (projectiles, enchant actions, previews) is injected via callbacks, not imported
  sim/         the headless simulation — compiled WITHOUT the DOM lib (tsconfig.sim.json enforces this)
    game.ts / update.ts   createGame() / updateGame(): the sim's public facade
    combat.ts, player.ts, basicAttack.ts, fx.ts
    effects/   Strategy registry: one module per effect type (registry.ts + aoe/proj/zone/arc/chain/...)
    ai/        Strategy registry: one module per enemy behavior (registry.ts + chase/ranged/boss/rival/...)
    entities/  projectiles, zones, traps, summons, pickups, telegraphs, cosmetics
    map/       infinite chunk generation
    run/       lifecycle, rewards/drafting, sanctuary economy, matchmaking FSM, meta progression (localStorage)
  world.js     thin re-export shim over sim/* — kept as a stable import path during migration
               (main.js/ui.js/render.js/tests all import from here); has no logic of its own
  data.js      thin re-export shim over data/index.ts, same reason
  render.js, ui.js, audio.js, touch.js   presentation layer — still legacy JS, not yet moved
               under a js/view/ directory (planned in R3.5/R3.7)
  main.js      composition root: rAF loop, input, wires sim + render + ui + audio together
test/
  helpers/headless.ts   makeHeadlessGame()/stepGame() — drives the sim with synthetic input, no DOM
  *.test.ts              smoke, engine, effects, drafting, economy, data, determinism, render-smoke, etc.
```

Key invariants (enforced by tooling, not just convention — do not weaken these):

- **`js/sim/**` must never import from a presentation layer.** ESLint's
  `no-restricted-imports` blocks `**/view/**` imports inside `js/sim`, and
  `tsconfig.sim.json` compiles `core/+data/+engine/+sim/` with no DOM lib —
  a stray `document`/`window`/`AudioContext` reference in sim code fails
  `npm run typecheck:sim`, which is how headlessness is guaranteed.
- **`@typescript-eslint/no-explicit-any` is `error`.** Use `unknown` +
  narrowing. If you must stub something mid-migration, tag it
  `// TODO(T-mig):` with `@ts-expect-error` (see REFACTOR_PLAN.md §4.8).
- **New modules are born `.ts`.** No new `.js` file should be added under
  `js/` — `js/world.js` and `js/data.js` are pre-existing re-export shims,
  not a pattern to extend; `allowJs: true` exists only so not-yet-migrated
  JS can interoperate during the transition.
- **Cards/effects/enemy-behaviors are data + typed registries, not
  switches.** Adding a card never adds bespoke logic — it's a data entry in
  `js/data/cards/*.ts` composed from existing `EffectSpec` variants. Adding
  a new effect type or enemy behavior means adding a module to
  `sim/effects/` or `sim/ai/` and calling `registerEffect`/`registerBehavior`
  — never adding a case to a hand-rolled switch.
- **The sim is deterministic and headless.** `game.rng` is a seeded,
  forkable RNG (`core/rng.ts`) — never call `Math.random()` in `js/sim/` or
  `js/data/`. Because the sim touches no DOM, full runs can be simulated in
  Node (see `test/helpers/headless.ts`); this is the primary way to verify
  gameplay changes without a browser.
- **Behavior-preserving refactors.** Unless a task is explicitly about
  changing gameplay, numbers reaching the player must stay identical before
  and after a refactor — the seeded determinism test is the referee. Resist
  bundling cleanup into extraction/migration commits.

## Testing gotchas

- Card instances in a deck are `{id, lvl}` objects, not plain id strings;
  duplicates combined at a Sanctuary raise `lvl` (up to Lv.3).
- When testing a single card in isolation, disable auto-draw
  (`engine.drawInterval = 1e9`) or resolved cards reshuffle from discard and
  recast indefinitely.
- Meta progression (`js/sim/run/meta.ts`) persists across "runs" even in
  headless tests (in-memory instead of localStorage) — call
  `resetMetaProgress()` before asserting world-gating behavior, since
  earlier tests in the same process may have crossed world portals.
- After a scripted boss kill in a test, stop simulating immediately rather
  than continuing to step the sim — post-fight roaming can wander the
  player into a second boss gate's sealed zone and flake the test.
