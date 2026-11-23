// Horror3 "Kabut Lalijiwo", shots A: hook, title, summit, fog. Every time comes from timeline.json via types.ts (CUE / SHOT_RANGE / walkPhase).
// Two passes (dark navy / lit woodcut paper), parallax L(depth), static terrain cached ONCE per pass into offscreen canvases,
// only living details drawn per frame. People = cast.ts (hiker, friend, courtier) on the horror2 side rig.
import { C2, Pal } from "../horror1/paint";
import { Shot, Light, SHOT_RANGE, CUE, TL, W, H, MOON, DAWN, HEADLAMP, move, settle, walkPhase, breeze, fogAmt, win, flick } from "./types";
import { rcut, lit, fg, gust, fogBand, hash, clamp, lerp } from "./kit";
import { hiker, friend, courtier, headlampCone, SidePose } from "./cast";
import { sideJoints, handAnchor } from "../horror2/rig";

const TAU = Math.PI * 2;
type P2 = [number, number];
const pc = (p: Pal, l: string, d: string) => (lit(p) ? l : d);
const withBeam = (l: Light, b: number): Light => (l.k === "cone" ? { ...l, beam: b } : l);
const sm = (x: number) => { const v = clamp(x); return v * v * (3 - 2 * v); };
const [HA, HB] = SHOT_RANGE("hook"), [TA, TB] = SHOT_RANGE("title"), [SA, SB] = SHOT_RANGE("summit"), [FA, FB] = SHOT_RANGE("fog");
const WALK = (TL as unknown as { walk: { from: number; to: number; period: number } }).walk;
const OMEGA = TAU / WALK.period;
/** rig heel strike (legs spread) sits at phase π/2; the footstep SFX lands at walkPhase = kπ → offset by π/2 */
const phSync = (t: number) => (walkPhase(t) ?? TAU * (t - WALK.from) / WALK.period) + Math.PI / 2;
/** "frozen time": integral of breeze(t). Everything that sways/drifts in the fog shot is driven by it, so it stops in place at noWind. */
const NW = CUE("noWind");
const tFr = (t: number) => { if (t < NW) return t; const x = Math.min(0.8, t - NW); return NW + (0.8 / 3) * (1 - Math.pow(1 - x / 0.8, 3)); };
void breeze;

// ------------------------------------------------------------------ offscreen cache (per key + pass)
const CACHE = new Map<string, HTMLCanvasElement>();
function cached(c: C2, p: Pal, key: string, x: number, y: number, w: number, h: number, s: number, fn: (k: C2) => void) {
  const id = key + "|" + p.mode;
  let cv = CACHE.get(id);
  if (!cv) {
    cv = document.createElement("canvas"); cv.width = Math.ceil(w * s); cv.height = Math.ceil(h * s);
    const k = cv.getContext("2d")!; k.setTransform(s, 0, 0, s, -x * s, -y * s); k.lineCap = "round"; k.lineJoin = "round"; fn(k); CACHE.set(id, cv);
  }
  c.drawImage(cv, x, y, w, h);
}

