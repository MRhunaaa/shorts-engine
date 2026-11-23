---
tags: [pipeline, runbook, technical]
updated: 2026-11-22
---
# Pipeline runbook: idea → finished MP4 on the phone

Machine: Windows 11, Intel UHD 620, 4 threads, Node 24, Python 3.15 (numpy, Pillow), ffmpeg 9.1, Chrome (used by Remotion).
Project: `%USERPROFILE%\shorts\hot-icecream` (one Remotion project holds all videos). Per-video audio/voice folders: `~/shorts/<slug>/`.

## 0. Engine
- Base: MIT repo mromidev/claude-animated-shorts (`~/shorts/cas`), `templates/bridge` copied per video into `src/videos/<slug>/`.
- Files per video: `story.ts` (shots, cameras, DOF, kicks, whips), `world.ts` (3D set), `cast.ts` (characters + fx per shot), `toon.ts` (2D card drawing), `Bridge.tsx` (post chain, captions, flashes/portal), `motionblur.ts`, `words.ts` (+ `mouth.ts` for lip-sync).
- Compositions registered in `src/index.tsx`: `BridgeShort` (ice), `FlopShort`, `WrightShort`, `DinoShort`.

## 1. Story (≈15 min)
1. Pick a TRUE underdog story (mocked → proven right) with a visual cause/effect. Verify with web search; note sources + what is invented.
2. Script 90-105 words: hook = paradox as fact; mockery; "You see," pivot; ironic last line that calls back to line 1 (loop).

## 2. Voice (≈5 min)
- ElevenLabs via the creative MCP: `creative_create_flow` → `creative_generate_speech` (model **eleven_multilingual_v2**, voice **Ethan** `uB5dGadiIOtRLnqbQl9M` = 3.6 words/s; or Arthur for Dino). Default 2 takes.
- Download both takes (curl), pick by length. `creative_transcribe_audio` with `connect_from` = the speech node → word timings (it transcribes the SECOND take; check `source.url`).
- Save words: `python -I %TEMP%\w.py words.json src\videos\<slug>\words.ts`. TOTAL frames = round(duration × 30).

## 3. Build (≈60 min)
- Copy the previous video folder, rewrite `story.ts`, `cast.ts` stage section, `world.ts` set.
- Typecheck: `npx tsc --noEmit` (ignore the template's `Element | null` errors in Bridge.tsx).

## 4. Stills check (3-4 rounds, ≈10 min each)
```
$env:COMP="WrightShort"; $env:REMOTION_TMP="$env:USERPROFILE\shorts\rtmp"
node scripts/bridge-stills.mjs out/xx/s_ "0,50,120,..." 0.5
python -I scripts\sheet.py out/xx/s_ out/xx/sheet.jpg
```
Look for: hook visible on frame 0, nothing blocking the lens, props in frame, text readable, effects not covering faces/text.

## 5. Full render (≈40-60 min)
JPEG sequence at 720x1280 (h264 rejects the 720.0000004 px width from scale 2/3):
```
npx remotion render src/index.tsx WrightShort out/frames_wright --sequence --image-format=jpeg --jpeg-quality=95 --gl=angle --browser-executable="C:/Program Files/Google/Chrome/Application/chrome.exe" --concurrency=4 --timeout=240000 --scale=0.666666666667
```
- Speed ≈ 2.6-3 s/frame. Crossfade frames are heavier (needs `--timeout=240000`).
- Resume a stopped render: `--frames=<first-missing>-<last>` into a second folder, then move the JPEGs into the main folder.
- **Dino 01 resume:** frames 856-959 missing → `npx remotion render src/index.tsx DinoShort out/frames_dino2 --sequence --frames=856-959 ...` then move into `out/frames_dino`.

## 6. Audio (≈5 min)
`python -I ~/shorts/<slug>/audio/make_audio.py ~/shorts/<slug>` → `music.wav`, `sfx.wav`, `mix.wav` (levels printed). Edit the `cues` table per story.

## 7. Finish + deliver (≈5 min)
`powershell -File scripts\finish_<slug>.ps1` → upscale to 1080x1920 (lanczos), mux, one linear gain to about -14 LUFS, -1 dBFS limiter, freeze/black QA, QA sheet, phone copy (CRF 20, must be < 30 MB) → `SendUserFile`.

## Timings (this machine)
Story 15 min · voice 5 · build 60 · stills 30 · render 40-60 · audio 5 · finish 5 → **≈ 2.5-3 h per video**, render is the bottleneck.
