// "Ten Million Years" (Wright brothers vs the newspaper): 30.28 s = 908 f @ 30 fps, timed to words.ts.
// Built on vault/Retention Psychology rules: paradox on frame 0, teaser fly-over (open loop), gags, contrast (expert's crash)
// before vindication, ONE blurred whip, final frame calls back to frame 0 (loopable). Camera: symmetric glides, push-ins.
export const FPS = 30;
export const TOTAL = 908;
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- layout ----------------
export const PAPER: V3 = [0, 0.02, -2.0];      // the newspaper on the sand
export const BROS: V3 = [0.2, 0, 1.6];         // brothers stand here in the reveal
export const DUNE: V3 = [-8, 0, 3.2];            // launch dune (top at ~2.2 m)
export const CRASH: V3 = [-2.4, 0, 3.0];       // glider nose-dives here
export const SHOP: V3 = [-40, 0, 0];           // bike shop (open front faces -z)
export const TUNNEL: V3 = [-40, 0.9, 1.2];     // wind tunnel on the workbench
export const BOOK: V3 = [-33.5, 0, -2.5];      // experts' lectern with the big book
export const BOAT: V3 = [26, 0, 34];           // Langley's houseboat on the river
export const RAIL: V3 = [3, 0, 8];             // Flyer launch rail start (runs toward -x)
export const SEA_Z = 22;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 98, light: "day" },      // newspaper: 10,000,000 years (top-down)
  { id: 2, a: 98, b: 166, light: "day" },    // tilt up: two bike mechanics; the Flyer zooms overhead (teaser)
  { id: 3, a: 166, b: 296, light: "day" },   // glider launch -> nose-dive into the sand; everyone laughs
  { id: 4, a: 296, b: 417, light: "day" },// experts trust one old number (big book, 0.005)
  { id: 5, a: 417, b: 600, light: "day" },// bike shop wind tunnel, 200 tiny wings, WRONG stamp
  { id: 6, a: 600, b: 774, light: "day" },   // government scientist's machine dives into the river
  { id: 7, a: 774, b: 838, light: "day" },   // nine days later: the whip, the Flyer takes off
  { id: 8, a: 838, b: TOTAL, light: "day" }, // fly-over, newspaper stamped WRONG (loops to frame 0)
];
export const XFADE: Record<number, number> = { 3: 6, 4: 8, 5: 6, 6: 8, 8: 6 };
export const FLASHES: number[] = [];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- machines ----------------
export type Pose = { p: V3; yaw: number; pitch: number; roll: number; prop: number };
/** glider: carried off the dune (6.0 s), glides, nose-dives into the sand on "crashing" (6.47), sticks */
export const CRASH_T = 6.47;
export const glider = (t: number): Pose => {
  const t0 = 5.6;
  if (t < t0) return { p: [DUNE[0] + 1.2, 2.5, DUNE[2] - 0.8], yaw: -0.5, pitch: 0, roll: 0, prop: 0 };
  if (t < CRASH_T) {
    const u = (t - t0) / (CRASH_T - t0);
    return { p: [DUNE[0] + 1.2 + (CRASH[0] - DUNE[0] - 1.2) * u, 2.5 + 0.35 * Math.sin(u * Math.PI * 0.7) - 2.0 * u * u, DUNE[2] - 0.8 + (CRASH[2] - DUNE[2] + 0.8) * u], yaw: -0.5, pitch: -0.15 - 0.55 * u * u, roll: 0.15 * Math.sin(u * 9), prop: 0 };
  }
  const w = Math.exp(-(t - CRASH_T) * 7) * Math.sin((t - CRASH_T) * 30) * 0.08; // wobble after the impact
  return { p: [CRASH[0], 0.55, CRASH[2]], yaw: -0.5, pitch: -0.75 + w, roll: 0.12, prop: 0 };
};
/** the Flyer: teaser pass overhead (shot 2), real take-off on the rail (shot 7) and the fly-over (shot 8) */
export const TEASE: [number, number] = [4.5, 5.45];
export const TAKEOFF_T = 26.75;
export const flyer = (id: number, t: number): Pose | null => {
  const spin = t * 40;
  if (id === 2) {
    if (t < TEASE[0] || t > TEASE[1]) return null;
    const u = (t - TEASE[0]) / (TEASE[1] - TEASE[0]);
    return { p: [4.0 - 9 * u, 3.3 + 0.3 * Math.sin(u * 3), 2.6 - 0.4 * u], yaw: Math.PI / 2 + 0.1, pitch: 0.05, roll: -0.15, prop: spin };
  }
  if (id === 7) {
    const u = t - (TAKEOFF_T - 0.9); // rolls along the rail, lifts on "flew"
    const x = RAIL[0] - Math.max(0, u) * Math.max(0, u) * 2.6 - Math.max(0, u) * 1.2;
    const lift = Math.max(0, t - TAKEOFF_T);
    return { p: [x, 0.62 + 1.1 * lift * lift + 0.6 * lift, RAIL[2]], yaw: Math.PI / 2, pitch: Math.min(0.18, lift * 0.4), roll: 0.03 * Math.sin(t * 5), prop: spin };
  }
  if (id === 8) {
    const u = (t - 27.95) / 1.6;
    return { p: [3.5 - 7 * u, 2.7 - 0.2 * u, PAPER[2] + 3.6], yaw: Math.PI / 2 + 0.25, pitch: 0.05, roll: -0.08, prop: spin };
  }
  return null;
};
/** Langley's Aerodrome: catapult launch on "launched" (21.97), dives into the river on "dove" (24.03), splash at 25.2 */
export const LAUNCH_T = 21.95, SPLASH_T = 25.2;
export const aerodrome = (t: number): Pose => {
  const base: V3 = [BOAT[0] - 2.2, 4.3, BOAT[2]];
  if (t < LAUNCH_T) return { p: base, yaw: Math.PI / 2, pitch: 0, roll: 0, prop: t * 30 };
  const u = t - LAUNCH_T;
  const x = base[0] - 3 * u, y = base[1] + 0.6 * u - 0.62 * u * u, pitch = -Math.min(1.35, 0.16 * u * u + 0.05 * u);
  if (t >= SPLASH_T) { const s = t - SPLASH_T; return { p: [base[0] - 3 * (SPLASH_T - LAUNCH_T) - 0.6 * s, Math.max(-2.5, -0.2 - 1.2 * s), base[2]], yaw: Math.PI / 2, pitch: -1.35, roll: 0.2, prop: 0 }; }
  return { p: [x, Math.max(-0.2, y), base[2]], yaw: Math.PI / 2, pitch, roll: 0.08 * Math.sin(u * 6), prop: t * 30 };
};

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

