# Arcana Engine — Design Change Roadmap

> A premium top-down action roguelite where the player has a reliable basic
> attack, while cards create slower, readable, class-defining combat moments.

Cards do not replace every hit. Cards shape the fight. Every card takes real
time to resolve (channel + active duration + a breath between casts), so the
queue actually accumulates and each "hand" can be read and played around —
strategic, not frantic.

## The new combat rhythm

```text
Move → Basic Attack → Build Flow → Cards Queue → Card Effects Modify Combat
     → Big Casts Resolve → Reposition → Repeat
```

## Card behaviors (the new standard)

| Type            | Timing                          | Example |
|-----------------|---------------------------------|---------|
| Power           | short channel → **4–10s active**, modifies basic attack / stats | Flame Attunement |
| Skill           | 0.5–0.7s channel, fast tactical action | Trap, Shield Wall, Mana Burst |
| Mobility        | not cast at all — **overwrites your Dash (Space) for ~8s** | Teleport, Shadowstep, Charge |
| Sustained Spell | ~1s channel → **2–3s continuous casting** | Arc Lightning, Whirlwind, Fan of Knives |
| AoE Spell       | **1.5–2.5s channel** with rune-circle preview → one big impact | Meteor, Earthquake |
| Trigger         | reacts to events for ~25–30s | Riposte, Toxic Reaction |
| Engine          | manipulates queue / Flow / durations | Extend, Grand Channel |

Readability rules: active card slot, queue highlight, duration bars, card
name display, enlarged card pop on cast, power badges + aura on the player,
and a short gap between resolves so the queue visibly accumulates.
No card resolves in under 0.3s unless it is a modifier/engine.

## Classes

- **Mage** — auto arcane bolt. Attunement Powers transform the bolt (fire /
  frost / storm), sustained channels, big ritual AoEs, Elemental Cycle engine.
- **Warrior** — auto melee arc. **Rage** builds from hitting, taking damage and
  close kills; Rage speeds Warrior card channeling and empowers swings.
- **Rogue** — auto knives. Poison/bleed Powers, ground traps, mobility.
  **Opportunity** (kills, poison kills, perfect dodges, trap triggers) quickens
  Rogue cards and feeds crits.

## World

Infinite procedural map generated in chunks around the player: 4 biomes per
world, enemy camps, Flow shrines, treasure caches, hazard pools, and boss
gates (bounded arena regions with relic rewards). Ambient enemy pressure
scales with run time and distance from the origin.

## Worlds (five realms, increasingly cruel)

Beating **all three boss gates** of a world opens a **timed portal to the
next world** — it counts down (paused during fights), collapses if missed,
and re-manifests near the player so a run is never softlocked. Each world
has its own background/biomes, its own enemy roster with harder mechanics,
its own bosses, and **its own card set per class + Colorless that only
becomes obtainable there** (and is favored in that world's drafts).

| World | Name | Status |
|---|---|---|
| I  | The Sunken Realm | ✅ full — wisps/sentinels/horrors/knights, The Gilded Librarian |
| II | The Ember Wastes | ✅ full — Ember Imps (death-burst), Magma Maws (telegraphed artillery), Ash Stalkers (phase-shift ambush), Cinder Knights (chained lunges), Pyre Custodians (summoner elites); boss: The Cinder Sovereign; 16 new cards (4 per school) |
| III | The Drowned Courts | ✅ full — a drowned aristocracy in pale marble and teal; the tide as a mechanic: Court Sirens (song-pull), Undertow Maws (vortex pits), Brine Motes (death-burst pools), Reef Urchins (rotating spine volleys), Tide Lancers (chained thrusts), Grief Choristers (healers), Tidebound Seneschals (elites); bosses: The Sunless Queen (ballroom-figure patterns), The Undertow Regent (tidewalls with one gap), The Weeping Reliquary (open/sealed shell cycle); brine ground hazards, marine-snow ambience, 16 new cards (4 per school, chill/tide themed) |
| IV | The Hollow Choir | 🔲 declared |
| V  | The Last Arcanum | 🔲 declared |

Threat multiplies per world (×1.9 in II, up to ×5.5 in V) and run
time/kills carry over, so the difficulty curve never resets.

## Run setup & meta progression

Starting a run rolls a **randomized hand: 9 Commons + 1 Uncommon**,
class-focused and guaranteed playable (two Powers, a Spell, a Skill; max 2
copies of a card). Before entering, a setup screen shows the rolled cards
(rerollable) and offers **world selection** — any of the five worlds can be
played directly, no climbing required (for now).

**Meta progression** persists across runs (localStorage): reaching a world
once unlocks its card set forever — its cards then have a reduced *chance*
(×0.3) to appear in earlier worlds' drafts, shops, and even rolled starting
hands. Every school now spans Common → Legendary (new: Arcane Singularity,
Thousand Cuts, Blade Flurry, Worldfire).

## Encounters (simulated multiplayer)

While exploring, the world occasionally *seeks a rival soul*:

- **Found** → a rival binder appears with a name, class and **4 featured
  cards** shown as card previews. Both sides choose **Fight** or **Party Up**
  (party capped at 2).
  - Fight → readable duel inside a bounded duel zone. Telegraphed casts, no
    one-shot chaos. Victory lets you claim **any of the loser's featured
    cards** — the only regular way to obtain off-class cards.
  - Party → the rival fights beside you for a while; enemy pressure scales up.

Card drafts stay class-focused for synergy: mostly your own school, some
Colorless glue, never other schools — unless you carry the **Prismatic
Codex** relic, which opens drafts to every school.

## Sanctuaries (the place to chill)

Warded hearths scattered through the realm — enemies cannot enter and spawns
pause while you rest. Stepping onto the hearth opens the sanctuary:

- **Wandering merchant** — a shop with only a **few cards, seeded per
  sanctuary** (same site always offers the same stock until bought).
  Buy with **gold** (◈), earned from kills, camps, caches, bosses and duels.
- **Deck table** — organize the deck: **sell** cards (never below a playable
  6) or **combine two identical cards into one a level higher** (max Lv.3).
  Levels grant +25% damage, +8% area and +15% durations per star, shown as
  ★ on the card frame.
- Leaving reshuffles the refined deck fresh and the road calls again.
- **Timeout** → no waiting screen: *"No rival soul answered the call. A
  guardian has awakened instead."* — an elite guardian encounter spawns.

## Implementation priorities (status)

1. ✅ Basic attack layer (class bolt / slash / knife — not cards)
2. ✅ Slower card types (Power / Skill / Sustained / AoE / Trigger / Engine)
3. ✅ Active card visibility (active slot, pop, badges, duration bars)
4. ✅ Class mechanics (Attunements, Rage, Opportunity)
5. ✅ Infinite procedural map (chunks, biomes, camps, shrines, boss gates)
6. ✅ Matchmaking encounter (rival souls, featured cards, Fight / Party Up)
7. ✅ Matchmaking fallback boss (guardian awakens on timeout)

## Design warnings (preserved)

Avoid: every hit being a card · instant tiny projectiles as most cards ·
unreadable queue speed · PvP one-shots · placeholder visuals.

Preserve: premium arcane fantasy · card manifestation · channel previews ·
class identity · slower readable card rhythm · infinite exploration ·
emergent co-op / PvP encounters.

> Cards become reality.
