# Arcana Engine — Card Library and Resource System Rebuild

**Status:** Draft proposal  
**Scope:** Core card system, class resources, starting decks, and HUD presentation  
**Priority:** P0 — Core gameplay foundation  
**Working version:** Card System v2

---

## 1. Summary

This proposal rebuilds Arcana Engine's card library and resource economy around three principles:

1. Cards should visibly affect the character or battlefield.
2. Each class should have a distinct relationship with its cards.
3. The automatic card engine should remain active during every combat scenario, including bosses and one-versus-one duels.

The current queue and engine manipulation mechanics create too much cognitive load during real-time combat. Effects such as drawing, copying, shuffling, purging, repeating, accelerating, and modifying future cards require the player to monitor an automatic system they cannot directly control.

The new system removes most player-facing queue manipulation and reduces the initial library to 60 focused cards:

- 10 Mage cards
- 10 Warrior cards
- 10 Rogue cards
- 10 Necromancer cards
- 10 Druid cards
- 10 Warlock cards
- No Colorless cards in the initial prototype
- No card-draw or queue-manipulation cards

The automatic deck remains central to the game, but cards now focus on combat outcomes rather than card-system administration.

---

## 2. Problems Being Addressed

### 2.1 Resource starvation during duels

The existing Flow economy performs better against enemy groups than against bosses or rival players.

Group combat provides:

- Frequent kills
- Shard pickups
- Multiple targets
- Easier proximity income
- More opportunities for card-generated resource

Duels remove many of these sources. When both characters are moving and dodging, cards may resolve too slowly, especially when attacks miss.

This produces a negative loop:

> Low resource → fewer cards → fewer resource-generating effects → slower combat

A class, especially the Mage, should not stop casting because its automatic projectiles missed a moving target.

### 2.2 Queue manipulation is difficult to understand during combat

The player currently needs to understand concepts such as:

- Queue order
- Queue blocking
- Draw timing
- Discard state
- Reshuffling
- Copying future cards
- Repeating previous cards
- Modifying the next card
- Purging blocked cards
- Channel-speed modifications

These systems may support deep deck construction, but they are difficult to interpret while the player is simultaneously:

- Moving
- Dodging
- Reading enemy telegraphs
- Watching active effects
- Tracking health and resources
- Positioning large spells

The card engine should create strategic depth between encounters and visible consequences during encounters. It should not require continuous card-pipeline administration.

### 2.3 Class identity is diluted

All classes currently use the same primary casting resource while Warrior and Rogue also maintain additional class mechanics.

This creates overlapping identities:

- Mage has Flow and Attunements.
- Warrior has Flow and Rage.
- Rogue has Flow and Opportunity.

The rebuild gives each class one clearly named primary card resource.

### 2.4 The card library is too broad before the core model is proven

The current library contains many cards, but several effects overlap or exist mainly to manipulate the card engine.

The rebuild prioritizes a smaller set where every card has:

- A clear visual result
- A recognizable class purpose
- A useful role in a build
- Value in both group combat and duels
- Minimal dependency on hidden sequencing rules

---

## 3. Design Goals

### Primary goals

- Keep the autonomous deck as the game's central hook.
- Ensure cards continue resolving during boss and rival encounters.
- Make the Mage primarily powerful through spells.
- Make the Warrior primarily powerful through direct combat pressure.
- Make the Rogue primarily powerful through precision and setup.
- Make the Necromancer primarily powerful through kills, control, and summons.
- Make the Druid primarily powerful through close combat, forms, and battlefield control.
- Make the Warlock primarily powerful through ranged pressure, curses, and dangerous positioning.
- Reduce the amount of card-system information shown during combat.
- Make builds recognizable from battlefield behavior.
- Ensure every card can be understood from a short description and visible effect.

### Secondary goals

- Reduce the initial balance surface.
- Make class onboarding easier.
- Make card drafts easier to evaluate.
- Make resource generation predictable.
- Preserve room for future relic and world-based complexity.

### Non-goals

This proposal does not initially redesign:

- Enemy rosters
- Boss movesets
- World structure
- Sanctuaries
- Rival matchmaking
- Meta-progression
- Relic acquisition
- Status-effect visuals

Those systems may require follow-up adjustments after the new cards and resources are playable.

---

## 4. New Core Design Rule

> Cards change the character or the battlefield. They do not manipulate other cards.

Normal cards should not refer to:

- Drawing cards
- Queue positions
- The next card
- The previous card
- Copying cards
- Repeating cards
- Shuffling
- Discarding
- Purging
- Flushing the queue
- Changing another card's channel time
- Changing another card's Flow cost

Some of these mechanics may return later as rare relic effects because relics are selected outside active combat and remain continuously active.

---

