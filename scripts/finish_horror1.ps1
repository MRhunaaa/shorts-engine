# Horror 01 part 1 (v2): frames + mix -> phone MP4 directly (3.3 Mbps, grain-safe), loudness via ONE gain, limiter 0.70
# (AAC overshoots: 0.891 gave +1.0 dBFS true peak), QA checks + sheet.
$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)
$mixw = "$env:USERPROFILE\shorts\horror1\audio\mix.wav"
$m = ffmpeg -hide_banner -i $mixw -af loudnorm=I=-14:TP=-1:print_format=json -f null - 2>&1 | Out-String
$I = [double]([regex]::Match($m, '"input_i"\s*:\s*"(-?[\d\.]+)"').Groups[1].Value)
$gain = [math]::Round(-14 - $I, 2); "measured $I LUFS -> gain $gain dB"
(Get-ChildItem out\frames_horror1 -Filter *.jpeg | Measure-Object).Count
$first = (Get-ChildItem out\frames_horror1 -Filter *.jpeg | Sort-Object Name | Select-Object -First 1).Name
$pat = [regex]::Replace($first, '\d+(?=\.jpeg$)', { param($x) "%0$($x.Value.Length)d" })
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "out\frames_horror1\$pat" -i $mixw -map 0:v:0 -map 1:a:0 -c:v libx264 -preset medium -b:v 3300k -maxrate 4500k -bufsize 9000k -pix_fmt yuv420p `
  -af "volume=${gain}dB,alimiter=limit=0.70:attack=0.5:release=60:level=false" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out\DipanggilDuaKali_1_v2_phone.mp4
ffprobe -v error -show_entries format=duration:stream=width,height -of compact out\DipanggilDuaKali_1_v2_phone.mp4
(ffmpeg -hide_banner -i out\DipanggilDuaKali_1_v2_phone.mp4 -af ebur128=peak=true -f null - 2>&1 | Select-String "^\s+I:|Peak:" | Select-Object -Last 2) -join " | "
(ffmpeg -hide_banner -i out\DipanggilDuaKali_1_v2_phone.mp4 -vf "blackdetect=d=0.5:pix_th=0.06" -an -f null - 2>&1 | Select-String "black_start") -join "`n"
ffmpeg -hide_banner -loglevel error -y -i out\DipanggilDuaKali_1_v2_phone.mp4 -vf "fps=1/3,scale=216:-1,tile=12x2" -frames:v 1 out\qa_sheet_horror1_v2.jpg
"phone MB: {0:N1}" -f ((Get-Item out\DipanggilDuaKali_1_v2_phone.mp4).Length/1MB)
"done"
