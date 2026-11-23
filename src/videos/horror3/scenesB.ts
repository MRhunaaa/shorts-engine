// Horror3 "Kabut Lalijiwo" shots B: lost, procession, fast, ravine (true story, documentary; calm, smooth, synced).
// Static terrain is painted ONCE per pass into cached offscreen canvases; only living details are drawn per frame.
// People come from cast.ts (hiker, courtier, offeringHand, farmer). All times from timeline.json (SHOT_RANGE / CUE).
import { C2, Pal } from "../horror1/paint";
import { Shot, Light, SHOT_RANGE, CUE, move, settle, breathPhase, breeze, flick, win, W, H, SIZE, DUSK, LANTERN, DAWN, HEADLAMP, MOON, WARM } from "./types";
import { rcut, lit, fogBand, gust, hash, clamp, lerp, ss, rough } from "./kit";
import { hiker, courtier, offeringHand, farmer, CourtKind, SidePose, Joints } from "./cast";
import { sideJoints, handAnchor } from "../horror2/rig";

const TAU = Math.PI * 2;
type P2 = [number, number];
const sq = (x: number) => x * x;
const bump = (t: number, c0: number, w: number) => Math.exp(-sq((t - c0) / w));
const K = (p: Pal, l: string, d: string) => (lit(p) ? l : d);
const ink = (p: Pal) => (lit(p) ? p.ink : "#04070d");
const wob = (t: number, s: number, f = 0.5) => 0.6 * Math.sin(t * f * 1.7 + s * 3.1) + 0.4 * Math.sin(t * f * 2.9 + s * 1.3);
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

