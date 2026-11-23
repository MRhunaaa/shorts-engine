---
tags: [video, horror, 2d, tinta-senter, ronda]
status: user approved → uploaded PRIVATE to "Jangan Dijawab" (2026-11-23), video id QPcj3kpWR18, https://youtu.be/QPcj3kpWR18 ; title "Ronda Berempat, Tapi Kopinya Lima Gelas… | Gelas Kelima", category 1, 14 tags; user chose "tunggu jadwal" → SCHEDULED: publishAt 2026-11-24T12:00:00Z (Tue 19.00 WIB), processed, selfDeclaredMadeForKids=false, containsSyntheticMedia=true (set via proxy PUT videos?part=status; works through the API). File: out/GelasKelima_phone.mp4 (73.5 s, 29.0 MB, -1.0 dBFS TP)
upload_method: local file → presigned PUT into the Composio staging slot (workbench /api/v3/tool_router/internal/presigned_url) → YOUTUBE_MULTIPART_UPLOAD_VIDEO with that s3key
rounds: v1 (side rig) → v2 (IK hands, grips, idle life, micro-detail) → v3 (internal cuts/inserts, POV, five wall shadows, pale figure in the beam, five sandal pairs, barefoot prints, cat/clock at countHome5)
composition: Horror2 (src/videos/horror2/)
voices: Fikri (narrator) · Arthur - Wise Indonesian Narrator (Pak Darto, tX4zpyB6s34no1FgD0Mm) · Hasan (Udin), all eleven_v4
flow: ElevenLabs flow ca66DihA9tWnon8UN8LY
standard: "[[Horror Quality Standard - calm, smooth, synced]]"
---
# Horror 02: "Gelas Kelima" (The Fifth Glass)

A standalone story, ~73 s, for the "Jangan Dijawab" channel.

> ⚠️ **FICTION.** Written by Claude from common folklore motifs (ronda malam, malam Jumat Kliwon, the uninvited guest, the extra person in a count); Pak Darto, Udin and the events are invented. Made before the user's 2026-11-23 rule "real stories only". The description must carry a "fiksi" label, or the schedule must be cancelled (user's decision pending).

## Hook and loop
- Cold open (0.4 s): "Malam itu kami ronda berempat. Tapi kopinya... lima gelas." over five steaming glasses; the camera lands on the 5th exactly on "lima".
- Ending line to the viewer: "coba hitung orang di rumahmu... jangan dihitung ulang", then a "5" over an empty corner in the viewer's own house.
- Rewatch payoff: the dent in the bale next to the narrator and the fifth glass's level dropping in steps.

## Script
Narrator (Fikri): Malam itu kami ronda berempat. Tapi kopinya... lima gelas. / Pos ronda di ujung desa. Malam Jumat Kliwon. Aku, Pak Darto, Mas Yanto, sama Udin. / Lewat jam dua belas, kami keliling kampung bawa senter. Lewat kebun bambu. Lewat makam. / Pas balik ke pos... di bale sudah ada lima gelas kopi. Masih ngebul. / **Darto:** "Hitung lagi." / Aku hitung. Satu. Dua. Tiga. Empat. / Lalu aku menunjuk ke sebelahku. Lima. / **Darto:** "Jangan noleh. Minum kopimu. Anggap saja tamu." / Kami minum dalam diam. Di sebelahku... gelas kelima pelan-pelan berkurang. / Subuh, kopinya habis. Kami pulang berempat. / **Udin:** "Mas... semalam waktu ngitung, kamu nunjuk siapa? Di sebelahmu kan nggak ada orang." / Malam ini... coba hitung orang di rumahmu. Kalau jumlahnya lebih... jangan dihitung ulang.

## Fixes from the user's notes on Horror 01
| Complaint | Fix in Horror 02 |
|---|---|
| Head too big | New SIDE-VIEW rig (`horror2/rig.ts`): head 0.13 H, all limbs from forward kinematics; verified on a rig QA sheet (`out/horror2/rig0.jpg`) |
| Torch not symmetric | `drawTorch()` builds one half and mirrors it about the beam axis; the light cone comes from `torchCone(J)` = the lens point, never hand-placed |
| Cyclist standing | `pose.sit` = seat height with thighs horizontal and shins down; walking uses a real phase-driven cycle synced to the footstep SFX |
| Too little detail | Pos ronda set list: posts, tiled roof, POS KAMLING sign, gedek, bale slats, kentongan + beater, petromaks with moths, jadwal board, radio, thermos, tray, sandals, bicycle, calendar, ashtray ember, sarung. Exteriors: bamboo grove, nisan + kamboja, fog, fireflies, moon and clouds |

## Shot list (timeline.json)
hook 0-6.2 · title 6.2-7.9 (kentongan ×3) · pos 7.9-16.3 (name labels) · patrol 16.3-23.6 (bamboo → makam, walking synced) · return 23.6-29.4 · count 29.4-39.4 (points at each man, then at the empty seat) · darto 39.4-45 (torch off) · drink 45-51.2 (5th glass drops in 3 steps with the sips) · dawn 51.2-55.6 · udin 55.6-62.6 · home 62.6-69.4 (counting the viewer's family, "5" in the empty corner) · end 69.4-73.5.

## Audio
`~/shorts/horror2/audio/make_audio.py`: kentongan, petromaks hiss (inside shots), wind (outside), crickets + frogs that STOP on "lima" and return at dawn, footsteps synced to the walk phase (4 men, slightly out of step), bamboo creak, a distant howl at the makam, heartbeat on each count, torch click, four glasses lifted + three sips of the fifth glass, birds at dawn, one sting at the smash. Measured: bed -12.0 dB, SFX -7.3 dB, peak 0.70x voice.

---
Back to [[00 HOME - Channel HQ]] · [[YouTube Playbook - Jangan Dijawab]]
