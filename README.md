# Shorts Engine: code-drawn animated Shorts (horror "Tinta Senter" + cartoon true stories)

A Remotion (React + canvas) project that renders 1080x1920 vertical Shorts **entirely from code**: no AI images, no stock footage. It includes:

- **Horror line "Tinta Senter"**: woodcut ink on cream paper revealed by torch/lantern light; dark navy + lit paper passes multiplied by a light map; 5-sub-frame motion blur; parallax; volumetric beams + dust; ink-blot dissolves; typewriter captions typed on ElevenLabs word timestamps; documentary lower-thirds. Episodes: `src/videos/horror1`, `horror2`, `horror3` (true story "Kabut Lalijiwo").
- **Side-view character rig** with two-bone IK, hand grips, idle micro-life, walk cycles (`src/videos/horror2/rig.ts`) and a detailed cast (hikers, Javanese court dress, farmers, offering hand: `src/videos/horror3/cast.ts`).
- **Cartoon true-story Shorts** with the circle-head character rig (`src/videos/ice`, `flop`, `wright`, `dino`, `ward` 3D).
- **Audio pipeline** in Python (numpy only): synthesized ambience + SFX placed from the same `timeline.json` that drives the picture (`audio-pipeline/`).
- **Docs** (`docs/`): the quality standard, lessons learned (60+ mistakes and fixes), pipeline runbook, voice settings, character specs, episode notes.

## Quick start
Requirements: Windows/macOS/Linux, Node 20+ (tested 24), Chrome, ffmpeg, Python 3 with numpy + Pillow.
```bash
npm install
npx remotion studio src/index.tsx          # preview every composition (Horror3, Horror2, BridgeShort, ...)
# stills for QA
COMP=Horror3 node scripts/bridge-stills.mjs out/q_ "0,300,900" 0.5
# full render (JPEG sequence) then finish (mux + loudness + phone encode)
npx remotion render src/index.tsx Horror3 out/frames_horror3 --sequence --image-format=jpeg --concurrency=4
```
Audio: `python audio-pipeline/horror3/audio/make_audio.py <folder-with-voice/voice.wav> src/videos/horror3/timeline.json` → copy `audio/mix.wav` to `public/horror3_mix.wav`, then run `scripts/finish_horror3.ps1` (PowerShell; adapt paths) or the ffmpeg lines inside it.

## Make your own episode (same result as ours)
1. Read `docs/Horror Quality Standard - calm, smooth, synced.md`, `docs/Lessons Learned & Mistakes.md`, `docs/Pipeline - Runbook (step by step).md`.
2. Write a ~150-word script (hook in the first 1.5 s, silences before key lines). Generate the voice (we use ElevenLabs, `eleven_multilingual_v2`) and transcribe it for word timestamps → `words.ts`.
3. Copy `src/videos/horror3/` to a new folder, edit `timeline.json` (shots + cues = single source of truth for picture and sound), then the shot files. `src/videos/horror3/BRIEF.md` is the exact brief we give to (AI) builders: size bible, detail density, text safe zones, performance rules.
4. QA stills on cue frames → full render → audio → finish.

### Using it with Claude Code
Open this folder in Claude Code; `CLAUDE.md` tells it how the project works. Connect your own ElevenLabs (voice) account; everything else runs locally.

## Notes
- The included voice audio is not shipped (generate your own). Fonts: system Courier New / Impact.
- Horror episodes 1-2 are fiction; episode 3 is a true story told documentary-style from news reports (sources in `docs/Horror 03 - Kabut Lalijiwo.md`).
- License: MIT for the code (see LICENSE). Docs CC BY 4.0. Contains parts derived from the MIT-licensed `claude-animated-shorts` template.
