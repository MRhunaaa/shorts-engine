// "WASH YOUR HANDS" (Semmelweis, Vienna 1847). 32.4 s = 972 f @ 30 fps, cut to words.ts.
// Reference grammar (burglar sample, vault "Reference Study"): light = mood (blue moon vs warm flame), interiors full of
// props, extreme lenses (wide close-ups, worm's-eye, top-down, dutch, camera dive), transitions = glass bubble,
// zoom-through, ghost dissolve; measured channel rules: symmetric glides, push-ins, ONE blurred whip, flip-kicks.
export const FPS = 30;
export const TOTAL = 972;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// set origins
export const WARD: V3 = [0, 0, 0], WARD2: V3 = [40, 0, 0], CELL: V3 = [-40, 0, 0], MORGUE: V3 = [0, 0, -40], STREET: V3 = [80, 0, 0];
export type SetName = "ward" | "ward2" | "cell" | "morgue" | "street";
export const add = (o: V3, p: V3): V3 => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];

export type ShotDef = { id: number; a: number; b: number; set: SetName; grade: "night" | "day" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 82, set: "ward", grade: "night" },      // hook: wet hands up at the basin, colleagues laugh
  { id: 2, a: 82, b: 135, set: "cell", grade: "night" },    // bars slam: asylum
  { id: 3, a: 135, b: 183, set: "ward", grade: "night" },   // Vienna 1847: top-down over the ward
  { id: 4, a: 183, b: 276, set: "ward", grade: "night" },   // dolly past the beds, 1 in 10, candle snuffed
  { id: 5, a: 276, b: 357, set: "ward2", grade: "day" },    // whip -> midwives' clinic, warm and happy
  { id: 6, a: 357, b: 395, set: "street", grade: "night" }, // woman flees clinic 1
  { id: 7, a: 395, b: 430, set: "street", grade: "night" }, // worm's-eye: she waits in the snow under the lamp
  { id: 8, a: 430, b: 474, set: "ward", grade: "night" },   // dolly-zoom: Semmelweis notices
  { id: 9, a: 474, b: 548, set: "morgue", grade: "night" }, // autopsy room, swinging lamp, germs
  { id: 10, a: 548, b: 606, set: "ward", grade: "night" },  // camera dive: same hands reach for a mother
  { id: 11, a: 606, b: 670, set: "ward", grade: "night" },  // scrub in chlorine
  { id: 12, a: 670, b: 716, set: "ward", grade: "night" },  // chalkboard 1/10 -> 1/100, mothers smile
  { id: 13, a: 716, b: 766, set: "ward", grade: "night" },  // worm's-eye: offended doctors
  { id: 14, a: 766, b: 818, set: "ward", grade: "night" },  // "a gentleman's hands are clean" (germs glow)
  { id: 15, a: 818, b: 843, set: "street", grade: "night" },// pushed out of the door
  { id: 16, a: 843, b: TOTAL, set: "cell", grade: "night" },// callback: the cell, candle goes out
];
/** ghost dissolves (frames) at the start of these shots */
export const XFADE: Record<number, number> = { 7: 6, 13: 6 };
/** glass-bubble transitions centred on these cuts, zoom-throughs on these */
export const BUBBLES = [135, 474, 843];
export const ZOOMS = [183, 606];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
export const bubbleAt = (f: number) => { let b = 0; for (const c of BUBBLES) { const d = Math.abs(f - c + 0.5); if (d < 7) b = Math.max(b, (1 - d / 7) ** 1.4); } return b; };
export const zoomAt = (f: number) => { let b = 0; for (const c of ZOOMS) { const d = Math.abs(f - c + 0.5); if (d < 6) b = Math.max(b, (1 - d / 6) ** 1.2); } return b; };

// story beats (seconds, from words.ts)
export const T_HANDS = 2.42, T_LOCKED = 3.1, T_DIED = 8.23, T_SAFER = 11.46, T_STREET = 13.48, T_NOTICED = 15.15,
  T_CUT = 17.17, T_SAME = 19.56, T_SCRUB = 20.91, T_CHLOR = 21.71, T_DROP = 22.65, T_HUNDRED = 23.45, T_OFF = 25.02,
  T_CLEAN = 26.75, T_PUSHED = 27.46, T_INFECT = 30.65;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mix = (a: Cam, b: Cam, k: number): Cam => ({ pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
const full = (c: Shot): Cam => ({ fov: 45, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 23)));
  }
  return cur;
};
/** slow push-in toward the look point (exp), measured 0.14 %/f median */
const push = (pos: V3, look: V3, f: number, f0: number, rate = 0.0022, rest: Partial<Cam> = {}): Shot => {
  const k = Math.exp(-rate * Math.max(0, f - f0));
  return { pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest };
};
const W = (p: V3) => add(WARD, p), W2 = (p: V3) => add(WARD2, p), C = (p: V3) => add(CELL, p), M = (p: V3) => add(MORGUE, p), S = (p: V3) => add(STREET, p);

