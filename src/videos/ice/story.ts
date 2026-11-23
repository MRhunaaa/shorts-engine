// "The Hot Ice Cream" (Mpemba effect): shots timed to voice/words.json (take B, 44.64 s = 1339 f @ 30 fps).
// Same camera grammar as the template: smootherstep glides 18-40 f, every hold creeps, cuts on big jumps,
// 7-frame flip kicks on impacts, 4-5 deg rolls on punch words.
export const FPS = 30;
export const TOTAL = 1339;
export const D0 = 0; // ground height
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const back = (u: number) => { const x = clamp01(u), s = 1.9; return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2; };

// ---------------- layout (metres) ----------------
export const FREEZER: V3 = [0, 0, 4.0]; // chest freezer centre on the ground; front faces -z
export const FZ = { w: 1.5, h: 0.92, d: 0.82 };
export const ERA: V3 = [-1.2, 0, 3.35]; // Erasto at the freezer
export const TEACH: V3 = [1.9, 0, 3.2];
export const BOARD: V3 = [1.65, 1.75, 7.9]; // chalkboard centre on the school wall (wall plane z = 8)
export const POT_TABLE: V3 = [-3.2, 0, 5.3];
export const TABLE2: V3 = [3.6, 0, 5.4];
/** the empty slot in the freezer and the pot's throw into it (shot 1 flash-forward, shot 3 for real) */
export const POT_SLOT: V3 = [0.42, 0.92 - 0.12, 4.15];
export const POT_THROW: Record<number, [number, number, number]> = { 1: [2.9, 3.36, 3.35], 3: [14.72, 15.04, 3.4] };
export const potFlight = (id: number, t: number): { p: V3; rot: number } | null => {
  const th = POT_THROW[id];
  if (!th || t < th[0] || t >= th[1]) return null;
  const u = (t - th[0]) / (th[1] - th[0]), a: V3 = [-1.2 + 0.05, 0.78, th[2] - 0.12];
  return { p: [a[0] + (POT_SLOT[0] - a[0]) * u, a[1] + (POT_SLOT[1] - a[1]) * u + 0.55 * 4 * u * (1 - u), a[2] + (POT_SLOT[2] - a[2]) * u], rot: u * 5.5 };
};
/** classmates in the yard: x, z, outfit index */
export const KIDS: [number, number, number][] = [
  [-0.35, 1.9, 0], [0.55, 2.15, 1], [1.35, 1.7, 2], [-2.3, 2.3, 3], [2.35, 2.5, 4], [-1.6, 1.25, 5], [0.95, 1.05, 6], [3.1, 1.7, 7],
];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; lid: (f: number) => number; board: 0 | 1 | 2 };
const OPEN = () => 1.75; // lid angle (rad) open
const SHUT = () => 0;
export const LID_OPEN_F = 780; // "opened" 26.00 s
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 190, light: "day", lid: OPEN, board: 0 }, // hook: shoves the hot pot in, class laughs
  { id: 2, a: 190, b: 383, light: "day", lid: OPEN, board: 0 }, // Tanzania wide -> one spot left (insert)
  { id: 3, a: 383, b: 466, light: "day", lid: OPEN, board: 0 }, // Erasto doesn't wait
  { id: 4, a: 466, b: 580, light: "day", lid: OPEN, board: 0 }, // "Enjoy your hot soup!"
  { id: 5, a: 580, b: 730, light: "day", lid: SHUT, board: 1 }, // teacher: "Mpemba physics"
  { id: 6, a: 730, b: 805, light: "day", lid: (f) => 1.75 * back((f - LID_OPEN_F) / 12), board: 1 }, // 90 min later, lid opens
  { id: 7, a: 805, b: 885, light: "day", lid: OPEN, board: 1 }, // cold mixes = slush
  { id: 8, a: 885, b: 970, light: "day", lid: OPEN, board: 1 }, // his = solid
  { id: 9, a: 970, b: 1190, light: "day", lid: OPEN, board: 1 }, // explanation: steam + tiny storm
  { id: 10, a: 1190, b: 1256, light: "day", lid: SHUT, board: 1 }, // scientists still argue
  { id: 11, a: 1256, b: TOTAL, light: "day", lid: SHUT, board: 2 }, // "the Mpemba effect"
];
export const XFADE: Record<number, number> = { 3: 6, 4: 6, 5: 6, 7: 6, 9: 6, 10: 8 }; // reference: 6-8 f dissolves, almost no hard cuts
export const FLASH_AT = 190;
export const FLASHES = [190, 730]; // after the hook; the time jump
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
/** ease-out burst with a 3-frame soft start so it never pops */
export const burst = (u: number) => { const x = clamp01(u); const s = smooth(Math.min(1, x / 0.15)); return (1 - (1 - x) ** 3) * (0.35 + 0.65 * s); };