## 5. New Player-Facing Card Types

The initial rebuild uses only three player-facing card types.

### 5.1 Power

A temporary character state that lasts approximately 8–12 seconds.

Examples:

- Cleaving Stance
- Poisoned Blades
- Arcane Mirror
- Blood Rage

Powers should visibly alter how the character behaves.

### 5.2 Technique

A fast defensive, mobility, setup, or targeted action.

Examples:

- Teleport
- Iron Skin
- Charge
- Shadowstep
- Springblade Trap

Techniques should usually resolve quickly and have an immediately understandable result.

### 5.3 Signature

A major offensive or control event with a strong visual identity.

Examples:

- Frost Nova
- Meteor
- Whirlwind
- Fan of Knives
- Earthquake

Signatures may use longer channels and larger telegraphs.

### Internal implementation

The game may continue to distinguish effects internally, including:

- Area effect
- Sustained effect
- Summon
- Projectile
- Triggered reaction
- Dash replacement

These distinctions do not need to be presented as separate card categories.

---

## 6. Class Resource Rebuild

Each class receives one primary card resource.

| Class | Resource | Identity |
|---|---|---|
| Mage | Mana | Reliable regeneration and powerful spells |
| Warrior | Rage | Generated through aggressive close combat |
| Rogue | Focus | Generated through precision, traps, and dodges |
| Necromancer | Souls | Reliable regeneration accelerated by kills |
| Druid | Spirit | Reliable regeneration accelerated by close combat |
| Warlock | Corruption | Reliable regeneration accelerated by bolt hits and suffered wounds |

All resources use a 0–10 scale for UI consistency.

Each class receives passive resource generation during active combat. Skillful class play accelerates resource generation but is not required for the card engine to function.

### Global resource rule

> Passive generation keeps the engine moving. Class performance makes it accelerate.

### Active combat definition

Passive regeneration is active when at least one condition is true:

- A boss encounter is active.
- A rival duel is active.
- An enemy is targeting the player.
- The player has dealt or received damage during the previous five seconds.
- A hostile enemy is within the active combat radius.

Resource regeneration should stop while the player is fully safe and disengaged.

---

## 7. Mage Rebuild

### 7.1 Mage identity

> The Mage has a weaker automatic attack but the strongest and most reliable card casting.

The Mage should feel incomplete without spells. Its basic attack is useful for:

- Finishing weak enemies
- Selecting targets
- Applying occasional pressure
- Accelerating Mana when attacks connect

The basic attack must not be the Mage's primary damage source.

### 7.2 Proposed Mage statistics

| Property | Proposed value |
|---|---:|
| Basic attack damage | 4 |
| Basic attack interval | 0.60 seconds |
| Maximum Mana | 10 |
| Starting Mana | 6 |
| Passive Mana generation | +1 every 1.1 seconds during combat |
| Basic attack bonus | Every fourth successful bolt grants +1 Mana |
| Perfect dodge | +2 Mana |

Missing basic attacks does not interrupt passive Mana regeneration.

### 7.3 Mage combat loop

> Regenerate Mana → cast a powerful spell → reposition enemies → cast another spell

The Mage should cast reliably in duels even when its bolts miss.

Accurate attacks and perfect dodges increase casting frequency, but they are bonuses rather than requirements.

### 7.4 Mage card composition

Target composition:

- 60–70% Signatures
- 10–20% Techniques
- No more than 20% basic-attack Powers

Attunements should be a secondary Mage archetype rather than the class's primary card identity.

---

## 8. Warrior Rebuild

### 8.1 Warrior identity

> The Warrior has the strongest direct combat presence and generates Rage by staying engaged.

Warrior cards should feel like martial actions rather than magical spells.

### 8.2 Proposed Warrior statistics

| Property | Proposed value |
|---|---:|
| Maximum Rage | 10 |
| Starting Rage | 3 |
| Passive Rage generation | +1 every 2.5 seconds during combat |
| Melee generation | +1 after three successful melee swings |
| Armor block | +1 Rage, maximum once every 1.5 seconds |
| Taking health damage | +1 Rage, maximum once every 2 seconds |
| Perfect dodge | +1 Rage |

Rage should not decay during active combat in the first prototype.

A later test may reintroduce decay outside combat or after extended disengagement.

### 8.3 Warrior combat loop

> Engage → build Rage → activate a stance or defense → release a heavy attack

The Warrior casts slowly while avoiding all interaction but accelerates significantly while fighting at close range.

---

## 9. Rogue Rebuild

### 9.1 Rogue identity

> The Rogue uses a reliable Focus baseline and accelerates through precision and preparation.

The existing Opportunity system is removed from the initial prototype to avoid managing two related resources.

### 9.2 Proposed Rogue statistics

