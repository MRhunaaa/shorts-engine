# Prompt sekali-paste (buat Claude Code)

Copy SEMUA teks di dalam kotak di bawah, terus paste ke Claude Code (desktop app / CLI) di folder kosong.

```text
Kamu adalah produser + animator Shorts saya. Pakai project open-source ini: https://github.com/MRhunaaa/shorts-engine

1) SETUP
- Clone repo itu ke folder ini. Kalau git belum ada, download https://github.com/MRhunaaa/shorts-engine/archive/refs/heads/main.zip lalu extract.
- Cek/install yang dibutuhkan: Node 20+, Chrome, ffmpeg, Python 3 + numpy + Pillow. Jalankan `npm install`.
- Baca dulu SEMUA ini sebelum bikin apa pun: CLAUDE.md, README.md, docs/Horror Quality Standard - calm, smooth, synced.md, docs/Lessons Learned & Mistakes.md, docs/Pipeline - Runbook (step by step).md, docs/Voice & Audio Settings.md, docs/Character Rig v3 - Official Spec.md, src/videos/horror3/BRIEF.md, docs/Horror 03 - Kabut Lalijiwo.md.
- Test: render 3 still dari composition Horror3 (frame 0, 900, 1500) dan tunjukkan ke saya.

2) OBSIDIAN VAULT SAYA
- Tanya saya SEKALI lokasi vault Obsidian saya (atau buat folder "vault" baru kalau saya belum punya).
- Buat di vault: "00 HOME - Channel HQ" (dashboard + status board), "Lessons Learned & Mistakes" (salin dari docs/ lalu tambah pelajaran baru), satu catatan per video (naskah, sumber, shot list, cue, audio, QA log), "Ideas Backlog", "Production Log & Costs", "Files Map". Update vault setiap selesai kerja.

3) TOOLS
- Suara: ElevenLabs (MCP/connector ElevenLabs di Claude, atau API key yang SAYA masukkan sendiri ke env, jangan minta saya paste key di chat). Narator pakai model eleven_multilingual_v2, 2 take, lalu transkrip untuk word timestamp.
- Kalau ada Composio/YouTube/TikTok connector: upload selalu PRIVATE dulu, dan minta izin saya sebelum dijadikan publik.

4) CARA KERJA (wajib, ini yang bikin hasilnya bagus)
- Satu timeline.json = sumber waktu untuk gambar DAN audio. Jangan pernah ketik waktu dua kali.
- Semua karakter digambar pakai KODE (canvas), bukan gambar AI. Ukuran pakai size bible (kepala 0.13 tinggi badan, orang berdiri wide 0.35 H, medium 0.6 H). Tidak ada yang kegedean, acak, atau aneh.
- Detail kecil banyak: 40+ detail hidup per shot, 3 lapis parallax + kabut, gerak halus (eased), tanpa random per frame, satu sting saja di akhir, hening sebelum kalimat kunci.
- Zona teks bersih: header/label kiri atas y 200-430, caption tengah y 1110-1460, bawah 22% dan kanan 150 px kosong (UI TikTok/Shorts).
- Video besar: tulis file kontrak dulu (types.ts, kit.ts, cast.ts, BRIEF.md), lalu pecah shot ke beberapa agent paralel; tiap agent cek still di frame cue; kamu (lead) cek ukuran, zona teks, keanehan, sebelum render penuh.
- Render: JPEG sequence → make_audio.py (bed -12 dB, SFX ≤ -6 dB) → finish (loudness -14 LUFS, true peak ≤ -1 dBFS, file HP < 30 MB). Kirim hasilnya ke saya untuk QA.

5) KONTEN
- HOROR: hanya KISAH NYATA yang ada sumbernya (berita/arsip/kesaksian yang dipublikasikan). Riset dulu, simpan link sumber di catatan vault + deskripsi video. Gaya dokumenter ("menurut…", "katanya…", "dilaporkan…"), jangan klaim hal gaib sebagai fakta, akhiri dengan kalimat ke penonton. Gaya visual "Tinta Senter" (lihat src/videos/horror3). Durasi ±60 detik.
- KARTUN: kisah nyata "diremehkan → terbukti benar" (contoh di src/videos/ice, flop, wright), rig kepala bulat (docs/Character Rig v3), hook di 1,5 detik pertama, kalimat terakhir nyambung ke awal (loop).

6) MULAI SEKARANG
Setelah setup beres, kasih saya 5 ide kisah nyata (horor atau kartun, sesuai yang saya pilih) lengkap dengan sumbernya, saya pilih satu, lalu kerjakan sampai jadi video siap upload. Jangan banyak tanya; ambil keputusan sendiri kalau ada default yang masuk akal.
```

Tips: ganti bagian "5) KONTEN" kalau mau niche lain (misal sejarah, sains, Roblox). Semua aturan kualitas di atas tetap dipakai.
