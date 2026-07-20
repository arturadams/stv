# Arcana Engine

A real-time deckbuilding action roguelite prototype.

> Your deck is alive. Your cards become reality.
> An endless cursed realm; your hero fights on their own — your deck transforms *how*.

You control movement and the Dash. Each class has a **basic attack that is not
a card** — the constant action layer.
The card engine runs itself on top of it:
**Deck → Draw → Queue → Channel / Stay Active → Resolve → Discard → Shuffle.**
Cards are slower, readable combat events, not bullets (see `roadmap.md`).

## Run it

Zero dependencies — any static file server works:

```bash
npm start          # serves on http://localhost:8123
# or: python3 -m http.server 8123
```

Then open http://localhost:8123. (ES modules require a server; opening
`index.html` via `file://` will not work.)

## Controls

| Input | Action |
|---|---|
| WASD / Arrows | Move |
| Space | Dash (i-frames; dodging through an attack = **Perfect Dodge**). Mobility cards (Teleport, Shadowstep, Charge) **overwrite the Dash** for ~8s |
| P / Esc | Pause |
| M | Mute |

## What's in the prototype

- **Fixed starting decks** — every class begins with a curated eight-card
  deck, shown on the setup screen alongside **world selection** (play any
  reached world directly). Decks are capped at 12 cards and two copies.
- **Meta progression** — reaching a world once permanently unlocks its card
  set (localStorage): those cards then have a chance to appear in earlier
  worlds' drafts and shops.
- **6 classes** with distinct basic attacks and mechanics:
  - **Mage** — reliable **Mana**, ritual Signatures, and bolt-enhancing Powers
  - **Warrior** — melee arcs; engagement builds **Rage** for stances and shockwaves
  - **Rogue** — fast knives; crits, traps, poisoned kills, and dodges build **Focus**
  - **Necromancer** — bone shards, grave control, and undead servants; kills build **Souls**
  - **Druid** — feral claws and shapeshifting; close attacks and dodges build **Spirit**
  - **Warlock** — eldritch bolts, curses, and demons; bolt hits and wounds build **Corruption**
- **154 registered data-driven cards**, with a focused **60-card v2 pool**:
  ten enabled cards per class and only three player-facing types—**Power**,
  **Technique**, and **Signature**. Disabled legacy cards remain in source
  while the new resource model is balanced.
- **Worlds** — beating a boss gate opens a portal to the next of five realms.
  World II (**The Ember Wastes**) is fully authored: new biomes, a new boss
  (The Cinder Sovereign), harder enemy mechanics (death-bursts, telegraphed
  artillery, phase-shifting stalkers, chained lunges, summoner elites), and
  a **16-card set that only unlocks there**. Worlds III–V are declared with
  rising threat and reuse World II content until authored.
- **Class-resource economy** — one named 0–10 bar per class, passive income
  in active combat, and additional gains from class-specific play.
- **Infinite procedural map** — chunk-generated, 4 biomes, enemy camps, Flow
  shrines, treasure caches, hazard pools, **boss gates** (sealed arenas with
  relic rewards), ambient pressure scaling with time and distance.
- **Sanctuaries** — warded hearths where enemies can't follow: a merchant
  with a few **seed-randomized** cards to buy (gold ◈ comes from kills,
  camps, caches, bosses, duels), selling, and **combining duplicate cards to
  level them up** (★, up to Lv.3 — more damage, area and duration).
- **Rival soul encounters** (simulated matchmaking) — the realm occasionally
  finds another binder: name, class, and **4 featured cards** shown before you
  choose **Fight** (bounded, telegraphed duel; the winner claims **any of the
  loser's cards**) or **Party Up** (they fight beside you; enemy pressure
  scales). If no rival answers, *a guardian awakens instead* — never a
  waiting screen.
- **Readability layer** — current card plus the next two, card pop on cast,
  power badges with duration bars, channel previews, trap outlines, and
  duel-zone walls.
- **Reward drafts & relics** — drafts are class-focused for synergy (mostly
  your school + some Colorless; other schools only via the Prismatic Codex
  relic or duel spoils); relics from boss gates.
- **Juice** — hitstop, screenshake, slowmo on perfect dodge, floating damage,
  gold-foil legendaries, synthesized WebAudio sound.

## Architecture

```
js/data.js    classes / cards / relics / enemies / biomes — pure data
js/engine.js  the card pipeline: draw, queue, channel, powers, mods, enchants
js/world.js   effect resolver, basic attacks, infinite map, rivals, bosses
js/render.js  canvas renderer: chunk floors, ritual circles, rivals, fx
js/ui.js      DOM HUD: pipeline bar, power badges, drafts, encounter choice
js/audio.js   fully synthesized sfx (no asset files)
js/main.js    loop + input
```

`world.js` touches no DOM, so the entire game simulates headlessly in Node —
the smoke tests in development run full simulations for every class and exercise all 154
cards, both encounter paths (duel & party), the fallback guardian, and a
boss gate, end to end.
