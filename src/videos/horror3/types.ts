// CONTRACT for Horror3 "Kabut Lalijiwo": shared by the engine (Horror3.tsx), cast.ts and the shot files (scenesA/B/C.ts). Do not change; add helpers in your own file.
import type { C2, Pal } from "../horror1/paint";
import TLJ from "./timeline.json";

export const TL = TLJ as unknown as {
  total: number; voice: [string, number, number, number, string][]; shots: [string, number, number][]; dissolves: number[];
  cues: Record<string, number>; stir: { period: number; ranges: [number, number][] }; clockTicks: [number, number];
  heart: { from: number; to: number; period: number }; breath: { from: number; to: number; period: number };
};
export const CUE = (k: string) => { const v = TL.cues[k]; if (v === undefined) throw new Error("missing cue " + k); return v; };
export const SHOT_RANGE = (name: string): [number, number] => { const s = TL.shots.find((x) => x[0] === name); if (!s) throw new Error("missing shot " + name); return [s[1], s[2]]; };

/** stir phase synced with the spoon SFX: spoon hits when sin(phase) = 1, i.e. at r0 + period*(k+0.25). Returns null outside ranges (frozen = last phase). */
export const stirPhase = (t: number) => {
  for (const [a, b] of TL.stir.ranges) if (t >= a && t < b) return (2 * Math.PI * (t - a)) / TL.stir.period;
  return null;
};
/** heartbeat pulse 0..1 synced with the heartbeat SFX (lub at from+k*period, dub +0.22 s) */
export const heartPulse = (t: number) => {
  const h = TL.heart; if (t < h.from - 0.1 || t > h.to + 0.5) return 0;
  const q = (((t - h.from) % h.period) + h.period) % h.period;
  const g = (x: number, w: number) => Math.exp(-(x / w) * (x / w));
  return g(q, 0.07) + 0.6 * g(q - 0.22, 0.07);
};
/** walk phase synced with the footstep SFX (a step lands every period/2 from TL.walk.from); null outside the walk range */
export const walkPhase = (t: number) => { const w = (TL as unknown as { walk: { from: number; to: number; period: number } }).walk; return t >= w.from - 0.5 && t < w.to + 0.5 ? (2 * Math.PI * (t - w.from)) / w.period : null; };
/** breathing phase synced with the breath SFX (inhale starts at from+k*period) */
export const breathPhase = (t: number) => (2 * Math.PI * (t - TL.breath.from)) / TL.breath.period;

export type RGB = [number, number, number];
export type Light =
  | { k: "spot"; x: number; y: number; r: number; i: number; col: RGB }
  | { k: "cone"; ox: number; oy: number; tx: number; ty: number; w: number; r: number; i: number; col: RGB; beam?: number }; // beam = volumetric haze strength (0..1), engine draws it + dust inside
export type Cam = { z: number; cx: number; cy: number; rot: number };
/** L(depth) re-sets the transform for the following drawing calls: depth 1 = midground (lights live here), <1 background (moves less), >1 foreground (moves more). */
export type Layer = (depth: number) => void;
export type Shot = {
  name: string; a: number; b: number;
  draw: (c: C2, p: Pal, u: number, t: number, L: Layer) => void;
  lights: (u: number, t: number) => Light[];
  amb: (u: number, t: number) => number;
  cam: (u: number, t: number) => Cam;   // slow and eased; the engine adds the handheld drift
  tint?: "red" | "blue";
  dust?: number;                        // dust density in light (0..1)
};
export const W = 1080, H = 1920;
export const WARM: RGB = [255, 214, 160], TORCH: RGB = [255, 236, 200], RED: RGB = [255, 70, 40], STOVE: RGB = [255, 110, 50], MOON: RGB = [150, 180, 255];
/** calm torch: gentle breathing brightness + optional smooth dips (no random stutter) */
export const flick = (t: number, dips: number[] = []) => {
  let b = 0.93 + 0.04 * Math.sin(t * 5.3) + 0.03 * Math.sin(t * 11.7 + 1.3);
  for (const d of dips) b *= 1 - 0.6 * Math.exp(-((t - d) / 0.18) * ((t - d) / 0.18));
  return b;
};
/** slow cinematic move: eased value between two times */
export const move = (t: number, t0: number, t1: number, a: number, b: number) => {
  const x = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); const e = x * x * x * (x * (x * 6 - 15) + 10); return a + (b - a) * e;
};
/** eased with a small overshoot + settle (heads, hands): weight, not robots */
export const settle = (t: number, t0: number, t1: number, a: number, b: number, over = 0.08) => {
  const x = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
  const e = x < 1 ? 1 - Math.pow(1 - x, 3) * Math.cos(x * Math.PI * 0.5) + over * Math.sin(x * Math.PI) * (1 - x) * 4 : 1;
  return a + (b - a) * e;
};
/** SIZE BIBLE (fraction of frame height for a standing adult): wide 0.35, medium 0.6, close-up head 0.45 */
export const SIZE = { wide: 0.35 * H, medium: 0.6 * H, closeHead: 0.45 * H };
/** smooth 0..1 window: rises over r s at a, falls over r s at b */
export const win = (t: number, a: number, b: number, r = 0.35) => Math.max(0, Math.min(1, (t - a) / r)) * Math.max(0, Math.min(1, (b - t) / r));
/** STILLNESS after "nggak ada angin" (cue noWind): 1 = normal breeze, eases to 0 by noWind+0.8 and stays 0 until the end of shot "lost". Every leaf/grass/cloth sway in shots fog/lost must be multiplied by this. */
export const breeze = (t: number) => { const nw = TL.cues.noWind, la = TL.shots.find((s) => s[0] === "lost")![2]; if (t < nw) return 1; if (t < la) return Math.max(0, 1 - (t - nw) / 0.8) ** 2; return 1; };
/** fog density 0..1 used by shots (fog rolls in at cue fogIn) */
export const fogAmt = (t: number) => { const f = TL.cues.fogIn; return t < f ? 0.15 : Math.min(1, 0.15 + 0.85 * ((t - f) / 2.2)); };
/** shared light colours for this story */
export const DUSK: RGB = [255, 168, 120], LANTERN: RGB = [255, 190, 110], DAWN: RGB = [235, 225, 210], HEADLAMP: RGB = [240, 246, 255];