| Property | Proposed value |
|---|---:|
| Maximum Focus | 10 |
| Starting Focus | 4 |
| Passive Focus generation | +1 every 1.7 seconds during combat |
| Critical hit | +1 Focus, maximum once every 2 seconds |
| Perfect dodge | +2 Focus |
| Trap activation | +1 Focus |
| Poisoned enemy kill | +1 Focus |

### 9.3 Rogue combat loop

> Prepare an opening → dodge or trap → gain Focus → execute a burst → reposition

The Rogue should have a more irregular casting rhythm than the Mage but more reliable access than the Warrior when avoiding direct contact.

---

## 9A. Necromancer Rebuild

### 9A.1 Necromancer identity

> The Necromancer turns defeated enemies into momentum and uses that momentum to control space or build an undead army.

Souls are a casting resource, not a second consumable layered over the card engine. Kills accelerate the resource bar but passive generation keeps the class functional against bosses.

### 9A.2 Proposed Necromancer statistics

| Property | Proposed value |
|---|---:|
| Basic attack damage | 7 |
| Basic attack interval | 0.62 seconds |
| Maximum Souls | 10 |
| Starting Souls | 4 |
| Passive Souls generation | +1 every 1.9 seconds during combat |
| Enemy kill | +1 Soul |
| Perfect dodge | +1 Soul |

### 9A.3 Necromancer combat loop

> Control a group → secure kills → gain Souls → summon allies or occupy more ground

The class should gain a noticeable cadence advantage in swarms without becoming unable to cast in a single-target encounter.

---

## 9B. Druid Rebuild

### 9B.1 Druid identity

> The Druid alternates between feral close combat, resilient forms, and large natural effects.

Spirit rewards landing claws and precise dodges. It remains the only Druid resource; forms do not create a second meter.

### 9B.2 Proposed Druid statistics

| Property | Proposed value |
|---|---:|
| Basic attack damage | 9 |
| Basic attack interval | 0.70 seconds |
| Maximum Spirit | 10 |
| Starting Spirit | 5 |
| Passive Spirit generation | +1 every 1.6 seconds during combat |
| Melee generation | +1 after three successful claw hits |
| Perfect dodge | +2 Spirit |

### 9B.3 Druid combat loop

> Enter melee in the right form → build Spirit → root or scatter a group → recover and re-engage

The Druid should have a steady baseline with a clear reward for accepting melee risk.

---

## 9C. Warlock Rebuild

### 9C.1 Warlock identity

> The Warlock maintains ranged pressure and gains Corruption faster by landing bolts or surviving danger.

Corruption is a normal 0–10 casting resource. The former 0–100 buildup, passive card-damage multiplier, channel multiplier, and automatic backlash are removed.

### 9C.2 Proposed Warlock statistics

| Property | Proposed value |
|---|---:|
| Basic attack damage | 8 |
| Basic attack interval | 0.72 seconds |
| Maximum Corruption | 10 |
| Starting Corruption | 4 |
| Passive Corruption generation | +1 every 1.9 seconds during combat |
| Basic attack bonus | Every fourth successful bolt grants +1 Corruption |
| Taking health damage | +1 Corruption, maximum once every 2 seconds |
| Perfect dodge | +1 Corruption |

### 9C.3 Warlock combat loop

> Apply ranged pressure → gain Corruption → establish a curse or burning zone → survive while it works

The Warlock receives a reward for dangerous play without requiring self-damage or a punitive resource reset.

---

## 10. Simplified Deck Rules

### 10.1 Starting deck

Each class begins with a fixed eight-card deck.

Random starting-hand generation is removed during the prototype phase.

Reasons:

- Consistent onboarding
- Reliable playtest comparisons
- Guaranteed access to the intended class loop
- Easier resource balancing
- Fewer invalid or confusing starting builds

### 10.2 Deck size

| Rule | Value |
|---|---:|
| Starting deck size | 8 cards |
| Maximum deck size | 12 cards |
| Maximum copies | 2 copies of one card |
| Minimum deck size | 6 cards |
| Upgrade maximum | Level 3 |

When the deck is full, taking a new card requires replacing or declining an existing card.

This prevents decks from becoming too diluted and preserves recognizable build identity.

### 10.3 Queue presentation

The combat HUD should display only:

1. Current card
2. Next card
3. Following card

The engine may continue maintaining internal deck and discard state, but the player does not need to see a six-slot operational pipeline.

### 10.4 Resource waiting

Cards may wait until enough class resource is available.

However:

- Normal card costs should remain between 1 and 5.
- Passive generation must prevent indefinite stalls.
- The expected ordinary wait should remain under three seconds.
- The current card should display its missing resource clearly.
- Cards cannot block the engine long enough to require a Purge mechanic.

