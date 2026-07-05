# DEPTH WATCH — CHARACTER REALISM & PHYSICAL WORLD FIX
### Addendum to 01-BUILD-BRIEF.md and 02-ASSET-MAP.md — give this to Cursor alongside those two documents.

## WHY THE CURRENT BUILD LOOKS WRONG (diagnosis, for context)
The characters currently render as if they're photographs pasted on top of the map and spun to point in a direction. Two causes:
1. Sprite backgrounds were never made transparent, so each character carries a visible white card behind it.
2. The code rotates the entire sprite image to face movement direction, like a compass arrow — real characters don't spin like that. They stay upright, lean into turns, and their legs/body communicate direction, not a rotation transform.

This document fixes both, and adds the physical interactions requested: walking, running, jumping, and pressing into cover to physically break line of sight — the way it works in Killer Bean.

---

## PART 1 — FIX NOW (achievable with the single-pose images you already have, no new art required)

These changes alone will make an enormous visual difference, and none of them require new character art.

### 1. Transparent backgrounds (blocking issue — do this first)
Every character/agent PNG must have its background removed before it touches the game. This is non-negotiable and explains most of the "floating card" look. Batch-process all files through remove.bg or a Photoshop/GIMP alpha-cut pass. No code fix substitutes for this.

### 2. Ground anchor point, not center-point positioning
Every character sprite must be positioned by its **feet**, not its geometric center. Concretely: define an anchor offset (e.g., "feet are at 90% down the image height, horizontally centered") and position/scale the character so that anchor point sits on the world coordinate — not the image's center. This single change is why characters in real games look like they're standing on the ground instead of floating over it.

### 3. Drop shadow, not rotation, sells "standing in the world"
Render a soft dark ellipse beneath the character's feet anchor — scale it slightly larger when the character is stationary, slightly smaller/tighter when moving fast (subtle, but this is exactly what makes Subway Surfers/Killer Bean characters feel grounded rather than pasted-on). This shadow should also darken/shrink appropriately when the character is in shadow/cover (ties into the hiding mechanic below).

### 4. Replace full rotation with directional FACING, not spinning
Stop rotating the whole image continuously. Instead:
- Horizontally flip the sprite (mirror) when moving left vs. right — this alone handles half of all directional feedback with zero new art.
- Allow a small lean/tilt (5–10 degrees max, not 360-degree spin) in the direction of movement, applied to the sprite as a slight skew, to suggest momentum — like a person leaning into a jog.
- Do NOT rotate to point exactly at movement angle like an arrow. A character moving diagonally up-left should face left (mirrored) with a slight forward lean, not rotate 135 degrees.

### 5. Walk-cycle bounce (fakeable with a single static image)
Even without hand-drawn walk-cycle frames, apply a rhythmic vertical bob (small sine-wave offset, a few pixels, timed to movement speed) plus a slight horizontal squash/stretch on the body while moving. This is the same trick used in countless mobile games with single-pose character art — it reads as "walking" far better than a static image sliding across the screen.

### 6. Speed states: walk vs. run
- `walk`: default movement speed, normal bob rate
- `run`: triggered by holding a sprint input (or automatically above a joystick-tilt threshold — full joystick deflection = run, partial = walk), faster bob rate, slightly longer stride-lean, higher movement speed, but — critically — louder/wider detection radius or noise footprint if you want running to carry risk (a real stealth-game tradeoff: run to cover ground fast, but agents notice you more easily)

### 7. Jump (context-triggered, not a general free jump)
Rather than a floaty free-jump (which doesn't fit top-down stealth), implement jump as a contextual action: triggered near a specific obstacle type (a low wall, gap, or ledge tile you mark in level data as "vaultable"). On trigger: brief vertical scale-up + forward arc motion + landing squash, then normal state resumes. This mirrors how Killer Bean and most top-down action games actually handle jumping — it's an obstacle interaction, not unrestricted flight.

### 8. Physical cover — the core "hide behind a rock" mechanic
This is the most important fix and needs to be a real state, not just a distance check:
- Define cover objects (rocks, walls, crates) with a "cover edge" — the side(s) that count as huggable.
- When the player moves into contact with a cover edge (not just near it — actually touching, i.e. collision-resolved against that edge), trigger a `hiding` state: character sprite swaps to a pressed-against-wall pose if you have or can generate one (leaning/crouched silhouette), or at minimum shrinks slightly and shifts visually flush against the object.
- While `hiding` and positioned so the cover object sits between the character and an agent: exposure drops to zero regardless of the agent's cone math — full guaranteed break of line of sight, not a probability. This is what makes hiding feel trustworthy and skill-based rather than random.
- Moving away from the cover edge (any directional input) exits `hiding` immediately and resumes normal movement.
- Optional but recommended: a "peek" — while hiding, a separate small button or edge-swipe lets the character lean out just enough to see past the cover (camera/view only, doesn't break the hidden state) so players can time their next move without committing.

---

## PART 2 — NEEDS NEW ART (flag as next asset-production step, don't block current build on this)

To go beyond "single pose + code tricks" into true animated realism like Killer Bean's actual walk cycles, you eventually need real animation frames, not just one static pose per character:
- A walk-cycle sprite sequence per character (4–8 frames covering one full stride) instead of a single standing pose
- A separate "hiding/pressed against cover" pose per character (distinct art, not just a shrink of the standing pose)
- A run-cycle sequence, distinct from the walk cycle (longer stride, more forward lean) if you want running to look meaningfully different from fast-walking rather than just faster
- A landing/vault pose for the jump interaction

This is a real production step (either frame-by-frame Blender renders like your Sea Haven pipeline, or AI-generated sequential frames with heavy manual consistency-checking) — it's the difference between a good stealth game and a great-looking one, but Part 1 above will already look dramatically more real than what you currently have, and works with zero new art. Treat Part 2 as the v2 polish pass once the mechanics in Part 1 are confirmed to feel right.

---

## PRIORITY ORDER FOR CURSOR
1. Strip white backgrounds from all current sprites (blocking, do first)
2. Feet-anchor positioning + drop shadow
3. Kill the rotation-to-face-movement code, replace with flip + slight lean
4. Walk bounce + run state
5. Physical cover/hiding system (this is the mechanic that actually matters most to the "feels real" goal — prioritize it above jump)
6. Contextual jump/vault
7. Flag Part 2 (real animation frames) as a follow-up art request, not part of this build pass
