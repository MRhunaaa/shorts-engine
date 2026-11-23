// Shared drawing helpers for Horror3 shot files (read-only for shot agents; put your own helpers in your own file).
import { C2, Pal, box as box0, cut as cut0, rough, rrect, clamp } from "../horror1/paint";
import { Layer, move } from "./types";
export { hash, clamp, lerp, ss, vnoise, rough, rrect, castShadow } from "../horror1/paint";

export type CutOpt = { edge?: number; hatch?: number; dir?: number; seed?: number; bbox?: [number, number, number, number] };
/** box with the edge stroked AFTER the hatch (paint.ts cut() edge bug → stray diagonal lines; never call cut() directly) */
export function box(c: C2, p: Pal, x: number, y: number, w: number, h: number, fill: string, hatch = 0, seed = 1, dir = 0.8, edge = 3) {
  box0(c, p, x, y, w, h, fill, hatch, seed, dir, 0);
  if (edge) { rrect(c, x, y, w, h, seed); c.strokeStyle = p.ink; c.lineWidth = edge; c.lineJoin = "round"; c.stroke(); }
}
/** rough polygon filled + woodcut hatch, then the same path stroked as the edge */
export function rcut(c: C2, p: Pal, pts: [number, number][], amp: number, seed: number, fill: string, o: CutOpt = {}) {
  rough(c, pts, true, amp, seed); cut0(c, p, fill, { ...o, edge: 0 });
  if (o.edge) { rough(c, pts, true, amp, seed); c.strokeStyle = p.ink; c.lineWidth = o.edge; c.lineJoin = "round"; c.stroke(); }
}
export const lit = (p: Pal) => p.mode === "lit";
/** blurred foreground element at parallax depth 1.6 (thin, at the frame edge; never a wide band over the action) */
export const fg = (c: C2, p: Pal, L: Layer, fn: () => void, blur = 7) => { L(1.6); c.save(); c.filter = `blur(${blur}px)`; c.fillStyle = p.fig; c.strokeStyle = p.fig; fn(); c.restore(); c.filter = "none"; };
export const smooth = (x: number) => x * x * (3 - 2 * x);
/** calm wind with slow gusts (0..~1.3) */
export const gust = (t: number) => Math.pow(Math.max(0, Math.sin(t * 0.45 + 0.6)), 3) + 0.3 * Math.pow(Math.max(0, Math.sin(t * 1.13 + 1.9)), 2);
/** eased camera between two times */
export const cam = (a: number, b: number, z0: number, z1: number, cx0: number, cy0: number, cx1 = cx0, cy1 = cy0) =>
  (_u: number, t: number) => ({ z: move(t, a, b, z0, z1), cx: move(t, a, b, cx0, cx1), cy: move(t, a, b, cy0, cy1), rot: 0 });
/** internal hard cuts inside a shot: each setup eased within its own window */
export type CamSet = { a: number; z0: number; z1: number; cx0: number; cy0: number; cx1?: number; cy1?: number };
export const cuts = (sets: CamSet[], end: number) => (_u: number, t: number) => {
  let i = 0; for (let k = 0; k < sets.length; k++) if (t >= sets[k].a) i = k;
  const s = sets[i], b = sets[i + 1]?.a ?? end;
  return { z: move(t, s.a, b, s.z0, s.z1), cx: move(t, s.a, b, s.cx0, s.cx1 ?? s.cx0), cy: move(t, s.a, b, s.cy0, s.cy1 ?? s.cy0), rot: 0 };
};
/** soft fog band (draw in BOTH passes; dark pass = navy-grey, lit pass = paper-grey). y = band centre, h = thickness, a = alpha */
export function fogBand(c: C2, p: Pal, y: number, h: number, a: number, t: number, seed = 0, x0 = -200, x1 = 1280) {
  const col = lit(p) ? "214,206,188" : "70,86,112";
  for (let k = 0; k < 7; k++) {
    const cx = x0 + ((k * 260 + t * (6 + 3 * Math.sin(seed + k)) + seed * 97) % (x1 - x0 + 400)) - 200, cy = y + Math.sin(k * 1.7 + seed) * h * 0.25;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, h * 1.4);
    g.addColorStop(0, `rgba(${col},${clamp(a)})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(cx - h * 1.4, cy - h * 1.4, h * 2.8, h * 2.8);
  }
}
