// "DINO TIME-TRAVELS" #1: Mary Anning. 32.0 s = 960 f @ 30 fps, timed to words.ts. Our own format: an on-screen host
// (Dino, lip-synced to the voice from mouth.ts) walks through the story; time-portal swirls mark era jumps.
// Camera rules from the measured reference: symmetric glides, push-ins, one blurred whip, dissolves.
export const FPS = 30;
export const TOTAL = 960;
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- layout ----------------
export const CLIFF_Z = 8;
export const SKULL: V3 = [0.6, 0.55, 7.55];   // ichthyosaur skull at the cliff foot
export const STALL: V3 = [-6, 0, 2.5];        // fossil stall
export const PLES: V3 = [-1.0, 0.12, 2.6];    // plesiosaur skeleton (head at -x end, neck runs toward +x)
export const SOC: V3 = [-45, 0, 0];           // Geological Society facade (faces -z)
export const MUS: V3 = [45, 0, 0];            // museum hall centre
export const SHORE: V3 = [4, 0, -12];         // seashore (camera looks -z at the sea)
export const SEA_Z = -16;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 131, light: "day" },     // girl + sea-monster skull, scientist: FAKE
  { id: 2, a: 131, b: 228, light: "day" },   // portal: "Hi, I'm Dino" + cousin photo
  { id: 3, a: 228, b: 370, light: "day" },   // age 12, hammer, pulls the skull out of the cliff
  { id: 4, a: 370, b: 448, light: "day" },   // fossil stall, tourists, coins
  { id: 5, a: 448, b: 574, light: "golden" },// the long neck; "glued it together"
  { id: 6, a: 574, b: 660, light: "golden" },// checked every bone: ticks; ALL REAL
  { id: 7, a: 660, b: 770, light: "day" },   // portal: society door slams, men take credit
  { id: 8, a: 770, b: 860, light: "day" },   // portal: museum today
  { id: 9, a: 860, b: TOTAL, light: "golden" },// portal: seashore, tongue twister gag
];
export const XFADE: Record<number, number> = { 4: 6, 6: 6 };
export const FLASHES: number[] = [];
/** time-portal swirls (our signature transition) centred on these frames */
export const PORTALS = [131, 660, 770, 860];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// story timing
export const PULL_T = 9.07, FAKE_T = 3.63, GLUE_T = 18.12, REAL_T = 21.0, SLAM_T = 22.6, CREDIT_T = 25.0, TWIST_T = 30.07;
/** skull slides out of the cliff on "pulled" */
export const skullOut = (id: number, t: number) => (id === 3 ? smooth((t - PULL_T) / 0.6) : id < 3 ? 1 : 1);

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