/** whip pans across shot changes: yaw rushes out of the old shot (6 f, ease-in) and settles into the new one (8 f, ease-out) */
const WHIPS: [number, number][] = [[885, 1]]; // measured: ~0.45 whips/min in the reference -> one, on the reveal
const WHIP_A = 0.62;
export const whipYaw = (f: number) => {
  for (const [b, dir] of WHIPS) {
    if (f >= b - 6 && f < b) { const u = (f - (b - 6) + 1) / 6; return dir * WHIP_A * u * u; }
    if (f >= b && f < b + 8) { const u = (f - b + 1) / 8; return -dir * WHIP_A * (1 - u) ** 2.2; }
  }
  return 0;
};
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
    // reference camera moves are ease-out bursts: fastest on the first frame, settling over the rest
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
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

const E = ERA;
// 1: MCU Erasto with the pot at the open freezer -> pull back on "whole class laughed" to the laughing yard
const S1a = (f: number) => dolly([E[0] - 0.95, 1.32, E[2] - 3.1], [E[0] + 0.5, 1.0, E[2] + 0.3], pushK(f, 0, 0.0025), { fov: 40, roll: -0.03 });
const S1b = (f: number) => dolly([-0.9, 1.75, -2.9], [-0.1, 0.95, 3.2], pushK(f, 122, 0.002), { fov: 46, roll: 0.0 });
// 2: high wide of the school in the green hills -> straight down into the freezer: one spot left
const S2a = (f: number) => dolly([7.5, 5.8, -9.5], [-0.2, 1.4, 4.2], pushK(f, 190, 0.0022), { fov: 44 });
const S2b = (f: number) => dolly([0.1, 3.5, 3.05], [0.05, 0.4, 4.05], pushK(f, 310, 0.0018, 0.005, 30), { fov: 54 });
// 3: Erasto MCU, pot over the freezer, determined
const S3a = (f: number) => dolly([E[0] - 1.45, 1.32, E[2] - 2.45], [E[0] + 0.25, 1.05, E[2] + 0.2], pushK(f, 383, 0.003), { fov: 38, roll: 0.03 });
// 4: three classmates laughing; punch + roll on "hot soup"
const S4a = (f: number) => dolly([0.95, 1.28, -1.7], [0.6, 1.0, 1.9], pushK(f, 466, 0.0022), { fov: 40 });
const S4b = (f: number) => dolly([0.85, 1.2, -1.05], [0.6, 1.0, 1.9], pushK(f, 520, 0.0015, 0.006, 30), { fov: 38, roll: -0.04 });
// 5: teacher MS (Erasto in the left of frame) -> Erasto reaction CU on "not real physics"
const S5a = (f: number) => dolly([0.95, 1.5, -0.2], [1.6, 1.3, 3.2], pushK(f, 580, 0.0025), { fov: 44 });
const S5b = (f: number) => dolly([E[0] - 0.55, 1.22, E[2] - 2.1], [E[0], 1.12, E[2]], pushK(f, 682, 0.003), { fov: 36, roll: 0.04 });
// 6: golden wide, everyone around the freezer; lid flies open on "opened"
const S6a = (f: number) => dolly([0.4, 2.15, -2.4], [0, 0.85, 4.0], pushK(f, 730, 0.0025, 0.005, 30), { fov: 44, roll: -0.02 });
// 7: a classmate's runny slush bowl (reaction)
const K7: V3 = [1.25, 0, 2.9];
const S7a = (f: number) => dolly([K7[0] + 0.3, 1.1, K7[2] - 2.15], [K7[0], 0.92, K7[2]], pushK(f, 805, 0.003), { fov: 38, roll: -0.03 });
// 8: low angle up at Erasto holding the solid bowl high; punch on "solid"
const S8a = (f: number) => dolly([E[0] + 0.4, 0.72, E[2] - 2.7], [E[0], 1.38, E[2]], pushK(f, 885, 0.0025, 0.006, 30), { fov: 46, roll: 0.04 });
// 9: the steaming pot on the table: heat leaving -> churning "tiny storm"
const P = POT_TABLE;
const S9a = (f: number) => dolly([P[0] + 0.75, 1.75, P[2] - 2.7], [P[0], 1.02, P[2]], pushK(f, 970, 0.0022), { fov: 40 });
const S9b = (f: number) => dolly([P[0] + 0.35, 1.95, P[2] - 1.75], [P[0], 1.02, P[2]], pushK(f, 1063, 0.0025, 0.005, 30), { fov: 38, roll: 0.035 });
// 10: two scientists arguing at the chalkboard
const S10a = (f: number) => dolly([BOARD[0] + 0.3, 1.45, BOARD[2] - 5.1], [BOARD[0], 1.45, BOARD[2] - 0.7], pushK(f, 1190, 0.003), { fov: 44 });
// 11: Erasto in front of the board: "MPEMBA EFFECT"; push + roll on "Mpemba effect"
const S11a = (f: number) => dolly([BOARD[0] - 0.2, 1.5, BOARD[2] - 5.7], [BOARD[0], 1.62, BOARD[2] - 0.6], pushK(f, 1256, 0.0025), { fov: 44 });
const S11b = (f: number) => dolly([BOARD[0] - 0.15, 1.5, BOARD[2] - 5.0], [BOARD[0], 1.62, BOARD[2] - 0.6], pushK(f, 1300, 0.002, 0.007, 35), { fov: 42, roll: 0.045 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 122, dur: 32, s: S1b }],
  2: [{ f: 190, s: S2a }, { f: 310, cut: true, s: S2b }],
  3: [{ f: 383, s: S3a }],
  4: [{ f: 466, s: S4a }, { f: 512, dur: 20, s: S4b }],
  5: [{ f: 580, s: S5a }, { f: 682, cut: true, s: S5b }],
  6: [{ f: 730, s: S6a }],
  7: [{ f: 805, s: S7a }],
  8: [{ f: 885, s: S8a }],
  9: [{ f: 970, s: S9a }, { f: 1063, dur: 28, s: S9b }],
  10: [{ f: 1186, s: S10a }],
  11: [{ f: 1252, s: S11a }, { f: 1296, dur: 26, s: S11b }],
};

