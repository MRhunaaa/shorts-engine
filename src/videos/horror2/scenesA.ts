// Horror2 "Gelas Kelima", shots A: hook, title, pos, patrol, return. Times from timeline.json via types.ts.
// People = sideFigure() only (side profiles, head 1/7.5). Symmetric props from rig.ts. Two passes (dark navy / lit woodcut).
import { C2, Pal, box as box0, cut as cut0, rough, rrect, gedek, castShadow, hash, clamp, lerp } from "../horror1/paint";

// paint.ts cut() strokes its edge AFTER the hatch loop, so the edge stroke re-draws the last hatch line full length
// (long stray diagonal lines). Local wrappers: hatch first without edge, then rebuild the same path and stroke it.
type CutOpt = { edge?: number; hatch?: number; dir?: number; seed?: number; bbox?: [number, number, number, number] };
let lastPath: (() => void) | null = null;
function box(c: C2, p: Pal, x: number, y: number, w: number, h: number, fill: string, hatch = 0, seed = 1, dir = 0.8, edge = 3) {
  box0(c, p, x, y, w, h, fill, hatch, seed, dir, 0);
  if (edge) { rrect(c, x, y, w, h, seed); c.strokeStyle = p.ink; c.lineWidth = edge; c.lineJoin = "round"; c.stroke(); }
}
/** use instead of rough()+cut(): pts/amp/seed rebuild the identical path for the edge stroke */
function rcut(c: C2, p: Pal, pts: [number, number][], amp: number, seed: number, fill: string, o: CutOpt = {}) {
  rough(c, pts, true, amp, seed); cut0(c, p, fill, { ...o, edge: 0 });
  if (o.edge) { rough(c, pts, true, amp, seed); c.strokeStyle = p.ink; c.lineWidth = o.edge; c.lineJoin = "round"; c.stroke(); }
}
void lastPath;
import { Shot, Layer, Light, SHOT_RANGE, CUE, W, H, WARM, TORCH, MOON, flick, move, settle, SIZE, walkPhase } from "./types";
import { sideFigure, sideJoints, torchCone, petromaks, coffeeGlass, kentongan, SidePose } from "./rig";
import * as RIG from "./rig";

type J_ = ReturnType<typeof sideJoints>;
/** hand anchor for held objects: uses rig.handAnchor when the rig agent's version is present, else the FK hand */
const hand = (J: J_, side: "F" | "B"): { x: number; y: number; ang: number } => {
  const fn = (RIG as unknown as { handAnchor?: (j: J_, s: "F" | "B") => { x: number; y: number; ang: number } }).handAnchor;
  if (fn) return fn(J, side);
  const A = side === "F" ? J.AF : J.AB; return { x: A.ha[0], y: A.ha[1], ang: J.d === 1 ? A.f : -A.f };
};
/** smooth 0..1 window: rises over `r` s at a, falls over `r` s at b */
const win = (t: number, a: number, b: number, r = 0.35) => clamp((t - a) / r) * clamp((b - t) / r);
const smooth = (x: number) => x * x * (3 - 2 * x);
/** shared wind: calm with slow gusts (0..~1.3). Bamboo, palms, sarung, kentongan and leaves all move with it */
const gust = (t: number) => Math.pow(Math.max(0, Math.sin(t * 0.45 + 0.6)), 3) + 0.3 * Math.pow(Math.max(0, Math.sin(t * 1.13 + 1.9)), 2);
/** pick a camera setup inside a shot: hard cuts at the given times; each setup is eased within its own window */
type CamSet = { a: number; z0: number; z1: number; cx0: number; cy0: number; cx1?: number; cy1?: number };
const cuts = (sets: CamSet[], end: number) => (_u: number, t: number) => {
  let i = 0; for (let k = 0; k < sets.length; k++) if (t >= sets[k].a) i = k;
  const s = sets[i], b = sets[i + 1]?.a ?? end;
  return { z: move(t, s.a, b, s.z0, s.z1), cx: move(t, s.a, b, s.cx0, s.cx1 ?? s.cx0), cy: move(t, s.a, b, s.cy0, s.cy1 ?? s.cy0), rot: 0 };
};

const R = (n: string) => SHOT_RANGE(n);
const [HA, HB] = R("hook"), [TA, TB] = R("title"), [PA, PB] = R("pos"), [WA, WB] = R("patrol"), [RA, RB] = R("return");
const cam = (a: number, b: number, z0: number, z1: number, cx0: number, cy0: number, cx1 = cx0, cy1 = cy0) =>
  (_u: number, t: number) => ({ z: move(t, a, b, z0, z1), cx: move(t, a, b, cx0, cx1), cy: move(t, a, b, cy0, cy1), rot: 0 });
const fg = (c: C2, p: Pal, L: Layer, fn: () => void) => { L(1.6); c.save(); c.filter = "blur(7px)"; c.fillStyle = p.fig; c.strokeStyle = p.fig; fn(); c.restore(); c.filter = "none"; };
const lit = (p: Pal) => p.mode === "lit";
const COFFEE = "#3a2312", GLASS_LIT = "rgba(245,238,220,0.55)", GLASS_DARK = "rgba(60,80,120,0.35)";
const glassCol = (p: Pal) => (lit(p) ? GLASS_LIT : GLASS_DARK);
const coffeeCol = (p: Pal) => (lit(p) ? COFFEE : "#0b0d14");

