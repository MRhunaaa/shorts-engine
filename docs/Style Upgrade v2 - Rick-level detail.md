---
tags: [short, style, upgrade, checklist]
video: "[[Hot Ice Cream - Mpemba]]"
status: delivered (HotIceCream_v2_phone.mp4)
---
# Style upgrade v2: what the reference does that v1 didn't

Studied consecutive frames (5 fps) of the reference railroad short plus `references/STYLE_BIBLE.md`.
v1 was too stiff: static poses, hard cuts, pale world, little secondary motion.

## What the reference does (measured / seen)
- **Camera is always alive**: ~80 % holds with slow push, then **ease-out bursts** (peak speed on frame 1, decay over 8-10 f).
- **Whip pans with heavy motion blur** instead of hard cuts; fly-throughs; follow an object between subjects.
- **Acting**: hands gesture (handshake, point, hands on hips), head tilts, expression swaps; angry = colour + steam puffs from the head.
- **Something always moves**: birds in the sky, smoke plumes, flags/bunting, steam, dust.
- **Colour**: very saturated, deep shadows (p2 luma 0.03-0.11), warm key + blue/purple shade.
- **Rich sets**: every frame layered foreground / subject / background with lots of props.
- Characters big in frame (MCU), at frame edges, two-shots with eye-lines.

## v2 changes (implemented in `src/videos/ice/`)
| area | change | file |
|---|---|---|
| camera | whip-pan transitions (yaw burst + screen-space motion blur) at 2→3, 3→4, 4→5, 7→8, 8→9 | story.ts, motionblur.ts, Bridge.tsx |
| camera | motion blur effect driven by camera angular speed | motionblur.ts |
| acting | squash & stretch on every reaction, breathing, jump on shock, laugh bounce | cast.ts, world.ts (`sy`, `dy`) |
| acting | Erasto walks in carrying the pot; the pot flies into the freezer as a real 3D object | cast.ts, world.ts |
| acting | talking mouths on spoken lines ("Enjoy your hot soup!", teacher's line) | toon.ts (`talk`), cast.ts |
| acting | teacher angry emote: steam puffs from the head | cast.ts |
| fx | birds, falling leaves, frost flakes out of the freezer, sparkles on the solid ice cream, speed lines, dust puffs | cast.ts |
| world | warmer saturated school (yellow wall, teal shutters), bunting, Tanzania flag, water barrel, banana plants, benches, bell | world.ts |
| grade | saturation up | lights.ts |

## Rules to remember (don't get confused next time)
- Render on this laptop (Intel UHD 620, 4 threads): **~2.6 s/frame at 720x1280** → ~60 min for 45 s. Full 1080 = ~70+ min.
- Render as **JPEG sequence** (`--sequence`, scale 0.666666666667); h264 refuses the 720.0000004 px width.
- Crossfade frames are heavy: use `--timeout=240000`.
- Never round-trip source files through PowerShell `Get-Content`/`Set-Content` (it breaks UTF-8 characters such as arrows).
- Phone delivery limit is 30 MB: send `HotIceCream_phone.mp4` (CRF 20).
- Audio: `audio/make_audio.py` locks music at −6 dB and SFX at ≤ −6 dB vs. the voice; `scripts/finish.ps1` muxes, normalizes loudness and runs QA.

---
Back to [[00 HOME - Channel HQ]]