// ================= static cache (per key + pass) =================
const CACHE = new Map<string, HTMLCanvasElement>();
function cached(c: C2, p: Pal, key: string, x: number, y: number, w: number, h: number, paint: (g: C2) => void, alpha = 1) {
  const k = key + ":" + p.mode; let cv = CACHE.get(k);
  if (!cv) { cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d")!; g.translate(-x, -y); g.lineCap = "round"; g.lineJoin = "round"; paint(g); CACHE.set(k, cv); }
  if (alpha <= 0.003) return;
  const a0 = c.globalAlpha; c.globalAlpha = a0 * alpha; c.drawImage(cv, x, y); c.globalAlpha = a0;
}
/** glow that only exists in the dark pass (the lit pass gets its glow from the light map) */
function glow(c: C2, p: Pal, x: number, y: number, r: number, rgb: string, a: number) {
  if (lit(p) || a <= 0.003) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${clamp(a)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
/** vertical fog gradient sheet (both passes) */
function fogSheet(c: C2, p: Pal, y0: number, y1: number, a: number, x0 = -200, x1 = W + 200) {
  const col = lit(p) ? "214,206,188" : "64,80,108";
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${clamp(a)})`); g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
}

// ================= nature + prop helpers =================
function fern(c: C2, x: number, y: number, len: number, ang: number, bend: number, col: string, seed = 0, lw = 0) {
  c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col; c.strokeStyle = col; c.lineCap = "round";
  const pt = (f: number): P2 => [bend * len * f * f, -len * f];
  c.lineWidth = lw || Math.max(1.2, len * 0.02);
  c.beginPath(); c.moveTo(0, 0); for (let i = 1; i <= 16; i++) { const q = pt(i / 16); c.lineTo(q[0], q[1]); } c.stroke();
  const n = 13;
  for (let i = 1; i < n; i++) {
    const f = i / n, q = pt(f), a = Math.atan2(-len, 2 * bend * len * f);
    const lf = len * 0.2 * (1 - f * 0.75) * (0.85 + 0.3 * hash(seed + i));
    for (const s of [-1, 1]) { c.save(); c.translate(q[0], q[1]); c.rotate(a + s * 1.15); c.beginPath(); c.ellipse(lf * 0.5, 0, lf * 0.5, Math.max(1, lf * 0.17), 0, 0, TAU); c.fill(); c.restore(); }
  }
  c.restore();
}
function tuft(c: C2, x: number, y: number, h: number, n: number, sway: number, col: string, seed = 0, lw = 2) {
  c.strokeStyle = col; c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const hh = h * (0.55 + 0.45 * hash(seed + i * 1.3)), sp = (hash(seed + i * 2.7) - 0.5) * 1.1, bx = x + (i - n / 2) * 1.8;
    c.lineWidth = lw * (0.7 + 0.5 * hash(seed + i)); c.beginPath(); c.moveTo(bx, y);
    c.quadraticCurveTo(bx + sp * hh * 0.3, y - hh * 0.6, bx + sp * hh * 0.7 + sway * hh, y - hh); c.stroke();
  }
}
function moss(c: C2, p: Pal, x: number, y: number, r: number, seed: number, squash = 0.5) {
  c.fillStyle = K(p, "#6f7a4c", "#0a1220"); c.beginPath(); c.ellipse(x, y, r, r * squash, 0, 0, TAU); c.fill();
  c.fillStyle = K(p, "#8e9a62", "#0e1828");
  for (let i = 0; i < 9; i++) { const a = hash(seed + i) * TAU, d = Math.sqrt(hash(seed + i * 3.3)) * r * 0.8; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * squash, r * (0.16 + 0.14 * hash(seed + i * 5.1)), 0, TAU); c.fill(); }
  if (lit(p)) { c.fillStyle = "rgba(244,240,205,0.65)"; for (let i = 0; i < 7; i++) { const a = hash(seed + i * 7) * TAU, d = hash(seed + i * 9) * r * 0.75; c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * squash, 1.8, 1.8); } }
  c.strokeStyle = ink(p); c.lineWidth = 1.4; c.globalAlpha = 0.45; c.beginPath(); c.ellipse(x, y, r, r * squash, 0, 0.2, Math.PI - 0.2); c.stroke(); c.globalAlpha = 1;
}
/** irregular moss patch growing on vertical bark (elongated, ragged, with tiny sporophyte dots) */
function barkMoss(c: C2, p: Pal, x: number, y: number, w: number, h: number, seed: number) {
  c.fillStyle = K(p, "rgba(104,116,70,0.8)", "rgba(9,16,28,0.9)");
  c.beginPath(); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, r = 0.7 + 0.6 * hash(seed + k * 1.7); const xx = x + Math.cos(a) * w * 0.5 * r, yy = y + Math.sin(a) * h * 0.5 * r; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.closePath(); c.fill();
  if (lit(p)) { c.fillStyle = "rgba(160,170,104,0.85)"; for (let k = 0; k < 9; k++) c.fillRect(x + (hash(seed + k * 2.3) - 0.5) * w * 0.8, y + (hash(seed + k * 3.1) - 0.5) * h * 0.8, 1.6, 2.6);
    c.strokeStyle = "rgba(60,70,40,0.6)"; c.lineWidth = 1; for (let k = 0; k < 4; k++) { const sx = x + (hash(seed + k * 5) - 0.5) * w * 0.7; c.beginPath(); c.moveTo(sx, y + h * 0.3); c.lineTo(sx + 2, y + h * 0.5 + 8 * hash(seed + k)); c.stroke(); } }
}
function lichen(c: C2, p: Pal, x: number, y: number, r: number, seed: number) {
  c.fillStyle = K(p, "rgba(226,226,196,0.75)", "rgba(40,54,78,0.6)");
  for (let i = 0; i < 6; i++) { const a = hash(seed + i) * TAU, d = hash(seed + i * 2.1) * r; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.18 + 0.2 * hash(seed + i * 4.3)), 0, TAU); c.fill(); }
}
function litter(c: C2, p: Pal, x0: number, y0: number, w: number, h: number, n: number, seed: number, s = 1, persp = 0) {
  const cols = lit(p) ? ["#8e7150", "#a48a5e", "#6f5a3c", "#b9a070", "#7a6a48"] : ["#0a0f1b", "#0c1220", "#080c16", "#0e1424", "#0b101c"];
  for (let i = 0; i < n; i++) {
    const fx = hash(seed + i * 1.17), fy = hash(seed + i * 2.31), x = x0 + fx * w, y = y0 + fy * h;
    const sc = s * (persp ? 0.45 + persp * fy : 1) * (0.7 + 0.6 * hash(seed + i * 3.7)), a = hash(seed + i * 4.9) * TAU;
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = cols[i % 5];
    c.beginPath(); c.moveTo(-9 * sc, 0); c.quadraticCurveTo(0, -5 * sc, 9 * sc, 0); c.quadraticCurveTo(0, 5 * sc, -9 * sc, 0); c.fill();
    if (lit(p) && i % 2 === 0) { c.strokeStyle = "rgba(22,14,10,0.45)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-8 * sc, 0); c.lineTo(8 * sc, 0); c.stroke(); }
    c.restore();
  }
}
function pebble(c: C2, p: Pal, x: number, y: number, r: number, seed: number) {
  c.fillStyle = K(p, "#a39a88", "#0e1422"); c.beginPath(); c.ellipse(x, y, r, r * 0.62, hash(seed) * 0.6 - 0.3, 0, TAU); c.fill();
  c.strokeStyle = ink(p); c.lineWidth = 1.3; c.stroke();
  if (lit(p)) { c.fillStyle = "rgba(255,250,235,0.5)"; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.22, r * 0.3, r * 0.14, -0.3, 0, TAU); c.fill(); }
}
function twig(c: C2, p: Pal, x: number, y: number, len: number, ang: number, seed: number, w = 3) {
  c.strokeStyle = K(p, "#5a4630", "#060a12"); c.lineCap = "round"; c.lineWidth = w;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + ex) / 2 + (hash(seed) - 0.5) * len * 0.2, (y + ey) / 2 + (hash(seed + 1) - 0.5) * len * 0.2, ex, ey); c.stroke();
  c.lineWidth = w * 0.6;
  for (let k = 0; k < 2; k++) { const f = 0.3 + 0.35 * k, bx = lerp(x, ex, f), by = lerp(y, ey, f), ba = ang + (k ? -0.7 : 0.6); c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(ba) * len * 0.25, by + Math.sin(ba) * len * 0.25); c.stroke(); }
}
function mushroom(c: C2, p: Pal, x: number, y: number, s: number, seed: number, tilt = 0) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  c.fillStyle = K(p, "#e9dcc0", "#141c2e"); c.fillRect(-s * 0.09, -s * 0.7, s * 0.18, s * 0.7);
  c.fillStyle = K(p, "#c9a878", "#121a2c"); c.beginPath(); c.ellipse(0, -s * 0.68, s * 0.45, s * 0.3, 0, Math.PI, 0); c.closePath(); c.fill();
  c.strokeStyle = ink(p); c.lineWidth = 1.4; c.stroke();
  if (lit(p)) {
    c.strokeStyle = "rgba(22,14,10,0.45)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-s * 0.4, -s * 0.66); c.lineTo(s * 0.4, -s * 0.66); c.stroke();
    c.fillStyle = "rgba(250,244,226,0.8)"; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc((hash(seed + k) - 0.5) * s * 0.5, -s * 0.8 - hash(seed + k * 2) * s * 0.08, s * 0.045, 0, TAU); c.fill(); }
  }
  c.restore();
}
function beetle(c: C2, p: Pal, x: number, y: number, ang: number, s: number, t: number, moving = 1) {
  c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = ink(p); c.strokeStyle = ink(p); c.lineWidth = Math.max(1, s * 0.09);
  for (let k = -1; k <= 1; k++) for (const sd of [-1, 1]) { const ph = moving * Math.sin(t * 7 + k * 2 + (sd > 0 ? Math.PI : 0)) * s * 0.12; c.beginPath(); c.moveTo(k * s * 0.3, 0); c.lineTo(k * s * 0.3 + ph + k * s * 0.1, sd * s * 0.55); c.stroke(); }
  c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.32, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(s * 0.55, 0, s * 0.16, 0, TAU); c.fill();
  c.lineWidth = Math.max(0.8, s * 0.05); c.beginPath(); c.moveTo(s * 0.65, -s * 0.05); c.lineTo(s * 0.95, -s * 0.28); c.moveTo(s * 0.65, s * 0.05); c.lineTo(s * 0.95, s * 0.28); c.stroke();
  if (lit(p)) { c.strokeStyle = "rgba(255,250,230,0.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-s * 0.45, 0); c.lineTo(s * 0.4, 0); c.stroke(); c.beginPath(); c.ellipse(-s * 0.05, -s * 0.13, s * 0.22, s * 0.06, 0, 0, TAU); c.stroke(); }
  c.restore();
}
function web(c: C2, p: Pal, cx: number, cy: number, r: number, t: number, seed: number, sway = 0, dew = true) {
  c.save(); c.translate(cx, cy); c.strokeStyle = K(p, "rgba(250,246,230,0.6)", "rgba(90,110,150,0.28)"); c.lineWidth = 0.9;
  const n = 9;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + hash(seed + i) * 0.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r + sway); c.stroke(); }
  c.beginPath(); for (let k = 0; k < 80; k++) { const f = k / 80, a = f * TAU * 6, rr = r * (0.12 + 0.85 * f); const xx = Math.cos(a) * rr, yy = Math.sin(a) * rr + sway * f; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
  c.fillStyle = ink(p); c.beginPath(); c.arc(0, 0, r * 0.06, 0, TAU); c.fill(); c.beginPath(); c.arc(0, r * 0.08, r * 0.045, 0, TAU); c.fill(); // spider
  c.strokeStyle = ink(p); c.lineWidth = 0.8; for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, r * 0.02); c.lineTo(s * r * 0.12, -r * 0.06 + k * r * 0.05); c.stroke(); }
  if (dew && lit(p)) for (let k = 0; k < 18; k++) {
    const a = hash(seed + k * 3.1) * TAU, rr = r * (0.2 + 0.75 * hash(seed + k * 1.7)), tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.4 + k * 2.3));
    c.fillStyle = `rgba(255,255,250,${0.85 * tw})`; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr + (sway * rr) / r, 1.3 + 1.3 * tw, 0, TAU); c.fill();
  }
  c.restore();
}
function beard(c: C2, x: number, y: number, len: number, n: number, sway: number, seed: number, col: string) {
  c.strokeStyle = col; c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const L = len * (0.5 + 0.5 * hash(seed + i)), bx = x + (i - n / 2) * 3.2; c.lineWidth = 1 + 1.3 * hash(seed + i * 2);
    c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx + sway * L * 0.3 + (hash(seed + i * 3) - 0.5) * 8, y + L * 0.5, bx + sway * L + (hash(seed + i * 5) - 0.5) * 10, y + L); c.stroke();
  }
}
/** one water drop cycle: hangs + swells, falls, small ring where it lands */
function drip(c: C2, p: Pal, x: number, y0: number, y1: number, t: number, period: number, seed: number, s = 1, ring = true) {
  const ph = (((t + hash(seed) * period) % period) + period) % period / period;
  c.fillStyle = K(p, "rgba(236,242,246,0.9)", "rgba(120,140,180,0.55)");
  if (ph < 0.78) { const g = ph / 0.78; c.beginPath(); c.ellipse(x, y0 + 2 * s * g, 1.5 * s * (0.5 + g * 0.6), 2.3 * s * (0.5 + g * 0.7), 0, 0, TAU); c.fill(); }
  else { const f = (ph - 0.78) / 0.22, yy = y0 + (y1 - y0) * f * f; c.beginPath(); c.ellipse(x, yy, 1.3 * s, 3.4 * s, 0, 0, TAU); c.fill(); }
  if (ring && ph < 0.3) { const r = 3 + ph * 40 * s; c.strokeStyle = K(p, `rgba(240,244,248,${0.6 * (1 - ph / 0.3)})`, `rgba(110,130,170,${0.35 * (1 - ph / 0.3)})`); c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y1, r, r * 0.3, 0, 0, TAU); c.stroke(); }
}
/** boot print seen from above. age 0 = fresh crisp lugs, 1 = old soft + water-filled */
function bootprint(c: C2, p: Pal, x: number, y: number, ang: number, s: number, squash: number, age: number, t: number, seed: number) {
  c.save(); c.translate(x, y); c.scale(1, squash); c.rotate(ang);
  const a0 = 0.8 - 0.45 * age;
  c.fillStyle = lit(p) ? `rgba(52,40,26,${a0})` : `rgba(1,2,6,${a0 * 0.8})`;
  c.beginPath(); c.moveTo(-s * 0.48, 0); c.bezierCurveTo(-s * 0.48, -s * 0.16, -s * 0.12, -s * 0.13, 0, -s * 0.12); c.bezierCurveTo(s * 0.2, -s * 0.2, s * 0.5, -s * 0.18, s * 0.52, 0);
  c.bezierCurveTo(s * 0.5, s * 0.18, s * 0.2, s * 0.19, 0, s * 0.1); c.bezierCurveTo(-s * 0.12, s * 0.12, -s * 0.48, s * 0.16, -s * 0.48, 0); c.fill();
  if (lit(p)) {
    if (age < 0.4) { // lugs
      c.fillStyle = "rgba(225,212,184,0.55)";
      for (let k = 0; k < 5; k++) { const lx = s * (0.42 - k * 0.1); c.fillRect(lx - s * 0.025, -s * 0.12, s * 0.05, s * 0.09); c.fillRect(lx - s * 0.025, s * 0.03, s * 0.05, s * 0.09); }
      for (let k = 0; k < 2; k++) { const lx = -s * (0.3 + k * 0.1); c.fillRect(lx - s * 0.025, -s * 0.1, s * 0.05, s * 0.2); }
      c.strokeStyle = "rgba(22,14,10,0.7)"; c.lineWidth = 1.2; c.stroke();
    } else { // standing water reflecting the fog
      c.fillStyle = `rgba(214,222,226,${0.25 + 0.35 * age})`;
      c.beginPath(); c.ellipse(s * 0.2, 0, s * 0.26, s * 0.1, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-s * 0.32, 0, s * 0.12, s * 0.08, 0, 0, TAU); c.fill();
      const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.3 + seed * 2.1));
      c.fillStyle = `rgba(255,255,252,${0.75 * tw})`; c.beginPath(); c.ellipse(s * 0.28, -s * 0.03, s * 0.07, s * 0.02, 0, 0, TAU); c.fill();
    }
  }
  c.restore();
}
/** hanging cage lantern (damar/lentera). (x,y) = hand; s = lantern height */
function lantern(c: C2, p: Pal, x: number, y: number, s: number, sw: number, on: number) {
  c.save(); c.translate(x, y); c.rotate(sw);
  c.strokeStyle = ink(p); c.lineWidth = Math.max(1, s * 0.04);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, s * 0.24); c.stroke();
  c.fillStyle = K(p, "#5a4630", "#060a12");
  c.beginPath(); c.moveTo(-s * 0.23, s * 0.38); c.lineTo(0, s * 0.2); c.lineTo(s * 0.23, s * 0.38); c.closePath(); c.fill();
  const gy = s * 0.38, gh = s * 0.45;
  c.fillStyle = lit(p) ? `rgba(255,232,170,${0.7 + 0.3 * on})` : `rgba(255,168,80,${0.6 * on})`; c.fillRect(-s * 0.17, gy, s * 0.34, gh);
  c.fillStyle = lit(p) ? "#fff8e0" : `rgba(255,226,160,${on})`; c.beginPath(); c.ellipse(0, gy + gh * 0.55, s * 0.05, s * 0.11, 0, 0, TAU); c.fill();
  c.strokeStyle = ink(p); c.lineWidth = Math.max(1, s * 0.035); for (const bx of [-0.17, 0, 0.17]) { c.beginPath(); c.moveTo(bx * s, gy); c.lineTo(bx * s, gy + gh); c.stroke(); }
  c.fillStyle = K(p, "#5a4630", "#060a12"); c.fillRect(-s * 0.23, gy + gh, s * 0.46, s * 0.08);
  c.restore();
  glow(c, p, x + Math.sin(sw) * -s * 0.6, y + s * 0.6, s * 1.6, "255,170,90", 0.35 * on);
}
/** payung agung: 3-tier ceremonial umbrella. (x,y) = canopy top centre */
function payung(c: C2, p: Pal, x: number, y: number, r: number, tilt: number, t: number) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  const gold = K(p, "#c9a35a", "#0d1424"), deep = K(p, "#7a4a26", "#080d18");
  c.fillStyle = gold; c.beginPath(); c.moveTo(0, -r * 0.5); c.lineTo(r * 0.06, -r * 0.22); c.lineTo(-r * 0.06, -r * 0.22); c.closePath(); c.fill(); c.beginPath(); c.arc(0, -r * 0.2, r * 0.07, 0, TAU); c.fill();
  for (let k = 0; k < 3; k++) {
    const rr = r * (0.5 + 0.25 * k), yy = -r * 0.16 + k * r * 0.17;
    c.fillStyle = k % 2 ? gold : deep; c.beginPath(); c.moveTo(-rr, yy + r * 0.12); c.quadraticCurveTo(0, yy - r * 0.2, rr, yy + r * 0.12); c.closePath(); c.fill();
    c.fillStyle = gold; const nf = 9 + k * 3; for (let i = 0; i < nf; i++) { const fx = -rr + (i + 0.5) * ((2 * rr) / nf); c.beginPath(); c.arc(fx, yy + r * 0.12, (rr / nf) * 0.95, 0, Math.PI); c.fill(); }
    if (lit(p)) { c.strokeStyle = p.ink; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-rr, yy + r * 0.12); c.quadraticCurveTo(0, yy - r * 0.2, rr, yy + r * 0.12); c.stroke(); }
  }
  c.strokeStyle = gold; c.lineWidth = 1.5; for (let i = 0; i < 7; i++) { const fx = -r * 0.92 + i * r * 0.31, s2 = Math.sin(t * 1.1 + i) * 2; c.beginPath(); c.moveTo(fx, r * 0.5); c.lineTo(fx + s2, r * 0.66); c.stroke(); }
  c.restore();
}
/** round woven tray (tampah) with a small tumpeng + flowers, seen from the side. (x,y) = tray centre */
function tampah(c: C2, p: Pal, x: number, y: number, w: number) {
  c.fillStyle = K(p, "#b7976b", "#0c1222"); c.beginPath(); c.ellipse(x, y, w / 2, w * 0.08, 0, 0, TAU); c.fill(); c.strokeStyle = ink(p); c.lineWidth = 1.5; c.stroke();
  c.fillStyle = K(p, "#efe6cf", "#141c2e"); c.beginPath(); c.moveTo(x - w * 0.18, y - w * 0.02); c.lineTo(x, y - w * 0.36); c.lineTo(x + w * 0.18, y - w * 0.02); c.closePath(); c.fill(); c.stroke();
  for (let k = 0; k < 6; k++) { c.fillStyle = K(p, k % 2 ? "#c8463a" : "#f0e6c8", "#121a2a"); c.beginPath(); c.arc(x - w * 0.36 + k * w * 0.05 + (k > 2 ? w * 0.42 : 0), y - w * 0.04, w * 0.03, 0, TAU); c.fill(); }
}
function basket(c: C2, p: Pal, x: number, y: number, w: number, h: number, seed: number) {
  c.fillStyle = K(p, "#a48a5e", "#0b1120"); c.beginPath(); c.moveTo(x - w / 2, y - h); c.lineTo(x + w / 2, y - h); c.lineTo(x + w * 0.4, y); c.lineTo(x - w * 0.4, y); c.closePath(); c.fill();
  c.strokeStyle = ink(p); c.lineWidth = 1.2; c.stroke();
  if (lit(p)) { c.strokeStyle = "rgba(22,14,10,0.5)"; c.lineWidth = 0.8; for (let k = 1; k < 4; k++) { const yy = y - (h * k) / 4; c.beginPath(); c.moveTo(x - w * (0.4 + 0.1 * (k / 4)), yy); c.lineTo(x + w * (0.4 + 0.1 * (k / 4)), yy); c.stroke(); } for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * w * 0.12, y - h); c.lineTo(x + k * w * 0.1, y); c.stroke(); } }
  void seed;
}
function kendi(c: C2, p: Pal, x: number, y: number, s: number) {
  c.fillStyle = K(p, "#8a4a2a", "#0c1020"); c.beginPath(); c.ellipse(x, y - s * 0.42, s * 0.4, s * 0.4, 0, 0, TAU); c.fill();
  c.fillRect(x - s * 0.09, y - s * 1.0, s * 0.18, s * 0.3); c.beginPath(); c.moveTo(x + s * 0.28, y - s * 0.56); c.lineTo(x + s * 0.6, y - s * 0.74); c.lineTo(x + s * 0.58, y - s * 0.66); c.lineTo(x + s * 0.3, y - s * 0.44); c.fill();
  c.strokeStyle = ink(p); c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y - s * 0.42, s * 0.4, s * 0.4, 0, 0, TAU); c.stroke();
  if (lit(p)) { c.strokeStyle = "rgba(255,240,220,0.4)"; c.lineWidth = 2; c.beginPath(); c.arc(x - s * 0.12, y - s * 0.52, s * 0.2, 3.6, 4.6); c.stroke(); }
}
function clothBolt(c: C2, p: Pal, x: number, y: number, w: number, h: number, seed: number) {
  c.fillStyle = K(p, ["#7a4a26", "#3a3a5a", "#9a7a3a"][seed % 3], "#0d1424"); c.fillRect(x, y - h, w, h);
  c.strokeStyle = ink(p); c.lineWidth = 1; c.strokeRect(x, y - h, w, h);
  if (lit(p)) { c.strokeStyle = "rgba(240,230,200,0.6)"; c.lineWidth = 1; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x, y - (h * k) / 5); c.lineTo(x + w, y - (h * k) / 5); c.stroke(); } for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + w * (0.25 + 0.25 * k), y - h * 0.5, w * 0.07, 0, TAU); c.stroke(); } }
}
function fruitPile(c: C2, p: Pal, x: number, y: number, r: number, n: number, seed: number) {
  let k = 0;
  for (let row = 0; row < 4 && k < n; row++) for (let i = 0; i < 4 - row && k < n; i++, k++) {
    const fx = x + (i - (3 - row) / 2) * r * 1.9, fy = y - r - row * r * 1.6;
    c.fillStyle = K(p, ["#c8a040", "#a86a30", "#8a9a40"][(seed + k) % 3], "#0e1626"); c.beginPath(); c.arc(fx, fy, r, 0, TAU); c.fill();
    c.strokeStyle = ink(p); c.lineWidth = 0.9; c.stroke();
    if (lit(p)) { c.fillStyle = "rgba(255,250,230,0.55)"; c.beginPath(); c.arc(fx - r * 0.35, fy - r * 0.35, r * 0.25, 0, TAU); c.fill(); }
  }
}
/** dacin: hanging steelyard scale with a pan and a counterweight */
function dacin(c: C2, p: Pal, x: number, y: number, s: number, sw: number) {
  c.save(); c.translate(x, y); c.rotate(sw); c.strokeStyle = ink(p); c.lineWidth = Math.max(1, s * 0.03);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, s * 0.2); c.moveTo(-s * 0.5, s * 0.22); c.lineTo(s * 0.6, s * 0.18); c.stroke();
  c.beginPath(); c.moveTo(-s * 0.45, s * 0.22); c.lineTo(-s * 0.6, s * 0.65); c.moveTo(-s * 0.45, s * 0.22); c.lineTo(-s * 0.3, s * 0.65); c.stroke();
  c.fillStyle = K(p, "#7a6a48", "#0a0f1b"); c.beginPath(); c.ellipse(-s * 0.45, s * 0.66, s * 0.2, s * 0.05, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = ink(p); c.beginPath(); c.moveTo(s * 0.42, s * 0.19); c.lineTo(s * 0.42, s * 0.3); c.stroke(); c.beginPath(); c.arc(s * 0.42, s * 0.34, s * 0.05, 0, TAU); c.fill();
  c.restore();
}
/** bamboo market stall with a thatched roof; goods on the plank. (x,y) = left foot of the stall on the ground */
function stall(g: C2, p: Pal, x: number, y: number, w: number, h: number, seed: number) {
  const bam = K(p, "#a48a5e", "#0b1120");
  g.strokeStyle = bam; g.lineCap = "round";
  for (const px of [x + 6, x + w - 6]) { g.lineWidth = 6; g.beginPath(); g.moveTo(px, y); g.lineTo(px, y - h * 0.82); g.stroke(); if (lit(p)) { g.strokeStyle = "rgba(22,14,10,0.6)"; g.lineWidth = 1; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(px - 3, y - (h * 0.8 * k) / 5); g.lineTo(px + 3, y - (h * 0.8 * k) / 5); g.stroke(); } g.strokeStyle = bam; } }
  // roof (atap ilalang) with a ragged hem
  const ry = y - h * 0.82;
  const pts: P2[] = [[x - w * 0.12, ry + h * 0.06], [x + w * 0.5, ry - h * 0.2], [x + w * 1.12, ry + h * 0.06]];
  for (let k = 0; k <= 12; k++) pts.push([x + w * 1.12 - (k / 12) * w * 1.24, ry + h * 0.06 + 4 + 6 * hash(seed + k)]);
  rcut(g, p, pts, 2, seed, K(p, "#8e7a54", "#0a0f1b"), { edge: 2, hatch: 0.6, dir: 1.4, seed, bbox: [x - w * 0.12, ry - h * 0.2, w * 1.24, h * 0.3] });
  // plank table
  g.fillStyle = K(p, "#8e7150", "#0a0f1b"); g.fillRect(x - 4, y - h * 0.36, w + 8, 7); g.strokeStyle = ink(p); g.lineWidth = 1.2; g.strokeRect(x - 4, y - h * 0.36, w + 8, 7);
  g.strokeStyle = bam; g.lineWidth = 3; for (const lx of [x + 10, x + w - 10]) { g.beginPath(); g.moveTo(lx, y); g.lineTo(lx, y - h * 0.36); g.stroke(); }
  // goods
  const ty = y - h * 0.36, s = h * 0.13;
  const kind = seed % 3;
  if (kind === 0) { kendi(g, p, x + w * 0.2, ty, s * 1.1); kendi(g, p, x + w * 0.42, ty, s * 0.9); kendi(g, p, x + w * 0.62, ty, s); basket(g, p, x + w * 0.84, ty, s * 1.2, s * 0.8, seed); }
  else if (kind === 1) { for (let k = 0; k < 4; k++) clothBolt(g, p, x + w * 0.08 + k * w * 0.22, ty, w * 0.18, s * (1.1 + 0.25 * (k % 2)), seed + k); }
  else { fruitPile(g, p, x + w * 0.26, ty, s * 0.17, 9, seed); fruitPile(g, p, x + w * 0.62, ty, s * 0.15, 10, seed + 1); basket(g, p, x + w * 0.88, ty, s, s * 0.7, seed); }
  // baskets + sacks under the table
  basket(g, p, x + w * 0.3, y, s * 1.3, s * 0.9, seed + 3); g.fillStyle = K(p, "#c9b48a", "#0c1222"); g.beginPath(); g.ellipse(x + w * 0.7, y - s * 0.45, s * 0.5, s * 0.5, 0, 0, TAU); g.fill(); g.strokeStyle = ink(p); g.lineWidth = 1; g.stroke();
}
/** joglo pendopo seen from the front-side. (cx, fy) = floor centre; w = floor width */
function pendopo(g: C2, p: Pal, cx: number, fy: number, w: number) {
  const ph = w * 0.62; // pillar height
  const wood = K(p, "#7a5a38", "#0a0f1b"), stone = K(p, "#a39a88", "#0e1422");
  // stepped stone base
  rcut(g, p, [[cx - w * 0.56, fy], [cx + w * 0.56, fy], [cx + w * 0.6, fy + w * 0.05], [cx - w * 0.6, fy + w * 0.05]], 2, 401, stone, { edge: 2, hatch: 0.4, dir: 1.57, seed: 401, bbox: [cx - w * 0.6, fy, w * 1.2, w * 0.05] });
  rcut(g, p, [[cx - w * 0.6, fy + w * 0.05], [cx + w * 0.6, fy + w * 0.05], [cx + w * 0.64, fy + w * 0.09], [cx - w * 0.64, fy + w * 0.09]], 2, 402, stone, { edge: 2, hatch: 0.5, dir: 1.57, seed: 402, bbox: [cx - w * 0.64, fy + w * 0.05, w * 1.28, w * 0.04] });
  // steps
  for (let k = 0; k < 3; k++) { g.fillStyle = stone; g.fillRect(cx - w * 0.08 - k * 4, fy + w * 0.09 + k * 5, w * 0.16 + k * 8, 5); g.strokeStyle = ink(p); g.lineWidth = 1; g.strokeRect(cx - w * 0.08 - k * 4, fy + w * 0.09 + k * 5, w * 0.16 + k * 8, 5); }
  // pillars (outer + saka guru) with umpak stones and carved bands
  const cols = [-0.52, -0.3, -0.12, 0.12, 0.3, 0.52];
  cols.forEach((f, i) => {
    const px = cx + f * w, inner = Math.abs(f) < 0.2, top = fy - ph * (inner ? 1.08 : 1), pw = inner ? 9 : 7;
    g.fillStyle = stone; g.beginPath(); g.moveTo(px - pw * 1.3, fy); g.lineTo(px + pw * 1.3, fy); g.lineTo(px + pw * 0.8, fy - 8); g.lineTo(px - pw * 0.8, fy - 8); g.closePath(); g.fill();
    g.fillStyle = wood; g.fillRect(px - pw / 2, top, pw, fy - 8 - top); g.strokeStyle = ink(p); g.lineWidth = 1.2; g.strokeRect(px - pw / 2, top, pw, fy - 8 - top);
    if (lit(p)) { g.fillStyle = "#c9a35a"; for (const bf of [0.15, 0.75]) { g.fillRect(px - pw / 2 - 1, top + (fy - top) * bf, pw + 2, 4); } g.strokeStyle = "rgba(22,14,10,0.6)"; g.lineWidth = 0.8; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(px - pw / 2, top + (fy - top) * (0.2 + k * 0.03)); g.lineTo(px + pw / 2, top + (fy - top) * (0.22 + k * 0.03)); g.stroke(); } }
    void i;
  });
  // roof: lower wide penanggap, middle, tall brunjung, mustaka on top
  const ey = fy - ph; // eave
  rcut(g, p, [[cx - w * 0.72, ey + 6], [cx - w * 0.34, ey - w * 0.16], [cx + w * 0.34, ey - w * 0.16], [cx + w * 0.72, ey + 6]], 2, 403, K(p, "#6e5a40", "#070b14"), { edge: 2.5, hatch: 0.7, dir: 1.2, seed: 403, bbox: [cx - w * 0.72, ey - w * 0.16, w * 1.44, w * 0.18] });
  rcut(g, p, [[cx - w * 0.36, ey - w * 0.15], [cx - w * 0.2, ey - w * 0.3], [cx + w * 0.2, ey - w * 0.3], [cx + w * 0.36, ey - w * 0.15]], 2, 404, K(p, "#5a4630", "#060a12"), { edge: 2.5, hatch: 0.6, dir: 1.0, seed: 404, bbox: [cx - w * 0.36, ey - w * 0.3, w * 0.72, w * 0.16] });
  rcut(g, p, [[cx - w * 0.21, ey - w * 0.29], [cx - w * 0.05, ey - w * 0.62], [cx + w * 0.05, ey - w * 0.62], [cx + w * 0.21, ey - w * 0.29]], 2, 405, K(p, "#6e5a40", "#070b14"), { edge: 2.5, hatch: 0.65, dir: 0.9, seed: 405, bbox: [cx - w * 0.21, ey - w * 0.62, w * 0.42, w * 0.34] });
  g.fillStyle = K(p, "#c9a35a", "#0d1424"); g.beginPath(); g.moveTo(cx - 8, ey - w * 0.62); g.lineTo(cx, ey - w * 0.69); g.lineTo(cx + 8, ey - w * 0.62); g.closePath(); g.fill();
  if (lit(p)) { g.strokeStyle = "rgba(22,14,10,0.55)"; g.lineWidth = 1; for (let k = 1; k < 9; k++) { g.beginPath(); g.moveTo(cx - w * 0.72 + k * w * 0.16, ey + 6); g.lineTo(cx - w * 0.34 + k * w * 0.085, ey - w * 0.155); g.stroke(); } }
  // tumpang sari beams under the eave
  g.fillStyle = wood; g.fillRect(cx - w * 0.56, ey - 4, w * 1.12, 8); g.strokeStyle = ink(p); g.lineWidth = 1; g.strokeRect(cx - w * 0.56, ey - 4, w * 1.12, 8);
  // dais (for the raja)
  g.fillStyle = K(p, "#8e7150", "#0a0f1b"); g.fillRect(cx + w * 0.22, fy - 12, w * 0.3, 12); g.strokeRect(cx + w * 0.22, fy - 12, w * 0.3, 12);
}
function gong(c: C2, p: Pal, x: number, y: number, s: number, sw: number) {
  c.strokeStyle = K(p, "#5a4630", "#060a12"); c.lineWidth = Math.max(2, s * 0.06);
  c.beginPath(); c.moveTo(x - s * 0.7, y); c.lineTo(x - s * 0.7, y - s * 1.6); c.lineTo(x + s * 0.7, y - s * 1.6); c.lineTo(x + s * 0.7, y); c.stroke();
  c.save(); c.translate(x, y - s * 1.55); c.rotate(sw); c.strokeStyle = ink(p); c.lineWidth = 1; c.beginPath(); c.moveTo(-s * 0.2, 0); c.lineTo(-s * 0.2, s * 0.25); c.moveTo(s * 0.2, 0); c.lineTo(s * 0.2, s * 0.25); c.stroke();
  c.fillStyle = K(p, "#a88a3a", "#0d1424"); c.beginPath(); c.arc(0, s * 0.75, s * 0.5, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = K(p, "#c9a35a", "#121a2c"); c.beginPath(); c.arc(0, s * 0.75, s * 0.16, 0, TAU); c.fill(); c.restore();
}
function kendang(c: C2, p: Pal, x: number, y: number, s: number) {
  c.fillStyle = K(p, "#8a5a32", "#0b1120"); c.beginPath(); c.moveTo(x - s * 0.6, y - s * 0.32); c.quadraticCurveTo(x, y - s * 0.5, x + s * 0.6, y - s * 0.28); c.lineTo(x + s * 0.6, y); c.quadraticCurveTo(x, y + s * 0.14, x - s * 0.6, y); c.closePath(); c.fill();
  c.strokeStyle = ink(p); c.lineWidth = 1; c.stroke();
  if (lit(p)) { c.strokeStyle = "rgba(22,14,10,0.6)"; for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(x - s * 0.55 + k * s * 0.18, y - s * 0.36); c.lineTo(x - s * 0.5 + k * s * 0.18, y + 0.02 * s); c.stroke(); } }
}
/** cemara gunung / casuarina silhouette */
function cemara(g: C2, x: number, y: number, h: number, col: string, seed: number) {
  g.fillStyle = col; g.fillRect(x - h * 0.012, y - h, h * 0.024, h);
  for (let k = 0; k < 12; k++) { const f = k / 12, yy = y - h * (0.25 + 0.75 * f), wd = h * 0.16 * (1 - f * 0.7) * (0.7 + 0.5 * hash(seed + k)); g.beginPath(); g.ellipse(x + (hash(seed + k * 3) - 0.5) * wd * 0.5, yy, wd, h * 0.035, (hash(seed + k * 5) - 0.5) * 0.3, 0, TAU); g.fill(); }
}
/** the hiker's backpack resting on the ground (carrier with frame, rolled mat, straps, buckles, carabiner, zip pulls). (x,y) = bottom centre */
function packOnGround(c: C2, p: Pal, x: number, y: number, h: number, lean: number, t: number) {
  { const sg = c.createRadialGradient(x, y + 2, 0, x, y + 2, h * 0.42); sg.addColorStop(0, K(p, "rgba(30,22,14,0.55)", "rgba(0,0,0,0.6)")); sg.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = sg; c.save(); c.translate(x, y + 2); c.scale(1, 0.18); c.translate(-x, -(y + 2)); c.fillRect(x - h * 0.42, y + 2 - h * 0.42, h * 0.84, h * 0.84); c.restore(); } // contact shadow
  c.save(); c.translate(x, y); c.rotate(lean);
  const w = h * 0.5, body = K(p, "#3e4c40", "#0a0f1b"), dark = K(p, "#2a342c", "#060a12");
  // soft slumped body: rounded shoulders, bulging bottom
  c.fillStyle = body; c.beginPath(); c.moveTo(-w * 0.52, -h * 0.04); c.bezierCurveTo(-w * 0.62, -h * 0.4, -w * 0.5, -h * 0.82, -w * 0.2, -h * 0.88); c.quadraticCurveTo(0, -h * 0.92, w * 0.22, -h * 0.87);
  c.bezierCurveTo(w * 0.52, -h * 0.8, w * 0.6, -h * 0.4, w * 0.5, -h * 0.03); c.quadraticCurveTo(0, h * 0.03, -w * 0.52, -h * 0.04); c.closePath(); c.fill(); c.strokeStyle = ink(p); c.lineWidth = 2.5; c.stroke();
  if (lit(p)) { c.save(); c.clip(); c.strokeStyle = "rgba(22,14,10,0.45)"; c.lineWidth = 1.2; for (let k = 0; k < 14; k++) { c.beginPath(); c.moveTo(w * 0.1 + k * 6, -h); c.lineTo(w * 0.1 + k * 6 + 30, 0); c.stroke(); } c.restore(); }
  // lid flap + front pocket with a curved zip
  c.fillStyle = dark; c.beginPath(); c.moveTo(-w * 0.42, -h * 0.8); c.quadraticCurveTo(0, -h * 0.98, w * 0.42, -h * 0.8); c.quadraticCurveTo(w * 0.3, -h * 0.66, 0, -h * 0.64); c.quadraticCurveTo(-w * 0.3, -h * 0.66, -w * 0.42, -h * 0.8); c.fill(); c.strokeStyle = ink(p); c.lineWidth = 2; c.stroke();
  c.fillStyle = dark; c.beginPath(); c.moveTo(-w * 0.36, -h * 0.5); c.quadraticCurveTo(0, -h * 0.56, w * 0.36, -h * 0.5); c.lineTo(w * 0.34, -h * 0.16); c.quadraticCurveTo(0, -h * 0.1, -w * 0.34, -h * 0.16); c.closePath(); c.fill(); c.stroke();
  // rolled sleeping mat strapped across the top
  c.fillStyle = K(p, "#b8a070", "#0e1626"); c.fillRect(-w * 0.46, -h * 1.0, w * 0.92, h * 0.12); c.strokeRect(-w * 0.46, -h * 1.0, w * 0.92, h * 0.12);
  for (const ex of [-w * 0.46, w * 0.46]) { c.beginPath(); c.ellipse(ex, -h * 0.94, h * 0.025, h * 0.06, 0, 0, TAU); c.fillStyle = K(p, "#a08858", "#0c1424"); c.fill(); c.stroke(); }
  if (lit(p)) { c.strokeStyle = "rgba(22,14,10,0.45)"; c.lineWidth = 1; for (let k = -5; k <= 5; k++) { c.beginPath(); c.moveTo(k * w * 0.11, -h * 1.04); c.lineTo(k * w * 0.11, -h * 0.91); c.stroke(); } }
  // straps + buckles
  c.strokeStyle = ink(p); c.lineWidth = 3; for (const sx of [-w * 0.25, w * 0.25]) { c.beginPath(); c.moveTo(sx, -h * 1.0); c.lineTo(sx, -h * 0.6); c.stroke(); c.fillStyle = K(p, "#20262e", "#04070d"); c.fillRect(sx - 6, -h * 0.64, 12, 8); }
  // stitching (lit)
  if (lit(p)) { c.setLineDash([4, 4]); c.strokeStyle = "rgba(240,230,200,0.6)"; c.lineWidth = 1; c.strokeRect(-w * 0.36, -h * 0.52, w * 0.72, h * 0.24); c.setLineDash([]); }
  // zipper pulls swinging a hair
  c.strokeStyle = K(p, "#c9a35a", "#121a2c"); c.lineWidth = 2; for (const zx of [-w * 0.15, w * 0.12]) { const s2 = 0.05 * Math.sin(t * 1.3 + zx); c.beginPath(); c.moveTo(zx, -h * 0.55); c.lineTo(zx + Math.sin(s2) * 14, -h * 0.55 + 14); c.stroke(); }
  // carabiner dangling at the side
  c.strokeStyle = K(p, "#b9b4a8", "#1a2234"); c.lineWidth = 2.5; c.beginPath(); c.ellipse(w * 0.5 + 4, -h * 0.4 + 10, 7, 12, 0.1 * Math.sin(t * 0.9), 0, TAU); c.stroke();
  c.restore();
}
function bottle(c: C2, p: Pal, x: number, y: number, s: number, ang: number) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = K(p, "rgba(220,230,236,0.55)", "rgba(40,56,84,0.6)"); c.beginPath(); c.moveTo(-s * 0.5, -s * 0.13); c.lineTo(s * 0.3, -s * 0.13); c.lineTo(s * 0.42, -s * 0.06); c.lineTo(s * 0.5, -s * 0.06); c.lineTo(s * 0.5, s * 0.06); c.lineTo(s * 0.42, s * 0.06); c.lineTo(s * 0.3, s * 0.13); c.lineTo(-s * 0.5, s * 0.13); c.closePath(); c.fill();
  c.strokeStyle = ink(p); c.lineWidth = 1.6; c.stroke();
  c.fillStyle = K(p, "#2a3a6a", "#060a12"); c.fillRect(s * 0.48, -s * 0.07, s * 0.1, s * 0.14);
  if (lit(p)) { c.strokeStyle = "rgba(255,255,250,0.7)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-s * 0.4, -s * 0.08); c.lineTo(s * 0.25, -s * 0.08); c.stroke(); c.strokeStyle = "rgba(22,14,10,0.4)"; c.lineWidth = 0.8; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-s * 0.3 + k * s * 0.15, -s * 0.13); c.lineTo(-s * 0.32 + k * s * 0.15, s * 0.13); c.stroke(); } }
  c.restore();
}
function trekPole(c: C2, p: Pal, x0: number, y0: number, x1: number, y1: number, broken = false) {
  c.strokeStyle = K(p, "#8a8f96", "#0e1422"); c.lineCap = "round"; c.lineWidth = 5;
  if (!broken) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  else { const mx = lerp(x0, x1, 0.55), my = lerp(y0, y1, 0.55); c.beginPath(); c.moveTo(x0, y0); c.lineTo(mx, my); c.moveTo(mx + 8, my - 10); c.lineTo(x1, y1 - 18); c.stroke(); }
  c.fillStyle = K(p, "#20262e", "#04070d"); c.save(); c.translate(x0, y0); c.rotate(Math.atan2(y1 - y0, x1 - x0)); c.fillRect(-4, -6, 40, 12); c.restore(); // grip
  c.strokeStyle = K(p, "#20262e", "#04070d"); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0 + 10, y0); c.quadraticCurveTo(x0 + 5, y0 + 26, x0 - 8, y0 + 18); c.stroke(); // wrist strap
}
/** tapered root/branch along a polyline */
function rootLine(c: C2, pts: P2[], w0: number, w1: number, col: string) {
  c.strokeStyle = col; c.lineCap = "round";
  for (let i = 0; i < pts.length - 1; i++) { c.lineWidth = lerp(w0, w1, i / (pts.length - 1)); c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke(); }
}
function moth(c: C2, p: Pal, x: number, y: number, s: number, flap: number) {
  c.fillStyle = K(p, "#5a4a38", "#0a0f1b");
  c.beginPath(); c.ellipse(x - s * 0.45, y, s * 0.5 * flap, s * 0.32, -0.4, 0, TAU); c.ellipse(x + s * 0.45, y, s * 0.5 * flap, s * 0.32, 0.4, 0, TAU); c.fill();
  c.fillStyle = ink(p); c.beginPath(); c.ellipse(x, y, s * 0.1, s * 0.35, 0, 0, TAU); c.fill();
}
function snail(c: C2, p: Pal, x: number, y: number, s: number, ang: number) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = K(p, "#9a9070", "#0e1422"); c.beginPath(); c.ellipse(0, s * 0.25, s * 0.9, s * 0.18, 0, 0, TAU); c.fill();
  c.fillStyle = K(p, "#8a6a42", "#0c1220"); c.beginPath(); c.arc(-s * 0.1, -s * 0.05, s * 0.45, 0, TAU); c.fill(); c.strokeStyle = ink(p); c.lineWidth = 1.2; c.stroke();
  c.beginPath(); for (let k = 0; k < 30; k++) { const a = k * 0.5, r = s * 0.4 * (1 - k / 32); const xx = -s * 0.1 + Math.cos(a) * r, yy = -s * 0.05 + Math.sin(a) * r; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
  c.beginPath(); c.moveTo(s * 0.75, s * 0.15); c.lineTo(s * 1.0, -s * 0.25); c.moveTo(s * 0.7, s * 0.15); c.lineTo(s * 0.85, -s * 0.2); c.stroke();
  c.restore();
}
/** red cut-paper letter (dark pass only; the lit pass draws nothing so the colour is exact) */
function paperLetter(c: C2, p: Pal, ch: string, x: number, y: number, size: number, rot: number, a: number) {
  if (a <= 0.01 || ch === " ") return;
  c.save(); c.translate(x, y); c.rotate(rot); c.font = `${size}px Impact, 'Arial Black', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  if (lit(p)) { c.restore(); return; }
  c.globalAlpha = a * 0.7; c.fillStyle = "#000"; c.fillText(ch, 4, 5);           // paper shadow
  c.globalAlpha = a; c.fillStyle = "#b8121a"; c.fillText(ch, 0, 0);
  c.strokeStyle = "rgba(255,120,100,0.45)"; c.lineWidth = 1.5; c.strokeText(ch, -1, -1); // cut edge catching the light
  c.globalAlpha = 1; c.restore();
}

// ======================================================================
// 1. LOST: high angle on the mossy floor. Three loops of bootprints around one trunk with faded pita rafia. No wind at all.
// ======================================================================
const [loA, loB] = SHOT_RANGE("lost");
const LO = { cx: 600, cy: 800 };
const LOOPS = [{ rx: 300, ry: 128, age: 1 }, { rx: 340, ry: 146, age: 0.65 }, { rx: 382, ry: 166, age: 0 }];
const loNaamH = 380, loP = 1.36;
const loX = (t: number) => lerp(395, 790, clamp((t - loA) / (loB - loA)));
const loY = (x: number) => LO.cy + LOOPS[2].ry * Math.sqrt(Math.max(0, 1 - sq((x - LO.cx) / LOOPS[2].rx)));
const loPose = (t: number): SidePose => ({ dir: 1, walk: ((t - loA) * TAU) / loP + 0.4, stride: 0.88, lean: 0.07, head: 0.12, idle: { t, seed: 3, amount: 0.35 } });
/** roots radiating from the trunk (akar mimang) */
const LO_ROOTS: P2[][] = [0.35, 1.2, 2.2, 2.9, 3.7, 5.2].map((a0, r) => {
  const pts: P2[] = [];
  for (let k = 0; k <= 14; k++) { const f = k / 14, rad = 70 + f * (360 + 90 * hash(r * 3.1)), a = a0 + 0.35 * Math.sin(f * 3 + r) * f; pts.push([LO.cx + Math.cos(a) * rad * 1.15, LO.cy + Math.sin(a) * rad * 0.45 + 6 * Math.sin(f * 11 + r)]); }
  return pts;
});
const loPrintsOn = (loop: number, t: number) => {
  // returns the list of prints [x,y,ang,foot] on loop; loop 2 (newest) only behind Naam's current spot
  const L = LOOPS[loop], step = 0.3 * loNaamH, per = TAU * Math.sqrt((sq(L.rx) + sq(L.ry)) / 2), n = Math.round(per / step), out: [number, number, number, number][] = [];
  const thNow = Math.acos(clamp((loX(t) - 26 - LO.cx) / L.rx)); // angle of the back foot on the front arc
  for (let k = 0; k < n; k++) {
    const th = (k / n) * TAU + loop * 0.37;
    if (loop === 2) { const rel = (((th - thNow) % TAU) + TAU) % TAU; if (rel < 0.02 || rel > TAU - 1.25) continue; } // gap ahead of him = where this loop began
    const x = LO.cx + L.rx * Math.cos(th), y = LO.cy + L.ry * Math.sin(th), tx = -L.rx * Math.sin(th), ty = L.ry * Math.cos(th);
    const a = Math.atan2(-ty, -tx), nx = Math.sin(a), ny = -Math.cos(a), side = k % 2 ? 1 : -1; // walking direction = decreasing th
    out.push([x + nx * 9 * side, y + ny * 9 * side, a, side]);
  }
  return out;
};
function lostGround(g: C2, p: Pal) {
  g.fillStyle = K(p, "#9c8a66", "#0a0f1b"); g.fillRect(-150, -150, W + 300, H + 300);
  // soil mottling + damp darker patches
  for (let k = 0; k < 60; k++) { const x = hash(k * 1.3) * W, y = hash(k * 2.9) * H, r = 40 + 120 * hash(k * 4.1); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, K(p, "rgba(70,56,36,0.35)", "rgba(0,0,0,0.25)")); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  litter(g, p, -100, -100, W + 200, H + 200, 1400, 11, 1.25, 1.1);
  // moss cushions + lichen stones + pebbles
  for (let k = 0; k < 34; k++) { const x = hash(k * 7.7) * W, y = 80 + hash(k * 5.3) * 1750; if (Math.abs(x - LO.cx) < 140 && Math.abs(y - LO.cy) < 60) continue; moss(g, p, x, y, 22 + 40 * hash(k * 3.9), k * 13, 0.45); }
  for (let k = 0; k < 50; k++) pebble(g, p, hash(k * 9.1) * W, hash(k * 6.7) * H, 4 + 9 * hash(k * 2.2), k);
  for (let k = 0; k < 18; k++) twig(g, p, hash(k * 3.3) * W, hash(k * 8.1) * H, 40 + 70 * hash(k * 1.9), hash(k * 4.4) * TAU, k, 2 + 2 * hash(k));
  // fallen branch, lower left (rotting, with moss and a bracket fungus)
  rootLine(g, [[-60, 1580], [120, 1540], [260, 1520], [380, 1470], [470, 1452]], 34, 14, K(p, "#6e5a40", "#070b14"));
  if (lit(p)) { g.strokeStyle = "rgba(22,14,10,0.6)"; g.lineWidth = 1.5; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(-20 + k * 50, 1570 - k * 12); g.lineTo(30 + k * 50, 1560 - k * 12); g.stroke(); } }
  moss(g, p, 140, 1530, 30, 77, 0.4); moss(g, p, 330, 1485, 22, 78, 0.4);
  // old trail marker: a faded pita rafia scrap lying in the litter
  g.strokeStyle = K(p, "rgba(196,120,96,0.75)", "rgba(40,30,40,0.7)"); g.lineWidth = 6; g.beginPath(); g.moveTo(820, 1240); g.bezierCurveTo(860, 1225, 880, 1262, 930, 1246); g.stroke();
  // tussocks + ferns (frozen: no wind in this shot)
  const fernCol = K(p, "#5f6e40", "#08101c");
  for (let k = 0; k < 16; k++) { const x = hash(k * 5.9) * W, y = 300 + hash(k * 3.7) * 1500; if (Math.abs(x - LO.cx) < 420 && Math.abs(y - LO.cy) < 200) continue; tuft(g, x, y, 34 + 30 * hash(k), 9, 0, K(p, "#7a7e50", "#0a1220"), k * 3, 2.2); }
  const ferns: [number, number, number][] = [[90, 640, 1], [990, 520, 1.1], [130, 1150, 1.2], [960, 1180, 1], [700, 1380, 0.9], [300, 330, 0.8], [880, 1560, 1.1]];
  ferns.forEach(([x, y, s], i) => { for (let k = 0; k < 5; k++) fern(g, x, y, 90 * s * (0.8 + 0.3 * hash(i + k)), -1.2 + k * 0.6, 0.25 * (k < 2 ? -1 : 1), fernCol, i * 10 + k); });
  // loops 1 + 2 (old: soft, water-filled)
  for (const lp of [0, 1]) for (const [x, y, a, side] of loPrintsOn(lp, loA)) { bootprint(g, p, x, y, a, 44, 0.5, LOOPS[lp].age, 0, x * 0.1 + side); }
  // trekking-pole holes beside the old prints
  g.fillStyle = K(p, "rgba(40,30,20,0.5)", "rgba(0,0,0,0.5)");
  for (const lp of [0, 1]) loPrintsOn(lp, loA).forEach(([x, y, a], k) => { if (k % 2) { g.beginPath(); g.ellipse(x + Math.sin(a) * 26, y - Math.cos(a) * 14, 3, 1.6, 0, 0, TAU); g.fill(); } });
  // akar mimang: roots crossing every loop (the ones you must not step over)
  LO_ROOTS.forEach((pts, r) => {
    rootLine(g, pts, 24 - r, 4, K(p, "#6a5638", "#070b14"));
    if (lit(p)) { g.strokeStyle = "rgba(230,214,180,0.4)"; g.lineWidth = 1.5; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y - 4) : g.moveTo(x, y - 4))); g.stroke(); }
    for (let k = 3; k < pts.length; k += 3) { g.strokeStyle = K(p, "#6a5638", "#070b14"); g.lineWidth = 2; g.beginPath(); g.moveTo(pts[k][0], pts[k][1]); g.lineTo(pts[k][0] + (hash(r + k) - 0.5) * 40, pts[k][1] + 14 + 10 * hash(k)); g.stroke(); } // root hairs
    moss(g, p, pts[6][0], pts[6][1], 12, r * 9 + 1, 0.5);
  });
  // spider web between two roots (lines cached; dew twinkles live)
  web(g, p, 880, 980, 46, 0, 5, 0, false);
  // mushrooms around the trunk base
  for (let k = 0; k < 7; k++) mushroom(g, p, LO.cx - 110 + k * 34 + 8 * hash(k), LO.cy + 30 + 10 * hash(k * 2), 22 + 10 * hash(k * 3), k, (hash(k * 5) - 0.5) * 0.3);
}
function lostTrunk(g: C2, p: Pal) {
  // high angle: the trunk widens toward the camera (top of frame) from its base ellipse
  const bx0 = LO.cx - 100, bx1 = LO.cx + 100, by = LO.cy;
  // buttresses flaring into the roots
  for (const [dx, a] of [[-90, 2.5], [-40, 2.0], [60, 1.0], [95, 0.5]] as P2[]) rcut(g, p, [[LO.cx + dx - 18, by - 40], [LO.cx + dx + 18, by - 40], [LO.cx + dx + Math.cos(a) * 80 + 6, by + Math.sin(a) * 30 + 4], [LO.cx + dx + Math.cos(a) * 80 - 6, by + Math.sin(a) * 30 + 6]], 2, 31 + dx, K(p, "#6e5a40", "#070b14"), { edge: 2 });
  const pts: P2[] = [];
  for (let i = 0; i <= 14; i++) { const f = i / 14; pts.push([lerp(bx0, 430, f) + 8 * Math.sin(f * 6), lerp(by, -160, f)]); }
  for (let i = 14; i >= 0; i--) { const f = i / 14; pts.push([lerp(bx1, 790, f) + 8 * Math.sin(f * 5 + 1), lerp(by, -160, f)]); }
  rcut(g, p, pts, 3, 33, K(p, "#6e5a40", "#070b14"), { edge: 3, hatch: 0.55, dir: 0.15, seed: 33, bbox: [430, -160, 360, by + 160] });
  g.save(); rough(g, pts, true, 3, 33); g.clip();
  g.strokeStyle = K(p, "rgba(22,14,10,0.5)", "rgba(0,0,0,0.5)");
  for (let k = 0; k < 26; k++) { const f0 = hash(k * 1.9); g.lineWidth = 1 + 2.5 * hash(k); g.beginPath(); for (let y = by; y >= -160; y -= 30) { const f = (by - y) / (by + 160), xx = lerp(lerp(bx0, bx1, f0), lerp(430, 790, f0), f) + Math.sin(y * 0.02 + k) * 5; y === by ? g.moveTo(xx, y) : g.lineTo(xx, y); } g.stroke(); }
  // moss on the north side + lichen dots + bracket fungus
  for (let k = 0; k < 18; k++) barkMoss(g, p, 470 + hash(k * 2.3) * 80, by - 60 - hash(k * 3.1) * 820, 16 + 16 * hash(k), 30 + 40 * hash(k * 1.3), 300 + k);
  for (let k = 0; k < 22; k++) lichen(g, p, 520 + hash(k * 4.3) * 220, by - 40 - hash(k * 5.7) * 900, 6 + 8 * hash(k), k * 7);
  for (let k = 0; k < 3; k++) { const fy = by - 160 - k * 26; g.fillStyle = K(p, "#c9b48a", "#0e1626"); g.beginPath(); g.ellipse(700 - k * 6, fy, 34 - k * 6, 9, 0.1, 0, TAU); g.fill(); g.strokeStyle = ink(p); g.lineWidth = 1.3; g.stroke(); }
  g.restore();
  // faded pita rafia wrapped twice (arcs: the band curves with the trunk seen from above) + frayed tails hanging (dead still)
  const rafia = K(p, "#d0907a", "#1a1424"), rafiaD = K(p, "#a86a58", "#120e1a");
  for (const [ry, f] of [[380, 0.47], [416, 0.45]] as P2[]) {
    const xl = lerp(bx0, 430, f) + 4, xr = lerp(bx1, 790, f) - 4;
    g.strokeStyle = rafia; g.lineWidth = 15; g.beginPath(); g.moveTo(xl, ry - 10); g.quadraticCurveTo((xl + xr) / 2, ry + 26, xr, ry - 10); g.stroke();
    if (lit(p)) { g.strokeStyle = "rgba(255,240,226,0.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(xl, ry - 15); g.quadraticCurveTo((xl + xr) / 2, ry + 20, xr, ry - 15); g.stroke(); g.strokeStyle = rafiaD; g.lineWidth = 1; for (let k = 0; k < 14; k++) { const fx = lerp(xl, xr, k / 14); g.beginPath(); g.moveTo(fx, ry - 12 + 26 * (1 - sq((k / 14) * 2 - 1)) * 0.75); g.lineTo(fx + 3, ry + 4 + 26 * (1 - sq((k / 14) * 2 - 1)) * 0.75); g.stroke(); } }
  }
  // knot + tails (split into fibres)
  g.fillStyle = rafia; g.beginPath(); g.ellipse(612, 422, 12, 9, 0.3, 0, TAU); g.fill();
  for (let k = 0; k < 7; k++) { g.strokeStyle = k % 2 ? rafia : rafiaD; g.lineWidth = 2 + (k % 3); g.beginPath(); g.moveTo(612, 428); g.bezierCurveTo(612 + (k - 3) * 4, 470, 606 + (k - 3) * 7, 520, 610 + (k - 3) * 9 + 6 * hash(k), 560 + 30 * hash(k * 3)); g.stroke(); }
  // hanging moss beards from the bark ridge (frozen)
  beard(g, 476, 250, 70, 9, 0, 41, K(p, "#7a8456", "#0a1220")); beard(g, 760, 120, 60, 7, 0, 42, K(p, "#7a8456", "#0a1220"));
}
const lostShot: Shot = {
  name: "lost", a: loA, b: loB, dust: 0.25,
  draw: (c, p, u, t, L) => {
    const br = breeze(t); // 0 throughout this shot: everything that could sway is multiplied by it
    L(1);
    cached(c, p, "lo-ground", -150, -150, W + 300, H + 300, (g) => lostGround(g, p));
    // live: the newest loop's crisp prints appear behind him as he walks
    for (const [x, y, a, side] of loPrintsOn(2, t)) bootprint(c, p, x, y, a, 44, 0.5, 0, t, side);
    c.fillStyle = K(p, "rgba(40,30,20,0.7)", "rgba(0,0,0,0.6)"); loPrintsOn(2, t).forEach(([x, y, a], k) => { if (k % 2) { c.beginPath(); c.ellipse(x + Math.sin(a) * 26, y - Math.cos(a) * 14, 3, 1.6, 0, 0, TAU); c.fill(); } });
    // water glints in the old prints (twinkle only, no ripples: dead air)
    if (lit(p)) for (const lp of [0, 1]) loPrintsOn(lp, loA).forEach(([x, y], k) => { const tw = Math.max(0, Math.sin(t * 1.2 + k * 1.7 + lp)); if (tw > 0.2) { c.fillStyle = `rgba(255,255,252,${0.7 * tw})`; c.beginPath(); c.ellipse(x + 6, y - 1, 4 * tw + 1, 1.2, 0, 0, TAU); c.fill(); } });
    // dew on the web + moss beads
    web(c, p, 880, 980, 46, t, 5, 0, true);
    if (lit(p)) for (let k = 0; k < 30; k++) { const x = hash(k * 7.7) * W, y = 80 + hash(k * 5.3) * 1750, tw = Math.max(0, Math.sin(t * 1.5 + k * 2.1)); c.fillStyle = `rgba(255,255,250,${0.8 * tw})`; c.beginPath(); c.arc(x + 6, y - 4, 1.5 + 1.5 * tw, 0, TAU); c.fill(); }
    // a ground beetle crawling along a root (the only thing that moves besides him)
    { const R = LO_ROOTS[1], f = 0.35 + 0.05 * (t - loA), i = Math.floor(f * (R.length - 1)), fr = f * (R.length - 1) - i, a = R[i], b = R[Math.min(R.length - 1, i + 1)]; beetle(c, p, lerp(a[0], b[0], fr), lerp(a[1], b[1], fr) - 6, Math.atan2(b[1] - a[1], b[0] - a[0]), 13, t); }
    // trunk + snail climbing the bark + a moth resting, wings still
    cached(c, p, "lo-trunk", 380, -200, 460, 1100, (g) => lostTrunk(g, p));
    snail(c, p, 545, 640 - 4 * (t - loA), 14, -1.45);
    moth(c, p, 690, 300, 22, 1);
    // drop gathering on a moss beard tip (falls once): water still moves even when the air does not
    drip(c, p, 478, 322, 560, t, 2.4, 3, 1.4, false);
    // Naam walking the loop again, headlamp on
    const x = loX(t), y = loY(x);
    hiker(c, p, x, y, loNaamH, p.fig, loPose(t), { t, lamp: 1, pack: true, pole: true, beanie: true, breathFog: 0.5 });
    // frozen fog (fogBand driven by a constant time: it hangs)
    fogBand(c, p, 120, 260, 0.38, loA, 1); fogBand(c, p, 1300, 300, 0.22, loA, 4); fogBand(c, p, 1750, 260, 0.3, loA, 7);
    fogSheet(c, p, -200, 520, 0.55);
    // foreground: blurred fern frond in the lower-left corner, a thin twig upper right (both still)
    L(1.6); c.save(); c.filter = "blur(7px)"; fern(c, -30, 1960, 330, 0.55 + 0.0 * br, 0.3, p.fig, 99, 6); c.lineWidth = 9; c.strokeStyle = p.fig; c.beginPath(); c.moveTo(1120, 120); c.quadraticCurveTo(1030, 160, 990, 260); c.stroke(); c.restore(); c.filter = "none";
  },
  lights: (u, t) => {
    const x = loX(t), y = loY(x), J = sideJoints(x, y, loNaamH, loPose(t)), lx = J.head[0] + 0.05 * loNaamH, ly = J.head[1] - 0.03 * loNaamH;
    return [
      { k: "spot", x: 600, y: 560, r: 1000, i: 0.32, col: [200, 210, 228] },
      { k: "spot", x: 600, y: 900, r: 760, i: 0.3, col: [205, 212, 230] }, // soft fog glow over the loops so the prints read
      { k: "cone", ox: lx, oy: ly, tx: x + 0.62 * loNaamH, ty: y + 20, w: 95, r: 130, i: 0.95 * flick(t), col: HEADLAMP, beam: 0.8 }, // aimed down at the path (cast headlampCone follows head pitch = too level here)
    ];
  },
  amb: () => 0.19,
  cam: (u, t) => ({ z: move(t, loA, loB, 1.06, 1.1), cx: 600, cy: move(t, loA, loB, 880, 860), rot: 0 }),
};

// ======================================================================
// 2. PROCESSION: magrib dusk. Naam frozen behind a mossy trunk; a silent court procession crosses the clearing in step.
//    kerajaan: camera eases toward them · pasar: stalls appear out of the fog · pendopo: the pendopo + the still raja.
// ======================================================================
const [prA, prB] = SHOT_RANGE("procession");
const KER = CUE("kerajaan"), PAS = CUE("pasar"), PEN = CUE("pendopo"), MAG = CUE("magrib");
const PR_ST = 0.62, PR_H = 0.2 * H, PR_Y = 1088, PR_P = 2.3, PR_V = (0.69 * PR_H * PR_ST) / PR_P; // in step: one shared walk phase, no sliding
const PR_H2 = 0.155 * H, PR_Y2 = 1032, PR_V2 = (0.69 * PR_H2 * PR_ST) / PR_P;
type PF = { kind: CourtKind; x0: number; seed: number; prop: "lantern" | "payung" | "tray" | "spear" | "none" };
const PROC: PF[] = [
  { kind: "prajurit", x0: 470, seed: 1, prop: "spear" }, { kind: "abdi", x0: 640, seed: 2, prop: "lantern" }, { kind: "putri", x0: 800, seed: 3, prop: "none" },
  { kind: "abdi", x0: 970, seed: 4, prop: "payung" }, { kind: "putri", x0: 1100, seed: 5, prop: "tray" }, { kind: "abdi", x0: 1270, seed: 6, prop: "lantern" },
  { kind: "prajurit", x0: 1440, seed: 7, prop: "spear" }, { kind: "putri", x0: 1600, seed: 8, prop: "tray" }, { kind: "abdi", x0: 1770, seed: 9, prop: "lantern" },
  { kind: "prajurit", x0: 1940, seed: 10, prop: "spear" }, { kind: "abdi", x0: 2110, seed: 11, prop: "lantern" },
];
const PROC2: PF[] = [
  { kind: "abdi", x0: 560, seed: 21, prop: "lantern" }, { kind: "putri", x0: 760, seed: 22, prop: "none" }, { kind: "prajurit", x0: 980, seed: 23, prop: "spear" },
  { kind: "abdi", x0: 1180, seed: 24, prop: "lantern" }, { kind: "putri", x0: 1390, seed: 25, prop: "none" }, { kind: "abdi", x0: 1620, seed: 26, prop: "lantern" },
];
const prPh = (t: number) => ((t - prA) * TAU) / PR_P;
const prPose = (f: PF, t: number, h: number): SidePose => {
  const base: SidePose = { dir: -1, walk: prPh(t), stride: PR_ST, lean: 0.02, head: 0.05, idle: { t, seed: f.seed, amount: 0.25 } };
  if (f.prop === "lantern") return { ...base, armF: [0.62, 0.35], gripF: "fist" };
  if (f.prop === "payung") return { ...base, armF: [0.9, 1.0], armB: [0.7, 1.2], gripF: "fist", gripB: "fist" };
  if (f.prop === "tray") return { ...base, armF: [0.95, 1.25], armB: [0.85, 1.35], gripF: "open", gripB: "open" };
  void h; return base;
};
const prX = (f: PF, t: number, v: number) => f.x0 - v * (t - prA);
/** Naam (foreground, medium): frozen, holding his breath, hand on the bark */
const NA_X = 222, NA_Y = 2045, NA_H = SIZE.medium;
const naPose = (t: number): SidePose => ({ dir: 1, lean: 0.06, head: 0.03 + 0.03 * move(t, KER, KER + 1.2, 0, 1), reachF: [352, 1135], gripF: "open", breath: 1.3 + 0.08 * Math.sin(t * 0.6), idle: { t, seed: 5, amount: 0.12 } });
const marketA = (t: number) => move(t, PAS - 0.35, PAS + 1.1, 0, 1);
const pendA = (t: number) => 0.18 * move(t, PAS + 0.4, PAS + 1.4, 0, 1) + 0.82 * move(t, PEN - 0.12, PEN + 0.35, 0, 1);
const STALLS: [number, number, number][] = [[540, 160, 1], [722, 150, 2], [893, 136, 3]];
const MK_Y = 998, MK_H = 0.14 * H; // market people (depth: farther than the procession → smaller, higher)
const PD = { cx: 770, fy: 712, w: 270 }, PD_H = 0.085 * H, PS = PD.w / 330; // pendopo on a rise behind the market (farther: smaller, higher)
function prSky(c: C2, p: Pal) {
  const g = c.createLinearGradient(0, -100, 0, 1150);
  if (lit(p)) { g.addColorStop(0, "#7c6e8e"); g.addColorStop(0.45, "#b48a86"); g.addColorStop(0.8, "#e0aa78"); g.addColorStop(1, "#e8c49a"); }
  else { g.addColorStop(0, "#0d0f22"); g.addColorStop(0.6, "#1a1a32"); g.addColorStop(1, "#2a2a40"); }
  c.fillStyle = g; c.fillRect(-150, -150, W + 300, 1350);
}
function prFar(g: C2, p: Pal) {
  // distant ridge of Arjuno-Welirang + casuarina rows dissolving in the fog
  g.fillStyle = K(p, "#8a7a8a", "#141a2e"); g.beginPath(); g.moveTo(-150, 760); for (let x = -150; x <= W + 150; x += 30) g.lineTo(x, 640 - 120 * Math.sin((x + 200) * 0.0032) - 30 * hash(x * 0.1)); g.lineTo(W + 150, 1000); g.lineTo(-150, 1000); g.fill();
  g.fillStyle = K(p, "#7a6a72", "#10162a"); for (let k = 0; k < 16; k++) cemara(g, -100 + k * 85 + 30 * hash(k), 920, 260 + 150 * hash(k * 2.3), g.fillStyle as string, k);
  g.fillStyle = K(p, "rgba(214,190,170,0.35)", "rgba(60,70,100,0.3)"); g.fillRect(-150, 700, W + 300, 300);
  g.fillStyle = K(p, "#5e5058", "#0c1224"); for (let k = 0; k < 12; k++) cemara(g, -80 + k * 105 + 40 * hash(k * 7), 990, 380 + 160 * hash(k * 4.1), g.fillStyle as string, k + 40);
}
function prGround(g: C2, p: Pal) {
  const gr = g.createLinearGradient(0, 960, 0, H + 100); gr.addColorStop(0, K(p, "#a8977a", "#121828")); gr.addColorStop(1, K(p, "#7e6e52", "#090d18"));
  g.fillStyle = gr; g.fillRect(-150, 960, W + 300, H - 860);
  // trodden path across the clearing
  g.fillStyle = K(p, "rgba(196,180,150,0.55)", "rgba(30,38,58,0.5)"); g.beginPath(); g.moveTo(-150, 1070); g.quadraticCurveTo(540, 1050, W + 150, 1080); g.lineTo(W + 150, 1112); g.quadraticCurveTo(540, 1092, -150, 1112); g.fill();
  for (let k = 0; k < 120; k++) { const x = hash(k * 3.7) * (W + 200) - 100, y = 980 + Math.pow(hash(k * 5.1), 1.3) * 900, s = 0.4 + (y - 980) / 600; tuft(g, x, y, 22 * s, 7, 0, K(p, "#6f6a48", "#0a1020"), k, 1.4 * s); }
  for (let k = 0; k < 40; k++) { const y = 1000 + hash(k * 8.3) * 850; pebble(g, p, hash(k * 2.9) * W, y, 3 + 6 * ((y - 1000) / 850), k + 50); }
  litter(g, p, -100, 1150, W + 200, 800, 380, 77, 1.1, 1.2);
  // edelweiss-like pale flowers in the clearing
  for (let k = 0; k < 26; k++) { const x = hash(k * 4.9) * W, y = 1010 + hash(k * 6.1) * 700, s = 0.5 + (y - 1000) / 700; g.fillStyle = K(p, "#efe6cf", "#18223a"); for (let j = 0; j < 6; j++) { g.beginPath(); g.ellipse(x + Math.cos(j) * 4 * s, y + Math.sin(j) * 4 * s, 3 * s, 1.5 * s, j, 0, TAU); g.fill(); } g.fillStyle = K(p, "#c9a35a", "#0e1626"); g.beginPath(); g.arc(x, y, 1.6 * s, 0, TAU); g.fill(); }
}
function prTrunk(g: C2, p: Pal) {
  // the mossy trunk Naam hides behind (depth 1.2)
  const pts: P2[] = []; const x0 = 330, x1 = 468;
  for (let i = 0; i <= 16; i++) { const f = i / 16, y = lerp(-150, H + 150, f); pts.push([x0 - 30 * Math.pow(f, 5) + 7 * Math.sin(f * 9), y]); }
  for (let i = 16; i >= 0; i--) { const f = i / 16, y = lerp(-150, H + 150, f); pts.push([x1 + 60 * Math.pow(f, 5) + 7 * Math.sin(f * 7 + 2), y]); }
  rcut(g, p, pts, 3, 51, K(p, "#5e4c36", "#060a12"), { edge: 3, hatch: 0.6, dir: 0.1, seed: 51, bbox: [300, -150, 270, H + 300] });
  g.save(); rough(g, pts, true, 3, 51); g.clip();
  g.strokeStyle = K(p, "rgba(22,14,10,0.55)", "rgba(0,0,0,0.5)");
  for (let k = 0; k < 18; k++) { g.lineWidth = 1 + 2.5 * hash(k + 3); g.beginPath(); const xx = lerp(x0, x1, hash(k * 2.1)); for (let y = -150; y <= H + 150; y += 40) { const w = Math.sin(y * 0.015 + k) * 7; y === -150 ? g.moveTo(xx + w, y) : g.lineTo(xx + w, y); } g.stroke(); }
  for (let k = 0; k < 26; k++) barkMoss(g, p, x0 + 8 + hash(k * 3.3) * 50, hash(k * 1.7) * H, 14 + 16 * hash(k * 2.9), 30 + 50 * hash(k * 1.1), 500 + k);
  for (let k = 0; k < 30; k++) lichen(g, p, x0 + 40 + hash(k * 4.7) * 120, hash(k * 6.1) * H, 5 + 7 * hash(k), k * 3);
  g.restore();
  for (let k = 0; k < 5; k++) beard(g, x0 + 6 + k * 34, 200 + 300 * hash(k * 7), 90 + 60 * hash(k), 8, 0.05, 60 + k, K(p, "#7a8456", "#0a1220"));
}
function prMarket(g: C2, p: Pal) {
  STALLS.forEach(([x, w, s]) => stall(g, p, x, MK_Y, w, 0.15 * H, s));
  // hanging scale + lamps are live; here: a mat with chilies, jars and a basket on the ground between the stalls
  g.fillStyle = K(p, "#b7976b", "#0c1222"); g.fillRect(700, MK_Y - 4, 40, 5);
  for (let k = 0; k < 7; k++) { g.fillStyle = K(p, "#a8402c", "#0e1626"); g.beginPath(); g.ellipse(704 + k * 5, MK_Y - 6, 2.4, 1.1, 0.3, 0, TAU); g.fill(); }
  kendi(g, p, 512, MK_Y, 16); kendi(g, p, 530, MK_Y, 12); basket(g, p, 878, MK_Y, 24, 16, 9);
}
function prPendopo(g: C2, p: Pal) {
  const cx = PD.cx, fy = PD.fy, w = PD.w, s = PS;
  // the rise it stands on: earth mound with stone retaining courses, steps and grass
  g.fillStyle = K(p, "#8e8068", "#0d1322"); g.beginPath(); g.moveTo(cx - w * 0.95, fy + 110); g.quadraticCurveTo(cx - w * 0.75, fy + w * 0.1, cx - w * 0.6, fy + w * 0.09); g.lineTo(cx + w * 0.64, fy + w * 0.09); g.quadraticCurveTo(cx + w * 0.8, fy + w * 0.1, cx + w * 1.0, fy + 110); g.closePath(); g.fill();
  for (let r = 0; r < 3; r++) { const yy = fy + w * 0.1 + 8 + r * 14; g.strokeStyle = K(p, "rgba(22,14,10,0.5)", "rgba(0,0,0,0.5)"); g.lineWidth = 1; g.beginPath(); g.moveTo(cx - w * 0.66 - r * 12, yy); g.lineTo(cx + w * 0.7 + r * 12, yy); g.stroke(); for (let k = 0; k < 14; k++) { const sx = cx - w * 0.62 + k * w * 0.1 + (r % 2) * w * 0.05; g.beginPath(); g.moveTo(sx, yy); g.lineTo(sx, yy + 14); g.stroke(); } }
  for (let k = 0; k < 18; k++) tuft(g, cx - w * 0.9 + k * w * 0.11, fy + 64 + 30 * hash(k), 10, 5, 0, K(p, "#6f6a48", "#0a1020"), k + 400, 1.2);
  pendopo(g, p, cx, fy, w);
  // two payung standing behind the throne
  payung(g, p, cx + 75 * s, fy - 170 * s, 26 * s, 0, 0); payung(g, p, cx + 145 * s, fy - 165 * s, 24 * s, 0, 0);
  g.strokeStyle = K(p, "#c9a35a", "#0d1424"); g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 75 * s, fy - 150 * s); g.lineTo(cx + 75 * s, fy - 12); g.moveTo(cx + 145 * s, fy - 146 * s); g.lineTo(cx + 145 * s, fy - 12); g.stroke();
  // throne (dampar) on the dais
  g.fillStyle = K(p, "#8a6a3a", "#0a0f1b"); g.fillRect(cx + 96 * s, fy - 12 - 0.27 * PD_H, 34 * s, 0.27 * PD_H); g.fillRect(cx + 124 * s, fy - 12 - 0.62 * PD_H, 8 * s, 0.62 * PD_H);
  gong(g, p, cx - 140 * s, fy, 22 * s, 0); kendang(g, p, cx - 100 * s, fy - 2, 22 * s);
}
const prOn = (t: number) => (t >= PAS ? 1 : 0);
function prFigures(c: C2, p: Pal, t: number, list: PF[], h: number, y: number, v: number, fill: string, ghost: number) {
  for (const f of list) {
    const x = prX(f, t, v); if (x < -120 || x > W + 140) continue;
    const pose = prPose(f, t, h);
    const J: Joints = courtier(c, p, f.kind, x, y, h, fill, pose, { t, ghost, seed: f.seed });
    if (f.prop === "lantern") { const A = handAnchor(J, "F"); lantern(c, p, A.x, A.y, h * 0.1, 0.07 * Math.sin(prPh(t) + 0.6), flick(t + f.seed)); }
    if (f.prop === "payung") { const A = handAnchor(J, "F"); c.strokeStyle = K(p, "#5a4630", "#060a12"); c.lineWidth = Math.max(2, h * 0.012); const top: P2 = [A.x + h * 0.12, y - h * 1.42]; c.beginPath(); c.moveTo(A.x - (top[0] - A.x) * 0.15, A.y + h * 0.1); c.lineTo(top[0], top[1]); c.stroke(); payung(c, p, top[0], top[1] - h * 0.02, h * 0.21, 0.04 + 0.015 * Math.sin(prPh(t)), t); }
    if (f.prop === "tray") { const A = handAnchor(J, "F"), B = handAnchor(J, "B"); tampah(c, p, (A.x + B.x) / 2 - h * 0.02, Math.min(A.y, B.y) - h * 0.01, h * 0.24); }
  }
}
/** lantern positions for the light map (same poses as drawn) */
function prLanterns(t: number, list: PF[], h: number, y: number, v: number) {
  const out: P2[] = [];
  for (const f of list) { if (f.prop !== "lantern") continue; const x = prX(f, t, v); if (x < -200 || x > W + 200) continue; const J = sideJoints(x, y, h, prPose(f, t, h)); const A = handAnchor(J, "F"); out.push([A.x, A.y + h * 0.07]); }
  return out;
}
const MK_PEOPLE: { kind: CourtKind; x0: number; v: number; seed: number; dir: 1 | -1 }[] = [
  { kind: "pedagang", x0: 560, v: (0.69 * 0.14 * H * 0.62) / 1.9, seed: 31, dir: 1 }, { kind: "pedagang", x0: 1000, v: -(0.69 * 0.14 * H * 0.62) / 1.9, seed: 32, dir: -1 },
  { kind: "putri", x0: 650, v: 0, seed: 33, dir: 1 }, { kind: "abdi", x0: 860, v: 0, seed: 34, dir: -1 }, { kind: "putri", x0: 790, v: 0, seed: 35, dir: 1 },
];
const procShot: Shot = {
  name: "procession", a: prA, b: prB, dust: 0.35,
  draw: (c, p, u, t, L) => {
    const fogFill = (a: number) => K(p, `rgba(120,108,100,${a})`, `rgba(22,28,44,${a})`);
    L(0.5); prSky(c, p);
    // low dusk sun disc behind the fog + bats leaving the trees
    glow(c, p, 860, 760, 260, "255,150,100", 0.28);
    if (lit(p)) { const sg = c.createRadialGradient(860, 760, 0, 860, 760, 160); sg.addColorStop(0, "rgba(255,226,180,0.85)"); sg.addColorStop(1, "rgba(255,226,180,0)"); c.fillStyle = sg; c.fillRect(700, 600, 320, 320); }
    for (let k = 0; k < 5; k++) { const ph = ((t - prA) * 0.09 + k * 0.21) % 1, bx = lerp(-60, W + 60, ph), by = 330 + 90 * k + 30 * Math.sin(ph * 9 + k), fl = Math.sin(t * 13 + k * 2); c.fillStyle = ink(p); c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 9, by - 8 * fl, bx - 17, by - 2 * fl); c.quadraticCurveTo(bx - 9, by + 2, bx, by + 3); c.quadraticCurveTo(bx + 9, by + 2, bx + 17, by - 2 * fl); c.quadraticCurveTo(bx + 9, by - 8 * fl, bx, by); c.fill(); }
    L(0.6); cached(c, p, "pr-far", -150, 250, W + 300, 760, (g) => prFar(g, p));
    fogBand(c, p, 880, 160, 0.5, t, 2);
    // pendopo (farthest of the vision layers)
    L(0.7);
    const pa = pendA(t);
    if (pa > 0.003) {
      cached(c, p, "pr-pendopo", PD.cx - 280, PD.fy - 400, 560, 530, (g) => prPendopo(g, p), pa);
      c.save(); c.globalAlpha = pa;
      const fillP = K(p, "#2a221c", "#04060c");
      // raja on the dais: deliberately, perfectly still (no idle, no breath)
      courtier(c, p, "raja", PD.cx + 112 * PS, PD.fy - 12, PD_H, fillP, { dir: -1, sit: 0.27 * PD_H, head: 0.02, armF: [0.5, 0.9], armB: [0.45, 1.0], breath: 0 }, { t: 0, ghost: 0.8, seed: 41 });
      // rows of seated figures facing the raja (tiny breathing only)
      for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { const sx = PD.cx + (-110 + k * 46 + r * 20) * PS, sy = PD.fy - 2 - r * 5, hh = PD_H * (0.96 - r * 0.06); courtier(c, p, k % 2 ? "abdi" : "putri", sx, sy, hh, fillP, { dir: 1, sit: 0.12 * hh, head: 0.12, idle: { t, seed: 50 + r * 4 + k, amount: 0.15 } }, { t, ghost: 0.03, seed: 50 + r * 4 + k }); }
      // obor torches at the pendopo corners
      for (const ox of [PD.cx - 190 * PS, PD.cx + 190 * PS]) { c.strokeStyle = ink(p); c.lineWidth = 3; c.beginPath(); c.moveTo(ox, PD.fy + 10); c.lineTo(ox, PD.fy - 62); c.stroke(); const fl2 = flick(t * 1.3 + ox); c.fillStyle = K(p, "#fff0c8", `rgba(255,190,110,${0.9 * fl2})`); c.beginPath(); c.ellipse(ox, PD.fy - 70 - 2 * Math.sin(t * 4 + ox), 3.5, 9 * fl2, 0, 0, TAU); c.fill(); glow(c, p, ox, PD.fy - 70, 46, "255,160,90", 0.4 * pa); }
      c.restore();
    }
    fogBand(c, p, 960, 140, 0.45 - 0.15 * pa, t, 3);
    // market (between the pendopo and the procession)
    L(0.85);
    const ma = marketA(t);
    if (ma > 0.003) {
      cached(c, p, "pr-market", 470, MK_Y - 320, 610, 340, (g) => prMarket(g, p), ma);
      c.save(); c.globalAlpha = ma;
      // oil lamps hanging under the stall roofs, the hanging scale, sellers with pikulan, buyers lingering
      STALLS.forEach(([x, w], i) => { const lx = x + w * (i === 1 ? 0.3 : 0.5), ly = MK_Y - 0.15 * H * 0.78; c.strokeStyle = ink(p); c.lineWidth = 1; c.beginPath(); c.moveTo(lx, ly - 8); c.lineTo(lx, ly); c.stroke(); lantern(c, p, lx, ly, 18, 0.05 * Math.sin(t * 0.8 + i), flick(t + i * 3)); });
      dacin(c, p, 722 + 150 * 0.72, MK_Y - 0.15 * H * 0.78, 34, 0.04 * Math.sin(t * 0.7));
      const fillM = K(p, "#3a302a", "#05070d");
      for (const m of MK_PEOPLE) { const x = m.x0 + m.v * (t - PAS); const pose: SidePose = m.v !== 0 ? { dir: m.dir, walk: ((t - prA) * TAU) / 1.9 + m.seed, stride: 0.62, idle: { t, seed: m.seed, amount: 0.4 } } : { dir: m.dir, head: 0.15, idle: { t, seed: m.seed, amount: 0.6 } }; courtier(c, p, m.kind, x, MK_Y + 4, MK_H, fillM, pose, { t, ghost: 0.03, seed: m.seed }); }
      c.restore();
    }
    fogBand(c, p, 1010, 120, 0.42 - 0.12 * ma, t, 5);
    // ground of the clearing (calm: this is under the captions)
    L(1);
    cached(c, p, "pr-ground", -150, 940, W + 300, H - 780, (g) => prGround(g, p));
    // fireflies drifting low over the grass (slow, warm)
    for (let k = 0; k < 14; k++) { const fx = (hash(k * 3.1) * W + (t - prA) * (6 + 6 * hash(k))) % W, fy = 1000 + hash(k * 5.3) * 300 + 14 * Math.sin(t * 0.7 + k), on = Math.max(0, Math.sin(t * 1.4 + k * 2.2)); c.fillStyle = K(p, `rgba(255,236,160,${on})`, `rgba(255,214,120,${0.8 * on})`); c.beginPath(); c.arc(fx, fy, 2.2, 0, TAU); c.fill(); glow(c, p, fx, fy, 12, "255,214,120", 0.3 * on); }
    // back row of the procession (farther: smaller, higher, fainter), fog, front row
    prFigures(c, p, t, PROC2, PR_H2, PR_Y2, PR_V2, K(p, "#4a3e36", "#0a0e18"), 0.03); // far row: ghost < 0.04 (render budget)
    fogBand(c, p, 1050, 110, 0.35, t, 6);
    prFigures(c, p, t, PROC, PR_H, PR_Y, PR_V, K(p, "#2a221c", "#04060c"), 0.6);
    fogBand(c, p, 1120, 150, 0.32, t, 8);
    // grass tussocks in front of the procession's feet (still air at dusk: barely moving)
    for (let k = 0; k < 18; k++) tuft(c, 380 + k * 40 + 10 * hash(k), 1102 + 8 * hash(k * 2), 26, 8, 0.04 * Math.sin(t * 0.6 + k), K(p, "#5e5a3e", "#080e1a"), k * 5, 1.6);
    // foreground: the trunk + Naam frozen behind it
    L(1.2);
    const J = hiker(c, p, NA_X, NA_Y, NA_H, p.fig, naPose(t), { t, lamp: 0, pack: true, pole: false, beanie: true, breathFog: 0 });
    cached(c, p, "pr-trunk", 260, -200, 380, H + 400, (g) => prTrunk(g, p)); // in front of him: he is partly behind it
    // his fingers over the bark (drawn after the trunk so the hand reads ON it) + moss beards beside his face, barely stirring
    c.fillStyle = p.fig; const A = J.AF.ha; c.beginPath(); c.ellipse(A[0] + 8, A[1] + 6, 15, 22, -0.3, 0, TAU); c.fill(); for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(A[0] + 20 + k * 2, A[1] - 6 + k * 10, 12, 5, 0.2, 0, TAU); c.fill(); }
    beard(c, 350, 760, 120, 10, 0.03 * Math.sin(t * 0.5), 71, K(p, "#7a8456", "#0a1220"));
    // the hiker's frozen breath: one held puff very faint near the lips, drifting nowhere
    L(1.6); c.save(); c.filter = "blur(8px)"; c.fillStyle = p.fig;
    c.beginPath(); c.ellipse(1060, -30, 140, 60, 0.4, 0, TAU); c.fill(); for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(940 + k * 30, 30 + k * 6, 26, 9, 0.6 + 0.02 * Math.sin(t * 0.5 + k), 0, TAU); c.fill(); }
    fern(c, 1080, 1980, 300, -0.5, -0.25, p.fig, 7, 6);
    c.restore(); c.filter = "none";
    void fogFill; void prOn;
  },
  lights: (u, t) => {
    const ls: Light[] = [
      { k: "spot", x: 860, y: 760, r: 1250, i: 0.5, col: DUSK },
      { k: "spot", x: 300, y: 1150, r: 520, i: 0.22, col: DUSK }, // rim on Naam's face
    ];
    for (const [x, y] of prLanterns(t, PROC, PR_H, PR_Y, PR_V)) ls.push({ k: "spot", x, y, r: 170, i: 0.6 * flick(t + x * 0.01), col: LANTERN });
    for (const [x, y] of prLanterns(t, PROC2, PR_H2, PR_Y2, PR_V2)) ls.push({ k: "spot", x, y, r: 120, i: 0.45 * flick(t + x * 0.01), col: LANTERN });
    const ma = marketA(t); if (ma > 0) STALLS.forEach(([x, w], i) => ls.push({ k: "spot", x: x + w * 0.5, y: MK_Y - 0.15 * H * 0.7, r: 150, i: 0.5 * ma * flick(t + i * 3), col: LANTERN }));
    const pa = pendA(t); if (pa > 0) { ls.push({ k: "spot", x: PD.cx + 20, y: PD.fy - 50, r: 230, i: 0.6 * pa, col: LANTERN }); for (const ox of [PD.cx - 190 * PS, PD.cx + 190 * PS]) ls.push({ k: "spot", x: ox, y: PD.fy - 70, r: 110, i: 0.5 * pa * flick(t * 1.3 + ox), col: LANTERN }); }
    return ls;
  },
  amb: (u, t) => 0.2 + 0.03 * move(t, MAG, MAG + 2, 0, 1),
  cam: (u, t) => {
    if (t < KER) return { z: move(t, prA, KER, 1.05, 1.07), cx: 540, cy: 960, rot: 0 };
    if (t < PEN) return { z: move(t, KER, KER + 2.4, 1.07, 1.15), cx: move(t, KER, KER + 2.4, 540, 600), cy: move(t, KER, KER + 2.4, 960, 905), rot: 0 };
    return { z: move(t, PEN, prB + 0.4, 1.15, 1.19), cx: 610, cy: move(t, PEN, prB + 0.4, 905, 880), rot: 0 };
  },
};

