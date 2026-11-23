"""Horror 03 'Kabut Lalijiwo': voice + synthesized ambience/SFX, all placed from src/videos/horror3/timeline.json.
Calm horror: bed -12 dB vs voice, SFX <= -6 dB (peak <= 0.7x voice), one sting only (final smash).
Key beat: on "nggak ada angin" (cue noWind) the wind and every insect stop dead -> near silence + ear ring.
Usage: python -I make_audio.py %USERPROFILE%\\shorts\\horror3 <timeline.json>"""
import sys, subprocess, wave, json
import numpy as np

SR = 48000
P, TLF = sys.argv[1], sys.argv[2]
TL = json.load(open(TLF, encoding="utf-8")); C = TL["cues"]
TOTAL = TL["total"]; N = int(TOTAL * SR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
SH = {s[0]: (s[1], s[2]) for s in TL["shots"]}


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
    for a, b in ranges: g[int(max(0, a) * SR): int(min(TOTAL, b) * SR)] = 1.0
    K = max(2, int(ramp * SR)); cs = np.concatenate([[0.0], np.cumsum(g)])
    return (cs[np.clip(np.arange(N) + K // 2, 0, N)] - cs[np.clip(np.arange(N) - K // 2, 0, N)]) / K
def pad(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[: len(x)] += x
    return out

# ---------------- voice (already on the video timeline: lead + silences baked in)
with wave.open(f"{P}/voice/voice.wav", "rb") as w:
    vsr = w.getframerate(); v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
if vsr != SR: v = np.interp(np.arange(int(len(v) * SR / vsr)) * vsr / SR, np.arange(len(v)), v)
voice = np.zeros(N); add(voice, fade(v, 0.005, 0.1), TL["voice"][0][3])

# ---------------- bed
smash, nw = C["smash"], C["noWind"]
drone = (np.sin(2 * np.pi * 41.2 * t) + 0.5 * np.sin(2 * np.pi * 61.7 * t + 0.4 * np.sin(2 * np.pi * 0.05 * t)))
drone *= 0.4 + 0.6 * np.clip((t - 4) / (smash - 4), 0, 1) ** 1.5
drone += 0.25 * (np.sin(2 * np.pi * 110 * t) + np.sin(2 * np.pi * 155.6 * t)) * gate([(C["magrib"], SH["fast"][1]), (SH["offer"][0], smash)], 1.5)
# mountain wind: gusty at the summit and on the savanna, then DEAD on noWind (stays dead through 'lost')
wind = noise(TOTAL, bp=(700, 0.8)) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 5.5) ** 2) * 0.55
wind += noise(TOTAL, bp=(2400, 0.4)) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 3.1 + 1))
wind *= gate([(SH["summit"][0] - 0.3, nw)], 0.35)
forest_air = noise(TOTAL, bp=(500, 0.8)) * 0.18 * gate([SH["hook"], SH["fast"], SH["offer"]], 1.2)
room = noise(TOTAL, lp=180) * 0.28 * (1 - gate([(nw, SH["lost"][1])], 0.4) * 0.85)   # even the room tone drops in the stillness
ring = 0.05 * np.sin(2 * np.pi * 3720 * t) * gate([(nw + 0.3, SH["lost"][1] - 0.2)], 1.2)  # ear ring in the silence
cr = np.zeros(N)
for k in range(int(TOTAL * 3)):
    t0 = rng.uniform(0, TOTAL); dur = 0.05; tt = np.arange(int(dur * SR)) / SR
    add(cr, np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0) * np.sin(np.pi * tt / dur), t0, rng.uniform(0.1, 0.28))
