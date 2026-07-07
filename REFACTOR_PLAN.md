# Arcana Engine — Architecture Refactor Plan (TypeScript + Vite)

> A task-mapped plan to restructure the game around SOLID principles and
> explicit design patterns, migrating to **strict TypeScript with Vite**,
> **without changing gameplay behavior**. Each task below is written to be
> executed independently by an agent: it states its goal, the files it
> touches, precise steps, and verifiable acceptance criteria. Execute tasks
> in dependency order (see the graph in §5).

**Decisions (settled — do not relitigate in tasks):**

| Question | Decision |
|---|---|
| TypeScript? | **Yes** — strict TS, migrated module-by-module *during* extraction, so no file is touched twice. New modules are born `.ts` |
| Build tooling | **Vite** (dev server + static build). `typescript`, `vite`, `vitest`, `eslint`, `typescript-eslint` as devDependencies. **Runtime dependencies stay zero** |
| Game framework (Phaser etc.)? | **No.** See §3 for the recorded rationale and the revisit triggers. Nothing framework-shaped may be added by any task |

---

## 1. Current state (audit)

| File | Lines | Role today | Problems |
|---|---|---|---|
| `js/world.js` | 2,131 | God module: game state, effect resolver, combat/damage, statuses, enemy AI (6 behaviors + boss + rival + ally), procedural map, camps/gates/shrines/treasure, run lifecycle, rewards/drafting, sanctuary economy, matchmaking FSM, meta progression (localStorage), player movement, projectiles/zones/traps/summons/pickups, cosmetics | Violates SRP massively; three growth axes (cards, enemies, worlds) all funnel into central switches |
| `js/engine.js` | 352 | Card pipeline (`CardEngine`, `EventBus`) | Good design (callbacks injected by world.js), but internals (`queue`, `flow`, `deck`, `modStack`…) are mutated directly from `world.js` and `ui.js` — invariants leak |
| `js/data.js` | 590 | Pure data: 77 cards, classes, relics, enemies, biomes, worlds | Good (data-driven), but monolithic; nothing validates that data references real effect types / behaviors / events |
| `js/render.js` | 1,071 | Canvas renderer | `drawEnemy` hardcodes a per-enemy-id switch; adding an enemy means editing the renderer |
| `js/ui.js` | 559 | DOM HUD + overlays | Reads engine internals directly; sets `game.engine.uiDirty` through a `window.__game` global |
| `js/audio.js` | 111 | Synthesized SFX | Fine internally — but the *sim* calls `sfx()` 90 times, so "world.js touches no DOM/audio" is only half-true |
| `js/main.js` | 65 | Loop + input | Fine |

Cross-cutting issues:

- **No git history, no tests, no lint, no types.** Any refactor is unprotected.
- **Unseeded randomness everywhere** (55 `Math.random()` sites in world.js, 2 in engine.js) → runs are unreproducible, tests can't be deterministic.
- **Import-time side effects:** `META` reads localStorage when `world.js` is imported; module-level `UID`/`EUID` counters.
- **OCP violations at every growth axis:** new effect type → edit `runEffect` switch (22 cases); new enemy behavior → edit `updateEnemy` if/else chain; new boss → edit `updateBoss`; new enemy visual → edit `drawEnemy` switch. Worlds III–V (roadmap) will multiply all of these.
- **Stringly-typed data.** A card effect like `{ type: 'aoe', r: 150 }` is validated only at runtime, when the card happens to resolve. This is the highest-entropy surface in the repo (77 cards × 22 effect types × per-effect optional fields) and the main argument for TypeScript.

What is already good and must be preserved:

- Cards are **pure data** flowing through one resolver — no bespoke card logic.
- The **engine ↔ world callback seam** (`resolveCard`, `computePreview`, `runEnchantAction`, `classChannelMult`) is real dependency inversion.
- The sim is *almost* headless (no DOM) — this plan makes headlessness a **compile-time guarantee** (§2, `tsconfig.sim.json`).
- Zero runtime dependencies. The deployed artifact remains plain static files (`vite build` output).

---

## 2. Target architecture

```
js/
  main.ts                    entry: composition root, rAF loop, input
  core/                      pure, engine-agnostic utilities
    events.ts                EventBus + typed EventMap + EVT.* constants
    rng.ts                   seedable RNG service (mulberry32, hash2)
    ids.ts                   resettable uid factories
    math.ts                  distToSegment, wrapAngle, clamp, mustGet
  data/                      pure typed data (barrel: data/index.ts)
    types.ts                 CardDef, EffectSpec union, EnemyDef, WorldDef, …
    palette.ts  classes.ts  relics.ts  enemies.ts  biomes.ts  worlds.ts
    validate.ts              cross-reference validation (ids, registry keys)
    cards/
      index.ts  mage.ts  warrior.ts  rogue.ts  colorless.ts  world2.ts
  engine/                    the card pipeline (headless, world-agnostic)
    CardEngine.ts            deck/queue/flow/channel; encapsulated API
    modifiers.ts  powers.ts  enchants.ts
    queueOps.ts              Command registry for queue operations
  sim/                       headless simulation (compiled WITHOUT the DOM lib)
    types.ts                 GameState, PlayerState, entity types, Fx union
    game.ts                  createGame(): state factory + system wiring
    update.ts                updateGame(): orchestrator
    states.ts                State pattern: title/combat/reward/sanctuary/gameover
    tuning.ts                named gameplay constants
    combat.ts                damage, statuses, kills, targeting queries
    player.ts  basicAttack.ts
    fx.ts                    floater/spark/ringFx/shake state helpers
    effects/                 Strategy registry: one module per effect type
      registry.ts  aoe.ts  proj.ts  zone.ts  arc.ts  chain.ts  power.ts
      movement.ts  defense.ts  engineOps.ts  summon.ts  enchantActions.ts
    ai/                      Strategy registry: one module per behavior
      registry.ts  chase.ts  ranged.ts  exploder.ts  stalker.ts  mortar.ts
      lunge.ts  boss.ts (script interpreter)  rival.ts  ally.ts
    entities/
      spawn.ts (EnemyFactory)  projectiles.ts  zones.ts  traps.ts
      sustains.ts  summons.ts  pickups.ts  telegraphs.ts  cosmetics.ts
    map/
      chunks.ts  features.ts
    run/
      lifecycle.ts  rewards.ts  sanctuary.ts  matchmaking.ts  meta.ts
  view/                      presentation (DOM/canvas/WebAudio; DOM lib allowed)
    render/
      index.ts  floor.ts  entities.ts (renderer registry)  player.ts
      fx.ts  overlay.ts
    ui.ts
    audio.ts                 Observer: subscribes to bus events
test/
  smoke.test.ts  engine.test.ts  effects.test.ts  drafting.test.ts
  economy.test.ts  data.test.ts  helpers/headless.ts
tsconfig.json                strict, allowJs during migration, lib ES2022+DOM
tsconfig.sim.json            core+data+engine+sim only, lib ES2022 (NO DOM)
vite.config.ts
```