const K = SKULL;
const S1a = (f: number) => dolly([K[0] + 0.3, 1.55, K[2] - 7.2], [K[0] + 0.1, 1.15, K[2] - 1.0], pushK(f, 0, 0.0025, 0.006, 30), { fov: 50 });
const S1b = (f: number) => dolly([K[0] + 0.4, 1.35, K[2] - 4.0], [K[0] + 0.3, 1.0, K[2] - 0.4], pushK(f, 100, 0.002, 0.007, 25), { fov: 44, roll: 0.04 });
const S2a = (f: number) => dolly([K[0] - 0.6, 1.45, K[2] - 4.4], [K[0] - 1.1, 1.35, K[2] - 1.9], pushK(f, 131, 0.0025), { fov: 42 });
const S2b = (f: number) => dolly([K[0] - 0.8, 1.4, K[2] - 3.7], [K[0] - 1.1, 1.3, K[2] - 1.9], pushK(f, 196, 0.002, 0.007, 30), { fov: 40, roll: -0.04 });
const S3a = (f: number) => dolly([K[0] + 2.6, 1.6, K[2] - 5.2], [K[0] - 0.4, 1.2, K[2] - 0.5], pushK(f, 228, 0.0022), { fov: 46 });
const S3b = (f: number) => dolly([K[0] + 1.3, 1.1, K[2] - 3.2], [K[0], 0.8, K[2] - 0.2], pushK(f, 268, 0.0025, 0.007, 30), { fov: 44, roll: 0.035 });
const ST = STALL;
const S4a = (f: number) => dolly([ST[0] + 0.6, 1.55, ST[2] - 5.0], [ST[0] + 0.2, 1.1, ST[2] + 0.2], pushK(f, 370, 0.0028), { fov: 48 });
const P = PLES;
/** dolly along the plesiosaur's neck, from the tail end out to the tiny head */
const S5a = (f: number): Shot => { const u = glide((f - 448) / 70); return { pos: [P[0] + 6.5 - 6.8 * u, 1.3 - 0.2 * u, P[2] - 3.4], look: [P[0] + 5.6 - 6.8 * u, 0.55, P[2] + 0.2], fov: 46, roll: 0.02 }; };
const S5b = (f: number) => dolly([P[0] - 0.4, 1.5, P[2] - 4.6], [P[0] + 0.8, 1.2, P[2] + 0.4], pushK(f, 530, 0.002, 0.007, 25), { fov: 44, roll: -0.04 });
const S6a = (f: number) => dolly([P[0] + 3.2, 2.6, P[2] - 4.2], [P[0] + 3.0, 0.6, P[2] + 0.2], pushK(f, 574, 0.0025, 0.007, 22), { fov: 48 });
const SO = SOC;
const S7a = (f: number) => dolly([SO[0] + 1.2, 1.5, SO[2] - 9.0], [SO[0] - 0.4, 2.6, SO[2] + 0.5], pushK(f, 660, 0.0025), { fov: 50 });
const S7b = (f: number) => dolly([SO[0] - 1.1, 1.8, SO[2] - 6.2], [SO[0] - 0.9, 2.55, SO[2]], pushK(f, 735, 0.002, 0.006, 25), { fov: 50, roll: 0.035 });
const M = MUS;
const S8a = (f: number) => dolly([M[0] + 2.8, 2.0, M[2] - 7.5], [M[0], 1.8, M[2] + 1.5], pushK(f, 770, 0.0025), { fov: 48 });
const SH = SHORE;
const S9a = (f: number) => dolly([SH[0] + 1.4, 1.4, SH[2] + 4.2], [SH[0] - 0.4, 1.15, SH[2] - 0.2], pushK(f, 860, 0.0022), { fov: 44 });
const S9b = (f: number) => dolly([SH[0] + 0.4, 1.35, SH[2] + 2.6], [SH[0] + 0.6, 1.3, SH[2] + 0.3], pushK(f, 900, 0.002, 0.008, 30), { fov: 40, roll: 0.05 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 100, dur: 22, s: S1b }],
  2: [{ f: 131, s: S2a }, { f: 196, dur: 22, s: S2b }],
  3: [{ f: 228, s: S3a }, { f: 268, dur: 26, s: S3b }],
  4: [{ f: 366, s: S4a }],
  5: [{ f: 448, s: S5a }, { f: 530, dur: 24, s: S5b }],
  6: [{ f: 570, s: S6a }],
  7: [{ f: 660, s: S7a }, { f: 735, dur: 24, s: S7b }],
  8: [{ f: 770, s: S8a }],
  9: [{ f: 860, s: S9a }, { f: 900, dur: 26, s: S9b }],
};
/** the one whip: into "the science club" door slam is a portal, so the whip goes on "All real" -> no; on "Then she found" (5) */
const WHIPS: [number, number][] = [[448, 1]];
const WHIP_A = 0.62;
export const whipYaw = (f: number) => {
  for (const [b, dir] of WHIPS) {
    if (f >= b - 6 && f < b) { const u = (f - (b - 6) + 1) / 6; return dir * WHIP_A * u * u; }
    if (f >= b && f < b + 8) { const u = (f - b + 1) / 8; return -dir * WHIP_A * (1 - u) ** 2.2; }
  }
  return 0;
};
const KICKS: [number, number][] = [[FAKE_T, 0.8], [PULL_T + 0.55, 0.9], [GLUE_T, 0.8], [REAL_T, 0.9], [SLAM_T, 1.1], [CREDIT_T, 0.6], [TWIST_T, 0.7]];
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
  { f: 0, cInf: 9 }, { f: 131, cInf: 12 }, { f: 228, cInf: 5 }, { f: 268, dur: 26, cInf: 10 }, { f: 370, cInf: 9 },
  { f: 448, cInf: 4 }, { f: 530, cInf: 9 }, { f: 574, cInf: 3 }, { f: 660, cInf: 2 }, { f: 735, cInf: 10 }, { f: 770, cInf: 3 }, { f: 860, cInf: 6 }, { f: 900, dur: 26, cInf: 12 },
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
