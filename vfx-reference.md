# Arcana Engine — VFX & Animation Reference for Designer Handoff

This is the full roster of what a player actually sees in combat: every class's identity, basic attack, and the 60 cards currently live in the game (10 per class × 6 classes — Card System v2's curated library; see `rework_cards.md`). Pair this with the **"Arcane machinery" VFX direction** doc (the five-beat structure — Anticipation → Release → Travel → Impact → Residue — and the per-class geometry/material/motion language) for the *how it should feel*; this doc is the *what needs it*.

## How to read this

**Card line format:**
> **‹glyph› Name** (`card_id`) — Rarity · Cost · Element · [Starting deck | Draft pickup]
> "Player-facing rules text"
> Shape: mechanical description — VFX status

**VFX status:**
- ✅ **Shared pass applied** — a generic engine-level upgrade already exists for this effect *shape* (directional readability, impact weight, layered core/envelope, etc.). **This is not class-flavored.** Every ✅ card is still rendered with the same neutral treatment regardless of class — a Mage AoE and a Warlock AoE currently look the same shape, just tinted by element color. Turning these into the class-specific "circles/glass" vs "crescents/embers" vs "needles/shadow" languages from the VFX brief is exactly the work this handoff is for.
- 🎨 **Untouched** — still on the original/generic renderer, needs a full pass.

