"""Horror 01 part 1 (v2, calm horror). Everything is placed from src/videos/horror1/timeline.json, the same file the
picture reads, so every sound lands on its visual frame. No jump-scare stings except the final smash.
Levels: bed -12 dB vs voice gated RMS, SFX <= -6 dB, SFX peak <= 0.7x voice peak.
Usage: python -I make_audio.py %USERPROFILE%\\shorts\\horror1 %USERPROFILE%\\shorts\\hot-icecream\\src\\videos\\horror1\\timeline.json"""
import sys, subprocess, wave, json
import numpy as np

SR = 48000
P, TLF = sys.argv[1], sys.argv[2]
TL = json.load(open(TLF, encoding="utf-8"))
C = TL["cues"]
TOTAL = TL["total"]; N = int(TOTAL * SR)
rng = np.random.default_rng(21)
t = np.arange(N) / SR


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


def noise(dur, **k): return filt(rng.standard_normal(int(dur * SR)), **k)


def fade(x, a=0.01, r=0.05):
    n = len(x); e = np.ones(n); na, nr = max(1, min(n, int(a * SR))), max(1, min(n, int(r * SR)))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return x * e


def reverb(x, rt=1.4, wet=0.55):
    n = int(rt * SR); tt = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-6.9 * tt / rt); ir = filt(ir, lp=3500); ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n; F = 1 << int(np.ceil(np.log2(L)))
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:L]; dry = np.zeros(L); dry[: len(x)] = x
    return (1 - wet) * dry + wet * y * 0.6


def pitch_up(x, semis):
    r = 2 ** (semis / 12); return np.interp(np.arange(0, len(x) - 1, r), np.arange(len(x)), x)


# ---------------- voice
clips = {k: load(k) for k in ("narr", "ibu", "bayu")}
voice = np.zeros(N)
for name, a, b, d, fx in TL["voice"]:
    x = fade(clips[name][int(a * SR): int(b * SR)], 0.01, 0.08)
    if fx == "verb": x = reverb(filt(x, lp=4200, hp=180), 1.8, 0.62) * 0.85
    if fx == "faint": x = filt(pitch_up(x, 3.0), lp=3000) * 0.17
    add(voice, x, d)

# global word list for captions / in-scene text
W = json.load(open(f"{P}/voice/narr_words.json", encoding="utf-8"))["words"]
IBU = {4.15: [("Jangan", 4.213, 4.4), ("dijawab,", 4.48, 5.08), ("Le.", 5.12, 5.6), ("Ibu", 5.84, 6.0), ("di", 6.08, 6.16), ("sini.", 6.2, 6.68)],
       0.1: [("Le...", 0.16, 0.8), ("ambilin", 1.04, 1.44), ("air.", 1.6, 2.16)], 8.1: [("Leee...", 8.162, 9.2)]}
words = []
for name, a, b, d, fx in TL["voice"]:
    if name == "narr":
        for w in W:
            if w["type"] == "word" and "[" not in w["text"] and "]" not in w["text"] and a - 0.02 <= w["start"] < b:
                words.append(["N", w["text"], round(w["start"] - a + d, 3), round(w["end"] - a + d, 3)])
    if name == "ibu":
        for tx, s, e in IBU[a]: words.append(["W" if a == 4.15 else "K", tx, round(s - a + d, 3), round(e - a + d, 3)])
words.sort(key=lambda w: w[2])
json.dump(words, open(f"{P}/words_global.json", "w", encoding="utf-8"), ensure_ascii=False)

# ---------------- bed (music + ambience): slow, quiet, never stops breathing
smash = C["smash"]
drone = (np.sin(2 * np.pi * 41.2 * t) + 0.55 * np.sin(2 * np.pi * 61.7 * t + 0.5 * np.sin(2 * np.pi * 0.05 * t))
         + 0.3 * np.sin(2 * np.pi * 82.4 * t * (1 + 0.0015 * np.sin(2 * np.pi * 0.09 * t))))
drone *= 0.5 + 0.5 * np.clip((t - 4) / (smash - 4), 0, 1) ** 1.5           # a very slow climb across the whole part
drone += (np.sin(2 * np.pi * 110 * t) + np.sin(2 * np.pi * 155.6 * t)) * 0.3 * np.clip((t - 59.2) / 5, 0, 1)  # tritone for the two mothers
room = noise(TOTAL, lp=220) * 0.35                                         # room tone
gust = np.clip(np.sin(2 * np.pi * t / 9.0) * 0.5 + 0.5 + 0.3 * np.sin(2 * np.pi * t / 3.7), 0, None) ** 2
wind = noise(TOTAL, bp=(900, 0.6)) * 0.25 * gust                            # wind through bamboo walls
cr = np.zeros(N)
for k in range(int(TOTAL * 3)):
    t0 = rng.uniform(0, TOTAL); dur = 0.05; tt = np.arange(int(dur * SR)) / SR
    add(cr, np.sin(2 * np.pi * 4600 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0) * np.sin(np.pi * tt / dur), t0, rng.uniform(0.12, 0.32))