Patterns applied, and where:

| Pattern | Where | Replaces |
|---|---|---|
| **Strategy (typed registry)** | effect handlers, enchant actions, enemy behaviors, entity renderers | the four big switches |
| **Command (registry)** | `queueOps.ts` | `queueOp` switch in engine |
| **Observer** | audio + UI dirty-flags driven by typed `EventBus` events | 90 inline `sfx()` calls, `window.__game` |
| **State** | game-mode FSM, matchmaking FSM | scattered `game.state` string checks |
| **Factory** | `spawn.ts` EnemyFactory, `makeCard` | ad-hoc object literals |
| **Repository** | `meta.ts` MetaStore with injected storage | import-time localStorage singleton |
| **Dependency Injection** | seeded RNG, bus, storage passed into systems | globals / `Math.random` |
| **Facade** | `game.ts` + `update.ts` keep the 3-function public API (`createGame`, `updateGame`, `render`) | — |

SOLID mapping: SRP → Phase 2 module split; OCP → Phase 3 registries and
data-driven bosses; LSP → uniform typed handler/behavior signatures; ISP →
CardEngine's narrowed public API and read-only UI snapshot; DIP → bus/rng/
storage injection, view depends on sim, never the reverse (enforced by ESLint
`no-restricted-imports` **and** the no-DOM sim tsconfig).

TypeScript leverage points (why the types are load-bearing, not decoration):

- **`EffectSpec` is a discriminated union** over the 22 effect types; a wrong
  key or missing field in a card is a compile error **on the card's line in
  the data file**.
- **Typed registries narrow automatically:**
  `registerEffect('aoe', fn)` gives `fn` the `aoe` variant — no casts.
- **`EventMap` types every bus payload**; a typo'd event name in card/relic
  `on:` data is a compile error.
- **`tsconfig.sim.json` has no DOM lib** — a stray `document`/`window`/
  `AudioContext` in simulation code fails the build, not a code review.

---

## 3. Framework decision (recorded)

**No Phaser (or other game framework). Decided; encode the revisit triggers
in ARCHITECTURE.md (R4.5) and move on.** Summary of the assessment:

- Phaser's value is sprite/atlas batching, asset pipelines, scenes, arcade
  physics, and a sound manager. This game has **no sprites or assets** (100%
  procedural vector drawing), a 12-line loop, bespoke collision that *is* the
  game feel (i-frame grazing = perfect dodge), and fully synthesized audio.
  The benefits mostly don't apply.
