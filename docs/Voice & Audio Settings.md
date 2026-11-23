---
tags: [voice, audio, elevenlabs, settings]
updated: 2026-11-22
---
# Voice & audio settings (tested)

## Voices (ElevenLabs, via the creative MCP)
| Use | Voice | ID | Model | Measured pace | Verdict |
|---|---|---|---|---|---|
| Video 1 | K. V. Hagen (deep warm narrator) | t1yzxMpe9zK42bXmI1T2 | eleven_v4 | 2.3 words/s | too slow |
| Video 2 test | Ethan (energetic YouTube narrator) | uB5dGadiIOtRLnqbQl9M | eleven_v4 | 2.4 w/s | too slow |
| **Default narrator** | **Ethan** | uB5dGadiIOtRLnqbQl9M | **eleven_multilingual_v2** | **3.2-3.6 w/s** | ✅ reference pace (3.7) |
| Dino host | Arthur (energetic American male) | TtRFBnwQdH1k01vR0hMz | eleven_multilingual_v2 | 3.2 w/s | ✅ fun host voice |

Rule: `eleven_v4` reads slowly; use `eleven_multilingual_v2` for Shorts pace.
Transcription: `creative_transcribe_audio` (eleven_scribe_v1, 0 credits) gives word timestamps; it transcribes the speech node's latest take.

## Lip-sync (Dino)
`mouth.ts` from the voice: per-frame RMS → fast-open / soft-close envelope → `clip((env-0.25)/0.7)^0.9` → 8 levels. ~75 % open frames.

## Music + SFX (all synthesized in Python, `audio/make_audio.py`)
- Music: march loop (kick, brush snare, plucked bass, marimba melody, off-beat chord plucks), 112-124 bpm; stops before the payoff, low drone, sting chord on the last word.
- SFX library: whoosh, clank, ting, boing, bonk, creak, slosh, sizzle, sting_hit, shimmer, steps, thump, slap, ratchet, ooh (crowd), fanfare, buzz (propeller + doppler), hum, ticks, whistle_down, splash, applause.
- **Level lock (never by hand):** music = exactly -6 dB vs voice gated RMS; SFX ≤ -6 dB with peaks ≤ 0.7× voice peak. Measured each video: music -6.02 dB, SFX -6.0 to -8.5 dB.
- Finish: one linear gain to ≈ -14 LUFS, -1 dBFS limiter (final measured -15 LUFS, peak -0.4 to -0.9 dBFS).
- SFX density: sparse, on story events only (≈ 15-30 per 30 s including small ticks).
