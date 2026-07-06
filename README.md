# Arcana Engine

A real-time deckbuilding action roguelite prototype.

> Your deck is alive. Your cards become reality.
> You are surviving inside the magical machine you built.

You control only movement and dashing. The card engine runs itself:
**Deck → Draw → Queue → Channel → Resolve → Discard → Shuffle.**
While a spell channels, its ritual circle is previewed in the arena — kite
enemies into the circle before the clock hits 100%. That is the game.

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
| Space | Dash (i-frames; dodging through an attack = **Perfect Dodge**, +2 Flow) |
| P / Esc | Pause |
| M | Mute |

## What's in the vertical slice

- **56 data-driven cards** — 14 per school (Mage, Warrior, Rogue, Colorless),
  built entirely from composable effect components (`proj`, `aoe`, `zone`,
  `arc`, `chain`, `mod`, `enchant`, `queueOp`, `summon`, …). No card has
  bespoke logic.
- **Flow economy** — gained from shards, perfect dodges, staying near danger,
  combo chains, shrines, and certain cards/relics. Drawing never grants Flow,
  so draw engines increase consistency, not throughput.
- **Queue manipulation** — Duplicate, Reverse, Flush, Purge, Echo, Grand Flush,
  modifier stacking (Overload, Ritual Circle, Battle Cry…), trigger enchants
  (Pyromancy, Toxic Reaction, Momentum, Riposte…).
- **Channel previews** — locked-position ritual circles with rotating runes and
  a clock-style progress arc; projectile casts show a tracking reticle.
- **3 encounters in the Astral Library** — ink pools that slow, Flow shrines,
  broken pillars, candle clusters, an astral void full of drifting bookshelves.
- **7 enemy types** — Ink Wisps, Glyph Sentinels, Tome Horrors (exploders),
  Cursed Knights (telegraphed lunges), the Gilded Custodian elite (shockwave
  rings), cursed books, and…
- **The Gilded Librarian** — boss with chasing books, page-slam rectangles,
  rune-circle barrages, *card theft from your queue*, and a phase-two misfire
  mode.
- **Reward drafts & relics** — card draft after each encounter, relic draft
  before the boss; 6 relics (Golden Quill, Ember Seal, Astral Battery, …).
- **Juice** — hitstop, screenshake, slowmo on perfect dodge, floating damage,
  card-enter animations, gold-foil legendaries, synthesized WebAudio sound.

## Architecture

```
js/data.js    cards / relics / enemies / encounters — pure data
js/engine.js  the card pipeline: draw, queue, channel, resolve, mods, enchants
js/world.js   effect resolver, enemies, boss AI, statuses, waves, pickups
js/render.js  canvas renderer: arena, silhouettes, ritual circles, fx
js/ui.js      DOM HUD: pipeline bar, card frames, drafts, tooltips
js/audio.js   fully synthesized sfx (no asset files)
js/main.js    loop + input
```

`world.js` touches no DOM, so the entire game can be simulated headlessly in
Node — the smoke tests in development ran full runs (start → boss → victory)
and exercised all 56 cards through the resolver.