- The costs land on this project's two best assets: the **headless Node
  simulation** (Phaser's headless mode is second-class) and the
  **zero-runtime-dependency** property (~1.2 MB+).
- The refactor itself builds the only seam a framework would ever need:
  after R3.5/R3.7, the entire view contract is `render(game, ctx, W, H)` +
  the event bus. Deferring the decision is nearly free.

**Revisit triggers:** sustained < 55 fps on mid hardware with profiling
showing > 60% of frame time in `view/render/`, after cheap wins (dirty-rect
HUD, `OffscreenCanvas`, pre-rendered glyph sprites) are exhausted; or a real
mobile/touch target. If triggered, prefer **PixiJS as a render-only swap of
`view/render/`** (keeps our loop/sim/audio) over a full framework; approach:
timeboxed spike with a written go/no-go report → view adapter behind a
`?renderer=` flag → retire the old renderer after parity.

---

## 4. Ground rules for every task (agents: read first)

1. **Behavior-preserving.** Unless the task says otherwise, gameplay must be
   identical. The seeded smoke tests (R0.3) are the referee.
2. **Run `npm run check` and boot the game** (`npm start`, load, play 30s,
   one card of each category resolves) before declaring a task done.
3. **Zero runtime dependencies.** devDependencies only (`typescript`, `vite`,
   `vitest`, `eslint`, `typescript-eslint`). No framework, no runtime
   polyfills. The deployed artifact is `vite build` output — plain static
   files.
4. **One task = one commit** with the task ID in the message (e.g.
   `R2.3: extract sim/combat.ts`).
5. **Keep compatibility shims** (`js/world.js`, `js/data.js` as re-export
   barrels) until R3.9 removes them; `ui.js`/`render.js` imports keep working
   mid-refactor.
6. **Move, don't rewrite — but extract = convert.** Phase 2 is cut-and-paste
   extraction with import fixes *plus typing*: every module extracted from
   `world.js`/`engine.js` lands as a typed `.ts` file. No separate
   "add types later" pass exists. Resist other improvements while moving —
   they are Phase 3/4 tasks.
7. **No new abstractions beyond the plan.** No ECS, no classes-for-
   everything; plain modules and small typed registries fit this codebase.
8. **`any` is banned** (`@typescript-eslint/no-explicit-any`: error). Unknown
   shapes use `unknown` + narrowing. Temporary migration debt uses
   `// TODO(T-mig):`-tagged `@ts-expect-error`, each burned down in R4.1.
9. **New modules are born `.ts`.** `allowJs: true` lets the not-yet-extracted
   JS interoperate during migration; no new `.js` is written under `js/`
   after R0.1 (the shrinking `world.js`/`data.js` shims are existing files,
   not new code).

---

## 5. Task dependency graph

```
R0.0 → R0.1 → R0.2 → R0.3 → R0.4
                        │
        ┌───────────────┤
     R1.1  R1.2  R1.3  R1.4     (type foundation; parallel)
                  └──→ R1.5 (data layer split + TS conversion)
                        │
R2.1 → R2.2 → R2.3 → R2.4 → R2.5 → R2.6 → R2.7    (sequential: same file)
                                            │
      ┌───────────┬──────────┬──────────┬──┤
    R3.1        R3.2       R3.4       R3.6  R3.8      (parallel)
      │           │
      └──→ R3.3 ←─┘        R3.5 (after R3.1–R3.4)
                           R3.7 (independent, after R2.7)
                           R3.9 (last: remove shims)
                             │
                           R4.1 → R4.2
R4.3 → R4.5;  R4.4 anytime after Phase 3
```

Phase 2 extraction tasks are **sequential** (they all carve the same file).
R1.1–R1.4 and everything in Phase 3 marked parallel can be assigned to
different agents concurrently.

---

## Phase 0 — Safety net & toolchain (blocking; nothing else starts before this)

### R0.0 — Initialize version control
- **Files:** repo root.
- **Do:** `git init`, add a `.gitignore` (`node_modules/`, `dist/`,
  `.DS_Store`), commit the current tree as `baseline: pre-refactor snapshot`.
- **Accept:** `git log` shows the baseline commit; working tree clean.

### R0.1 — Vite + TypeScript toolchain
- **Files:** `package.json`, `vite.config.ts`, `tsconfig.json`,
  `tsconfig.sim.json`, `eslint.config.js`, `index.html`, `test/` (empty dir).
- **Do:**
  1. devDependencies: `typescript`, `vite`, `vitest`, `eslint`,
     `typescript-eslint`. Scripts: `"start": "vite"`, `"build": "vite build"`,
     `"preview": "vite preview"`, `"test": "vitest run"`,
     `"test:watch": "vitest"`, `"typecheck": "tsc --noEmit"`,
     `"typecheck:sim": "tsc -p tsconfig.sim.json --noEmit"`,
     `"lint": "eslint js test"`,
     `"check": "npm run typecheck && npm run typecheck:sim && npm run lint && npm test"`.
  2. `tsconfig.json`: `strict: true`, `target: "ES2022"`, `module: "ESNext"`,
     `moduleResolution: "bundler"`, `allowJs: true`, `checkJs: false`
     (existing JS is checked only as it converts), `noEmit: true` (Vite
     transpiles), `lib: ["ES2022", "DOM"]`. Defer `noUncheckedIndexedAccess`
     to R4.1 (right endpoint, too noisy mid-migration).
  3. `tsconfig.sim.json`: extends base, `lib: ["ES2022"]` (**no DOM**),
     includes `js/core`, `js/data`, `js/engine`, `js/sim`; excludes
     `js/view`, `js/main.ts`. (It matches nothing until Phase 1 lands —
     that's fine.)
  4. `index.html`: keep the entry at `/js/main.js` for now; when `main`
     converts (R3.5) it becomes `/js/main.ts` (Vite resolves TS in dev and
     build).
  5. ESLint: typescript-eslint recommended-type-checked;
     `@typescript-eslint/no-explicit-any`: error; `eqeqeq`;
     `no-restricted-imports` forbidding `js/sim/**` → `js/view/**` (enforced
     from day one, even before the dirs exist).
- **Accept:** `npm start` serves the game exactly as before (still all-JS);
  `npm run build && npm run preview` plays identically; `npm run check`
  green; `dependencies` in package.json absent/empty.

### R0.2 — Seedable randomness + core utils (TS)
- **Files:** new `js/core/rng.ts`, `js/core/ids.ts`, `js/core/math.ts`
  (partial — full math consolidation is R2.1); edits in `js/world.js`,
  `js/engine.js`.
- **Do:**
  1. `core/rng.ts`: move `mulberry32` and `hash2` out of world.js; export
     `makeRng(seed: number): Rng` where
     `interface Rng { float(): number; range(a: number, b: number): number; int(n: number): number; pick<T>(a: readonly T[]): T; chance(p: number): boolean; fork(label: string): Rng }`.
  2. `createGame()` gets `game.rng = makeRng(opts.seed ?? (Math.random()*0x7fffffff|0))`;
     `startRun`/`advanceWorld` re-seed `game.worldSeed` from `game.rng` when
     no explicit seed is given.
  3. Replace **every** `Math.random()` in `js/world.js` (55 sites) with
     `game.rng` calls. Mechanical mapping: `Math.random()` → `rng.float()`;
     `(Math.random()*n|0)` → `rng.int(n)`; `Math.random()<p` →
     `rng.chance(p)`; `arr[(Math.random()*arr.length)|0]` → `rng.pick(arr)`.
  4. `CardEngine` takes `rng` in its constructor (default
     `makeRng(Date.now())` for compat); `shuffleArray` and enchant `chance`
     use it. `createGame` passes `game.rng` in.
  5. `core/ids.ts`: export `makeUidCounter()`; engine card UID and world
     enemy `EUID` become per-game instances, removing module-level mutable
     counters.
  6. Exception: purely cosmetic jitter in `render.js`/`ui.js` may keep
     `Math.random`.
- **Accept:** `grep -c "Math.random" js/world.js js/engine.js` → 0 for both;
  two games created with the same seed and fed identical scripted inputs
  produce identical `kills`, `player.hp`, deck contents after 60 simulated
  seconds (becomes a test in R0.3); `npm run check` green; game plays.

### R0.3 — Headless smoke tests (characterization)
- **Files:** new `test/smoke.test.ts`, `test/helpers/headless.ts`.
- **Depends:** R0.2.
- **Do:** Build a Node harness: `createGame({ seed })`,
  `startRun(game, cls, { world, deck })`, then step
  `updateGame(game, 1/60, scriptedInput)` in a loop. Scripted input:
  random-walk movement from a forked rng, dash every ~2s. **Note:**
  `world.js` currently imports `audio.js` (WebAudio) — `sfx()` no-ops when
  its `ctx` is null, but verify `initAudio` is never called in Node; if any
  import breaks under Node, stub minimally and record it as motivation for
  R3.5. Tests:
  1. **Per class (mage/warrior/rogue):** simulate 180s in world 1 → no
     exception; `kills > 0`; ≥ 5 cards resolved (listen on bus
     `cardResolved`); player either alive or reached `gameover` cleanly.
  2. **Determinism:** same seed + same input script twice → identical
     `{kills, runTime, gold, deckIds}`.
  3. **Boss path:** force-spawn the boss gate (call `engageBossGate` with a
     synthetic landmark), set boss hp to 1, kill it → `bossesSlain === 1`, a
     relic reward offered, portal flag set; `advanceWorld` moves to world 2
     and play continues 30s.
  4. **Encounter paths:** force `foundRival`; choose `fight` → duel zone
     exists, rival enemy spawned; kill rival → spoils reward offered. Fresh
     game: choose `party` → ally exists, expires after `dur`, matchmaking
     returns to idle. Fallback: run `matchmakingFallback` → guardian spawns.
  5. **Sanctuary:** open a synthetic sanctuary; `buyCard` (with enough gold),
     `sellCard` respects the 6-card floor, `combineCards` merges two
     identical cards into lvl 1.
- **Accept:** `npm test` green in Node with no DOM; tests use only public
  exports of `world.js`.

### R0.4 — Engine & rules characterization tests
- **Files:** new `test/engine.test.ts`, `test/drafting.test.ts`,
  `test/economy.test.ts`.
- **Depends:** R0.2 (seeded engine).
- **Do:** Pin current behavior of: draw cadence & queue cap;
  `canAfford`/`collectBuffs` modifier matching (school/cat/tags) and
  consumption counts; flush-mode cost & speed; every `queueOp`
  (`duplicateNext`, `reverse`, `flush`, `echoLast`, `shuffleAll`, `purge`
  refund math); power stacking/refresh + `basicMods()` merge; enchant
  dispatch filters (`status`, `hasStatus`, `school`) and chance; combo/gap
  timing; `rollStartingDeck` guarantees (2 Powers + Spell + Skill of own
  school, 9 Commons + 1 Uncommon, ≤ 2 copies, world-gated pool);
  `draftWeight` rules (own school / Colorless ×0.35 / cross-class only with
  codex ×0.2 / world bleed-down ×0.3 / fresh-set ×1.6); `sellPrice`,
  `CARD_PRICES`, armor cap 60, status stack/duration math in `applyStatus` +
  dot ticking.
- **Accept:** ≥ 25 focused assertions across these areas, all green; these
  tests must **not** be edited by later phases except where a task explicitly
  changes an API (then update call sites only, not expected values).

---

## Phase 1 — Type foundation

Domain types land **before** extraction so every later task lands against
real types instead of retro-typing. R1.1–R1.4 are parallel-safe after R0.4.

### R1.1 — Typed EventBus + event map
- **Files:** new `js/core/events.ts`; edits: `engine.js`, `world.js`.
- **Do:**
  1. Move `EventBus` from engine.js. Define the payload map from the current
     emit sites:
     ```ts
     export interface EventMap {
       cardDrawn: { inst: CardInstance; reason: string };
       cardResolved: { inst: CardInstance; buffs: Buffs };
       cardQueued: { inst: CardInstance };
       channelStart: { inst: CardInstance; dur: number; cost: number };
       deckShuffled: Record<string, never>;
       queueEmpty: Record<string, never>;
       flowGained: { amount: number; source: string };
       comboChanged: { combo: number };
       powerGained: { id: string; school: School };
       powerExpired: { id: string; school: School };
       statusApplied: { enemy: EnemyState; status: StatusName; x: number; y: number };
       enemyKilled: { enemy: EnemyState; x: number; y: number };
       playerHit: { amount: number };
       perfectDodge: Record<string, never>;
       trapTriggered: { x: number; y: number };
       dash: Record<string, never>;
     }
     ```
     (Types it references may be imported from R1.2/R1.3's `data/types.ts`;
     if landing first, declare temporary structural stand-ins and reconcile.)
  2. `class EventBus { on<K extends keyof EventMap>(name: K, fn: (p: EventMap[K]) => void): void; emit<K extends keyof EventMap>(name: K, payload: EventMap[K]): void }`
     — same implementation as today, typed surface. Export
     `EVT` constants object for use from still-JS code.
  3. Card/relic data references events by name (`on: ['powerExpired']`) —
     type that as `(keyof EventMap)[]` in `CardDef`/`RelicDef` so a typo'd
     event name in data is a compile error.
  4. Replace raw-string emits/subscriptions in `engine.js`/`world.js` with
     `EVT.*` references.
- **Accept:** `grep -rn "emit('" js/engine.js js/world.js` → 0 raw-string
  emits; a deliberately wrong payload in a test fails `tsc`; smoke green.

### R1.2 — Card & effect domain types (the crown jewel)
- **Files:** new `js/data/types.ts`.
- **Do:**
  1. Literal unions for the vocabularies:
     `type School = 'Mage' | 'Warrior' | 'Rogue' | 'Colorless'`;
     `type Cat = 'Power' | 'Skill' | 'Spell' | 'Trigger' | 'Engine' | 'Modifier'`;
     `type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary'`;
     `type ElementId = 'fire' | 'frost' | 'lightning' | 'arcane' | 'poison' | 'physical' | 'shadow' | 'gold'`;
     `type StatusName = 'burn' | 'poison' | 'bleed' | 'chill'`;
     `type Targeting = 'none' | 'self' | 'nearest'`;
     `type QueueOpName = 'duplicateNext' | 'reverse' | 'flush' | 'echoLast' | 'shuffleAll' | 'purge'`.
  2. **`EffectSpec` as a discriminated union over `type`** — one variant per
     current `runEffect` case (22): `power`, `sustained`, `trap`,
     `extendPower`, `dashOverride`, `proj`, `aoe`, `zone`, `arc`, `chain`,
     `blink`, `dashAttack`, `armor`, `stabilize`, `draw`, `queueOp`, `mod`,
     `enchant`, `haste`, `flowOverTime`, `mark`, `summon`. Field names and
     optionality transcribed **exactly** from current usage (audit both
     `data.js` and `runEffect` — e.g. `aoe` has optional `freeze`, `stun`,
     `root`, `knockback`, `shake`, `flowPerHit`, `atFacing`). Sub-shapes get
     their own types: `PowerSpec` (basicOverride/arcMult/dmgMult/rateMult/
     extraEvery/addStatus/channelMult/extendOnHit), `MoveSpec`
     (blink/charge), `SustainedDo` (chain/proj/pulse), `EnchantDo` (the 8
     action keys: flow, flowIfNear, draw, nextChannelMult, cycleAttunement,
     burst, counterArc, spreadStatus), `ModBuff`, `ModMatch`,
     `StatusApp = readonly [StatusName, number]`.
  3. `CardDef`, `CardInstance`, `RelicDef`, `Buffs`, `EffectCtx` interfaces
     matching today's shapes (`makeCard`, `collectBuffs`, `resolveCard`).
- **Accept:** compiles standalone with no `any`; R1.5 (data conversion) is
  the fidelity proof of these types.

### R1.3 — Enemy / world domain types
- **Files:** `js/data/types.ts` (continued).
- **Do:** `type BehaviorId = 'chase' | 'ranged' | 'exploder' | 'stalker' | 'mortar' | 'lunge' | 'boss' | 'rival'`;
  `EnemyDef` with the common core (id/name/role/hp/speed/radius/dmg/behavior/
  color/glow/shards) plus optional per-behavior config as it exists today
  (range/fireRate/projSpeed; fuse/boomR; mortarR/mortarTel; lungeRange/
  lungeTel/lungeSpeed/lungeChain; waveEvery/waveR/waveTel/waveDmg;
  summonEvery/summonId; deathBurst; boss/minion; elite/rival flags).
  `EnemyState` for the runtime entity from `spawnEnemy` — behavior scratch
  state (`stalkT`, `summonCd`, `lungeDir`, `bossPhase`, `casting`, …) is
  typed as an `ai?: unknown` slot; each behavior module narrows its own state
  type when R3.2 converts. Also `ClassDef` (with `basic: ArcBasic | ProjBasic`
  discriminated on `kind`), `BiomeDef`, `WorldDef`,
  `BossScript`/`BossPhase`/`BossAttackSpec` (consumed by R3.3), `RivalSoul`,
  `Sanctuary`, `Chunk`, `ZoneRegion`.
- **Accept:** compiles; used by R1.5.

### R1.4 — `GameState` type
- **Files:** new `js/sim/types.ts`.
- **Do:** Type the `createGame()` object literally, field by field:
  `PlayerState`, `Camera`,
  `MatchmakingState` (`state: 'idle' | 'searching' | 'choice' | 'duel' | 'party'`),
  `Banner`,
  `Reward` (`{ type: 'card'; options: CardDef[] } | { type: 'relic'; options: RelicDef[] }`),
  entity types (`Projectile`, `EnemyProjectile`, `Zone`, `Telegraph` — note
  `onDone?: (g: GameState) => void` — `Trap`, `Sustain`, `Summon`, `Pickup`,
  `Particle`, `Floater`, and `Fx` as a discriminated union on `kind`:
  `ring|blast|rectblast|arc|bolt|streak|cast|spawn`), `DashOverride`,
  `StolenCard`, `Ally`. `GameState` composes them plus `bus: EventBus`,
  `engine: CardEngine`, `rng: Rng`, `meta: MetaStore` (post-R3.8).
- **Accept:** compiles; `createGame` returns `GameState` with no casts once
  R2.7 converts.

### R1.5 — Data layer: split `data.js` into typed `js/data/`
- **Files:** new `js/data/` per §2 tree, all `.ts`; `js/data.js` becomes
  `export * from './data/index.ts'` (shim).
- **Depends:** R1.2, R1.3.
- **Do:** Split: `palette.ts` (PALETTE, SCHOOL_COLORS, ELEMENT_COLORS,
  RARITY_COLORS), `classes.ts`, `cards/*.ts` (the `card({...})` calls grouped
  exactly as the current file's banner comments: mage / warrior / rogue /
  colorless / world2; `cards/index.ts` assembles `CARDS`, `CARD_LIST`,
  `ATTUNEMENT_IDS`, `STARTING_DECKS`), `relics.ts`, `enemies.ts`
  (`Record<string, EnemyDef>`), `biomes.ts`, `worlds.ts` (WORLDS + W2
  helpers + RIVAL_ADJECTIVES). **Type the `card()` helper's parameter as
  `CardDef`** (checks every literal without per-card noise); same for the
  other collections. Fix every surfaced type error by **fixing the type, not
  the data** — if a card has a field the type lacks, the R1.2/R1.3
  transcription was incomplete. If a card has a field *nothing reads* (dead
  data), delete it and note it in the commit message.
- **Accept:** `npm run check` green with the data layer fully typed;
  `test/data.test.ts` asserts 77 cards / unique ids; smoke green; **this
  task is the fidelity proof of R1.2/R1.3.**

---

## Phase 2 — Modularization (SRP). Pure extraction, no behavior change.

Every task follows the same recipe: create the new **`.ts`** module(s),
**move** code verbatim and type it as it lands, fix imports, re-export the
moved public names from `js/world.js` so `ui.js`/`render.js`/tests keep
working, run `npm run check`. Tasks are sequential (same source file).

### R2.1 — `core/math.ts` + `sim/fx.ts`
- **Do:** Move `distToSegment`; add `wrapAngle(da)` (the duplicated
  `while (da > PI)…` normalization — replace its 3 inline copies), `clamp`,
  and `mustGet(map, key)` (throws with a useful message; used widely in
  R4.1). Move `floater`, `spark`, `mote`, `ringFx`, `shake` into `sim/fx.ts`
  (they only push to `game.*` arrays — still headless), typed against
  R1.4's `Fx`/`Particle`/`Floater`.
- **Accept:** smoke green; no duplicated angle-wrap loops remain in world.js.

### R2.2 — `sim/map/`: chunks + world features
- **Files:** new `js/sim/map/chunks.ts`, `js/sim/map/features.ts`.
- **Do:** `chunks.ts`: `CHUNK`, `biomeOf`, `getChunk`, `chunksNear`,
  `clampToRegion`, `worldDef`. `features.ts`: `updateWorldFeatures`,
  `campComposition`, `engageCamp`, `campCleared`, `engageBossGate`,
  `bossCleared` (reward calls stay via imports from the world.js shim until
  R2.7). Keep `CHUNK`, `getChunk`, `worldDef`, `biomeOf` re-exported from
  world.js (render.js uses them).
- **Accept:** smoke green; render works in browser (floor draws, camps
  trigger).

### R2.3 — `sim/combat.ts`
- **Do:** Move `STATUS_DEFS` (`Record<StatusName, StatusDef>`),
  `applyStatus`, `damageEnemy`, `killEnemy`, `damagePlayer`, `hitEnemy`
  (option bags typed: `DamageOpts`), `targetable`, `nearestEnemy`,
  `enemiesIn`, `threatOf`, `aimAngle`, `chainFrom`, `spawnPlayerProj`.
  Note the cycle: `killEnemy` calls `duelVictory`/`bossCleared`; break it by
  emitting on the bus instead — `killEnemy` emits `EVT.enemyKilled` and the
  run/matchmaking module subscribes to detect `def.rival`/`def.boss` deaths
  (wire the subscription where `createGame` lives). **This is the one
  permitted behavior-adjacent change in Phase 2** — verify kill ordering with
  the R0.3 boss/duel tests.
- **Accept:** smoke green including boss + duel paths; no imports from
  `run/` inside combat.ts.

### R2.4 — `sim/player.ts` + `sim/basicAttack.ts`
- **Do:** Move `updatePlayer`, `performOverrideDash`, `updateBasicAttack`,
  plus the class-resource helpers (`gainRage`, `gainOpportunity`,
  `classChannelMult`) into `player.ts`.
- **Accept:** smoke green; warrior rage and rogue opportunity tests (add 2
  quick ones if missing) pass.

### R2.5 — `sim/entities/`
- **Files:** new `projectiles.ts`, `zones.ts`, `traps.ts`, `sustains.ts`,
  `summons.ts`, `pickups.ts`, `telegraphs.ts`, `cosmetics.ts` under
  `js/sim/entities/`.
- **Do:** Move the corresponding `updateX` functions verbatim, typed against
  R1.4's entity types.
- **Accept:** smoke green.

### R2.6 — `sim/ai/` (still switch-based) + `sim/entities/spawn.ts`
- **Files:** new `js/sim/entities/spawn.ts` (`spawnEnemy`, `spawnPointNear`,
  per-game EUID), `js/sim/ai/index.ts` (`updateEnemy` with its current
  if/else chain, `touchAttack`, `updateLunger`), `js/sim/ai/boss.ts`
  (`updateBoss`), `js/sim/ai/rival.ts` (`updateRivalDuel`),
  `js/sim/ai/ally.ts` (`updateAlly`), `js/sim/run/spawning.ts`
  (`updateAmbientSpawns`).
- **Accept:** smoke green; world.js no longer contains any enemy logic.

### R2.7 — `sim/run/` + orchestrator; world.js becomes a facade
- **Files:** new `js/sim/run/lifecycle.ts` (`rollStartingDeck`, `prepareRun`,
  `startRun`, `advanceWorld`), `js/sim/run/rewards.ts` (`RARITY_WEIGHT`,
  `draftWeight`, `makeCardReward`, `makeRelicReward`, `offerReward`,
  `applyReward`, `applyRelic`), `js/sim/run/sanctuary.ts` (prices,
  `buildStock`, `openSanctuary`, `buyCard`, `sellCard`, `combineCards`,
  `leaveSanctuary`), `js/sim/run/matchmaking.ts` (mm FSM, rival soul
  creation, duel/party/fallback, `resolveEncounterChoice`, `duelVictory`),
  `js/sim/run/meta.ts` (META load/save/reset — still a module singleton until
  R3.8), `js/sim/game.ts` (`createGame(): GameState` + engine wiring + bus
  subscriptions), `js/sim/update.ts` (`updateGame`, `updateStateLabel`).
- **Do:** After moving, `js/world.js` contains **only** re-exports of the
  public surface consumed by `main.js`, `ui.js`, `render.js`, and tests:
  `createGame`, `updateGame`, `startRun`, `prepareRun`, `applyReward`,
  `resolveEncounterChoice`, `buyCard`, `sellCard`, `combineCards`,
  `leaveSanctuary`, `sellPrice`, `CARD_PRICES`, `MAX_CARD_LVL`, `colorOf`,
  `CHUNK`, `getChunk`, `worldDef`, `biomeOf`, `metaUnlockedWorld`,
  `resetMetaProgress`, `rollStartingDeck`, `advanceWorld`, `floater`.
- **Accept:** `wc -l js/world.js` ≤ 60; `npm run typecheck:sim` now has real
  files to check and passes; full suite green; game fully playable in
  browser (verify: run start, camp, sanctuary, encounter overlay, reward
  overlay).

---

## Phase 3 — Design patterns (OCP / DIP / ISP)

### R3.1 — Effect handler registry (Strategy, typed) — *parallel-safe*
- **Files:** new `js/sim/effects/registry.ts` + handler modules; rewrite of
  `resolveCard`/`runEffect`/`runEnchantAction` dispatch.
- **Do:**
  1. `registry.ts`:
     ```ts
     export function registerEffect<K extends EffectSpec['type']>(
       type: K,
       fn: (game: GameState, eff: Extract<EffectSpec, { type: K }>, ctx: EffectCtx) => void,
     ): void;
     export function resolveEffect(game: GameState, eff: EffectSpec, ctx: EffectCtx): void;
     ```
     Handlers receive the narrowed variant with no casts. Keep a runtime
     throw (`Unknown effect type`) for defense in depth even though the
     compiler prevents it for typed data.
  2. One module per current switch case, grouped: `power.ts` (power,
     extendPower), `aoe.ts`, `proj.ts`, `zone.ts`, `arc.ts`, `chain.ts`,
     `movement.ts` (dashOverride, blink, dashAttack), `defense.ts` (armor,
     stabilize), `engineOps.ts` (draw, queueOp, mod, enchant, haste,
     flowOverTime), `mark.ts`, `summon.ts`, `trap.ts`, `sustained.ts` —
     bodies identical to today's cases.
  3. `effects/enchantActions.ts`: same generic registry pattern keyed by
     `keyof EnchantDo` (flow, flowIfNear, draw, nextChannelMult,
     cycleAttunement, burst, counterArc, spreadStatus); `runEnchantAction`
     iterates spec keys through the registry.
  4. `effects/index.ts` imports all handler modules (registration side
     effect) and exports `resolveCard`, `computePreview`.
  5. Move engine's `queueOp` switch to `engine/queueOps.ts` with the same
     registry shape (Command pattern), keyed by `QueueOpName`:
     `registerQueueOp(name, fn(engine, params))`.
- **Accept:** new `test/effects.test.ts` iterates **all 77 cards** from
  `CARD_LIST`, resolves each card's every effect against a minimal synthetic
  game state with no throw; R0.4 engine tests untouched and green; adding a
  hypothetical effect type in a test (extend union + register + resolve)
  requires zero edits to existing files.

### R3.2 — Enemy behavior registry (Strategy, typed) + EnemyFactory — *parallel-safe*
- **Files:** `js/sim/ai/registry.ts`, split of `ai/index.ts` into `chase.ts`,
  `ranged.ts`, `exploder.ts`, `stalker.ts`, `mortar.ts`, `lunge.ts`;
  `spawn.ts` gains behavior lookup.
- **Do:**
  ```ts
  export function registerBehavior<S>(id: BehaviorId, b: {
    init?: (e: EnemyState, game: GameState) => S;
    update: (game: GameState, e: EnemyState, dt: number, t: BehaviorTickInfo, state: S) => void;
  }): void;
  ```
  where `BehaviorTickInfo = { dist, ux, uy, spd, rooted, p }` (the values
  `updateEnemy` computes today). Each behavior module declares its own
  scratch type (e.g. `interface LungeState { cd: number; dir: Vec2 | null; chainLeft: number; waveCd: number }`)
  — resolving the `ai?: unknown` slot from R1.3 without polluting
  `EnemyState`. `updateEnemy` keeps: status ticks, freeze/stun/root, slow
  factors, knockback, spawn-state, region clamp, sanctuary wards — then
  delegates. Behavior-specific fields currently initialized in `spawnEnemy`
  for all enemies (`lungeCd`, `waveCd`, `strafeT`, `bossAttackT`…) move into
  each behavior's `init`.
- **Accept:** each behavior in its own file;
  `grep -n "'chase'\|'ranged'\|'mortar'" js/sim/ai/index.ts` → 0; smoke
  tests green in both worlds (world 2 exercises stalker/mortar/deathBurst/
  chained lunge — extend the smoke script to run world 2 for 120s if not
  already).

### R3.3 — Data-driven boss scripts
- **Files:** `js/sim/ai/boss.ts` (interpreter), `js/data/enemies.ts` (boss
  script data), `js/data/types.ts` (finalize `BossScript`).
- **Depends:** R3.1 + R3.2.
- **Do:**
  1. Boss script schema in data:
     `script: { phases: [{ hpBelow: 1.0, attackInterval: 4.2, attacks: BossAttackSpec[] }, { hpBelow: 0.5, banner: {…}, attackInterval: 3.4, speedMult: 1.35, misfire: {…}, attacks: […] }] }`.
     `BossAttackSpec` is a discriminated union:
     `{ kind: 'summonRing'; id: string; count: number } | { kind: 'lineSlams'; … } | { kind: 'runeCircles'; … } | { kind: 'cardTheft'; dur: number } | …`
     — authoring a wrong `kind` or field in data is a compile error.
  2. `boss.ts` becomes an interpreter: drift movement (band from data), phase
     transitions on hp thresholds (emit banner), rotate through `attacks`,
     execute each `kind` via a small typed attack registry (same Strategy
     shape as R3.1/R3.2).
  3. Author `librarian` and `sovereign` fully in data; behavior must match
     today (attack order books→pages→runes→theft, phase-2 misfires
     ~60%/attack).
- **Accept:** `updateBoss` contains no boss-id or attack-name branching
  outside the attack registry; a test authors a synthetic third boss purely
  as data and verifies its attacks fire; smoke boss test green.

### R3.4 — Game-state machine + matchmaking FSM — *parallel-safe*
- **Files:** new `js/sim/states.ts`; edits `sim/update.ts`,
  `run/matchmaking.ts`.
- **Do:**
  1. `states.ts`: `const STATES: Record<GameMode, { enter?(g: GameState): void; update?(g: GameState, dt: number, input: Input): void }>`
     for title/combat/reward/sanctuary/gameover. `updateGame` becomes: tick
     `game.time`, delegate to `STATES[game.state]`. All transitions go
     through `setState(game, next)` (single place; emits a state-change event
     for the UI — add it to `EventMap`). `combat.update` is the current body
     of `updateGame`; `encounterPause` becomes an explicit documented
     sub-branch (or a 6th state `encounter` — implementer's choice, but
     transitions must remain: choice → duel|party, reward → combat,
     sanctuary → combat).
  2. Matchmaking: keep `mm.state` (already a literal union via R1.4) but move
     all transitions into named functions in one file with a transition-table
     comment; guard illegal transitions (e.g. `foundRival` while in `duel`)
     with early returns.
- **Accept:** `grep -rn "game.state = " js/sim | grep -v states.ts` → 0;
  smoke tests green; UI overlays still open/close correctly in browser.

### R3.5 — Presentation decoupling: audio & UI as observers; view → TS
- **Files:** `js/view/audio.ts` (moved), all `js/sim/**` files with `sfx(`
  calls, `js/view/ui.ts`, `js/view/render.js` (moved; converts in R3.7),
  `js/main.ts`, `index.html`.
- **Depends:** R3.1–R3.4 (touches many sim files; do it after they
  stabilize).
- **Do:**
  1. Inventory the 90 `sfx()` calls. For each, either an event already exists
     (e.g. `cardResolved`, `perfectDodge`) or add a semantic emit at that
     point: one generic `fx` event in `EventMap` with
     `{ kind: 'blast' | 'slash' | 'zap' | 'boom' | 'tel' | 'lunge' | …; element?: ElementId }`
     — do **not** invent 40 event names.
  2. `audio.ts` exports `initAudio(bus: EventBus)` which subscribes:
     event/kind → recipe. Remove `import { sfx }` from every sim file.
     `main.ts` wires `initAudio(game.bus)` on first keypress as today.
  3. Replace `window.__game` in `ui`: `initUI(game)` already receives the
     game — store it module-locally; delete the global assignment.
  4. Move `render.js`, `ui.js`, `audio.js` under `js/view/`; convert `ui` and
     `audio` to `.ts` (DOM code may use a `mustEl(id)` helper instead of
     scattering non-null assertions). Convert `js/main.js` → `js/main.ts`;
     update `index.html`'s script src.
  5. **Verify the headless gate:** `npm run typecheck:sim` must pass with
     zero DOM types — this is the moment headlessness becomes
     compiler-enforced.
- **Accept:** `grep -rn "sfx(" js/sim js/engine js/core` → 0;
  `grep -rn "__game" js` → 0; `js/sim/**` imports nothing from `js/view/**`
  (ESLint rule already enforces); smoke tests need no audio stub anymore;
  game sounds unchanged in browser (manual spot-check: draw, resolve, dash,
  perfect dodge, boss intro).

### R3.6 — CardEngine encapsulation (ISP) + engine → TS — *parallel-safe*
- **Files:** `js/engine/CardEngine.ts` (converted from `engine.js` as part of
  this task — it is the engine's last big edit), call sites in
  `sim/run/lifecycle.ts`, `sim/ai/boss.ts` (card theft),
  `effects/engineOps.ts`, `enchantActions.ts` (cycleAttunement),
  `run/rewards.ts`, `view/ui.ts`.
- **Do:** Add public methods and migrate the outside mutations to them:
  - `reset(config: { deck: DeckEntry[]; flow?: number; maxFlow?: number })` —
    replaces the field-by-field zeroing in `startRun` (modStack, enchants,
    flowJobs, haste, combo, channelMultGlobal, powerDurMult, sustainedActive,
    drawTimer).
  - `stealFront()` / `returnCard(inst)` — Librarian theft.
  - `enqueueFront(inst)` / `addToDeck(cardId, lvl)` (push + shuffle) —
    cycleAttunement, reward application.
  - `applyRelicStats(stats: RelicStats)` — maxFlow/channelMultGlobal/
    powerDurMult.
  - `snapshot(): EngineSnapshot` — read-only view (`readonly` fields,
    `ReadonlyArray` members): `{ flow, maxFlow, queue, channel, powers,
    enchants, modStack, deckCount, discardCount, gapT, combo }`. UI reads
    only the snapshot (rebuild per `uiDirty`, as today).
- **Accept:** outside `js/engine/`,
  `grep -rn "engine\.\(deck\|discard\|queue\|modStack\|enchants\|flow \?=\|flowJobs\|powers\)" js/sim js/view`
  finds no direct writes (reads via snapshot only in view); R0.4 engine tests
  updated to the new API where constructing state, expected values unchanged;
  smoke green.

### R3.7 — Renderer registry + render split (TS) — *parallel-safe*
- **Files:** `js/view/render/` per §2 tree (all `.ts`); `js/data/enemies.ts`
  gains a `draw` key.
- **Do:** Give each enemy def a `draw` key
  (`'wisp' | 'sentinel' | 'horror' | 'knight' | 'book' | 'librarian' | 'stalker' | 'mortar' | 'generic'`;
  sovereign reuses `librarian`, imp reuses `wisp`-tinted, etc. — match
  today's `drawEnemy` switch exactly; the key is a literal union so data
  can't reference an unregistered renderer). `entities.ts` holds
  `registerEnemyRenderer(key, fn)`; `drawEnemy` becomes a lookup with
  `generic` fallback. Split the rest of render by concern (floor/chunk
  cache, player, fx/particles/floaters, overlay: compass + channel previews
  + region boundary). `render(game, ctx, W, H)` signature unchanged;
  `view/render/index.ts` orchestrates.
- **Accept:** pixel-identical is not required, but every enemy type in both
  worlds visibly renders as before (manual check with a world-2 run); no
  file in `render/` exceeds ~350 lines; new enemy visual = new module +
  `draw` key, zero edits to `entities.ts` dispatch.

### R3.8 — MetaStore repository — *parallel-safe*
- **Files:** `js/sim/run/meta.ts`, `sim/game.ts`, `view/ui.ts` (reset button
  if present), tests.
- **Do:** `export function makeMetaStore(storage: MetaStorage = defaultStorage()): MetaStore`
  with `{ unlockedWorld(): number; recordWorldReached(n: number): void; reset(): void }`;
  `defaultStorage()` returns localStorage when available else an in-memory
  map. `createGame` instantiates and hangs it on `game.meta`;
  `rollStartingDeck`/`draftWeight`/`startRun` take the unlocked world from
  `game.meta`. Delete the import-time `META` singleton and module-level
  `loadMeta()` call. Keep `metaUnlockedWorld`/`resetMetaProgress` exports
  working via lazy default-store fallback (used by ui).
- **Accept:** importing any sim module in Node touches no `localStorage`;
  tests inject a fake store and verify unlock persistence + ×0.3 bleed-down
  drafting; browser meta progression still persists across reloads.

### R3.9 — Remove compatibility shims (final cleanup)
- **Depends:** everything above.
- **Do:** Point `main.ts`, `view/**`, and tests at the real modules
  (`sim/game.ts`, `sim/run/*.ts`, `data/index.ts`, …). Delete the
  `js/world.js` and `js/data.js` shims. Update the README architecture block
  (see R4.5).
- **Accept:** `js/world.js` and `js/data.js` no longer exist; no `.js` files
  remain under `js/`; full suite green; game plays.

---

## Phase 4 — Hardening & developer experience

### R4.1 — Full-strict ratchet
- **Depends:** R3.9.
- **Do:** Set `allowJs: false`; enable `noUncheckedIndexedAccess` and fix the
  fallout (mostly `CARDS[id]`, `ENEMIES[id]`, `Map.get` sites — use
  `mustGet` from R2.1); burn down every `TODO(T-mig)` `@ts-expect-error`;
  attempt `exactOptionalPropertyTypes`, measure the diff, adopt or record
  the decision not to in the commit message.
- **Accept:** `grep -rn "ts-expect-error\|ts-ignore" js` → 0 (or each
  survivor has a written justification comment); both typechecks green; full
  suite + browser playtest green.

### R4.2 — CI gate
- **Do:** `npm run check` already chains typecheck + typecheck:sim + lint +
  test (R0.1); add `vite build` to it (the production build catches
  import-graph mistakes dev mode tolerates). If the repo gets a remote, add a
  GitHub Actions workflow running it on push.
- **Accept:** one command proves the tree healthy; documented in README.

### R4.3 — Data cross-reference validation
- **Files:** `js/data/validate.ts`, `test/data.test.ts`.
- **Do:** The compiler already guarantees shapes and vocabularies; this task
  covers only what types cannot: id uniqueness; `STARTING_DECKS` /
  `summonId` / boss `minion` / world `boss` / `biomes` / `tiers[].id`
  reference existing defs; every `draw` key has a registered renderer (skip
  in Node). Run `validateAll()` as a test only (no boot hook needed).
- **Accept:** intentionally corrupting a cross-reference in a test throws a
  message naming the offending id and field.

### R4.4 — Tuning module
- **Files:** `js/sim/tuning.ts`; edits across sim.
- **Do:** Extract named constants for the scattered literals:
  `ARMOR_CAP = 60`, dash (`DASH_SPEED 640`, `DASH_T 0.22`, `DASH_CD 0.9`,
  iframes), proximity flow (`230`, `2s`, `1`), cull distance `1700`, spawn
  budget formula caps, camp/boss/duel gold (`15/40/30`), heal values,
  magnetism radius `120`, combo window `4`, resolve gap `0.55`, threat
  formula divisors (`55/50/3800`), rage/opportunity gains. Reference them
  from one import. **Do not change values.**
- **Accept:** the listed literals appear only in `tuning.ts` (grep
  spot-checks); the R0.3 determinism test is unchanged (same seed → same
  result proves values didn't drift).

### R4.5 — Documentation
- **Files:** `README.md`, new `ARCHITECTURE.md`, new `CONTRIBUTING.md`.
- **Do:** Update README's architecture block and run instructions (`npm
  start` = Vite dev; `npm run build` for deploy). `ARCHITECTURE.md`: layer
  diagram (core → data → engine → sim → view), the typed event catalog
  (every `EventMap` entry with payload shape and emit sites), the registries
  and their extension points, the determinism/seeding contract, the no-DOM
  sim guarantee, **and the framework decision from §3 with its revisit
  triggers**. `CONTRIBUTING.md` cookbook with exact recipes: **add a card**
  (data only — the compiler guides fields), **add an effect type** (extend
  `EffectSpec` union + handler module + register), **add an enemy** (data +
  optional behavior + optional renderer), **add a boss** (data script only),
  **add a world** (data only), **add a sound** (event mapping in audio).
- **Accept:** a reviewer can add a "World III enemy + card" following only
  the cookbook, touching zero central dispatch files.

---

## 6. Milestone checkpoints

| After | You have |
|---|---|
| Phase 0 | Git history, Vite + strict-TS toolchain, deterministic seeded sim, a test suite that locks current behavior — refactoring is now safe |
| Phase 1 | The full domain model as types; the data layer typed and split — card/effect/enemy typos now die at compile time |
| Phase 2 | No file over ~400 lines; every subsystem has a home; world.js is a facade; `typecheck:sim` guards a real module tree |
| Phase 3 | New cards/effects/enemies/bosses/renderers are **additive** (typed registries); sim is compiler-provably headless; engine internals are sealed; presentation is event-driven |
| Phase 4 | Full strict mode, one-command CI gate, cross-reference validation, named constants, and the cookbook makes Worlds III–V content work data-only |

Estimated relative effort (S < 0.5 day, M ≈ 1 day, L ≈ 2 days for one agent):
R0.0 S · R0.1 M · R0.2 M · R0.3 L · R0.4 M ·
R1.1 S · R1.2 L · R1.3 M · R1.4 M · R1.5 M ·
R2.1 S · R2.2 M · R2.3 M · R2.4 S · R2.5 S · R2.6 M · R2.7 L ·
R3.1 L · R3.2 M · R3.3 L · R3.4 M · R3.5 L · R3.6 M · R3.7 M · R3.8 S · R3.9 S ·
R4.1 M · R4.2 S · R4.3 S · R4.4 S · R4.5 M

## 7. Explicit non-goals

- **No game framework** (Phaser, Pixi, etc.) — decided; see §3 for the
  rationale and revisit triggers. No task may add one.
- **No ECS rewrite** — the plain-object + systems style fits the game's
  size; typed registries give the extensibility without the ceremony.
- **No runtime dependencies** — TS/Vite/Vitest/ESLint are devDependencies;
  the shipped artifact is static files.
- **No gameplay/balance changes** — every number that reaches the player is
  identical before and after (the determinism test is the proof).
- **No premature multiplayer abstraction** — rivals stay simulated; the
  matchmaking FSM cleanup (R3.4) is enough of a seam if real networking ever
  comes.
