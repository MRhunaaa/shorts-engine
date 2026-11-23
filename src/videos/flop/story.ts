// "The World's Laziest High Jumper" (Fosbury Flop): 26.05 s = 782 f @ 30 fps, timed to words.ts.
// Camera grammar from the measured reference (references/reports/motion.md): symmetric glides ~23 f, push-ins on holds,
// rolls 3-5 deg on emphasis, ONE whip pan with motion blur (on the reveal), 6-8 f dissolves, flash for the place jump.
export const FPS = 30;
export const TOTAL = 782;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- layout ----------------
export const UPX = 2.1; // uprights at x = +-2.1, bar along x at z = 0
export const MAT = { x0: -2.7, x1: 2.7, z0: 0.35, z1: 3.3, top: 0.7 };
export const BENCH: V3 = [-4.2, 0, -2.0];
export const PAPER: V3 = [-4.2, 0.47, -2.0];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; olympic: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 84, light: "day", olympic: false },      // hook flop, crowd laughs
  { id: 2, a: 84, b: 190, light: "day", olympic: false },    // coaches beg: face first
  { id: 3, a: 190, b: 262, light: "day", olympic: false },   // flopping like a fish
  { id: 4, a: 262, b: 338, light: "day", olympic: false },   // newspaper: laziest high jumper
  { id: 5, a: 338, b: 448, light: "day", olympic: true },    // Olympics, bar rises, rival fails
  { id: 6, a: 448, b: 514, light: "day", olympic: true },    // arches over, gold (whip in)
  { id: 7, a: 514, b: 682, light: "golden", olympic: true }, // explanation, slow motion, CoM under the bar
  { id: 8, a: 682, b: TOTAL, light: "day", olympic: true },  // everyone flops today
];
export const XFADE: Record<number, number> = { 2: 6, 3: 6, 4: 6, 7: 8, 8: 8 };
export const FLASHES = [338];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the bar ----------------
export const RISE_T = 12.585; // "rose"
export const KNOCK_T = 14.55; // rival clips the bar
export const barH = (id: number, t: number) => (id <= 4 ? 1.75 : id === 5 ? 2.0 + 0.24 * smooth((t - RISE_T) / 0.5) : 2.24);
/** knocked bar: 0 = on the pegs; returns drop (m) and spin (rad) */
export const barKnock = (id: number, t: number) => {
  if (id !== 5 || t < KNOCK_T) return { drop: 0, spin: 0, dz: 0 };
  const u = t - KNOCK_T, fall = Math.min(barH(5, t) - MAT.top - 0.05, 4.9 * u * u);
  const land = fall >= barH(5, t) - MAT.top - 0.05;
  return { drop: fall - (land ? 0.06 * Math.abs(Math.sin((u - 0.4) * 18)) * Math.exp(-(u - 0.4) * 6) : 0), spin: Math.min(0.5, u * 1.4), dz: Math.min(0.9, u * 1.6) };
};

// ---------------- flops ----------------
/** a jump: body-centre path C (world), roll angle th (rad, + = head toward +z), phase: run | air | land | lie */
export type Jump = { C: V3; th: number; phase: "run" | "air" | "land" | "lie"; runPh: number; u: number };
const AIR = 0.62;
/** backward flop (face up). t0 = take-off; lx = landing x offset */
export const flop = (t: number, t0: number, bar: number, lx = 0, straddle = false): Jump => {
  const tr = t - t0;
  if (tr < -0.75) return { C: [-1.0 + lx * 0.3, 1.0, -3.2], th: 0, phase: "run", runPh: 0, u: 0 };
  if (tr < 0) { // J-curve run-up: from the right, curving in to the take-off spot
    const u = (tr + 0.75) / 0.75;
    return { C: [-1.0 * (1 - u) ** 1.5 + 0.35 * u + lx * 0.3 * (1 - u), 1.0 + 0.04 * Math.abs(Math.sin(u * 9)), -3.2 + 2.45 * u], th: 0, phase: "run", runPh: (u * 3.5) % 1, u };
  }
  const peak = bar + (straddle ? -0.05 : 0.14);
  if (tr < AIR) {
    const u = tr / AIR, z = -0.75 + 2.35 * u, y0 = 1.05, y1 = MAT.top + 0.32;
    const y = u < 0.5 ? y0 + (peak - y0) * Math.sin(u * Math.PI) : y1 + (peak - y1) * Math.sin(u * Math.PI);
    const th = (straddle ? -1 : 1) * (0.2 + 1.45 * smooth(u * 1.25));
    return { C: [0.35 + (lx - 0.35) * u, y, z], th, phase: "air", runPh: 0, u };
  }
  const ul = tr - AIR, sink = ul < 0.3 ? 0.12 * Math.sin((ul / 0.3) * Math.PI) * Math.exp(-ul * 3) : 0;
  return { C: [lx, MAT.top + 0.3 - sink, 1.6], th: (straddle ? -1 : 1) * 1.62, phase: ul < 0.35 ? "land" : "lie", runPh: 0, u: 1 };
};
// story jumps
export const J1 = 0.62;   // hook flop take-off
export const J3 = 7.05;   // "kept flopping"
export const JR = 13.95;  // rival take-off (straddle, clips the bar)
export const J6 = 14.98;  // Olympic flop: "arched over backwards"
export const J8 = [22.95, 23.95, 25.04]; // today: everyone flops; the last lands on "flop" (25.66)
/** explanation slow motion: maps story time to the air phase so the CoM passes under the bar on "underneath" */
export const slowU = (t: number) => clamp01(0.5 + (t - 20.55) / 4.6);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** follow: the look point tracks a moving subject (lagged), lens stays put */
const follow = (pos: V3, subj: (t: number) => V3, f: number, fov: number, roll = 0): Shot => {
  const a = subj(T(f)), b = subj(T(f - 4));
  return { pos, look: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], fov, roll };
};