/** impact kicks (seconds, gain): pot plunks in, "laughed", "cool" plunk, lid slam open, "solid", "storm", final sting */
const KICKS: [number, number][] = [[3.36, 0.6], [15.04, 0.6], [26.05, 0.9], [30.88, 1.0], [38.16, 0.5], [43.44, 0.8]];
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
  if (wy) { // rotate the look point about the lens (yaw) + a little roll into the whip
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
const eyesOf = (p: V3, h = 1.25) => (): V3 => [p[0], h, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 14, focus: eyesOf(ERA, 1.15) },
  { f: 122, dur: 32, cInf: 4 },
  { f: 190, cInf: 0 },
  { f: 310, cInf: 8 },
  { f: 383, cInf: 13, focus: eyesOf(ERA, 1.15) },
  { f: 466, cInf: 12, focus: () => [0.6, 1.0, 2.0] },
  { f: 580, cInf: 10, focus: eyesOf(TEACH, 1.6) },
  { f: 682, cInf: 14, focus: eyesOf(ERA, 1.15) },
  { f: 730, cInf: 3 },
  { f: 805, cInf: 13, focus: () => [1.25, 1.0, 2.9] },
  { f: 885, cInf: 10, focus: eyesOf(ERA, 1.3) },
  { f: 970, cInf: 12 },
  { f: 1190, cInf: 6 },
  { f: 1256, cInf: 7, focus: () => [BOARD[0], 1.2, BOARD[2] - 0.5] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
