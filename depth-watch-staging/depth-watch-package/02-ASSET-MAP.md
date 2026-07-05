# DEPTH WATCH — ASSET MAP & FUNCTIONAL GUIDE
### Companion to `01-BUILD-BRIEF.md` — read that first, this document explains every asset in `/assets/` and exactly how it should function in-game.

All raw images are included in this package under `/assets/[category]/`, suffixed `_RAW` because none are prepped yet (see Prep Checklist at the bottom before wiring any of them in).

---

## 1. CHARACTERS — `/assets/characters/`
Player-selectable roster. Each is a standalone pick on the character-select screen, cosmetic by default (see Build Brief for optional stat asymmetry).

| File | Depicts | Roster ID (suggested) | Notes |
|---|---|---|---|
| `player_explorer_RAW.png` | Adventurer with goggles, backpack/bedroll, mountain-badge armband, teal/brown palette | `explorer` | Strongest silhouette of the three — goggles + backpack read clearly even small. Good default/starter character. |
| `player_skater_RAW.jpg` | Casual Roblox-style boy, skateboard, orange/white | `skater` | Skateboard prop should probably be dropped or reinterpreted for a top-down stealth game context — a skateboard doesn't fit "sneaking," consider recoloring this as a generic casual-outfit option and not depicting the board in the in-game sprite. |
| `player_scout_RAW.jpg` | Girl character, red/black streetwear, cap | `scout` | Strong contrast against the other two (different silhouette + palette), good for at-a-glance distinction on a small screen. |

**Function:** Stored in a `characters` config array (id, name, sprite path, unlock rule). Rendered on `CharacterSelect.tsx` as a grid. Selected character's sprite is what the `player.ts` engine module rotates/renders during gameplay — no gameplay logic differs between them unless you deliberately add stat asymmetry later.

---

## 2. AGENTS — `/assets/agents/`
These are ALL THE SAME enemy character in different equipment states — not five separate enemy types. Map directly to the state machine in the Build Brief.

| File | Depicts | Agent state | Function |
|---|---|---|---|
| `agent_alert_cutlass_RAW.png` | Cutlass drawn, weapon-ready stance | `alert` | Shown briefly when the agent has partial detection (edge of cone / brief glimpse) but hasn't confirmed the player yet. Cone narrows, timer runs, no movement toward player yet. |
| `agent_patrol_flashlight_RAW.png` | Handheld flashlight raised, beam on, neutral stance | `patrol` | Default state. Beam originates from the hand. Slow, predictable sweep (fixed arc or back-and-forth path). This is what's on-screen most of the time. |
| `agent_chase_headlamp_RAW.png` | Headlamp mounted, hands free, alert expression | `chase` | Confirmed detection. Beam now originates from the head (rotates with facing direction, feels relentless). Agent actively pathfinds toward the player's last known position, moves faster than in `patrol`. |
| `agent_tower_security_RAW.png` | Stationary-styled figure, heavy shoulder/back-mounted spotlight rig, "SECURITY" badge with anchor emblem | `tower` (new enemy subtype, not a state) | This is a distinct enemy TYPE, not a state of the base agent — it's stationary or fixed-path only, with a much wider/longer beam than a patrol agent, and never enters `chase`. Use for choke points in level design — an obstacle you route around, not one that hunts you. |
| `agent_drone_RAW.png` | Blue/gold quadcopter drone, single downward spotlight, anchor emblem | `drone` (new enemy subtype) | Overhead-only enemy — its light is a moving circle on the ground below it rather than a directional cone. Moves in fixed geometric patterns (circuits, back-and-forth lines) rather than reacting to the player. Adds a layer of "timing" gameplay distinct from the cone-based agents. |

**Function:** `agent.ts` should support two enemy archetypes total:
1. **Base Agent** (patrol → alert → chase state machine, cone-based light, reactive to player)
2. **Tower** and **Drone** as separate lightweight classes — non-reactive or pattern-based, no state machine needed, just a movement/light pattern function each.