Example:

> METEOR — NEEDS 2 MANA

The resource bar should visually indicate when the card will become affordable.

---

## 11. Initial Card Library

The first playable library contains 60 enabled cards. Existing registered cards remain in source but are excluded from normal pools when marked disabled.

| Class | Card count |
|---|---:|
| Mage | 10 |
| Warrior | 10 |
| Rogue | 10 |
| Necromancer | 10 |
| Druid | 10 |
| Warlock | 10 |
| Colorless | 0 |
| Total | 60 |

Exact damage, duration, and radius values should be tuned after the resource prototype is functional.

---

# 12. Mage Card Library

| Card | Rarity | Cost | Type | Effect |
|---|---|---:|---|---|
| **Mana Burst** | Common | 1 | Technique | Release a small damaging pulse and gain 2 Mana. Gain 1 additional Mana if at least one enemy is hit. |
| **Frost Nova** | Common | 3 | Signature | Form a ring around the Mage. When it closes, damage and briefly freeze enemies inside. |
| **Arc Lightning** | Common | 3 | Signature | Channel lightning into the nearest enemy for two seconds. Lightning chains to one nearby target. |
| **Teleport** | Common | 2 | Technique | Replace Dash with Teleport for eight seconds. |
| **Rune Prison** | Uncommon | 3 | Signature | Create a ritual circle that damages and roots enemies when it closes. |
| **Blizzard** | Uncommon | 4 | Signature | Create a persistent storm that damages and slows enemies inside it. |
| **Arcane Mirror** | Uncommon | 2 | Power | For eight seconds, every third Arcane Bolt splits toward another enemy. |
| **Time Warp** | Rare | 3 | Power | For eight seconds, Mage Signatures channel 35% faster. |
| **Meteor** | Rare | 5 | Signature | After a long warning, deal heavy damage and apply Burn in a large area. |
| **Arcane Singularity** | Legendary | 5 | Signature | Pull nearby enemies into a collapsing star, then deal massive damage and briefly root survivors. |

## 12.1 Mage archetypes

### Control Mage

Primary cards:

- Frost Nova
- Rune Prison
- Blizzard
- Arcane Singularity

Play pattern:

- Control enemy movement
- Group targets
- Land large ritual effects

### Storm Mage

Primary cards:

- Arc Lightning
- Arcane Mirror
- Time Warp

Play pattern:

- Maintain steady pressure
- Benefit from multiple nearby enemies
- Resolve Signatures more frequently

### Burst Mage

Primary cards:

- Mana Burst
- Meteor
- Time Warp
- Arcane Singularity

Play pattern:

- Rebuild Mana
- Create a large damage window
- Deliver powerful delayed impacts

---

# 13. Warrior Card Library

| Card | Rarity | Cost | Type | Effect |
|---|---|---:|---|---|
| **Iron Skin** | Common | 1 | Technique | Gain 15 Armor. |
| **Cleaving Stance** | Common | 2 | Power | For eight seconds, basic swings become wider and deal 25% more damage. |
| **Charge** | Common | 2 | Technique | Replace Dash with Charge for eight seconds. Charge damages and pushes enemies. |
| **Whirlwind** | Common | 3 | Signature | Spin for two seconds, repeatedly damaging nearby enemies. |
| **Riposte** | Uncommon | 2 | Power | For ten seconds, perfect dodges trigger a counterattack and grant 1 Rage. |
| **Thunder Hammer** | Uncommon | 3 | Signature | Deliver a heavy strike followed by a stunning shockwave. |
| **Execute** | Uncommon | 3 | Technique | Strike the nearest enemy. Deal greatly increased damage if it is below 30% health. |
| **Blood Rage** | Rare | 3 | Power | For eight seconds, attack faster and generate additional Rage from melee attacks. |
| **Earthquake** | Rare | 4 | Signature | Deal heavy damage and stun enemies in a large area around the Warrior. |
| **Titanfall** | Legendary | 5 | Signature | Create a large impact zone around the Warrior, then call down a colossal strike. |

## 13.1 Warrior archetypes

### Berserker

Primary cards:

- Cleaving Stance
- Blood Rage
- Whirlwind

Play pattern:

- Remain close
- Attack frequently
- Convert aggression into repeated cards

### Juggernaut

Primary cards:

- Iron Skin
- Riposte
- Thunder Hammer

Play pattern:

- Absorb or avoid pressure
- Generate Rage defensively
- Retaliate with heavy crowd control

### Executioner

Primary cards:

- Charge
- Execute
- Earthquake
- Titanfall

Play pattern:

- Enter combat decisively
- Create a damage window
- Finish weakened targets

---

# 14. Rogue Card Library

