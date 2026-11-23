"""Horror 02 'Gelas Kelima': voice timeline + synthesized ambience/SFX, all placed from src/videos/horror2/timeline.json.
Calm horror: bed -12 dB vs voice, SFX <= -6 dB (peak <= 0.7x voice), one sting only (final smash).
Usage: python -I make_audio.py %USERPROFILE%\\shorts\\horror2 <timeline.json>"""
import sys, subprocess, wave, json
import numpy as np

SR = 48000
P, TLF = sys.argv[1], sys.argv[2]
TL = json.load(open(TLF, encoding="utf-8")); C = TL["cues"]
TOTAL = TL["total"]; N = int(TOTAL * SR); t = np.arange(N) / SR
rng = np.random.default_rng(5)
SH = {s[0]: (s[1], s[2]) for s in TL["shots"]}


def load(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{P}/voice/{name}.mp3", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
def add(buf, x, t0, g=1.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[: len(buf) - i]; buf[i: i + len(x)] += g * x
def filt(x, lp=None, hp=None, bp=None):
    n = len(x); X = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1 / SR)
    if lp: X *= 1 / (1 + (fr / lp) ** 4)
    if hp: X *= 1 / (1 + (hp / np.maximum(fr, 1)) ** 4)
    if bp: X *= np.exp(-((np.log(np.maximum(fr, 1)) - np.log(bp[0])) ** 2) / (2 * bp[1] ** 2))
    return np.fft.irfft(X, n)
def noise(dur, **k): return filt(rng.standard_normal(max(1, int(dur * SR))), **k)
def fade(x, a=0.01, r=0.05):
    n = len(x); e = np.ones(n); na, nr = max(1, min(n, int(a * SR))), max(1, min(n, int(r * SR)))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return x * e
def reverb(x, rt=1.2, wet=0.4):
    n = int(rt * SR); tt = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-6.9 * tt / rt); ir = filt(ir, lp=3000); ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n; F = 1 << int(np.ceil(np.log2(L)))
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:L]; dry = np.zeros(L); dry[: len(x)] = x
    return (1 - wet) * dry + wet * y * 0.6
def gate(ranges, ramp=0.6):
    g = np.zeros(N)
    for a, b in ranges: g[int(a * SR): int(b * SR)] = 1.0
    K = int(ramp * SR); cs = np.concatenate([[0.0], np.cumsum(g)])
    return (cs[np.clip(np.arange(N) + K // 2, 0, N)] - cs[np.clip(np.arange(N) - K // 2, 0, N)]) / K

# ---------------- voice
clips = {k: load(k) for k in ("narr", "darto", "udin")}
voice = np.zeros(N)
for name, a, b, d, fx in TL["voice"]:
    x = fade(clips[name][int(a * SR): int(b * SR)], 0.01, 0.08)
    if fx == "whisper": x = reverb(x, 0.6, 0.15) * 1.05
    add(voice, x, d)

# word list: N narrator, D Darto, U Udin
words = []
for name, tag in (("narr", "N"), ("darto", "D"), ("udin", "U")):
    W = json.load(open(f"{P}/voice/{name}_words.json", encoding="utf-8"))["words"]
    for vn, a, b, d, fx in TL["voice"]:
        if vn != name: continue
        for w in W:
            if w["type"] == "word" and "[" not in w["text"] and "]" not in w["text"] and a - 0.02 <= w["start"] < b:
                words.append([tag, w["text"], round(w["start"] - a + d, 3), round(w["end"] - a + d, 3)])
words.sort(key=lambda w: w[2])
json.dump(words, open(f"{P}/words_global.json", "w", encoding="utf-8"), ensure_ascii=False)

# ---------------- bed
smash = C["smash"]
inside = [SH["hook"], SH["pos"], (SH["return"][0] + 2.0, SH["drink"][1])]
outside = [SH["patrol"], (SH["return"][0], SH["return"][0] + 2.5), SH["dawn"], SH["udin"]]
drone = (np.sin(2 * np.pi * 43.65 * t) + 0.5 * np.sin(2 * np.pi * 65.4 * t + 0.4 * np.sin(2 * np.pi * 0.06 * t)))
drone *= 0.45 + 0.55 * np.clip((t - 6) / (smash - 6), 0, 1) ** 1.6
drone += 0.3 * (np.sin(2 * np.pi * 116.5 * t) + np.sin(2 * np.pi * 164.8 * t)) * gate([(C["lima"] - 0.2, SH["drink"][1])], 1.5)   # tritone after "lima"
hiss = noise(TOTAL, bp=(5200, 0.5)) * 0.18 * (1 + 0.08 * np.sin(2 * np.pi * 7 * t)) * gate(inside, 1.0)                # petromaks hiss
wind = noise(TOTAL, bp=(800, 0.7)) * 0.35 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 6.5)) ** 2 * gate(outside + [SH["home"]], 1.2)
room = noise(TOTAL, lp=200) * 0.3
cr = np.zeros(N)
for k in range(int(TOTAL * 3.5)):
    t0 = rng.uniform(0, TOTAL); dur = 0.05; tt = np.arange(int(dur * SR)) / SR
    add(cr, np.sin(2 * np.pi * 4500 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0) * np.sin(np.pi * tt / dur), t0, rng.uniform(0.12, 0.3))
frog = np.zeros(N)
for k in range(int(TOTAL * 0.9)):
    t0 = rng.uniform(0, TOTAL); dur = 0.22; tt = np.arange(int(dur * SR)) / SR
    add(frog, np.sin(2 * np.pi * 310 * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * tt)) * np.sin(np.pi * tt / dur), t0, rng.uniform(0.1, 0.25))
