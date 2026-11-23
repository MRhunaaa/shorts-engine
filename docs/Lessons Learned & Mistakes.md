---
tags: [lessons, gotchas]
updated: 2026-11-22
## Horror line (2D, 2026-11-22)
31. "Inspired, not copied": take the FORMAT (folklore rule, 3-part series, rewatch clue) and change everything visible: look, palette, type, transitions, narrator. Documented side by side in [[Horror 01 - Dipanggil Dua Kali]].
32. TikTok video pages return 403 to direct loads; open the profile and click a thumbnail instead. Thumbnails are not real JPEGs (ffmpeg needs `-f image2pipe`).
33. The built-in browser can't save files or reach localhost from TikTok (CSP). Analyse reference audio IN the page (WebAudio: pause stats, YIN pitch, bed level).
34. Seeking a hidden-pane video is slow (~6 s per seek) and TikTok fights the seek; use a single contact sheet instead of per-frame diffing.
35. esbuild rejects `-(x) ** 2`; use a helper.
36. Remotion `--concurrency` max = core count (4 on this PC).
37. 2D canvas camera pushes need the view clamped inside the painted frame, or black borders show.
## Horror line, round 2 (2026-11-22/23)
38. User-caught defects to never repeat: oversized heads (use head = 0.13 of body length), an asymmetric torch (build one half and mirror it), a cyclist "standing" (real sit/ride poses), too little detail, stiff motion. Always run a rig QA sheet first.
39. Front-view stick figures read stiff; side-view Kelir-style profiles with IK hands + grips + idle micro-motion read alive.
40. cut() in paint.ts stroked its edge AFTER the hatch loop → stray full-frame diagonal lines. Edge first, then hatch.
41. 
p.convolve with a 0.25 s kernel over 70 s of audio took minutes; use a cumulative-sum moving average.
42. Remotion --concurrency max = 4 cores here; heavy detail + motion blur ≈ 1.5-2 s/frame.
43. Parallel agents work best with a fixed contract file (	ypes.ts + new optional fields declared up front) and one file per agent; let each agent self-QA with stills on cue frames.
44. Stop a running full render before a new improvement round (it competes for CPU with the agents' QA stills).
45. Composio YouTube: the profile picture and handle can't be changed via the API; the channel title is ignored too. The banner needs upload → proxy PUT of the full brandingSettings incl. image.bannerExternalUrl. The video publish schedule, made-for-kids and AI disclosure (containsSyntheticMedia) DO work via a proxy PUT videos?part=status.
46. A local file → Composio: get a presigned slot in the workbench, PUT from the local machine, use the key as s3key.
47. **Don't call fiction "kisah nyata".** The channel was branded "true stories" while Gelas Kelima was invented. Rule now: real, sourced stories only; documentary voice; label viewer submissions.
48. Before any permanent delete (the YouTube video), confirm explicitly with the user and offer "private" first; verify afterwards.
## Platforms + channel farm (2026-11-23)
49. TikTok `invalid_client` / "Client key does not match" = a stray space pasted into the Composio key/secret fields. Check for whitespace first.
50. Composio's TikTok auth requests 6 scopes (user.info.basic, user.info.profile, user.info.stats, video.list, video.upload, video.publish). The TikTok app (Sandbox AND Production) must list all 6, or you get `invalid_scope`. The privacy policy must describe every scope.
51. Unaudited TikTok apps can't Direct Post to a public account (`unaudited_client_can_only_post_to_private_accounts`). `publish:false` (draft to inbox) works.
52. TikTok dev portal: the Production form won't Save without a demo video; unsaved changes are lost when you switch to Sandbox. Save after every step.
53. Screen recording with ffmpeg gdigrab records whatever is on top. Bring the controlled Chrome tab to the front first (Chrome to foreground + Ctrl+9). Write to .mkv so a killed ffmpeg still leaves a playable file. Cut notifications that show account/security details.
54. The YouTube Data API quota (Google side) is shared and can run out mid-day (resets 15.00 WIB). YouTube Studio in Chrome does everything (name, handle, avatar, banner, watermark, settings, visibility) without quota, including the things the API can't do.
55. Each YouTube channel can live on a different Google account. Reach it via YouTube avatar → Ganti akun. A Studio URL for another account's channel gives "Anda tidak diizinkan".
56. Short, generic YouTube handles (noobdiaries, bloxtales, oofstories…) are almost all taken; coined names (noobzotv) work. Test in the handle field before making art.
57. Roblox-themed channels: never use the Roblox logo or "official"; add "Fan-made, not affiliated with Roblox Corporation"; keep the audience setting per video (COPPA) and judge honestly.
58. Brand art: the user wants the ChatGPT image model (gpt-image-2). It outputs 1280x720 even for "square", so crop/pad to square and check the circle crop before uploading.
59. Changing a TikTok account's privacy is blocked by the auto-mode safety check. Ask the user to do account-setting changes like that.
---
# Lessons learned & mistakes (read before every video)

## Render / tech
1. Full 1080 render = 3.2 s/frame here → render 720x1280 JPEG sequence, upscale in ffmpeg.
2. `--scale 0.6667` gives 720.036 px → h264 refuses; use `--sequence` (JPEG) with scale 0.666666666667.
3. Crossfade frames time out at 30 s → `--timeout=240000`.
4. The template's `fx.ink.dispose` crashed on scene unmount → guarded call.
5. Never run heavy stills while a render runs on 4 threads (everything slows down).
6. Never round-trip source files with PowerShell `Get-Content`/`Set-Content`: it breaks UTF-8 (arrows became "â†'"). Use `[IO.File]::ReadAllText/WriteAllText` with UTF-8 no-BOM.
7. PowerShell here-strings: the closing `'@` must be alone at column 0.
8. Phone delivery limit 30 MB → phone copy at CRF 20.
9. Remotion bundles fill the temp dir → `REMOTION_TMP` / `TEMP` on `~/shorts/rtmp`.

## Picture
10. Random scenery (dunes) can block flight paths → keep a clear corridor around action paths.
11. Fast-moving subjects need follow-cams (look at the subject), not fixed framings.
12. Effects (bursts) must never cover headlines/faces; use twinkles around text instead.
13. Characters placed inside walls disappear (check z vs facade depth).
14. Golden light preset reads purple in close interiors → use day light there.
15. Leaves/props closer than ~2.5 m to the lens read as blobs → cull by distance.
16. Frame 0 must already show the hook subject.

## Camera (data)
17. Symmetric glides, not ease-out bursts; whips max 1 per video (0.45/min measured).

## Voice
18. `eleven_v4` is slow (2.3 w/s) → `eleven_multilingual_v2` (3.2-3.6 w/s).
19. The transcription follows the latest take: use the 2nd take as the voice.

## Characters (user taste)
20. Code-drawn only (no AI images), humans, mature symmetric faces, circle head + tall body, heavy outfit detail. See [[Character Rig v3 - Official Spec]].
21. Show choices as images on the phone; when the user says "change it" without details, render 3-5 variants side by side.

## True-3D (video 5)
22. Always render a turnaround QA sheet (front, 3/4, side, back, face close-ups with other characters hidden) BEFORE the video. Composition `WardCast`.
23. Check expression signs by eye: brow rotation was inverted (sad looked angry).
24. Mirrored parts (moustache halves) must overlap past the centre line, or a gap shows.
25. Hands near the head silhouette disappear; keep raised hands at least 0.42 m from the centre.
26. Night scenes: physically based light units need big numbers (point 11, spot 35-65) + a camera-following soft fill so faces read.
27. Hanging lamps sit right in top-down and high angles; put those cameras off-axis.
28. Check walking direction: yaw vs path direction (doctor walked backwards).
29. PowerShell: `[IO.File]::ReadAllText("relative")` resolves against the process cwd, not `cd`. A failed read followed by a write EMPTIED index.tsx. Always use absolute paths and check the length before writing.
30. Class fields that are declared but not initialized can break under the bundler; initialize lights in the constructor.