| Card | Rarity | Cost | Type | Effect |
|---|---|---:|---|---|
| **Poisoned Blades** | Common | 2 | Power | For eight seconds, basic knives apply Poison. |
| **Shadowstep** | Common | 1 | Technique | Replace Dash with Shadowstep for eight seconds. The first knife after stepping is a guaranteed critical hit. |
| **Springblade Trap** | Common | 2 | Technique | Place a trap that damages and briefly roots the first enemy to activate it. |
| **Backstab** | Common | 2 | Technique | Strike the nearest enemy with a high critical-hit chance. |
| **Smoke Bomb** | Uncommon | 2 | Technique | Create a cloud that slows enemies and makes the Rogue harder to target. |
| **Deathmark** | Uncommon | 2 | Power | Mark the nearest enemy for eight seconds. It takes 30% more damage from the Rogue. |
| **Fan of Knives** | Uncommon | 3 | Signature | Release several radial waves of knives over two seconds. |
| **Venom Cloud** | Rare | 3 | Signature | Create a lingering cloud that repeatedly applies Poison. |
| **Shadow Clone** | Rare | 4 | Power | Summon a clone for eight seconds that throws knives at nearby enemies. |
| **Thousand Cuts** | Legendary | 5 | Signature | Create a three-second storm of knives. Poisoned and marked enemies take additional damage. |

## 14.1 Rogue archetypes

### Assassin

Primary cards:

- Shadowstep
- Backstab
- Deathmark

Play pattern:

- Create a damage opening
- Guarantee or increase critical hits
- Burst a priority target

### Poisoner

Primary cards:

- Poisoned Blades
- Venom Cloud
- Thousand Cuts

Play pattern:

- Apply Poison
- Maintain pressure while repositioning
- Gain additional value against marked or poisoned enemies

### Trickster

Primary cards:

- Springblade Trap
- Smoke Bomb
- Fan of Knives
- Shadow Clone

Play pattern:

- Control enemy positioning
- Trigger traps
- Create confusion and repeated attacks

---

# 14A. Necromancer Card Library

| Card | Rarity | Cost | Type | Effect |
|---|---|---:|---|---|
| **Bone Legion** | Common | 2 | Power | For nine seconds, every third Bone Shard calls a second shard from the grave. |
| **Grave Miasma** | Common | 2 | Power | For eight seconds, Bone Shards apply Poison. |
| **Raise Dead** | Common | 3 | Signature | Raise a skeletal archer that follows and attacks for twelve seconds. |
| **Bone Spear** | Common | 2 | Technique | Fire a piercing bone projectile through a line of enemies. |
| **Grave Grasp** | Common | 2 | Technique | Damage and root enemies in a targeted circle. |
| **Soul Ward** | Common | 1 | Technique | Gain 14 Armor. |
| **Wraith Walk** | Uncommon | 1 | Technique | Replace Dash with an untargetable blink for nine seconds. |
| **Plague Ground** | Common | 3 | Signature | Create a four-second slowing zone that damages and Poisons enemies. |
| **Bone Storm** | Uncommon | 4 | Signature | Erupt repeated radial volleys of bone for 2.4 seconds. |
| **Army of the Dead** | Legendary | 5 | Signature | Raise four shades that attack for eighteen seconds. |

Necromancer archetypes are **Bone**, **Plague**, and **Army**. Each creates a visible battlefield result and remains useful when no kill is immediately available.

---

# 14B. Druid Card Library

| Card | Rarity | Cost | Type | Effect |
|---|---|---:|---|---|
| **Wolf Aspect** | Common | 2 | Power | For eight seconds, claws attack faster and deal more damage. |
| **Bear Aspect** | Common | 2 | Power | For eight seconds, claws become wider and heavier. |
| **Pounce** | Common | 2 | Technique | Leap through enemies, damaging and scattering them. |
| **Barkskin** | Common | 1 | Technique | Gain 16 Armor. |
| **Renewal** | Uncommon | 2 | Technique | Restore 22 Health. |
| **Entangling Roots** | Common | 3 | Signature | Damage and root enemies in a wide targeted circle. |
| **Hurricane** | Common | 3 | Signature | Become the center of a 2.5-second storm that damages and pushes enemies. |
| **Moonbeam** | Uncommon | 3 | Signature | Create a four-second damaging moonlit zone. |
| **Lightning Bloom** | Uncommon | 3 | Signature | Chain lightning through up to six enemies and apply Chill. |
| **World Tree** | Legendary | 5 | Signature | Heal, gain Armor, and crush and root nearby enemies. |

Druid archetypes are **Feral**, **Guardian**, and **Storm**. Forms alter the basic attack while nature Signatures control space.

---

# 14C. Warlock Card Library

