---
tags: [video, horror, 2d, tinta-senter]
status: part 1 v2 delivered (2026-11-22) out/DipanggilDuaKali_1_v2_phone.mp4, 71.0 s, 27.8 MB, true peak -2.1 dBFS (v1 66 s superseded)
standard: "[[Horror Quality Standard - calm, smooth, synced]]"
v2: timeline.json drives audio+picture; types.ts contract; scenesA.ts / scenesB.ts / Horror1.tsx built by 3 parallel agents; 5-subframe motion blur; parallax + blurred foregrounds; beams + dust; giant shadows; silences before key lines; single sting at the smash
format: 3 parts (~66 s each) + "cerita lengkap"
composition: Horror1 (src/videos/horror1/)
voices: Fikri (narrator, uzkxbhFCx9Ni2LANf1zB) · yohana (Ibu, 3LbF2aYdhN7is4EhoBtI) · Hasan +3 semitones (Bayu, 7rx5oOvFPuY9Tk3rmqbX), all eleven_v4
flow: ElevenLabs flow MbYxNKqQrrZv68Opuc2H
---
# Horror 01: "Dipanggil Dua Kali" (Called Twice)

Inspired by the *format* of [[Reference Study - Kelir Malam (horror)]] (Nusantara folklore rule + series in parts), but **nothing copied**: our own look, our own type, our own story mechanics, and more psychological.

## How we are different from Kelir Malam (on purpose)
| | Kelir Malam | Ours ("TINTA SENTER") |
|---|---|---|
| Look | amber shadow-puppet screen, flat silhouettes | **woodcut ink on cream paper, revealed only by a torch beam**; outside the beam is moonlit navy. Every shot is painted twice (dark pass + lit pass) and the light map decides what you are allowed to see |
| Colour | amber + cold blue | navy + paper cream + **one blood red** (supernatural only) |
| Narrator | calm storyteller, "kami" | **first person, unreliable** ("aku"): adult Bayu who lies to himself |
| Dialogue | subtitles | **the voices are not subtitles**: the kitchen voice's words fly out of the doorway as red cut letters; the whisper appears trembling in the wall |
| Text | serif, amber keywords | typewriter narration typed live with a red cursor, red keywords, rubber-stamp title cards |
| Transitions | dissolves | **ink-bleed blots** + smash cuts with red flash and shake |
| Scare engine | something outside, slow consequence | **doubt**: two identical mothers, and a clue that the viewer heard but the narrator denies |

## Rule from Mbah
"Lewat jam dua belas, kalau ada yang manggil dari dapur... jangan dijawab."

## Part 1/3 (built): 66 s, 11 shots
| # | Time | Shot | Notes |
|---|---|---|---|
| 1 | 0-3.0 | cold open: plaster wall, the whisper "JANGAN DIJAWAB, LE. IBU DI SINI." appears in the wall | sting + red flash, then stamp title DIPANGGIL / DUA KALI |
| 2 | 3-9 | bedroom: Bayu sits up under the blanket, torch sweeps to the doorway, Ibu's silhouette is standing there | "Ibu nggak pernah manggil aku pakai nama... cuma Le." |
| 3 | 9-15.2 | Mbah's portrait with black ribbon, kemenyan smoke, calendar: 40 days get crossed out; at the end the portrait's head turns | |
| 4 | 15.2-21 | exterior: house with one warm window, sugar factory chimney with blinking red light, Bapak cycles away | |
| 5 | 21-29.5 | red flashback: Mbah on the amben grips Bayu's wrist; on "jangan dijawab" her head lifts and turns to us | |
| 6 | 29.5-38 | clock 00:13 → corridor dolly to the kitchen: red stove glow, a figure stirring a pot (spoon SFX) | |
| 7 | 38-41 | "Le... ambilin air." flies out of the kitchen as red letters; crickets stop | |
| 8 | 41-46 | Bayu's profile, shaking torch, heartbeat zoom. **At 44.5 s his lips move and a faint "Iya, Bu" is heard** while he narrates "aku hampir jawab" | the planted clue for part 3 |
| 9 | 46-54.2 | the wall between the rooms: a hand presses through the plaster, cracks spread, the whisper appears | |
| 10 | 54.2-61.6 | split screen: a figure too tall for its room (neck bent at the ceiling) / the one in the kitchen. Kitchen takes over, stops stirring, turns, two pale eyes. "LEEE..." fills the screen | smash cut |
| 11 | 61.6-66 | BERSAMBUNG stamp, "BAGIAN 2 · BESOK 19.00", "jangan dijawab.", @mhclipdawg | |

## Part 2 / Part 3 plan
- **Part 2 "Dua Suara":** both voices are Ibu; Bayu tests them ("nama kucing kita siapa?"), both answer at once; the room shadow is too tall for the doorway; cliffhanger: the room voice says "**Bayu**, sini." (Ibu never says his name.)
- **Part 3 "Yang Manggil Nama":** he runs to the kitchen; the real Ibu is crying: "Kok kamu jawab, Le?" He realises he answered in part 1. Then from his own room, in his own voice: "Bu... ambilin air." End text: "Perhatiin detik ke-44 Bagian 1." Last line to the viewer: "Kalau nanti malam namamu dipanggil dua kali... kamu yakin yang pertama itu bukan kamu?"

## Audio (part 1)
`~/shorts/horror1/audio/make_audio.py`: voice timeline assembled from 3 takes (kitchen lines get a 1.6 s reverb + band limit, the boy line is pitched +3 semitones at -16 dB). Bed = 41 Hz drone + tritone cluster for the two voices + crickets that **stop** when the kitchen calls. SFX: stings, title thud, ink whooshes, torch click, clock ticks, spoon circling the pot, heartbeat, wall breathing. Measured: music -12.0 dB, SFX -6.0 dB, SFX peak 0.67x voice.

## QA log
1. Camera pushes showed black borders → camera centre clamped so the view always stays inside the painted frame (min zoom 1.03).
2. First figures were stiff blocks → new anatomy (sloped shoulders, kebaya peplum, jarik, two-segment arms, hands) + a real side-profile head for close-ups.
3. Bayu stood in the middle of the bed → now sits up under the blanket, bigger, torch arm aimed at the door.
4. Lying Mbah was built from a rotated standing figure (head off-screen) → profile head on a pillow + jarik mound.
5. `-(x) ** 2` is a syntax error in esbuild → Gaussian helper `gs(x, w)`.
6. Final QA: true peak was +1.0 dBFS with limiter 0.891 (AAC overshoot on the stings) → limiter 0.70 → -0.8 dBFS.
7. Caption showed "slow]" (half of the v4 tag `[quietly, slow]`) → caption filter drops any word containing [ or ].
8. Kitchen letters read bottom-up ("AIR / AMBILIN / LE") → fixed rows top-down, smaller growth. Only frames 90-260 and 1150-1265 re-rendered.
9. Grain makes the CRF-17 master 157 MB → phone file encoded at 3.3 Mbps (25.7 MB). The clue frame (44.6 s: lips parted) verified.

## Files
- Code: `src/videos/horror1/` (paint.ts, scenes.ts, Horror1.tsx, words.ts)
- Voice + audio: `~/shorts/horror1/voice/`, `~/shorts/horror1/audio/`
- Frames: `out/frames_horror1/` · finish: `scripts/finish_horror1.ps1` → `out/horror1_final.mp4`, `out/DipanggilDuaKali_1_phone.mp4`
- QA stills: `out/horror1/sheet1.jpg`, `sheet2.jpg`

---
Back to [[00 HOME - Channel HQ]]