// ======================================================================
// 3. FAST: Naam hunched under a huge tree with aerial roots. Breath synced. The offering tray slides in; he turns away. Day 2 → 3.
// ======================================================================
const [faA, faB] = SHOT_RANGE("fast");
const DIAM = CUE("diam"), REF = CUE("refuse"), OFH = CUE("offerHand"), TURN = CUE("turnAway"), HARI3 = CUE("hari3");
const FA_HX = 690, FA_GY = 1030, FA_U = 0.5 * H, FA_PHI = 0.78;
const dawnK = (t: number) => move(t, HARI3 - 0.15, HARI3 + 1.0, 0, 1);
const trayX = (t: number) => settle(t, OFH, OFH + 1.2, -360, 105, 0.03);
/** head pitch (+ = down) in world terms */
const faHead = (t: number) => 0.12 + 0.22 * move(t, DIAM, DIAM + 1.0, 0, 1) + 0.07 * bump(t, REF + 0.35, 0.16) - 0.06 * bump(t, REF + 0.62, 0.14)
  + 0.06 * move(t, OFH + 0.5, OFH + 1.2, 0, 1) - 0.62 * settle(t, TURN, TURN + 1.1, 0, 1, 0.05);
/** ground sitting with knees up: the rig's chair-sit (thighs level, shins hanging) rotated back about the hip by phi,
 *  so the thighs rise, the shins slope down to the feet on the ground. torso = world lean (+ forward), headW = world head pitch (+ down). */