| Card | Rarity | Cost | Type | Effect |
|---|---|---:|---|---|
| **Fel Infusion** | Common | 2 | Power | For eight seconds, Eldritch Bolts explode and apply Burn. |
| **Cursed Bolts** | Common | 2 | Power | For nine seconds, every third Eldritch Bolt splits toward another enemy. |
| **Shadow Barrage** | Common | 3 | Signature | Fire a stream of shadow bolts for 2.2 seconds. |
| **Hellfire** | Common | 3 | Signature | Damage and heavily Burn enemies in a targeted circle. |
| **Demon Skin** | Common | 1 | Technique | Gain 15 Armor. |
| **Fear** | Common | 2 | Technique | Root and drive back nearby enemies. |
| **Rain of Fire** | Uncommon | 4 | Signature | Create a five-second burning zone. |
| **Life Drain** | Uncommon | 3 | Signature | Drain a short chain of enemies for 2.4 seconds and restore 8 Health. |
| **Infernal Gate** | Rare | 4 | Signature | Summon two lesser demons for fourteen seconds. |
| **Apocalypse** | Legendary | 5 | Signature | Burn and scatter nearby enemies, leaving a poisonous zone. |

Warlock archetypes are **Fel Fire**, **Shadow**, and **Demonology**. Corruption accelerates access to these effects but does not modify card damage or trigger backlash.

---

## 15. Initial Fixed Starting Decks

### 15.1 Mage

1. Mana Burst
2. Mana Burst
3. Frost Nova
4. Frost Nova
5. Arc Lightning
6. Teleport
7. Rune Prison
8. Arcane Mirror

Starting experience:

- Reliable Mana recovery
- Immediate access to control
- One mobility tool
- One basic-attack enhancement
- Multiple visible spell types

### 15.2 Warrior

1. Iron Skin
2. Iron Skin
3. Cleaving Stance
4. Charge
5. Whirlwind
6. Riposte
7. Thunder Hammer
8. Execute

Starting experience:

- Defense
- Melee enhancement
- Mobility
- Sustained area damage
- Counterplay
- Finisher

### 15.3 Rogue

1. Poisoned Blades
2. Poisoned Blades
3. Shadowstep
4. Springblade Trap
5. Backstab
6. Smoke Bomb
7. Deathmark
8. Fan of Knives

Starting experience:

- Poison identity
- Critical-hit setup
- Trap interaction
- Mobility
- Target marking
- Area attack

### 15.4 Necromancer

1. Bone Legion
2. Bone Legion
3. Raise Dead
4. Bone Spear
5. Grave Grasp
6. Soul Ward
7. Plague Ground
8. Wraith Walk

Starting experience:

- A basic-attack Power
- One summon
- Direct and area control
- Defense and mobility
- A persistent damage zone

### 15.5 Druid

1. Wolf Aspect
2. Wolf Aspect
3. Bear Aspect
4. Pounce
5. Barkskin
6. Renewal
7. Entangling Roots
8. Hurricane

Starting experience:

- Two contrasting forms
- Melee mobility
- Defense and healing
- Root and knockback control

### 15.6 Warlock

1. Fel Infusion
2. Fel Infusion
3. Cursed Bolts
4. Shadow Barrage
5. Hellfire
6. Demon Skin
7. Fear
8. Life Drain

Starting experience:

- Fire and shadow Powers
- Sustained ranged pressure
- Area damage and control
- Defense and recovery

---

## 16. Status Effects

The initial prototype keeps three statuses.

### Burn

Purpose:

- Direct damage over time
- Mage burst and fire identity
- Rewards keeping enemies inside fire effects

### Poison

Purpose:

- Rogue setup and attrition
- Supports Focus generation
- Increases the value of sustained pressure

### Chill

Purpose:

- Mage control
- Helps delayed ritual spells connect
- Reduces enemy movement without requiring complete immobilization

### Bleed

Bleed is removed from the first prototype.

Reason:

- It currently functions primarily as another damage-over-time effect.
- It does not have a sufficiently distinct interaction model.
- It overlaps with Poison without adding a different decision.

Bleed may return later with a dedicated identity, such as:

- Increased damage from repeated physical hits
- Critical-hit amplification
- Movement-based damage
- Execution thresholds

---

## 17. Cards Removed From the Initial Library

The following card concepts should be removed from normal card drafts:

- Draw
- Extend
- Quickcast
- Grand Channel
- Duplicate
- Flush Queue
- Echo
- Battery
- Shuffle
- Purge
- Overload
- Stabilize
- Momentum
- Grand Flush
- Transmute
- Gilded Engine
- Phoenix Echo
- Ebb and Flow
- Slipstream
- Deep Current
- Call and Answer
- Metronome