const P = PAPER;
const S1a = (f: number) => dolly([P[0], 1.25, P[2] - 0.32], [P[0], P[1], P[2] + 0.02], pushK(f, 0, 0.003, 0.008, 30), { fov: 46, roll: 0.03 });
const S2a = (f: number) => dolly([0.4, 1.35, -3.6], [0.1, 1.6, 2.0], pushK(f, 98, 0.002), { fov: 48 });        // tilt up from the paper to the brothers
const S2b = (f: number) => dolly([0.6, 1.0, -3.0], [-0.5, 3.4, 2.5], 1, { fov: 52, roll: -0.04 });             // look up as the Flyer passes
const S3a = (f: number) => dolly([1.8, 2.0, -3.8], [-4.2, 1.5, 4.0], pushK(f, 166, 0.002), { fov: 46 });
const S3b = (f: number) => dolly([0.4, 1.2, -0.6], [-2.3, 0.6, 3.0], pushK(f, 200, 0.0025), { fov: 44, roll: 0.04 });
const S3c = (f: number) => dolly([1.6, 1.5, -1.8], [-1.6, 1.0, 3.6], pushK(f, 262, 0.002), { fov: 48 });
const B = BOOK;
const S4a = (f: number) => dolly([B[0] + 0.4, 1.75, B[2] - 5.4], [B[0], 1.5, B[2] + 0.2], pushK(f, 296, 0.0025), { fov: 44 });
const S4b = (f: number) => dolly([B[0] + 0.15, 1.7, B[2] - 1.5], [B[0], 1.35, B[2] + 0.05], pushK(f, 360, 0.003, 0.007, 30), { fov: 40, roll: 0.03 });
const W = TUNNEL;
const S5a = (f: number) => dolly([W[0] + 3.3, 1.75, W[2] - 3.6], [W[0] + 0.45, 1.2, W[2] + 0.1], pushK(f, 417, 0.0025), { fov: 46 });
const S5b = (f: number) => dolly([W[0] + 2.5, 1.55, W[2] - 2.3], [W[0] + 0.95, 1.2, W[2]], pushK(f, 500, 0.003), { fov: 42, roll: -0.03 });
const S5c = (f: number) => dolly([B[0] + 0.1, 1.85, B[2] - 2.0], [B[0], 1.3, B[2] + 0.05], pushK(f, 584, 0.003, 0.009, 16), { fov: 40, roll: 0.05 }); // stamp insert
const S6a = (f: number) => dolly([BOAT[0] + 2.0, 4.9, BOAT[2] - 9.5], [BOAT[0] - 2.0, 4.1, BOAT[2]], pushK(f, 600, 0.002), { fov: 44 });
const S6b = (f: number) => dolly([BOAT[0] - 3.5, 3.0, BOAT[2] - 14], [BOAT[0] - 8.5, 1.8, BOAT[2]], pushK(f, 700, 0.002, 0.006, 30), { fov: 46, roll: -0.04 });
const S7a = (f: number) => dolly([RAIL[0] - 2.2, 1.4, RAIL[2] - 6.2], [RAIL[0] - 2.6, 1.2, RAIL[2]], pushK(f, 774, 0.002), { fov: 46 });
const S7b = (f: number): Shot => { const p = flyer(7, T(f))!.p, q = flyer(7, T(f - 3))!.p; return { pos: [RAIL[0] - 2.6, 1.3, RAIL[2] - 6.8], look: [(p[0] + q[0]) / 2 - 0.4, (p[1] + q[1]) / 2 + 0.5, RAIL[2]], fov: 50, roll: 0.04 }; };
const S8a = (f: number): Shot => { const p = flyer(8, T(f))!.p; return { pos: [P[0] + 0.6, 2.0, P[2] - 3.8], look: [p[0] * 0.8, p[1] * 0.75 + 0.4, p[2] * 0.8], fov: 54, roll: -0.03 }; };
const S8b = (f: number) => dolly([P[0], 1.25, P[2] - 0.32], [P[0], P[1], P[2] + 0.02], pushK(f, 880, 0.002, 0.008, 25), { fov: 46, roll: 0.03 }); // = frame 0 framing (loop)

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: 98, s: (f) => S1a(f) }, { f: 98, dur: 30, s: S2a }, { f: 132, dur: 14, s: S2b }, { f: 156, dur: 12, s: S2a }],
  3: [{ f: 163, s: S3a }, { f: 190, dur: 18, s: S3b }, { f: 262, dur: 20, s: S3c }],
  4: [{ f: 292, s: S4a }, { f: 360, dur: 26, s: S4b }],
  5: [{ f: 414, s: S5a }, { f: 500, dur: 24, s: S5b }, { f: 584, cut: true, s: S5c }],
  6: [{ f: 596, s: S6a }, { f: 700, dur: 26, s: S6b }],
  7: [{ f: 774, s: S7a }, { f: 796, dur: 16, s: S7b }],
  8: [{ f: 835, s: S8a }, { f: 860, dur: 32, s: S8b }],
};
/** the one whip (reference ~0.45/min): out of the splash into "nine days later" */
const WHIPS: [number, number][] = [[774, -1]];
const WHIP_A = 0.62;
export const whipYaw = (f: number) => {
  for (const [b, dir] of WHIPS) {
    if (f >= b - 6 && f < b) { const u = (f - (b - 6) + 1) / 6; return dir * WHIP_A * u * u; }
    if (f >= b && f < b + 8) { const u = (f - b + 1) / 8; return -dir * WHIP_A * (1 - u) ** 2.2; }
  }
  return 0;
};
const KICKS: [number, number][] = [[1.73, 0.5], [CRASH_T, 1.0], [19.67, 0.9], [SPLASH_T, 1.1], [27.18, 0.7], [29.85, 0.9]];
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
  { f: 0, cInf: 8 }, { f: 98, dur: 30, cInf: 10, focus: () => [0.2, 1.5, 1.6] }, { f: 132, cInf: 0 },
  { f: 166, cInf: 3 }, { f: 190, dur: 18, cInf: 10, focus: () => [-2.4, 0.8, 3.0] },
  { f: 296, cInf: 9, focus: () => [BOOK[0], 1.4, BOOK[2]] }, { f: 417, cInf: 11, focus: () => [TUNNEL[0], 1.2, TUNNEL[2]] },
  { f: 584, cInf: 10 }, { f: 600, cInf: 0 }, { f: 774, cInf: 4 }, { f: 838, cInf: 0 }, { f: 864, dur: 24, cInf: 8 },
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