type RotSit = { base: SidePose; toWorld: (q: P2) => P2; toLocal: (q: P2) => P2; X0: number; Y0: number; hx: number; hy: number; rot: number; u: number };
function rotSit(hx: number, gy: number, u: number, d: 1 | -1, phi: number, torso: number, headW: number, extra: SidePose): RotSit {
  const sit = 0.3 * u, hy = gy - 0.03 * u, rot = -phi * d, lean = torso + phi - 0.09;
  const base: SidePose = { ...extra, dir: d, sit, lean, head: headW + phi - lean * 0.3 + 0.05 };
  const rp = (q: P2, a: number): P2 => { const dx = q[0] - hx, dy = q[1] - hy, cs = Math.cos(a), sn = Math.sin(a); return [hx + dx * cs - dy * sn, hy + dx * sn + dy * cs]; };
  return { base, toWorld: (q) => rp(q, rot), toLocal: (q) => rp(q, -rot), X0: hx, Y0: hy + sit, hx, hy, rot, u };
}
function inRot<T>(c: C2, R: RotSit, fn: () => T): T { c.save(); c.translate(R.hx, R.hy); c.rotate(R.rot); c.translate(-R.hx, -R.hy); const r = fn(); c.restore(); return r; }
/** breath vapour on each exhale (phase in rad, exhale = π..2π), drifting toward dirX */
function breathPuff(c: C2, p: Pal, mouth: P2, dirX: number, ph0: number, amt = 1) {
  const ph = ((ph0 % TAU) + TAU) % TAU; if (ph <= Math.PI) return;
  const e = (ph - Math.PI) / Math.PI, a = Math.sin(e * Math.PI) * 0.5 * amt, col = lit(p) ? "245,244,238" : "150,170,200";
  for (let k = 0; k < 4; k++) { const r = 10 + e * 46 + k * 7, px = mouth[0] + dirX * (e * 70 + k * 12), py = mouth[1] - e * 34 - k * 4; const g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${col},${a * (1 - k * 0.2)})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(px - r, py - r, 2 * r, 2 * r); }
}
function hugPose(t: number) {
  const u = FA_U, hunch = 0.42 - 0.12 * settle(t, TURN, TURN + 1.1, 0, 1, 0.05);
  const R = rotSit(FA_HX, FA_GY, u, -1, FA_PHI, hunch, faHead(t), { breath: breathPhase(t), idle: { t, seed: 13, amount: 0.12 } });
  const J0 = sideJoints(R.X0, R.Y0, u, R.base);
  const kn = R.toWorld(J0.LF.k), an = R.toWorld(J0.LF.a);
  const tgt: P2 = [lerp(kn[0], an[0], 0.42) - 0.035 * u, lerp(kn[1], an[1], 0.42) + 0.01 * u];
  const pose: SidePose = { ...R.base, reachF: R.toLocal(tgt), reachB: R.toLocal([tgt[0] + 0.02 * u, tgt[1] - 0.03 * u]), gripF: "fist", gripB: "fist" };
  return { R, pose };
}
function fastTree(g: C2, p: Pal) {
  // huge ficus trunk behind him with buttresses + aerial-root curtains (static ones)
  const bark = K(p, "#6a5840", "#070b14");
  const pts: P2[] = [[560, -200], [980, -200], [1010, 400], [1040, 900], [1180, 1110], [430, 1110], [520, 900], [545, 400]];
  rcut(g, p, pts, 4, 81, bark, { edge: 3, hatch: 0.6, dir: 0.2, seed: 81, bbox: [430, -200, 750, 1310] });
  g.save(); rough(g, pts, true, 4, 81); g.clip();
  g.strokeStyle = K(p, "rgba(22,14,10,0.55)", "rgba(0,0,0,0.5)");
  for (let k = 0; k < 34; k++) { g.lineWidth = 1.5 + 3 * hash(k); g.beginPath(); const xx = 470 + hash(k * 1.3) * 560; for (let y = -200; y <= 1110; y += 30) { const w = Math.sin(y * 0.013 + k * 1.7) * 14; y === -200 ? g.moveTo(xx + w, y) : g.lineTo(xx + w, y); } g.stroke(); }
  for (let k = 0; k < 30; k++) barkMoss(g, p, 540 + hash(k * 2.7) * 440, hash(k * 1.9) * 1060, 18 + 22 * hash(k * 4.4), 34 + 56 * hash(k * 1.7), 700 + k);
  for (let k = 0; k < 40; k++) lichen(g, p, 540 + hash(k * 5.1) * 460, hash(k * 3.3) * 1060, 6 + 8 * hash(k), k * 11);
  g.restore();
  // buttress roots running into the ground
  for (const [x0, x1] of [[520, 300], [600, 430], [950, 1100], [1040, 1160]] as P2[]) rootLine(g, [[x0, 980], [lerp(x0, x1, 0.4), 1060], [lerp(x0, x1, 0.8), 1100], [x1, 1112]], 40, 10, bark);
  // aerial roots: thick ropes from the canopy to the soil (the far, static ones)
  const aer = K(p, "#5a4a36", "#060a12");
  const AX = [200, 236, 410, 455, 520, 560, 1000, 1046, 1080];
  AX.forEach((x0, k) => {
    const x = x0 + 14 * hash(k), bend = (hash(k * 3) - 0.5) * 50, short = k % 3 === 1, end = short ? 420 + 300 * hash(k * 5) : FA_GY + 8, ex = x + bend * 0.5;
    g.strokeStyle = aer; g.lineWidth = 3 + 7 * hash(k * 2); g.beginPath(); g.moveTo(x, -200); g.bezierCurveTo(x + bend, end * 0.3, x - bend, end * 0.65, ex, end); g.stroke();
    if (lit(p)) { g.strokeStyle = "rgba(230,214,180,0.35)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 2, -200); g.bezierCurveTo(x + bend - 2, end * 0.3, x - bend - 2, end * 0.65, ex - 2, end); g.stroke(); }
    g.strokeStyle = aer; g.lineWidth = 1.2; if (short) for (let f = 0; f < 5; f++) { g.beginPath(); g.moveTo(ex, end); g.lineTo(ex + (f - 2) * 5, end + 18 + 10 * hash(f + k)); g.stroke(); } // frayed tips still growing down
    else for (let f = 0; f < 4; f++) { g.beginPath(); g.moveTo(ex, end - 6); g.lineTo(ex + (f - 1.5) * 14, end + 4); g.stroke(); } // rooted into the soil
  });
  // canopy darkness at the very top + hanging moss
  const cg = g.createLinearGradient(0, -200, 0, 360); cg.addColorStop(0, K(p, "rgba(40,32,24,0.95)", "rgba(2,3,7,0.95)")); cg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = cg; g.fillRect(-150, -200, W + 300, 560);
  for (let k = 0; k < 10; k++) beard(g, 60 + k * 105, 120 + 100 * hash(k * 7), 120 + 80 * hash(k), 9, 0, 90 + k, K(p, "#7a8456", "#0a1220"));
}
function fastGround(g: C2, p: Pal) {
  const gr = g.createLinearGradient(0, FA_GY - 40, 0, H + 100); gr.addColorStop(0, K(p, "#8e7a58", "#0b101c")); gr.addColorStop(1, K(p, "#6a5a40", "#070b14"));
  g.fillStyle = gr; g.fillRect(-150, FA_GY - 30, W + 300, H - FA_GY + 230);
  litter(g, p, -120, FA_GY - 20, W + 240, H - FA_GY + 140, 1100, 31, 1.3, 1.4);
  for (let k = 0; k < 22; k++) moss(g, p, hash(k * 4.3) * W, FA_GY + 40 + hash(k * 2.1) * 760, 18 + 34 * hash(k * 3.1), k * 5 + 400, 0.4);
  for (let k = 0; k < 40; k++) pebble(g, p, hash(k * 6.3) * W, FA_GY + 20 + hash(k * 7.9) * 800, 3 + 8 * hash(k * 2.6), k + 300);
  for (let k = 0; k < 14; k++) twig(g, p, hash(k * 2.3) * W, FA_GY + 60 + hash(k * 5.9) * 700, 40 + 60 * hash(k), hash(k * 3.7) * TAU, k + 70, 2.5);
  // fallen branch across the foreground (rotting, mushrooms on it)
  rootLine(g, [[-80, 1660], [180, 1610], [420, 1590], [640, 1620], [820, 1600]], 42, 18, K(p, "#6e5a40", "#070b14"));
  if (lit(p)) { g.strokeStyle = "rgba(22,14,10,0.6)"; g.lineWidth = 1.5; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(-40 + k * 60, 1655 - k * 3); g.lineTo(0 + k * 60, 1640 - k * 3); g.stroke(); } }
  for (let k = 0; k < 5; k++) mushroom(g, p, 300 + k * 26, 1598 + 4 * hash(k), 26 + 10 * hash(k * 2), k + 20);
  // roots of the big tree snaking over the floor
  for (let r = 0; r < 4; r++) { const pts: P2[] = []; for (let k = 0; k <= 10; k++) { const f = k / 10; pts.push([lerp(600 + r * 120, -100 + r * 380, f) + 20 * Math.sin(f * 7 + r), lerp(FA_GY + 10, 1300 + r * 120, f)]); } rootLine(g, pts, 20, 6, K(p, "#5e4c36", "#060a12")); }
  // ferns at the sides (static parts; tips sway live)
  const fernCol = K(p, "#5f6e40", "#08101c");
  for (const [x, y, s] of [[60, FA_GY + 10, 1.1], [1010, FA_GY + 30, 1], [160, 1400, 1.3], [940, 1480, 1.2]] as [number, number, number][]) for (let k = 0; k < 5; k++) fern(g, x, y, 110 * s * (0.8 + 0.3 * hash(x + k)), -1.2 + k * 0.6, 0.25 * (k < 2 ? -1 : 1), fernCol, x + k);
  web(g, p, 250, 860, 70, 0, 9, 0, false); // web strung between two aerial roots
}
const fastShot: Shot = {
  name: "fast", a: faA, b: faB, dust: 0.25,
  draw: (c, p, u, t, L) => {
    const gw = 0.5 + 0.5 * gust(t); // calm air again (the "no wind" beat is over), very gentle
    L(0.6);
    // background: night forest in fog (blue), fading into a grey dawn after hari3
    const dk = dawnK(t);
    const bg = c.createLinearGradient(0, -100, 0, FA_GY);
    if (lit(p)) { bg.addColorStop(0, "#5a6478"); bg.addColorStop(1, "#a8a8a0"); } else { bg.addColorStop(0, "#0a1020"); bg.addColorStop(1, "#1a2438"); }
    c.fillStyle = bg; c.fillRect(-150, -150, W + 300, FA_GY + 200);
    if (!lit(p)) { c.fillStyle = `rgba(150,156,166,${0.22 * dk})`; c.fillRect(-150, -150, W + 300, FA_GY + 200); }
    cached(c, p, "fa-bgtrees", -150, -150, W + 300, FA_GY + 200, (g) => {
      // two rows of misty trunks: tapered, leaning a little, with side branches and moss beards
      for (const [row, col, n] of [[0, K(p, "#8a8e94", "#111a2e"), 8], [1, K(p, "#6a6e76", "#0c1426"), 6]] as [number, string, number][]) for (let k = 0; k < n; k++) {
        const x = -80 + (k + 0.3 * row) * (1250 / n) + 70 * hash(k * 3.1 + row), w = (row ? 34 : 18) + 26 * hash(k * 2 + row), lean = (hash(k * 7 + row) - 0.5) * 60, base = FA_GY - 10 - row * 20;
        g.fillStyle = col; g.beginPath(); g.moveTo(x - w * 0.6, base); g.lineTo(x + lean - w * 0.35, -150); g.lineTo(x + lean + w * 0.35, -150); g.lineTo(x + w * 0.6, base); g.closePath(); g.fill();
        g.strokeStyle = col; g.lineCap = "round"; for (let b = 0; b < 3; b++) { const by = 120 + b * 220 + 80 * hash(k + b), bx = x + lean * (1 - by / base), s = hash(k * 5 + b) > 0.5 ? 1 : -1; g.lineWidth = w * 0.25; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + s * 60, by - 30, bx + s * 120, by - 20 - 30 * hash(b)); g.stroke(); }
        beard(g, x + lean * 0.6 + 10, 260 + 200 * hash(k), 70, 6, 0, k * 9 + row, col);
      }
      fogSheet(g, p, 300, 1100, 0.5);
    });
    fogBand(c, p, 700, 280, 0.45, t * 0.6, 11); fogBand(c, p, 1000, 200, 0.4, t * 0.6, 12);
    L(1);
    cached(c, p, "fa-tree", -150, -200, W + 300, 1340, (g) => fastTree(g, p));
    cached(c, p, "fa-ground", -150, FA_GY - 40, W + 300, H - FA_GY + 240, (g) => fastGround(g, p));
    // live aerial roots in front (sway barely), drips running down them
    const aer = K(p, "#5a4a36", "#060a12");
    for (let k = 0; k < 4; k++) { const x = [130, 300, 940, 1010][k], sw = 6 * gw * Math.sin(t * 0.5 + k); c.strokeStyle = aer; c.lineWidth = 5 + 2 * k % 3; c.beginPath(); c.moveTo(x, -200); c.bezierCurveTo(x + 20, 300, x - 20 + sw, 700, x + sw * 1.5, FA_GY + 4); c.stroke(); drip(c, p, x + sw * 1.4, 760 + k * 60, FA_GY, t, 1.9 + 0.4 * k, 40 + k, 1.4); }
    web(c, p, 250, 860, 70, t, 9, 2 * Math.sin(t * 0.7), true);
    // fern tips + moss strands moving very gently
    for (const [x, y, s] of [[60, FA_GY + 10, 1.1], [1010, FA_GY + 30, 1]] as [number, number, number][]) fern(c, x + 4, y, 70 * s, (x < 500 ? 0.5 : -0.5) + 0.04 * gw * Math.sin(t * 0.8 + x), 0.2, K(p, "#6a7a48", "#0a1220"), x + 9);
    // beetle trudging along the fallen branch, a moth resting on the trunk
    beetle(c, p, 120 + ((t - faA) * 9) % 500, 1612 - ((t - faA) * 9 % 500) * 0.06, -0.06, 16, t);
    moth(c, p, 860, 520, 24, 0.9 + 0.1 * Math.sin(t * 0.4));
    // his gear around him: pack against the trunk, empty bottle, trekking pole lying, frayed bootlaces
    packOnGround(c, p, 872, FA_GY + 4, 0.3 * FA_U, 0.32, t); // lying back against the trunk: its top at his seated shoulder
    bottle(c, p, 455, FA_GY - 6, 70, 0.12);
    trekPole(c, p, 520, FA_GY + 14, 120, FA_GY + 4);
    // Naam: knees hugged (rig rotated about the hip), breath with the SFX
    const { R, pose } = hugPose(t);
    const J = inRot(c, R, () => {
    const J = hiker(c, p, R.X0, R.Y0, R.u, p.fig, pose, { t, lamp: 0, pack: false, pole: false, beanie: true, weak: 0.6, breathFog: 0 });
    // watch on the wrist (front arm) with a faint glint
    const wr = J.AF.ha; c.fillStyle = K(p, "#20262e", "#04070d"); c.beginPath(); c.ellipse(wr[0] + 9, wr[1] - 4, 10, 7, 0, 0, TAU); c.fill();
    if (lit(p)) { c.fillStyle = "rgba(230,240,250,0.8)"; c.beginPath(); c.arc(wr[0] + 9, wr[1] - 4, 4, 0, TAU); c.fill(); }
    // frayed bootlaces dangling from the boots
    for (const Lg of [J.LF, J.LB]) { c.strokeStyle = K(p, "#c9b48a", "#0e1626"); c.lineWidth = 1.6; for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(Lg.a[0] - 6, Lg.a[1] - 4); c.quadraticCurveTo(Lg.a[0] - 10 - k * 6, Lg.a[1] + 10, Lg.a[0] - 4 - k * 9, Lg.a[1] + 18 + 0.0 * k); c.stroke(); } }
    return J; });
    // wet beanie: drops gathering at its rim and falling past his face
    const head = R.toWorld(J.head);
    drip(c, p, head[0] + 0.03 * FA_U, head[1] + 0.02 * FA_U, FA_GY - 0.05 * FA_U, t, 2.7, 61, 1.3, false);
    // breath vapour on every exhale (inhale starts at breath.from + k*period, the same rhythm as the breath SFX)
    breathPuff(c, p, R.toWorld([J.head[0] - 0.07 * FA_U, J.head[1] + 0.05 * FA_U]), -1, breathPhase(t), 1 - 0.4 * settle(t, TURN, TURN + 1.1, 0, 1, 0));
    // the offering: a long pale hand slides a tray in from the left near his feet, steam rising
    if (t > OFH - 0.05) { const tx = trayX(t); offeringHand(c, p, tx, FA_GY - 14, 0, 0.075 * FA_U, t, { tray: true, steam: move(t, OFH + 0.4, OFH + 1.6, 0, 1) }); }
    // fog wisps creeping along the floor
    L(1.05); fogBand(c, p, FA_GY + 20, 120, 0.3, t * 0.7, 14); fogBand(c, p, 380, 220, 0.25, t * 0.5, 15);
    L(1.6); c.save(); c.filter = "blur(8px)"; c.strokeStyle = p.fig; c.lineWidth = 34; c.beginPath(); c.moveTo(-60, -100); c.bezierCurveTo(-10, 500, 20, 900, -30, 1500); c.stroke(); c.lineWidth = 14; c.beginPath(); c.moveTo(1110, 200); c.bezierCurveTo(1060, 600, 1100, 900, 1070, 1300 + 6 * Math.sin(t * 0.5)); c.stroke(); c.restore(); c.filter = "none";
  },
  lights: (u, t) => {
    const dk = dawnK(t), tray = move(t, OFH, OFH + 1.2, 0, 1);
    const ls: Light[] = [
      { k: "spot", x: 880, y: 260, r: 1300, i: lerp(0.32, 0.12, dk), col: MOON },
      { k: "spot", x: 620, y: 820, r: 520, i: lerp(0.32, 0.1, dk), col: [190, 205, 235] },
      { k: "spot", x: 560, y: 300, r: 1500, i: 0.55 * dk, col: DAWN },
      { k: "spot", x: 520, y: 1420, r: 760, i: lerp(0.2, 0.3, dk), col: [190, 200, 228] }, // moonlight pooled on the floor so the litter reads
    ];
    if (tray > 0) ls.push({ k: "spot", x: trayX(t) + 0.2 * FA_U, y: FA_GY - 40, r: 260, i: 0.42 * tray, col: WARM });
    return ls;
  },
  amb: (u, t) => lerp(0.11, 0.25, dawnK(t)),
  cam: (u, t) => ({ z: move(t, faA, faB, 1.06, 1.13), cx: move(t, faA, faB, 590, 560), cy: move(t, faA, faB, 880, 900), rot: 0 }),
};