This does not require permanently deleting their implementation.

They may be:

- Disabled in card pools
- Retained in source control
- Converted into relics
- Reworked into direct combat cards
- Used later in an advanced game mode

---

## 18. Possible Relic Conversions

Some removed card-system effects may work better as persistent relics.

### Astral Battery

- Increase maximum class resource by 2.

### Quickcast Sigil

- All Signatures channel 12% faster.

### Echoing Seal

- Every eighth Signature repeats at 50% power.

### Eternal Binding

- Powers last 25% longer.

### Golden Quill

- After five cards resolve, restore 2 class resource.

### Overflowing Chalice

- Resource gained at maximum capacity is stored temporarily, up to 2 points.

Relic effects should remain rare and globally understandable.

---

## 19. World Expansion Model

The rebuilt library should not return immediately to adding 16–17 cards per world.

Recommended expansion:

- 60 core cards
- 2 new cards per class for each world
- 12 cards added per world

For three additional authored worlds:

| Source | Cards |
|---|---:|
| Core library | 60 |
| World II | 12 |
| World III | 12 |
| World IV | 12 |
| Total | 96 |

World cards should deepen existing archetypes rather than add new resource systems.

Examples:

### World II

- Mage: fire burst and Burn
- Warrior: armor converted into offense
- Rogue: explosive traps and fire Poison variants
- Necromancer: burning bones and explosive corpses
- Druid: wildfire and resilient growth
- Warlock: infernal summons and spreading flame

### World III

- Mage: Chill and displacement
- Warrior: knockback and control
- Rogue: slowing fields and repositioning
- Necromancer: drowned dead and persistent zones
- Druid: tides, moonlight, and displacement
- Warlock: draining curses and abyssal control

### World IV

- Mage: lightning and resonance
- Warrior: counterattacks and shockwaves
- Rogue: echoes, clones, and repeated precision attacks
- Necromancer: spectral armies and death echoes
- Druid: storm chains and ancient guardians
- Warlock: demonic resonance and shadow bursts

---

## 20. HUD Changes

### Remove or reduce

- Six visible queue slots
- Deck-management emphasis
- Queue-blocking indicators across multiple cards
- Dedicated discard presentation
- Multiple temporary engine-effect chips
- Card-system terminology during combat

### Display

- Character portrait or class icon
- Health
- One class resource bar
- Current card
- Next two cards
- Current card channel progress
- Active Powers
- Dash replacement
- Important enemy status indicators

### Resource bar labels

- Mage: MANA
- Warrior: RAGE
- Rogue: FOCUS
- Necromancer: SOULS
- Druid: SPIRIT
- Warlock: CORRUPTION

### Waiting-card feedback

When a card is unaffordable:

- Display missing resource directly.
- Animate progress toward affordability.
- Avoid presenting the entire queue as blocked.
- Keep the expected delay short.

Example:

> EARTHQUAKE  
> NEEDS 2 RAGE

---

## 21. Balance Targets

These are prototype targets rather than final numbers.

### 21.1 Card resolution rate

| Situation | Target |
|---|---:|
| Mage duel | 22–30 cards per minute |
| Warrior duel while engaged | 20–28 cards per minute |
| Warrior duel while avoiding combat | 14–20 cards per minute |
| Rogue duel with average performance | 20–27 cards per minute |
| Necromancer duel with no adds | 18–26 cards per minute |
| Druid duel while engaged | 20–28 cards per minute |
| Warlock duel with average performance | 19–27 cards per minute |
| Strong resource build | Up to approximately 34 cards per minute |

### 21.2 Damage distribution

Target percentage of total class damage:

| Class | Basic attacks | Cards and statuses |
|---|---:|---:|
| Mage | 20–35% | 65–80% |
| Warrior | 50–65% | 35–50% |
| Rogue | 40–55% | 45–60% |
| Necromancer | 30–45% | 55–70% |
| Druid | 45–60% | 40–55% |
| Warlock | 30–45% | 55–70% |

These values should vary by build but preserve class identity.

### 21.3 Resource sources

Mage:

- 55–70% passive Mana regeneration
- 10–20% basic-attack Mana
- 10–20% cards and Powers
- Remaining resource from perfect dodges and external rewards

Warrior:

- 20–35% passive Rage
- 40–60% engagement-based Rage
- Remaining resource from cards and dodges

Rogue:

- 35–50% passive Focus
- 30–45% precision-based Focus
- Remaining resource from cards and status interactions

Necromancer:

- 45–60% passive Souls regeneration in single-target combat
- 20–40% kill-based Souls in group combat
- Remaining resource from dodges and external rewards

Druid:

- 35–50% passive Spirit regeneration
- 30–45% claw-based Spirit
- Remaining resource from perfect dodges and external rewards

