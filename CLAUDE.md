# CLAUDE.md — how this project works (read first)

Remotion project that renders vertical Shorts fully from canvas code. One composition per video in `src/index.tsx`.

## Rules that produce the approved result
- Read `docs/Horror Quality Standard - calm, smooth, synced.md` and `docs/Lessons Learned & Mistakes.md` before building anything.
- `timeline.json` is the single source of truth (shots, cues, rhythms) for BOTH picture (`types.ts`: CUE, SHOT_RANGE, walkPhase, breathPhase, heartPulse) and audio (`audio-pipeline/*/audio/make_audio.py`). Never type a time twice.
- Calm horror: eased motion only (move/settle), no per-frame random, one sting at the end, silences before key lines.
- Size bible (1080x1920): standing adult wide 0.35 H, medium 0.6 H; head = 0.13 of body (the rig does it; never scale heads). Text safe zones: header/labels y 200-430 left, captions y 1110-1460 centre, keep the bottom 22 % and right 150 px (y 900-1600) clear.
- Detail: 40+ small living details per shot at 3 parallax depths with fog between; cache static detail in offscreen canvases per pass (`p.mode`) for render speed; deterministic `hash()` only.
- Characters are code-drawn (side-view rig in `src/videos/horror2/rig.ts`, cast in `src/videos/horror3/cast.ts`).
- Big builds: write the contract files first (types.ts, kit.ts, cast.ts signatures, BRIEF.md), then split shots across parallel agents, one file each, each doing QA stills on cue frames; the lead checks sizes, text zones and oddities before the full render.
- True-story episodes: only facts the sources support, documentary voice, never claim the supernatural as fact; list sources.
