# Mux + loudness (-14 LUFS via ONE linear gain, -1 dBFS limiter) + QA sheet.  usage: powershell -File scripts\finish.ps1
$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)
$m = ffmpeg -hide_banner -i $env:USERPROFILE\shorts\wright\audio\mix.wav -af loudnorm=I=-14:TP=-1:print_format=json -f null - 2>&1 | Out-String
$I = [double]([regex]::Match($m, '"input_i"\s*:\s*"(-?[\d\.]+)"').Groups[1].Value)
$gain = [math]::Round(-14 - $I, 2)
"measured $I LUFS -> gain $gain dB"
$first = (Get-ChildItem out\frames_wright -Filter *.jpeg | Sort-Object Name | Select-Object -First 1).Name
$pat = [regex]::Replace($first, '\d+(?=\.jpeg$)', { param($m) "%0$($m.Value.Length)d" })
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "out\frames_wright\$pat" -i $env:USERPROFILE\shorts\wright\audio\mix.wav -map 0:v:0 -map 1:a:0 -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p `
  -af "volume=${gain}dB,alimiter=limit=0.891:attack=1:release=50:level=false" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out\wright_final.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact out\wright_final.mp4
"--- loudness of final"
(ffmpeg -hide_banner -i out\wright_final.mp4 -af ebur128=peak=true -f null - 2>&1 | Select-String "I:|Peak:" | Select-Object -Last 2) -join " | "
"--- freeze (>=0.4 s) / black"
(ffmpeg -hide_banner -i out\wright_final.mp4 -vf "freezedetect=n=0.002:d=0.4,blackdetect=d=0.1" -an -f null - 2>&1 | Select-String "freeze_start|black_start") -join "`n"
ffmpeg -hide_banner -loglevel error -y -i out\wright_final.mp4 -vf "fps=1/2.2,scale=216:-1,tile=7x3" -frames:v 1 out\qa_sheet_wright.jpg
ffmpeg -hide_banner -loglevel error -y -i out\wright_final.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a copy -movflags +faststart out\TenMillionYears_phone.mp4
"phone MB: {0:N1}" -f ((Get-Item out\TenMillionYears_phone.mp4).Length/1MB)
"done"