Warlock:

- 40–55% passive Corruption regeneration
- 20–35% bolt-hit Corruption
- Remaining resource from damage taken, dodges, and external rewards

### 21.4 Resource waiting

| Metric | Target |
|---|---:|
| Average card wait | Under 2 seconds |
| Normal maximum wait | Under 3 seconds |
| Time stalled during normal build | Under 12% of active combat |
| Time stalled during intentionally expensive build | Under 22% |

---

## 22. Playtest Scenarios

Each class should be tested against the same scenarios.

### Scenario A — Stationary single target

Purpose:

- Measure raw card cadence
- Measure resource generation
- Measure damage split

### Scenario B — Mobile rival

Purpose:

- Test missed automatic attacks
- Confirm cards continue resolving
- Test class identity during movement-heavy combat

### Scenario C — Boss without summons

Purpose:

- Verify duel sustainability
- Identify long resource stalls
- Measure control and defensive value

### Scenario D — Enemy swarm

Purpose:

- Test area effects
- Prevent multi-target resource generation from becoming excessive
- Measure visual clarity

### Scenario E — Low-performance player

Behavior:

- Misses many attacks
- Rarely perfect-dodges
- Maintains basic movement

Purpose:

- Confirm the card engine still functions
- Prevent complete resource starvation

### Scenario F — High-performance player

Behavior:

- Hits consistently
- Uses traps correctly
- Blocks or dodges accurately
- Maintains class-specific actions

Purpose:

- Confirm skilled play meaningfully accelerates the engine
- Ensure acceleration does not create uncontrolled loops

---

## 23. Required Telemetry

Track the following by class and encounter:

- Resource gained by source
- Resource spent
- Resource wasted at maximum capacity
- Cards resolved per minute
- Average card wait time
- Longest card wait
- Damage by basic attacks
- Damage by each card
- Damage by statuses
- Card hit rate
- Basic-attack hit rate
- Perfect-dodge count
- Power uptime
- Average deck cycle time
- Player damage taken
- Boss encounter duration

Resource sources should be logged separately.

Example categories:

type ResourceSource =
  | "passive_combat"
  | "basic_attack"
  | "perfect_dodge"
  | "critical_hit"
  | "trap_trigger"
  | "armor_block"
  | "damage_taken"
  | "card_effect"
  | "kill";

## 24. Migration Strategy

The existing content should not be deleted immediately.

### Keep and adapt

Strong existing combat concepts include:

- Frost Nova
- Rune Prison
- Arc Lightning
- Blizzard
- Meteor
- Arcane Singularity
- Cleaving Stance
- Charge
- Whirlwind
- Thunder Hammer
- Execute
- Earthquake
- Titanfall
- Poisoned Blades
- Shadowstep
- Springblade Trap
- Smoke Bomb
- Deathmark
- Fan of Knives
- Venom Cloud
- Shadow Clone
- Thousand Cuts

### Disable temporarily

Cards focused primarily on:

- Draw
- Queue
- Cost conversion
- Future-card modification
- Previous-card repetition
- Discard manipulation

### Reevaluate later

Some existing world cards may return after being rewritten as:

- Direct attacks
- Powers
- Techniques
- Signatures
- Relics

## 25. Acceptance Criteria

The rebuild is successful when all of the following are true.

### Resource system
- Mage continues casting during a boss fight even when many bolts miss.
- Warrior cards accelerate noticeably when the Warrior remains engaged.
- Rogue cards accelerate through critical hits, traps, and perfect dodges.
- Necromancer cards accelerate through kills without stalling against a lone boss.
- Druid cards accelerate through landed claws and perfect dodges.
- Warlock cards accelerate through landed bolts and health damage without a backlash reset.
- No class experiences ordinary stalls longer than approximately three seconds.
- Players can explain how their class gains its resource after one run.

### Card system
- New players understand what every starting card does.
- Players can identify their build from battlefield behavior.
- Cards do not require understanding queue order to evaluate them.
- The current and next two cards provide sufficient planning information.
- No normal card is required to fix a blocked deck.

### Class identity
- Mage damage comes primarily from cards.
- Warrior damage comes primarily from direct combat.
- Rogue damage comes from a mixture of attacks, setup, and card bursts.
- Necromancer damage comes from attacks, persistent control, and summons.
- Druid damage alternates between empowered melee and nature Signatures.
- Warlock damage comes primarily from ranged cards, zones, and summoned demons.
- The six classes feel mechanically different without relying only on numerical modifiers.

### Library quality
- Every card supports at least one named archetype.
- Every card has value in either duels, groups, or a clearly declared specialization.
- No two cards provide effectively identical results.
- Every Legendary changes the visual and tactical state of combat.