This mix (reactive agents + static towers + patterned drones) is what should carry the difficulty curve — early levels lean on patrol agents alone, later levels layer in towers and drones to force route-planning, not just timing.

---

## 3. ENVIRONMENTS — `/assets/environments/`
Biome tiers for level backgrounds. Each ties to a point in the difficulty curve, not an individual level.

| File | Depicts | Tier | Function |
|---|---|---|---|
| `tier1_bright_day_RAW.jpg` | Cracked earthquake street, bright midday, saturated colors, high visibility | `tier1` (levels ~1–3) | Establishing biome. Teaches the mechanic in a forgiving, highly-visible space. |
| `tier1b_dusk_transition_RAW.png` | Same street biome, sunset lighting, warm orange sky fading to blue, includes an Arxon-anchor-branded clock tower building | `tier1b` (levels ~4–6) | Bridges tier1 into the dark tier — same location, later in the day, visibility starting to drop, streetlamps starting to matter. **This one is worth featuring specifically for its Arxon anchor emblem on the building — nice subtle brand presence, keep that detail if regenerating anything similar.** |
| `tier2_dark_railyard_RAW.png` | Industrial rail yard, night, watchtower + crane, sodium lighting, heavy shadow | `tier2` (levels ~7–9) | Full oppressive-tier biome. Ambient light is minimal — agent light sources should feel like the dominant light source in the scene at this tier. |
| `tier2b_dark_station_RAW.jpg` | Foggy train platform/station, night, moody sodium + teal lighting, rain implied | `tier2b` (levels 10+) | Hardest tier. Fog effect suggests visibility should be mechanically reduced here too (e.g. shrink the player's own sight/reveal radius), not just visually darker. |

**Function:** `environments.ts` config keyed by tier, each entry holding: background asset, ambient tint color, matching obstacle sprite set (crates/rubble for tier1, shipping containers/rail equipment for tier2), and particle style (dust for tier1, fog/rain for tier2). Level number maps to tier via a simple threshold function — adjustable later without touching rendering logic.

---

## PREP CHECKLIST — do this before handing assets to code

**Characters & Agents (all files in `/characters/` and `/agents/`):**
- [ ] Remove background — all current files have a plain white/off-white background, not true alpha transparency. Run through remove.bg or Photoshop before use; code expects transparent PNGs.
- [ ] Crop/center consistently — pad each character equally so rotation-in-code looks correct (an off-center sprite will visibly wobble when rotated toward movement direction).
- [ ] Resize to 512×512px square canvas.
- [ ] Rename by dropping `_RAW` once processed (e.g. `player_explorer.png`), matching the naming convention in the Build Brief.

**Environments (all files in `/environments/`):**
- [ ] No transparency needed — these are full backgrounds, keep them as opaque JPG/PNG.
- [ ] Resize/crop to portrait mobile aspect (1080×1920 baseline) if not already close to that ratio.
- [ ] Keep `_RAW` suffix off once finalized, matching Build Brief naming.

**Known duplicates found in your uploads (not fatal, just noting so you don't think you have more variety than you do):**
- Two additional flashlight-pose agent images were uploaded that are pixel-identical to `agent_patrol_flashlight_RAW.png` — not included again here since they add nothing new. If you intended a distinct second patrol pose, that one didn't come through and is worth regenerating.

---

## WHAT'S STILL MISSING (flag to yourself, not blocking)
- A 4th+ player character to round out the roster beyond three
- A mid-tier environment between `tier1b` and `tier2` if the jump still feels too sharp once in-game
- Confirm whether `tower` and `drone` need their own distinct obstacle-interaction rules (e.g. can the player hide from a drone's downward light behind a roof/awning overlay that wouldn't block a ground-level agent's cone?) — worth deciding before Cursor codes the collision logic, since it changes the occlusion math for that enemy type specifically.