// ---------------------------------------------------------------- environment pieces
function sky(c: C2, p: Pal, t: number, mx: number, my: number, y1: number) {
  const g = c.createLinearGradient(0, -100, 0, y1);
  g.addColorStop(0, lit(p) ? "#bfb293" : "#060b1a"); g.addColorStop(1, lit(p) ? "#ddd1b4" : "#16233f");
  c.fillStyle = g; c.fillRect(-120, -120, W + 240, y1 + 120);
  if (!lit(p)) {
    const m = c.createRadialGradient(mx, my, 6, mx, my, 260); m.addColorStop(0, "rgba(230,236,255,0.95)"); m.addColorStop(0.12, "rgba(200,212,245,0.55)"); m.addColorStop(1, "rgba(40,60,110,0)");
    c.fillStyle = m; c.fillRect(mx - 260, my - 260, 520, 520);
    c.fillStyle = "#e6ebff"; c.beginPath(); c.arc(mx, my, 34, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 60; i++) { // twinkling stars
      const tw = 0.5 + 0.5 * Math.sin(t * (1.3 + 2.2 * hash(i * 1.7)) + i * 2.3);
      c.fillStyle = `rgba(220,228,255,${(0.18 + 0.45 * hash(i * 3.3)) * (0.55 + 0.45 * tw)})`; const sz = hash(i * 9.1) > 0.85 ? 3 : 2; c.fillRect(hash(i) * (W + 200) - 100, hash(i * 7.1) * y1 * 0.7, sz, sz);
    }
  }
  // the glow of another village on the horizon (warm, very faint)
  const hg = c.createRadialGradient(W * 0.18, y1, 10, W * 0.18, y1, 420);
  hg.addColorStop(0, lit(p) ? "rgba(255,226,170,0.28)" : "rgba(120,80,40,0.35)"); hg.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = hg; c.fillRect(W * 0.18 - 420, y1 - 420, 840, 420);
  // thin clouds drifting across the moon
  c.fillStyle = lit(p) ? "rgba(120,104,80,0.25)" : "rgba(30,44,78,0.75)";
  for (let k = 0; k < 4; k++) {
    const cx = ((k * 420 + t * 9) % (W + 600)) - 300, cy = my - 40 + k * 55;
    c.beginPath(); c.ellipse(cx, cy, 220, 18, 0, 0, Math.PI * 2); c.ellipse(cx + 120, cy - 8, 140, 14, 0, 0, Math.PI * 2); c.fill();
  }
  // a bat flits across the moon every ~9 s (erratic path, flapping)
  { const per = 9, ph = ((t + 2.5) % per) / per; if (ph < 0.35) { const q = ph / 0.35, bx = lerp(mx - 420, mx + 380, q) + 40 * Math.sin(q * 19), by = my + 60 - 140 * q + 30 * Math.sin(q * 13);
    const fl = Math.sin(t * 38); c.fillStyle = lit(p) ? "#2a1c12" : "#05070c"; c.beginPath(); c.moveTo(bx, by);
    c.quadraticCurveTo(bx - 14, by - 10 * fl - 4, bx - 26, by - 2 * fl); c.quadraticCurveTo(bx - 14, by + 2, bx, by + 4); c.quadraticCurveTo(bx + 14, by + 2, bx + 26, by - 2 * fl); c.quadraticCurveTo(bx + 14, by - 10 * fl - 4, bx, by); c.fill(); } }
  // tiny far village lights on the horizon, flickering
  for (let k = 0; k < 9; k++) { const lx = W * 0.05 + k * 47 + 20 * hash(k * 3), a = 0.35 + 0.35 * Math.max(0, Math.sin(t * (0.7 + hash(k)) + k * 3)); c.fillStyle = lit(p) ? `rgba(255,232,180,${a})` : `rgba(230,180,90,${a})`; c.fillRect(lx, y1 - 14 - 6 * hash(k * 5), 3, 3); }
}
function palm(c: C2, p: Pal, x: number, y: number, h: number, t: number, seed: number) {
  const sw = 0.03 * Math.sin(t * 0.8 + seed) + 0.035 * gust(t - 0.2);
  c.fillStyle = p.ink; c.strokeStyle = p.ink; c.lineWidth = h * 0.035; c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + h * 0.08, y - h * 0.5, x + h * (0.05 + sw), y - h); c.stroke();
  const tx = x + h * (0.05 + sw), ty = y - h;
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI + (k / 8) * Math.PI + sw * 3, L = h * (0.32 + 0.06 * hash(seed + k));
    c.lineWidth = h * 0.012; c.beginPath(); c.moveTo(tx, ty);
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.5 + L * 0.35; c.quadraticCurveTo(tx + Math.cos(a) * L * 0.5, ty + Math.sin(a) * L * 0.4 - L * 0.1, ex, ey); c.stroke();
    for (let q = 1; q < 8; q++) { const fx = tx + (ex - tx) * (q / 8), fy = ty + (ey - ty) * (q / 8) - Math.sin((q / 8) * Math.PI) * L * 0.1; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + 8, fy + 16); c.moveTo(fx, fy); c.lineTo(fx - 8, fy + 16); c.stroke(); }
  }
}
function distantHouse(c: C2, p: Pal, x: number, y: number, s: number, t: number) {
  c.fillStyle = p.ink; c.beginPath(); c.moveTo(x - s * 0.6, y - s * 0.45); c.lineTo(x, y - s * 0.8); c.lineTo(x + s * 0.6, y - s * 0.45); c.closePath(); c.fill();
  c.fillRect(x - s * 0.5, y - s * 0.46, s, s * 0.46);
  c.fillStyle = lit(p) ? "#f4d79c" : "#8a6a2a"; c.globalAlpha = 0.85 + 0.15 * Math.sin(t * 2.3); c.fillRect(x + s * 0.12, y - s * 0.34, s * 0.16, s * 0.14); c.globalAlpha = 1;
}
function bananaPlant(c: C2, p: Pal, x: number, y: number, h: number, t: number, seed: number) {
  c.fillStyle = p.fig; c.fillRect(x - h * 0.03, y - h * 0.55, h * 0.06, h * 0.55);
  for (let k = 0; k < 6; k++) {
    const side = k % 2 ? 1 : -1, a = 0.5 + 0.12 * k + 0.04 * Math.sin(t * 0.9 + seed + k);
    c.save(); c.translate(x, y - h * (0.45 + 0.08 * k)); c.rotate(side * a);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(side * h * 0.12, -h * 0.25, side * h * 0.04, -h * 0.5); c.quadraticCurveTo(-side * h * 0.04, -h * 0.25, 0, 0); c.fill();
    c.restore();
  }
}
function bambooFence(c: C2, p: Pal, x0: number, x1: number, y: number, h: number) {
  c.fillStyle = p.wood2; c.strokeStyle = p.ink; c.lineWidth = 2;
  for (let x = x0; x < x1; x += 26) { const hh = h * (0.85 + 0.15 * hash(x)); c.fillRect(x, y - hh, 14, hh); if (lit(p)) { c.strokeRect(x, y - hh, 14, hh); c.beginPath(); c.moveTo(x, y - hh * 0.5); c.lineTo(x + 14, y - hh * 0.5); c.stroke(); } }
  c.fillStyle = p.wood; c.fillRect(x0, y - h * 0.7, x1 - x0, 10); c.fillRect(x0, y - h * 0.3, x1 - x0, 10);
}
function road(c: C2, p: Pal, y: number, x0 = -150, x1 = W + 150) {
  box(c, p, x0, y, x1 - x0, H + 200 - y, lit(p) ? "#b8a479" : "#0b1120", 0.55, 31, 1.57, 0);
  if (lit(p)) { c.fillStyle = "rgba(40,28,16,0.35)"; for (let i = 0; i < 90; i++) { const px = x0 + hash(i * 2.1) * (x1 - x0), py = y + 20 + hash(i * 5.7) * (H - y); c.beginPath(); c.ellipse(px, py, 4 + 6 * hash(i), 2 + 2 * hash(i * 3), 0, 0, Math.PI * 2); c.fill(); } }
}
function bicycle(c: C2, p: Pal, x: number, y: number, s: number, glint = 0) { // leaning, wheels symmetric
  const r = s * 0.2; c.strokeStyle = p.ink; c.lineWidth = Math.max(3, s * 0.018);
  for (const wx of [x - s * 0.33, x + s * 0.33]) {
    c.beginPath(); c.arc(wx, y - r, r, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.2; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.beginPath(); c.moveTo(wx, y - r); c.lineTo(wx + Math.cos(a) * r, y - r + Math.sin(a) * r); c.stroke(); }
    c.lineWidth = Math.max(3, s * 0.018); c.beginPath(); c.arc(wx, y - r, r * 0.08, 0, Math.PI * 2); c.stroke();
  }
  const bx = x - s * 0.33, fx = x + s * 0.33, cy = y - r;
  c.beginPath(); c.moveTo(bx, cy); c.lineTo(x - s * 0.02, cy); c.lineTo(x - s * 0.12, y - s * 0.52); c.lineTo(bx, cy); c.moveTo(x - s * 0.12, y - s * 0.52); c.lineTo(fx - s * 0.06, y - s * 0.55); c.lineTo(x - s * 0.02, cy); c.moveTo(fx - s * 0.06, y - s * 0.55); c.lineTo(fx, cy); c.stroke();
  c.lineWidth = Math.max(4, s * 0.025); c.beginPath(); c.moveTo(x - s * 0.18, y - s * 0.58); c.lineTo(x - s * 0.06, y - s * 0.58); c.moveTo(fx - s * 0.1, y - s * 0.66); c.lineTo(fx, y - s * 0.66); c.moveTo(fx - s * 0.06, y - s * 0.55); c.lineTo(fx - s * 0.05, y - s * 0.66); c.stroke();
  // bell on the handlebar + a glint that comes and goes with the lamp
  c.fillStyle = p.ink; c.beginPath(); c.arc(fx - s * 0.02, y - s * 0.67, s * 0.018, 0, Math.PI * 2); c.fill();
  if (glint > 0) { c.fillStyle = `rgba(255,248,225,${glint})`; c.beginPath(); c.arc(fx - s * 0.026, y - s * 0.676, s * 0.007, 0, Math.PI * 2); c.fill(); }
}
const mothPos = (k: number, x: number, y: number, r: number, t: number): [number, number] => {
  const a = t * (1.6 + 0.4 * hash(k)) + k * 1.9 + 0.6 * Math.sin(t * 0.7 + k), rr = r * (0.5 + 0.5 * hash(k * 3.1)) * (0.85 + 0.15 * Math.sin(t * 1.1 + k * 2));
  return [x + Math.cos(a) * rr, y + Math.sin(a * 1.3) * rr * 0.55];
};
function moths(c: C2, p: Pal, x: number, y: number, r: number, t: number, n = 7) {
  c.fillStyle = lit(p) ? "#2a1c12" : "#05070c";
  for (let k = 0; k < n; k++) {
    const [mx, my] = mothPos(k, x, y, r, t), fl = 0.5 + 0.5 * Math.sin(t * 30 + k);
    c.beginPath(); c.ellipse(mx - 3, my, 4 * fl + 1, 2.5, 0.4, 0, Math.PI * 2); c.ellipse(mx + 3, my, 4 * fl + 1, 2.5, -0.4, 0, Math.PI * 2); c.fill();
  }
}
/** soft moth shadows thrown on the wall by the lamp (projected away from the lamp ×k) */
function mothShadows(c: C2, p: Pal, x: number, y: number, r: number, t: number, k = 2.2, n = 7) {
  if (!lit(p)) return;
  for (let i = 0; i < n; i++) {
    const [mx, my] = mothPos(i, x, y, r, t), sx = x + (mx - x) * k, sy = y + (my - y) * k + 30, fl = 0.5 + 0.5 * Math.sin(t * 30 + i);
    c.fillStyle = "rgba(40,26,14,0.22)"; c.beginPath(); c.ellipse(sx - 7, sy, (8 * fl + 3) * 1.6, 5, 0.4, 0, Math.PI * 2); c.ellipse(sx + 7, sy, (8 * fl + 3) * 1.6, 5, -0.4, 0, Math.PI * 2); c.fill();
  }
}
function fireflies(c: C2, p: Pal, t: number, y0: number, y1: number, n = 14, seed = 0) {
  if (lit(p)) return;
  for (let k = 0; k < n; k++) {
    const x = ((hash(k + seed) * (W + 200) + 30 * Math.sin(t * 0.3 + k)) % (W + 200)) - 100, y = y0 + hash(k * 7.7 + seed) * (y1 - y0) + 20 * Math.sin(t * 0.5 + k * 2);
    const b = Math.max(0, Math.sin(t * (1 + hash(k)) + k * 4)); if (b < 0.05) continue;
    const g = c.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, `rgba(255,236,150,${0.9 * b})`); g.addColorStop(1, "rgba(255,220,120,0)");
    c.fillStyle = g; c.fillRect(x - 14, y - 14, 28, 28);
  }
}
function fog(c: C2, p: Pal, t: number, y: number, h: number, dens = 1, scroll = 0) {
  c.fillStyle = lit(p) ? `rgba(240,232,214,${0.22 * dens})` : `rgba(90,110,150,${0.16 * dens})`;
  for (let k = 0; k < 7; k++) {
    const x = ((k * 330 + t * (14 + 6 * k) - scroll) % (W + 900) + (W + 900)) % (W + 900) - 450;
    c.beginPath(); c.ellipse(x, y + (k % 3) * h * 0.25, 360, h * 0.35, 0, 0, Math.PI * 2); c.fill();
  }
}
function bamboo(c: C2, p: Pal, x: number, y: number, h: number, t: number, seed: number) {
  for (let k = 0; k < 6; k++) {
    const bx = x + (k - 2.5) * 22, sway = 0.035 * Math.sin(t * 0.7 + seed + k * 0.6) + 0.05 * gust(t - k * 0.08) + 0.012 * gust(t) * Math.sin(t * 6 + k), hh = h * (0.8 + 0.2 * hash(seed + k));
    const tx = bx + Math.sin(sway) * hh, ty = y - hh;
    c.strokeStyle = p.ink; c.lineWidth = 12; c.lineCap = "round"; c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx, y - hh * 0.5, tx, ty); c.stroke();
    if (lit(p)) { c.strokeStyle = p.wood; c.lineWidth = 7; c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx, y - hh * 0.5, tx, ty); c.stroke(); c.fillStyle = p.ink; for (let q = 1; q < 9; q++) { const f = q / 9; c.fillRect(lerp(bx, tx, f * f) - 7, lerp(y, ty, f) - 2, 14, 4); } }
    c.fillStyle = p.ink;
    for (let q = 0; q < 6; q++) { const f = 0.55 + q * 0.08, lx = lerp(bx, tx, f * f), ly = lerp(y, ty, f), sd = q % 2 ? 1 : -1;
      // leaves flutter on their own (faster, per-leaf phase) on top of the culm sway
      const fl = 0.1 * Math.sin(t * (2.3 + hash(seed + k * 7 + q)) + q * 1.9 + k) + 0.05 * Math.sin(t * 5.1 + q + seed);
      c.save(); c.translate(lx, ly); c.rotate(sd * (0.9 + 0.3 + fl * 1.4)); c.beginPath(); c.ellipse(sd * 22, 12, 26, 5, 0, 0, Math.PI * 2); c.fill(); c.restore();
      c.save(); c.translate(lx, ly); c.rotate(sd * (0.9 + fl)); c.beginPath(); c.ellipse(sd * 26, 0, 30, 6, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  }
}
function nisan(c: C2, p: Pal, x: number, y: number, s: number, kind: number) {
  const f = lit(p) ? "#d9cfb6" : "#121a2b";
  rcut(c, p, [[x - s * 0.12, y], [x - s * 0.12, y - s * 0.5], ...(kind % 2 ? [[x, y - s * 0.68] as [number, number]] : [[x - s * 0.08, y - s * 0.62] as [number, number], [x + s * 0.08, y - s * 0.62] as [number, number]]), [x + s * 0.12, y - s * 0.5], [x + s * 0.12, y]], 2, kind * 3 + 1,
    f, { edge: 3, hatch: 0.45, dir: 0.4, bbox: [x - s * 0.12, y - s * 0.7, s * 0.24, s * 0.7], seed: kind });
  box(c, p, x - s * 0.3, y - s * 0.06, s * 0.6, s * 0.08, f, 0.5, kind + 9, 1.57, 2); // mound edge
  if (kind % 3 === 0) { c.fillStyle = lit(p) ? "#f3eee2" : "#2a3654"; c.beginPath(); c.moveTo(x - s * 0.13, y - s * 0.46); c.lineTo(x + s * 0.13, y - s * 0.5); c.lineTo(x + s * 0.11, y - s * 0.3); c.lineTo(x - s * 0.12, y - s * 0.26); c.closePath(); c.fill(); } // white cloth (mori)
}
function kamboja(c: C2, p: Pal, x: number, y: number, s: number, t: number) {
  c.strokeStyle = p.ink; c.lineCap = "round";
  const br = (bx: number, by: number, a: number, L: number, w: number, d: number) => {
    const ex = bx + Math.sin(a) * L, ey = by - Math.cos(a) * L; c.lineWidth = w; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + Math.sin(a) * L * 0.3 + 10, by - L * 0.6, ex, ey); c.stroke();
    if (d < 3) { br(ex, ey, a - 0.5, L * 0.7, w * 0.65, d + 1); br(ex, ey, a + 0.45, L * 0.68, w * 0.65, d + 1); }
    else { c.fillStyle = p.ink; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(ex + Math.cos(k * 1.3) * 18, ey + Math.sin(k * 1.3) * 10, 16, 6, k, 0, Math.PI * 2); c.fill(); }
      if (lit(p)) { c.fillStyle = "#f6f1e4"; c.beginPath(); c.arc(ex + 6, ey - 4, 5, 0, Math.PI * 2); c.fill(); } }
  };
  br(x, y, -0.05 + 0.01 * Math.sin(t * 0.5), s * 0.42, s * 0.06, 0);
}