// character paths the camera needs (shared with world.ts)
/** doctor A walking from the morgue door to bed 2 (shot 10) */
export const docAPath = (f: number): V3 => { const u = smooth((f - 548) / 38); return W([lerp(0.9, 1.25, u), 0, lerp(-8.3, -3.95, u)]); };
/** Semmelweis stumbling out of the hospital door (shot 15) */
export const pushedPath = (f: number): V3 => { const u = 1 - (1 - clamp01((f - 818) / 16)) ** 2; const z = lerp(-0.25, 2.0, u); return S([lerp(0, -0.45, u), Math.max(0, 0.45 - 0.43 * z / 1.05) * (z > 0 ? 1 : 1), z]); };

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: (f) => push(W([0.38, 1.28, 3.7]), W([0, 1.45, 1.45]), f, 0, 0.003, { fov: 60, roll: -0.02 }) },
    { f: 46, dur: 24, s: (f) => push(W([0.2, 1.4, 3.3]), W([0, 1.42, 1.5]), f, 46, 0.004, { fov: 50, roll: 0.035 }) },
  ],
  2: [
    { f: 82, s: (f) => push(C([0.32, 1.35, 3.9]), C([0, 1.25, 0.6]), f, 82, 0.003, { fov: 50, roll: 0.11 }) },
    { f: 106, dur: 22, s: (f) => push(C([0.12, 1.42, 2.95]), C([0, 1.38, 1.1]), f, 106, 0.004, { fov: 46, roll: -0.06 }) },
  ],
  3: [{ f: 135, s: (f) => { const u = (f - 135) / 48; return { pos: W([0.95, lerp(3.9, 3.5, u), lerp(-2.6, -3.0, u)]), look: W([0.4, 0, lerp(-4.0, -4.3, u)]), fov: 70, roll: lerp(0.35, -0.05, glide(u)) }; } }],
  4: [
    { f: 183, s: (f) => { const u = glide((f - 183) / 57); const z = lerp(0.7, -3.0, u); return { pos: W([-0.55, 1.28, z]), look: W([2.1, 0.95, z - 1.7]), fov: 50, roll: 0.02 }; } },
    { f: 236, dur: 24, s: (f) => push(W([-0.35, 1.35, -3.55]), W([1.25, 1.05, -6.05]), f, 236, 0.0035, { fov: 48, roll: -0.03 }) },
  ],
  5: [{ f: 276, s: (f) => { const u = glide((f - 276) / 81); return { pos: W2([lerp(1.25, -0.7, u), 1.35, lerp(0.7, 0.15, u)]), look: W2([0, 1.15, -2.4]), fov: 50, roll: lerp(0.03, -0.03, u) }; } }],
  6: [{ f: 357, s: (f) => push(S([0.85, 1.3, 4.1]), S([0.05, 1.45, 0.0]), f, 357, 0.003, { fov: 46 }) }],
  7: [{ f: 392, s: (f) => { const u = glide((f - 392) / 38); return { pos: S([lerp(2.45, 2.15, u), 0.2, lerp(3.55, 3.2, u)]), look: S([1.25, 1.55, 1.55]), fov: 64, roll: lerp(-0.14, -0.09, u) }; } }],
  8: [{ f: 430, s: (f) => { const u = glide((f - 430) / 40); const d = lerp(2.3, 1.1, u), fov = lerp(30, 58, u); return { pos: W([-0.6 + 0.12 * d, 1.43, -6.2 + d]), look: W([-0.6, 1.45, -6.2]), fov, roll: lerp(0, 0.06, u) }; } }],
  9: [
    { f: 474, s: (f) => { const u = (f - 474) / 40; return { pos: M([2.5, 2.55, 2.1]), look: M([-0.2, 0.95, -0.2]), fov: 54, roll: lerp(0.35, 0.05, u) }; } },
    { f: 508, dur: 24, s: (f) => push(M([2.25, 1.25, 0.55]), M([-0.2, 1.1, 0.1]), f, 508, 0.003, { fov: 52, roll: -0.05 }) },
  ],
  10: [
    { f: 548, s: (f) => { const p = docAPath(f); return { pos: [p[0] - 0.05, 1.45, p[2] + 1.05], look: [p[0], 1.42, p[2]], fov: 55 }; } },
    { f: 564, dur: 22, s: (f) => { const p = docAPath(f); return { pos: [p[0] + 0.55, 1.05, p[2] + 1.25], look: [p[0] + 0.12, 0.85, p[2] + 0.3], fov: 60, roll: 0.05 }; } },
    { f: 584, dur: 18, s: (f) => push(W([0.55, 1.05, -2.95]), W([1.85, 0.95, -3.9]), f, 584, 0.004, { fov: 52, roll: 0.02 }) },
  ],
  11: [{ f: 606, s: (f) => push(W([-0.2, 1.6, 3.7]), W([-0.45, 1.1, 1.6]), f, 606, 0.0035, { fov: 60, roll: 0.03 }) }],
  12: [
    { f: 670, s: (f) => push(W([0.2, 1.42, -4.55]), W([0.9, 1.3, -6.3]), f, 670, 0.003, { fov: 46 }) },
    { f: 698, dur: 18, s: (f) => push(W([0.1, 1.4, -4.4]), W([2.1, 1.0, -5.4]), f, 698, 0.003, { fov: 50, roll: -0.03 }) },
  ],
  13: [{ f: 713, s: (f) => { const u = glide((f - 713) / 53); return { pos: W([lerp(0.45, -0.2, u), 0.24, -0.35]), look: W([0, 1.45, -1.85]), fov: 66, roll: lerp(0.14, 0.08, u) }; } }],
  14: [{ f: 766, s: (f) => push(W([0.2, 1.3, -0.1]), W([0, 1.38, -1.6]), f, 766, 0.003, { fov: 56, roll: -0.04 }) }],
  15: [{ f: 818, s: (f) => { const p = pushedPath(f); return { pos: S([-1.3, 0.85, 4.1]), look: [lerp(p[0], STREET[0], 0.35), p[1] + 1.0, lerp(p[2], 0.4, 0.35)], fov: 54, roll: 0.06 }; } }],
  16: [
    { f: 843, s: (f) => push(C([0.32, 1.35, 3.9]), C([-0.3, 1.1, 0.0]), f, 843, 0.002, { fov: 50, roll: 0.11 }) },
    { f: 868, dur: 70, s: (f) => ({ pos: C([0.075, 1.25, 1.2]), look: C([-0.55, 1.05, -0.6]), fov: 46, roll: 0.03 }) },
  ],
};
/** the one whip pan (blurred), into the midwives' clinic */
const WHIPS: [number, number][] = [[276, 1]];
const WHIP_A = 0.7;
export const whipYaw = (f: number) => {
  for (const [b, dir] of WHIPS) {
    if (f >= b - 6 && f < b) { const u = (f - (b - 6) + 1) / 6; return dir * WHIP_A * u * u; }
    if (f >= b && f < b + 8) { const u = (f - b + 1) / 8; return -dir * WHIP_A * (1 - u) ** 2.2; }
  }
  return 0;
};
const KICKS: [number, number][] = [[0.0, 0.6], [T_LOCKED, 1.3], [T_LOCKED + 0.25, 0.6], [T_DIED, 0.7], [T_NOTICED, 0.5], [T_CUT, 0.6], [T_SAME, 0.8], [T_CHLOR, 0.7], [T_HUNDRED, 0.8], [T_OFF, 0.6], [T_CLEAN, 0.9], [27.87, 1.3], [T_INFECT, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
/** handheld micro-drift so no frame is ever dead still (very small, smooth) */
const hand = (f: number) => [Math.sin(f * 0.071) * 0.6 + Math.sin(f * 0.13 + 1) * 0.4, Math.sin(f * 0.057 + 2) * 0.6 + Math.sin(f * 0.11) * 0.4];
export const camAt = (id: number, f: number): Cam => {
  const c0 = run(CAMS[id], f), a = kickAt(f / FPS), wy = whipYaw(f);
  let c = c0;
  if (wy) {
    const dx = c0.look[0] - c0.pos[0], dz = c0.look[2] - c0.pos[2], cs = Math.cos(wy), sn = Math.sin(wy);
    c = { ...c0, look: [c0.pos[0] + dx * cs - dz * sn, c0.look[1], c0.pos[2] + dx * sn + dz * cs], roll: c0.roll + wy * 0.12 };
  }
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const [hx, hy] = hand(f);
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a + 0.0018 * L * hx;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * ((3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a) + 0.0014 * L * hy, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens (thin-lens DOF) ----------------
export const DOF: Record<number, number> = { 1: 9, 2: 7, 3: 3, 4: 8, 5: 7, 6: 6, 7: 9, 8: 12, 9: 5, 10: 10, 11: 9, 12: 8, 13: 6, 14: 11, 15: 6, 16: 8 };