**"Starting deck" vs "Draft pickup":** every run begins with a fixed 8-card hand (marked Starting deck below) — a player sees these constantly, every run, from second one. The other 2 cards per class are found during a run (usually the class's Rare/Legendary showpiece). Prioritize Starting deck cards; they're on screen the most.

---

## Universal systems (shared by all 6 classes)

**Basic attack** — every class attacks automatically at the nearest enemy in range; it's the constant background layer, not a cast. Two kinds exist:
- *Projectile* (Mage/Rogue/Necromancer/Warlock): a bolt/knife/shard flying at a target. Rendered generically (`drawProj`) — untouched. 🎨
- *Melee arc* (Warrior/Druid): a cone swing in front of the player. ✅ Landing a hit now triggers a white-hot contact flash + a short directional camera kick (shared with every card that uses the same "arc" effect — see below). The swing arc itself is still the generic sweep shape. 🎨 partial

**Dodge (default, no card active)** — tap-dash with brief invulnerability; leaves a fading position trail. Generic, untouched. 🎨 The VFX brief specifically asks for "two offset afterimages that evaporate rapidly" here — this is a good, cheap, universal win since every class uses it constantly.

**Card-granted Dash overrides** — Technique cards that *replace* the default Dodge for 8–9s: Teleport (Mage), Charge (Warrior), Shadowstep (Rogue), Wraith Walk (Necromancer). Two kinds:
- *Blink* (Teleport, Shadowstep, Wraith Walk): ✅ now collapses the hero into a thin vertical sigil, leaves a fading afterimage, and reconstructs with an outward pulse on arrival — but it's **one generic sigil for all three classes**. The brief's Mage-specific "glyph" language fits Teleport; Shadowstep and Wraith Walk need their own shadow/soul-flavored version, not a re-skinned copy.
- *Charge* (Warrior only): 🎨 untouched, still a plain streak line.

**Status effects** (Burn, Chill/Freeze, Poison, Slow, Stun, Root, Mark) are applied by cards across *every* class and currently render as a single small colored dot above the enemy's head, plus a screen-space tint on some zones. None of these have the "Frost crystallizes surfaces," "Poison splashes into angular droplets, then crawls inward as veins" treatment from the brief yet. Because they're shared infrastructure, a pass here pays off across dozens of cards at once — this is probably the single highest-leverage bucket after the class basic attacks.

**Boss telegraphs** — ✅ fully reworked this pass: one strong boundary, low-opacity textured danger fill, directional progression (closing wedge / advancing wave / arming sweep), and a brightness+frequency pulse in the final 20% before impact. Applies to every boss in the game automatically; no per-boss work needed for the *shape*. Boss-specific impact effects and enemy silhouettes are a separate, later concern.

---

## Mage — *"Arcane bolts · Mana · Ritual spells"*

Fires an Arcane Bolt on its own; MANA regenerates steadily and fuels ritual Signature spells. **Visual language (from the brief):** circles, constellations, branching arcs · luminous glass and spectral energy · precise, smooth, briefly explosive.

- Resource: **MANA** (max 10, starts 6, regen every 1.1s, +2 on perfect dodge, color `#8f6fff`)
- Basic: **Arcane Bolt** — projectile, 6 dmg, 0.55s rate, 470 range, arcane element

- **✦ Arcane Mirror** (`arcane_mirror`) — Uncommon · Cost 2 · Arcane · Starting deck
  "For 10s, every third basic attack fires an extra bolt at another enemy."
  Shape: self buff, no new geometry — the *extra bolt* itself is a normal Arcane Bolt. 🎨

- **✹ Meteor** (`meteor`) — Rare · Cost 5 · Fire · Draft pickup
  "A long channel. Where the circle burns, the sky falls. Heavy damage and Burn."
  Shape: AoE burst, target-centered. ✅ shared blast-front (needs the "sky falls" moment — currently identical shape to every other AoE)

- **❄ Frost Nova** (`frost_nova`) — Common · Cost 3 · Frost · Starting deck
  "Channel a ring of hoarfrost around you, then freeze everything it touches."
  Shape: AoE burst, self-centered. ✅ shared blast-front. Channel windup uses a separate rotating-reticle system (`drawChannelPreview`), untouched — not the boss-telegraph system. 🎨 windup

- **⌘ Rune Prison** (`rune_prison`) — Uncommon · Cost 3 · Arcane · Starting deck
  "A binding circle snaps shut, rooting every enemy inside."
  Shape: AoE burst (root). ✅ shared blast-front

- **↯ Arc Lightning** (`arc_lightning`) — Common · Cost 3 · Lightning · Starting deck
  "Channel for 2.5s, repeatedly chaining lightning between enemies."
  Shape: sustained chain-lightning, ticks every 0.4s. ✅ **flagship of the brief** — layered white-core/blue-envelope bolt with 2-4 branch forks, plus a star-flash + brief ring refraction at each enemy it jumps to. Still using the shared "lightning" palette (shared with Warrior's Thunder Hammer), not a Mage-exclusive white-violet.

- **❄ Blizzard** (`blizzard`) — Uncommon · Cost 4 · Frost · Draft pickup
  "Conjure a frozen storm that gnaws and chills all inside it for 4s."
  Shape: persistent zone. 🎨 untouched

- **❋ Mana Burst** (`mana_burst`) — Common · Cost 1 · Arcane · Starting deck
  "A pulse of raw arcana. Gain 2 Mana for each enemy struck."
  Shape: AoE burst, self-centered, cheapest/fastest card in the deck. ✅ shared blast-front

- **✧ Teleport** (`teleport`) — Common · Cost 2 · Arcane · Starting deck
  "For 8s your Dash becomes Teleport: fold space in your movement direction."
  Shape: replaces Dodge with a blink. ✅ **flagship of the brief** — collapsing/reconstructing sigil (see Universal systems above)

- **⌛ Time Warp** (`time_warp`) — Rare · Cost 3 · Arcane · Draft pickup
  "For 6s, your Signatures channel much faster."
  Shape: self buff, no combat geometry (affects channel speed only). 🎨 — could use a subtle persistent time-distortion aura around the player

- **✦ Arcane Singularity** (`arcane_singularity`) — Legendary · Cost 5 · Arcane · Draft pickup
  "Channel a collapsing star. Everything inside is dragged in, rooted, and unmade."
  Shape: AoE burst, self-centered, **pulls enemies inward** (negative knockback). ✅ shared blast-front, but the front is built as an outward-pushing pressure wave — this card needs a bespoke *implosion* variant (energy collapsing inward, not radiating out). Biggest Mage showpiece in the game.

---

## Warrior — *"Melee arcs · Rage · Shockwaves"*

Swings a spectral blade at anything close; landing hits, taking damage, and blocking build RAGE. **Visual language:** crescents, wedges, fractured rings · hot metal, embers and pressure · compressed anticipation, violent release.

- Resource: **RAGE** (max 10, starts 3, regen every 2.5s, +1 on perfect dodge, color `#ff6a4a`)
- Basic: **Blade Swing** — melee arc, 10 dmg, 0.8s rate, 125 range/100° arc, physical, knockback 60

- **⚔ Cleaving Stance** (`cleaving_stance`) — Common · Cost 2 · Physical · Starting deck
  "For 7s your swings carve a far wider arc and hit 25% harder."
  Shape: self buff to the basic swing. 🎨 the buff itself; the swing it modifies already has the shared contact-flash (see Universal systems)

- **♅ Blood Rage** (`blood_rage`) — Uncommon · Cost 3 · Fire · Draft pickup
  "For 8s: attack 35% faster and channel 25% faster. Taking damage extends it 1s."
  Shape: self buff / stance. 🎨 **this is *the* Rage card** — the brief explicitly asks for the character silhouette to visibly heat up and attack trails to intensify while this is active, not just a HUD number changing

- **➶ Charge** (`charge`) — Common · Cost 2 · Physical · Starting deck
  "For 8s your Dash becomes Charge: crash through enemies, dragging them with you."
  Shape: replaces Dodge with a damaging dash-through. 🎨 untouched, still a plain streak line — needs the "compressed anticipation, violent release" motion language

- **❖ Iron Skin** (`iron_skin`) — Common · Cost 1 · Gold · Starting deck
  "Your skin turns to living iron. Gain 12 Armor."
  Shape: self shield. 🎨

- **⚒ Thunder Hammer** (`thunder_hammer`) — Uncommon · Cost 3 · Lightning · Starting deck
  "Wind up a heavy strike that detonates into a stunning shockwave."
  Shape: melee wind-up → directional AoE shockwave in front of the player. ✅ **flagship of the brief** — the melee half gets the contact flash; the shockwave half is the *only* card in the game currently using the new directional pressure-front (bright leading edge + ground compression + forward-biased fan instead of a flat radial circle). This is exactly the "repeated orange circles" example called out by name in the brief.

- **✺ Whirlwind** (`whirlwind`) — Common · Cost 3 · Physical · Starting deck
  "Spin for 2s, repeatedly slashing everything around you."
  Shape: sustained self-centered spin, a rotating arc every 0.33s. 🎨 untouched — pushes the plain rotating-arc fx, no impact weight yet

- **♁ Earthquake** (`earthquake`) — Rare · Cost 4 · Physical · Draft pickup
  "Long channel. The floor splits in a shockwave that stuns all around you."
  Shape: AoE burst, self-centered, omnidirectional (correctly radial, not a fan — it's a stomp, not a swing). ✅ shared blast-front

- **☠ Execute** (`execute`) — Uncommon · Cost 3 · Physical · Starting deck
  "A merciless strike. Deals 3.5× damage to enemies below 35% health."
  Shape: melee arc, finisher. ✅ shared contact-flash pass — flagged as a crit-style flash specifically when the execute threshold triggers

- **☍ Riposte** (`riposte`) — Uncommon · Cost 2 · Physical · Starting deck
  "For 25s: after a perfect dodge, a counter slash strikes nearby enemies."
  Shape: triggered 360° counter-slash. 🎨 fires through a separate trigger system that doesn't yet call the shared contact-flash — needs its own hookup plus a distinct "reactive" feel (fast, punishing)

- **♆ Titanfall** (`titanfall`) — Legendary · Cost 5 · Gold · Draft pickup
  "Channel a colossal impact zone around you — then bring the sky down on it."
  Shape: AoE burst, self-centered, largest radius in the game (230). ✅ shared blast-front. Biggest Warrior showpiece — deserves the most spectacle of any card in the deck.

---

## Rogue — *"Fast knives · Traps · Focus"*

Throws quick knives on its own; crits, traps, poisoned kills and perfect dodges build FOCUS. **Visual language:** needles, slivers, broken curves · glass, poison and shadow · fast afterimages, sharp disappearance.

- Resource: **FOCUS** (max 10, starts 4, regen every 1.7s, +2 on perfect dodge, color `#8ade6a`, shown as pips)
- Basic: **Swift Knife** — projectile, 5 dmg, 0.4s rate (fastest basic in the game), 430 range, 10% crit

- **☽ Poisoned Blades** (`poisoned_blades`) — Common · Cost 2 · Poison · Starting deck
  "For 7s your knives drip venom, applying Poison on every hit."
  Shape: self buff, poison-coats the basic knife. 🎨 — the card most in need of the brief's "poison splashes into angular droplets, then crawls inward as small green veins" treatment, since it's applied on *every* basic hit for 7s

- **☾ Shadowstep** (`shadowstep`) — Common · Cost 1 · Shadow · Starting deck
  "For 8s your Dash becomes Shadowstep: blink untargetable, empowering your next basic attack."
  Shape: replaces Dodge with an untargetable blink. ✅ shared sigil pass, but it's the same Mage-glyph sigil re-skinned by color only — needs its own shadow/smoke-flavored blink, not an arcane one

- **⚸ Springblade Trap** (`trap_card`) — Common · Cost 2 · Poison · Starting deck
  "Place a hidden trap. Once armed, it snaps shut on the first enemy to step in."
  Shape: placed trap, arms after 0.6s. 🎨 untouched

- **♒ Smoke Bomb** (`smoke_bomb`) — Uncommon · Cost 2 · Shadow · Starting deck
  "A choking cloud follows you, slowing enemies inside it."
  Shape: persistent zone that follows the player. 🎨 untouched

- **⸙ Backstab** (`backstab`) — Uncommon · Cost 2 · Shadow · Starting deck
  "A treacherous strike with a 50% critical chance."
  Shape: melee arc, very high crit chance. ✅ shared contact-flash pass — good candidate for the brief's "critical hits momentarily slice the enemy silhouette into displaced layers" flourish, since half of its casts will crit

- **♃ Venom Cloud** (`venom_cloud`) — Uncommon · Cost 3 · Poison · Draft pickup
  "A lingering cloud that steadily poisons everything within for 5s."
  Shape: persistent zone. 🎨 untouched

- **✥ Fan of Knives** (`fan_of_knives`) — Uncommon · Cost 3 · Physical · Starting deck
  "For 2s, release wave after wave of spectral knives in every direction."
  Shape: sustained radial knife burst, 8 knives every 0.5s. 🎨 untouched — uses the generic projectile sprite (`drawProj`), no unique knife-trail treatment

- **♰ Deathmark** (`deathmark`) — Uncommon · Cost 2 · Shadow · Starting deck
  "Mark the nearest enemy for 8s. It takes 35% more damage and +25% crits from you."
  Shape: debuff mark, no attack geometry of its own. 🎨 needs a persistent glyph/sigil on the marked enemy so the player can track it

- **⚉ Shadow Clone** (`shadow_clone`) — Rare · Cost 4 · Shadow · Draft pickup
  "A clone of living shadow fights beside you for 8s, throwing knives."
  Shape: summon companion. 🎨 untouched

- **❈ Thousand Cuts** (`thousand_cuts`) — Legendary · Cost 5 · Shadow · Draft pickup
  "For 3s the air itself is made of knives. They remember every wound."
  Shape: sustained radial knife burst, fastest tick in the game (every 0.25s), high crit. 🎨 untouched — biggest Rogue showpiece, currently indistinguishable in shape from Fan of Knives, just faster

---

## Necromancer — *"Bone shards · Undead servants · Souls"*

Hurls splinters of grave-bone; SOULS regenerate and surge with every kill. **Visual language brief:** not separately specified — treat as a sibling of Mage's arcane language but grave/bone-toned (this is worth clarifying with design before the artist starts).

- Resource: **SOULS** (max 10, starts 4, regen every 1.9s, +1 on perfect dodge, color `#c69be8`, shown as pips)
- Basic: **Bone Shard** — projectile, 7 dmg, 0.62s rate, 460 range, shadow element

- **☠ Bone Legion** (`bone_legion`) — Common · Cost 2 · Shadow · Starting deck
  "For 9s every third Bone Shard calls a second shard from the grave."
  Shape: self buff, no new geometry. 🎨

- **☣ Grave Miasma** (`grave_miasma`) — Common · Cost 2 · Poison · Starting deck
  "For 8s your Bone Shards trail grave-rot and apply Poison."
  Shape: self buff, poison-coats the basic shard. 🎨

- **♙ Raise Dead** (`raise_dead`) — Common · Cost 3 · Shadow · Starting deck
  "Raise a skeletal archer that follows you and fires at nearby enemies for 12s."
  Shape: summon companion. 🎨 untouched

- **➳ Bone Spear** (`bone_spear`) — Common · Cost 2 · Physical · Starting deck
  "Launch a cruel spear of bone that punches through a line of enemies."
  Shape: piercing projectile (pierces 4). 🎨 untouched — deserves its own elongated bone-spear silhouette rather than the generic bolt

- **⌘ Grave Grasp** (`grave_grasp`) — Common · Cost 2 · Shadow · Starting deck
  "Dead hands tear through the ground, damaging and rooting enemies in the circle."
  Shape: AoE burst, thematically ground-erupting hands. ✅ shared blast-front as a base, but needs bespoke grasping-hands geometry layered on top — the generic front alone doesn't read as "hands"

- **◈ Soul Ward** (`soul_ward`) — Common · Cost 1 · Shadow · Starting deck
  "Bind the restless dead around you. Gain 14 Armor."
  Shape: self shield. 🎨

- **♧ Wraith Walk** (`wraith_walk`) — Uncommon · Cost 1 · Shadow · Starting deck
  "For 9s your Dash becomes Wraith Walk, blinking through danger while untargetable."
  Shape: replaces Dodge with a blink. ✅ shared sigil pass, same Mage-glyph re-skin caveat as Shadowstep — needs a soul/wraith-flavored version

- **☣ Plague Ground** (`plague_ground`) — Common · Cost 3 · Poison · Starting deck
  "Blight the earth for 4s, poisoning everything that crosses it."
  Shape: persistent zone. 🎨 untouched

- **✺ Bone Storm** (`bone_storm`) — Uncommon · Cost 4 · Physical · Draft pickup
  "For 2.4s, volleys of bone erupt in every direction around you."
  Shape: sustained radial projectile burst, 8 volleys every 0.4s, pierces 1. 🎨 untouched

- **♚ Army of the Dead** (`army_of_the_dead`) — Legendary · Cost 5 · Shadow · Draft pickup
  "Tear open the ossuary and raise four relentless shades for 18s."
  Shape: mass summon, 4 companions at once. 🎨 untouched — biggest summon spectacle in the game, currently no unique "ossuary tearing open" cast moment

---

## Druid — *"Wild claws · Shapeshifting · Spirit"*

Rakes nearby foes with feral claws; SPIRIT grows through close attacks and perfect dodges. **Visual language brief:** not separately specified — nature/beast register (fur, bark, storm) is implied by the cards but not yet written up; flag for design before the artist starts.

- Resource: **SPIRIT** (max 10, starts 5, regen every 1.6s, +2 on perfect dodge, color `#9bd66d`)
- Basic: **Wild Claw** — melee arc, 9 dmg, 0.7s rate, 115 range/90° arc, physical, knockback 45

- **◁ Wolf Aspect** (`wolf_aspect`) — Common · Cost 2 · Physical · Starting deck
  "For 8s your claws strike 30% faster and deal 10% more damage."
  Shape: self buff to the basic claw swing. 🎨 the buff itself; needs its own shapeshift-silhouette cue, not just a faster version of the same swing

- **◆ Bear Aspect** (`bear_aspect`) — Common · Cost 2 · Physical · Starting deck
  "For 8s your claws sweep 70% wider and deal 30% more damage."
  Shape: self buff, wider claw arc. 🎨 same shapeshift-silhouette need as Wolf Aspect

- **➶ Pounce** (`pounce`) — Common · Cost 2 · Physical · Starting deck
  "Leap through the nearest pack, raking and knocking aside everything in your path."
  Shape: dash-through melee leap. 🎨 untouched, still the plain streak line

- **♧ Barkskin** (`barkskin`) — Common · Cost 1 · Physical · Starting deck
  "Living bark closes around you. Gain 16 Armor."
  Shape: self shield. 🎨

- **✚ Renewal** (`renewal`) — Uncommon · Cost 2 · Gold · Starting deck
  "Call the sap upward and restore 22 Health."
  Shape: self heal burst. 🎨 untouched

- **⌘ Entangling Roots** (`entangling_roots`) — Common · Cost 3 · Physical · Starting deck
  "Roots erupt in a wide circle, damaging and binding every enemy they catch."
  Shape: AoE burst, thematically roots erupting. ✅ shared blast-front as a base, needs bespoke root/vine geometry on top, same caveat as Necromancer's Grave Grasp

- **◌ Hurricane** (`hurricane`) — Common · Cost 3 · Lightning · Starting deck
  "Become the eye of a 2.5s storm that batters enemies away from you."
  Shape: sustained self-centered spin/storm, pulses every 0.42s. 🎨 untouched, same shape as Whirlwind

- **☾ Moonbeam** (`moonbeam`) — Uncommon · Cost 3 · Arcane · Draft pickup
  "Fix a column of moonlight for 4s, burning everything beneath it."
  Shape: persistent column zone. 🎨 untouched

- **↯ Lightning Bloom** (`lightning_bloom`) — Uncommon · Cost 3 · Lightning · Draft pickup
  "Plant lightning in the nearest enemy; it branches through up to five others."
  Shape: chain lightning, widest jump count in the game (5). ✅ shared bolt+endpoint pass, same treatment as Arc Lightning

- **♣ World Tree** (`world_tree`) — Legendary · Cost 5 · Gold · Draft pickup
  "Raise an ancient tree: heal 30 Health, gain 20 Armor, and crush nearby enemies."
  Shape: self heal + shield, then a big self-centered AoE burst. ✅ the AoE half only — shared blast-front; heal/armor are still 🎨. Biggest Druid showpiece, currently has no unique "tree rising" cast moment.

---

## Warlock — *"Eldritch bolts · Curses · Corruption"*

Casts hungry bolts from the outer dark; CORRUPTION rises through bolt hits and suffered wounds. **Visual language brief:** not separately specified — fel/demonic register (fire + shadow, contract/pact imagery) is implied but not yet written up; flag for design before the artist starts.

- Resource: **CORRUPTION** (max 10, starts 4, regen every 1.9s, +1 on perfect dodge, color `#ee6fbd`)
- Basic: **Eldritch Bolt** — projectile, 8 dmg, 0.72s rate, 500 range, shadow element

- **♨ Fel Infusion** (`fel_infusion`) — Common · Cost 2 · Fire · Starting deck
  "For 8s your Eldritch Bolts become Fel Bolts that explode and apply Burn."
  Shape: self buff; each bolt now explodes on impact. ✅ partial — the impact explosion pushes the same shared blast fx as every AoE card, so it already reads better than before, but the buff-cast itself and the bolt's new look are untouched. 🎨

- **‡ Cursed Bolts** (`cursed_bolts`) — Common · Cost 2 · Shadow · Starting deck
  "For 9s every third Eldritch Bolt splits toward a second victim."
  Shape: self buff, no new geometry. 🎨

- **➵ Shadow Barrage** (`shadow_barrage`) — Common · Cost 3 · Shadow · Starting deck
  "For 2.2s, loose a stream of seeking shadow bolts into the nearest enemy."
  Shape: sustained projectile stream, forward-focused (not radial — the only sustained-projectile card that fires *at* a target instead of *around* the player). 🎨 untouched

- **♨ Hellfire** (`hellfire`) — Common · Cost 3 · Fire · Starting deck
  "Open a furnace beneath the nearest pack, dealing damage and heavy Burn."
  Shape: AoE burst. ✅ shared blast-front

- **♢ Demon Skin** (`demon_skin`) — Common · Cost 1 · Shadow · Starting deck
  "Borrow a demon's hide. Gain 15 Armor."
  Shape: self shield. 🎨

- **◉ Fear** (`fear`) — Common · Cost 2 · Shadow · Starting deck
  "Crush nearby minds with a vision of the void, rooting and driving enemies back."
  Shape: AoE burst, self-centered, strongest outward knockback in the game (190). ✅ shared blast-front

- **☄ Rain of Fire** (`rain_of_fire`) — Uncommon · Cost 4 · Fire · Draft pickup
  "Burn a circle into the world for 5s; enemies inside are repeatedly ignited."
  Shape: persistent zone. 🎨 untouched

- **§ Life Drain** (`life_drain`) — Uncommon · Cost 3 · Shadow · Starting deck
  "Drain the nearest foes with shadow for 2.4s and restore 8 Health."
  Shape: sustained chain-drain (jumps 2) + self heal. ✅ the chain half — shared bolt+endpoint pass, though it should read as *tethers pulling life back to the caster*, not lightning; the heal is still 🎨

- **⌾ Infernal Gate** (`infernal_gate`) — Rare · Cost 4 · Fire · Draft pickup
  "Open a gate and bind two lesser demons to your side for 14s."
  Shape: dual summon. 🎨 untouched

- **☢ Apocalypse** (`apocalypse`) — Legendary · Cost 5 · Fire · Draft pickup
  "Let the contract come due. An immense blast burns, poisons, and scatters everything nearby."
  Shape: massive self-centered AoE burst (biggest single hit in the game, 68 dmg + knockback 220), then a lingering poison zone. ✅ the AoE half — shared blast-front; zone half is 🎨. Biggest Warlock showpiece.

---

## Suggested priority order

1. **Universal systems first** — the basic-attack contact flash (already partially shared), the default Dodge afterimage, and the shared status-effect language (Burn/Chill/Poison/Root/Stun) touch every single card in the game. A pass here is worth more than any individual card.
2. **The three "flagship" cards already named in the VFX brief** — Arc Lightning / Lightning Bloom (chain lightning), Teleport (blink sigil), Thunder Hammer (directional shockwave) — since the shared engine-level shape is already built for these, an artist can go straight to class-flavored surface treatment without waiting on new systems.
3. **Starting-deck cards** (marked above) over Draft-pickup cards — players see these every single run.
4. **Legendary showpieces** (one per class: Arcane Singularity, Titanfall, Thousand Cuts, Army of the Dead, World Tree, Apocalypse) — lowest frequency but highest per-hit impact; worth a standout treatment once the shared systems are solid.