// ---------------------------------------------------------------- small living details
/** cicak (gecko) on a wall: moves in short dashes along a wobbly path and stops; s = body length */
function cicak(c: C2, p: Pal, x0: number, y0: number, s: number, t: number, seed: number, dist = 160) {
  // progress = sum of dashes (each 0.25 s) at pseudo-random times
  let prog = 0; for (let k = 0; k < 10; k++) { const tk = k * 1.7 + 2 * hash(seed + k); prog += smooth(clamp((t % 18 - tk) / 0.25)) * (0.06 + 0.06 * hash(seed * 3 + k)); }
  prog = Math.min(1, prog);
  const ang = -1.2 + 0.5 * Math.sin(prog * 5 + seed), x = x0 + Math.cos(ang) * dist * prog * 0.4 + 40 * Math.sin(prog * 3 + seed), y = y0 - dist * prog;
  const moving = Array.from({ length: 10 }, (_, k) => { const tk = k * 1.7 + 2 * hash(seed + k); return clamp((t % 18 - tk) / 0.25); }).some((v) => v > 0 && v < 1);
  const wig = moving ? Math.sin(t * 40) * 0.35 : 0;
  c.save(); c.translate(x, y); c.rotate(ang + Math.PI / 2); c.fillStyle = lit(p) ? "#3a2a1c" : "#0a0f1a"; c.strokeStyle = c.fillStyle; c.lineCap = "round";
  c.beginPath(); c.ellipse(0, 0, s * 0.11, s * 0.3, 0, 0, Math.PI * 2); c.fill();          // body
  c.beginPath(); c.ellipse(0, -s * 0.38, s * 0.09, s * 0.12, 0, 0, Math.PI * 2); c.fill(); // head
  c.lineWidth = s * 0.07; c.beginPath(); c.moveTo(0, s * 0.28); c.quadraticCurveTo(s * 0.15 * Math.sin(t * 2 + seed), s * 0.55, s * 0.05, s * 0.75); c.stroke(); // tail
  c.lineWidth = s * 0.045; for (const [sy, sd] of [[-0.18, 1], [-0.18, -1], [0.18, 1], [0.18, -1]] as [number, number][]) { const a = sd * (1.1 + (sd * sy > 0 ? wig : -wig)); c.beginPath(); c.moveTo(0, sy * s); c.lineTo(Math.sin(a) * s * 0.2 * sd, sy * s + Math.cos(a) * s * 0.1); c.stroke(); }
  c.restore();
}
/** dog lying by the road; lifts its head (0..1); track = extra head angle (follows something unseen); ears 0..1 = flattened */
function dog(c: C2, p: Pal, x: number, y: number, s: number, lift: number, t: number, track = 0, ears = 0) {
  c.fillStyle = p.fig; c.save(); c.translate(x, y);
  c.beginPath(); c.ellipse(0, -s * 0.13, s * 0.42, s * 0.14, 0, 0, Math.PI * 2); c.fill();                // body lying
  c.beginPath(); c.ellipse(-s * 0.3, -s * 0.06, s * 0.16, s * 0.06, 0.2, 0, Math.PI * 2); c.fill();        // folded hind leg
  c.beginPath(); c.moveTo(s * 0.35, -s * 0.04); c.lineTo(s * 0.62, -s * 0.03); c.lineTo(s * 0.62, 0); c.lineTo(s * 0.3, 0); c.fill(); // front paws
  const br = 0.01 * s * Math.sin(t * 2.4);
  c.save(); c.translate(s * 0.36, -s * 0.2 - br); c.rotate(-0.15 - 0.55 * lift + track);                       // neck + head
  c.beginPath(); c.ellipse(s * 0.08, -s * 0.04, s * 0.11, s * 0.09, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(s * 0.15, -s * 0.07); c.lineTo(s * 0.3, -s * 0.03); c.lineTo(s * 0.28, s * 0.02); c.lineTo(s * 0.12, s * 0.03); c.fill(); // snout
  c.beginPath(); c.moveTo(s * 0.02, -s * 0.11); c.lineTo(lerp(s * 0.0, -s * 0.1, ears), lerp(-s * 0.21, -s * 0.12, ears)); c.lineTo(s * 0.08, -s * 0.12); c.fill(); // ear (pricks up / flattens back)
  c.restore();
  c.lineWidth = s * 0.04; c.strokeStyle = p.fig; c.lineCap = "round"; c.beginPath(); c.moveTo(-s * 0.4, -s * 0.12); c.quadraticCurveTo(-s * 0.55, -s * 0.1, -s * 0.58, -s * 0.02 + 0.02 * s * Math.sin(t * 1.3)); c.stroke(); // tail
  c.restore();
}
/** gecko on a wall that stalks a resting moth and catches it at `catchT` (3 dashes, tongue flick, gulp) */
function geckoCatch(c: C2, p: Pal, mx: number, my: number, s: number, t: number, catchT: number) {
  const dashes = [catchT - 3.0, catchT - 1.7, catchT - 0.6, catchT];
  let prog = 0; for (const d of dashes) prog += 0.25 * smooth(clamp((t - d + 0.22) / 0.22));
  const startY = my + 0.9 * s * 3, gx = mx - 6 * Math.sin(prog * 4), gy = lerp(startY, my + s * 0.45, prog);
  const moving = dashes.some((d) => t > d - 0.22 && t < d);
  // resting moth (wings slowly breathing) until caught
  if (t < catchT) { const fl = 0.6 + 0.4 * Math.sin(t * 1.4); c.fillStyle = lit(p) ? "#4a3624" : "#070a12"; c.beginPath(); c.ellipse(mx - 5, my, 9 * fl + 2, 5, 0.5, 0, Math.PI * 2); c.ellipse(mx + 5, my, 9 * fl + 2, 5, -0.5, 0, Math.PI * 2); c.fill(); }
  const wig = moving ? Math.sin(t * 40) * 0.4 : 0, gulp = win(t, catchT, catchT + 0.6, 0.12);
  c.save(); c.translate(gx, gy); c.fillStyle = lit(p) ? "#3a2a1c" : "#0a0f1a"; c.strokeStyle = c.fillStyle; c.lineCap = "round";
  c.beginPath(); c.ellipse(0, 0, s * 0.11, s * 0.3, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(0, -s * 0.38, s * (0.09 + 0.03 * gulp), s * 0.12, 0, 0, Math.PI * 2); c.fill();
  c.lineWidth = s * 0.07; c.beginPath(); c.moveTo(0, s * 0.28); c.quadraticCurveTo(s * 0.15 * Math.sin(t * 2), s * 0.55, s * 0.05, s * 0.75); c.stroke();
  c.lineWidth = s * 0.045; for (const [sy, sd] of [[-0.18, 1], [-0.18, -1], [0.18, 1], [0.18, -1]] as [number, number][]) { const a = sd * (1.1 + (sd * sy > 0 ? wig : -wig)); c.beginPath(); c.moveTo(0, sy * s); c.lineTo(Math.sin(a) * s * 0.2 * sd, sy * s + Math.cos(a) * s * 0.1); c.stroke(); }
  const tongue = win(t, catchT - 0.12, catchT + 0.05, 0.05); if (tongue > 0) { c.strokeStyle = lit(p) ? "#8a2a22" : "#200a0c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -s * 0.48); c.lineTo(0, -s * 0.48 - (gy - my - s * 0.38) * tongue); c.stroke(); }
  c.restore();
}
/** a few leaves drifting down, rotating; the wind gusts push them sideways */
function fallingLeaves(c: C2, p: Pal, t: number, x0: number, x1: number, y0: number, y1: number, n = 5, seed = 0) {
  c.fillStyle = p.ink;
  for (let k = 0; k < n; k++) {
    const per = 6 + 3 * hash(seed + k), ph = ((t + per * hash(seed * 2 + k)) % per) / per;
    const x = lerp(x0, x1, hash(seed + k * 3.3)) + 60 * Math.sin(ph * 6 + k) + 90 * gust(t - 0.3) * ph, y = lerp(y0, y1, ph);
    c.save(); c.translate(x, y); c.rotate(ph * 9 + k); c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(ph * 11 + k)));
    c.beginPath(); c.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
}
/** obat nyamuk bakar: green spiral on its stand + thin smoke */
function mosquitoCoil(c: C2, p: Pal, x: number, y: number, s: number, t: number) {
  c.strokeStyle = lit(p) ? "#3c4a2c" : "#0b1120"; c.lineWidth = s * 0.07; c.beginPath();
  for (let k = 0; k < 60; k++) { const a = k * 0.32, r = s * (0.08 + 0.42 * (k / 60)); const xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r * 0.28; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
  c.stroke(); const ex = x + s * 0.5, ey = y; c.fillStyle = `rgba(255,120,50,${0.6 + 0.3 * Math.sin(t * 3)})`; c.beginPath(); c.arc(ex, ey, s * 0.03, 0, Math.PI * 2); c.fill();
  c.strokeStyle = lit(p) ? "rgba(70,60,50,0.25)" : "rgba(150,165,200,0.18)"; c.lineWidth = 2.5; c.beginPath();
  for (let k = 0; k < 34; k++) { const yy = ey - k * 10, xx = ex + 18 * Math.sin(k * 0.3 + t * 0.9) * (k / 34) + 6 * Math.sin(k * 0.9 + t * 2); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
}
/** organic steam: 3 wisps per glass, each with its own speed, sway and fade; rises from the rim (x, y) */
function steamWisps(c: C2, p: Pal, x: number, y: number, h: number, t: number, seed: number) {
  c.lineCap = "round";
  for (let w = 0; w < 3; w++) {
    const sp = 0.7 + 0.5 * hash(seed + w), off = (w - 1) * h * 0.07, len = 18 + Math.floor(6 * hash(seed * 2 + w));
    c.lineWidth = h * (0.045 - w * 0.008);
    let px = x + off, py = y;
    for (let k = 1; k < len; k++) {
      const f = k / len, yy = y - k * h * 0.055, xx = x + off + Math.sin(k * (0.38 + 0.1 * w) - t * 1.6 * sp + seed + w * 2) * h * 0.1 * f + Math.sin(t * 0.6 + w + seed) * h * 0.08 * f * f;
      const a = (1 - f) * Math.min(1, f * 6) * (0.32 + 0.12 * Math.sin(t * 2 * sp + w));
      c.strokeStyle = lit(p) ? `rgba(245,240,226,${a})` : `rgba(170,185,215,${a * 0.6})`;
      c.beginPath(); c.moveTo(px, py); c.lineTo(xx, yy); c.stroke(); px = xx; py = yy;
    }
  }
}
/** condensation beads on a glass (lit pass): a few tiny highlights down the sides; (x,y) bottom centre, h height */
function condensation(c: C2, p: Pal, x: number, y: number, h: number, seed: number) {
  if (!lit(p)) return; c.fillStyle = "rgba(255,252,240,0.7)";
  for (let k = 0; k < 7; k++) { const f = 0.15 + 0.7 * hash(seed * 7 + k), side = k % 2 ? 1 : -1, w = h * (0.34 + 0.08 * f); c.beginPath(); c.arc(x + side * w * (0.75 + 0.15 * hash(k + seed)), y - h * f, Math.max(1.2, h * 0.025), 0, Math.PI * 2); c.fill(); }
}
/** sapu lidi (broom of palm ribs) leaning at angle a from (x,y) floor point */
function broom(c: C2, p: Pal, x: number, y: number, s: number, a = -0.18) {
  c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = p.ink; c.lineCap = "round";
  c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(0, -s * 0.35); c.lineTo(0, -s); c.stroke();
  c.lineWidth = 1.6; for (let k = -10; k <= 10; k++) { c.beginPath(); c.moveTo(k * s * 0.004, -s * 0.36); c.quadraticCurveTo(k * s * 0.012, -s * 0.15, k * s * 0.022, 0); c.stroke(); }
  c.lineWidth = s * 0.02; c.beginPath(); c.moveTo(-s * 0.05, -s * 0.33); c.lineTo(s * 0.05, -s * 0.33); c.stroke(); c.restore();
}
/** kendi: symmetric clay water jug with spout; (x,y) = bottom centre */
function kendi(c: C2, p: Pal, x: number, y: number, s: number) {
  const half: [number, number][] = [[0.18, 0], [0.42, -0.25], [0.45, -0.45], [0.3, -0.7], [0.12, -0.8], [0.1, -1]];
  c.fillStyle = lit(p) ? "#9c5a36" : "#120c10"; c.beginPath(); c.moveTo(x, y);
  half.forEach(([hx, hy]) => c.lineTo(x + hx * s, y + hy * s)); [...half].reverse().forEach(([hx, hy]) => c.lineTo(x - hx * s, y + hy * s)); c.closePath(); c.fill();
  c.strokeStyle = p.ink; c.lineWidth = 2; c.stroke();
  c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(x + 0.35 * s, y - 0.5 * s); c.lineTo(x + 0.62 * s, y - 0.68 * s); c.lineTo(x + 0.64 * s, y - 0.62 * s); c.lineTo(x + 0.4 * s, y - 0.4 * s); c.fill(); // spout
  if (lit(p)) { c.strokeStyle = "rgba(255,240,215,0.35)"; c.lineWidth = 3; c.beginPath(); c.arc(x - 0.15 * s, y - 0.45 * s, 0.22 * s, 3.6, 4.6); c.stroke(); }
}
/** mosquito swarm: tiny dots jittering around a centre */
function mosquitoes(c: C2, p: Pal, x: number, y: number, r: number, t: number, n = 16) {
  c.fillStyle = lit(p) ? "#1a120c" : "#05070c";
  for (let k = 0; k < n; k++) { const a = t * (3 + 2 * hash(k)) + k * 2.4, rr = r * (0.3 + 0.7 * hash(k * 1.9)); c.fillRect(x + Math.cos(a) * rr + 4 * Math.sin(t * 23 + k), y + Math.sin(a * 1.7) * rr * 0.6 + 3 * Math.sin(t * 29 + k * 2), 2, 2); }
}
/** sandal (left lying on the path) */
function sandal(c: C2, p: Pal, x: number, y: number, s: number, rot = 0.2) {
  c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = p.ink; c.beginPath(); c.ellipse(0, 0, s, s * 0.32, 0, 0, Math.PI * 2); c.fill();
  if (lit(p)) { c.strokeStyle = "#7a5a3e"; c.lineWidth = 3; c.beginPath(); c.moveTo(-s * 0.2, -s * 0.2); c.quadraticCurveTo(s * 0.2, -s * 0.45, s * 0.35, 0); c.stroke(); }
  c.restore();
}
/** spider web in a corner (lit pass only), anchor at (x,y) going down-right */
function web(c: C2, p: Pal, x: number, y: number, s: number, t: number) {
  if (!lit(p)) return; c.strokeStyle = "rgba(240,234,220,0.55)"; c.lineWidth = 1;
  const sw = 2 * Math.sin(t * 0.9);
  for (let k = 0; k <= 5; k++) { const a = (k / 5) * Math.PI / 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s + sw * (k / 5)); c.stroke(); }
  for (let r = 1; r <= 4; r++) { c.beginPath(); for (let k = 0; k <= 5; k++) { const a = (k / 5) * Math.PI / 2, rr = (r / 4.5) * s; const xx = x + Math.cos(a) * rr, yy = y + Math.sin(a) * rr + sw * (k / 5) * (r / 4); k ? c.quadraticCurveTo(x + Math.cos(a - 0.15) * rr * 0.92, y + Math.sin(a - 0.15) * rr * 0.92, xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
}
/** puddle with the lamp's reflection + frog ripples (ripple times in `drops`) */
function puddle(c: C2, p: Pal, x: number, y: number, rx: number, t: number, drops: number[], refl = 1) {
  c.fillStyle = lit(p) ? "rgba(255,246,222,0.85)" : "#1c2a48"; c.beginPath(); c.ellipse(x, y, rx, rx * 0.15, 0, 0, Math.PI * 2); c.fill();
  if (refl > 0) { const g = c.createRadialGradient(x - rx * 0.2, y, 0, x - rx * 0.2, y, rx * 0.45); g.addColorStop(0, `rgba(255,236,190,${0.8 * refl})`); g.addColorStop(1, "rgba(255,230,180,0)"); c.fillStyle = g; c.beginPath(); c.ellipse(x - rx * 0.2, y, rx * 0.25, rx * 0.12, 0, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = lit(p) ? "rgba(40,30,20,0.55)" : "rgba(140,160,200,0.45)"; c.lineWidth = 2;
  for (const d of drops) { const a = t - d; if (a < 0 || a > 1.6) continue; for (let r = 0; r < 3; r++) { const rr = (a * 70 - r * 16); if (rr <= 0) continue; c.globalAlpha = Math.max(0, 1 - a / 1.6); c.beginPath(); c.ellipse(x + rx * 0.3, y, rr, rr * 0.15, 0, 0, Math.PI * 2); c.stroke(); } c.globalAlpha = 1; }
}
/** small frog hop (arc) ending in the puddle at time d */
function frog(c: C2, p: Pal, x0: number, y0: number, x1: number, y1: number, t: number, d: number, s = 18) {
  const a = (t - (d - 0.45)) / 0.45; let x = x0, y = y0; if (a > 1) return; if (a > 0) { x = lerp(x0, x1, a); y = lerp(y0, y1, a) - Math.sin(a * Math.PI) * 60; }
  c.fillStyle = p.fig; c.beginPath(); c.ellipse(x, y - s * 0.4, s * 0.6, s * 0.4, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x + s * 0.5, y - s * 0.6, s * 0.3, s * 0.25, 0, 0, Math.PI * 2); c.fill();
}

// ---------------------------------------------------------------- the pos ronda (shared by pos / return / hook backdrop)
type Hut = { FY: number; S: number; baleTop: number; bx0: number; bx1: number; lampX: number; lampY: number; lampS: number; postL: number; postR: number };
function hutGeom(cx: number, FY: number, S: number, wf = 1.25): Hut {
  const w = wf * S, postL = cx - w / 2, postR = cx + w / 2, baleTop = FY - 0.28 * S;
  return { FY, S, baleTop, bx0: postL + 0.06 * S, bx1: postR - 0.06 * S, lampX: cx, lampY: FY - 1.13 * S, lampS: 0.22 * S, postL, postR };
}
function hutBack(c: C2, p: Pal, t: number, g: Hut, catchT?: number) {
  const { FY, S, postL, postR } = g, roofY = FY - 1.2 * S;
  // back wall of woven bamboo
  c.save(); rrect(c, postL, roofY + 0.08 * S, postR - postL, FY - roofY - 0.08 * S, 201, 1); c.clip(); gedek(c, p, postL, roofY, postR - postL, FY - roofY); c.restore();
  // jadwal ronda board
  const jx = postL + 0.62 * (postR - postL), jy = FY - 0.92 * S, jw = 0.26 * S, jh = 0.2 * S;
  box(c, p, jx, jy, jw, jh, lit(p) ? "#e9e1cc" : "#141c2c", 0.15, 202, 0.8, 3);
  if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 1.5; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(jx + 4, jy + (jh * i) / 6); c.lineTo(jx + jw - 4, jy + (jh * i) / 6); c.stroke(); } for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(jx + (jw * i) / 4, jy + jh / 6); c.lineTo(jx + (jw * i) / 4, jy + jh - 4); c.stroke(); }
    c.fillStyle = p.ink; c.font = `bold ${Math.round(S * 0.022)}px 'Courier New', monospace`; c.fillText("JADWAL RONDA", jx + 8, jy + jh / 6 - 6);
    for (let i = 0; i < 14; i++) c.fillRect(jx + 10 + hash(i) * (jw - 30), jy + jh / 6 + 6 + hash(i * 3) * (jh * 0.75), 10 + hash(i * 5) * 16, 2); }
  // calendar + nail with hanging sarung
  const kx = postL + 0.18 * (postR - postL), ky = FY - 0.95 * S;
  box(c, p, kx, ky, 0.11 * S, 0.15 * S, lit(p) ? "#efe8d6" : "#141c2c", 0.1, 203, 0.8, 2);
  if (lit(p)) { c.fillStyle = "#b3121a"; c.fillRect(kx, ky, 0.11 * S, 0.03 * S); c.fillStyle = p.ink; for (let i = 0; i < 20; i++) c.fillRect(kx + 6 + (i % 5) * 0.02 * S, ky + 0.045 * S + Math.floor(i / 5) * 0.025 * S, 4, 4); }
  const sx = postL + 0.4 * (postR - postL), sy = FY - 0.98 * S;
  // the hanging sarung sways a little in the night wind (pivot at the nail)
  c.save(); c.translate(sx, sy); c.rotate(0.03 * Math.sin(t * 0.9) + 0.012 * Math.sin(t * 2.3) + 0.06 * gust(t - 0.15)); c.translate(-sx, -sy);
  c.fillStyle = lit(p) ? "#6e4f3a" : "#0d1322"; rough(c, [[sx - 0.05 * S, sy], [sx + 0.05 * S, sy], [sx + 0.07 * S, sy + 0.3 * S], [sx + 0.02 * S, sy + 0.32 * S], [sx - 0.06 * S, sy + 0.29 * S]], true, 3, 204); c.fill();
  if (lit(p)) { c.strokeStyle = "rgba(20,12,8,0.6)"; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(sx - 0.05 * S, sy + 0.05 * S + i * 0.05 * S); c.lineTo(sx + 0.06 * S, sy + 0.06 * S + i * 0.05 * S); c.stroke(); } }
  c.restore();
  c.fillStyle = p.ink; c.beginPath(); c.arc(sx, sy, 3, 0, Math.PI * 2); c.fill(); // nail
  // a cicak hunting the moths on the wall, moth shadows, a web in the top-left corner
  if (catchT !== undefined) geckoCatch(c, p, postL + 0.83 * (postR - postL), FY - 0.82 * S, 0.075 * S, t, catchT);
  else cicak(c, p, postL + 0.78 * (postR - postL), FY - 0.45 * S, 0.075 * S, t, 3, 0.4 * S);
  mosquitoes(c, p, g.lampX + 0.05 * S, g.lampY + 0.2 * S, 0.06 * S, t);
  mothShadows(c, p, g.lampX, g.lampY + 0.11 * S, 0.12 * S, t);
  web(c, p, postL + 0.03 * S, roofY + 0.1 * S, 0.14 * S, t);
}
function hutFront(c: C2, p: Pal, t: number, g: Hut, opts: { glasses?: number; level5?: number; tray?: boolean; sandals?: number } = {}) {
  const { FY, S, postL, postR, baleTop, bx0, bx1 } = g, roofY = FY - 1.2 * S, beamY = FY - 1.13 * S;
  // bale bambu: slatted top + legs + cross bar
  for (const lx of [bx0 + 0.03 * S, bx1 - 0.06 * S, (bx0 + bx1) / 2 - 0.015 * S]) box(c, p, lx, baleTop, 0.035 * S, FY - baleTop, p.wood2, 0.6, 210 + lx, 0.8, 2);
  box(c, p, bx0, baleTop + 0.13 * S, bx1 - bx0, 0.025 * S, p.wood2, 0.5, 214, 1.57, 2);
  box(c, p, bx0 - 0.02 * S, baleTop - 0.035 * S, bx1 - bx0 + 0.04 * S, 0.04 * S, p.wood, 0.4, 215, 1.57, 2);
  if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 1.6; for (let x = bx0; x < bx1; x += 0.035 * S) { c.beginPath(); c.moveTo(x, baleTop - 0.035 * S); c.lineTo(x, baleTop + 0.005 * S); c.stroke(); } }
  // sandals under the bale (symmetric pairs)
  { const np = opts.sandals ?? 2, step = (bx1 - bx0 - 0.25 * S) / Math.max(1, np - 1);
    c.fillStyle = p.ink; for (let k = 0; k < np; k++) { const sx = bx0 + 0.08 * S + k * step, jit = (hash(k * 5.3) - 0.5) * 0.02 * S; c.beginPath(); c.ellipse(sx + jit, FY - 4, 0.035 * S, 0.008 * S, 0.05 * (k % 2), 0, Math.PI * 2); c.ellipse(sx + 0.08 * S, FY - 4, 0.035 * S, 0.008 * S, -0.05, 0, Math.PI * 2); c.fill(); } }
  // broom against the left post, a kendi on the floor by the right leg
  broom(c, p, postL + 0.05 * S, FY, 0.55 * S, 0.2);
  kendi(c, p, bx1 - 0.02 * S, FY, 0.09 * S);
  // tray + thermos + radio + ashtray on the bale
  const ty = baleTop - 0.035 * S;
  if (opts.tray !== false) {
    box(c, p, (bx0 + bx1) / 2 - 0.2 * S, ty - 0.012 * S, 0.4 * S, 0.012 * S, lit(p) ? "#a7a49a" : "#1a2236", 0.3, 216, 1.57, 2);
    // thermos (symmetric)
    const thx = (bx0 + bx1) / 2 + 0.26 * S; box(c, p, thx - 0.025 * S, ty - 0.16 * S, 0.05 * S, 0.16 * S, lit(p) ? "#8a2a22" : "#140c12", 0.4, 217, 0.2, 2);
    box(c, p, thx - 0.02 * S, ty - 0.185 * S, 0.04 * S, 0.025 * S, p.ink, 0, 218, 0, 1);
    steamWisps(c, p, thx, ty - 0.19 * S, 0.12 * S, t, 9.1);   // a thin wisp from the thermos cap
    // radio
    const rx = bx0 + 0.18 * S; box(c, p, rx, ty - 0.07 * S, 0.12 * S, 0.07 * S, lit(p) ? "#5b4632" : "#0e1424", 0.35, 219, 0.8, 2);
    if (lit(p)) { c.fillStyle = p.ink; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.fillRect(rx + 0.01 * S + i * 0.012 * S, ty - 0.06 * S + j * 0.015 * S, 3, 3); c.beginPath(); c.arc(rx + 0.095 * S, ty - 0.035 * S, 0.012 * S, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = p.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(rx + 0.11 * S, ty - 0.07 * S); c.lineTo(rx + 0.16 * S, ty - 0.2 * S); c.stroke();
    const gl = Math.max(0, Math.sin(t * 0.8 + 1)) ** 4; if (gl > 0.02) { c.fillStyle = `rgba(255,248,225,${gl})`; c.beginPath(); c.arc(rx + 0.16 * S, ty - 0.2 * S, 3, 0, Math.PI * 2); c.fill(); } // antenna tip glint
  }
  // glasses on the bale (5th apart). count = how many to draw; level5 = coffee level of the fifth
  const n = opts.glasses ?? 0;
  for (let i = 0; i < n; i++) { const gx = (bx0 + bx1) / 2 - 0.16 * S + i * 0.075 * S + (i === 4 ? 0.07 * S : 0), gy = ty - (opts.tray !== false && i < 4 ? 0.012 * S : 0); coffeeGlass(c, gx, gy, 0.055 * S, i === 4 ? opts.level5 ?? 0.85 : 0.85, t, p.ink, glassCol(p), coffeeCol(p), 1, i * 1.7); condensation(c, p, gx, gy, 0.055 * S, i); }
  // posts + front beam + roof
  for (const px of [postL, postR]) box(c, p, px - 0.03 * S, roofY + 0.05 * S, 0.06 * S, FY - roofY - 0.05 * S, p.wood, 0.55, 220 + px, 0.4, 3);
  box(c, p, postL - 0.1 * S, beamY, postR - postL + 0.2 * S, 0.06 * S, p.wood, 0.5, 222, 1.57, 3);
  rcut(c, p, [[postL - 0.22 * S, beamY + 0.005 * S], [postR + 0.22 * S, beamY + 0.005 * S], [postR + 0.05 * S, roofY - 0.18 * S], [postL - 0.05 * S, roofY - 0.18 * S]], 3, 223,
    lit(p) ? "#7a5a3e" : "#0c1220", { edge: 3, hatch: 0.75, dir: 1.57, bbox: [postL - 0.22 * S, roofY - 0.18 * S, postR - postL + 0.44 * S, 0.3 * S], seed: 11 });
  if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 2.5; for (let r = 1; r < 6; r++) { const yy = roofY - 0.18 * S + r * 0.03 * S, sp = 0.17 * S * (1 - r / 6); c.beginPath(); c.moveTo(postL - 0.05 * S - sp, yy); c.lineTo(postR + 0.05 * S + sp, yy); c.stroke();
    for (let x = postL - sp; x < postR + sp; x += 0.045 * S) { c.beginPath(); c.moveTo(x + (r % 2) * 0.02 * S, yy - 0.03 * S); c.quadraticCurveTo(x + 0.025 * S + (r % 2) * 0.02 * S, yy - 0.01 * S, x + (r % 2) * 0.02 * S, yy); c.stroke(); } } }
  // a few broken / slipped tiles (gaps show the night sky)
  for (const [fx, fr] of [[0.22, 2], [0.61, 3], [0.8, 1]] as [number, number][]) {
    const yy = roofY - 0.18 * S + fr * 0.03 * S, xx = postL - 0.1 * S + fx * (postR - postL + 0.2 * S);
    c.fillStyle = lit(p) ? "#2a1a10" : "#03050a"; rough(c, [[xx, yy - 0.026 * S], [xx + 0.04 * S, yy - 0.028 * S], [xx + 0.035 * S, yy], [xx + 0.004 * S, yy + 0.002 * S]], true, 2, 230 + fr); c.fill();
  }
  // mosquito coil on the floor by the bale
  mosquitoCoil(c, p, bx0 + 0.42 * S, FY - 6, 0.07 * S, t);
  // sign board "POS KAMLING"
  const sw = 0.5 * S, sxx = (postL + postR) / 2 - sw / 2, syy = beamY - 0.11 * S;
  box(c, p, sxx, syy, sw, 0.1 * S, lit(p) ? "#e4dac2" : "#141c2c", 0.15, 224, 0.8, 3);
  c.strokeStyle = p.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(sxx + 0.05 * S, syy); c.lineTo(sxx + 0.08 * S, beamY); c.moveTo(sxx + sw - 0.05 * S, syy); c.lineTo(sxx + sw - 0.08 * S, beamY); c.stroke();
  if (lit(p)) { c.fillStyle = "#3a2218"; c.font = `bold ${Math.round(0.062 * S)}px 'Courier New', monospace`; c.textAlign = "center"; c.fillText("POS KAMLING", sxx + sw / 2, syy + 0.072 * S); c.font = `bold ${Math.round(0.024 * S)}px 'Courier New', monospace`; c.fillText("RT 04 / RW 02", sxx + sw / 2, syy + 0.093 * S); c.textAlign = "left";
    c.fillStyle = "rgba(232,222,198,0.7)"; for (let i = 0; i < 12; i++) c.fillRect(sxx + hash(i * 9) * sw, syy + hash(i * 4) * 0.1 * S, 6 + 10 * hash(i), 2); } // worn paint
  // kentongan + beater on the left of the beam (symmetric log)
  kentongan(c, postL + 0.12 * S, beamY + 0.06 * S, 0.3 * S, p.ink, 0.03 * Math.sin(t * 0.9) + 0.012 * Math.sin(t * 2.1 + 1) + 0.05 * gust(t - 0.1));
  // its wooden beater hangs on a string and sways out of phase
  const bsw = 0.05 * Math.sin(t * 1.1 + 0.8) + 0.08 * gust(t - 0.25), bxx = postL + 0.22 * S, byy = beamY + 0.06 * S;
  c.strokeStyle = p.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(bxx, byy); c.lineTo(bxx + Math.sin(bsw) * 0.08 * S, byy + 0.08 * S); c.stroke();
  c.lineWidth = 0.016 * S; c.lineCap = "round"; c.beginPath(); c.moveTo(bxx + Math.sin(bsw) * 0.08 * S, byy + 0.08 * S); c.lineTo(bxx + Math.sin(bsw) * 0.24 * S, byy + 0.24 * S); c.stroke();
  // petromaks hanging at the centre + moths
  petromaks(c, g.lampX, g.lampY + 0.02 * S, g.lampS, p.ink, 0.85 + 0.15 * flick(t), lit(p) ? "#fff4d6" : "#ffe6a8");
  moths(c, p, g.lampX, g.lampY + 0.11 * S, 0.12 * S, t);
}
/** the kretek in Darto's hand: stick along the hand axis, ember brightens on the puff (hand near the mouth), smoke curls */
function kretek(c: C2, p: Pal, J: J_, t: number, S: number, puffing: boolean, litAt = -1) {
  const h = hand(J, "F"), dx = Math.sin(h.ang), dy = Math.cos(h.ang), L = 0.045 * S;
  const tipx = h.x + dx * L, tipy = h.y + dy * L;
  const nearMouth = puffing ? clamp(1 - Math.hypot(h.x - J.head[0], h.y - J.head[1]) / (0.25 * S)) : 0;
  const isLit = smooth(clamp((t - litAt) / 0.25));
  // match flame when lighting: a bright teardrop at the tip that flares and dies
  const f = litAt > 0 ? flare(t) : 0;
  if (f > 0.03) { const fx = tipx + 4, fy = tipy - 6; c.fillStyle = `rgba(255,236,160,${Math.min(1, f * 1.2)})`; c.beginPath(); c.moveTo(fx, fy - 26 * f - 6); c.quadraticCurveTo(fx + 9, fy - 4, fx, fy + 5); c.quadraticCurveTo(fx - 9, fy - 4, fx, fy - 26 * f - 6); c.fill();
    c.strokeStyle = p.ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(fx, fy + 5); c.lineTo(fx + 14, fy + 20); c.stroke(); }
  if (isLit < 0.02) { c.strokeStyle = lit(p) ? "#e6dcc4" : "#1e2840"; c.lineWidth = Math.max(3, 0.008 * S); c.lineCap = "round"; c.beginPath(); c.moveTo(h.x - dx * 0.01 * S, h.y - dy * 0.01 * S); c.lineTo(tipx, tipy); c.stroke(); return; }
  // ash flake: every ~3.1 s a speck drops from the tip
  { const per = 3.1, a = ((t + 0.7) % per) / 0.8; if (a < 1 && !nearMouth) { c.fillStyle = lit(p) ? "rgba(120,110,100,0.8)" : "rgba(90,100,130,0.7)"; c.fillRect(tipx + 6 * a + 3 * Math.sin(a * 9), tipy + a * a * 0.12 * S, 3, 3); } }
  c.strokeStyle = lit(p) ? "#e6dcc4" : "#1e2840"; c.lineWidth = Math.max(3, 0.008 * S); c.lineCap = "round";
  c.beginPath(); c.moveTo(h.x - dx * 0.01 * S, h.y - dy * 0.01 * S); c.lineTo(tipx, tipy); c.stroke();
  const em = 0.55 + 0.25 * Math.sin(t * 1.7) + 0.45 * nearMouth;
  c.fillStyle = `rgba(255,${110 + 80 * Math.min(1, em)},45,${Math.min(1, em)})`; c.beginPath(); c.arc(tipx, tipy, Math.max(3, 0.006 * S), 0, Math.PI * 2); c.fill();
  c.strokeStyle = lit(p) ? "rgba(60,50,40,0.28)" : "rgba(150,165,200,0.2)"; c.lineWidth = 3;
  for (const w of [0, 1]) { c.beginPath(); for (let k = 0; k < 30; k++) { const yy = tipy - 4 - k * 9, xx = tipx + (14 + 6 * w) * Math.sin(k * (0.3 + 0.08 * w) + t * (1 + 0.4 * w) + w) * (k / 30) + 8 * Math.sin(t * 0.5) * (k / 30); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
}
const lampLight = (g: Hut, t: number, r = 1.05): Light => ({ k: "spot", x: g.lampX, y: g.lampY + 0.1 * g.S, r: g.S * r, i: 1.05 * (0.96 + 0.04 * Math.sin(t * 7.3)) * flick(t), col: WARM });

// ---------------------------------------------------------------- staging
const POS_HUT = hutGeom(560, 1500, SIZE.wide * 0.9, 1.55);
const SEAT = POS_HUT.S * 0.28;
type Sitter = { key: "aku" | "darto" | "yanto" | "udin"; x: number; dir: 1 | -1; label: string; cue: string; ph: number };
// two pairs facing each other: Darto ↔ Yanto (left, Yanto works the radio), Udin ↔ aku (right)
const SITTERS: Sitter[] = [
  { key: "darto", x: POS_HUT.bx0 + 0.07 * POS_HUT.S, dir: 1, label: "PAK DARTO", cue: "nameDarto", ph: 0.4 },
  { key: "yanto", x: POS_HUT.bx0 + 0.6 * POS_HUT.S, dir: -1, label: "MAS YANTO", cue: "nameYanto", ph: 1.7 },
  { key: "udin", x: POS_HUT.bx1 - 0.6 * POS_HUT.S, dir: 1, label: "UDIN", cue: "nameUdin", ph: 2.9 },
  { key: "aku", x: POS_HUT.bx1 - 0.07 * POS_HUT.S, dir: -1, label: "AKU", cue: "nameAku", ph: 4.1 },
];
const SEED: Record<string, number> = { darto: 11, yanto: 23, udin: 37, aku: 51 };
const LIGHT_T = 9.2;                                   // Darto strikes a match and lights his kretek (insert close-up)
const flare = (t: number) => (t < LIGHT_T - 0.06 ? 0 : clamp((t - LIGHT_T + 0.06) / 0.06) * Math.exp(-(t - LIGHT_T) / 0.32));
const GECKO_T = 14.6;                                  // the cicak catches the moth on the wall
const FIFTH_X = POS_HUT.bx0 + 0.72 * POS_HUT.S;        // where the fifth (unseen) sitter's shadow sits
/** seated pose with real hand work (IK reach targets) + idle life */
function sitterPose(s: Sitter, t: number, g: Hut = POS_HUT): SidePose {
  const S = g.S, b = t * 2.0 + s.ph, d = s.dir;
  const base: SidePose = { dir: d, sit: SEAT, breath: b, idle: { t, seed: SEED[s.key] }, armB: [0.3, 0.55] };
  const J0 = sideJoints(s.x, g.FY, S, base);
  const lap: [number, number] = [s.x + d * 0.15 * S, g.FY - SEAT - 0.03 * S];
  if (s.key === "darto") { // kretek: rests on the knee, comes up to the lips every ~4.6 s (puff), lingers, goes down
    // first "puff" is him lighting it (match flare at LIGHT_T), then a puff every 4.6 s
    const ph = ((((t - (LIGHT_T - 0.48)) % 4.6) + 4.6) % 4.6) / 4.6, puff = smooth(clamp((ph - 0.05) / 0.12)) * smooth(clamp((0.48 - ph) / 0.14));
    const mouth: [number, number] = [J0.head[0] + d * 0.075 * S, J0.head[1] + 0.035 * S];
    return { ...base, reachF: [lerp(lap[0] + d * 0.02 * S, mouth[0], puff), lerp(lap[1] - 0.04 * S, mouth[1], puff)], gripF: "cig", look: -0.05 * puff, lean: 0.06 };
  }
  if (s.key === "yanto") { // leans to the radio and turns the knob (small wrist oscillation), then sits back
    const rx = g.bx0 + 0.18 * S, knob: [number, number] = [rx + 0.095 * S, g.baleTop - 0.07 * S];
    const w = win(t, PA + 1.6, PA + 5.4, 0.7), turn = 0.008 * S * Math.sin(t * 5) * w;
    return { ...base, reachF: [lerp(lap[0], knob[0] + turn, smooth(w)), lerp(lap[1], knob[1], smooth(w))], gripF: w > 0.6 ? "fist" : "open", lean: 0.16 * smooth(w), look: 0.12 * w };
  }
  if (s.key === "udin") { // listens; scratches his upper arm once after his name
    const w = win(t, CUE("nameUdin") + 0.9, CUE("nameUdin") + 2.6, 0.35), sc = 0.012 * S * Math.sin(t * 14) * w;
    const arm: [number, number] = [J0.sh[0] - d * 0.01 * S, J0.sh[1] + 0.09 * S + sc];
    return { ...base, reachF: w > 0.01 ? [lerp(lap[0], arm[0], smooth(w)), lerp(lap[1], arm[1], smooth(w))] : lap, gripF: w > 0.5 ? "fist" : "open", look: settle(t, CUE("nameUdin") - 0.4, CUE("nameUdin") + 0.6, 0.0, -0.08) };
  }
  // aku: rubs his hands once against the cold, then rests them on his knees
  const w = win(t, PA + 4.6, PA + 6.6, 0.45), rub = 0.016 * S * Math.sin(t * 11) * w;
  const chest: [number, number] = [J0.sh[0] + d * 0.12 * S, J0.sh[1] + 0.17 * S];
  return { ...base, reachF: [lerp(lap[0], chest[0] + rub, smooth(w)), lerp(lap[1], chest[1], smooth(w))], reachB: [lerp(lap[0] - d * 0.03 * S, chest[0] - rub, smooth(w)), lerp(lap[1], chest[1] + 0.01 * S, smooth(w))], gripF: "open", gripB: "open", look: 0.08 * w };
}

// patrol: camera follows; world scrolls
const PAT_S = SIZE.wide * 0.98, PAT_FY = 1540, PAT_V = 0.5 * PAT_S / 1.05;   // px per second (one stride per walk cycle)
const PAT_X = [130, 360, 590, 830];
const patKeys = ["aku", "udin", "yanto", "darto"] as const;
const scrollX = (t: number) => PAT_V * (t - WA);
const makamX = PAT_V * (CUE("makam") - WA) + W * 0.55;    // where the cemetery starts in world x (bg layer factor 1)
const STRIDE = [1.06, 0.94, 1.0, 0.92];
const GHOST_A = 22.0, GHOST_B = 22.6;                  // a pale figure stands between two nisan, only inside Darto's beam
const GHOST_WX = () => scrollX((GHOST_A + GHOST_B) / 2) * 0.75 + 712;   // ghost world x in the mid layer
/** ghost x in camera-free scene coords at time t (mid layer scrolls at 0.75; the L(0.7) parallax offset is tiny and ignored) */
const ghostScreenX = (t: number) => GHOST_WX() - scrollX(t) * 0.75;
const POV_END = 19.6;                                // patrol: low POV until here, then the wide
/** lens glare 0..1 when a torch sweep points toward the camera (peak of the sweep), POV part only */
const glare = (i: number, t: number) => (t < POV_END ? Math.pow(Math.max(0, Math.sin(t * 0.55 + i * 1.7) - 0.9) / 0.1, 2) : 0);
function patrolPose(i: number, t: number): SidePose {
  const ph = (walkPhase(t) ?? 0) + i * 0.4 + 0.15 * Math.sin(t * 0.37 + i);
  const base: SidePose = { dir: 1, walk: ph, stride: STRIDE[i], breath: t * 2 + i, idle: { t, seed: 70 + i * 9, amount: 0.6 } };
  // torch carriers sweep slowly left/right of the path (eased, not constant)
  if (i === 1 || i === 3) {
    const sw = 1.12 + 0.12 * Math.sin(t * 0.55 + i * 1.7) + 0.04 * Math.sin(t * 1.9 + i);
    const tp: SidePose = { ...base, torch: "F", gripF: "torch", armF: [sw, 0.16 + 0.05 * Math.sin(t * 0.8 + i)], torchOn: 1, look: 0.06 * Math.sin(t * 0.55 + i * 1.7) };
    // Udin (i=1) swings his beam onto the graves for a moment: the beam is the only thing that shows the pale one
    const up = i === 1 ? smooth(win(t, GHOST_A - 0.45, GHOST_B + 0.3, 0.4)) : 0;
    if (up > 0.01) {
      const J0 = sideJoints(PAT_X[i], PAT_FY, PAT_S, tp), gx = ghostScreenX(t), gy = 1445 - 0.42 * 0.82 * PAT_S;
      const dx = gx - J0.sh[0], dy = gy - J0.sh[1], L = Math.hypot(dx, dy) || 1, R = 0.3 * PAT_S;
      const aim: [number, number] = [J0.sh[0] + (dx / L) * R, J0.sh[1] + (dy / L) * R], rest = J0.AF.ha;
      return { ...tp, reachF: [lerp(rest[0], aim[0], up), lerp(rest[1], aim[1], up)], look: lerp(tp.look ?? 0, -0.1, up) };
    }
    return tp;
  }
  if (i === 0) return { ...base, armF: [0.45, 0.7], gripF: "fist" };   // carries the kentongan by its rope
  return { ...base, gripF: "open" };
}
// return: walk in, ease to a stop with feet together (phase ends on a multiple of PI)
const RET_HUT = hutGeom(820, 1500, SIZE.wide * 0.82);
const RET_S = SIZE.wide * 0.8, RET_STRIDE = 0.5 * RET_S, RET_D = RET_STRIDE * 3;
const RET_STOP = [150, 255, 360, 470];
const retProg = (t: number) => { const x = clamp((t - RA) / (CUE("stopAtPos") - RA)); return 1 - Math.pow(1 - x, 2.2); };
function returnPose(i: number, t: number): SidePose {
  const st = CUE("stopAtPos");
  const s = retProg(t), ph = (s * RET_D / RET_STRIDE) * Math.PI * 2 + i * 0.3 * (1 - s);
  const look = settle(t, st + 0.1 + i * 0.12, st + 1.0 + i * 0.12, 0, 0.28);
  // after the stop: a small weight shift (lean back then settle) so nobody freezes
  const shift = settle(t, st, st + 0.9, 0, 1) * 0.03 * Math.sin((t - st) * 1.6 + i);
  const base: SidePose = { dir: 1, walk: s < 0.999 ? ph : undefined, stride: STRIDE[i], breath: t * 2 + i, head: look, lean: shift, idle: { t, seed: 90 + i * 7, amount: 0.7 } };
  if (i === 1 || i === 3) {
    const tp: SidePose = { ...base, torch: "F", gripF: "torch", armF: [move(t, st - 0.6 + i * 0.1, st + 0.4 + i * 0.1, 1.05, 0.45), 0.12], torchOn: 1 };
    if (i === 3) { // Darto pulls his sarung back up onto his shoulder with the free hand
      const J0 = sideJoints(retX(i, t), RET_HUT.FY, RET_S, tp), w = win(t, st + 0.5, st + 2.2, 0.5);
      const sh: [number, number] = [J0.sh[0] + 0.02 * RET_S, J0.sh[1] + 0.02 * RET_S], rest: [number, number] = [J0.hip[0] + 0.03 * RET_S, J0.hip[1] - 0.02 * RET_S];
      return { ...tp, reachB: w > 0.01 ? [lerp(rest[0], sh[0], smooth(w)), lerp(rest[1], sh[1], smooth(w)) + 0.01 * RET_S * Math.sin(t * 6) * w] : undefined, gripB: w > 0.4 ? "fist" : "open" };
    }
    return tp;
  }
  return { ...base, gripF: "open" };
}
const retX = (i: number, t: number) => RET_STOP[i] - RET_D * (1 - retProg(t));

export const SHOTS_A: Shot[] = [
  { // 1 HOOK: five steaming glasses on the bale; the camera glides so the 5th lands centre on "lima"
    name: "hook", a: HA, b: HB, dust: 0.6,
    draw: (c, p, u, t, L) => {
      L(0.5); gedek(c, p, -160, -160, W + 320, 1600);
      c.fillStyle = lit(p) ? "rgba(60,40,20,0.25)" : "rgba(0,0,0,0.3)"; c.fillRect(-160, -160, W + 320, 1600);
      L(1);
      box(c, p, -140, 1150, W + 280, 40, p.wood2, 0.5, 300, 1.57, 2);   // the bale's back rail (no gap between wall and bale)
      // bale top seen low: bamboo slats running across
      box(c, p, -120, 1180, W + 240, 900, p.wood, 0.25, 301, 1.57, 0);
      if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 3; for (let k = 0; k < 9; k++) { const y = 1180 + k * k * 9 + k * 40; c.beginPath(); c.moveTo(-120, y); c.lineTo(W + 120, y); c.stroke(); c.lineWidth = 1.5; for (let x = -100 + (k % 2) * 90; x < W + 120; x += 180) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 30 + k * 6); c.stroke(); } c.lineWidth = 3; } }
      // tin tray under the first four, with a coffee ring stain and a teaspoon
      rcut(c, p, [[0, 1330], [520, 1324], [535, 1362], [-18, 1368]], 3, 302, lit(p) ? "#a9a69c" : "#18203a", { edge: 3, hatch: 0.35, dir: 1.4, bbox: [-18, 1324, 553, 44], seed: 2 });
      if (lit(p)) { c.strokeStyle = "rgba(70,40,20,0.45)"; c.lineWidth = 3; c.beginPath(); c.ellipse(560, 1372, 46, 8, 0, 0.3, Math.PI * 1.8); c.stroke(); }
      c.strokeStyle = lit(p) ? "#8d8a80" : "#202a44"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(470, 1350); c.lineTo(545, 1338); c.stroke();
      c.fillStyle = c.strokeStyle; c.beginPath(); c.ellipse(552, 1337, 12, 6, -0.15, 0, Math.PI * 2); c.fill();
      // ashtray + kretek with smoke curl
      c.fillStyle = p.ink; c.beginPath(); c.ellipse(960, 1395, 70, 18, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = lit(p) ? "#e6dcc4" : "#1e2840"; c.lineWidth = 9; c.beginPath(); c.moveTo(930, 1385); c.lineTo(1010, 1372); c.stroke();
      const em = 0.7 + 0.3 * Math.sin(t * 2.1); c.fillStyle = `rgba(255,${110 + 60 * em},40,${em})`; c.beginPath(); c.arc(1012, 1371, 6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = lit(p) ? "rgba(60,50,40,0.35)" : "rgba(150,165,200,0.25)"; c.lineWidth = 4; c.beginPath(); for (let k = 0; k < 40; k++) { const yy = 1365 - k * 16, xx = 1014 + 26 * Math.sin(k * 0.32 + t * 1.2) * (k / 40); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
      // FIVE glasses (symmetric, slim). Four on the tray, the fifth apart: it slides in as the camera glides right.
      for (let i = 0; i < 5; i++) {
        const gx = i < 4 ? 70 + i * 125 : 650, gy = i < 4 ? 1330 : 1352;
        c.save(); c.translate(gx, gy); c.scale(0.62, 1); coffeeGlass(c, 0, 0, 175, 0.86, t, p.ink, glassCol(p), coffeeCol(p), 0, i * 2.1); c.restore();
        steamWisps(c, p, gx, gy - 175, 175, t, i * 3.7);
      }
      // a moth flutters down and lands on the bale beside the fifth glass, wings slowly breathing
      { const land = 3.2, a = clamp((t - (land - 1.6)) / 1.6), lx = 735, ly = 1370;
        const mx = lerp(560, lx, smooth(a)) + (1 - a) * 40 * Math.sin(t * 7), my = lerp(980, ly, smooth(a)) + (1 - a) * 30 * Math.sin(t * 9);
        const fl = a < 1 ? 0.5 + 0.5 * Math.sin(t * 32) : 0.55 + 0.45 * Math.sin(t * 1.6);
        c.fillStyle = lit(p) ? "#2a1c12" : "#05070c"; c.beginPath(); c.ellipse(mx - 7, my, 12 * fl + 3, 7, 0.4, 0, Math.PI * 2); c.ellipse(mx + 7, my, 12 * fl + 3, 7, -0.4, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(mx, my, 3, 9, 0, 0, Math.PI * 2); c.fill(); }
      // the petromaks is just above frame: only its moths and its light reach the glasses
      moths(c, p, 520, 900, 200, t, 9);
      fg(c, p, L, () => { rough(c, [[-140, 1500], [120, 1460], [180, 2100], [-140, 2100]], true, 8, 303); c.fill(); }); // sarung edge, bottom-left
    },
    lights: (u, t) => [{ k: "spot", x: 520, y: 1050, r: 900, i: 1.05 * flick(t), col: WARM }, { k: "spot", x: 1000, y: 1360, r: 160, i: 0.35 * (0.7 + 0.3 * Math.sin(t * 2.1)), col: [255, 140, 60] }],
    amb: () => 0.05,
    // macro on the fifth glass's steam (who poured it?) → hard cut → the row glides in so the fifth lands centre on "lima"
    cam: cuts([{ a: HA, z0: 2.7, z1: 2.45, cx0: 650, cy0: 1120, cy1: 1170 }, { a: 2.6, z0: 1.46, z1: 1.52, cx0: 390, cx1: 650, cy0: 1350 }, { a: 4.96, z0: 1.52, z1: 1.56, cx0: 650, cy0: 1350 }], HB),
  },
  { // 2 title: black (engine draws GELAS / KELIMA)
    name: "title", a: TA, b: TB,
    draw: (c) => { c.fillStyle = "#000"; c.fillRect(-W, -H, 3 * W, 3 * H); },
    lights: () => [], amb: () => 0, cam: () => ({ z: 1.04, cx: 540, cy: 960, rot: 0 }),
  },
  { // 3 POS RONDA wide: four men on the bale, names appear as they are spoken
    name: "pos", a: PA, b: PB, dust: 0.6,
    draw: (c, p, u, t, L) => {
      const g = POS_HUT;
      L(0.35); sky(c, p, t, 900, 230, 1250);
      L(0.55); palm(c, p, -20, 1250, 620, t, 1); palm(c, p, 1080, 1250, 700, t, 2); distantHouse(c, p, 960, 1260, 130, t); fireflies(c, p, t, 900, 1400, 12, 1);
      bambooFence(c, p, -120, 160, 1420, 120); bambooFence(c, p, 960, 1220, 1420, 120);
      L(1); road(c, p, g.FY - 10);
      hutBack(c, p, t, g, GECKO_T);
      // the petromaks throws the four seated men large onto the gedek wall behind them...
      for (const s of SITTERS) {
        const pose = sitterPose(s, t);
        castShadow(c, p, g.lampX, g.FY - 0.05 * g.S, 1.32, (f) => sideFigure(c, s.x, g.FY, g.S, f, s.key, pose), 0.42, 10);
      }
      // ...and a FIFTH shadow sits between them where nobody is: perfectly still while the others move (rewatch detail)
      castShadow(c, p, g.lampX, g.FY - 0.05 * g.S, 1.32, (f) => sideFigure(c, FIFTH_X, g.FY, g.S, f, "darto", { dir: -1, sit: SEAT, armF: [0.55, 0.9], armB: [0.3, 0.6], head: 0.12 }), 0.42, 10);
      hutFront(c, p, t, g, { glasses: 0, tray: true });
      for (const s of SITTERS) {
        const J = sideFigure(c, s.x, g.FY, g.S, p.fig, s.key, sitterPose(s, t));
        if (s.key === "darto") kretek(c, p, J, t, g.S, true, LIGHT_T);
        if (lit(p)) { const a = clamp((t - CUE(s.cue)) / 0.3); if (a > 0) {
          // label on a small paper tag above the head (same row for all four)
          const ly = g.baleTop - 0.66 * g.S - 6 * (1 - a), lw = s.label.length * 17 + 24;
          c.globalAlpha = a; c.fillStyle = "#f3ecdc"; c.fillRect(J.head[0] - lw / 2, ly - 30, lw, 40); c.strokeStyle = "#1a100a"; c.lineWidth = 2; c.strokeRect(J.head[0] - lw / 2, ly - 30, lw, 40);
          c.font = "bold 26px 'Courier New', monospace"; c.textAlign = "center"; c.fillStyle = "#1a100a"; c.fillText(s.label, J.head[0], ly);
          c.fillRect(J.head[0] - 1, ly + 10, 2, J.head[1] - 0.09 * g.S - ly - 10); c.textAlign = "left"; c.globalAlpha = 1; } }
      }
      bicycle(c, p, g.postR + 0.2 * g.S, g.FY, 0.62 * g.S, 0.5 + 0.5 * Math.max(0, Math.sin(t * 0.9)));
      // dirt road detail: ruts + a puddle catching the lamp, a frog hops in
      if (lit(p)) { c.strokeStyle = "rgba(40,28,16,0.45)"; c.lineWidth = 4; for (const ry of [1600, 1680]) { c.beginPath(); c.moveTo(-100, ry); c.quadraticCurveTo(540, ry + 20, W + 100, ry - 10); c.stroke(); } }
      puddle(c, p, 700, 1640, 120, t, [PA + 4.2], 1);
      frog(c, p, 560, 1660, 735, 1642, t, PA + 4.2, 16);
      dog(c, p, 140, 1700, 0.5 * g.S, smooth(win(t, PA + 5.5, PA + 7.5, 0.6)), t);
      fallingLeaves(c, p, t, -60, 260, 950, 1600, 2, 1);
      fg(c, p, L, () => { bananaPlant(c, p, -170, H + 40, 760, t, 3); c.fillRect(W + 10, -100, 50, H + 200); });
    },
    lights: (u, t) => {
      const ls: Light[] = [lampLight(POS_HUT, t, 1.05), { k: "spot", x: 900, y: 230, r: 900, i: 0.3, col: MOON }, { k: "spot", x: 975, y: 1210, r: 90, i: 0.5, col: WARM }];
      const f = flare(t); if (f > 0.01) { const s = SITTERS[0], J = sideJoints(s.x, POS_HUT.FY, POS_HUT.S, sitterPose(s, t)), h = hand(J, "F"); ls.push({ k: "spot", x: h.x + 10, y: h.y - 10, r: 260 + 120 * f, i: 1.6 * f, col: [255, 200, 120] }); }
      return ls;
    },
    // wide → insert close-up on Darto lighting his kretek (match flare at LIGHT_T) → back to the wide for the names
    amb: () => 0.05, cam: cuts([{ a: PA, z0: 1.05, z1: 1.08, cx0: 560, cy0: 1030 }, { a: 8.9, z0: 2.25, z1: 2.4, cx0: 250, cy0: 1150, cy1: 1140 }, { a: 10.6, z0: 1.08, z1: 1.13, cx0: 560, cx1: 575, cy0: 1050, cy1: 1070 }], PB),
  },
  { // 4 PATROL: side-scrolling walk past the bamboo grove, then the cemetery
    name: "patrol", a: WA, b: WB,
    draw: (c, p, u, t, L) => {
      const X = scrollX(t);
      L(0.3); sky(c, p, t, 820, 260, 1300);
      // far layer (factor 0.35): palms + distant houses
      c.save(); c.translate(-((X * 0.35) % 1400), 0); for (let k = -1; k < 4; k++) { palm(c, p, k * 700 + 120, 1290, 560, t, k); distantHouse(c, p, k * 700 + 480, 1300, 110, t + k); } c.restore();
      L(0.7);
      // mid layer (factor 0.75): bamboo grove before makamX, cemetery after
      c.save(); c.translate(-X * 0.75, 0);
      for (let wx = Math.floor(X * 0.75 / 260) * 260 - 520; wx < X * 0.75 + W + 520; wx += 260) {
        if (wx < makamX * 0.75) bamboo(c, p, wx + 80 * hash(wx), 1430, 900 + 200 * hash(wx * 1.3), t, wx);
        else { nisan(c, p, wx + 60 * hash(wx), 1440, 260 + 80 * hash(wx * 2), Math.floor(hash(wx * 5) * 6)); if (hash(wx * 7) > 0.6) kamboja(c, p, wx + 140, 1440, 700, t); }
      }
      const fx0 = makamX * 0.75 - 200; rough(c, [[fx0, 1450], [fx0 + 2400, 1450]], false, 4, 9); c.strokeStyle = p.ink; c.lineWidth = 5; c.stroke();
      for (let x = fx0; x < fx0 + 2400; x += 70) { c.lineWidth = 5; c.beginPath(); c.moveTo(x, 1452); c.lineTo(x + 6 * Math.sin(x), 1360); c.stroke(); } // crooked fence of the makam
      // the pale one: between two nisan, perfectly still, drawn ONLY in the lit pass so it exists only where a beam falls
      if (lit(p) && t > GHOST_A - 0.15 && t < GHOST_B + 0.15) {
        const gwx = GHOST_WX(), a = win(t, GHOST_A - 0.15, GHOST_B + 0.15, 0.15);
        nisan(c, p, gwx - 120, 1445, 300, 1); nisan(c, p, gwx + 120, 1445, 280, 2);
        c.globalAlpha = 0.85 * a; sideFigure(c, gwx, 1445, 0.82 * PAT_S, "#f4efe4", "darto", { dir: -1, armF: [0.05, 0.05], armB: [-0.05, 0.05], head: 0.18 }); c.globalAlpha = 1;
      }
      c.restore();
      fog(c, p, t, 1400, 160, move(t, CUE("makam") - 1, CUE("makam") + 1, 0.5, 1.4), X * 0.75);
      L(1); road(c, p, PAT_FY - 20);
      fallingLeaves(c, p, t, -100, W + 100, 700, PAT_FY, 6, 4);
      // things by the road scroll with the ground: a lost sandal, a stray dog that lifts its head as the men pass
      const sx0 = 1250 - X, dx0 = 1700 - X;
      if (sx0 > -200 && sx0 < W + 200) sandal(c, p, sx0, PAT_FY + 30, 26, 0.35);
      if (dx0 > -300 && dx0 < W + 300) { const near = Math.min(...PAT_X.map((px) => Math.abs(px - dx0))); dog(c, p, dx0, PAT_FY + 60, 0.42 * PAT_S, smooth(clamp(1 - (near - 120) / 260)), t); }
      // the four men
      for (let i = 0; i < 4; i++) {
        const pose = patrolPose(i, t), J = sideFigure(c, PAT_X[i], PAT_FY, PAT_S, p.fig, patKeys[i], pose);
        if (i === 0) { // kentongan carried by its rope: hangs from the fist and swings with the steps
          const h = hand(J, "F"); kentongan(c, h.x, h.y - 6, 0.16 * PAT_S, p.fig, 0.12 * Math.sin((pose.walk ?? 0) + 0.6) + 0.03 * Math.sin(t * 1.7));
        }
      }
      fog(c, p, t * 1.3, 1560, 120, 0.8, X);
      // lens glare when a sweeping beam crosses the low camera (POV part): streaks through the lens point
      if (lit(p)) for (const i of [1, 3]) { const gl = glare(i, t); if (gl < 0.02) continue; const J = sideFigureJ(i, t); if (!J.lens) continue;
        c.strokeStyle = `rgba(255,246,222,${0.7 * gl})`; c.lineWidth = 3; c.beginPath(); c.moveTo(J.lens[0] - 700, J.lens[1] + 20); c.lineTo(J.lens[0] + 700, J.lens[1] - 20); c.stroke();
        c.lineWidth = 1.5; c.beginPath(); c.moveTo(J.lens[0] - 300, J.lens[1] - 80); c.lineTo(J.lens[0] + 300, J.lens[1] + 80); c.stroke();
        for (const k of [0.35, 0.6, 0.8]) { c.strokeStyle = `rgba(255,236,190,${0.35 * gl})`; c.beginPath(); c.arc(J.lens[0] + (540 - J.lens[0]) * k * 2, J.lens[1] + (1340 - J.lens[1]) * k * 2, 14 + 30 * k, 0, Math.PI * 2); c.stroke(); } }
      fg(c, p, L, () => { // tall grass + a bamboo pole passing by
        for (let k = 0; k < 40; k++) { const gx = ((k * 61 - X * 1.4) % (W + 200) + W + 200) % (W + 200) - 100; c.beginPath(); c.moveTo(gx, H + 40); c.quadraticCurveTo(gx + 10, H - 120, gx + 18 + 8 * Math.sin(t + k), H - 220 - 60 * hash(k)); c.lineTo(gx + 8, H + 40); c.fill(); }
        const px = ((900 - X * 1.4) % (W + 900) + W + 900) % (W + 900) - 300; c.fillRect(px, -100, 40, H + 200);
      });
    },
    lights: (u, t) => {
      const ls: Light[] = [{ k: "spot", x: 820, y: 260, r: 1000, i: 0.32, col: MOON }];
      for (const i of [1, 3]) {
        const J = sideFigureJ(i, t), cn = torchCone(J, 620, 150, 1.0 * flick(t + i), TORCH, 0.8); if (cn) ls.push(cn);
        const gl = glare(i, t); if (gl > 0.02 && J.lens) ls.push({ k: "spot", x: J.lens[0], y: J.lens[1], r: 420, i: 1.3 * gl, col: TORCH });
      }
      return ls;
    },
    // low POV from the path (legs, beams sweeping over the lens) → hard cut → the wide of the line passing the makam
    amb: () => 0.04, cam: cuts([{ a: WA, z0: 1.75, z1: 1.82, cx0: 420, cx1: 560, cy0: 1340, cy1: 1320 }, { a: POV_END, z0: 1.04, z1: 1.08, cx0: 540, cy0: 1000, cy1: 1030 }], WB),
  },
  { // 5 RETURN: back to the pos, they stop; five glasses steam on the bale
    name: "return", a: RA, b: RB, dust: 0.6,
    draw: (c, p, u, t, L) => {
      const g = RET_HUT;
      L(0.35); sky(c, p, t, 260, 260, 1260);
      L(0.55); palm(c, p, 60, 1270, 600, t, 4); distantHouse(c, p, 330, 1290, 110, t); fireflies(c, p, t, 950, 1420, 10, 7); bambooFence(c, p, -150, 420, 1440, 110);
      L(1); road(c, p, g.FY - 10);
      // footprints in the dirt behind the walkers (appear where a foot came down)
      if (lit(p)) { c.fillStyle = "rgba(40,28,16,0.35)"; for (let i = 0; i < 4; i++) { const x1 = retX(i, t); for (let k = 0; k < 8; k++) { const fx = x1 - 30 - k * RET_STRIDE * 0.5; if (fx < -100) break; c.beginPath(); c.ellipse(fx + (k % 2) * 10, g.FY + 8 + i * 6, 16, 5, 0, 0, Math.PI * 2); c.fill(); } }
        // ...and a FIFTH trail: bare feet (heel + toe dots), already there, leading all the way to the bale
        for (let k = 0; k < 14; k++) { const fx = g.bx0 - 40 - k * 70, fy = g.FY + 34 + (k % 2) * 10; if (fx < -120) break;
          c.beginPath(); c.ellipse(fx, fy, 11, 5, 0, 0, Math.PI * 2); c.fill(); for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(fx + 14 + q * 3, fy - 4 + q * 2.5, 2, 0, Math.PI * 2); c.fill(); } } }
      sandal(c, p, 640, g.FY + 70, 24, -0.4);
      { // the dog: lifts its head, then tracks something that isn't there (right → left past the men), ears flatten
        const st = CUE("stopAtPos"), trk = settle(t, st + 0.4, st + 3.2, 0, 1), ears = smooth(clamp((t - st - 1.0) / 0.5));
        dog(c, p, -40 + 30 * smooth(clamp((t - RA) / 3)), g.FY + 120, 0.36 * RET_S, smooth(win(t, RA + 0.5, RB + 1, 0.8)), t, lerp(-0.35, 0.25, trk), ears);
      }
      hutBack(c, p, t, g);
      hutFront(c, p, t, g, { glasses: 5, tray: true, level5: 0.86, sandals: 5 });
      for (let i = 0; i < 4; i++) sideFigure(c, retX(i, t), g.FY, RET_S, p.fig, patKeys[i], returnPose(i, t));
      puddle(c, p, 980, g.FY + 150, 110, t, [RA + 3.2], 0.9);
      frog(c, p, 860, g.FY + 175, 1010, g.FY + 150, t, RA + 3.2, 16);
      fallingLeaves(c, p, t, 0, 500, 900, g.FY, 3, 8);
      fg(c, p, L, () => { bananaPlant(c, p, W + 40, H + 60, 820, t, 9); });
    },
    lights: (u, t) => {
      const ls: Light[] = [lampLight(RET_HUT, t, 1.1), { k: "spot", x: 260, y: 260, r: 900, i: 0.3, col: MOON }];
      for (const i of [1, 3]) { const J = returnJ(i, t); const cn = torchCone(J, 380, 110, 0.85 * flick(t + i), TORCH, 0.7); if (cn) ls.push(cn); }
      return ls;
    },
    amb: () => 0.05,
    // wide walk-in → hard cut at the stop → over-the-shoulder past the last man toward the steaming glasses
    cam: cuts([{ a: RA, z0: 1.04, z1: 1.07, cx0: 520, cx1: 560, cy0: 1120, cy1: 1140 }, { a: CUE("stopAtPos"), z0: 1.85, z1: 1.97, cx0: 610, cx1: 690, cy0: 1235, cy1: 1265 }], RB),
  },
];

// joint helpers for the light functions (same poses as the draw functions, so beams leave the lenses exactly)
function sideFigureJ(i: number, t: number) { return sideJoints(PAT_X[i], PAT_FY, PAT_S, patrolPose(i, t)); }
function returnJ(i: number, t: number) { return sideJoints(retX(i, t), RET_HUT.FY, RET_S, returnPose(i, t)); }