// ======================================================================
// 4. RAVINE: bottom of the jurang at dawn. Voices at the rim; "TOLONG, PAK!"; an answer; a rope.
// ======================================================================
const [raA, raB] = SHOT_RANGE("ravine");
const VOI = CUE("voices"), TOL = CUE("tolong"), JAWAB = CUE("menjawab"), NAIK = CUE("naik");
const RA_HX = 380, RA_GY = 1032, RA_U = 0.42 * H;
const rimY = (x: number) => (x < 540 ? lerp(380, 505, clamp(x / 540)) : x < 760 ? 505 + 10 * Math.sin((x - 540) * 0.02) : lerp(505, 330, clamp((x - 760) / 320)));
const RIM_PEOPLE: P2[] = [[792, 0], [842, 1], [884, 2]];
const RIM_H = 0.045 * H;
const ropeTop: P2 = [790, rimY(790) - 30];
const ropeBot: P2 = [545, 1010];
const ropeK = (t: number) => move(t, NAIK - 0.35, NAIK + 0.35, 0, 1);
/** centre line of the stream (matches the cached bed) */
const streamX = (y: number) => { if (y < 1460) { const f = clamp((y - 990) / 470); return lerp(787, 765, f) - 55 * Math.sin(Math.PI * f); } const f = clamp((y - 1460) / 590); return lerp(765, 610, f) + 30 * Math.sin(Math.PI * f); };
const raBreath = (t: number) => ((t - raA) * TAU) / 2.7;
/** half-sitting against the rock, knees up (rotated chair-sit), torso reclined back on the boulder */
const raPose = (t: number) => {
  const u = RA_U, look = 0.05 - 0.3 * move(t, VOI, VOI + 1.2, 0, 1) - 0.1 * move(t, JAWAB, JAWAB + 1, 0, 1);
  const R = rotSit(RA_HX, RA_GY, u, 1, 0.72, -0.38, look, { breath: raBreath(t), idle: { t, seed: 21, amount: 0.25 }, jaw: 0.8 * win(t, TOL - 0.05, TOL + 0.68, 0.12) });
  const J0 = sideJoints(R.X0, R.Y0, u, R.base);
  const sh = R.toWorld(J0.sh), rest = R.toWorld(J0.AB.ha), raised: P2 = [sh[0] + 0.12 * u, sh[1] - 0.29 * u];
  const kUp = settle(t, TOL - 0.3, TOL + 0.45, 0, 1, 0.06) * (1 - move(t, JAWAB + 0.3, JAWAB + 1.3, 0, 0.75));
  const pose: SidePose = { ...R.base, reachB: R.toLocal([lerp(rest[0], raised[0], kUp), lerp(rest[1], raised[1], kUp)]), gripB: "open" };
  const kR = settle(t, NAIK, NAIK + 0.55, 0, 1, 0.05);
  if (kR > 0) { const restF = R.toWorld(J0.AF.ha), ty = sh[1] - 0.05 * u, f = clamp((ty - ropeTop[1]) / (ropeBot[1] - ropeTop[1])), tgt: P2 = [lerp(ropeTop[0], ropeBot[0], f), ty]; pose.reachF = R.toLocal([lerp(restF[0], tgt[0], kR), lerp(restF[1], tgt[1], kR)]); pose.gripF = "open"; }
  return { R, pose };
};
function raWalls(g: C2, p: Pal) {
  // sky slit + far end wall
  const sky = g.createLinearGradient(0, 0, 0, 560); sky.addColorStop(0, K(p, "#c8c8c4", "#1a2640")); sky.addColorStop(1, K(p, "#ece6d8", "#2c3a58")); g.fillStyle = sky; g.fillRect(-150, -150, W + 300, 720);
  const rock = K(p, "#8a8070", "#0b111d"), rock2 = K(p, "#6e6658", "#080d18");
  // far end of the ravine (between the walls), hazy
  const far: P2[] = []; for (let k = 0; k <= 12; k++) { const x = lerp(380, 800, k / 12); far.push([x, 500 + 26 * hash(k * 3.7) - 12 * Math.sin(k * 1.3)]); } far.push([800, 1000], [360, 1000]);
  rcut(g, p, far, 3, 91, K(p, "#a49c8c", "#111a2c"), { edge: 2, hatch: 0.3, dir: 1.4, seed: 91, bbox: [360, 480, 440, 520] });
  g.strokeStyle = K(p, "rgba(22,14,10,0.35)", "rgba(0,0,0,0.4)"); g.lineWidth = 1.2; for (let k = 0; k < 9; k++) { const x = 400 + k * 45 + 10 * hash(k); g.beginPath(); g.moveTo(x, 520 + 20 * hash(k)); g.lineTo(x + 8, 640); g.lineTo(x - 4, 760); g.stroke(); }
  fogSheet(g, p, 520, 1000, 0.55, 340, 820);
  // left wall: jagged rim (rock teeth, small overhangs)
  const Lw: P2[] = [[-150, 330]]; for (let k = 0; k <= 18; k++) { const f = k / 18, x = lerp(-120, 520, f); Lw.push([x, lerp(345, 515, f) + (k % 2 ? 18 : -6) * hash(k * 2.9) + 8 * Math.sin(k * 2.1)]); }
  Lw.push([500, 600], [478, 700], [455, 790], [430, 870], [398, 950], [380, 1000], [-150, 1100]);
  rcut(g, p, Lw, 4, 92, rock, { edge: 3, hatch: 0.42, dir: 0.5, seed: 92, bbox: [-150, 330, 670, 770] });
  // right wall
  const Rw: P2[] = [[W + 150, 300]]; for (let k = 0; k <= 16; k++) { const f = k / 16, x = lerp(1180, 770, f); Rw.push([x, lerp(300, 505, f) + (k % 2 ? 16 : -6) * hash(k * 4.3) + 7 * Math.sin(k * 1.7)]); }
  Rw.push([712, 580], [705, 660], [722, 740], [748, 840], [790, 960], [830, 1040], [W + 150, 1100]);
  rcut(g, p, Rw, 4, 93, rock2, { edge: 3, hatch: 0.4, dir: 2.4, seed: 93, bbox: [700, 300, 530, 800] });
  // strata + cracks + ledges with moss + ferns from the cracks
  for (const [pts, seed] of [[Lw, 1], [Rw, 2]] as [P2[], number][]) {
    g.save(); rough(g, pts, true, 5, 91 + seed); g.clip();
    g.strokeStyle = K(p, "rgba(22,14,10,0.28)", "rgba(0,0,0,0.4)");
    for (let k = 0; k < 18; k += 2) { const y0 = 380 + k * 40; g.lineWidth = 1 + 2 * hash(k + seed); g.beginPath(); for (let x = -150; x <= W + 150; x += 40) { const yy = y0 + (seed === 1 ? x * 0.12 : -x * 0.1 + 100) + 8 * Math.sin(x * 0.03 + k); x === -150 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
    for (let k = 0; k < 8; k++) { const x = seed === 1 ? 60 + hash(k) * 380 : 760 + hash(k * 2) * 300, y = 450 + hash(k * 3) * 500; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y + 30); g.lineTo(x + 4, y + 60); g.lineTo(x + 16, y + 90); g.stroke(); }
    for (let k = 0; k < 14; k++) { const x = seed === 1 ? 20 + hash(k * 5) * 420 : 740 + hash(k * 6) * 330, y = 460 + hash(k * 7) * 520; moss(g, p, x, y, 10 + 14 * hash(k), k * 17 + seed, 0.4); }
    g.restore();
  }
  const fernCol = K(p, "#5f6e40", "#08101c");
  for (const [x, y, s, a] of [[300, 640, 0.8, 0.6], [470, 820, 0.7, -0.4], [760, 760, 0.8, 0.5], [880, 600, 0.6, 0.4], [150, 860, 1, 0.3]] as [number, number, number, number][]) for (let k = 0; k < 4; k++) fern(g, x, y, 70 * s, a - 0.7 + k * 0.45, 0.3, fernCol, x + k);
  // roots hanging over the rims + a dead tree leaning out at the left rim
  g.strokeStyle = K(p, "#5a4630", "#060a12"); for (let k = 0; k < 12; k++) { const x = k < 6 ? 40 + k * 70 : 800 + (k - 6) * 45, y = rimY(x) + 4; g.lineWidth = 1.5 + 1.5 * hash(k); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + 40, x + (hash(k) - 0.5) * 30, y + 60 + 60 * hash(k * 2)); g.stroke(); }
  rootLine(g, [[230, rimY(230)], [270, 300], [320, 220], [350, 170]], 12, 4, K(p, "#4a3a28", "#05080f")); rootLine(g, [[300, 245], [360, 240], [400, 210]], 5, 2, K(p, "#4a3a28", "#05080f"));
  // scree trail where he slid down, left wall
  g.fillStyle = K(p, "rgba(70,60,48,0.45)", "rgba(0,0,0,0.35)"); g.beginPath(); g.moveTo(260, 470); g.quadraticCurveTo(300, 700, 250, 900); g.lineTo(300, 905); g.quadraticCurveTo(340, 700, 300, 470); g.fill();
  for (let k = 0; k < 30; k++) pebble(g, p, 250 + hash(k * 3) * 70, 860 + hash(k * 5) * 70, 3 + 6 * hash(k), k + 900);
}
function raFloor(g: C2, p: Pal) {
  const gr = g.createLinearGradient(0, 960, 0, H + 100); gr.addColorStop(0, K(p, "#8a8274", "#0c121e")); gr.addColorStop(1, K(p, "#6a6252", "#070b14")); g.fillStyle = gr; g.fillRect(-150, 950, W + 300, H - 800);
  // stream bed (calm, runs down through the caption zone)
  g.fillStyle = K(p, "#7c8a8c", "#0e1830");
  g.beginPath(); g.moveTo(770, 990); g.bezierCurveTo(800, 1120, 660, 1260, 700, 1460); g.bezierCurveTo(740, 1640, 560, 1800, 500, 2050); g.lineTo(720, 2050); g.bezierCurveTo(780, 1800, 880, 1640, 830, 1460); g.bezierCurveTo(790, 1260, 860, 1120, 805, 990); g.closePath(); g.fill();
  g.strokeStyle = ink(p); g.lineWidth = 2; g.stroke();
  for (let k = 0; k < 60; k++) { const f = hash(k * 2.3), y = 1000 + f * 1000, x = streamX(y) + (hash(k * 4.1) - 0.5) * (50 + f * 140); pebble(g, p, x, y, 4 + 8 * f, k + 1200); }
  // boulders
  const boulder = (x: number, y: number, w: number, h: number, seed: number) => {
    const pts: P2[] = []; for (let k = 0; k < 12; k++) { const a = Math.PI + (k / 11) * Math.PI, r = 0.85 + 0.25 * hash(seed + k); pts.push([x + Math.cos(a) * w * r, y + Math.sin(a) * h * r]); }
    pts.push([x + w, y + 10], [x - w, y + 10]);
    rcut(g, p, pts, 4, seed, K(p, "#948a78", "#0d1320"), { edge: 3, hatch: 0.6, dir: 0.6, seed, bbox: [x - w, y - h * 1.1, 2 * w, h * 1.2] });
    for (let k = 0; k < 6; k++) lichen(g, p, x + (hash(seed + k) - 0.5) * w * 1.2, y - hash(seed + k * 2) * h * 0.8, 6 + 8 * hash(k), seed + k);
    moss(g, p, x - w * 0.2, y - h * 0.9, w * 0.3, seed + 5, 0.3);
  };
  boulder(200, RA_GY + 6, 220, 290, 1001); // the rock he leans on
  boulder(1010, 1170, 150, 150, 1002); boulder(90, 1560, 180, 140, 1003); boulder(1000, 1740, 170, 150, 1004); boulder(930, 1015, 70, 55, 1005);
  // dead branches + ferns + pebbles
  rootLine(g, [[-60, 1300], [120, 1270], [330, 1290], [450, 1250]], 20, 8, K(p, "#6e5a40", "#070b14")); twig(g, p, 120, 1270, 80, -1.2, 5, 4);
  rootLine(g, [[760, 1380], [900, 1330], [1080, 1360]], 16, 7, K(p, "#6e5a40", "#070b14"));
  for (let k = 0; k < 50; k++) pebble(g, p, hash(k * 8.1) * W, 1100 + hash(k * 3.9) * 800, 3 + 7 * hash(k * 2), k + 1500);
  litter(g, p, -100, 1080, W + 200, 860, 300, 41, 1.1, 1.2);
  const fernCol = K(p, "#5f6e40", "#08101c");
  for (const [x, y, s] of [[40, 1180, 1.1], [1040, 1250, 1], [380, 1700, 1.2], [900, 1560, 1]] as [number, number, number][]) for (let k = 0; k < 5; k++) fern(g, x, y, 100 * s, -1.2 + k * 0.6, 0.2, fernCol, x + k);
}
const raShot: Shot = {
  name: "ravine", a: raA, b: raB, dust: 0.4,
  draw: (c, p, u, t, L) => {
    const gw = 0.4 + 0.6 * gust(t);
    L(0.6); cached(c, p, "ra-walls", -150, -150, W + 300, 1270, (g) => raWalls(g, p));
    // a bird crossing the sky slit once
    { const k = (t - raA) / 4; if (k > 0 && k < 1) { const bx = lerp(360, 880, k), by = 250 + 40 * Math.sin(k * 5), fl = Math.sin(t * 10); c.strokeStyle = ink(p); c.lineWidth = 2.5; c.beginPath(); c.moveTo(bx - 14, by - 6 * fl); c.lineTo(bx, by); c.lineTo(bx + 14, by - 6 * fl); c.stroke(); } }
    // voices: faint silhouettes at the right rim (tiny: far above). One leans over and waves on "menjawab".
    const va = move(t, VOI - 0.2, VOI + 1.2, 0, 0.85);
    if (va > 0.003) {
      c.save(); c.globalAlpha = va; const fillR = K(p, "#3a3a3a", "#0a0f1a");
      RIM_PEOPLE.forEach(([x, i]) => {
        const y = rimY(x) + 2; let pose: SidePose = { dir: -1, head: 0.2, idle: { t, seed: 70 + i, amount: 0.7 } };
        if (i === 0) { const k = settle(t, JAWAB, JAWAB + 1.0, 0, 1, 0.05); pose = { ...pose, lean: 0.55 * k, head: 0.2 + 0.3 * k, armF: [lerp(0.1, 2.5, k) + 0.35 * k * Math.sin((t - JAWAB) * 5.5), 0.3], gripF: "open" }; }
        farmer(c, p, x, y, RIM_H * (1 - i * 0.04), fillR, pose, { t, tool: i === 1 ? "cangkul" : "none", seed: 70 + i });
      });
      c.restore();
    }
    // rope uncoiling down the right wall on "naik"
    { const k = ropeK(t); if (k > 0) { const n = 40, endF = k; c.strokeStyle = K(p, "#a8885a", "#141c2c"); c.lineWidth = 3; c.lineCap = "round"; c.beginPath();
      for (let i = 0; i <= n; i++) { const f = (i / n) * endF, x = lerp(ropeTop[0], ropeBot[0], f) + 18 * Math.sin(f * 9 - t * 3) * (1 - k) * f + 10 * Math.sin(f * Math.PI), y = lerp(ropeTop[1], ropeBot[1], f); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      if (k < 1) { const x = lerp(ropeTop[0], ropeBot[0], endF), y = lerp(ropeTop[1], ropeBot[1], endF); c.beginPath(); c.ellipse(x, y + 6, 12 * (1 - k) + 3, 7 * (1 - k) + 2, 0.4, 0, TAU); c.stroke(); } } }
    // drips from the wall + mist pooling at the bottom
    for (let k = 0; k < 3; k++) drip(c, p, [470, 720, 760][k], [700, 640, 820][k], [1000, 980, 1020][k], t, 2.1 + 0.5 * k, 80 + k, 1.3);
    fogBand(c, p, 960, 150, 0.4, t * 0.5, 21);
    L(1);
    cached(c, p, "ra-floor", -150, 940, W + 300, H - 780, (g) => raFloor(g, p));
    // stream: ripples + glints + a leaf drifting down
    for (let k = 0; k < 16; k++) { const f = ((k / 16 + (t - raA) * 0.05) % 1), y = 1000 + f * 950, x = streamX(y) + (hash(k) - 0.5) * 60; c.strokeStyle = K(p, "rgba(245,248,250,0.7)", "rgba(110,130,170,0.4)"); c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 14 + 10 * f, 3 + 2 * f, 0, 0.2, Math.PI - 0.2); c.stroke(); }
    if (lit(p)) for (let k = 0; k < 24; k++) { const y = 1010 + hash(k * 3.3) * 930, x = streamX(y) + (hash(k * 5.1) - 0.5) * 70, tw = Math.max(0, Math.sin(t * 2.2 + k * 1.9)); if (tw > 0.3) { c.fillStyle = `rgba(255,255,252,${0.85 * tw})`; c.beginPath(); c.ellipse(x, y, 5 * tw + 1, 1.5, 0, 0, TAU); c.fill(); } }
    { const f = ((t - raA) * 0.06) % 1, y = 1000 + f * 900, x = streamX(y); c.save(); c.translate(x, y); c.rotate(t * 0.4); c.fillStyle = K(p, "#a48a5e", "#0c1222"); c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(0, -7, 12, 0); c.quadraticCurveTo(0, 7, -12, 0); c.fill(); c.restore(); }
    // wagtail on a rock, bobbing its tail
    { const bx = 930, by = 958, bob = Math.max(0, Math.sin(t * 5)) * 0.4; c.save(); c.translate(bx, by); c.fillStyle = ink(p); c.beginPath(); c.ellipse(0, 0, 11, 6, -0.15, 0, TAU); c.fill(); c.beginPath(); c.arc(9, -5, 4.5, 0, TAU); c.fill(); c.save(); c.translate(-9, 1); c.rotate(-0.2 + bob); c.fillRect(-14, -1.5, 14, 3); c.restore(); c.strokeStyle = ink(p); c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 5); c.lineTo(-1, 12); c.moveTo(3, 5); c.lineTo(4, 12); c.stroke(); c.restore(); }
    // his gear: pack fallen beside the rock, broken trekking pole, empty bottle
    packOnGround(c, p, 92, RA_GY + 2, 0.33 * RA_U * 0.95, -0.08, t);
    trekPole(c, p, 880, RA_GY + 46, 1010, RA_GY + 10, true);
    bottle(c, p, 300, RA_GY + 18, 56, -0.1);
    // Naam half-sitting against the rock (weak), arm up + shout on "tolong", reaching for the rope on "naik"
    const { R, pose } = raPose(t);
    const J = inRot(c, R, () => hiker(c, p, R.X0, R.Y0, RA_U, p.fig, pose, { t, lamp: 0, pack: false, pole: false, beanie: true, weak: 0.9, breathFog: 0, hurt: true }));
    const mouth = R.toWorld([J.head[0] + 0.07 * RA_U, J.head[1] + 0.035 * RA_U]);
    breathPuff(c, p, mouth, 1, raBreath(t), 0.8 * (1 - win(t, TOL - 0.1, TOL + 0.7, 0.1)));
    // "TOLONG, PAK!" as red cut-paper letters drifting up from his mouth (upper half, never in the caption zone)
    { const s = "TOLONG, PAK!", out = 1 - ss(JAWAB - 0.45, JAWAB - 0.03, t);
      for (let i = 0; i < s.length; i++) { const t0 = TOL + 0.04 * i, k = clamp((t - t0) / 0.9); if (k <= 0) continue; const e = easeOut(k);
        const fx = 455 + i * 42, fy = 530 + 16 * Math.sin(i * 1.3);
        const x = lerp(mouth[0], fx, e) + 4 * Math.sin(t * 1.1 + i), y = Math.max(500, lerp(mouth[1], fy, e) - (t - t0) * 22);
        paperLetter(c, p, s[i], x, y, 34 + 34 * e, (hash(i * 3.7) - 0.5) * 0.45 + 0.06 * Math.sin(t * 1.3 + i), clamp(k * 5) * out); } }
    // dead leaves turning slowly down the shaft of light
    for (let k = 0; k < 3; k++) { const f = (((t - raA) * 0.07 + k * 0.33) % 1), x = 560 + 60 * Math.sin(f * 7 + k) + k * 30, y = 420 + f * 600; c.save(); c.translate(x, y); c.rotate(f * 9 + k); c.fillStyle = K(p, "#8e7150", "#0c1222"); c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(0, -5 * Math.cos(f * 12), 9, 0); c.quadraticCurveTo(0, 5, -9, 0); c.fill(); c.restore(); }
    L(1.6); c.save(); c.filter = "blur(8px)"; c.fillStyle = p.fig; c.beginPath(); c.ellipse(-40, 1960, 240, 120, 0.2, 0, TAU); c.fill(); fern(c, 1090, 1900, 280, -0.6 + 0.03 * gw * Math.sin(t * 0.7), -0.3, p.fig, 3, 6); c.restore(); c.filter = "none";
  },
  lights: (u, t) => [
    { k: "spot", x: 600, y: 300, r: 700, i: 0.6, col: DAWN },
    { k: "cone", ox: 640, oy: 360, tx: 470, ty: 960, w: 150, r: 210, i: 0.55 + 0.04 * Math.sin(t * 0.3), col: DAWN, beam: 0.9 },
    { k: "spot", x: 500, y: 1100, r: 900, i: 0.22, col: [205, 212, 235] },
    { k: "spot", x: 840, y: 470, r: 220, i: 0.35 * move(t, VOI - 0.2, VOI + 1.2, 0, 1), col: DAWN },
  ],
  amb: () => 0.14,
  cam: (u, t) => {
    if (t < TOL - 0.2) return { z: move(t, raA, TOL - 0.2, 1.05, 1.1), cx: 540, cy: move(t, raA, TOL - 0.2, 960, 900), rot: 0 };
    return { z: move(t, TOL - 0.2, raB, 1.1, 1.14), cx: 560, cy: move(t, TOL - 0.2, raB, 900, 870), rot: 0 };
  },
};

export const SHOTS_B: Shot[] = [lostShot, procShot, fastShot, raShot];