# nature goes SILENT on "lima" and stays silent through the drinking; comes back at dawn
nature = gate([(0, C["lima"] - 0.1), (SH["dawn"][0] + 0.5, SH["udin"][1])], 0.35)
bed = drone + hiss + wind + room + (0.22 * cr + 0.18 * frog) * nature
bed[int(smash * SR):] = 0
hum = 0.5 * np.sin(2 * np.pi * 36.7 * np.arange(int((TOTAL - smash - 0.6) * SR)) / SR); hum *= np.linspace(1, 0, len(hum)); add(bed, hum, smash + 0.6)
bed *= np.clip(t / 1.0, 0, 1)

# ---------------- SFX
sfx = np.zeros(N)
def pad(*xs):  # sum arrays of different lengths
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[: len(x)] += x
    return out
def kent():  # kentongan: hollow wooden slit drum
    tt = np.arange(int(0.6 * SR)) / SR
    return pad((np.sin(2 * np.pi * 620 * tt) + 0.6 * np.sin(2 * np.pi * 1180 * tt) + 0.3 * np.sin(2 * np.pi * 410 * tt)) * np.exp(-tt / 0.07), 0.3 * fade(noise(0.05, bp=(1500, 0.5)), 0.001, 0.04))
def thud(f=50, dur=0.8, d=0.22): tt = np.arange(int(dur * SR)) / SR; return np.sin(2 * np.pi * f * tt * (1 - 0.25 * tt)) * np.exp(-tt / d)
def click(): return fade(noise(0.035, hp=1500), 0.001, 0.025)
def step(): return pad(fade(noise(0.09, bp=(450, 0.6)), 0.004, 0.07), 0.4 * fade(noise(0.05, bp=(2200, 0.5)), 0.002, 0.04))
def clink(): tt = np.arange(int(0.5 * SR)) / SR; return (np.sin(2 * np.pi * 2800 * tt) + 0.6 * np.sin(2 * np.pi * 4310 * tt)) * np.exp(-tt / 0.09)
def sip(): return fade(noise(0.35, bp=(1400, 0.4)), 0.08, 0.15) * 0.7
def howl():
    tt = np.arange(int(2.6 * SR)) / SR; f = 520 + 140 * np.sin(np.pi * tt / 2.6) + 8 * np.sin(2 * np.pi * 5 * tt)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 2.6) ** 2
def bird(): tt = np.arange(int(0.18 * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(3200 + 1500 * np.sin(2 * np.pi * 9 * tt)) / SR) * np.sin(np.pi * tt / 0.18)
def air(dur=1.0): return fade(noise(dur, lp=600), dur * 0.45, dur * 0.5)
def creak(dur=1.3):
    tt = np.arange(int(dur * SR)) / SR; f = 170 + 50 * np.sin(2 * np.pi * 0.7 * tt)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sin(2 * np.pi * 21 * tt) > 0.3) * np.sin(np.pi * tt / dur)
def heart(): return thud(48, 0.35, 0.09)
def sting():
    tt = np.arange(int(2.2 * SR)) / SR
    return pad(sum(np.sin(2 * np.pi * f * tt) for f in (196, 207.7, 293.7, 311.1, 622.3)) * np.exp(-tt / 0.7) / 3, noise(2.2, lp=2500)[: len(tt)] * np.exp(-tt / 0.15))