const S1a = (f: number) => dolly([3.5, 1.6, -7.5], [-0.3, 1.4, -1.4], pushK(f, 0, 0.0025), { fov: 54, roll: -0.03 });
const S1b = (f: number) => dolly([5.6, 2.7, -7.4], [0, 2.1, 4.5], pushK(f, 57, 0.002), { fov: 46, roll: 0.02 });
const S2a = (f: number) => dolly([0.2, 1.5, -7.9], [-0.05, 1.25, -2.7], pushK(f, 84, 0.0025), { fov: 40 });
const S2b = (f: number) => dolly([0.0, 1.4, -6.9], [-0.2, 1.2, -2.7], pushK(f, 150, 0.002, 0.006, 30), { fov: 38, roll: 0.04 });
const S3a = (f: number) => dolly([3.6, 1.35, -2.6], [0.2, 1.15, 1.0], pushK(f, 190, 0.0025), { fov: 44 });
const S3b = (f: number) => dolly([2.9, 1.25, -1.6], [0.4, 0.95, 1.5], pushK(f, 240, 0.002, 0.007, 30), { fov: 40, roll: -0.04 });
const S4a = (f: number) => dolly([PAPER[0], 1.75, PAPER[2] - 0.3], [PAPER[0], PAPER[1], PAPER[2] + 0.02], pushK(f, 262, 0.003, 0.007, 30), { fov: 44, roll: 0.03 });
const S5a = (f: number) => dolly([9.5, 4.2, -12.5], [0, 2.3, 3.5], pushK(f, 338, 0.0022), { fov: 46 });
const S5b = (f: number) => dolly([4.6, 1.75, -4.4], [0, 1.9, 0.4], pushK(f, 398, 0.0025), { fov: 44, roll: -0.02 });
const S6a = (f: number) => follow([4.4, 1.7, -4.0], (t) => { const j = flop(t, J6, 2.24); return [j.C[0] * 0.5, 0.4 + j.C[1] * 0.75, j.C[2] * 0.6 + 0.3]; }, f, 44, 0.02);
const S6b = (f: number) => dolly([2.4, 1.55, -1.3], [0.4, 1.45, 1.6], pushK(f, 488, 0.003, 0.006, 26), { fov: 40, roll: 0.045 });
const S7a = (f: number) => dolly([5.9, 2.0, 1.5], [0, 1.9, 0.35], pushK(f, 514, 0.0012), { fov: 40 });
const S7b = (f: number) => dolly([5.5, 2.05, -0.6], [0, 1.95, 0.3], pushK(f, 630, 0.0015, 0.005, 30), { fov: 40, roll: 0.035 });
const S8a = (f: number) => dolly([6.0, 2.3, -6.4], [0, 1.5, 1.2], pushK(f, 682, 0.002), { fov: 46 });
const S8b = (f: number) => dolly([5.2, 2.0, -5.4], [0, 1.4, 1.4], pushK(f, 760, 0.002, 0.007, 22), { fov: 44, roll: -0.045 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 57, dur: 24, s: S1b }],
  2: [{ f: 80, s: S2a }, { f: 150, dur: 24, s: S2b }],
  3: [{ f: 186, s: S3a }, { f: 240, dur: 20, s: S3b }],
  4: [{ f: 258, s: S4a }],
  5: [{ f: 338, s: S5a }, { f: 398, cut: true, s: S5b }],
  6: [{ f: 448, s: S6a }, { f: 488, dur: 22, s: S6b }],
  7: [{ f: 510, s: S7a }, { f: 600, dur: 40, s: S7b }],
  8: [{ f: 678, s: S8a }, { f: 760, dur: 18, s: S8b }],
};

/** the one whip pan (reference: ~0.45/min): out of the rival's fail into Fosbury's flop */
const WHIPS: [number, number][] = [[448, 1]];
const WHIP_A = 0.62;
export const whipYaw = (f: number) => {
  for (const [b, dir] of WHIPS) {
    if (f >= b - 6 && f < b) { const u = (f - (b - 6) + 1) / 6; return dir * WHIP_A * u * u; }
    if (f >= b && f < b + 8) { const u = (f - b + 1) / 8; return -dir * WHIP_A * (1 - u) ** 2.2; }
  }
  return 0;
};
const KICKS: [number, number][] = [[J1 + AIR, 0.5], [KNOCK_T, 0.7], [KNOCK_T + 0.42, 0.6], [J6 + AIR, 0.6], [16.58, 0.8], [25.66, 0.9]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c0 = run(CAMS[id], f), a = kickAt(T(f)), wy = whipYaw(f);
  let c = c0;
  if (wy) {
    const dx = c0.look[0] - c0.pos[0], dz = c0.look[2] - c0.pos[2], cs = Math.cos(wy), sn = Math.sin(wy);
    c = { ...c0, look: [c0.pos[0] + dx * cs - dz * sn, c0.look[1], c0.pos[2] + dx * sn + dz * cs], roll: c0.roll + wy * 0.12 };
  }
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 10 },
  { f: 57, dur: 24, cInf: 3 },
  { f: 84, cInf: 11, focus: () => [0.1, 1.5, -2.6] },
  { f: 190, cInf: 10 },
  { f: 262, cInf: 9 },
  { f: 338, cInf: 0 },
  { f: 398, cInf: 7 },
  { f: 448, cInf: 8 },
  { f: 488, dur: 22, cInf: 12 },
  { f: 514, cInf: 9, focus: () => [0, 1.95, 0.3] },
  { f: 682, cInf: 3 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