nature = gate([SH["hook"], (SH["fast"][0], SH["fast"][1]), (SH["doubt"][0], SH["doubt"][1])], 0.4)   # insects only where it is night and calm; never in the stillness / procession
stream = (noise(TOTAL, bp=(1300, 0.6)) * 0.35 + noise(TOTAL, bp=(3800, 0.5)) * 0.12 * (0.6 + 0.4 * np.sin(2 * np.pi * 2.7 * t))) * gate([SH["ravine"]], 0.8)
channel = noise(TOTAL, bp=(2000, 0.5)) * 0.2 * gate([(SH["rescue"][0], SH["rescue"][0] + 3.2)], 0.8)   # irrigation water
fan = 0.12 * np.sin(2 * np.pi * 52 * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.4 * t)) * gate([SH["doubt"]], 0.6)
bed = drone + wind + forest_air + room + ring + 0.22 * cr * nature + stream + channel + fan
# distant gamelan for the procession (slendro-ish, far away, low-passed + reverb)
gam = np.zeros(N)
notes = [262, 294, 349, 392, 440]
pa, pb = SH["procession"]
k = 0
while pa + 0.6 + k * 0.62 < pb - 0.3:
    f = notes[(k * 3 + (k // 4)) % 5]; tt = np.arange(int(1.2 * SR)) / SR
    add(gam, (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / 0.35), pa + 0.6 + k * 0.62, 0.18); k += 1
for g0 in (pa + 0.5, pa + 5.46, C["pendopo"]):
    tt = np.arange(int(4 * SR)) / SR; add(gam, (np.sin(2 * np.pi * 82 * tt) + 0.5 * np.sin(2 * np.pi * 82 * 1.5 * tt) * np.sin(2 * np.pi * 0.8 * tt)) * np.exp(-tt / 1.6), g0, 0.5)  # gong
gam = filt(reverb(gam, 2.2, 0.55)[:N], lp=1400)
bed += gam * gate([(pa, pb + 0.8)], 0.8)
bed[int(smash * SR):] = 0
hum = 0.5 * np.sin(2 * np.pi * 36.7 * np.arange(int((TOTAL - smash - 0.6) * SR)) / SR); hum *= np.linspace(1, 0, len(hum)); add(bed, hum, smash + 0.6)
bed *= np.clip(t / 0.8, 0, 1)

# ---------------- SFX
sfx = np.zeros(N)
def thud(f=50, dur=0.8, d=0.22): tt = np.arange(int(dur * SR)) / SR; return np.sin(2 * np.pi * f * tt * (1 - 0.25 * tt)) * np.exp(-tt / d)
def click(): return fade(noise(0.035, hp=1500), 0.001, 0.025)
def gravel(): return pad(fade(noise(0.12, bp=(900, 0.7)), 0.004, 0.09), 0.5 * fade(noise(0.08, bp=(3000, 0.5)), 0.002, 0.06))
def grass(): return fade(noise(0.18, bp=(2600, 0.6)), 0.02, 0.12) * 0.7
def pole(): tt = np.arange(int(0.12 * SR)) / SR; return pad(np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt / 0.02) * 0.5, fade(noise(0.05, bp=(1200, 0.5)), 0.001, 0.04))
def air(dur=1.0): return fade(noise(dur, lp=600), dur * 0.45, dur * 0.5)
def heart(): return thud(48, 0.35, 0.09)
def breath_in(dur=1.1): return fade(noise(dur, bp=(1100, 0.5)), dur * 0.4, dur * 0.4) * 0.5
def breath_out(dur=1.3): return fade(noise(dur, bp=(700, 0.5)), dur * 0.2, dur * 0.6) * 0.45
def bird(): tt = np.arange(int(0.18 * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(3200 + 1500 * np.sin(2 * np.pi * 9 * tt)) / SR) * np.sin(np.pi * tt / 0.18)
def rooster():
    tt = np.arange(int(1.3 * SR)) / SR; f = np.where(tt < 0.25, 500 + 900 * tt / 0.25, 1400 - 500 * np.clip((tt - 0.25) / 1.0, 0, 1))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * tt)) * np.sin(np.pi * tt / 1.3)
def drip(): tt = np.arange(int(0.15 * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(1400 + 1800 * tt / 0.15) / SR) * np.exp(-tt / 0.03)
def murmur(dur=1.6):  # far-off indistinct voices (formant-filtered noise syllables)
    out = np.zeros(int(dur * SR))
    for k in range(int(dur * 4)):
        s = fade(noise(0.18, bp=(rng.uniform(450, 900), 0.25)), 0.04, 0.08) + 0.5 * fade(noise(0.18, bp=(rng.uniform(1500, 2400), 0.2)), 0.04, 0.08)
        add(out, s, k * 0.24 + rng.uniform(0, 0.06), rng.uniform(0.4, 1.0))
    return filt(reverb(out, 1.5, 0.6), lp=1800)
def tick(): tt = np.arange(int(0.03 * SR)) / SR; return np.sin(2 * np.pi * 3300 * tt) * np.exp(-tt / 0.006)
def rope(): return fade(noise(1.2, bp=(1800, 0.7)), 0.05, 0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * np.arange(int(1.2 * SR)) / SR))
def steam(dur=2.0): return fade(noise(dur, bp=(5000, 0.5)), 0.5, 0.8) * 0.25
def sting():
    tt = np.arange(int(2.2 * SR)) / SR
    return pad(sum(np.sin(2 * np.pi * f * tt) for f in (196, 207.7, 293.7, 311.1, 622.3)) * np.exp(-tt / 0.7) / 3, noise(2.2, lp=2500)[: len(tt)] * np.exp(-tt / 0.15))

add(sfx, thud(34, 2.0, 0.6), 0.0, 0.3)
add(sfx, steam(3.0), 1.0, 0.5)                                       # the tea steaming in the hook
for k in range(3): add(sfx, thud(70 - k * 8, 0.6, 0.12), C["titleIn"] + k * 0.42, 0.45)   # title: three low knocks
for d in TL["dissolves"]: add(sfx, air(), d - 0.5, 0.3)
# footsteps: descent from the summit (gravel) and the savanna (grass); pole taps every other step; he stops at stillLeaves
wk = TL["walk"]; k = 0
while wk["from"] + k * wk["period"] / 2 < min(wk["to"], C["stillLeaves"]):
    ts = wk["from"] + k * wk["period"] / 2
    add(sfx, gravel() if ts < SH["fog"][0] else grass(), ts, 0.32)
    if k % 2 == 0: add(sfx, pole(), ts + 0.03, 0.18)
    k += 1
add(sfx, click(), C["stillLeaves"] + 0.6, 0.4)                       # headlamp on
add(sfx, thud(30, 2.5, 0.9), nw, 0.25)                               # the air "drops"
add(sfx, heart(), C["kerajaan"], 0.35); add(sfx, heart(), C["pasar"], 0.4); add(sfx, heart(), C["pendopo"], 0.5)
bp = TL["breath"]; k = 0
while bp["from"] + k * bp["period"] < bp["to"]:
    ts = bp["from"] + k * bp["period"]; add(sfx, breath_in(), ts, 0.3); add(sfx, breath_out(), ts + bp["period"] * 0.45, 0.28); k += 1
add(sfx, steam(2.5), C["offerHand"] + 0.4, 0.5)
for k in range(6): add(sfx, drip(), SH["fast"][0] + 0.7 + k * 1.05 + rng.uniform(0, 0.3), 0.15)
add(sfx, murmur(1.8), C["voices"], 0.5); add(sfx, murmur(1.4), C["menjawab"] - 0.1, 0.55)
add(sfx, rope(), C["naik"] - 0.2, 0.35)
for k in range(10): add(sfx, bird(), SH["rescue"][0] + 0.3 + k * 0.55 + rng.uniform(0, 0.2), 0.16)
add(sfx, rooster(), SH["rescue"][0] + 1.4, 0.2)
add(sfx, thud(60, 0.4, 0.08), C["warga"] + 0.5, 0.3)                 # cangkul dropped in the mud
for k in range(int((SH["doubt"][1] - SH["doubt"][0]) // 1)): add(sfx, tick(), SH["doubt"][0] + 0.2 + k, 0.2)   # wall clock (second hand steps on whole seconds from shot start + 0.2)
add(sfx, steam(2.0), SH["doubt"][0] + 0.3, 0.35)
add(sfx, heart(), C["nyata"], 0.45)
hp = TL["heart"]; k = 0
while hp["from"] + k * hp["period"] < hp["to"]:
    ts = hp["from"] + k * hp["period"]; add(sfx, heart(), ts, 0.5); add(sfx, heart(), ts + 0.22, 0.3); k += 1
add(sfx, steam(3.0), C["kabut"], 0.4)
add(sfx, sting(), smash - 0.05, 0.9); add(sfx, thud(36, 1.4), smash, 1.0); add(sfx, thud(45, 0.8), C["stampEnd"], 0.6)
sfx[int(smash * SR) + int(2.3 * SR): int(C["stampEnd"] * SR) - 1] *= 1.0

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
      "| sfx peak x voice:", round(np.max(np.abs(sfx)) / pk, 2), "| dur:", TOTAL)