// ------------------------------------------------------------------ fog
const fogRGB = (p: Pal, night = false) => (lit(p) ? (night ? "196,190,172" : "214,206,188") : (night ? "40,50,70" : "70,86,112"));
function veil(c: C2, p: Pal, a: number, night = false, x = -500, y = -500, w = W + 1000, h = H + 1000) {
  if (a <= 0.003) return; c.fillStyle = `rgba(${fogRGB(p, night)},${clamp(a)})`; c.fillRect(x, y, w, h);
}
function veilV(c: C2, p: Pal, y0: number, y1: number, a0: number, a1: number, night = false, x = -500, w = W + 1000) {
  const g = c.createLinearGradient(0, y0, 0, y1), rgb = fogRGB(p, night);
  g.addColorStop(0, `rgba(${rgb},${clamp(a0)})`); g.addColorStop(1, `rgba(${rgb},${clamp(a1)})`); c.fillStyle = g; c.fillRect(x, y0, w, y1 - y0);
}
function glowDot(c: C2, x: number, y: number, r: number, a: number, rgb = "214,255,160") {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${clamp(a)})`); g.addColorStop(0.22, `rgba(${rgb},${clamp(a * 0.45)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}

// ------------------------------------------------------------------ nature primitives
type Tree = { segs: number[][]; tips: P2[] };
const TREES = new Map<string, Tree>();
/** crooked mountain tree (cantigi): deterministic branching, segments [x0,y0,x1,y1,w], tips for leaf clusters / moss */
function treeShape(x: number, y: number, h: number, seed: number, spread = 0.8, depth = 3, lean = 0): Tree {
  const key = [x, y, h, seed, spread, depth, lean].join(",");
  const got = TREES.get(key); if (got) return got;
  const segs: number[][] = [], tips: P2[] = [];
  const grow = (x0: number, y0: number, a0: number, len: number, w: number, d: number, s: number) => {
    let cx = x0, cy = y0, a = a0;
    for (let i = 0; i < 3; i++) { a += (hash(s + i * 1.37) - 0.5) * (d === depth ? 0.22 : 0.65); const l = len / 3, nx = cx + Math.sin(a) * l, ny = cy - Math.cos(a) * l; segs.push([cx, cy, nx, ny, w * (1 - i * 0.16)]); cx = nx; cy = ny; }
    if (d <= 0) { tips.push([cx, cy]); return; }
    if (d < depth) tips.push([cx, cy]);
    const nb = hash(s * 2.1) > 0.5 ? 3 : 2;
    for (let b = 0; b < nb; b++) grow(cx, cy, a * 0.55 + (b - (nb - 1) / 2) * spread + (hash(s + b * 5.1) - 0.5) * 0.35, len * 0.7, w * 0.6, d - 1, s * 1.31 + b * 7.7 + 1);
  };
  grow(x, y, lean + (hash(seed) - 0.5) * 0.25, h * 0.4, h * 0.05, depth, seed);
  const T = { segs, tips }; TREES.set(key, T); return T;
}
function drawTree(c: C2, T: Tree, fill: string, leaf: string | null, leafR: number, sway: number, seed: number, leafN = 9) {
  c.strokeStyle = fill; c.lineCap = "round";
  for (const s of T.segs) { c.lineWidth = s[4]; c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke(); }
  if (!leaf) return;
  c.fillStyle = leaf; c.beginPath();
  T.tips.forEach(([tx, ty], i) => {
    for (let k = 0; k < leafN; k++) {
      const h1 = hash(seed + i * 3.1 + k * 0.71), h2 = hash(seed * 1.3 + i * 1.9 + k * 1.13);
      const lx = tx + (h1 - 0.5) * leafR * 6 + sway * (0.5 + h2), ly = ty + (h2 - 0.5) * leafR * 3.6 - leafR * 0.8;
      c.moveTo(lx + leafR, ly); c.ellipse(lx, ly, leafR, leafR * 0.6, h1 * 3, 0, TAU);
    }
  });
  c.fill();
}
/** cemara gunung (Casuarina) silhouette: thin trunk, drooping needle tiers */
function pine(c: C2, x: number, y: number, h: number, fill: string, seed: number) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(x - h * 0.012, y); c.lineTo(x - h * 0.003, y - h); c.lineTo(x + h * 0.003, y - h); c.lineTo(x + h * 0.012, y); c.fill();
  for (let k = 0; k < 11; k++) {
    const q = k / 11, ty = y - h * (0.3 + 0.68 * q), wd = h * (0.15 * (1 - q) + 0.035) * (0.75 + 0.5 * hash(seed + k));
    for (const s of [-1, 1]) {
      const ww = wd * (0.8 + 0.4 * hash(seed * 3 + k + s));
      c.beginPath(); c.moveTo(x, ty); c.quadraticCurveTo(x + s * ww * 0.6, ty - h * 0.018, x + s * ww, ty + h * 0.045);
      for (let j = 0; j < 4; j++) c.lineTo(x + s * ww * (1 - j * 0.22), ty + h * (0.06 - j * 0.004) + (j % 2) * h * 0.012);
      c.quadraticCurveTo(x + s * ww * 0.3, ty + h * 0.03, x, ty + h * 0.022); c.fill();
    }
  }
}
/** hanging old-man's-beard moss (usnea): strands from a point, sway = px offset at the tip */
function mossBeard(c: C2, p: Pal, x: number, y: number, len: number, sway: number, seed: number, a = 1) {
  c.save(); c.globalAlpha *= a; c.strokeStyle = pc(p, "rgba(84,80,56,0.9)", "rgba(30,42,62,0.95)"); c.lineCap = "round";
  const n = 6 + Math.floor(hash(seed) * 5);
  for (let k = 0; k < n; k++) {
    const h1 = hash(seed + k * 1.7), h2 = hash(seed * 3 + k * 2.3), L = len * (0.45 + 0.55 * h2), x0 = x + (h1 - 0.5) * len * 0.3, y0 = y + h2 * len * 0.06;
    c.lineWidth = 0.9 + 1.5 * h1; c.beginPath(); c.moveTo(x0, y0);
    for (let i = 1; i <= 8; i++) { const q = i / 8; c.lineTo(x0 + sway * (0.7 + 0.6 * h1) * q * q + Math.sin(q * 6 + seed * 3 + k) * len * 0.035, y0 + q * L); }
    c.stroke();
  }
  c.restore();
}
/** grass tussock: n filled blades from one base (blade by blade); sway = tip offset fraction */
function tussock(c: C2, x: number, y: number, h: number, n: number, sway: number, seed: number, fill: string, w = 2.4) {
  c.fillStyle = fill; c.beginPath();
  for (let k = 0; k < n; k++) {
    const h1 = hash(seed + k * 1.31), h2 = hash(seed * 1.7 + k * 2.9), a = (h1 - 0.5) * 1.35, L = h * (0.5 + 0.5 * h2), bx = x + (h2 - 0.5) * h * 0.22;
    const tx = bx + Math.sin(a) * L + sway * L * (0.6 + 0.8 * h1), ty = y - Math.cos(a) * L * 0.95;
    const mx = bx + Math.sin(a) * L * 0.45 + sway * L * 0.2, my = y - L * 0.5;
    c.moveTo(bx - w * 0.6, y); c.quadraticCurveTo(mx - w * 0.3, my, tx, ty); c.quadraticCurveTo(mx + w * 0.5, my, bx + w * 0.6, y);
  }
  c.fill();
}
function leafShape(c: C2, x: number, y: number, s: number, rot: number, fill: string, vein: string | null) {
  c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = fill;
  c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(-s * 0.1, -s * 0.62, s, 0); c.quadraticCurveTo(-s * 0.1, s * 0.62, -s, 0); c.fill();
  if (vein) { c.strokeStyle = vein; c.lineWidth = Math.max(0.7, s * 0.07); c.beginPath(); c.moveTo(-s * 1.3, 0); c.lineTo(s * 0.92, 0);
    for (let k = 1; k < 4; k++) { const vx = -s + k * s * 0.45; c.moveTo(vx, 0); c.lineTo(vx + s * 0.25, -s * 0.3); c.moveTo(vx, 0); c.lineTo(vx + s * 0.25, s * 0.3); } c.stroke(); }
  c.restore();
}
function moth(c: C2, p: Pal, x: number, y: number, s: number, flap: number, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); const col = pc(p, "#2a1c12", "#0a0e18"); c.fillStyle = col;
  const wv = s * (0.3 + 0.7 * flap);
  c.beginPath(); c.ellipse(-wv * 0.55, -s * 0.05, wv * 0.6, s * 0.42, 0.5, 0, TAU); c.ellipse(wv * 0.55, -s * 0.05, wv * 0.6, s * 0.42, -0.5, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-wv * 0.4, s * 0.3, wv * 0.38, s * 0.25, -0.4, 0, TAU); c.ellipse(wv * 0.4, s * 0.3, wv * 0.38, s * 0.25, 0.4, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0, 0, s * 0.11, s * 0.45, 0, 0, TAU); c.fill();
  c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, -s * 0.4); c.lineTo(-s * 0.28, -s * 0.78); c.moveTo(1, -s * 0.4); c.lineTo(s * 0.28, -s * 0.78); c.stroke();
  c.restore();
}
function rock(c: C2, p: Pal, x: number, y: number, w: number, h: number, seed: number, fill?: string, hatch = 0.5, lichen = 1) {
  // loaf-shaped boulder: flat-ish top, smooth low-frequency bumps, flared embedded base, contact shadow
  c.fillStyle = lit(p) ? "rgba(30,22,14,0.35)" : "rgba(0,0,0,0.45)"; c.beginPath(); c.ellipse(x + w * 0.04, y + h * 0.05, w * 0.58, Math.max(4, h * 0.12), 0, 0, TAU); c.fill();
  const pts: P2[] = []; const n = 20, ph = hash(seed) * 6, ex = 0.3 + 0.7 * hash(seed * 1.9), sk = (hash(seed * 2.7) - 0.5) * 0.5;
  for (let i = 0; i <= n; i++) { const q = i / n, a = Math.PI + q * Math.PI, bump = 1 + 0.07 * Math.sin(q * 7 + ph) + 0.04 * Math.sin(q * 15 + ph * 2) - 0.06 * q;
    const hy = Math.pow(Math.abs(Math.sin(a)), ex) * h * bump; pts.push([x + Math.cos(a) * w * 0.5 + sk * hy, y - hy]); }
  pts.push([x + w * 0.54, y + h * 0.05]); pts.push([x - w * 0.54, y + h * 0.05]);
  rcut(c, p, pts, Math.max(1.5, w * 0.008), seed, fill ?? pc(p, "#bdb194", "#111a2c"), { edge: Math.max(1.5, Math.min(3, w * 0.012)), hatch, dir: 0.35, seed, bbox: [x - w / 2, y - h, w, h * 1.1] });
  if (!lit(p)) return;
  // facet ridge (a plane change) + cracks
  c.strokeStyle = p.ink; c.lineWidth = 1.4; c.beginPath(); const fx = x - w * (0.1 + 0.2 * hash(seed * 2)); c.moveTo(fx, y - h * 0.92); c.quadraticCurveTo(fx + w * 0.12, y - h * 0.5, fx + w * 0.3, y + h * 0.02); c.stroke();
  c.lineWidth = 1.2;
  for (let k = 0; k < 2; k++) { const sx = x + (hash(seed * 3 + k) - 0.5) * w * 0.5, sy = y - h * (0.3 + 0.45 * hash(seed * 5 + k)); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + (hash(seed + k * 9) - 0.5) * w * 0.15, sy + h * 0.2); c.lineTo(sx + (hash(seed + k * 11) - 0.5) * w * 0.25, sy + h * 0.38); c.stroke(); }
  const nl = Math.round(5 * lichen * Math.max(1, w / 90));
  for (let k = 0; k < nl; k++) {
    const qx = hash(seed * 7 + k) - 0.5, lx = x + qx * w * 0.7, ly = y - h * Math.sqrt(1 - 4 * qx * qx * 0.49) * (0.2 + 0.65 * hash(seed * 11 + k)), r = 1.5 + 3.5 * hash(seed * 13 + k);
    c.fillStyle = hash(seed + k * 2.3) > 0.5 ? "rgba(238,232,206,0.95)" : "rgba(168,156,98,0.9)"; c.beginPath(); c.arc(lx, ly, r, 0, TAU); c.fill();
    c.strokeStyle = "rgba(40,30,20,0.55)"; c.lineWidth = 0.7; c.stroke();
  }
}
function edelweiss(c: C2, p: Pal, x: number, y: number, s: number, seed: number, sway = 0) {
  c.fillStyle = pc(p, "#9c9a84", "#16223a");
  for (let k = 0; k < 9; k++) { const a = (k - 4) * 0.28, L = s * (0.45 + 0.3 * hash(seed + k)); c.save(); c.translate(x + (k - 4) * s * 0.05, y); c.rotate(a + sway * 0.08); c.beginPath(); c.ellipse(0, -L * 0.5, s * 0.065, L * 0.5, 0, 0, TAU); c.fill(); c.restore(); }
  const nH = 2 + Math.floor(hash(seed * 3) * 3);
  for (let k = 0; k < nH; k++) {
    const bx = x + (k - (nH - 1) / 2) * s * 0.12, hx = x + (k - (nH - 1) / 2) * s * 0.34 + sway * s * 0.18, hy = y - s * (0.85 + 0.35 * hash(seed + k * 4.1));
    c.strokeStyle = pc(p, "#6e6a55", "#16223a"); c.lineWidth = Math.max(1, s * 0.04); c.beginPath(); c.moveTo(bx, y - s * 0.15); c.quadraticCurveTo(bx + (hx - bx) * 0.3, hy + s * 0.35, hx, hy); c.stroke();
    c.fillStyle = pc(p, "#f6f1e4", "#3a4a6a");
    for (let q = 0; q < 8; q++) { const a = (q / 8) * TAU + seed; c.beginPath(); c.ellipse(hx + Math.cos(a) * s * 0.1, hy + Math.sin(a) * s * 0.065, s * 0.085, s * 0.032, a, 0, TAU); c.fill(); }
    c.fillStyle = pc(p, "#c9b98a", "#2a3a58"); c.beginPath(); c.arc(hx, hy, s * 0.055, 0, TAU); c.fill();
    if (lit(p)) { c.fillStyle = p.ink; for (let q = 0; q < 4; q++) c.fillRect(hx - 2 + (q % 2) * 2.6, hy - 2 + Math.floor(q / 2) * 2.6, 1.3, 1.3); }
  }
}
function fern(c: C2, x: number, y: number, len: number, ang: number, sway: number, fill: string) {
  c.save(); c.translate(x, y); c.rotate(ang + sway * 0.06); c.strokeStyle = fill; c.fillStyle = fill; c.lineWidth = Math.max(1, len * 0.014);
  const P1: P2 = [len * 0.35, -len * 0.55], P2_: P2 = [len * 0.8, -len * 0.62 + sway * len * 0.03];
  const B = (q: number): P2 => [2 * (1 - q) * q * P1[0] + q * q * P2_[0], 2 * (1 - q) * q * P1[1] + q * q * P2_[1]];
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(P1[0], P1[1], P2_[0], P2_[1]); c.stroke();
  c.beginPath();
  for (let i = 2; i < 18; i++) {
    const q = i / 18, [bx, by] = B(q), [nx, ny] = B(q + 0.02), dx = nx - bx, dy = ny - by, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, pl = len * 0.13 * (1 - q * 0.85);
    for (const s of [-1, 1]) { const px = bx + (-uy * s + ux * 0.5) * pl, py = by + (ux * s + uy * 0.5) * pl; c.moveTo(bx, by); c.quadraticCurveTo((bx + px) / 2 - uy * s * pl * 0.25, (by + py) / 2 + ux * s * pl * 0.25, px, py); c.quadraticCurveTo((bx + px) / 2 + uy * s * pl * 0.1, (by + py) / 2 - ux * s * pl * 0.1, bx, by); }
  }
  c.fill(); c.restore();
}
function mushroom(c: C2, p: Pal, x: number, y: number, s: number, tilt = 0) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  c.fillStyle = pc(p, "#ebe2cc", "#1c2840"); c.beginPath(); c.moveTo(-s * 0.1, 0); c.lineTo(-s * 0.07, -s * 0.8); c.lineTo(s * 0.07, -s * 0.8); c.lineTo(s * 0.12, 0); c.closePath(); c.fill();
  c.fillStyle = pc(p, "#a5815a", "#162036"); c.beginPath(); c.ellipse(0, -s * 0.8, s * 0.48, s * 0.3, 0, Math.PI, TAU); c.closePath(); c.fill();
  if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 1.1; c.beginPath(); c.ellipse(0, -s * 0.8, s * 0.48, s * 0.3, 0, Math.PI, TAU); c.closePath(); c.stroke();
    c.lineWidth = 0.7; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * s * 0.06, -s * 0.8); c.lineTo(k * s * 0.13, -s * 0.76); c.stroke(); }
    c.fillStyle = "rgba(240,232,210,0.9)"; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc((k - 1) * s * 0.2, -s * 0.93 + Math.abs(k - 1) * s * 0.06, s * 0.04, 0, TAU); c.fill(); } }
  c.restore();
}
/** scatter of dead leaves on the ground (static, cached) */
function deadLeaves(c: C2, p: Pal, x0: number, x1: number, y0: number, y1: number, n: number, seed: number, s0: number) {
  for (let i = 0; i < n; i++) {
    const q = hash(seed + i * 1.91), x = x0 + hash(seed * 2 + i * 3.7) * (x1 - x0), y = y0 + q * (y1 - y0), s = s0 * (0.5 + q) * (0.7 + 0.6 * hash(i * 5.3 + seed));
    leafShape(c, x, y, s, hash(i * 7.7 + seed) * TAU, pc(p, hash(i + seed) > 0.5 ? "#8e7550" : "#6e5c40", "#0c1220"), lit(p) && s > 5 ? "rgba(30,20,12,0.6)" : null);
  }
}
function pebbles(c: C2, p: Pal, x0: number, x1: number, y0: number, y1: number, n: number, seed: number, s0: number) {
  for (let i = 0; i < n; i++) {
    const q = hash(seed + i * 2.3), x = x0 + hash(seed * 5 + i * 1.3) * (x1 - x0), y = y0 + q * (y1 - y0), r = s0 * (0.4 + q) * (0.6 + 0.8 * hash(i * 3.1 + seed));
    c.fillStyle = pc(p, hash(i * 9 + seed) > 0.5 ? "#a99c80" : "#cbbf9f", "#0f1728"); c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0, 0, TAU); c.fill();
    if (lit(p) && r > 2.5) { c.strokeStyle = "rgba(22,14,10,0.7)"; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0, 0.2, Math.PI - 0.2); c.stroke(); }
  }
}
/** soft breath vapour puff */
function puff(c: C2, p: Pal, x: number, y: number, r: number, a: number) {
  if (a <= 0.005) return; const rgb = lit(p) ? "246,242,232" : "120,138,168";
  for (let k = 0; k < 3; k++) { const g = c.createRadialGradient(x + k * r * 0.35, y - k * r * 0.12, 0, x + k * r * 0.35, y - k * r * 0.12, r * (0.7 + 0.25 * k));
    g.addColorStop(0, `rgba(${rgb},${clamp(a * (0.5 - k * 0.1))})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(x - 2 * r, y - 2 * r, 5 * r, 4 * r); }
}
/** headlamp position + direction from the rig joints (forehead, along the head pitch) */
function lampOf(J: ReturnType<typeof sideJoints>, tilt = 0.12) {
  const s = 0.118 * J.u, pt = J.local.headPitch, fx = 0.4 * s, fy = -0.3 * s;
  const lx = fx * Math.cos(pt) - fy * Math.sin(pt), ly = fx * Math.sin(pt) + fy * Math.cos(pt);
  const pa = pt + tilt; return { x: J.head[0] + J.d * lx, y: J.head[1] + ly, dx: J.d * Math.cos(pa), dy: Math.sin(pa) };
}

// ================================================================== 1 HOOK
const HK = { trayX: 300, trayY: 880, trayR: 132, nx: 706, ny: 832, nH: 440, horizon: 700 };
const HOOK_FOOD = CUE("hookFood"), HOOK_PUL = CUE("hookPulang");

/** woven tampah with the offering (symmetric about its own axis): tumpeng, ingkung, jajan pasar, petals, petal bowl + tea glass */
function tampah(c: C2, p: Pal, x: number, y: number, R: number) {
  const ry = R * 0.28, L = lit(p), rimH = R * 0.075, ink = p.ink;
  c.fillStyle = L ? "rgba(30,22,14,0.5)" : "rgba(0,0,0,0.55)"; c.beginPath(); c.ellipse(x, y + rimH + ry * 0.25, R * 1.04, ry * 0.85, 0, 0, TAU); c.fill();
  // rim band (front)
  c.fillStyle = pc(p, "#9c7d52", "#0f1626"); c.beginPath(); c.ellipse(x, y + rimH, R, ry, 0, 0, Math.PI); c.lineTo(x - R, y); c.ellipse(x, y, R, ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
  if (L) { c.save(); c.beginPath(); c.ellipse(x, y + rimH, R, ry, 0, 0, Math.PI); c.lineTo(x - R, y); c.ellipse(x, y, R, ry, 0, Math.PI, 0, true); c.closePath(); c.clip();
    c.strokeStyle = "rgba(40,26,14,0.55)"; c.lineWidth = 1; for (let k = -R; k < R; k += 6) { c.beginPath(); c.moveTo(x + k, y - 4); c.lineTo(x + k + 5, y + ry + rimH + 4); c.stroke(); } c.restore(); }
  // tray surface + weave
  c.fillStyle = pc(p, "#c7a974", "#131c30"); c.beginPath(); c.ellipse(x, y, R, ry, 0, 0, TAU); c.fill();
  if (L) { c.save(); c.beginPath(); c.ellipse(x, y, R, ry, 0, 0, TAU); c.clip(); c.strokeStyle = "rgba(60,40,20,0.3)"; c.lineWidth = 1;
    for (let k = -R * 1.6; k < R * 1.6; k += 6.5) { c.beginPath(); c.moveTo(x + k, y - ry); c.lineTo(x + k + ry * 1.3, y + ry); c.moveTo(x + k, y - ry); c.lineTo(x + k - ry * 1.3, y + ry); c.stroke(); } c.restore(); }
  // banana leaf lining: zigzag lobes (index parity mirrored → symmetric)
  c.fillStyle = pc(p, "#7f8957", "#0e1a28"); c.beginPath();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, r = i % 2 ? 0.74 : 0.88; const px = x + Math.cos(a) * R * r, py = y + Math.sin(a) * ry * r; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath(); c.fill();
  if (L) { c.strokeStyle = "rgba(30,36,18,0.55)"; c.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + Math.PI / 24; c.beginPath(); c.moveTo(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * ry * 0.2); c.lineTo(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * ry * 0.8); c.stroke(); } }
  // rim ring
  c.strokeStyle = pc(p, "#8a6b42", "#0c1220"); c.lineWidth = R * 0.05; c.beginPath(); c.ellipse(x, y, R * 0.975, ry * 0.94, 0, 0, TAU); c.stroke();
  if (L) { c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, R, ry, 0, 0, TAU); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, R * 0.945, ry * 0.88, 0, 0, TAU); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + rimH, R, ry, 0, 0, Math.PI); c.stroke(); }
  const P = (u: number, v: number): P2 => [x + u * R, y + v * ry];
  // flower petals on the leaf (mirrored pairs): mawar (muted rose) + melati (white) + kantil (cream)
  for (let i = 0; i < 26; i++) {
    const a = hash(i * 3.7) * Math.PI - Math.PI / 2, r = 0.35 + 0.5 * hash(i * 5.9), u = Math.cos(a) * r, v = Math.sin(a) * r * 0.95;
    const col = i % 3 === 0 ? pc(p, "#b9877a", "#22304a") : i % 3 === 1 ? pc(p, "#f6f1e4", "#33445f") : pc(p, "#e6d39a", "#2a3a54");
    for (const s of [-1, 1]) { const [px, py] = P(s * u, v); c.fillStyle = col; c.beginPath(); c.ellipse(px, py, 3.6, 2.2, s * (0.4 + hash(i)), 0, TAU); c.fill(); }
  }
  // jajan pasar (back pair): klepon balls on a leaf square + lapis slices
  const klepon = (u: number, v: number) => { const [px, py] = P(u, v); c.fillStyle = pc(p, "#6f8a4a", "#14203a"); c.fillRect(px - 15, py - 3, 30, 8);
    for (let k = 0; k < 3; k++) { const bx = px - 9 + k * 9, by = py - 6 - (k === 1 ? 4 : 0); c.fillStyle = pc(p, "#8fa35e", "#1c2a46"); c.beginPath(); c.arc(bx, by, 5.2, 0, TAU); c.fill(); if (L) { c.strokeStyle = ink; c.lineWidth = 1; c.stroke(); c.fillStyle = "rgba(250,246,236,0.95)"; for (let q = 0; q < 4; q++) c.fillRect(bx - 3 + q * 1.8, by - 3.5 + (q % 2) * 1.5, 1, 1); } } };
  const lapis = (u: number, v: number) => { const [px, py] = P(u, v);
    for (let k = 0; k < 2; k++) { const bx = px - 8 + k * 11, by = py - 2; for (let q = 0; q < 5; q++) { c.fillStyle = q % 2 ? pc(p, "#e8d7a6", "#22304c") : pc(p, "#9a6a40", "#141e34"); c.fillRect(bx - 4, by - 12 + q * 2.6, 9, 2.6); } if (L) { c.strokeStyle = ink; c.lineWidth = 1; c.strokeRect(bx - 4, by - 12, 9, 13); } } };
  klepon(-0.62, -0.42); klepon(0.62, -0.42);
  // boiled egg halves (back, mirrored)
  for (const s of [-1, 1]) { const [px, py] = P(s * 0.34, -0.5); c.fillStyle = pc(p, "#f4efe2", "#2a3a58"); c.beginPath(); c.ellipse(px, py, 8, 5, 0, 0, TAU); c.fill(); c.fillStyle = pc(p, "#e3b84e", "#24324e"); c.beginPath(); c.arc(px, py - 0.5, 3.4, 0, TAU); c.fill(); if (L) { c.strokeStyle = ink; c.lineWidth = 1; c.beginPath(); c.ellipse(px, py, 8, 5, 0, 0, TAU); c.stroke(); } }
  // nasi tumpeng (centre)
  { const [cx, by] = P(0, -0.12), r = R * 0.3, h = R * 0.78;
    c.fillStyle = pc(p, "#e6cb7c", "#1d2944"); c.beginPath(); c.moveTo(cx - r, by); c.quadraticCurveTo(cx - r * 0.55, by - h * 0.5, cx - r * 0.09, by - h); c.quadraticCurveTo(cx, by - h * 1.03, cx + r * 0.09, by - h); c.quadraticCurveTo(cx + r * 0.55, by - h * 0.5, cx + r, by); c.ellipse(cx, by, r, r * 0.26, 0, 0, Math.PI); c.closePath(); c.fill();
    if (L) {
      c.strokeStyle = ink; c.lineWidth = 2; c.stroke();
      c.save(); c.clip(); c.lineWidth = 1.2; for (let k = 0; k < 9; k++) { const xx = cx + r * (0.25 + k * 0.1); c.beginPath(); c.moveTo(xx, by + 8); c.lineTo(xx - r * 0.25, by - h); c.stroke(); } c.restore();
      c.fillStyle = "rgba(60,40,10,0.55)"; for (let k = 0; k < 70; k++) { const q = hash(k * 2.1), hh = q * h * 0.92, wv = r * (1 - q) * 0.9, gx = cx + (hash(k * 4.7) - 0.5) * 2 * wv, gy = by - hh; c.fillRect(gx, gy, 2, 1.2); }
    }
    // contong (banana leaf cone cap) + garnish ring
    c.fillStyle = pc(p, "#62703f", "#0e1a28"); c.beginPath(); c.moveTo(cx - r * 0.2, by - h * 0.86); c.lineTo(cx, by - h * 1.12); c.lineTo(cx + r * 0.2, by - h * 0.86); c.closePath(); c.fill();
    if (L) { c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke(); }
    for (let k = 0; k < 9; k++) { const a = Math.PI * (k / 8), gx = cx - Math.cos(a) * r * 1.02, gy = by + Math.sin(a) * r * 0.26; c.fillStyle = pc(p, k % 2 ? "#6f8a4a" : "#d8c07a", "#16223a"); c.beginPath(); c.arc(gx, gy, 4, 0, TAU); c.fill(); }
  }
  // petal bowl (left) + tea glass (right), a matched pair on the tray's horizontal axis
  { const [bx, by] = P(-0.66, 0.05); c.fillStyle = pc(p, "#8c5f3c", "#121a2e"); c.beginPath(); c.moveTo(bx - 17, by - 12); c.quadraticCurveTo(bx - 15, by + 4, bx, by + 4); c.quadraticCurveTo(bx + 15, by + 4, bx + 17, by - 12); c.closePath(); c.fill();
    c.fillStyle = pc(p, "#6b4a2e", "#0d1424"); c.beginPath(); c.ellipse(bx, by - 12, 17, 4.5, 0, 0, TAU); c.fill();
    for (let k = 0; k < 11; k++) { const sx = bx + (k - 5) * 2.6, sy = by - 13 - Math.sin((k / 10) * Math.PI) * 6; c.fillStyle = k % 2 ? pc(p, "#f6f1e4", "#33445f") : pc(p, "#b9877a", "#22304a"); c.beginPath(); c.ellipse(sx, sy, 3.6, 2.4, k, 0, TAU); c.fill(); }
    if (L) { c.strokeStyle = ink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx - 17, by - 12); c.quadraticCurveTo(bx - 15, by + 4, bx, by + 4); c.quadraticCurveTo(bx + 15, by + 4, bx + 17, by - 12); c.stroke(); } }
  { const [gx, gy] = P(0.66, 0.05), gh = 40, wb = 10, wt = 12.5;
    c.fillStyle = pc(p, "rgba(245,238,220,0.5)", "rgba(60,80,120,0.4)"); c.beginPath(); c.moveTo(gx - wb, gy); c.lineTo(gx - wt, gy - gh); c.lineTo(gx + wt, gy - gh); c.lineTo(gx + wb, gy); c.closePath(); c.fill();
    c.fillStyle = pc(p, "#7a4a20", "#0c1220"); c.beginPath(); c.moveTo(gx - wb + 1.5, gy - 2); c.lineTo(gx - wt + 2, gy - gh * 0.86); c.lineTo(gx + wt - 2, gy - gh * 0.86); c.lineTo(gx + wb - 1.5, gy - 2); c.closePath(); c.fill();
    if (L) { c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx - wb, gy); c.lineTo(gx - wt, gy - gh); c.moveTo(gx + wt, gy - gh); c.lineTo(gx + wb, gy); c.lineTo(gx - wb, gy); c.stroke(); c.beginPath(); c.ellipse(gx, gy - gh, wt, 2.6, 0, 0, TAU); c.stroke();
      c.strokeStyle = "rgba(255,250,236,0.8)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx - wt + 4, gy - gh + 4); c.lineTo(gx - wb + 3, gy - 5); c.stroke(); } }
  // urap heaps (mirrored) + lapis (front pair)
  for (const s of [-1, 1]) { const [ux, uy] = P(s * 0.3, 0.3); c.fillStyle = pc(p, "#73884a", "#14203a"); c.beginPath(); c.ellipse(ux, uy - 3, 13, 7, 0, 0, TAU); c.fill();
    if (L) { c.fillStyle = "rgba(250,244,226,0.9)"; for (let k = 0; k < 8; k++) c.fillRect(ux - 9 + hash(k * 3 + s) * 18, uy - 7 + hash(k * 7 + s) * 7, 1.6, 1.2); } }
  lapis(-0.5, 0.62); lapis(0.5, 0.62);
  // ingkung (whole trussed chicken), front centre
  { const [ix, iy] = P(0, 0.5), s = R * 0.5;
    c.fillStyle = pc(p, "#bb8a52", "#18223a");
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(ix + sd * s * 0.38, iy + s * 0.04, s * 0.17, s * 0.11, sd * 0.6, 0, TAU); c.fill(); }
    c.beginPath(); c.ellipse(ix, iy - s * 0.05, s * 0.48, s * 0.3, 0, 0, TAU); c.fill();
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(ix + sd * s * 0.2, iy - s * 0.22, s * 0.07, s * 0.06, 0, 0, TAU); c.fill(); }
    if (L) { c.strokeStyle = ink; c.lineWidth = 1.6; c.beginPath(); c.ellipse(ix, iy - s * 0.05, s * 0.48, s * 0.3, 0, 0, TAU); c.stroke();
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(ix + sd * s * 0.38, iy + s * 0.04, s * 0.17, s * 0.11, sd * 0.6, 0, TAU); c.stroke(); c.beginPath(); c.arc(ix + sd * s * 0.3, iy - s * 0.04, s * 0.16, sd > 0 ? Math.PI * 1.1 : -0.6, sd > 0 ? Math.PI * 1.7 : 0.1); c.stroke(); }
      c.strokeStyle = "rgba(240,232,210,0.9)"; c.lineWidth = 1; c.beginPath(); c.moveTo(ix - s * 0.2, iy - s * 0.22); c.lineTo(ix + s * 0.2, iy - s * 0.22); c.stroke();
      c.fillStyle = "rgba(60,30,10,0.5)"; for (let k = 0; k < 16; k++) { const a = hash(k * 1.3) * TAU, r = hash(k * 2.9) * 0.85; c.fillRect(ix + Math.cos(a) * s * 0.45 * r, iy - s * 0.05 + Math.sin(a) * s * 0.27 * r, 1.6, 1.6); } }
  }
}
/** perfectly vertical steam (no wind): three straight columns; brightness pulses travel upward */
function straightSteam(c: C2, p: Pal, sx: number, sy: number, hgt: number, t: number) {
  const N = 16;
  for (const off of [-3.5, 0, 3.5]) for (let k = 0; k < N; k++) {
    const y0 = sy - (k * hgt) / N, a = 0.36 * (1 - k / N) * (0.5 + 0.5 * Math.sin(k * 0.85 - t * 3.0 + off * 0.7));
    c.strokeStyle = pc(p, `rgba(252,248,238,${a})`, `rgba(150,168,200,${a * 0.75})`); c.lineWidth = 2 + k * 0.14;
    const xx = sx + off * (1 + k * 0.035); c.beginPath(); c.moveTo(xx, y0); c.lineTo(xx, y0 - hgt / N - 0.6); c.stroke();
  }
}
const HOOK_BEARDS: [number, number, number, number][] = (() => { // [x, y, len, seed] along the two high branches
  const r: [number, number, number, number][] = [];
  for (let i = 0; i < 9; i++) { const q = i / 8; r.push([780 - q * 520, 300 - q * 190 + Math.sin(q * 5) * 14, 90 + 90 * hash(i * 2.2), 40 + i]); }
  for (let i = 0; i < 4; i++) { const q = i / 3; r.push([860 + q * 260, 360 - q * 120, 70 + 70 * hash(i * 3.1), 60 + i]); }
  return r;
})();
function hookBg(k: C2, p: Pal) {
  const g = k.createLinearGradient(0, -150, 0, 1300);
  g.addColorStop(0, pc(p, "#958f7d", "#04070d")); g.addColorStop(0.5, pc(p, "#c9c1aa", "#18223a")); g.addColorStop(0.62, pc(p, "#cbc3ac", "#1c2840")); g.addColorStop(1, pc(p, "#a69d86", "#0e1524"));
  k.fillStyle = g; k.fillRect(-160, -160, 1400, 1480);
  for (let row = 0; row < 3; row++) {
    const base = HK.horizon + 5 + row * 28, hh = 380 + row * 150, a = 0.28 + row * 0.2;
    k.globalAlpha = a;
    for (let i = 0; i < 10; i++) { const x = -140 + i * 150 + hash(i * 3.3 + row * 9) * 100; pine(k, x, base + hash(i + row) * 18, hh * (0.75 + 0.5 * hash(i * 5.1 + row)), pc(p, "#6f6a5c", "#060a14"), i + row * 20); }
    k.globalAlpha = 1;
    veilV(k, p, 200, base + 30, 0.25, 0.4, true, -200, 1500);
  }
  k.fillStyle = pc(p, "#9f957a", "#0d1422"); k.beginPath(); k.moveTo(-160, HK.horizon + 40); for (let x = -160; x <= 1240; x += 40) k.lineTo(x, HK.horizon + 40 + Math.sin(x * 0.01) * 8); k.lineTo(1240, 1320); k.lineTo(-160, 1320); k.fill();
}
function hookMid(k: C2, p: Pal) {
  const trunks = [[110, 812, 560, 3], [330, 800, 470, 7], [575, 806, 520, 11], [1010, 818, 600, 15], [1180, 812, 480, 19]];
  for (const [x, y, h, s] of trunks) {
    const T = treeShape(x, y, h, s, 0.9, 3);
    drawTree(k, T, pc(p, "#5d5444", "#070b15"), pc(p, "#4f5038", "#08101c"), 5, 0, s, 7);
    for (let i = 0; i < T.tips.length; i += 2) { const [tx, ty] = T.tips[i]; mossBeard(k, p, tx, ty, 50 + 40 * hash(i + s), 0, s * 10 + i, 0.8); }
  }
  veilV(k, p, 300, 860, 0.35, 0.22, true, -200, 1500);
}
function hookGround(k: C2, p: Pal) {
  const L = lit(p);
  // forest floor
  const g = k.createLinearGradient(0, 780, 0, 2000); g.addColorStop(0, pc(p, "#a3977a", "#111827")); g.addColorStop(1, pc(p, "#7d6d52", "#0b111f"));
  k.fillStyle = g; k.beginPath(); k.moveTo(-160, 790); for (let x = -160; x <= 1240; x += 30) k.lineTo(x, 790 + 12 * Math.sin(x * 0.013) + 6 * Math.sin(x * 0.041)); k.lineTo(1240, 2080); k.lineTo(-160, 2080); k.fill();
  if (L) { k.strokeStyle = "rgba(22,14,10,0.35)"; k.lineWidth = 1.2; for (let i = 0; i < 260; i++) { const y = 820 + Math.pow(hash(i * 1.7), 0.8) * 1200, x = -150 + hash(i * 3.9) * 1380, l = 6 + (y - 800) * 0.03; k.beginPath(); k.moveTo(x, y); k.lineTo(x + l, y - l * 0.15); k.stroke(); } }
  // moss mounds
  for (let i = 0; i < 26; i++) { const x = -120 + hash(i * 4.1) * 1360, y = 840 + hash(i * 6.7) * 900, r = 18 + 40 * hash(i * 2.2) * (0.6 + (y - 800) / 1200);
    k.fillStyle = pc(p, "#7c7c58", "#0d1626"); k.beginPath(); k.ellipse(x, y, r * 1.6, r * 0.5, 0, Math.PI, TAU); k.fill();
    if (L) { k.strokeStyle = "rgba(30,34,16,0.6)"; k.lineWidth = 1; for (let q = 0; q < r; q++) { const qx = x + (hash(q + i * 9) - 0.5) * r * 2.8, qy = y - hash(q * 3 + i) * r * 0.4; k.beginPath(); k.moveTo(qx, qy); k.lineTo(qx + 1.5, qy - 4); k.stroke(); } } }
  deadLeaves(k, p, -150, 1230, 830, 2000, 420, 3, 7);
  pebbles(k, p, -150, 1230, 840, 2000, 120, 9, 5);
  // the big trunk Naam leans on (cantigi, gnarled) + roots
  const tl = 745, tr = 862;
  for (let r = 0; r < 6; r++) { const sd = r < 3 ? -1 : 1, ex = (tl + tr) / 2 + sd * (90 + 70 * r), ey = 885 + 18 * (r % 3);
    k.strokeStyle = pc(p, "#6c5840", "#070b15"); k.lineWidth = 22 - (r % 3) * 5; k.beginPath(); k.moveTo((tl + tr) / 2 + sd * 30, 870); k.quadraticCurveTo((tl + tr) / 2 + sd * (50 + 30 * r), 868, ex, ey); k.stroke();
    if (L) { k.strokeStyle = "rgba(20,12,8,0.7)"; k.lineWidth = 1.5; k.beginPath(); k.moveTo((tl + tr) / 2 + sd * 30, 864); k.quadraticCurveTo((tl + tr) / 2 + sd * (50 + 30 * r), 860, ex, ey - 6); k.stroke(); } }
  const tp: P2[] = [[tl, 900], [tl - 14, 860], [tl + 8, 700], [tl - 10, 560], [tl + 6, 380], [tl - 4, 200], [tl + 10, -160], [tr - 6, -160], [tr + 4, 180], [tr - 8, 360], [tr + 10, 560], [tr - 2, 720], [tr + 22, 870], [tr + 10, 900]];
  rcut(k, p, tp, 5, 77, pc(p, "#7a6448", "#080c18"), { edge: 3, hatch: 0.6, dir: 0.1, seed: 4, bbox: [tl - 20, -160, tr - tl + 50, 1060] });
  if (L) { k.strokeStyle = "rgba(20,12,8,0.75)"; for (let i = 0; i < 26; i++) { const x = tl + 8 + hash(i * 2.7) * (tr - tl - 16), y0 = -150 + hash(i * 5.3) * 950, len = 60 + 140 * hash(i * 1.1); k.lineWidth = 1 + 1.5 * hash(i); k.beginPath(); k.moveTo(x, y0); k.quadraticCurveTo(x + 6 * Math.sin(i), y0 + len / 2, x + 3 * Math.sin(i * 2), y0 + len); k.stroke(); }
    k.fillStyle = "rgba(10,6,4,0.85)"; k.beginPath(); k.ellipse(tl + 50, 520, 12, 22, 0.1, 0, TAU); k.fill(); k.strokeStyle = "rgba(20,12,8,0.8)"; k.lineWidth = 2; k.beginPath(); k.ellipse(tl + 50, 520, 18, 30, 0.1, 0, TAU); k.stroke(); }
  // moss clumps creeping up the trunk's left flank (irregular, thinning upward)
  for (let i = 0; i < 40; i++) { const q = hash(i * 1.9), y = 880 - Math.pow(q, 0.7) * 620, x = tl + 2 + hash(i * 3.1) * (40 - 25 * q), r = 4 + 9 * hash(i * 7) * (1 - q * 0.6);
    k.fillStyle = pc(p, "#7f8058", "#132036"); k.beginPath(); k.ellipse(x, y, r * 1.2, r * 0.8, hash(i) * 2, 0, TAU); k.ellipse(x + r * 0.8, y - r * 0.5, r * 0.7, r * 0.6, 0, 0, TAU); k.fill();
    if (L) { k.strokeStyle = "rgba(30,34,16,0.6)"; k.lineWidth = 0.9; for (let s = 0; s < 4; s++) { k.beginPath(); k.moveTo(x - r + s * r * 0.6, y + r * 0.4); k.lineTo(x - r + s * r * 0.6 - 1, y - r * 0.6); k.stroke(); } } }
  // fallen mossy log he sits on (seat height 0.2 H), its cut end showing rings
  // the mossy ground hump between the roots where he sits (feet out on the forest floor)
  k.fillStyle = pc(p, "#8a8462", "#0e1626"); k.beginPath(); k.ellipse(HK.nx - 40, HK.ny + 6, 230, 16, 0, Math.PI, TAU); k.fill();
  if (L) { k.strokeStyle = "rgba(28,32,14,0.6)"; k.lineWidth = 1; for (let i = 0; i < 70; i++) { const x = HK.nx - 260 + hash(i * 2.9) * 440, y = HK.ny - 2 - hash(i * 5.1) * 18; k.beginPath(); k.moveTo(x, y); k.lineTo(x + 1, y - 5); k.stroke(); } }
  deadLeaves(k, p, HK.nx - 280, HK.nx + 60, HK.ny - 6, HK.ny + 24, 40, 51, 6);
  if (false as boolean) { const lx0 = 585, lx1 = tl + 30, ly = HK.ny - 0.2 * HK.nH + 38, r = 38;
    k.fillStyle = pc(p, "#6f5a40", "#090e1a"); k.beginPath(); k.moveTo(lx0, ly - r); k.lineTo(lx1, ly - r - 4); k.lineTo(lx1, ly + r - 2); k.lineTo(lx0, ly + r); k.closePath(); k.fill();
    if (L) { k.strokeStyle = p.ink; k.lineWidth = 2.5; k.stroke(); k.lineWidth = 1.2; for (let i = 0; i < 6; i++) { k.beginPath(); k.moveTo(lx0 + 20, ly - r + 10 + i * 11); k.quadraticCurveTo((lx0 + lx1) / 2, ly - r + 8 + i * 11 + 3 * Math.sin(i), lx1, ly - r + 6 + i * 11); k.stroke(); } }
    k.fillStyle = pc(p, "#c4a978", "#141e34"); k.beginPath(); k.ellipse(lx0, ly, r * 0.42, r, 0, 0, TAU); k.fill();
    if (L) { k.strokeStyle = p.ink; k.lineWidth = 2; k.stroke(); k.lineWidth = 0.9; for (let q = 1; q < 5; q++) { k.beginPath(); k.ellipse(lx0, ly, r * 0.42 * q / 5, r * q / 5, 0, 0, TAU); k.stroke(); } }
    k.fillStyle = pc(p, "#7c7f56", "#132036"); for (let i = 0; i < 12; i++) { k.beginPath(); k.ellipse(lx0 + 30 + i * 13, ly - r + 2 - 3 * hash(i), 9, 5, 0, Math.PI, TAU); k.fill(); }
    mushroom(k, p, lx0 + 40, ly + r - 2, 14, 0.1); mushroom(k, p, lx0 + 58, ly + r, 10, -0.2); }
  // more floor life in the near ground (under the captions: calm, but not empty)
  for (let i = 0; i < 7; i++) fern(k, -120 + i * 200 + 60 * hash(i * 2), 1560 + 260 * hash(i * 5), 150 + 80 * hash(i), -1.6 + 0.5 * hash(i * 3), 0, pc(p, "#5f6a40", "#101c30"));
  k.strokeStyle = pc(p, "#6c5840", "#0b1222"); k.lineWidth = 16; k.beginPath(); k.moveTo(-160, 1450); k.quadraticCurveTo(300, 1400, 640, 1470); k.stroke(); k.lineWidth = 7; k.beginPath(); k.moveTo(300, 1420); k.lineTo(380, 1360); k.stroke();
  for (let i = 0; i < 8; i++) mushroom(k, p, 820 + i * 34 + 10 * hash(i), 1520 + 12 * hash(i * 3), 18 + 12 * hash(i * 5), (hash(i * 7) - 0.5) * 0.4);
  // high branches that hold the hanging moss
  k.strokeStyle = pc(p, "#6c5840", "#070b15"); k.lineCap = "round";
  for (const [x0, y0, x1, y1, x2, y2, w] of [[tl + 20, 380, 520, 230, 240, 120, 30], [tr - 10, 420, 980, 330, 1150, 230, 22]]) { k.lineWidth = w; k.beginPath(); k.moveTo(x0, y0); k.quadraticCurveTo(x1, y1, x2, y2); k.stroke(); k.lineWidth = w * 0.4; k.beginPath(); k.moveTo((x0 + x1) / 2, (y0 + y1) / 2 - 10); k.lineTo((x0 + x1) / 2 - 60, (y0 + y1) / 2 - 120); k.stroke(); }
  // mushrooms + ferns at the trunk base
  mushroom(k, p, tl - 12, 892, 26, -0.15); mushroom(k, p, tl + 6, 896, 18, 0.1); mushroom(k, p, tr + 18, 893, 22, 0.2); mushroom(k, p, tl - 30, 898, 13, -0.3);
  for (let i = 0; i < 5; i++) fern(k, tr + 30 + i * 26, 900, 80 + 30 * hash(i), -0.4 + i * 0.25, 0, pc(p, "#5f6a40", "#0b1424"));
  for (let i = 0; i < 4; i++) fern(k, 560 + i * 30, 905, 60 + 20 * hash(i * 3), -0.9 + i * 0.3, 0, pc(p, "#5f6a40", "#0b1424"));
  // the mossy boulder carrying the tray
  rock(k, p, HK.trayX, 1258, 560, 364, 31, pc(p, "#a99d80", "#0f1728"), 0.55, 0.4);
  k.fillStyle = pc(p, "#7c7f56", "#132036"); k.beginPath(); k.moveTo(HK.trayX - 270, 1230);
  for (let i = 0; i <= 24; i++) { const q = 0.04 + 0.92 * i / 24, x = HK.trayX - 280 + q * 560, top = 1258 - 360 * Math.pow(Math.sin(q * Math.PI), 0.5); k.lineTo(x, top - 6 + 6 * Math.sin(i * 1.7)); }
  for (let i = 24; i >= 0; i--) { const q = 0.04 + 0.92 * i / 24, x = HK.trayX - 280 + q * 560, top = 1258 - 360 * Math.pow(Math.sin(q * Math.PI), 0.5); k.lineTo(x, top + 34 + 18 * hash(i * 2.3)); }
  k.closePath(); k.fill();
  if (L) { k.strokeStyle = "rgba(28,32,14,0.6)"; k.lineWidth = 1; for (let i = 0; i < 160; i++) { const q = 0.06 + 0.88 * hash(i * 1.37), x = HK.trayX - 280 + q * 560, top = 1258 - 360 * Math.pow(Math.sin(q * Math.PI), 0.5), y = top + 4 + hash(i * 4.4) * 30; k.beginPath(); k.moveTo(x, y); k.lineTo(x + 1, y - 5); k.stroke(); } }
  mushroom(k, p, HK.trayX + 178, 1004, 16, 0.25); mushroom(k, p, HK.trayX + 195, 1012, 11, 0.4);
  fern(k, HK.trayX - 215, 1200, 110, -1.2, 0, pc(p, "#5f6a40", "#0b1424")); fern(k, HK.trayX - 200, 1210, 90, -0.7, 0, pc(p, "#5f6a40", "#0b1424"));
  // spider web between the boulder and a root (lit only, fine threads)
  if (L) { const cx = 640, cy = 1050; k.strokeStyle = "rgba(250,246,236,0.45)"; k.lineWidth = 0.8; for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; k.beginPath(); k.moveTo(cx, cy); k.lineTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 40); k.stroke(); }
    for (let r = 8; r < 46; r += 7) { k.beginPath(); for (let i = 0; i <= 9; i++) { const a = (i / 9) * TAU, rr = r * (0.92 + 0.08 * Math.sin(i * 3)); i ? k.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.87) : k.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.87); } k.stroke(); } }
  tampah(k, p, HK.trayX, HK.trayY, HK.trayR);
}
/** ground sitting with knees hugged (same technique as the "fast" shot): the rig's chair-sit rotated back about the hip */
type RotSit = { base: SidePose; toWorld: (q: P2) => P2; toLocal: (q: P2) => P2; X0: number; Y0: number; hx: number; hy: number; rot: number; u: number };
function rotSit(hx: number, gy: number, u: number, d: 1 | -1, phi: number, torso: number, headW: number, extra: SidePose): RotSit {
  const sit = 0.3 * u, hy = gy - 0.03 * u, rot = -phi * d, lean = torso + phi - 0.09;
  const base: SidePose = { ...extra, dir: d, sit, lean, head: headW + phi - lean * 0.3 + 0.05 };
  const rp = (q: P2, a: number): P2 => { const dx = q[0] - hx, dy = q[1] - hy, cs = Math.cos(a), sn = Math.sin(a); return [hx + dx * cs - dy * sn, hy + dx * sn + dy * cs]; };
  return { base, toWorld: (q) => rp(q, rot), toLocal: (q) => rp(q, -rot), X0: hx, Y0: hy + sit, hx, hy, rot, u };
}
function inRot<T>(c: C2, R: RotSit, fn: () => T): T { c.save(); c.translate(R.hx, R.hy); c.rotate(R.rot); c.translate(-R.hx, -R.hy); const r = fn(); c.restore(); return r; }
function hookFig(t: number) {
  const turn = settle(t, HOOK_FOOD - 0.1, HOOK_FOOD + 1.5, 0, 1, 0.05), u = HK.nH;
  const R = rotSit(HK.nx, HK.ny, u, -1, 0.78, lerp(0.4, 0.22, turn), lerp(0.38, -0.3, turn), { idle: { t, seed: 3, amount: 0.15 } });
  const J0 = sideJoints(R.X0, R.Y0, u, R.base), kn = R.toWorld(J0.LF.k), an = R.toWorld(J0.LF.a);
  const tgt: P2 = [lerp(kn[0], an[0], 0.42) - 0.035 * u, lerp(kn[1], an[1], 0.42) + 0.01 * u];
  const pose: SidePose = { ...R.base, reachF: R.toLocal(tgt), reachB: R.toLocal([tgt[0] + 0.02 * u, tgt[1] - 0.03 * u]), gripF: "fist", gripB: "fist" };
  return { R, pose };
}
/** world-space headlamp for the rotated figure */
function hookLamp(t: number) {
  const { R, pose } = hookFig(t), J = sideJoints(R.X0, R.Y0, R.u, pose), cn = headlampCone(J, 430, 80, 0.3 * flick(t)), lp = lampOf(J);
  const o = cn.k === "cone" ? R.toWorld([cn.ox, cn.oy]) : R.toWorld([lp.x, lp.y]), e = cn.k === "cone" ? R.toWorld([cn.tx, cn.ty]) : o;
  return { cone: withBeam(cn.k === "cone" ? { ...cn, ox: o[0], oy: o[1], tx: e[0], ty: e[1] } : cn, 0.5), lp: R.toWorld([lp.x, lp.y]), d: J.d };
}
/** his carrier pack, off his back, leaning on the trunk beside him */
function leaningPack(c: C2, p: Pal, x: number, y: number, h: number) {
  const w = h * 0.42; c.fillStyle = p.fig;
  c.beginPath(); c.moveTo(x - w * 0.5, y); c.quadraticCurveTo(x - w * 0.62, y - h * 0.55, x - w * 0.4, y - h * 0.92); c.quadraticCurveTo(x, y - h * 1.02, x + w * 0.42, y - h * 0.9); c.quadraticCurveTo(x + w * 0.58, y - h * 0.5, x + w * 0.5, y); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(x, y - h * 1.0, w * 0.55, h * 0.08, 0.05, 0, TAU); c.fill(); // rolled mat on top
  c.strokeStyle = p.fig; c.lineWidth = h * 0.035; c.beginPath(); c.moveTo(x - w * 0.55, y - h * 0.8); c.quadraticCurveTo(x - w * 0.85, y - h * 0.45, x - w * 0.6, y - h * 0.15); c.stroke(); // shoulder strap
  c.beginPath(); c.arc(x + w * 0.5, y - h * 0.62, h * 0.04, 0, TAU); c.stroke(); // carabiner
  if (lit(p)) { c.strokeStyle = "rgba(228,212,178,0.6)"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - w * 0.36, y - h * 0.7); c.lineTo(x + w * 0.36, y - h * 0.7); c.moveTo(x - w * 0.3, y - h * 0.45); c.quadraticCurveTo(x, y - h * 0.4, x + w * 0.3, y - h * 0.45); c.lineTo(x + w * 0.3, y - h * 0.15); c.lineTo(x - w * 0.3, y - h * 0.15); c.closePath();
    c.moveTo(x - w * 0.5, y - h * 1.0); c.lineTo(x + w * 0.5, y - h * 1.0); c.stroke(); }
}function hookShot(): Shot {
  return {
    name: "hook", a: HA, b: HB, dust: 0.3,
    draw: (c, p, u, t, L) => {
      L(0.6); cached(c, p, "hook_bg", -160, -160, 1400, 1480, 0.6, (k) => hookBg(k, p));
      fogBand(c, p, HK.horizon - 40, 170, lit(p) ? 0.3 : 0.35, t, 1);
      // the row of too-tall figures, deep in the fog behind him ("pulang"): barely there, still, then gone
      const ga = win(t, HOOK_PUL - 0.15, HOOK_PUL + 0.75, 0.4);
      if (ga > 0.003) { c.save(); c.globalAlpha = 0.24 * ga;
        [[250, 1], [372, -1], [495, 1], [905, -1], [1035, 1]].forEach(([gx, d], i) => courtier(c, p, i % 2 ? "abdi" : "prajurit", gx, 778 + (i % 2) * 6, 318 + 14 * hash(i), p.fig, { dir: d as 1 | -1, head: 0.05 }, { t: HOOK_PUL, ghost: 1, seed: 70 + i }));
        c.restore(); }
      L(0.8); cached(c, p, "hook_mid", -160, 120, 1400, 1000, 0.8, (k) => hookMid(k, p));
      fogBand(c, p, 820, 120, lit(p) ? 0.25 : 0.3, t * 0.8, 3);
      L(1); cached(c, p, "hook_gnd", -160, -160, 1400, 2240, 1, (k) => hookGround(k, p));
      // hanging moss beards on the high branches (sway very slightly)
      for (const [x, y, len, s] of HOOK_BEARDS) mossBeard(c, p, x, y, len, 4 * Math.sin(t * 0.7 + s) + 3 * gust(t + s * 0.1), s);
      // Naam: on the ground against the trunk, knees hugged, pack off and leaning on the trunk beside him
      leaningPack(c, p, HK.nx + 112, HK.ny + 4, 0.33 * HK.nH);
      c.strokeStyle = p.fig; c.lineWidth = 4; c.beginPath(); c.moveTo(HK.nx + 175, HK.ny + 6); c.lineTo(HK.nx + 140, HK.ny - 290); c.stroke(); c.lineWidth = 7; c.beginPath(); c.moveTo(HK.nx + 142, HK.ny - 270); c.lineTo(HK.nx + 140, HK.ny - 300); c.stroke();
      c.fillStyle = lit(p) ? "rgba(20,14,8,0.5)" : "rgba(0,0,0,0.55)"; c.beginPath(); c.ellipse(HK.nx + 10, HK.ny + 2, 70, 9, 0, 0, TAU); c.ellipse(HK.nx - 150, HK.ny + 3, 50, 7, 0, 0, TAU); c.fill();
      const { R, pose } = hookFig(t);
      inRot(c, R, () => hiker(c, p, R.X0, R.Y0, R.u, p.fig, pose, { pack: false, lamp: 0.22, pole: false, beanie: true, t, breathFog: 0 }));
      // low roots beside/behind him along the ground
      c.strokeStyle = pc(p, "#6c5840", "#070b15"); c.lineCap = "round"; c.lineWidth = 14; c.beginPath(); c.moveTo(HK.nx + 60, HK.ny - 2); c.quadraticCurveTo(HK.nx + 140, HK.ny + 6, HK.nx + 230, HK.ny + 14); c.stroke();
      const HL = hookLamp(t), lp = { x: HL.lp[0], y: HL.lp[1] }, J = { d: HL.d };
      // his breath in the cold (every ~3.6 s), drifts up slowly
      for (let k = 0; k < 3; k++) { const per = 3.6, te = Math.floor(t / per - k) * per + 1.8 + (3 / TAU) * per, age = t - te; if (age < 0 || age > 2.2) continue;
        puff(c, p, lp.x + J.d * (18 + age * 22), lp.y + 46 - age * 16, 10 + age * 16, 0.55 * (1 - age / 2.2) * Math.min(1, age * 4)); }
      // the tray: steam rising dead straight, dew catching light on the rim
      straightSteam(c, p, HK.trayX + 0.66 * HK.trayR, HK.trayY + 0.05 * HK.trayR * 0.28 - 42, 190, t);
      for (let k = 0; k < 9; k++) { const a = Math.PI * (0.12 + 0.76 * (k / 8)), dx = HK.trayX + Math.cos(a) * HK.trayR * 0.99, dy = HK.trayY + Math.sin(a) * HK.trayR * 0.28 + 8;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + k * 2.1); c.fillStyle = pc(p, `rgba(255,255,250,${0.5 + 0.5 * tw})`, `rgba(170,190,230,${0.25 + 0.4 * tw})`); c.beginPath(); c.arc(dx, dy, 1.8 + tw, 0, TAU); c.fill(); }
      // two moths around the dim headlamp, a single firefly drifting low between tray and man
      for (let m = 0; m < 2; m++) { const a = t * (1.3 + 0.3 * m) + m * 2.4; moth(c, p, lp.x + J.d * 30 + Math.cos(a) * (34 + 10 * m), lp.y - 10 + Math.sin(a * 1.3) * 22, 7, 0.5 + 0.5 * Math.sin(t * 26 + m), Math.sin(a) * 0.5); }
      { const fx = 560 + 70 * Math.sin(t * 0.35), fy = 960 + 30 * Math.sin(t * 0.52 + 1), fa = 0.55 + 0.45 * Math.max(0, Math.sin(t * 1.4)); glowDot(c, fx, fy, 26, fa); c.fillStyle = `rgba(235,255,190,${fa})`; c.beginPath(); c.arc(fx, fy, 2.4, 0, TAU); c.fill(); }
      veilV(c, p, 880, 1300, 0.0, 0.16, true);
      fogBand(c, p, 1180, 140, lit(p) ? 0.12 : 0.18, t * 0.6, 5);
      // foreground: a mossy branch dipping in at the top-left, a fern tip at the bottom-right
      fg(c, p, L, () => { c.lineWidth = 26; c.beginPath(); c.moveTo(-120, 60); c.quadraticCurveTo(160, 40, 330, -40); c.stroke();
        for (let i = 0; i < 6; i++) { const x = -60 + i * 60, y = 58 - i * 14; c.lineWidth = 2.5; for (let s = 0; s < 6; s++) { c.beginPath(); c.moveTo(x + s * 4, y); c.lineTo(x + s * 4 + 5 * Math.sin(t * 0.6 + i), y + 60 + 50 * hash(i * 7 + s)); c.stroke(); } }
        fern(c, 1110, 1900, 300, -2.2, Math.sin(t * 0.5), p.fig); }, 6);
    },
    lights: (u, t) => {
      return [
        { k: "spot", x: 540, y: 380, r: 900, i: 0.16, col: MOON },
        { k: "spot", x: HK.trayX + 10, y: HK.trayY - 40, r: 300, i: 0.62, col: MOON },
        { k: "spot", x: HK.nx - 30, y: HK.ny - 170, r: 330, i: 0.34, col: MOON },
        { k: "spot", x: 420, y: 1560, r: 650, i: 0.16, col: MOON },
        hookLamp(t).cone,
      ];
    },
    amb: () => 0.07,
    cam: (u, t) => ({ z: move(t, HA, HB, 1.12, 1.5), cx: move(t, HA, HB, 400, 700), cy: move(t, HA, HB, 965, 745), rot: 0 }),
  };
}

// ================================================================== 2 TITLE (under the black title card)
function titleShot(): Shot {
  return {
    name: "title", a: TA, b: TB,
    draw: (c, p, u, t, L) => {
      L(0.7); cached(c, p, "title_bg", -160, -160, 1400, 2240, 0.5, (k) => {
        const g = k.createLinearGradient(0, -160, 0, 1300); g.addColorStop(0, pc(p, "#8f8977", "#03060c")); g.addColorStop(1, pc(p, "#c4bca4", "#16203a")); k.fillStyle = g; k.fillRect(-160, -160, 1400, 2240);
        if (!lit(p)) for (let i = 0; i < 70; i++) { k.fillStyle = `rgba(220,228,255,${0.15 + 0.4 * hash(i * 3.3)})`; k.fillRect(-150 + hash(i) * 1380, -150 + hash(i * 7.1) * 900, 2, 2); }
        k.fillStyle = pc(p, "#5b5444", "#070b16"); k.beginPath(); k.moveTo(-160, 1250);
        for (let x = -160; x <= 1240; x += 20) { const q = (x - 560) / 520, y = 1250 - 560 * Math.exp(-q * q * 1.6) - 40 * Math.sin(x * 0.02) * Math.exp(-q * q) - 20 * hash(x); k.lineTo(x, y); }
        k.lineTo(1240, 2080); k.lineTo(-160, 2080); k.fill();
      });
      fogBand(c, p, 1150, 200, 0.4, t * 2, 7);
    },
    lights: () => [{ k: "spot", x: 760, y: 420, r: 900, i: 0.3, col: MOON }], amb: () => 0.05, cam: () => ({ z: 1.05, cx: 540, cy: 960, rot: 0 }),
  };
}

// ================================================================== 3 SUMMIT (Ogal-Agil, overcast midday)
const SM = { H: 600, fy: 1110, hurtX: 130, kneelX: 528, kneelFy: 1088, kneelH: 586, naamX: 740, st1X: 300, st2X: 884, backFy: 985, backH: 480, cairnX: 572, cairnY: 950, signX: 560 };
const farFill = (p: Pal) => pc(p, "#5c5448", "#0c1322");
const midFill = (p: Pal) => pc(p, "#3a342c", "#070b16"); // atmospheric: the two farther friends read lighter than the near three
const INJ = CUE("injured"), DSC = CUE("descend"), BANT = CUE("bantuan");
const TURN0 = DSC, TURN1 = DSC + 0.55, WALK0 = DSC + 0.27;
const STEP = 0.345; // ground advance per half walk cycle, fraction of H (matches the rig stride, no foot slide)
function sumNaam(t: number) {
  const k = sm((t - TURN0) / (TURN1 - TURN0)), dir: 1 | -1 = k < 0.5 ? -1 : 1, sx = Math.max(0.5, Math.abs(Math.cos(Math.PI * k)));
  let x = SM.naamX, y = SM.fy, walk: number | undefined;
  if (t >= WALK0) { walk = phSync(t); x += (STEP * SM.H / Math.PI) * (walk - phSync(WALK0)); y += 0.18 * (x - SM.naamX); }
  const look = move(t, INJ - 0.3, INJ + 1.0, 0.08, 0.26) - move(t, DSC - 0.4, DSC + 0.4, 0, 0.3);
  const pose: SidePose = { dir, walk, idle: { t, seed: 5, amount: walk === undefined ? 0.8 : 0.3 }, head: look, stride: 1 };
  return { x, y, sx, pose };
}
function hurtPose(t: number): SidePose {
  const base: SidePose = { dir: 1, sit: 0.24 * SM.H, lean: 0.42 + 0.03 * Math.sin(t * 0.9), head: 0.32 + 0.05 * Math.sin(t * 0.6), idle: { t, seed: 11, amount: 0.9 } };
  const J0 = sideJoints(SM.hurtX, SM.fy, SM.H, base), an = J0.LF.a;
  return { ...base, reachF: [an[0] - 0.012 * SM.H, an[1] - 0.035 * SM.H], reachB: [an[0] - 0.05 * SM.H, an[1] - 0.06 * SM.H], gripF: "fist", gripB: "open" };
}
function kneelPose(t: number): SidePose {
  const lean = 0.3 + move(t, INJ - 0.2, INJ + 0.9, 0, 0.12);
  const base: SidePose = { dir: -1, sit: 0.17 * SM.kneelH, lean, head: 0.3, idle: { t, seed: 13, amount: 0.7 } };
  const Jh = sideJoints(SM.hurtX, SM.fy, SM.H, hurtPose(t)), an = Jh.LF.a;
  return { ...base, reachF: [an[0] + 0.07 * SM.H, an[1] - 0.06 * SM.H], reachB: [Jh.sh[0] + 0.03 * SM.H, Jh.sh[1] + 0.03 * SM.H], gripF: "open", gripB: "open" };
}
function st1Pose(t: number): SidePose { return { dir: 1, head: 0.22 + move(t, INJ, INJ + 1, 0, 0.12), idle: { t, seed: 17, amount: 1 } }; }
function st2Pose(t: number): SidePose {
  const off = move(t, INJ + 0.4, INJ + 1.5, 0, 1), J0 = sideJoints(SM.st2X, SM.backFy, SM.backH, { dir: -1 });
  return { dir: -1, head: 0.14 + 0.1 * off, lean: 0.06 * off, idle: { t, seed: 19, amount: 1 }, reachF: [J0.sh[0] - lerp(0.1, 0.27, off) * SM.backH, J0.sh[1] + lerp(0.3, 0.17, off) * SM.backH], gripF: "fist" };
}
function sumSky(k: C2, p: Pal) {
  const g = k.createLinearGradient(0, -160, 0, 900); g.addColorStop(0, pc(p, "#d7cfb9", "#1a2440")); g.addColorStop(1, pc(p, "#ece4d0", "#2a3858"));
  k.fillStyle = g; k.fillRect(-160, -160, 1400, 1060);
  // overcast: long soft cloud bands with sparse woodcut lines
  for (let i = 0; i < 16; i++) { const y = -100 + i * 58 + hash(i) * 20, x = -200 + hash(i * 3.3) * 600; k.fillStyle = pc(p, "rgba(196,186,160,0.35)", "rgba(40,54,84,0.5)"); k.beginPath(); k.ellipse(x + 500, y, 700 + 300 * hash(i * 7), 22 + 14 * hash(i * 5), 0, 0, TAU); k.fill(); }
}
function sumFar(k: C2, p: Pal) {
  // distant ridges right (Kembar), Welirang left
  k.fillStyle = pc(p, "#a9a28a", "#1c2846");
  k.beginPath(); k.moveTo(520, 860); for (let x = 520; x <= 1240; x += 20) k.lineTo(x, 790 - 60 * Math.exp(-Math.pow((x - 900) / 180, 2)) - 12 * Math.sin(x * 0.03)); k.lineTo(1240, 900); k.closePath(); k.fill();
  k.fillStyle = pc(p, "#8c8470", "#141e38");
  k.beginPath(); k.moveTo(-160, 860);
  for (let x = -160; x <= 680; x += 12) { const q = (x - 235) / 230; let y = 860 - 260 * Math.exp(-q * q * 1.3) - 14 * Math.sin(x * 0.05) - 8 * hash(x * 0.3); if (Math.abs(x - 245) < 30) y += 16 * (1 - Math.abs(x - 245) / 30); k.lineTo(x, y); }
  k.lineTo(680, 900); k.closePath(); k.fill();
  if (lit(p)) { k.strokeStyle = "rgba(22,14,10,0.35)"; k.lineWidth = 1.3; for (let i = 0; i < 26; i++) { const x = 60 + i * 16, q = (x - 235) / 230, top = 860 - 260 * Math.exp(-q * q * 1.3); k.beginPath(); k.moveTo(x, top + 10); k.lineTo(x + (x < 235 ? -30 : 30), top + 90 + 40 * hash(i)); k.stroke(); } }
  // sea of clouds below the summit
  for (let row = 0; row < 4; row++) { const y = 840 + row * 34; k.fillStyle = row % 2 ? pc(p, "#efe8d6", "#3a4a6c") : pc(p, "#e2dac4", "#33425f");
    k.beginPath(); k.moveTo(-160, y + 60); for (let x = -160; x <= 1240; x += 36) { const b = 18 + 14 * hash(x * 0.37 + row * 9); k.quadraticCurveTo(x + 18, y - b, x + 36, y + 2 * Math.sin(x)); } k.lineTo(1240, y + 120); k.lineTo(-160, y + 120); k.closePath(); k.fill();
    if (lit(p)) { k.strokeStyle = "rgba(22,14,10,0.25)"; k.lineWidth = 1; k.stroke(); } }
}
function sumGround(k: C2, p: Pal) {
  const L = lit(p), rockC = pc(p, "#bcb092", "#121b2e"), rock2 = pc(p, "#a69a7e", "#0e1626");
  // back boulders: the stacked "ogal-agil" rocks at left, outcrop at right
  rock(k, p, 30, 1000, 300, 230, 101, rock2, 0.6); rock(k, p, 70, 790, 190, 150, 102, rockC, 0.55); rock(k, p, -80, 960, 200, 260, 103, rockC, 0.6);
  rock(k, p, 1060, 1010, 340, 200, 104, rock2, 0.6); rock(k, p, 1150, 870, 200, 150, 105, rockC, 0.5);
  // summit ground: rocky soil with gravel, sloping off to the right (the trail)
  k.fillStyle = pc(p, "#b5a988", "#0f1828"); k.beginPath(); k.moveTo(-160, 1000);
  for (let x = -160; x <= 1240; x += 24) { const y = 985 + 10 * Math.sin(x * 0.02) - 46 * Math.exp(-Math.pow((x - 560) / 230, 2)) + (x > 760 ? (x - 760) * 0.12 : 0); k.lineTo(x, y); }
  k.lineTo(1240, 2080); k.lineTo(-160, 2080); k.closePath(); k.fill();
  if (L) { k.strokeStyle = "rgba(22,14,10,0.45)"; for (let i = 0; i < 300; i++) { const y = 1000 + Math.pow(hash(i * 1.3), 0.9) * 1050, x = -150 + hash(i * 2.9) * 1380, l = 8 + (y - 990) * 0.04; k.lineWidth = 0.8 + (y - 990) * 0.0015; k.beginPath(); k.moveTo(x, y); k.lineTo(x + l, y + l * 0.08); k.stroke(); } }
  // the trail: a worn pale strip from the plateau down to the right edge, with ruts
  k.fillStyle = pc(p, "#cfc3a3", "#141e32"); k.beginPath(); k.moveTo(520, 1100); k.quadraticCurveTo(820, 1140, 1240, 1250); k.lineTo(1240, 1330); k.quadraticCurveTo(820, 1210, 520, 1150); k.closePath(); k.fill();
  if (L) { k.strokeStyle = "rgba(22,14,10,0.5)"; k.lineWidth = 1.5; for (const o of [12, 30]) { k.beginPath(); k.moveTo(560, 1110 + o); k.quadraticCurveTo(840, 1150 + o, 1240, 1262 + o); k.stroke(); } }
  // slabs + boulders in the foreground band (calm, under the captions)
  // natural rock clusters (one big stone + smaller ones leaning on it), sizes grow toward the lens; plus a lone slab and scree
  const CL: [number, number, number][] = [[80, 1250, 0.8], [760, 1320, 0.9], [330, 1560, 1.15], [980, 1690, 1.3], [-20, 1830, 1.5], [620, 1900, 1.6]];
  CL.forEach(([cx, cy, sc], ci) => {
    const n = 3 + Math.floor(hash(ci * 7.3) * 3);
    for (let j = 0; j < n; j++) { const big = j === 0, w = (big ? 170 + 90 * hash(ci) : 40 + 70 * hash(ci * 3 + j)) * sc, h = w * (0.25 + 0.45 * hash(ci * 5 + j * 2.1)), ox = big ? 0 : (j % 2 ? 1 : -1) * (60 + 50 * hash(j + ci)) * sc, oy = big ? 0 : 8 + 18 * hash(j * 3 + ci);
      rock(k, p, cx + ox, cy + oy, w, h, 400 + ci * 10 + j, (ci + j) % 2 ? rockC : rock2, 0.4 + 0.2 * hash(j), 1.2); }
    for (let j = 0; j < 4; j++) tussock(k, cx + (j - 1.5) * 70 * sc, cy + 14 + 6 * hash(j), 60 * sc, 14, 0.08, 470 + ci * 9 + j, pc(p, j % 2 ? "#8f8558" : "#a99a66", "#101a2c"), 2.4 * sc);
  });
  rock(k, p, 520, 1450, 300, 34, 491, rock2, 0.35, 1.5); // flat slab
  pebbles(k, p, 380, 760, 1460, 1520, 60, 77, 7);
  // a dropped glove + a bottle cap on the slab path
  { const gx = 470, gy = 1420; k.fillStyle = pc(p, "#4a4038", "#070b16"); k.beginPath(); k.ellipse(gx, gy, 26, 12, -0.2, 0, TAU); k.fill(); for (let q = 0; q < 4; q++) { k.beginPath(); k.ellipse(gx + 24 + q * 2, gy - 12 + q * 6, 11, 4, 0.3 + q * 0.15, 0, TAU); k.fill(); }
    k.beginPath(); k.ellipse(gx - 26, gy + 4, 9, 13, 0.4, 0, TAU); k.fill(); if (L) { k.strokeStyle = "rgba(230,214,180,0.6)"; k.lineWidth = 1.2; k.beginPath(); k.moveTo(gx - 18, gy + 2); k.quadraticCurveTo(gx, gy - 4, gx + 18, gy - 2); k.stroke(); } }
  { const bx = 640, by = 1480; k.fillStyle = pc(p, "#c9c2b0", "#1a2640"); k.beginPath(); k.ellipse(bx, by, 7, 3.5, 0, 0, TAU); k.fill(); k.fillRect(bx - 7, by - 4, 14, 4); if (L) { k.strokeStyle = p.ink; k.lineWidth = 1; k.strokeRect(bx - 7, by - 4, 14, 4); } }
  // gravel patches + rock cracks on the summit floor
  if (L) { k.strokeStyle = "rgba(22,14,10,0.5)"; k.lineWidth = 1.3; for (let i = 0; i < 14; i++) { const x = -100 + hash(i * 3.9) * 1300, y = 1150 + hash(i * 6.3) * 800; k.beginPath(); k.moveTo(x, y); k.lineTo(x + 30 + 30 * hash(i), y + 8); k.lineTo(x + 50 + 40 * hash(i * 2), y + 2); k.stroke(); } }
  pebbles(k, p, -150, 1230, 1000, 2060, 260, 21, 6);
  // grass tussocks (static base layer), edelweiss clumps, lichen on everything
  for (let i = 0; i < 40; i++) { const x = -140 + hash(i * 4.3) * 1360, y = 1010 + Math.pow(hash(i * 2.7), 0.8) * 1000, s = 0.5 + (y - 1000) / 900; tussock(k, x, y, 50 * s, 16, 0.1, 200 + i, pc(p, i % 2 ? "#8f8558" : "#a99a66", "#101a2c"), 2.2 * s); }
  for (let i = 0; i < 9; i++) { const x = -100 + hash(i * 6.1) * 1300, y = 1060 + hash(i * 8.3) * 800; edelweiss(k, p, x, y, 26 + 20 * (y - 1000) / 900, 300 + i); }
  // seat rock (hurt friend), low rock (kneeling friend)
  rock(k, p, SM.hurtX - 10, SM.fy + 4, 190, 0.24 * SM.H + 4, 160, rockC, 0.5);
  rock(k, p, SM.kneelX + 22, SM.kneelFy + 2, 110, 0.17 * SM.kneelH, 161, rock2, 0.45);
  // the wooden plank sign (≈60×20 cm on a 1.1 m post at the back depth): "OGAL-AGIL / 3339 MDPL", post rising from a stone cairn
  { const sx = SM.signX, top = SM.cairnY - 320; k.fillStyle = pc(p, "#7d6446", "#0d1424"); k.fillRect(sx - 7, top + 20, 14, SM.cairnY - top - 30);
    if (L) { k.strokeStyle = p.ink; k.lineWidth = 2; k.strokeRect(sx - 7, top + 20, 14, SM.cairnY - top - 30); k.lineWidth = 1; for (let i = 0; i < 6; i++) { k.beginPath(); k.moveTo(sx - 3 + (i % 2) * 5, top + 40 + i * 50); k.lineTo(sx - 2 + (i % 2) * 5, top + 70 + i * 50); k.stroke(); } }
    box0(k, p, sx - 94, top - 32, 188, 64, pc(p, "#b39066", "#162036"));
    if (L) { k.strokeStyle = "rgba(40,24,12,0.55)"; k.lineWidth = 1; for (let i = 0; i < 5; i++) { k.beginPath(); k.moveTo(sx - 88, top - 24 + i * 12); k.quadraticCurveTo(sx, top - 21 + i * 12 + 3 * Math.sin(i), sx + 88, top - 24 + i * 12); k.stroke(); }
      k.fillStyle = "#1a100a"; k.textAlign = "center"; k.font = "bold 30px Arial"; k.fillText("OGAL-AGIL", sx, top + 1); k.font = "bold 21px Arial"; k.fillText("3339 MDPL", sx, top + 25); k.textAlign = "left";
      k.fillStyle = "#3a3026"; for (const nx of [-84, 84]) { k.beginPath(); k.arc(sx + nx, top - 2, 2.6, 0, TAU); k.fill(); } } }
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4 - r; i++) { const sx = SM.cairnX - 66 + r * 22 + i * 44 + hash(r * 9 + i) * 6, sy = SM.cairnY - r * 30; rock(k, p, sx, sy, 48, 30, 170 + r * 5 + i, i % 2 ? rockC : rock2, 0.5, 0.5); }
  box0(k, p, SM.cairnX + 40 - 12, SM.cairnY - 150, 24, 58, pc(p, "#d8d0bc", "#1c2840")); // small concrete tugu beside the post
  // gear: tarp spread behind the hurt friend, stove + pot, bottles, trash bag, poles leaning on the seat rock
  k.fillStyle = pc(p, "#9fadb4", "#18243c"); k.beginPath(); k.moveTo(-40, 1080); k.lineTo(150, 1068); k.lineTo(170, 1110); k.lineTo(-30, 1124); k.closePath(); k.fill();
  if (L) { k.strokeStyle = p.ink; k.lineWidth = 1.5; k.stroke(); k.lineWidth = 1; for (let i = 1; i < 5; i++) { k.beginPath(); k.moveTo(-40 + i * 40, 1078 - i * 2); k.lineTo(-30 + i * 42, 1122 - i * 2); k.stroke(); } }
  { const sx = 40, sy = 1106; k.fillStyle = pc(p, "#c9c2b0", "#1a2640"); k.beginPath(); k.ellipse(sx, sy - 10, 13, 10, 0, 0, TAU); k.fill(); k.fillStyle = pc(p, "#4d4a44", "#0b111e"); k.fillRect(sx - 2, sy - 26, 4, 8);
    k.fillStyle = pc(p, "#8f8f8a", "#141e32"); k.beginPath(); k.moveTo(sx - 18, sy - 44); k.lineTo(sx + 18, sy - 44); k.lineTo(sx + 16, sy - 28); k.lineTo(sx - 16, sy - 28); k.closePath(); k.fill();
    if (L) { k.strokeStyle = p.ink; k.lineWidth = 1.4; k.stroke(); k.beginPath(); k.ellipse(sx, sy - 10, 13, 10, 0, 0, TAU); k.stroke(); k.beginPath(); k.moveTo(sx + 18, sy - 40); k.lineTo(sx + 34, sy - 42); k.stroke(); } }
  for (const [bx, h] of [[82, 34], [98, 30]] as [number, number][]) { k.fillStyle = pc(p, "rgba(220,226,228,0.85)", "rgba(40,56,86,0.7)"); k.fillRect(bx - 6, 1104 - h, 12, h); k.fillStyle = pc(p, "#3a5a6a", "#0b111e"); k.fillRect(bx - 4, 1104 - h - 6, 8, 6); if (L) { k.strokeStyle = p.ink; k.lineWidth = 1.2; k.strokeRect(bx - 6, 1104 - h, 12, h); } }
  { const bx = 392, by = 1000; k.fillStyle = pc(p, "#2a2622", "#05080f"); k.beginPath(); k.moveTo(bx - 24, by); k.quadraticCurveTo(bx - 30, by - 36, bx - 6, by - 44); k.lineTo(bx - 4, by - 52); k.lineTo(bx + 6, by - 52); k.lineTo(bx + 6, by - 44); k.quadraticCurveTo(bx + 30, by - 36, bx + 24, by); k.closePath(); k.fill();
    if (L) { k.strokeStyle = "rgba(240,232,210,0.5)"; k.lineWidth = 1.2; k.beginPath(); k.moveTo(bx - 12, by - 30); k.quadraticCurveTo(bx - 4, by - 18, bx - 10, by - 6); k.stroke(); } }
  k.strokeStyle = pc(p, "#2a2622", "#05080f"); k.lineWidth = 4; for (const [x0, x1] of [[96, 140], [108, 160]]) { k.beginPath(); k.moveTo(x0, 1112); k.lineTo(x1, 880); k.stroke(); } k.lineWidth = 8; for (const x1 of [140, 160]) { k.beginPath(); k.moveTo(x1 - 2, 890); k.lineTo(x1, 870); k.stroke(); }
  // dead cantigi bush at the back right (flagging tape is drawn live)
  drawTree(k, treeShape(1010, 1000, 210, 9, 1.0, 3, 0.15), pc(p, "#6a5a44", "#0a0f1c"), null, 0, 0, 9);
}
const box0 = (k: C2, p: Pal, x: number, y: number, w: number, h: number, fill: string) => { rcut(k, p, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 1.5, x + y, fill, { edge: 2.5, hatch: 0.35, dir: 1.2, seed: 3, bbox: [x, y, w, h] }); };
function swifts(c: C2, p: Pal, t: number) {
  c.fillStyle = pc(p, "#2a1c12", "#0a0f1c");
  for (let i = 0; i < 7; i++) {
    const sg = i % 2 ? 1 : -1, w = (0.45 + 0.35 * hash(i * 5.1)) * sg, r = 100 + 130 * hash(i * 2.3), a = t * w + i * 1.9;
    const cx = 830 + 50 * Math.sin(t * 0.2 + i), cy = 590 + 30 * Math.cos(t * 0.17 + i), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.42;
    const vx = -Math.sin(a) * w, vy = Math.cos(a) * 0.42 * w, ang = Math.atan2(vy, vx), s = 10 + 4 * hash(i), fl = Math.sin(t * 13 + i * 2);
    c.save(); c.translate(x, y); c.rotate(ang); c.beginPath();
    c.moveTo(s * 0.55, 0); c.quadraticCurveTo(0, -s * 0.14, -s * 0.45, -s * 0.06); c.lineTo(-s * 0.7, -s * 0.16); c.lineTo(-s * 0.55, 0); c.lineTo(-s * 0.7, s * 0.16); c.lineTo(-s * 0.45, s * 0.06); c.quadraticCurveTo(0, s * 0.14, s * 0.55, 0); c.fill();
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.15, 0); c.quadraticCurveTo(-s * 0.1, sd * s * (0.55 + 0.25 * fl), -s * 0.75, sd * s * (0.85 + 0.15 * fl)); c.quadraticCurveTo(-s * 0.15, sd * s * 0.3, -s * 0.12, 0); c.fill(); }
    c.restore();
  }
}
function summitShot(): Shot {
  return {
    name: "summit", a: SA, b: SB,
    draw: (c, p, u, t, L) => {
      L(0.4); cached(c, p, "sum_sky", -160, -160, 1400, 1060, 0.5, (k) => sumSky(k, p));
      L(0.5); swifts(c, p, t);
      L(0.55); cached(c, p, "sum_far", -160, 560, 1400, 560, 0.75, (k) => sumFar(k, p));
      // Welirang's thin sulphur plume, bending with the wind
      for (let k = 0; k < 26; k++) { const q = k / 26, a = 0.3 * (1 - q) * (0.75 + 0.25 * Math.sin(t * 0.8 - k * 0.5));
        c.fillStyle = pc(p, `rgba(176,166,118,${a})`, `rgba(120,132,160,${a * 0.8})`); c.beginPath(); c.arc(246 + q * q * (150 + 60 * gust(t)) + 6 * Math.sin(k * 0.7 + t * 0.6), 618 - q * 230, 5 + q * 26, 0, TAU); c.fill(); }
      fogBand(c, p, 890, 70, lit(p) ? 0.5 : 0.45, t * 1.5, 11);
      L(1); cached(c, p, "sum_gnd", -160, 560, 1400, 1520, 1, (k) => sumGround(k, p));
      // living ground detail: tussocks in the wind, edelweiss heads nodding
      const wnd = 0.12 * Math.sin(t * 1.1) + 0.22 * gust(t);
      for (let i = 0; i < 18; i++) { const x = -100 + hash(i * 9.7) * 1300, y = 1000 + Math.pow(hash(i * 3.9), 0.7) * 700, s = 0.6 + (y - 1000) / 800; tussock(c, x, y, 70 * s, 14, wnd * (0.7 + 0.6 * hash(i)) + 0.03 * Math.sin(t * 2 + i), 500 + i, pc(p, i % 2 ? "#9d915f" : "#b3a46e", "#121c30"), 2.4 * s); }
      for (let i = 0; i < 5; i++) { const x = 20 + i * 230 + 40 * hash(i * 2), y = 1130 + 140 * hash(i * 3.3); edelweiss(c, p, x, y, 32, 400 + i, wnd * 1.5 + 0.2 * Math.sin(t * 1.7 + i)); }
      // flagging tape on the dead bush, tarp corner lifting, stove flame + pot steam
      { const ax = 1052, ay = 852, n = 12; c.strokeStyle = pc(p, "#d9c27a", "#2a3a5a"); c.lineWidth = 5; c.beginPath(); c.moveTo(ax, ay);
        for (let i = 1; i <= n; i++) { const q = i / n; c.lineTo(ax - q * (50 + 40 * gust(t)), ay + q * (60 - 40 * gust(t)) + 7 * Math.sin(t * 7 - i * 0.9) * q); } c.stroke(); }
      { const g = gust(t), lift = 18 * g + 4 * Math.sin(t * 5) * g; c.fillStyle = pc(p, "#8d9ca4", "#16223a"); c.beginPath(); c.moveTo(-40, 1080); c.lineTo(10, 1076); c.lineTo(-30 - 6 * g, 1076 - lift); c.closePath(); c.fill(); if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 1.4; c.stroke(); } }
      glowDot(c, 40, 1080, 10, 0.55, "150,190,255");
      for (let k = 0; k < 14; k++) { const q = k / 14, a = 0.3 * (1 - q); c.fillStyle = pc(p, `rgba(250,246,236,${a})`, `rgba(150,165,195,${a})`); c.beginPath(); c.arc(40 + q * (40 + 50 * gust(t)) + 4 * Math.sin(t * 2 + k), 1060 - q * 90, 3 + q * 10, 0, TAU); c.fill(); }
      // the five: two standing at the back, hurt friend on the rock, one kneeling, Naam with his full pack
      friend(c, p, SM.st1X, SM.backFy, SM.backH, farFill(p), st1Pose(t), { t, seed: 2, pack: true, pole: true, beanie: false });
      { const J = friend(c, p, SM.st2X, SM.backFy + 6, SM.backH, farFill(p), st2Pose(t), { t, seed: 3, pack: true, beanie: true }); const h = handAnchor(J, "F");
        c.fillStyle = pc(p, "rgba(220,226,228,0.95)", "rgba(40,56,86,0.9)"); c.fillRect(h.x - 6, h.y - 30, 12, 36); c.fillStyle = pc(p, "#3a5a6a", "#0b111e"); c.fillRect(h.x - 4, h.y - 36, 8, 7); if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 1.3; c.strokeRect(h.x - 6, h.y - 30, 12, 36); } }
      friend(c, p, SM.hurtX, SM.fy, SM.H, p.fig, hurtPose(t), { t, seed: 4, pack: false, hurt: true, beanie: false });
      friend(c, p, SM.kneelX, SM.kneelFy, SM.kneelH, midFill(p), kneelPose(t), { t, seed: 6, pack: true, beanie: true });
      { const N = sumNaam(t); c.save(); c.translate(N.x, 0); c.scale(N.sx, 1); c.translate(-N.x, 0);
        hiker(c, p, N.x, N.y, SM.H, p.fig, N.pose, { pack: true, pole: true, beanie: true, lamp: 0, t }); c.restore(); }
      // foreground: blurred edelweiss + grass at the bottom-left edge, a rock lip at the bottom-right
      fg(c, p, L, () => { tussock(c, -10, 1980, 260, 18, 0.15 * Math.sin(t) + 0.2 * gust(t), 900, p.fig, 7); c.beginPath(); c.moveTo(860, 2100); c.quadraticCurveTo(900, 1870, 1060, 1840); c.quadraticCurveTo(1180, 1840, 1240, 1900); c.lineTo(1240, 2100); c.closePath(); c.fill(); }, 7);
    },
    lights: (u, t) => [{ k: "spot", x: 700, y: 120, r: 1800, i: 0.42 + 0.03 * Math.sin(t * 0.3), col: DAWN }, { k: "spot", x: 320, y: 820, r: 700, i: 0.12 + 0.1 * win(t, INJ, SB + 1, 0.8), col: DAWN }],
    amb: () => 0.6,
    cam: (u, t) => {
      const z = 1.06 + move(t, SA, INJ, 0, 0.02) + move(t, INJ - 0.25, INJ + 1.05, 0, 0.05) + move(t, DSC, SB, 0, 0.02);
      const cx = 540 + move(t, INJ - 0.25, INJ + 1.05, 0, -70) + move(t, DSC, SB, 0, -12), cy = 1042 + move(t, INJ - 0.25, INJ + 1.05, 0, 2);
      return { z, cx, cy, rot: 0 };
    },
  };
}
void BANT;

// ================================================================== 4 FOG (Plewangan savanna: the fog, then no wind)
const FG = { NX: 420, GY: 1080, H: 580, SL: 0.14 };
const STILL = CUE("stillLeaves"), FOG_IN = CUE("fogIn");
const F_TS = NW + 0.1, F_PH_TS = phSync(F_TS);
const F_TARGET = Math.PI / 2 + Math.ceil((F_PH_TS + (OMEGA * 0.9) / 2 - Math.PI / 2) / Math.PI) * Math.PI; // ends on a heel strike (feet planted)
const F_D = (2 * (F_TARGET - F_PH_TS)) / OMEGA, F_STOP = F_TS + F_D;
/** walk phase in the fog shot: footstep-synced, then decelerates smoothly to a planted stance right around "stillLeaves" */
const fPhase = (t: number) => { if (t <= F_TS) return phSync(t); const x = Math.min(1, (t - F_TS) / F_D); return F_PH_TS + OMEGA * F_D * (x - x * x * x + (x * x * x * x) / 2); };
const F_STEPK = (STEP * FG.H) / Math.PI;
const fX = (t: number) => F_STEPK * (fPhase(t) - fPhase(FA)); // ground scroll (px), tied to the steps
const F_XEND = fX(FB);
const gyAt = (xl: number) => FG.GY + FG.SL * (xl - FG.NX); // ground line in ground-local coords
const lampOnF = (t: number) => move(t, STILL + 0.95, STILL + 1.3, 0, 1);
function fogPose(t: number): SidePose {
  const ph = fPhase(t), stop = move(t, F_TS + 0.2, F_STOP + 0.4, 0, 1);
  const sF = 0.3 * Math.sin(ph), sB = -sF; // the rig's own walk arm swing, blended to rest as he stops
  const armF: [number, number] = [lerp(sF, 0.18, stop), lerp(-(0.2 + (0.35 * Math.max(0, sF)) / 0.3), -0.55, stop)];
  const armB: [number, number] = [lerp(sB, 0.04, stop), lerp(-(0.2 + (0.35 * Math.max(0, sB)) / 0.3), -0.15, stop)];
  return { dir: 1, walk: ph, armF, armB, gripF: "fist", idle: { t, seed: 5, amount: 0.35 }, head: 0.06 - move(t, F_TS, F_STOP, 0, 0.06), look: settle(t, STILL - 0.05, STILL + 1.35, 0, -0.34, 0.05), lean: -move(t, STILL, STILL + 1.3, 0, 0.04) };
}
const fogJ = (t: number) => sideJoints(FG.NX, FG.GY, FG.H, fogPose(t));
const T2X = 2160, T1X = -120, TSIGN = 880; // ground-local x of the near cantigi trees and the JALUR sign
/** the leaf that stops in mid-air: falls from T2, freezes with the wind; ends right in front of his face */
const LEAF = (() => {
  const K = 1.12, wx = 548, wy = 572; // final world position (in front of his face), slightly nearer than him (scroll factor K)
  const xF = wx + K * F_XEND, yF = wy + FG.SL * K * F_XEND, t0 = 17.35 > FA + 1 ? 17.35 : FA + 1, span = tFr(FB) - tFr(t0), v = 105;
  return { K, xF, yF, t0, span, v };
})();
function fogFar(k: C2, p: Pal) {
  const g = k.createLinearGradient(0, -200, 0, 1300); g.addColorStop(0, pc(p, "#d6cfba", "#26324e")); g.addColorStop(1, pc(p, "#e6dfcb", "#34425f")); k.fillStyle = g; k.fillRect(-400, -300, 2300, 1900);
  // uphill savanna to the left (behind him), far ridges + cloud sea to the right (downhill)
  k.fillStyle = pc(p, "#b4ab8c", "#1d2844"); k.beginPath(); k.moveTo(1900, 860); for (let x = 1900; x >= 500; x -= 30) k.lineTo(x, 820 - 70 * Math.exp(-Math.pow((x - 1250) / 260, 2)) - 10 * Math.sin(x * 0.02)); k.lineTo(500, 900); k.lineTo(1900, 900); k.closePath(); k.fill();
  k.fillStyle = pc(p, "#a49a7c", "#18223c"); k.beginPath(); k.moveTo(-400, 380);
  for (let x = -400; x <= 1100; x += 25) k.lineTo(x, 380 + (x + 400) * 0.36 + 20 * Math.sin(x * 0.013) + 8 * hash(x)); k.lineTo(1100, 1500); k.lineTo(-400, 1500); k.closePath(); k.fill();
  for (let i = 0; i < 22; i++) { const x = -380 + i * 70 + 30 * hash(i), y = 380 + (x + 400) * 0.36 + 6; const T = treeShape(x, y, 70 + 50 * hash(i * 3), 600 + i, 0.9, 2); drawTree(k, T, pc(p, "#857a62", "#121a30"), pc(p, "#7c7860", "#121a30"), 3.2, 0, i, 6); }
  k.globalAlpha = 0.45; for (let row = 0; row < 3; row++) { const y = 880 + row * 30; k.fillStyle = pc(p, row % 2 ? "#efe8d6" : "#e4dcc6", row % 2 ? "#3a4a6c" : "#33425f"); k.beginPath(); k.moveTo(700, y + 60);
    for (let x = 700; x <= 1900; x += 40) k.quadraticCurveTo(x + 20, y - 16 - 12 * hash(x + row), x + 40, y); k.lineTo(1900, y + 200); k.lineTo(700, y + 200); k.closePath(); k.fill(); } k.globalAlpha = 1;
}
function fogMid(k: C2, p: Pal) {
  // a farther strip of savanna (parallel to the near ground, higher on screen = farther)
  const ym = (x: number) => gyAt(x) - 170 + 10 * Math.sin(x * 0.011);
  k.fillStyle = pc(p, "#b0a37c", "#16203a"); k.beginPath(); k.moveTo(-400, ym(-400)); for (let x = -400; x <= 2600; x += 30) k.lineTo(x, ym(x)); k.lineTo(2600, 2200); k.lineTo(-400, 2200); k.closePath(); k.fill();
  for (let i = 0; i < 160; i++) { const x = -380 + hash(i * 3.3) * 2960; tussock(k, x, ym(x) + 4 + hash(i * 7) * 30, 46 + 30 * hash(i * 1.7), 11, 0.08, 700 + i, pc(p, i % 2 ? "#958a5d" : "#ab9c69", "#121c32"), 2); }
  for (let i = 0; i < 13; i++) { const x = -300 + i * 220 + 90 * hash(i * 5.7), h = 200 + 140 * hash(i * 2.9); const T = treeShape(x, ym(x) + 8, h, 800 + i, 0.95, 3, 0.1 * (hash(i) - 0.5));
    drawTree(k, T, pc(p, "#6e604a", "#0e1528"), pc(p, "#6c6c4c", "#101a2e"), 4.2, 0, 800 + i, 8);
    for (let j = 0; j < T.tips.length; j += 3) mossBeard(k, p, T.tips[j][0], T.tips[j][1], 26 + 16 * hash(j + i), 0, 900 + i * 10 + j, 0.7); }
  for (let i = 0; i < 9; i++) { const x = -250 + i * 330 + 80 * hash(i * 4.1); rock(k, p, x, ym(x) + 22, 70 + 50 * hash(i), 30 + 20 * hash(i * 2), 950 + i, undefined, 0.45, 0.6); }
}
function fogGround(k: C2, p: Pal) {
  const L = lit(p);
  k.fillStyle = pc(p, "#b9ab84", "#121b30"); k.beginPath(); k.moveTo(-400, gyAt(-400) - 6); for (let x = -400; x <= 3200; x += 30) k.lineTo(x, gyAt(x) - 6 + 3 * Math.sin(x * 0.03)); k.lineTo(3200, 2500); k.lineTo(-400, 2500); k.closePath(); k.fill();
  // eroded trail: pale tread with ruts, pebbles, an exposed root and the cut bank in front
  k.fillStyle = pc(p, "#d3c6a2", "#18233a"); k.beginPath(); k.moveTo(-400, gyAt(-400) - 4); for (let x = -400; x <= 3200; x += 40) k.lineTo(x, gyAt(x) - 4 + 2 * Math.sin(x * 0.05)); for (let x = 3200; x >= -400; x -= 40) k.lineTo(x, gyAt(x) + 34 + 4 * Math.sin(x * 0.021)); k.closePath(); k.fill();
  if (L) { k.strokeStyle = "rgba(22,14,10,0.55)"; for (const [o, w] of [[6, 1.6], [16, 1.2], [27, 2.2]] as [number, number][]) { k.lineWidth = w; k.beginPath(); for (let x = -400; x <= 3200; x += 20) { const y = gyAt(x) + o + 2 * Math.sin(x * 0.04 + o); x === -400 ? k.moveTo(x, y) : k.lineTo(x, y); } k.stroke(); }
    k.lineWidth = 2.5; k.beginPath(); for (let x = -400; x <= 3200; x += 20) { const y = gyAt(x) + 36 + 4 * Math.sin(x * 0.021); x === -400 ? k.moveTo(x, y) : k.lineTo(x, y); } k.stroke();
    k.lineWidth = 1; for (let i = 0; i < 400; i++) { const x = -400 + hash(i * 1.9) * 3600, y = gyAt(x) + 40 + hash(i * 4.3) * 900; k.beginPath(); k.moveTo(x, y); k.lineTo(x - 3, y + 6 + (y - 1100) * 0.01); k.stroke(); } }
  for (let i = 0; i < 260; i++) { const x = -400 + hash(i * 2.7) * 3600; const y = gyAt(x) + 2 + hash(i * 6.1) * 30, r = 2 + 3 * hash(i * 3.9); k.fillStyle = pc(p, hash(i) > 0.5 ? "#a99c80" : "#e2d8bc", "#101828"); k.beginPath(); k.ellipse(x, y, r, r * 0.6, 0, 0, TAU); k.fill(); }
  for (let i = 0; i < 6; i++) { const x = 200 + i * 560 + 100 * hash(i); k.strokeStyle = pc(p, "#6c5840", "#0a0f1c"); k.lineWidth = 7; k.beginPath(); k.moveTo(x, gyAt(x) + 30); k.quadraticCurveTo(x + 40, gyAt(x + 40) + 4, x + 110, gyAt(x + 110) + 26); k.stroke(); }
  // savanna: tall grass behind the trail (static mass), lower grass + rocks in front
  for (let i = 0; i < 420; i++) { const x = -400 + hash(i * 1.37) * 3600; tussock(k, x, gyAt(x) - 4 - hash(i * 5.3) * 10, 90 + 110 * hash(i * 2.1), 13, 0.1 * (hash(i * 9) - 0.3), 1000 + i, pc(p, i % 3 ? "#a8975f" : "#c4b27a", "#111a2e"), 2.6); }
  for (let i = 0; i < 520; i++) { const x = -400 + hash(i * 2.21) * 3600, y = gyAt(x) + 60 + Math.pow(hash(i * 4.4), 0.8) * 900, s = 0.7 + (y - gyAt(x)) / 500; tussock(k, x, y, 60 * s, 12, 0.1, 1500 + i, pc(p, i % 2 ? "#9a8b58" : "#b5a46e", "#0f1729"), 2.6 * s); }
  for (let i = 0; i < 14; i++) { const x = -300 + i * 250 + 80 * hash(i * 3); rock(k, p, x, gyAt(x) + 120 + 400 * hash(i * 7), 120 + 80 * hash(i), 50 + 40 * hash(i * 5), 1100 + i, undefined, 0.5, 0.8); }
  for (let i = 0; i < 10; i++) { const x = -300 + hash(i * 8.1) * 3400; edelweiss(k, p, x, gyAt(x) + 80 + 300 * hash(i * 2.9), 30, 1200 + i); }
  // the slope below the trail: dead flower stalks with seed heads, scree pebbles, small stones, burnt stumps
  for (let i = 0; i < 160; i++) { const x = -400 + hash(i * 3.71) * 3600, y = gyAt(x) + 90 + Math.pow(hash(i * 1.53), 0.9) * 820, s = 0.7 + (y - gyAt(x)) / 600, hh = (40 + 50 * hash(i * 2.2)) * s;
    k.strokeStyle = pc(p, "#7d6c4a", "#0e1628"); k.lineWidth = 1.4 * s; k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + 4 * s, y - hh * 0.5, x + (hash(i) - 0.5) * 14 * s, y - hh); k.stroke();
    k.fillStyle = pc(p, "#5f5038", "#0b1222"); k.beginPath(); k.ellipse(x + (hash(i) - 0.5) * 14 * s, y - hh, 3 * s, 5 * s, 0, 0, TAU); k.fill(); }
  pebbles(k, p, -400, 3200, 1250, 2300, 700, 61, 7);
  for (let i = 0; i < 22; i++) { const x = -350 + hash(i * 5.17) * 3500; rock(k, p, x, gyAt(x) + 200 + 600 * hash(i * 3.3), 40 + 70 * hash(i * 1.1), 18 + 26 * hash(i * 2.7), 1300 + i, undefined, 0.45, 1); }
  for (let i = 0; i < 6; i++) { const x = -200 + i * 600 + 200 * hash(i * 9); const y = gyAt(x) + 300 + 300 * hash(i * 4); k.fillStyle = pc(p, "#3a3026", "#070b15"); k.beginPath(); k.moveTo(x - 22, y); k.lineTo(x - 16, y - 46); k.lineTo(x - 4, y - 38); k.lineTo(x + 6, y - 60); k.lineTo(x + 18, y - 30); k.lineTo(x + 24, y); k.closePath(); k.fill(); }
  // the rusty tin sign "JALUR" on a stake (front edge of the trail)
  { const sx = TSIGN, gy = gyAt(sx) + 40; k.fillStyle = pc(p, "#6c5840", "#0a0f1c"); k.fillRect(sx - 5, gy - 120, 10, 126);
    k.save(); k.translate(sx, gy - 112); k.rotate(-0.06); k.scale(1.45, 1.45); k.fillStyle = pc(p, "#b3a68a", "#1a2640"); k.beginPath(); k.moveTo(-38, -16); k.lineTo(38, -16); k.lineTo(38, 10); k.lineTo(30, 16); k.lineTo(-38, 16); k.closePath(); k.fill();
    if (L) { k.strokeStyle = p.ink; k.lineWidth = 1.6; k.stroke(); k.fillStyle = "rgba(120,62,28,0.6)"; for (let i = 0; i < 18; i++) { k.beginPath(); k.arc(-34 + hash(i * 2.2) * 68, -13 + hash(i * 3.1) * 26, 1 + 3 * hash(i), 0, TAU); k.fill(); }
      k.fillStyle = "rgba(110,56,24,0.45)"; k.fillRect(-38, 6, 30, 10); k.fillStyle = "#1a100a"; k.font = "bold 17px Arial"; k.textAlign = "center"; k.fillText("JALUR", 0, 6); k.textAlign = "left";
      k.fillStyle = "#2a2018"; k.beginPath(); k.arc(0, -11, 1.8, 0, TAU); k.fill(); }
    k.restore(); }
}
function fogShot(): Shot {
  return {
    name: "fog", a: FA, b: FB,
    draw: (c, p, u, t, L) => {
      const X = fX(t), tf = tFr(t), f = fogAmt(t), fr = clamp((f - 0.15) / 0.85), roll = move(t, FOG_IN - 0.2, FOG_IN + 2.4, -1500, 0);
      const scroll = (k: number) => c.translate(-X * k, -FG.SL * X * k);
      // far: sky, uphill behind him, valley + cloud sea ahead; swallowed first
      L(0.5); c.save(); scroll(0.22); cached(c, p, "fog_far", -400, -300, 2300, 1900, 0.5, (k) => fogFar(k, p)); c.restore();
      veil(c, p, 0.12 + 0.82 * fr);
      c.save(); c.translate(roll, 0); fogBand(c, p, 700, 260, 0.55 * fr, tf, 21, -300, 1400); fogBand(c, p, 900, 220, 0.5 * fr, tf * 1.2, 23, -300, 1400); c.restore();
      // mid strip: cantigi + moss + tussocks
      L(0.8); c.save(); scroll(0.6); cached(c, p, "fog_mid", -400, 300, 3000, 1400, 0.6, (k) => fogMid(k, p)); c.restore();
      veil(c, p, 0.05 + 0.72 * clamp((fr - 0.1) / 0.75));
      c.save(); c.translate(roll * 0.8, 0); fogBand(c, p, 960, 180, 0.5 * fr, tf * 1.4, 25, -300, 1400); c.restore();
      // near ground (scroll 1.0)
      L(1); c.save(); scroll(1);
      cached(c, p, "fog_gnd", -400, 640, 3600, 1860, 1, (k) => fogGround(k, p));
      const x0 = X - 260, x1 = X + 1340; // visible ground-local range
      // footprints behind him in the trail dust (where his feet landed)
      if (lit(p)) { c.fillStyle = "rgba(40,28,16,0.35)"; const n0 = Math.floor(fPhase(FA - 6) / Math.PI);
        for (let n = n0; n < 99; n++) { const ph = n * Math.PI + Math.PI / 2; if (ph > fPhase(t) - Math.PI * 0.2) break; const xl = FG.NX + F_STEPK * (ph - fPhase(FA)) + 0.12 * FG.H; if (xl < x0) continue; c.beginPath(); c.ellipse(xl, gyAt(xl) + 10 + (n % 2) * 9, 15, 4.5, FG.SL, 0, TAU); c.fill(); } }
      // live grass near the trail (sway frozen in place by the no-wind beat)
      const sway = (s: number) => (0.1 * Math.sin(tf * 1.3 + s) + 0.22 * gust(tf + s * 0.05)) ;
      for (let i = 0; i < 90; i++) { const xl = -300 + i * 40 + 30 * hash(i * 5.3); if (xl < x0 || xl > x1) continue; const dy = 120 + 520 * hash(i * 2.9), sc = 0.8 + dy / 600;
        tussock(c, xl, gyAt(xl) + dy, (50 + 40 * hash(i)) * sc, 12, sway(i + 40) * 0.8, 2600 + i, pc(p, i % 2 ? "#9a8b58" : "#b5a46e", "#0f1729"), 2.4 * sc); }
      for (let i = 0; i < 70; i++) { const xl = -300 + i * 50 + 30 * hash(i * 3.7); if (xl < x0 || xl > x1) continue; tussock(c, xl, gyAt(xl) - 2, 110 + 90 * hash(i * 1.9), 11, sway(i), 2000 + i, pc(p, i % 2 ? "#ab9a62" : "#c6b47c", "#121b30"), 2.6); }
      // near cantigi trees: T1 (start, behind him) and T2 (ahead, where he stops) with moss beards + the frayed pita rafia
      for (const [tx, th, sd] of [[T1X, 760, 31], [T2X, 900, 37]] as [number, number, number][]) {
        if (tx < x0 - 500 || tx > x1 + 500) continue;
        const T = treeShape(tx, gyAt(tx) + 6, th, sd, 0.85, 3, 0.04), sw = 5 * Math.sin(tf * 0.9 + sd) + 6 * gust(tf);
        drawTree(c, T, pc(p, "#6c5a42", "#0b1122"), pc(p, "#6c6e48", "#0e182c"), 6, sw, sd, 20);
        if (lit(p)) { c.strokeStyle = "rgba(22,14,10,0.6)"; c.lineWidth = 1.2; for (const s of T.segs) if (s[4] > 14) { c.beginPath(); c.moveTo(s[0] + s[4] * 0.2, s[1]); c.lineTo(s[2] + s[4] * 0.2, s[3]); c.stroke(); } }
        for (let j = 0; j < T.tips.length; j += 2) mossBeard(c, p, T.tips[j][0], T.tips[j][1], 40 + 30 * hash(j + sd), sw * 0.8 + 3 * Math.sin(tf * 1.1 + j), sd * 10 + j);
        if (tx === T2X) { const bx = T.segs[5][2], by = T.segs[5][3]; c.strokeStyle = pc(p, "#d8c174", "#2a3a5a"); c.lineCap = "round";
          for (let s = 0; s < 4; s++) { c.lineWidth = s === 0 ? 5 : 2; c.beginPath(); c.moveTo(bx + s * 2, by + 4); for (let q = 1; q <= 9; q++) { const qq = q / 9; c.lineTo(bx + s * 3 - qq * (26 + 22 * gust(tf)) + 4 * Math.sin(tf * 6 - q + s), by + 4 + qq * (70 - s * 8)); } c.stroke(); } }
      }
      // his breath: puffs stay where they were breathed; after "no wind" they stop drifting and hang
      for (let n = 0; n < 6; n++) { const per = 1.9, te = (Math.floor((t - FA) / per) - n) * per + FA + 0.6; const ar = t - te; if (ar < 0) continue;
        const af = tf - tFr(te); if (af > 1.6) continue; const J0 = fogJ(te), lp = lampOf(J0), Xe = fX(te);
        const px = lp.x + 26 + Xe + 40 * af, py = lp.y + 44 + FG.SL * Xe - 10 * af; puff(c, p, px, py, 9 + 14 * Math.min(af, ar * 0.5 + 0.2), 0.5 * (1 - af / 1.6) * Math.min(1, ar * 5)); }
      c.restore();
      // fog bank rolling in at his level, behind him
      c.save(); c.translate(roll * 0.7, 0); fogBand(c, p, 1000, 200, 0.42 * fr, tf * 1.6, 27, -300, 1400); c.restore();
      // Naam (cast details animate with frozen time: hood strings + carabiner stop with the wind)
      L(1);
      const J = hiker(c, p, FG.NX, FG.GY, FG.H, p.fig, fogPose(t), { pack: true, pole: true, beanie: true, lamp: lampOnF(t), breathFog: 0, t: tf });
      // a moth that stops in the air
      { const a = tf * 2.1, mx = J.head[0] + 120 + 50 * Math.cos(a), my = J.head[1] - 40 + 34 * Math.sin(a * 1.4); moth(c, p, mx, my, 9, 0.5 + 0.5 * Math.sin(tf * 28), 0.4 * Math.sin(a)); }
      // the falling leaf → hangs mid-air
      { const tl = Math.max(0, tf - tFr(LEAF.t0)), rem = LEAF.span - tl, Xk = X * LEAF.K;
        if (t > LEAF.t0 - 0.01) { const xl = LEAF.xF + 26 * Math.sin(tf * 1.9) - rem * 22, yl = LEAF.yF - rem * LEAF.v, rot = 0.6 * Math.sin(tf * 2.3) + 0.3;
          L(1.25); leafShape(c, xl - Xk, yl - FG.SL * Xk, 15, rot, pc(p, "#7d7a4a", "#0e1628"), lit(p) ? "rgba(22,14,10,0.7)" : null); } }
      // front fog veil (keeps him readable), foreground grass blades scrolling past
      L(1); veilV(c, p, 1050, 1700, 0.05 * fr, 0.3 * fr);
      fg(c, p, L, () => { for (let i = 0; i < 26; i++) { const gx = (((i * 97 - X * 1.4) % 1500) + 1500) % 1500 - 210, sw = 0.12 * Math.sin(tf * 1.2 + i) + 0.2 * gust(tf); c.beginPath(); c.moveTo(gx, 2000); c.quadraticCurveTo(gx + 10, 1880, gx + 20 + sw * 120, 1760 - 70 * hash(i)); c.lineTo(gx + 12, 2000); c.fill(); } }, 6);
    },
    lights: (u, t) => {
      const f = clamp((fogAmt(t) - 0.15) / 0.85), ls: Light[] = [{ k: "spot", x: 760, y: 200, r: 1700, i: 0.42 - 0.24 * f, col: DAWN }];
      const on = lampOnF(t);
      if (on > 0.01) { const lp = lampOf(fogJ(t)); ls.push(withBeam(headlampCone(fogJ(t), 760, 200, 0.95 * on * flick(t)), 1)); ls.push({ k: "spot", x: lp.x + 6, y: lp.y, r: 70, i: 0.6 * on, col: HEADLAMP }); }
      return ls;
    },
    amb: (u, t) => 0.52 - 0.27 * clamp((fogAmt(t) - 0.15) / 0.85),
    cam: (u, t) => { const k = move(t, STILL - 0.3, FB - 0.15, 0, 1); return { z: lerp(1.08 + move(t, FA, STILL, 0, 0.06), 2.05, k), cx: lerp(540, 487, k), cy: lerp(950, 690, k), rot: 0 }; },
  };
}

export const SHOTS_A: Shot[] = [hookShot(), titleShot(), summitShot(), fogShot()];
