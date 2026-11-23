---
tags: [video, horror, 2d, tinta-senter, kisah-nyata, gunung]
status: in production (2026-11-23)
composition: Horror3 (src/videos/horror3/)
voice: Fikri (uzkxbhFCx9Ni2LANf1zB), eleven_multilingual_v2, take 2, tempo x1.1, 3 inserted silences (shorts/horror3/voice/build_voice.py)
flow: ElevenLabs flow WuYql6FSL3bryVivv6ji
standard: "[[Horror Quality Standard - calm, smooth, synced]]"
---
# Horror 03: "Kabut Lalijiwo" (TRUE STORY)

First episode under the rule **real, sourced stories only** ([[YouTube Playbook - Jangan Dijawab]]). 66.5 s.

## Sources (put in the description)
- merdeka.com, 13 Jul 2022: "Kisah Pendaki Bertahan Hidup Setelah Hilang Empat Hari di Gunung Arjuno" (reporter Darmadi Sasongko): https://www.merdeka.com/peristiwa/read/7774662/kisah-pendaki-bertahan-hidup-setelah-hilang-empat-hari-di-gunung-arjuno
- iNews.id, 31 May 2025: "Cerita Horor Pendaki Tersesat di Gunung Arjuno, Lihat Istana Raja hingga Pasar Gaib": https://www.inews.id/regional/jatim/cerita-horor-pendaki-tersesat-di-gunung-arjuno-lihat-istana-raja-hingga-pasar-gaib/all

## Facts used (all from merdeka unless noted)
Muhammad Naam Kurniawan, 34, Pandaan (Pasuruan), experienced hiker; March 2022; group of 5 via Tambaksari Purwosari; Puncak Ogal-Agil; friend twisted an ankle and fainted, Naam went ahead for help; ~14.00 above Plewangan fog came, "no wind, leaves did not move"; lost in Lalijiwo; at dusk saw people in royal clothing, a crowd like a market, people sitting in a pendopo; fasted because food from the other world traps you; day 4 in a ravine heard voices, shouted "Tolong Pak!", was answered and told to climb; found by a villager checking his irrigation channel at Alas Sriti, Desa Klampok, Singosari; weak, hypothermia.
- Kept apart: the iNews "pasar gaib" detail comes from a spiritual practitioner; the script only says what Naam himself reported. The two articles disagree on whether he interacted (iNews: stayed silent; merdeka: called for help and was answered) → the script uses "memilih diam" for the procession and "teriak tolong" for the ravine (both true to their moment).
- Not claimed as fact: the supernatural. Line: "Hipotermia memang bisa bikin orang berhalusinasi. Tapi Naam yakin... yang dia lihat itu nyata."
- Merdeka's dates are inconsistent ("Minggu 21/3"): on screen we only say "Maret 2022" and "Minggu, ±14.00".

## Script (narrator)
Empat hari hilang di Gunung Arjuno... dan dia menolak makan. Karena takut... nggak bisa pulang. / Maret, 2022. Muhammad Naam, pendaki dari Pandaan, turun dari puncak. Temannya cedera. Naam turun duluan, cari bantuan. / Di atas Plewangan, kabut datang tiba-tiba. Katanya... nggak ada angin. Daun nggak bergerak sama sekali. / Dia tersesat di Lalijiwo. / Menjelang magrib, dia melihat orang-orang berpakaian seperti kerajaan. Ramai... seperti pasar. Ada yang duduk di pendopo. / Naam memilih diam. Dan nggak makan apa pun. Dia percaya, makanan dari alam lain... bikin kamu nggak bisa pulang. / Hari keempat, di dasar jurang, dia dengar orang bicara. Dia teriak, tolong, Pak! ... Ada yang menjawab. Menyuruhnya naik. / Yang menolongnya... warga yang sedang cek saluran air sawah, di Alas Sriti, Singosari. Dia lemas. Hipotermia. / Hipotermia memang bisa bikin orang berhalusinasi. Tapi Naam yakin... yang dia lihat itu nyata. / Kalau kamu tersesat di kabut... dan ada yang menawarimu makan... jangan diterima.

## Shots (timeline.json)
hook 0-6.25 (tray of food in fog, Naam turns away) · title 6.25-8.5 · summit 8.5-15.15 (Ogal-Agil, hurt friend, Naam descends) · fog 15.15-21.5 (Plewangan, fog rolls in, **everything freezes on "nggak ada angin"**, leaf hangs in the air) · lost 21.5-23.5 (bootprints looping a tree) · procession 23.5-30.72 (court procession → market → pendopo with a still king) · fast 30.72-37.5 (under the aerial-root tree, a pale hand offers food, he turns away; HARI KE-2/3) · ravine 37.5-44.75 (TOLONG, PAK! letters, silhouettes at the rim, rope) · rescue 44.75-51.7 (farmer at the irrigation channel, carried along the pematang, HIPOTERMIA) · doubt 51.7-57.75 (blanket, tea, lanterns in the fog outside the window: HALUSINASI? / NYATA?) · offer 57.75-63 (POV: the hand with the tray comes out of the fog) · end (JANGAN DITERIMA).

## Build
- Engine `Horror3.tsx` = Horror2 engine + documentary lower-thirds (name, place, day counter) + beat stamps + sources on the end card.
- Parallel build (lesson 43): contract files written first (types.ts with breeze()/fogAmt()/colours, kit.ts helpers, cast.ts signatures, BRIEF.md), then 4 agents: cast (cast.ts + H3Cast sheet), shots A (hook-fog), B (lost-ravine), C (rescue-end).
- Detail bar for this round (user: "detail kecil 20x lebih banyak, ukuran sempurna"): 40+ small living details per shot, 3 parallax depths with fog between, static detail cached in offscreen canvases per pass to keep render time.
- Audio `shorts/horror3/audio/make_audio.py`: wind dies dead on noWind (+ ear ring), distant gamelan + gongs in the procession, breath synced to breathPhase, stream + far murmurs in the ravine, birds/rooster/irrigation water at the rescue, wall clock on whole seconds in doubt, heartbeat in offer, one sting. Measured: bed -12.0 dB, SFX -13.9 dB (peak-limited 0.70x voice).

---
Back to [[00 HOME - Channel HQ]] · [[YouTube Playbook - Jangan Dijawab]]