# crickets STOP the moment the kitchen calls, come back faint, die for good at the wall whisper
cgate = np.where(t < C["kitchenCall"], 1.0, 0.0) + np.where((t > C["kitchenCall"] + 4) & (t < C["whisperWall"]), 0.35, 0.0)
K = int(0.25 * SR); cs = np.concatenate([[0.0], np.cumsum(cgate)])  # fast moving average (np.convolve was O(N*K), minutes)
cgate = (cs[np.clip(np.arange(N) + K // 2, 0, N)] - cs[np.clip(np.arange(N) - K // 2, 0, N)]) / K
bed = drone + room + wind + 0.22 * cr * cgate
bed[int(smash * SR):] = 0.0
hum = 0.5 * np.sin(2 * np.pi * 36.7 * np.arange(int((TOTAL - smash - 0.8) * SR)) / SR); hum *= np.linspace(1, 0, len(hum))
add(bed, hum, smash + 0.8)
fin = np.clip(t / 1.2, 0, 1); bed *= fin

# ---------------- SFX, all from the timeline
sfx = np.zeros(N)
def click(): return fade(noise(0.035, hp=1500), 0.001, 0.025)
def thud(f=50, dur=0.8, d=0.22): tt = np.arange(int(dur * SR)) / SR; return np.sin(2 * np.pi * f * tt * (1 - 0.25 * tt)) * np.exp(-tt / d)
def tick(): return fade(noise(0.02, bp=(3000, 0.35)), 0.001, 0.015)
def spoon(): tt = np.arange(int(0.14 * SR)) / SR; return (np.sin(2 * np.pi * 2250 * tt) + 0.5 * np.sin(2 * np.pi * 3620 * tt)) * np.exp(-tt / 0.035) + 0.3 * fade(noise(0.14, bp=(1800, 0.5)), 0.002, 0.1)
def air(dur=1.2): return fade(noise(dur, lp=600), dur * 0.45, dur * 0.5)
def bell(): tt = np.arange(int(1.4 * SR)) / SR; return (np.sin(2 * np.pi * 2900 * tt + 2 * np.sin(2 * np.pi * 1450 * tt)) * np.exp(-tt / 0.35))
def breath(): return fade(noise(1.2, bp=(700, 0.5)), 0.5, 0.6) * 0.8
def boom(): return thud(34, 2.2, 0.7) + 0.4 * fade(noise(2.2, lp=180), 0.3, 1.2)
def sting():
    tt = np.arange(int(2.2 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * tt) for f in (196, 207.7, 293.7, 311.1, 622.3)) * np.exp(-tt / 0.7) / 3 + noise(2.2, lp=2500) * np.exp(-tt / 0.15)

add(sfx, boom(), 0.0, 0.5)                                  # soft low swell under the cold-open whisper
add(sfx, click(), C["torchOnWall"], 0.55)
add(sfx, boom(), C["titleIn"], 0.7)
for d in TL["dissolves"]: add(sfx, air(1.0), d - 0.5, 0.35)  # quiet air on every dissolve
add(sfx, click(), C["torchClickBed"], 0.55)
add(sfx, bell(), C["bikeBell"], 0.18)
a, b = TL["clockTicks"]
for k in range(int(b - a) + 1): add(sfx, tick(), a + k, 0.5)  # second hand steps on whole seconds from shot start
per = TL["stir"]["period"]
for r0, r1 in TL["stir"]["ranges"]:
    k = 0
    while r0 + per * (k + 0.25) < r1: add(sfx, spoon(), r0 + per * (k + 0.25), 0.32); k += 1
h = TL["heart"]; k = 0
while h["from"] + k * h["period"] < h["to"]:
    add(sfx, thud(48, 0.35, 0.09), h["from"] + k * h["period"], 0.55); add(sfx, thud(44, 0.3, 0.08), h["from"] + k * h["period"] + 0.22, 0.35); k += 1
br = TL["breath"]; k = 0
while br["from"] + k * br["period"] < br["to"]: add(sfx, breath(), br["from"] + k * br["period"], 0.3); k += 1
add(sfx, fade(noise(C["handPressTo"] - C["handPressFrom"] + 0.8, lp=380), 0.8, 0.8), C["handPressFrom"], 0.55)  # the wall strains
add(sfx, sting(), smash - 0.05, 0.9)
add(sfx, thud(36, 1.4), smash, 1.0)
add(sfx, thud(45, 0.8), C["stampBersambung"], 0.6)

# ---------------- level lock
def grms(x):
    fr = int(0.4 * SR); r = np.array([np.sqrt(np.mean(x[i:i + fr] ** 2)) for i in range(0, len(x) - fr, fr // 2)])
    thr = 10 ** (-40 / 20) * np.max(r); return np.sqrt(np.mean(r[r > thr] ** 2))
gv = grms(voice)
bed *= (gv * 10 ** (-12 / 20)) / grms(bed)
sfx *= (gv * 10 ** (-6 / 20)) / grms(sfx)
pk = np.max(np.abs(voice)); sp = np.max(np.abs(sfx))
if sp > 0.7 * pk: sfx *= 0.7 * pk / sp
mix = voice + bed + sfx
mix /= max(1.0, np.max(np.abs(mix)) / 0.98)
def wr(fn, x):
    with wave.open(fn, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
wr(f"{P}/audio/mix.wav", mix)
print("bed dB:", round(20 * np.log10(grms(bed) / gv), 2), "| sfx dB:", round(20 * np.log10(grms(sfx) / gv), 2),
      "| sfx peak x voice:", round(np.max(np.abs(sfx)) / pk, 2), "| words:", len(words), "| dur:", TOTAL)
