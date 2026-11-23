# Builds voice.wav for Horror 03 from take2.mp3: tempo x1.1 (pitch kept), silences inserted before key lines,
# 0.4 s lead-in. Writes words_global.json (times in the final video timeline) for words.ts + timeline.json.
import json, subprocess, sys, wave, numpy as np, os
D = os.path.dirname(os.path.abspath(__file__))
TEMPO, LEAD, SR = 1.1, 0.4, 44100
# (original-time cut point, inserted silence seconds)
CUTS = [(25.0, 0.7), (39.75, 0.6), (61.15, 0.8)]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(D, "take2.mp3"), "-af", f"atempo={TEMPO}", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
parts, prev = [np.zeros(int(LEAD * SR), np.float32)], 0
for t, s in CUTS:
    i = int(t / TEMPO * SR); parts += [x[prev:i], np.zeros(int(s * SR), np.float32)]; prev = i
parts.append(x[prev:]); y = np.concatenate(parts)
with wave.open(os.path.join(D, "voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
def remap(t):
    off = LEAD + sum(s for c, s in CUTS if t >= c)
    return round(t / TEMPO + off, 3)
src = json.load(open(sys.argv[1], encoding="utf-8"))
words = [w for w in src["words"] if w.get("type") == "word" and w["text"].strip(". ") != ""]
out = [["N", w["text"], remap(w["start"]), remap(w["end"])] for w in words]
json.dump(out, open(os.path.join(D, "..", "words_global.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("voice", round(len(y) / SR, 2), "s; words", len(out), "last end", out[-1][3])