for k in range(3): add(sfx, kent(), C["kentongan"] + k * 0.42, 0.75)        # title: tok tok tok
add(sfx, thud(34, 2.0, 0.6), 0.0, 0.35)
for d in TL["dissolves"]: add(sfx, air(), d - 0.5, 0.3)
wk = TL["walk"]; k = 0
while wk["from"] + k * wk["period"] / 2 < wk["to"]:
    for m in range(4): add(sfx, step(), wk["from"] + k * wk["period"] / 2 + m * 0.07, 0.22)    # 4 men, slightly out of step
    k += 1
add(sfx, creak(1.6), C["bamboo"] - 0.3, 0.35)
add(sfx, howl(), C["makam"] + 0.2, 0.22)
add(sfx, clink(), C["stopAtPos"] + 0.4, 0.25)
for key in ("count1", "count2", "count3", "count4"): add(sfx, heart(), C[key], 0.45)
add(sfx, heart(), C["lima"], 0.7); add(sfx, heart(), C["lima"] + 0.22, 0.45)
add(sfx, click(), C["torchOff"], 0.55)
for k in range(4): add(sfx, clink(), C["sipStart"] - 1.6 + k * 0.35, 0.12)  # four glasses picked up
for k in range(3): add(sfx, sip(), C["sipStart"] + 0.4 + k * 0.95, 0.35)     # the fifth glass sips by itself
for k in range(9): add(sfx, bird(), C["rooster"] + 0.3 + k * 0.37 + rng.uniform(0, 0.15), 0.18)
for key in ("countHome1",): add(sfx, heart(), C[key], 0.35)
def cicak():  # gecko call: 5 short dry chirps
    out = np.zeros(int(1.0 * SR))
    for k in range(5):
        tt = np.arange(int(0.045 * SR)) / SR; ch = np.sin(2 * np.pi * 2100 * tt) * np.sin(np.pi * tt / 0.045) * (0.9 ** k)
        i = int(k * 0.17 * SR); out[i: i + len(ch)] += ch
    return out
def cluck(): tt = np.arange(int(0.12 * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(700 - 900 * tt) / SR) * np.sin(np.pi * tt / 0.12) * (np.sin(2 * np.pi * 60 * tt) > -0.2)
def match(): return pad(fade(noise(0.12, bp=(3500, 0.5)), 0.003, 0.08), 0.5 * fade(noise(0.6, bp=(900, 0.6)), 0.05, 0.4))  # strike + flare
def whimper():
    tt = np.arange(int(0.9 * SR)) / SR; f = 900 - 300 * tt + 30 * np.sin(2 * np.pi * 7 * tt)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.9) ** 2 * 0.6
add(sfx, match(), 9.2, 0.35)                      # Darto lights his kretek (pos insert)
add(sfx, whimper(), C["stopAtPos"] + 0.8, 0.2)     # the dog flattens its ears
add(sfx, cicak(), SH["pos"][0] + 1.4, 0.3); add(sfx, cicak(), SH["return"][0] + 3.1, 0.25); add(sfx, cicak(), SH["home"][0] + 1.0, 0.18)
for k in range(4): add(sfx, cluck(), SH["dawn"][0] + 1.6 + k * 0.5, 0.15)
add(sfx, sting(), smash - 0.05, 0.9); add(sfx, thud(36, 1.4), smash, 1.0); add(sfx, thud(45, 0.8), C["stampEnd"], 0.6)

# ---------------- level lock
def grms(x):
    fr = int(0.4 * SR); r = np.array([np.sqrt(np.mean(x[i:i + fr] ** 2)) for i in range(0, len(x) - fr, fr // 2)])
    thr = 10 ** (-40 / 20) * np.max(r); return np.sqrt(np.mean(r[r > thr] ** 2))
gv = grms(voice)
bed *= (gv * 10 ** (-12 / 20)) / grms(bed)
sfx *= (gv * 10 ** (-6 / 20)) / grms(sfx)
pk = np.max(np.abs(voice)); sp = np.max(np.abs(sfx))
if sp > 0.7 * pk: sfx *= 0.7 * pk / sp
mix = voice + bed + sfx; mix /= max(1.0, np.max(np.abs(mix)) / 0.98)
with wave.open(f"{P}/audio/mix.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print("bed dB:", round(20 * np.log10(grms(bed) / gv), 2), "| sfx dB:", round(20 * np.log10(grms(sfx) / gv), 2),
      "| sfx peak x voice:", round(np.max(np.abs(sfx)) / pk, 2), "| words:", len(words), "| dur:", TOTAL)
