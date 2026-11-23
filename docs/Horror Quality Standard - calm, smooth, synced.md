---
tags: [standard, horror, 2d, checklist, training]
updated: 2026-11-22
origin: user feedback on Horror 01 part 1 v1 ("kaku", not smooth, not calm) → v2 rebuild
---
# Horror quality standard (apply to EVERY horror video, before the first render)

The user's bar: **"tenang tapi horror bener-bener, smooth parah, ukuran pas, semua singkron."** v1 failed this. These are the rules that fix it.

## 1. One timeline file drives picture AND sound
- `timeline.json` = voice placement, shot ranges, dissolves, every cue time, stir/clock/heart/breath rhythms.
- `make_audio.py` reads it for voice + SFX; the shots read it via `types.ts` (`CUE()`, `SHOT_RANGE()`, `stirPhase()`, `heartPulse()`, `breathPhase()`).
- Never type a time twice. Rhythmic actions (stirring, clock, heartbeat, breathing) are a phase function shared by both sides.

## 2. Smooth
- **Motion blur:** 5 sub-frames per frame, averaged (shutter 180°).
- **Camera:** slow eased push (≤ 0.1 zoom per shot) + smooth sine drift. **No per-frame random shake, ever.** One decaying shake only on the final smash.
- **Actors:** every motion uses `move()` (smootherstep) or `settle()` (ease-out + small overshoot); heads turn over ≥ 0.8 s; everyone breathes (`pose.breath`); nobody is ever frozen, nobody moves fast.
- **Torch:** gentle brightness breathing + smooth dips on story beats; no random stutter.
- **Grain** changes every 2 frames at alpha ≈ 0.10.

## 3. Calm horror (not jump scares)
- Pace with silence: 1-1.5 s of nothing before every key line (kitchen call, wall whisper, final call).
- No red flashes / stings except ONE at the final smash. Dissolves are slow dips through dark (≈ 1.1 s total).
- Sound bed: room tone, wind in the bamboo, crickets that **stop** when the thing speaks, a drone that climbs over the whole part. Bed at -12 dB.
- Fear comes from wrong details, stillness, too-tall shapes, giant shadows, and things the viewer only notices on rewatch.

## 4. Depth (2D that feels like a space)
- `L(depth)` parallax: background 0.6, mid 1.0, **at least one blurred foreground element per shot** at 1.6.
- Torch **volumetric beam + dust motes** inside the cone.
- **Giant cast shadows** (`castShadow`) from the torch / stove / candle onto walls.

## 5. Size bible (1080x1920)
- Standing adult: wide = 35 % of frame height, medium = 60 %, close-up head = 45 %.
- Keep the same character the same size within a shot type across shots.
- **Head = 1/7.5 of the body** (≈ 0.13 of standing or lying length). profile() scale = head height in px. A lying 640 px body → head ≈ 88 px. User caught a 2x head on lying Mbah ("why the head so big lol").
- Foreground blur elements: thin (≤ 50 px) and at the frame edge; never a wide dark band over the action.
- **TikTok safe zones:** captions centred around x 500 (max width 820), top ≈ y 1150; header at y 210; nothing important in the bottom 22 % or the right 150 px between y 900-1600 (UI icons).

## 6. Sync checklist (QA before the full render)
- Spoon hits = arm at the front of the pot · clock ticks = second-hand steps · heartbeat = zoom pulse · breath SFX = chest rise · torch click = light on · crickets stop = voice starts · words type with the ElevenLabs word timestamps.
- Render stills ON the cue frames (not random frames) and check each pair.
- Final audio true peak ≤ -1 dBFS (limiter 0.70 after AAC), ≈ -14 to -16 LUFS.

## 7. Speed
- Split big builds across parallel agents with a fixed contract file (`types.ts`): engine / shots A / shots B in separate files, then integrate + QA.
- Re-render only the frame ranges that changed (`--frames=a-b`), then merge with 4-digit names.


## 8. Alive, natural motion (from Horror 02, user: "pegangan/gerak-gerak natural parah, terasa hidup, gak kaku")
- People = side-view rig (horror2/rig.ts): two-bone **IK** (eachF/reachB world targets) + **grips** (open, fist, torch, glass, beater, point, cig) + handAnchor() to draw held objects exactly in the hand + drawGripFingers() so fingers wrap in front of a glass.
- Everyone has idle {t, seed}: head glances, weight shift, breathing, finger settle, sarung sway. Nobody is ever frozen.
- Walk: heel-strike/toe-off, knee flex, counter arm swing with elbow bend, head bob < hip bob, per-person stride 0.9-1.1 and phase offsets.
- Actions get anticipation (head turns first, then the arm), staggered timing between people, and settle at the end.
- Sitting: pose.sit at the real seat height, slight slouch, hands on thighs by default, feet flat if possible.
- Micro-detail list per set (cicak, moth shadows, swaying cloth, smoke, puddle reflection, dog lifting its head, footprints, spider web, stains, small objects). Keep the caption zone (y 1100-1450) clear.
- Dialogue lines clear 0.1 s before the next narration word (no overlapping text).
- Never ctx.filter = blur over textures made of thousands of strokes (it hung a render).
- Rig QA sheet (H2Rig composition) before any shot work; check the throat/neck sliver and hand anatomy.
---
Back to [[00 HOME - Channel HQ]] · used by [[Horror 01 - Dipanggil Dua Kali]]
