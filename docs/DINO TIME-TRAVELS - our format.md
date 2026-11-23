---
tags: [format, brand, character, original]
status: episode 1 render paused at 856/960 (host will move to rig v3)
---
# DINO TIME-TRAVELS: our own format

Goal: keep what works in the reference style (true underdog story, physics/history payoff, toon 3D world + flat cards,
ink, DOF, gliding camera) and add things **nobody on YouTube/TikTok does in this style**:

| Element | What it is | Why |
|---|---|---|
| **Dino, an on-screen host** | Original green dinosaur in a yellow hoodie: big white-sclera eyes, orange back plates, sways his tail, 7 expressions, 6 arm poses | A recurring face builds parasocial attachment (people return for a *character*, not just a topic); the reference has an invisible narrator only |
| **Lip-sync from the audio** | `mouth.ts`: per-frame loudness envelope → 8 mouth levels (fast open, soft close) | The host *talks* in human language; it feels alive |
| **Host walks through history** | Dino stands inside each scene, points, reacts, gets angry, panics, makes 4th-wall jokes ("She found my cousin") | Emotional contagion + humour + gives the viewer someone to watch with |
| **Time-portal transition** | Code-drawn spinning green/white/blue conic portal + flash at era jumps | Signature brand moment, recognisable in 0.3 s |
| **Brand captions** | One word at a time; keywords in Dino green `#7CFC6A` | Readable + branded |
| **Running gag** | Dino's personal connection to prehistoric creatures, a tongue-twister/flub at the end | Payoff + rewatch |

## Dino spec (src/videos/dino/dino.ts)
- Canvas 600x1000, soles at y=975 (same as the cast), body green `#57c065`, snout `#7fd88a`, plates `#ff8a3c`, hoodie `#f6c43c`.
- `DinoOpts`: mouth 0..1, expr happy|talk|shock|angry|smug|proud|tangled, look -1..1, blink, arm none|wave|point|hips|shrug|photo|facepalm, tail sway, lean.
- Keys are quantised (mouth 1/7, tail 1/6) so canvases are reused → render speed stays ~3 s/frame.

## Voice
- Dino: ElevenLabs `eleven_multilingual_v2`, "Arthur - Energetic American Male Narrator" (TtRFBnwQdH1k01vR0hMz). Episode 1: 101 words in 32 s.

## Episode list
1. **Mary Anning**: the girl who found a sea monster and was called a fake (rendering). See [[Dino 01 - Mary Anning]].

## Ideas for next episodes (true, underdog + payoff, Dino connection)
- The man who said birds are dinosaurs (Huxley) → Dino: "Pigeons are my cousins too."
- Bone Wars: two scientists sabotaging each other with dynamite.
- "Scrotum humanum": the first dinosaur bone was named after a giant body part (true, 1763).
- The kid who found a T. rex (Sue Hendrickson's dog Gypsy? / 2022 kids find T. rex).

---
Back to [[00 HOME - Channel HQ]]
