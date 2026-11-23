// Horror3 "Kabut Lalijiwo", shots C: rescue, doubt, offer, end. Times only from timeline.json (SHOT_RANGE / CUE).
// Two passes (dark navy / lit woodcut paper) x light map. Static terrain / interiors are painted ONCE per pass into
// module-level offscreen canvases (CV cache) and blitted with parallax; only living details are drawn per frame.
import { C2, Pal, plaster } from "../horror1/paint";
import { Shot, Light, SHOT_RANGE, CUE, W, H, WARM, MOON, LANTERN, DAWN, move, settle, SIZE, heartPulse, RGB } from "./types";
import { box, lit, fg, gust, fogBand, hash, clamp, lerp, ss, vnoise, castShadow, cuts } from "./kit";
import { hiker, farmer, courtier, offeringHand, SidePose } from "./cast";
import { sideJoints, sideFigure, coffeeGlass } from "../horror2/rig";

const TAU = Math.PI * 2;
const pick = (p: Pal, l: string, d: string) => (lit(p) ? l : d);
const hs = (i: number, s = 0) => hash(i * 12.9898 + s * 78.233);
const easeOut2 = (q: number) => 1 - (1 - clamp(q)) * (1 - clamp(q));
type P2 = [number, number];

// ---------------------------------------------------------------- offscreen cache (per key + pass)
const CV = new Map<string, HTMLCanvasElement>();
const PAD = 160;
function cached(c: C2, p: Pal, key: string, paint: (g: C2) => void, x = -PAD, y = -PAD, w = W + 2 * PAD, h = H + 2 * PAD) {
  const k = key + ":" + p.mode; let cv = CV.get(k);
  if (!cv) {
    cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d")!; g.translate(-x, -y); g.lineCap = "round"; g.lineJoin = "round"; paint(g); CV.set(k, cv);
  }
  c.drawImage(cv, x, y);
}

// ================================================================= shared outdoor pieces (morning)
function skyMorning(g: C2, p: Pal, y1: number, sx: number, sy: number) {
  const gr = g.createLinearGradient(0, -PAD, 0, y1);
  gr.addColorStop(0, pick(p, "#b9ab88", "#202a40")); gr.addColorStop(0.65, pick(p, "#dcc596", "#3e4862")); gr.addColorStop(1, pick(p, "#ecd3a0", "#535d74"));
  g.fillStyle = gr; g.fillRect(-PAD, -PAD, W + 2 * PAD, y1 + PAD + 4);
  const sg = g.createRadialGradient(sx, sy, 8, sx, sy, 560);
  sg.addColorStop(0, pick(p, "rgba(255,247,218,0.9)", "rgba(175,175,180,0.32)")); sg.addColorStop(0.3, pick(p, "rgba(255,238,196,0.35)", "rgba(120,125,140,0.12)")); sg.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = sg; g.fillRect(sx - 560, sy - 560, 1120, 1120);
  g.fillStyle = pick(p, "rgba(255,251,236,0.95)", "rgba(205,205,210,0.45)"); g.beginPath(); g.arc(sx, sy, 26, 0, TAU); g.fill();
  g.strokeStyle = pick(p, "rgba(140,122,94,0.32)", "rgba(28,38,60,0.55)");
  for (let k = 0; k < 18; k++) { // thin cirrus streaks
    const yy = 60 + k * (y1 - 200) / 18 + hs(k, 1) * 18, x0 = hs(k, 2) * (W + 200) - 260; g.lineWidth = 2 + 2 * hs(k, 5);
    g.beginPath(); g.moveTo(x0, yy); g.quadraticCurveTo(x0 + 150, yy - 4, x0 + 170 + hs(k, 3) * 320, yy + hs(k, 4) * 6 - 3); g.stroke();
  }
}
/** Arjuno-Welirang massif, twin summit (Ogal-Agil), faded by distance */
function arjuno(g: C2, p: Pal, cx: number, base: number, s: number) {
  const pts: P2[] = [[-760, 0], [-560, -50], [-380, -120], [-250, -190], [-150, -250], [-80, -292], [-36, -305], [-8, -290], [22, -300], [58, -296], [110, -262], [190, -214], [270, -196], [330, -214], [400, -196], [500, -140], [620, -80], [780, 0]];
  g.beginPath(); g.moveTo(cx + pts[0][0] * s, base + 4);
  pts.forEach(([x, y], i) => g.lineTo(cx + x * s, base + y * s + (hash(i * 3.3) - 0.5) * 5 * s));
  g.lineTo(cx + 780 * s, base + 4); g.closePath();
  g.fillStyle = pick(p, "#b3ab92", "#36425c"); g.fill();
  g.save(); g.clip();
  g.strokeStyle = pick(p, "rgba(96,84,62,0.33)", "rgba(20,28,46,0.5)"); g.lineWidth = 1.6;
  for (let k = 0; k < 26; k++) { // erosion gullies down the slopes
    const x = cx + (-420 + k * 34) * s, top = base - (300 - Math.abs(k - 12) * 22) * s;
    g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + (k - 12) * 5 * s, base - 140 * s, x + (k - 12) * 15 * s, base); g.stroke();
  }
  const hz = g.createLinearGradient(0, base - 160 * s, 0, base); hz.addColorStop(0, "rgba(0,0,0,0)"); hz.addColorStop(1, pick(p, "rgba(240,230,205,0.75)", "rgba(90,100,122,0.6)"));
  g.fillStyle = hz; g.fillRect(cx - 800 * s, base - 160 * s, 1600 * s, 170 * s);
  g.restore();
}
function ridge(g: C2, p: Pal, y: number, amp: number, seed: number, cl: string, cd: string, tree = 0, x0 = -PAD, x1 = W + PAD) {
  const f = (x: number) => y - amp * (0.55 + 0.45 * Math.sin(x * 0.0042 + seed)) - amp * 0.5 * vnoise(x * 0.012 + seed * 7);
  g.fillStyle = pick(p, cl, cd); g.beginPath(); g.moveTo(x0, y + 700);
  for (let x = x0; x <= x1; x += 14) g.lineTo(x, f(x)); g.lineTo(x1, y + 700); g.closePath(); g.fill();
  if (tree > 0) for (let x = x0; x <= x1; x += tree * 1.25) { const r = tree * (0.55 + 0.6 * hash(x * 0.37 + seed)); g.beginPath(); g.arc(x, f(x) + r * 0.35, r, Math.PI, 0); g.fill(); }
}
/** terraced sawah: water mirrors, young rice rows (blade by blade + reflections), pematang bunds with grass */
function terraces(g: C2, p: Pal, ys: number[], x0: number, x1: number, hz: number, ref: number, seed: number, dens = 1) {
  for (let k = 0; k < ys.length - 1; k++) {
    const yT = ys[k], yB = ys[k + 1], s = clamp((yB - hz) / (ref - hz), 0.04, 2.2);
    const cv = (x: number, yy: number) => yy + Math.sin(x * 0.0032 + k * 1.7 + seed) * 8 * s;
    const path = (a: number, b: number) => { g.beginPath(); g.moveTo(x0, cv(x0, a)); for (let x = x0; x <= x1 + 23; x += 24) g.lineTo(x, cv(x, a)); for (let x = x1 + 23; x >= x0; x -= 24) g.lineTo(x, cv(x, b)); g.closePath(); };
    const wg = g.createLinearGradient(0, yT, 0, yB); wg.addColorStop(0, pick(p, "#ccb68a", "#323d56")); wg.addColorStop(1, pick(p, "#e8d3a6", "#48536c"));
    path(yT - 2, yB + 1); g.fillStyle = wg; g.fill();
    g.save(); path(yT - 2, yB + 1); g.clip();
    g.strokeStyle = pick(p, "rgba(255,252,238,0.6)", "rgba(125,140,170,0.35)");
    for (let i = 0; i < 7; i++) { const xx = x0 + hash(i * 3.1 + k * 7 + seed) * (x1 - x0), yy = yT + (0.25 + 0.6 * hash(i * 5.3 + k)) * (yB - yT); g.lineWidth = 1 + 2 * s; g.beginPath(); g.moveTo(xx, cv(xx, yy)); g.lineTo(xx + 50 + 160 * s * hash(i + k), cv(xx, yy)); g.stroke(); }
    const rows = Math.max(2, Math.round(((yB - yT) / (5 + 13 * s)) * dens)), step = (7 + 24 * s) / Math.sqrt(dens), hh = 3 + 14 * s;
    for (let r = 0; r < rows; r++) {
      const yy0 = yT + ((r + 0.75) / rows) * (yB - yT) * 0.92;
      for (let x = x0 + (r % 2) * step * 0.5; x <= x1; x += step) {
        const yy = cv(x, yy0), j = (hash(x * 0.13 + r * 3.7 + k) - 0.5) * step * 0.3, sz = 0.75 + 0.5 * hash(x * 0.71 + r + k * 3);
        g.strokeStyle = pick(p, "rgba(60,58,34,0.22)", "rgba(10,16,28,0.3)"); g.lineWidth = Math.max(0.7, 1.3 * s);
        g.beginPath(); g.moveTo(x + j, yy + 1); g.lineTo(x + j - 1, yy + hh * 0.55 * sz); g.stroke();
        g.strokeStyle = pick(p, "#4a492b", "#0b1220"); g.lineWidth = Math.max(0.7, 1.5 * s);
        g.beginPath(); g.moveTo(x + j, yy); g.lineTo(x + j - hh * 0.32 * sz, yy - hh * sz); g.moveTo(x + j, yy); g.lineTo(x + j + hh * 0.05, yy - hh * 1.1 * sz); g.moveTo(x + j, yy); g.lineTo(x + j + hh * 0.36 * sz, yy - hh * 0.82 * sz); g.stroke();
      }
    }
    g.restore();
    const th = 3 + 12 * s;
    path(yB - th * 0.6, yB + th * 0.4); g.fillStyle = pick(p, "#8e7b57", "#141c2d"); g.fill();
    g.strokeStyle = pick(p, "#3b3220", "#070b14"); g.lineWidth = Math.max(1, 1.8 * s);
    g.beginPath(); for (let x = x0; x <= x1 + 23; x += 24) { const yy = cv(x, yB - th * 0.6); if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke();
    g.lineWidth = Math.max(0.7, 1.2 * s);
    for (let x = x0; x <= x1; x += 5 + 11 * s) { const yy = cv(x, yB - th * 0.6), gh = (2 + 7 * s) * (0.5 + hash(x * 0.7 + k)); g.beginPath(); g.moveTo(x, yy); g.lineTo(x - gh * 0.3, yy - gh); g.moveTo(x, yy); g.lineTo(x + gh * 0.4, yy - gh * 0.8); g.stroke(); }
  }
}
function grassField(g: C2, p: Pal, pts: P2[], y0: number, y1: number, x0: number, x1: number, hz: number, ref: number, seed: number) {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = pick(p, "#a99d73", "#192235"); g.fill();
  g.save(); g.clip();
  for (let i = 0; i < 1400; i++) {
    const x = x0 + hs(i, seed) * (x1 - x0), y = y0 + Math.pow(hs(i, seed + 1), 0.7) * (y1 - y0), s = clamp((y - hz) / (ref - hz), 0.1, 2), gh = (4 + 12 * s) * (0.6 + 0.8 * hs(i, seed + 2));
    g.strokeStyle = pick(p, hs(i, 9) > 0.5 ? "#50492c" : "#6f6743", "#0c1322"); g.lineWidth = Math.max(0.8, 1.4 * s);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + gh * 0.1, y - gh * 0.6, x + (hs(i, 4) - 0.5) * gh * 0.8, y - gh); g.stroke();
  }
  g.restore();
}
function footprints(g: C2, p: Pal, x0: number, y0: number, n: number, dx: number, s: number, seed: number, bare = true) {
  g.fillStyle = pick(p, "rgba(52,40,24,0.55)", "rgba(4,6,12,0.6)");
  for (let k = 0; k < n; k++) {
    const fx = x0 + k * dx + (hs(k, seed) - 0.5) * 6 * s, fy = y0 + (k % 2) * 9 * s;
    g.beginPath(); g.ellipse(fx, fy, 11 * s, 4.2 * s, 0.04, 0, TAU); g.fill();
    if (bare) for (let to = 0; to < 4; to++) { g.beginPath(); g.arc(fx + Math.sign(dx) * (12 + to * 1.5) * s, fy - 3.5 * s + to * 2.2 * s, 1.6 * s, 0, TAU); g.fill(); }
  }
}
function pebbles(g: C2, p: Pal, x0: number, x1: number, y0: number, y1: number, n: number, s: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const x = x0 + hs(i, seed) * (x1 - x0), y = y0 + hs(i, seed + 1) * (y1 - y0), r = (2 + 5 * hs(i, seed + 2)) * s;
    g.fillStyle = pick(p, hs(i, 3) > 0.5 ? "#7d6c50" : "#b3a37f", "#0e1524"); g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, TAU); g.fill();
    if (lit(p)) { g.strokeStyle = "rgba(30,22,14,0.6)"; g.lineWidth = 1; g.stroke(); }
  }
}
function house(g: C2, p: Pal, x: number, y: number, s: number, seed: number) {
  const w = 110 * s, wh = 46 * s, rh = 46 * s;
  g.fillStyle = pick(p, hs(seed) > 0.5 ? "#d9cfb6" : "#cdbf9f", "#1a2337"); g.fillRect(x - w / 2, y - wh, w, wh);
  g.fillStyle = pick(p, "#5e3b26", "#0d1322"); // tile roof (limasan)
  g.beginPath(); g.moveTo(x - w / 2 - 10 * s, y - wh); g.lineTo(x - w * 0.22, y - wh - rh); g.lineTo(x + w * 0.22, y - wh - rh); g.lineTo(x + w / 2 + 10 * s, y - wh); g.closePath(); g.fill();
  if (lit(p)) { g.strokeStyle = "rgba(20,12,8,0.6)"; g.lineWidth = Math.max(0.7, 1.1 * s); for (let k = 1; k < 6; k++) { const yy = y - wh - rh * (k / 6); const ww = lerp(w / 2 + 10 * s, w * 0.22, k / 6); g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x + ww, yy); g.stroke(); } }
  g.fillStyle = pick(p, "#2a1d12", "#05070d"); g.fillRect(x - w * 0.1, y - wh * 0.72, w * 0.16, wh * 0.72); g.fillRect(x + w * 0.2, y - wh * 0.7, w * 0.14, wh * 0.3); g.fillRect(x - w * 0.38, y - wh * 0.7, w * 0.14, wh * 0.3);
}
function mosque(g: C2, p: Pal, x: number, y: number, s: number) {
  const ink = pick(p, "#3f3a33", "#0b111e");
  g.fillStyle = pick(p, "#dcd3bb", "#1b2438"); g.fillRect(x - 60 * s, y - 50 * s, 120 * s, 50 * s);
  g.fillStyle = pick(p, "#7d8a86", "#121a2c"); g.beginPath(); g.ellipse(x, y - 50 * s, 42 * s, 40 * s, 0, Math.PI, 0); g.fill();
  g.fillStyle = ink; g.fillRect(x - 1.5 * s, y - 106 * s, 3 * s, 18 * s); g.beginPath(); g.arc(x, y - 108 * s, 4 * s, 0, TAU); g.fill();
  for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x - 42 * s + k * 28 * s, y - 28 * s, 6 * s, 12 * s, 0, Math.PI, 0); g.lineTo(x - 36 * s + k * 28 * s, y - 10 * s); g.lineTo(x - 48 * s + k * 28 * s, y - 10 * s); g.fill(); }
  // speaker pole with the loudspeaker horn (toa)
  g.strokeStyle = ink; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(x + 76 * s, y); g.lineTo(x + 76 * s, y - 150 * s); g.stroke();
  for (const [dy, dir] of [[-146, 1], [-132, -1]] as [number, number][]) { g.beginPath(); g.moveTo(x + 76 * s, y + dy * s - 3 * s); g.lineTo(x + 76 * s + dir * 22 * s, y + dy * s - 9 * s); g.lineTo(x + 76 * s + dir * 22 * s, y + dy * s + 9 * s); g.lineTo(x + 76 * s, y + dy * s + 3 * s); g.closePath(); g.fillStyle = ink; g.fill(); }
}
function motorbike(g: C2, p: Pal, x: number, y: number, s: number) {
  const ink = pick(p, "#1d1610", "#04060c"); g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 3 * s;
  for (const wx of [-22, 22]) { g.beginPath(); g.arc(x + wx * s, y - 10 * s, 10 * s, 0, TAU); g.stroke(); }
  g.beginPath(); g.moveTo(x - 24 * s, y - 14 * s); g.lineTo(x - 8 * s, y - 26 * s); g.lineTo(x + 14 * s, y - 24 * s); g.lineTo(x + 20 * s, y - 12 * s); g.lineTo(x - 4 * s, y - 12 * s); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x + 16 * s, y - 24 * s); g.lineTo(x + 20 * s, y - 38 * s); g.lineTo(x + 28 * s, y - 40 * s); g.stroke(); g.fillRect(x - 18 * s, y - 32 * s, 22 * s, 6 * s);
}
function bambooFence(g: C2, p: Pal, x0: number, x1: number, y: number, h: number, s: number) {
  for (let x = x0; x < x1; x += 13 * s) { const hh = h * (0.82 + 0.18 * hash(x)); g.fillStyle = pick(p, "#9c8458", "#121a2a"); g.fillRect(x, y - hh, 7 * s, hh); if (lit(p)) { g.fillStyle = "rgba(30,20,10,0.6)"; g.fillRect(x, y - hh * 0.55, 7 * s, 1.2 * s); } }
  g.fillStyle = pick(p, "#7a6442", "#0e1524"); g.fillRect(x0, y - h * 0.72, x1 - x0, 3.5 * s); g.fillRect(x0, y - h * 0.32, x1 - x0, 3.5 * s);
}
function bananaTree(g: C2, p: Pal, x: number, y: number, h: number, sway: number, seed: number) {
  g.fillStyle = pick(p, "#5a5a36", "#0b121f"); g.beginPath(); g.moveTo(x - h * 0.035, y); g.lineTo(x - h * 0.02, y - h * 0.55); g.lineTo(x + h * 0.02, y - h * 0.55); g.lineTo(x + h * 0.035, y); g.fill();
  for (let k = 0; k < 7; k++) {
    const side = k % 2 ? 1 : -1, a = side * (0.35 + 0.14 * k) + sway * (0.6 + 0.2 * k) + 0.03 * Math.sin(seed + k);
    g.save(); g.translate(x, y - h * (0.5 + 0.035 * k)); g.rotate(a);
    g.fillStyle = pick(p, k % 3 ? "#646a3c" : "#4f5530", "#0c1424");
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * 0.11, -h * 0.22, h * 0.03, -h * 0.48); g.quadraticCurveTo(-h * 0.07, -h * 0.24, 0, 0); g.fill();
    if (lit(p)) { g.strokeStyle = "rgba(20,16,8,0.55)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * 0.03, -h * 0.24, h * 0.03, -h * 0.48); g.stroke(); for (let q = 1; q < 7; q++) { const yy = -h * 0.07 * q; g.beginPath(); g.moveTo(h * 0.01 + q * 0.002 * h, yy); g.lineTo(h * 0.075, yy - h * 0.03); g.stroke(); } }
    g.restore();
  }
}
function coconut(c: C2, p: Pal, x: number, y: number, h: number, t: number, seed: number) {
  const sw = 0.025 * Math.sin(t * 0.7 + seed) + 0.03 * gust(t - seed * 0.2);
  const ink = pick(p, "#3d3626", "#0a101c"); c.strokeStyle = ink; c.fillStyle = ink; c.lineCap = "round";
  c.lineWidth = h * 0.028; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + h * 0.1, y - h * 0.5, x + h * (0.06 + sw), y - h); c.stroke();
  const tx = x + h * (0.06 + sw), ty = y - h;
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI + (k / 9) * Math.PI + sw * 2.5 + 0.05 * Math.sin(t * 0.9 + k + seed), L = h * (0.3 + 0.07 * hash(seed + k));
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.45 + L * 0.4;
    c.lineWidth = Math.max(1.5, h * 0.012); c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * L * 0.5, ty + Math.sin(a) * L * 0.45 - L * 0.12, ex, ey); c.stroke();
    c.lineWidth = Math.max(1.2, h * 0.007);
    for (let q = 1; q < 14; q++) { const fx = tx + (ex - tx) * (q / 14), fy = ty + (ey - ty) * (q / 14) - Math.sin((q / 14) * Math.PI) * L * 0.12, fl = h * 0.075 * (1 - q / 18); c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx + fl * 0.3, fy + fl * 0.4, fx + fl * 0.25, fy + fl); c.moveTo(fx, fy); c.quadraticCurveTo(fx - fl * 0.3, fy + fl * 0.4, fx - fl * 0.25, fy + fl); c.stroke(); }
  }
  for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(tx - h * 0.02 + k * h * 0.013, ty + h * 0.03, h * 0.012, 0, TAU); c.fill(); }
}
function smoke(c: C2, p: Pal, x: number, y: number, t: number, hgt: number, s: number, seed: number) {
  for (let k = 0; k < 14; k++) {
    const q = ((t * 0.12 + k / 14 + hash(seed)) % 1), yy = y - q * hgt, xx = x + Math.sin(q * 5 + t * 0.4 + seed) * 18 * s * q + q * 40 * s, r = (6 + 30 * q) * s;
    c.fillStyle = pick(p, `rgba(150,140,124,${0.3 * (1 - q)})`, `rgba(60,72,96,${0.35 * (1 - q)})`); c.beginPath(); c.arc(xx, yy, r, 0, TAU); c.fill();
  }
}
function egret(c: C2, p: Pal, x: number, y: number, s: number, t: number, seed: number, dir = 1) {
  const peck = Math.max(0, Math.sin(t * 0.55 + seed * 3)) ** 6, neck = 0.5 * Math.sin(t * 0.8 + seed) * 0.15;
  c.save(); c.translate(x, y); c.scale(dir * s, s);
  c.strokeStyle = pick(p, "#2a2218", "#05070c"); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-2, -14); c.lineTo(-3, 0); c.moveTo(2, -14); c.lineTo(3, 0); c.stroke();
  c.fillStyle = pick(p, "#fbf7ec", "#3b4866"); c.beginPath(); c.ellipse(0, -20, 11, 6.5, -0.25, 0, TAU); c.fill();
  const hx = 8 + 4 * peck, hy = -40 + 26 * peck + neck * 10;
  c.strokeStyle = pick(p, "#fbf7ec", "#3b4866"); c.lineWidth = 3.2; c.beginPath(); c.moveTo(8, -23); c.quadraticCurveTo(4, -32 + 10 * peck, hx, hy); c.stroke();
  c.fillStyle = pick(p, "#fbf7ec", "#3b4866"); c.beginPath(); c.arc(hx, hy, 3, 0, TAU); c.fill();
  c.strokeStyle = pick(p, "#7a5a18", "#0a0e18"); c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx + 2, hy); c.lineTo(hx + 10, hy + 2 + 4 * peck); c.stroke();
  if (lit(p)) { c.strokeStyle = "rgba(30,24,18,0.5)"; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -20, 11, 6.5, -0.25, 0, TAU); c.stroke(); }
  c.restore();
}
function ducks(c: C2, p: Pal, x0: number, y: number, s: number, t: number, n = 5) {
  for (let k = 0; k < n; k++) {
    const x = x0 - k * 46 * s, bob = 1.5 * s * Math.sin(t * 2.4 + k * 1.3), hd = Math.sin(t * 1.1 + k) * 0.15;
    c.fillStyle = pick(p, k % 2 ? "#e9e2cf" : "#c8b892", "#2a3650");
    c.beginPath(); c.ellipse(x, y + bob, 16 * s, 8 * s, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(x - 14 * s, y + bob - 2 * s); c.lineTo(x - 22 * s, y + bob - 7 * s); c.lineTo(x - 13 * s, y + bob + 2 * s); c.fill();
    c.beginPath(); c.ellipse(x + 12 * s, y + bob - 12 * s, 3.4 * s, 9 * s, 0.2 + hd, 0, TAU); c.fill();
    c.beginPath(); c.arc(x + 15 * s, y + bob - 20 * s, 5 * s, 0, TAU); c.fill();
    c.fillStyle = pick(p, "#b07a2a", "#0b0f1a"); c.beginPath(); c.moveTo(x + 19 * s, y + bob - 21 * s); c.lineTo(x + 27 * s, y + bob - 19 * s); c.lineTo(x + 19 * s, y + bob - 17 * s); c.fill();
    c.fillStyle = pick(p, "#120b08", "#000"); c.beginPath(); c.arc(x + 16.5 * s, y + bob - 21.5 * s, 1.1 * s, 0, TAU); c.fill();
    c.strokeStyle = pick(p, "rgba(255,250,236,0.5)", "rgba(120,140,170,0.3)"); c.lineWidth = 1.5 * s; // wake ripples
    for (let r = 0; r < 2; r++) { const rr = ((t * 0.6 + r * 0.5 + k * 0.2) % 1); c.globalAlpha = 1 - rr; c.beginPath(); c.ellipse(x - 6 * s, y + bob + 7 * s, (18 + 24 * rr) * s, (3 + 4 * rr) * s, 0, 0, Math.PI); c.stroke(); }
    c.globalAlpha = 1;
  }
}
function dragonfly(c: C2, p: Pal, x: number, y: number, s: number, t: number, seed: number) {
  const hx = x + 30 * s * Math.sin(t * 0.5 + seed) + 10 * s * Math.sin(t * 1.7 + seed * 2), hy = y + 14 * s * Math.sin(t * 0.7 + seed * 3);
  const fl = Math.sin(t * 60 + seed) * 0.35;
  c.strokeStyle = pick(p, "#1b140c", "#05070c"); c.lineWidth = 2 * s; c.beginPath(); c.moveTo(hx - 14 * s, hy); c.lineTo(hx + 8 * s, hy); c.stroke();
  c.fillStyle = pick(p, "rgba(60,50,40,0.35)", "rgba(80,100,130,0.3)");
  for (const sg of [-1, 1]) for (const wx of [0, 5]) { c.beginPath(); c.ellipse(hx + wx * s - 1 * s, hy + sg * (6 + fl * 3) * s, 9 * s, 2.4 * s, sg * (0.25 + fl * 0.2), 0, TAU); c.fill(); }
}
function scarecrow(c: C2, p: Pal, x: number, y: number, s: number, t: number) {
  const ink = pick(p, "#2b2216", "#05070c"), sw = gust(t) * 0.5 + 0.3 * Math.sin(t * 0.9);
  c.strokeStyle = ink; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 170 * s); c.moveTo(x - 60 * s, y - 120 * s); c.lineTo(x + 60 * s, y - 118 * s); c.stroke();
  c.fillStyle = pick(p, "#8a6a40", "#141c2c"); c.beginPath(); c.moveTo(x - 34 * s, y - 128 * s); c.lineTo(x + 34 * s, y - 128 * s); c.lineTo(x + 26 * s, y - 60 * s); c.lineTo(x - 26 * s, y - 60 * s); c.closePath(); c.fill(); // old shirt
  c.fillStyle = ink; c.beginPath(); c.arc(x, y - 146 * s, 14 * s, 0, TAU); c.fill();
  c.fillStyle = pick(p, "#c9a86a", "#1a2236"); c.beginPath(); c.moveTo(x - 34 * s, y - 150 * s); c.lineTo(x, y - 172 * s); c.lineTo(x + 34 * s, y - 150 * s); c.closePath(); c.fill(); // caping
  // plastic bags on strings, fluttering
  for (let k = 0; k < 4; k++) {
    const ax = x + (k < 2 ? -56 : 56) * s + (k % 2) * 10 * s, ay = y - 120 * s, a = 0.4 * Math.sin(t * 2.2 + k * 1.7) * (0.6 + sw) + 0.5;
    c.strokeStyle = ink; c.lineWidth = 1; const bx = ax + Math.sin(a) * 34 * s, by = ay + Math.cos(a) * 34 * s;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    c.fillStyle = pick(p, k % 2 ? "rgba(245,240,226,0.9)" : "rgba(200,60,40,0.75)", "rgba(70,84,110,0.6)");
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + 14 * s * Math.cos(t * 3 + k), by + 10 * s, bx + 4 * s, by + 22 * s); c.quadraticCurveTo(bx - 10 * s, by + 12 * s, bx, by); c.fill();
  }
}
function frog(c: C2, p: Pal, x: number, y: number, s: number, t: number, seed: number) {
  const th = 0.5 + 0.5 * Math.sin(t * 5 + seed);
  c.fillStyle = pick(p, "#5d5a34", "#0b1220"); c.beginPath(); c.ellipse(x, y, 16 * s, 10 * s, -0.2, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(x + 12 * s, y - 5 * s, 8 * s, 6 * s, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(x - 12 * s, y + 6 * s, 9 * s, 4 * s, 0.3, 0, TAU); c.fill();
  c.fillStyle = pick(p, "#d9cfa8", "#28344e"); c.beginPath(); c.ellipse(x + 13 * s, y + 1 * s, (4 + 3 * th) * s, (2.5 + 2.5 * th) * s, 0, 0, TAU); c.fill(); // throat pulse
  c.fillStyle = pick(p, "#120b08", "#000"); c.beginPath(); c.arc(x + 15 * s, y - 9 * s, 2 * s, 0, TAU); c.fill();
}
function snailEggs(g: C2, p: Pal, x: number, y: number, s: number) {
  g.strokeStyle = pick(p, "#6e5a3a", "#0e1524"); g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3 * s, y - 120 * s); g.stroke();
  for (let i = 0; i < 46; i++) { const ex = x + 1.5 * s + (hs(i, 41) - 0.5) * 12 * s, ey = y - 70 * s - hs(i, 42) * 34 * s; g.fillStyle = pick(p, hs(i, 43) > 0.4 ? "#e9708e" : "#f39bb0", "#3a2a40"); g.beginPath(); g.arc(ex, ey, 2.4 * s, 0, TAU); g.fill(); }
}

/** the still water of the lower terrace: faint upside-down tree/palm reflections, floating leaves, duckweed, larva rings (calm under the captions) */
function waterReflect(g: C2, p: Pal, y0: number, y1: number, seed: number) {
  g.save(); g.beginPath(); g.rect(-PAD, y0, W + 2 * PAD, y1 - y0); g.clip();
  g.fillStyle = pick(p, "rgba(90,80,54,0.16)", "rgba(10,16,28,0.28)");
  const rg = g.createLinearGradient(0, y0, 0, y0 + 140); rg.addColorStop(0, pick(p, "rgba(90,80,54,0.2)", "rgba(10,16,28,0.3)")); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; // soft band: reflected bank
  g.fillRect(-PAD, y0, W + 2 * PAD, 140);
  g.strokeStyle = pick(p, "rgba(255,250,232,0.45)", "rgba(120,135,165,0.25)"); g.lineWidth = 2.5;
  for (let i = 0; i < 14; i++) { const x = hs(i, seed + 310) * W, y = y0 + 30 + hs(i, seed + 311) * (y1 - y0 - 40); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 50 + 120 * hs(i, seed + 312), y); g.stroke(); }
  for (let i = 0; i < 22; i++) { const x = hs(i, seed + 320) * W, y = y0 + 20 + hs(i, seed + 321) * (y1 - y0 - 30), r = 4 + 7 * hs(i, seed + 322); g.fillStyle = pick(p, "rgba(80,86,46,0.55)", "rgba(12,20,30,0.6)"); g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.5, 0, 0, TAU); g.fill(); }
  g.strokeStyle = pick(p, "rgba(60,50,30,0.25)", "rgba(110,125,155,0.2)"); g.lineWidth = 1.2;
  for (let i = 0; i < 10; i++) { const x = hs(i, seed + 330) * W, y = y0 + 40 + hs(i, seed + 331) * (y1 - y0 - 60); for (let r = 1; r < 3; r++) { g.beginPath(); g.ellipse(x, y, r * 12, r * 3, 0, 0, TAU); g.stroke(); } }
  g.restore();
}

// ================================================================= RESCUE
const [RA, RB] = SHOT_RANGE("rescue");
const WARGA = CUE("warga"), ALAS = CUE("alasSriti"), LEMAS = CUE("lemas");
const THUD = WARGA + 0.5;                       // cangkul hits the mud (audio thud)
const DROP0 = THUD - 0.42;                      // released from the shoulder
const HZ_A = 610, REF_A = 1080, HF = SIZE.wide; // wide setup: standing adult 672 px on the front pematang
const scA = (y: number) => (y - HZ_A) / (REF_A - HZ_A);
const PATH_Y = 1075, LIP_Y = 930, NAAM_Y = 965;
const HN_A = HF * scA(NAAM_Y), NAAM_HEAD = 600, NAAM_FX = NAAM_HEAD + HN_A;
const FX0 = 110, FSTOP = 300, KNEEL_X = 450, KNEEL_Y = 990;
const HURRY0 = WARGA + 0.95, HURRY1 = HURRY0 + 1.0;

/** lying on his back (figure rotated): near knee raised, far arm across the belly, near arm on the grass, head rolled back; the hand stirs when the farmer reaches him */
const naamPoseA = (t: number): SidePose => { const stir = settle(t, HURRY1, HURRY1 + 0.9, 0, 1);
  return { dir: 1, walk: 0.5, stride: 1.6, reachF: [0.085 * HN_A, -0.6 * HN_A - 0.03 * HN_A * stir], armB: [-0.06 + 0.16 * stir, 0.08 + 0.3 * stir], head: -0.26 + 0.1 * stir, jaw: 0.25, breath: t * TAU / 2.2, idle: { t, seed: 5, amount: 0.3 } }; };
const rotP = (fx: number, fy: number, th: number, q: P2): P2 => [fx + q[0] * Math.cos(th) - q[1] * Math.sin(th), fy + q[0] * Math.sin(th) + q[1] * Math.cos(th)];
/** lay the rotated figure ON the ground: back of the shoulders and the straight leg's heel both touch NAAM_Y */
function naamXformA(t: number) {
  const J = sideJoints(0, 0, HN_A, naamPoseA(t)), u = HN_A;
  const B: P2 = [J.local.sh[0] - 0.05 * u, J.local.sh[1]], F: P2 = [J.local.LB.a[0] - 0.02 * u, J.local.LB.a[1]];
  let th = Math.atan2(-(B[1] - F[1]), B[0] - F[0]); if (th > 0) th -= Math.PI; if (Math.abs(th + Math.PI / 2) > 0.4) th = -Math.PI / 2;
  const fy = NAAM_Y + 2 - (B[0] * Math.sin(th) + B[1] * Math.cos(th));
  return { J, th, fx: NAAM_FX, fy };
}

type FState = { x: number; y: number; h: number; pose: SidePose; carry: boolean };
function farmerA(t: number): FState {
  const cycle = FSTOP - FX0;
  if (t < WARGA) {
    const q = clamp((t - RA) / (WARGA - RA)), x = FX0 + cycle * easeOut2(q);
    return { x, y: PATH_Y, h: HF * scA(PATH_Y), carry: true, pose: { dir: 1, walk: ((x - FX0) / cycle) * TAU, stride: (cycle / (0.69 * HF)) * 1.0, head: 0.38, armB: [0.32, 1.95], idle: { t, seed: 11, amount: 0.5 } } };
  }
  if (t < HURRY0) { // stops, lifts his head toward the man at the forest edge, lets the cangkul go
    const look = settle(t, WARGA, WARGA + 0.85, 0.38, -0.02);
    const rel = move(t, DROP0 - 0.05, DROP0 + 0.25, 0, 1);
    return { x: FSTOP, y: PATH_Y, h: HF * scA(PATH_Y), carry: t < DROP0, pose: { dir: 1, head: look, lean: 0.04 * rel, armB: [lerp(0.32, 0.12, rel), lerp(1.95, 0.35, rel)], armF: [0.12 + 0.18 * rel, 0.3], idle: { t, seed: 11, amount: 0.4 } } };
  }
  if (t < HURRY1) { // hurries (eased, calm) up onto the grass strip
    const q = move(t, HURRY0, HURRY1, 0, 1), x = lerp(FSTOP, KNEEL_X, q), y = lerp(PATH_Y, KNEEL_Y, q);
    return { x, y, h: HF * scA(y), carry: false, pose: { dir: 1, walk: q * TAU * 1.5, stride: 0.7, lean: 0.1 + 0.06 * q, head: 0.05 + 0.15 * q, idle: { t, seed: 11, amount: 0.3 } } };
  }
  // drops into a crouch beside him, one hand to the shoulder, the other to his cheek
  const b = settle(t, HURRY1, HURRY1 + 0.55, 0, 1, 0.04), h = HF * scA(KNEEL_Y);
  const X = naamXformA(t), shN = rotP(X.fx, X.fy, X.th, X.J.local.sh), hdN = rotP(X.fx, X.fy, X.th, X.J.local.head);
  return { x: KNEEL_X, y: KNEEL_Y, h, carry: false, pose: { dir: 1, sit: lerp(0.36, 0.2, b) * h, lean: lerp(0.25, 0.62, b), head: lerp(0.2, 0.5, b), reachF: [lerp(KNEEL_X + 0.3 * h, shN[0] + 6, b), lerp(KNEEL_Y - 0.4 * h, shN[1] - 4, b)], reachB: [lerp(KNEEL_X + 0.25 * h, hdN[0] - 4, b), lerp(KNEEL_Y - 0.35 * h, hdN[1] + 8, b)], idle: { t, seed: 11, amount: 0.3 } } };
}
/** cangkul: handle + blade; (hx,hy) = grip end, ang = handle direction from the grip (rad from +x) */
function cangkul(c: C2, p: Pal, hx: number, hy: number, ang: number, len: number, flat = 0) {
  const ex = hx + Math.cos(ang) * len, ey = hy + Math.sin(ang) * len, nx = -Math.sin(ang), ny = Math.cos(ang);
  c.strokeStyle = pick(p, "#5b4128", "#04060c"); c.lineWidth = len * 0.028; c.lineCap = "round"; c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
  const bl = len * 0.3 * (1 - 0.7 * flat), bw = len * 0.2, s = Math.sign(ny) || 1; // blade hangs perpendicular toward the ground side
  c.fillStyle = pick(p, "#4a4a48", "#05070c");
  c.beginPath(); c.moveTo(ex - Math.cos(ang) * bw * 0.5, ey - Math.sin(ang) * bw * 0.5); c.lineTo(ex + Math.cos(ang) * bw * 0.5, ey + Math.sin(ang) * bw * 0.5);
  c.lineTo(ex + Math.cos(ang) * bw * 0.55 + nx * bl * s, ey + Math.sin(ang) * bw * 0.55 + ny * bl * s); c.lineTo(ex - Math.cos(ang) * bw * 0.55 + nx * bl * s, ey - Math.sin(ang) * bw * 0.55 + ny * bl * s); c.closePath(); c.fill();
  if (lit(p)) { c.strokeStyle = "rgba(255,250,235,0.6)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ex - Math.cos(ang) * bw * 0.5 + nx * bl * s * 0.92, ey - Math.sin(ang) * bw * 0.5 + ny * bl * s * 0.92); c.lineTo(ex + Math.cos(ang) * bw * 0.5 + nx * bl * s * 0.92, ey + Math.sin(ang) * bw * 0.5 + ny * bl * s * 0.92); c.stroke(); }
}
/** where the carried cangkul sits: from the near hand over the shoulder, blade behind */
function carriedHoe(J: ReturnType<typeof sideJoints>): { x: number; y: number; ang: number } {
  const hx = J.AB.ha[0], hy = J.AB.ha[1], sx = J.sh[0], sy = J.sh[1] - 0.03 * J.u;
  return { x: hx + 0.05 * J.u, y: hy + 0.03 * J.u, ang: Math.atan2(sy - hy, sx - hx) };
}

function rescueFarBG(g: C2, p: Pal) {
  skyMorning(g, p, HZ_A + 60, 840, 360);
  arjuno(g, p, 470, HZ_A + 10, 1.0);
  ridge(g, p, HZ_A + 4, 34, 2.1, "#a8a28a", "#2c3852", 9);
  ridge(g, p, HZ_A + 30, 22, 4.7, "#9b9880", "#25304a", 7);
}
function rescueMidA(g: C2, p: Pal) {
  const ys = [640, 662, 690, 726, 772, 830, 900, 1000];
  terraces(g, p, ys, -PAD, 760, HZ_A, REF_A, 1.3);
  // ravine forest rising behind the lip (right): trunks hidden below the lip, canopy above
  const leaf = pick(p, "#4a4630", "#0b1220"), leafL = pick(p, "#625c3e", "#121a2c"), bark = pick(p, "#3a3122", "#070c16");
  for (let k = 0; k < 14; k++) { const x = 600 + hs(k, 7) * 560, top = 420 + hs(k, 8) * 260, w = 10 + 14 * hs(k, 9); g.fillStyle = bark; g.fillRect(x - w / 2, top, w, LIP_Y - top + 10); g.strokeStyle = bark; g.lineWidth = 4; g.beginPath(); g.moveTo(x, top + 80); g.lineTo(x + (hs(k, 10) - 0.5) * 140, top + 20); g.stroke(); }
  for (let k = 0; k < 80; k++) { // leaf clumps: lobed edge, ink outline, leaf ticks (woodcut)
    const x = 620 + hs(k, 11) * 560, y = 420 + hs(k, 12) * 420 + Math.max(0, 700 - x) * 0.4, r = 26 + 44 * hs(k, 13);
    g.beginPath(); for (let i = 0; i <= 18; i++) { const a = (i / 18) * TAU, rr = r * (0.82 + 0.18 * Math.sin(a * 5 + k)); if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72); }
    g.closePath(); g.fillStyle = k % 3 ? leaf : leafL; g.fill();
    if (lit(p)) { g.strokeStyle = "rgba(24,18,10,0.7)"; g.lineWidth = 1.6; g.stroke(); g.lineWidth = 1.2; for (let q = 0; q < 22; q++) { const a = hs(q, k) * TAU, rr = r * (0.2 + 0.7 * hs(q, k + 3)), lx = x + Math.cos(a) * rr, ly = y + Math.sin(a) * rr * 0.6 + r * 0.1; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 5, ly + 5); g.stroke(); } }
  }
  // hanging moss beards + vines
  g.strokeStyle = pick(p, "#4d5034", "#0a111e"); g.lineWidth = 1.4;
  for (let k = 0; k < 40; k++) { const x = 640 + hs(k, 21) * 460, y = 520 + hs(k, 22) * 300, L = 20 + 50 * hs(k, 23); for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(x + q * 3, y); g.quadraticCurveTo(x + q * 3 + 4, y + L * 0.5, x + q * 3 - 2, y + L * (0.7 + 0.3 * hs(q, k))); g.stroke(); } }
  // mist pooled in the ravine
  const mg = g.createLinearGradient(0, 760, 0, LIP_Y); mg.addColorStop(0, "rgba(0,0,0,0)"); mg.addColorStop(1, pick(p, "rgba(236,228,206,0.7)", "rgba(80,92,116,0.55)"));
  g.fillStyle = mg; g.fillRect(560, 760, 700, LIP_Y - 760 + 6);
  // grass strip in front of the lip (where he lies) + the lip rocks
  grassField(g, p, [[560, LIP_Y], [W + PAD, LIP_Y - 8], [W + PAD, 1046], [520, 1046], [540, 990]], LIP_Y - 10, 1046, 520, W + PAD, HZ_A, REF_A, 3);
  for (let i = 0; i < 26; i++) { const x = 570 + i * 22 + hs(i, 31) * 10, y = LIP_Y + 4 + hs(i, 32) * 8, r = 6 + 9 * hs(i, 33); g.fillStyle = pick(p, hs(i, 34) > 0.5 ? "#8c7f62" : "#6c624c", "#101828"); g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, Math.PI, 0); g.fill(); if (lit(p)) { g.strokeStyle = "rgba(24,18,10,0.6)"; g.lineWidth = 1.2; g.stroke(); } }
  // ferns along the lip
  for (let k = 0; k < 12; k++) {
    const fx = 590 + k * 46 + hs(k, 35) * 20, fy = LIP_Y + 10, L = 40 + 30 * hs(k, 36);
    for (let f = 0; f < 5; f++) { const a = -Math.PI / 2 + (f - 2) * 0.45; g.strokeStyle = pick(p, "#4f5430", "#0b1220"); g.lineWidth = 1.6; const ex = fx + Math.cos(a) * L, ey = fy + Math.sin(a) * L * 0.8; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + Math.cos(a) * L * 0.5, fy + Math.sin(a) * L - 8, ex, ey + 6); g.stroke(); for (let q = 1; q < 7; q++) { const px = fx + (ex - fx) * q / 7, py = fy + (ey - fy) * q / 7 - 4; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 6, py - 4); g.moveTo(px, py); g.lineTo(px - 5, py - 5); g.stroke(); } }
  }
  // scarecrow far in the terraces + bamboo fence on the far bund
  bambooFence(g, p, 40, 300, 726, 34, 0.5);
}
function rescueFrontA(g: C2, p: Pal) {
  // front pematang path (mud) where he walks
  g.fillStyle = pick(p, "#9a8660", "#121a2a"); g.beginPath(); g.moveTo(-PAD, 1040); for (let x = -PAD; x <= W + PAD; x += 30) g.lineTo(x, 1040 + 4 * Math.sin(x * 0.01)); g.lineTo(W + PAD, 1092); g.lineTo(-PAD, 1092); g.closePath(); g.fill();
  if (lit(p)) { g.strokeStyle = "rgba(40,30,16,0.35)"; g.lineWidth = 2; for (let i = 0; i < 60; i++) { const x = hs(i, 51) * (W + 300) - 150, y = 1046 + hs(i, 52) * 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + 30 * hs(i, 53), y + 1); g.stroke(); } }
  footprints(g, p, -40, 1064, 9, 44, 1, 3); footprints(g, p, 420, 1058, 7, -46, 0.9, 7);
  pebbles(g, p, -100, W + 100, 1044, 1088, 40, 1, 61);
  g.lineWidth = 1.6; for (let x = -PAD; x <= W + PAD; x += 7) { const y = 1041 + 4 * Math.sin(x * 0.01), gh = 6 + 12 * hash(x * 0.3); g.strokeStyle = pick(p, "#4f4a2c", "#0b1220"); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - gh); g.moveTo(x, y); g.lineTo(x + 4, y - gh * 0.8); g.stroke(); }
  // irrigation channel: banks of stacked stones, water
  const wg = g.createLinearGradient(0, 1090, 0, 1142); wg.addColorStop(0, pick(p, "#b9ae92", "#2c3850")); wg.addColorStop(1, pick(p, "#e2d8bc", "#46526c"));
  g.fillStyle = wg; g.fillRect(-PAD, 1090, W + 2 * PAD, 52);
  for (let x = -PAD; x < W + PAD; x += 26) { const r = 9 + 5 * hash(x * 0.9); g.fillStyle = pick(p, hash(x) > 0.5 ? "#7c6e54" : "#958567", "#0f1626"); g.beginPath(); g.ellipse(x + 13, 1144, r * 1.4, r * 0.8, 0, 0, TAU); g.fill(); if (lit(p)) { g.strokeStyle = "rgba(22,16,10,0.6)"; g.lineWidth = 1.2; g.stroke(); } }
  // sluice gate (pintu air): two posts, plank gate raised a little, crossbar, rope
  const gx = 360; box(g, p, gx - 34, 1028, 12, 128, pick(p, "#6b5132", "#0b111e"), 0.4, 71, 0.2, 2); box(g, p, gx + 22, 1028, 12, 128, pick(p, "#6b5132", "#0b111e"), 0.4, 72, 0.2, 2);
  box(g, p, gx - 40, 1024, 80, 9, pick(p, "#7d5f3a", "#0d1424"), 0.3, 73, 1.57, 2); box(g, p, gx - 22, 1072, 44, 30, pick(p, "#8e6e44", "#111a2c"), 0.5, 74, 1.57, 2);
  g.strokeStyle = pick(p, "#3a2a16", "#05070c"); g.lineWidth = 2; g.beginPath(); g.moveTo(gx, 1033); g.lineTo(gx, 1072); g.stroke();
  // lower terrace: calm water mirror (caption zone) with a few far-spaced rows of seedlings
  const lg = g.createLinearGradient(0, 1146, 0, 1560); lg.addColorStop(0, pick(p, "#cbb58a", "#303b54")); lg.addColorStop(1, pick(p, "#e6d1a4", "#46516a"));
  g.fillStyle = lg; g.fillRect(-PAD, 1146, W + 2 * PAD, 420);
  terraces(g, p, [1478, 1560], -PAD, W + PAD, HZ_A, REF_A, 4.1, 0.35);
  g.strokeStyle = pick(p, "rgba(255,252,238,0.5)", "rgba(120,135,165,0.3)"); g.lineWidth = 3; for (let i = 0; i < 10; i++) { const x = hs(i, 81) * W, y = 1260 + hs(i, 82) * 260; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 80 + 120 * hs(i, 83), y); g.stroke(); }
  waterReflect(g, p, 1150, 1470, 1);
  // bottom bank: mud, grass, stones, golden-snail eggs on a stake, a banana clump
  g.fillStyle = pick(p, "#8b7856", "#0f1626"); g.beginPath(); g.moveTo(-PAD, 1590); for (let x = -PAD; x <= W + PAD; x += 30) g.lineTo(x, 1580 + 14 * Math.sin(x * 0.008 + 1)); g.lineTo(W + PAD, H + PAD); g.lineTo(-PAD, H + PAD); g.closePath(); g.fill();
  pebbles(g, p, -60, W + 60, 1600, 1760, 40, 1.6, 91);
  g.lineWidth = 2.2; for (let i = 0; i < 260; i++) { const x = hs(i, 92) * (W + 200) - 100, y = 1590 + hs(i, 93) * 300, gh = 14 + 26 * hs(i, 94); g.strokeStyle = pick(p, hs(i, 95) > 0.5 ? "#4d482a" : "#6c6440", "#0b1220"); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y - gh * 0.6, x + (hs(i, 96) - 0.5) * 18, y - gh); g.stroke(); }
  snailEggs(g, p, 840, 1600, 1.1);
  footprints(g, p, 180, 1660, 6, 60, 1.6, 13);
}

function drawRescueA(c: C2, p: Pal, t: number, L: (d: number) => void) {
  L(0.6); cached(c, p, "rA_far", (g) => rescueFarBG(g, p));
  fogBand(c, p, HZ_A + 20, 70, lit(p) ? 0.35 : 0.3, t, 1);
  // a pair of swallows far over the hills
  c.strokeStyle = pick(p, "#3a3226", "#0a0f1a"); c.lineWidth = 2;
  for (let k = 0; k < 3; k++) { const bx = 120 + ((t - RA) * 26 + k * 60) % 900, by = 470 + k * 16 + 8 * Math.sin(t * 1.3 + k), fl = 5 * Math.sin(t * 9 + k); c.beginPath(); c.moveTo(bx - 9, by - fl); c.lineTo(bx, by); c.lineTo(bx + 9, by - fl); c.stroke(); }
  L(1); cached(c, p, "rA_mid", (g) => rescueMidA(g, p));
  scarecrow(c, p, 250, 830, 0.55, t);
  egret(c, p, 120, 892, 1.4, t, 1); egret(c, p, 470, 812, 1.0, t, 2, -1); egret(c, p, 360, 742, 0.7, t, 3);
  fogBand(c, p, 760, 50, lit(p) ? 0.28 : 0.22, t, 3, -200, 720);
  // Naam at the forest edge: lying on his back, head toward the farmer; breathes; a hand lifts when the farmer reaches him
  {
    const X = naamXformA(t), sh = rotP(X.fx, X.fy, X.th, X.J.local.sh), hd = rotP(X.fx, X.fy, X.th, X.J.local.head);
    // pack lying behind his shoulders, one strap still on
    box(c, p, sh[0] + 14, NAAM_Y - 74, 92, 62, pick(p, "#5c4630", "#060a14"), 0.5, 101, 0.8, 2);
    box(c, p, sh[0] + 30, NAAM_Y - 88, 60, 16, pick(p, "#7a6a4a", "#0a0f1c"), 0.3, 102, 1.57, 2); // rolled mat
    // contact shadow along the whole body
    c.fillStyle = pick(p, "rgba(36,26,14,0.45)", "rgba(0,0,0,0.45)");
    c.beginPath(); c.ellipse((hd[0] + X.fx) / 2, NAAM_Y + 3, (X.fx - hd[0]) * 0.55, 9, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(sh[0] + 60, NAAM_Y + 2, 110, 7, 0, 0, TAU); c.ellipse(hd[0], NAAM_Y + 2, 40, 6, 0, 0, TAU); c.fill();
    c.save(); c.translate(X.fx, X.fy); c.rotate(X.th); hiker(c, p, 0, 0, HN_A, p.fig, naamPoseA(t), { t, pack: false, weak: 1, beanie: true, lamp: 0, breathFog: 0.5 }); c.restore();
    c.strokeStyle = p.fig; c.lineWidth = 6; c.beginPath(); c.moveTo(sh[0] - 6, sh[1] - 4); c.quadraticCurveTo(sh[0] + 20, NAAM_Y - 46, sh[0] + 30, NAAM_Y - 36); c.stroke(); // strap over the shoulder
    // grass blades in front of him so he lies IN the grass
    for (let k = 0; k < 60; k++) { const gx = hd[0] - 40 + k * ((X.fx - hd[0] + 60) / 60) + hs(k, 171) * 6, gh = 8 + 16 * hs(k, 172), sw = 2 * Math.sin(t * 0.9 + k * 0.7) * (0.6 + 0.4 * gust(t)); c.strokeStyle = pick(p, hs(k, 173) > 0.5 ? "#4f4a2c" : "#6c6440", "#0b1220"); c.lineWidth = 1.6; c.beginPath(); c.moveTo(gx, NAAM_Y + 8); c.quadraticCurveTo(gx + sw * 0.5, NAAM_Y + 8 - gh * 0.6, gx + sw + (hs(k, 174) - 0.5) * 8, NAAM_Y + 8 - gh); c.stroke(); }
    // ferns over his boots (frame edge), swaying lightly
    for (let k = 0; k < 4; k++) { const fx = 960 + k * 40, a0 = 0.05 * Math.sin(t * 0.9 + k) + 0.04 * gust(t); c.strokeStyle = pick(p, "#4a502c", "#0a111e"); c.lineWidth = 2; for (let f = 0; f < 5; f++) { const a = -Math.PI / 2 + (f - 2) * 0.42 + a0, L2 = 70 + 16 * hs(k, f); c.beginPath(); c.moveTo(fx, NAAM_Y + 8); c.quadraticCurveTo(fx + Math.cos(a) * L2 * 0.5, NAAM_Y + 8 + Math.sin(a) * L2 - 10, fx + Math.cos(a) * L2, NAAM_Y + 8 + Math.sin(a) * L2 * 0.75); c.stroke(); } }
  }
  L(1); cached(c, p, "rA_front", (g) => rescueFrontA(g, p));
  // water flowing in the channel: drifting glints + ripple lines (flow to the right), foam at the sluice
  const flow = (t - RA) * 60;
  for (let i = 0; i < 36; i++) { const x = ((hs(i, 111) * (W + 300) + flow * (0.7 + 0.6 * hs(i, 112))) % (W + 300)) - 150, y = 1096 + hs(i, 113) * 40, tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.3);
    c.strokeStyle = pick(p, `rgba(255,253,240,${0.45 + 0.4 * tw})`, `rgba(140,160,195,${0.25 + 0.25 * tw})`); c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 2, x + 18 + 14 * hs(i, 114), y); c.stroke(); }
  for (let k = 0; k < 6; k++) { const q = ((t * 1.3 + k / 6) % 1); c.strokeStyle = pick(p, `rgba(255,255,250,${0.75 * (1 - q)})`, `rgba(160,180,210,${0.4 * (1 - q)})`); c.lineWidth = 2.5; c.beginPath(); c.arc(388 + q * 40, 1104 + k * 5, 6 + q * 8, -0.6, 0.6); c.stroke(); }
  // the farmer's reflection in the channel
  const F = farmerA(t);
  c.save(); c.beginPath(); c.rect(-PAD, 1092, W + 2 * PAD, 50); c.clip(); c.translate(0, 2 * 1086); c.scale(1, -1); c.globalAlpha = lit(p) ? 0.16 : 0.22;
  if (F.y > 1060) farmer(c, p, F.x, F.y, F.h, p.fig, F.pose, { t, tool: "none", seed: 1 }); c.restore(); c.globalAlpha = 1;
  // falling + fallen cangkul (released at DROP0, thud in the mud at THUD), then a few mud drops
  const J = farmer(c, p, F.x, F.y, F.h, p.fig, F.pose, { t, tool: "none", seed: 1 });
  if (F.carry) { const h = carriedHoe(J); cangkul(c, p, h.x, h.y, h.ang, 0.62 * F.h); }
  else {
    const J0 = sideJoints(FSTOP, PATH_Y, HF * scA(PATH_Y), farmerA(DROP0 - 0.001).pose), h0 = carriedHoe(J0);
    const q = clamp((t - DROP0) / (THUD - DROP0)), qq = q * q;
    const len = 0.62 * HF * scA(PATH_Y), gx0 = FSTOP + 60;      // slips off and lands in front of him, lying along the path
    const x = lerp(h0.x, gx0, qq), y = lerp(h0.y, PATH_Y - 22, qq), a = lerp(h0.ang, -0.02, qq);
    cangkul(c, p, x, y, a, len, qq);
    const bx = gx0 + Math.cos(-0.02) * len, sp = t - THUD;
    if (sp > 0 && sp < 0.6) for (let k = 0; k < 7; k++) { const ang = -Math.PI * (0.15 + 0.7 * hs(k, 121)), v = 90 + 60 * hs(k, 122), dx = Math.cos(ang) * v * sp, dy = Math.sin(ang) * v * sp + 300 * sp * sp; c.fillStyle = pick(p, `rgba(70,52,30,${1 - sp / 0.6})`, `rgba(5,7,12,${1 - sp / 0.6})`); c.beginPath(); c.arc(bx + dx, PATH_Y - 14 + dy, 3, 0, TAU); c.fill(); }
  }
  dragonfly(c, p, 600, 1010, 1.3, t, 1); dragonfly(c, p, 200, 980, 1.1, t, 4); dragonfly(c, p, 760, 1180, 1.4, t, 7);
  ducks(c, p, lerp(420, 620, (t - RA) / (ALAS - RA)), 1540, 1.5, t);
  frog(c, p, 120, 1612, 1.8, t, 1);
  fogBand(c, p, 1000, 46, lit(p) ? 0.18 : 0.16, t, 5);
  fg(c, p, L, () => { for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(-30 + k * 26, H - 90, 22, 220, -0.35 + k * 0.12 + 0.04 * Math.sin(t + k), 0, TAU); c.fill(); } c.beginPath(); c.ellipse(W + 20, H - 120, 40, 260, 0.3 + 0.03 * Math.sin(t * 0.8), 0, TAU); c.fill(); }, 8);
}

// ---------------- setup B: wide, carried along the pematang toward the village
const HZ_B = 700, REF_B = 1115, HB = 0.23 * H; // standing adult 442 px in the wide village view (heads stay below the beat stamp)
const scB = (y: number) => (y - HZ_B) / (REF_B - HZ_B);
const FEET_B = 1115;
function rescueFarB(g: C2, p: Pal) {
  skyMorning(g, p, HZ_B + 60, 300, 560);
  arjuno(g, p, 800, HZ_B + 8, 0.85);
  ridge(g, p, HZ_B + 2, 26, 3.3, "#a6a088", "#2b3750", 7);
  ridge(g, p, HZ_B + 22, 16, 6.1, "#99967e", "#25304a", 6);
  // the village: tile-roof houses, a fence, a motorbike, the mosque with its loudspeaker horn
  const hy = 752;
  [[40, 0.62, 1], [150, 0.7, 2], [260, 0.66, 3], [380, 0.6, 4], [640, 0.58, 5], [760, 0.54, 6], [-50, 0.58, 7]].forEach(([x, s, sd]) => house(g, p, x, hy + (sd % 2) * 6, s, sd));
  mosque(g, p, 520, hy + 2, 0.62);
  bambooFence(g, p, 60, 330, hy + 18, 16, 0.45);
  motorbike(g, p, 330, hy + 16, 0.6);
  terraces(g, p, [762, 772, 786, 804, 828, 858, 896, 944, 1004, 1080], -PAD, W + PAD, HZ_B, REF_B, 2.6);
  // footpath from the pematang up to the village
  g.strokeStyle = pick(p, "#a8946a", "#162034"); g.lineCap = "round";
  for (let k = 0; k < 24; k++) { const q = k / 24, x = lerp(60, 300, q), y = lerp(1082, 768, Math.pow(q, 0.8)), w = lerp(26, 4, q); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(lerp(60, 300, q + 1 / 24), lerp(1082, 768, Math.pow(q + 1 / 24, 0.8))); g.stroke(); }
  for (const [x, s, sd] of [[500, 120, 1], [612, 96, 2], [80, 150, 3]] as [number, number, number][]) bananaTree(g, p, x, 764 + sd * 2, s, 0, sd);
  // near pematang (carry path), channel, lower field (caption zone, calm), bank
  g.fillStyle = pick(p, "#9a8660", "#121a2a"); g.beginPath(); g.moveTo(-PAD, 1082); for (let x = -PAD; x <= W + PAD; x += 30) g.lineTo(x, 1082 + 3 * Math.sin(x * 0.011)); g.lineTo(W + PAD, 1134); g.lineTo(-PAD, 1134); g.closePath(); g.fill();
  footprints(g, p, 1060, 1100, 16, -56, 0.8, 21); footprints(g, p, 1040, 1116, 16, -58, 0.8, 22, false); pebbles(g, p, -100, W + 100, 1086, 1130, 36, 0.8, 131);
  g.lineWidth = 1.3; for (let x = -PAD; x <= W + PAD; x += 6) { const y = 1083 + 3 * Math.sin(x * 0.011), gh = 4 + 9 * hash(x * 0.3); g.strokeStyle = pick(p, "#4f4a2c", "#0b1220"); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - gh); g.moveTo(x, y); g.lineTo(x + 3, y - gh * 0.8); g.stroke(); }
  const wg = g.createLinearGradient(0, 1134, 0, 1168); wg.addColorStop(0, pick(p, "#b9ae92", "#2c3850")); wg.addColorStop(1, pick(p, "#e2d8bc", "#46526c")); g.fillStyle = wg; g.fillRect(-PAD, 1134, W + 2 * PAD, 34);
  for (let x = -PAD; x < W + PAD; x += 22) { const r = 7 + 4 * hash(x * 0.9); g.fillStyle = pick(p, hash(x) > 0.5 ? "#7c6e54" : "#958567", "#0f1626"); g.beginPath(); g.ellipse(x + 11, 1170, r * 1.4, r * 0.8, 0, 0, TAU); g.fill(); }
  const lg = g.createLinearGradient(0, 1174, 0, 1580); lg.addColorStop(0, pick(p, "#cbb58a", "#303b54")); lg.addColorStop(1, pick(p, "#e6d1a4", "#46516a")); g.fillStyle = lg; g.fillRect(-PAD, 1174, W + 2 * PAD, 430);
  waterReflect(g, p, 1176, 1470, 2);
  terraces(g, p, [1480, 1556], -PAD, W + PAD, HZ_B, REF_B, 5.2, 0.4);
  g.strokeStyle = pick(p, "rgba(255,252,238,0.5)", "rgba(120,135,165,0.3)"); g.lineWidth = 3; for (let i = 0; i < 9; i++) { const x = hs(i, 141) * W, y = 1250 + hs(i, 142) * 280; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 70 + 110 * hs(i, 143), y); g.stroke(); }
  g.fillStyle = pick(p, "#8b7856", "#0f1626"); g.beginPath(); g.moveTo(-PAD, 1610); for (let x = -PAD; x <= W + PAD; x += 30) g.lineTo(x, 1600 + 12 * Math.sin(x * 0.009 + 2)); g.lineTo(W + PAD, H + PAD); g.lineTo(-PAD, H + PAD); g.closePath(); g.fill();
  pebbles(g, p, -60, W + 60, 1620, 1780, 36, 1.5, 151);
  g.lineWidth = 2.2; for (let i = 0; i < 240; i++) { const x = hs(i, 152) * (W + 200) - 100, y = 1610 + hs(i, 153) * 300, gh = 14 + 24 * hs(i, 154); g.strokeStyle = pick(p, hs(i, 155) > 0.5 ? "#4d482a" : "#6c6440", "#0b1220"); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y - gh * 0.6, x + (hs(i, 156) - 0.5) * 18, y - gh); g.stroke(); }
  snailEggs(g, p, 120, 1630, 1.0);
}
const naamPoseB = (t: number): SidePose => {
  const hang = settle(t, LEMAS, LEMAS + 0.95, 0, 1, 0.05);
  return { dir: -1, walk: 1.1, stride: 0.35, head: lerp(-0.12, -0.78, hang) + 0.05 * Math.sin(t * 3.6), armF: [-1.35 + 0.08 * Math.sin(t * 3.6 + 1), 0.25], armB: [-1.15 + 0.08 * Math.sin(t * 3.6 + 2), 0.35], breath: t * TAU / 2.0 };
};
function carryState(t: number) {
  const dist = (t - ALAS) * 62, gx = 700 - dist;           // slow, steady carry to the left
  const ph = (dist / (0.69 * HB * 0.55)) * TAU;               // short steps (stride 0.55)
  const bob = 5 * Math.abs(Math.sin(ph));
  const th = Math.PI / 2 - 0.2, fx = gx - 0.5 * HB, fy = FEET_B - 0.5 * HB + bob;
  const Jn = sideJoints(0, 0, HB, naamPoseB(t)), knee = rotP(fx, fy, th, Jn.local.LF.k), sh = rotP(fx, fy, th, Jn.local.sh);
  return { gx, ph, th, fx, fy, knee, sh };
}
function drawRescueB(c: C2, p: Pal, t: number, L: (d: number) => void) {
  L(0.6); cached(c, p, "rB_far", (g) => rescueFarB(g, p));
  // village life: palms swaying, kitchen smoke, a dog on the path that lifts its head as they come
  for (const [x, h, sd] of [[730, 175, 1], [812, 210, 2], [890, 160, 3], [-10, 150, 4]] as [number, number, number][]) coconut(c, p, x, 758, h, t, sd);
  smoke(c, p, 160, 712, t, 200, 0.8, 1); smoke(c, p, 650, 718, t + 3, 170, 0.7, 2);
  fogBand(c, p, HZ_B + 40, 60, lit(p) ? 0.35 : 0.3, t, 7);
  for (let k = 0; k < 3; k++) { const bx = 500 + ((t - ALAS) * 22 + k * 70) % 600, by = 560 + k * 14 + 6 * Math.sin(t * 1.4 + k), fl = 5 * Math.sin(t * 9 + k * 2); c.strokeStyle = pick(p, "#3a3226", "#0a0f1a"); c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 8, by - fl); c.lineTo(bx, by); c.lineTo(bx + 8, by - fl); c.stroke(); }
  L(1);
  egret(c, p, 180, 905, 1.0 * scB(905) / 0.6, t, 4); egret(c, p, 980, 960, 1.15, t, 5, -1); egret(c, p, 600, 845, 0.7, t, 6);
  scarecrow(c, p, 900, 1000, 0.62, t);
  fogBand(c, p, 850, 40, lit(p) ? 0.22 : 0.18, t, 9);
  // dog lying on the path ahead: lifts its head, ears up
  { const lift = settle(t, ALAS + 0.9, ALAS + 1.8, 0, 1), x = 150, y = FEET_B - 4, s = 1.25; c.fillStyle = p.fig;
    c.beginPath(); c.ellipse(x, y - 12 * s, 40 * s, 13 * s, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x - 34 * s, y - 4 * s, 18 * s, 5 * s, 0, 0, TAU); c.fill();
    const hx = x + 40 * s, hy = y - 14 * s - 18 * s * lift; c.lineWidth = 12 * s; c.strokeStyle = p.fig; c.beginPath(); c.moveTo(x + 28 * s, y - 16 * s); c.lineTo(hx, hy); c.stroke();
    c.beginPath(); c.ellipse(hx + 8 * s, hy, 13 * s, 9 * s, 0.2 - 0.3 * lift, 0, TAU); c.fill(); c.beginPath(); c.moveTo(hx + 14 * s, hy + 1 * s); c.lineTo(hx + 28 * s, hy + 6 * s); c.lineTo(hx + 14 * s, hy + 8 * s); c.fill();
    c.beginPath(); c.moveTo(hx + 2 * s, hy - 6 * s); c.lineTo(hx - 2 * s, hy - (12 + 8 * lift) * s); c.lineTo(hx + 8 * s, hy - 8 * s); c.fill();
    c.beginPath(); c.moveTo(x - 38 * s, y - 14 * s); c.quadraticCurveTo(x - 58 * s, y - 20 * s - 6 * s * Math.sin(t * 4) * lift, x - 66 * s, y - 10 * s); c.lineWidth = 4 * s; c.stroke(); }
  // the carry: front man holds the knees behind him, the second villager holds Naam under the arms; Naam's head hangs at "lemas"
  const S = carryState(t), Hc = HB;
  const front = S.knee[0] - 0.09 * Hc, rear = S.sh[0] + 0.24 * Hc;
  const ph = S.ph;
  farmer(c, p, rear, FEET_B, Hc * 1.01, p.fig, { dir: -1, walk: ph + 2.2, stride: 0.5, lean: 0.12, head: 0.3, reachF: [S.sh[0] + 4, S.sh[1] + 12], reachB: [S.sh[0] + 14, S.sh[1] + 20], idle: { t, seed: 23, amount: 0.3 } }, { t, tool: "none", seed: 2 });
  c.save(); c.translate(S.fx, S.fy); c.rotate(S.th); hiker(c, p, 0, 0, Hc, p.fig, naamPoseB(t), { t, pack: false, weak: 1, beanie: true, lamp: 0 }); c.restore();
  farmer(c, p, front, FEET_B, Hc, p.fig, { dir: -1, walk: ph, stride: 0.5, lean: 0.14, head: 0.1, reachB: [S.knee[0] + 6, S.knee[1] + 8], reachF: [S.knee[0] - 2, S.knee[1] + 14], idle: { t, seed: 21, amount: 0.3 } }, { t, tool: "none", seed: 1 });
  // the found cangkul carried on the rear man? no: it stays in the field. Naam's pack dangles from the front man's shoulder
  dragonfly(c, p, 520, 1000, 1.1, t, 2); dragonfly(c, p, 300, 1170, 1.2, t, 6);
  ducks(c, p, lerp(330, 470, (t - ALAS) / (RB - ALAS)), 1560, 1.4, t, 6);
  frog(c, p, 960, 1640, 1.6, t, 2);
  fogBand(c, p, 1040, 40, lit(p) ? 0.16 : 0.14, t, 11);
  fg(c, p, L, () => { for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(W - 10 + k * 18, H - 60, 20, 240, 0.35 - k * 0.1 + 0.04 * Math.sin(t * 0.9 + k), 0, TAU); c.fill(); } }, 8);
}

// ================================================================= DOUBT (night interior)
const [DA, DB] = SHOT_RANGE("doubt");
const HAL = CUE("halusinasi"), NYATA = CUE("nyata");
const HM = SIZE.medium, SEAT_Y = 1290, FLOOR_D = SEAT_Y + 0.25 * HM, NX = 770;
const LAMP: P2 = [455, 1118], BULB: P2 = [600, 330];
const WIN = { x: 90, y: 660, w: 340, h: 400 };
const DOOR = { x: 860, y: 520, w: 200, h: 880 };
const GLASS: P2 = [575, 1048];
/** second hand: one eased 0.08 s step at DA + 0.2 + k (audio clock ticks), then hold */
const clockSec = (t: number) => { const k = t - (DA + 0.2); if (k < 0) return 0; const n = Math.floor(k), f = k - n; return n + ss(0, 0.08, f); };
const naamPoseD = (t: number): SidePose => {
  const glance = settle(t, HAL + 0.2, HAL + 1.1, 0, 1) * (1 - settle(t, HAL + 2.0, HAL + 2.9, 0, 1));
  const turn = settle(t, NYATA - 0.15, NYATA + 0.85, 0, 1, 0.05);
  return { dir: -1, sit: 0.25 * HM, lean: 0.08 + 0.06 * turn, head: lerp(0.2 - 0.08 * glance, -0.07, turn), reachF: [GLASS[0] - 6, GLASS[1] + 6], reachB: [GLASS[0] + 12, GLASS[1] + 12], gripF: "open", gripB: "open", idle: { t, seed: 31, amount: 0.35 * (1 - 0.7 * turn) } };
};
function doubtRoom(g: C2, p: Pal) {
  plaster(g, p, -PAD, -PAD, W + 2 * PAD, 1400 + PAD, 0, 7);
  if (lit(p)) { g.strokeStyle = "rgba(40,28,16,0.45)"; g.lineWidth = 1.4; for (const [cx, cy, sd] of [[700, 560, 1], [140, 300, 2], [980, 1180, 3]] as [number, number, number][]) { g.beginPath(); g.moveTo(cx, cy); let x = cx, y = cy; for (let k = 0; k < 7; k++) { x += (hs(k, sd) - 0.4) * 22; y += 10 + 12 * hs(k, sd + 5); g.lineTo(x, y); } g.stroke(); } } // a few hairline cracks
  if (lit(p)) { g.fillStyle = "rgba(170,140,90,0.18)"; g.fillRect(-PAD, -PAD, W + 2 * PAD, 1400 + PAD); }
  // ceiling beam + wainscot band + skirting
  box(g, p, -PAD, -PAD, W + 2 * PAD, 230, pick(p, "#8e7150", "#0a0f1b"), 0.55, 201, 1.57, 3);
  box(g, p, -PAD, 1220, W + 2 * PAD, 180, pick(p, "#a8916a", "#0d1322"), 0.35, 202, 1.57, 3);
  // floor: cement tiles in perspective
  g.fillStyle = pick(p, "#b9a887", "#0c1220"); g.fillRect(-PAD, 1400, W + 2 * PAD, H);
  if (lit(p)) { g.strokeStyle = "rgba(40,28,16,0.4)"; g.lineWidth = 2; for (let k = 0; k < 9; k++) { const y = 1400 + k * k * 9; g.beginPath(); g.moveTo(-PAD, y); g.lineTo(W + PAD, y); g.stroke(); } for (let k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(540 + k * 90, 1400); g.lineTo(540 + k * 230, H + PAD); g.stroke(); } }
  // window frame (panes cleared below so the live fog shows through)
  const { x, y, w, h } = WIN;
  box(g, p, x - 26, y - 26, w + 52, h + 52, pick(p, "#7a5a36", "#0b111e"), 0.5, 203, 0.8, 3);
  box(g, p, x - 40, y + h + 18, w + 80, 22, pick(p, "#6a4c2c", "#0a0f1b"), 0.4, 204, 1.57, 3);
  g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.fillRect(x, y, w, h); g.restore();
  g.fillStyle = pick(p, "#5e4428", "#090e1a"); g.fillRect(x + w / 2 - 6, y, 12, h); g.fillRect(x, y + h * 0.42 - 5, w, 10); // mullions
  for (let k = 0; k < 5; k++) g.fillRect(x + 12 + k * (w - 24) / 4 - 2, y + h * 0.42 + 5, 4, h * 0.58 - 5); // iron bars (teralis)
  // curtain rod
  g.fillStyle = pick(p, "#3a2a18", "#05070c"); g.fillRect(x - 60, y - 52, w + 120, 7); g.beginPath(); g.arc(x - 60, y - 48, 7, 0, TAU); g.arc(x + w + 60, y - 48, 7, 0, TAU); g.fill();
  // doorway to the back room: dim, a kitchen shelf and a hanging sarung inside
  const D = DOOR; g.fillStyle = pick(p, "#7c6a4e", "#070b14"); g.fillRect(D.x, D.y, D.w, D.h);
  if (lit(p)) { g.fillStyle = "rgba(30,20,12,0.35)"; g.fillRect(D.x, D.y, D.w, D.h); }
  g.fillStyle = pick(p, "#5a4630", "#05080f"); g.fillRect(D.x + 120, D.y + 260, 80, 10); g.fillRect(D.x + 120, D.y + 360, 80, 10);
  for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(D.x + 136 + k * 18, D.y + 252, 7, 9, 0, 0, TAU); g.fill(); }
  g.fillStyle = pick(p, "#6e5038", "#06090f"); g.beginPath(); g.moveTo(D.x + 20, D.y + 120); g.lineTo(D.x + 70, D.y + 120); g.lineTo(D.x + 64, D.y + 420); g.lineTo(D.x + 26, D.y + 420); g.closePath(); g.fill();
  box(g, p, D.x - 22, D.y - 22, 22, D.h + 22, pick(p, "#6e5032", "#0a0f1b"), 0.4, 205, 0.2, 3); box(g, p, D.x + D.w, D.y - 22, 22, D.h + 22, pick(p, "#6e5032", "#0a0f1b"), 0.4, 206, 0.2, 3); box(g, p, D.x - 22, D.y - 40, D.w + 44, 22, pick(p, "#6e5032", "#0a0f1b"), 0.4, 207, 1.57, 3);
  // 2022 wall calendar (Maret)
  box(g, p, 486, 640, 118, 168, pick(p, "#efe7d2", "#141c2e"), 0.1, 208, 1.2, 2);
  g.fillStyle = pick(p, "#b3121a", "#2a1418"); g.fillRect(492, 646, 106, 40);
  g.fillStyle = pick(p, "#f4eedd", "#3a4258"); g.font = "bold 24px 'Courier New', monospace"; g.textAlign = "center"; g.fillText("2022", 545, 674);
  g.fillStyle = pick(p, "#2a1d12", "#2a3248"); g.font = "bold 12px 'Courier New', monospace"; g.fillText("MARET", 545, 702);
  for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) { g.fillStyle = q === 0 ? pick(p, "#b3121a", "#2a1418") : pick(p, "#3a2a1c", "#283048"); g.fillRect(498 + q * 14, 712 + r * 17, 8, 7); }
  g.fillStyle = pick(p, "#2a1d12", "#05070c"); g.beginPath(); g.arc(545, 632, 3, 0, TAU); g.fill(); g.strokeStyle = g.fillStyle; g.lineWidth = 1.2; g.beginPath(); g.moveTo(545, 632); g.lineTo(510, 641); g.moveTo(545, 632); g.lineTo(580, 641); g.stroke();
  // framed photo (family, old) + nail
  box(g, p, 490, 860, 96, 76, pick(p, "#5a3e22", "#0a0f1b"), 0.3, 209, 0.8, 3); g.fillStyle = pick(p, "#cdbf9c", "#1a2236"); g.fillRect(500, 870, 76, 56);
  g.fillStyle = pick(p, "#4a3a28", "#0b101c"); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(518 + k * 20, 892, 6, 0, TAU); g.fill(); g.fillRect(511 + k * 20, 898, 14, 28); }
  // round wall clock frame (hands drawn live)
  g.fillStyle = pick(p, "#f1e9d6", "#162034"); g.beginPath(); g.arc(470, 400, 52, 0, TAU); g.fill(); g.strokeStyle = pick(p, "#3a2614", "#05070c"); g.lineWidth = 7; g.stroke();
  g.fillStyle = pick(p, "#2a1d12", "#2a3248"); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.fillRect(470 + Math.sin(a) * 42 - 2, 400 - Math.cos(a) * 42 - 2, 4, 4); }
  // small CRT TV on a cabinet under the window, a radio and a thermos on a wall shelf
  box(g, p, 100, 1150, 300, 250, pick(p, "#8a6a44", "#0b111e"), 0.45, 210, 0.8, 3);
  g.fillStyle = pick(p, "#3a2a1a", "#05070c"); g.fillRect(250, 1180, 3, 200); g.beginPath(); g.arc(234, 1270, 5, 0, TAU); g.arc(268, 1270, 5, 0, TAU); g.fill();
  box(g, p, 140, 1066, 200, 84, pick(p, "#3b3a38", "#070b14"), 0.3, 211, 0.8, 3); box(g, p, 150, 1074, 140, 68, pick(p, "#6f746e", "#101826"), 0.2, 212, 0.8, 2);
  g.fillStyle = pick(p, "#1d1a16", "#04060a"); g.beginPath(); g.arc(314, 1092, 6, 0, TAU); g.arc(314, 1116, 6, 0, TAU); g.fill();
  g.strokeStyle = pick(p, "#1d1a16", "#04060a"); g.lineWidth = 2; g.beginPath(); g.moveTo(240, 1066); g.lineTo(204, 1010); g.moveTo(240, 1066); g.lineTo(278, 1006); g.stroke();
  // folded prayer mat on the cabinet + a lace doily
  g.fillStyle = pick(p, "#7a1e1c", "#1a1020"); g.fillRect(118, 1136, 80, 14); g.fillStyle = pick(p, "#d9b86a", "#2a2a3a"); g.fillRect(118, 1141, 80, 3);
  // electric wire along the wall to a switch
  g.strokeStyle = pick(p, "#2a2018", "#05070c"); g.lineWidth = 2.5; g.beginPath(); g.moveTo(600, 230); g.lineTo(600, 300); g.moveTo(820, 230); g.lineTo(820, 760); g.stroke();
  box(g, p, 808, 760, 24, 36, pick(p, "#ece4d0", "#1a2236"), 0, 213, 0, 2);
  // wall-mounted fan body (blades live)
  g.fillStyle = pick(p, "#d7cfbb", "#141c2e"); g.beginPath(); g.ellipse(735, 300, 18, 30, 0, 0, TAU); g.fill(); g.fillRect(728, 300, 14, 40);
  // sandals at the door
  for (const [sx, sy, r] of [[884, 1500, 0.1], [932, 1514, -0.08], [970, 1470, 0.2]] as [number, number, number][]) { g.save(); g.translate(sx, sy); g.rotate(r); g.fillStyle = pick(p, "#2a2622", "#04060c"); g.beginPath(); g.ellipse(0, 0, 30, 10, 0, 0, TAU); g.fill(); g.strokeStyle = pick(p, "#4a4440", "#0a0e18"); g.lineWidth = 3; g.beginPath(); g.moveTo(-6, -8); g.lineTo(6, 2); g.lineTo(-6, 8); g.stroke(); g.restore(); }
  // mosquito coil on a lid on the floor
  g.fillStyle = pick(p, "#4a3c2a", "#05070c"); g.beginPath(); g.ellipse(160, 1600, 34, 10, 0, 0, TAU); g.fill();
  g.strokeStyle = pick(p, "#2c4a2a", "#0a120e"); g.lineWidth = 3; g.beginPath(); for (let a = 0; a < 18; a += 0.3) { const r = 4 + a * 1.4; g.lineTo(160 + Math.cos(a) * r, 1596 + Math.sin(a) * r * 0.28); } g.stroke();
  // small table for the teplok
  box(g, p, LAMP[0] - 56, LAMP[1] + 30, 112, 14, pick(p, "#7d5f3a", "#0b111e"), 0.4, 214, 1.57, 2);
  g.fillStyle = pick(p, "#5e4428", "#090e1a"); g.fillRect(LAMP[0] - 46, LAMP[1] + 44, 9, 210); g.fillRect(LAMP[0] + 37, LAMP[1] + 44, 9, 210);
}
function bale(g: C2, p: Pal) {
  const x0 = 470, x1 = 1070, y = SEAT_Y;
  box(g, p, x0, y, x1 - x0, 30, pick(p, "#b39c6a", "#111a2a"), 0.3, 221, 1.57, 3);
  if (lit(p)) { g.strokeStyle = "rgba(30,20,10,0.55)"; g.lineWidth = 1.5; for (let x = x0 + 22; x < x1; x += 24) { g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x, y + 28); g.stroke(); } }
  for (const lx of [x0 + 18, x1 - 40]) box(g, p, lx, y + 30, 22, FLOOR_D - y - 30, pick(p, "#a08a5c", "#0e1626"), 0.4, 222 + lx, 0.2, 2);
  box(g, p, x0 + 10, y + 120, x1 - x0 - 20, 14, pick(p, "#a08a5c", "#0e1626"), 0.3, 224, 1.57, 2);
  g.strokeStyle = pick(p, "#4a3a20", "#05070c"); g.lineWidth = 2; for (const lx of [x0 + 29, x1 - 29]) { g.beginPath(); g.moveTo(lx - 10, y + 112); g.lineTo(lx + 10, y + 140); g.moveTo(lx + 10, y + 112); g.lineTo(lx - 10, y + 140); g.stroke(); }
  // folded sarung + pillow at the far end; a teapot on a tray on the bale
  box(g, p, 960, y - 30, 96, 30, pick(p, "#4a6a5a", "#121a2c"), 0.4, 225, 1.57, 2);
  g.fillStyle = pick(p, "#6b4a2e", "#090e1a"); g.beginPath(); g.ellipse(470 + 20, y - 4, 0, 0, 0, 0, TAU); g.fill();
}
function teplok(c: C2, p: Pal, t: number) {
  const [x, y] = LAMP, fl = 1 + 0.06 * Math.sin(t * 7.1) + 0.04 * Math.sin(t * 12.3 + 1);
  c.fillStyle = pick(p, "#5a4630", "#060a14"); c.beginPath(); c.moveTo(x - 22, y + 30); c.lineTo(x + 22, y + 30); c.lineTo(x + 16, y + 6); c.lineTo(x - 16, y + 6); c.closePath(); c.fill();
  c.fillRect(x - 4, y - 4, 8, 10);
  c.fillStyle = pick(p, "rgba(240,236,220,0.55)", "rgba(60,70,100,0.4)"); c.beginPath(); c.moveTo(x - 7, y - 2); c.quadraticCurveTo(x - 14, y - 26, x - 7, y - 50); c.lineTo(x + 7, y - 50); c.quadraticCurveTo(x + 14, y - 26, x + 7, y - 2); c.closePath(); c.fill();
  c.fillStyle = `rgba(255,${lit(p) ? 220 : 170},${lit(p) ? 140 : 80},0.95)`; c.beginPath(); c.ellipse(x, y - 16 - 2 * fl, 4, 10 * fl, 0.05 * Math.sin(t * 2.3), 0, TAU); c.fill();
}
/** procession lanterns in the fog outside, from "halusinasi"; at "nyata" one has stopped and faces the house */
function outside(c: C2, p: Pal, t: number) {
  const { x, y, w, h } = WIN;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, pick(p, "#a9a596", "#141e33")); g.addColorStop(1, pick(p, "#c7c1ae", "#26324a")); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.fillStyle = pick(p, "rgba(60,58,50,0.5)", "rgba(6,10,20,0.6)"); // banana leaves + neighbour roof in the fog
  c.beginPath(); c.moveTo(x - 10, y + h * 0.62); c.lineTo(x + 120, y + h * 0.5); c.lineTo(x + 250, y + h * 0.62); c.closePath(); c.fill();
  for (let k = 0; k < 4; k++) { c.save(); c.translate(x + 300, y + h * 0.6); c.rotate(-1.4 + k * 0.6 + 0.04 * Math.sin(t * 0.7 + k)); c.beginPath(); c.ellipse(60, 0, 70, 14, 0, 0, TAU); c.fill(); c.restore(); }
  c.fillRect(x, y + h * 0.78, w, h * 0.22);
  const ap = ss(HAL - 0.2, HAL + 0.9, t);
  if (ap > 0.01) for (let i = 0; i < 5; i++) {
    const stopper = i === 2, T = t - HAL;
    let lx = x - 60 + T * 26 + i * 92;
    if (stopper) { const s0 = NYATA - 0.9 - HAL; lx = x - 60 + i * 92 + (T < s0 ? T * 26 : s0 * 26 + 26 * 0.45 * easeOut2((T - s0) / 0.9)); }
    const ly = y + h * 0.72 + 4 * Math.sin(t * 1.6 + i * 1.3) * (stopper && t > NYATA ? 0.2 : 1), a = ap * clamp(1 - Math.abs(lx - (x + w / 2)) / (w * 0.75)) * (0.55 + 0.45 * Math.sin(t * 2.1 + i));
    if (a < 0.02) continue;
    const gl = c.createRadialGradient(lx, ly, 0, lx, ly, 46); gl.addColorStop(0, `rgba(255,205,130,${0.7 * a})`); gl.addColorStop(1, "rgba(255,190,110,0)"); c.fillStyle = gl; c.fillRect(lx - 46, ly - 46, 92, 92);
    c.fillStyle = `rgba(255,236,190,${a})`; c.beginPath(); c.arc(lx, ly, 3.5, 0, TAU); c.fill();
    const face = stopper ? settle(t, NYATA - 0.4, NYATA + 0.4, 0, 1) : 0, fx = lx + 10, fyb = ly + 40;
    c.fillStyle = pick(p, `rgba(40,34,28,${0.55 * ap})`, `rgba(4,6,12,${0.7 * ap})`);
    if (face > 0.5) { // faces the house: symmetric, still
      c.beginPath(); c.ellipse(fx, fyb - 76, 7, 8, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(fx - 9, fyb - 66); c.lineTo(fx + 9, fyb - 66); c.lineTo(fx + 12, fyb); c.lineTo(fx - 12, fyb); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(fx - 9, fyb - 62); c.lineTo(lx, ly - 2); c.lineTo(lx + 3, ly); c.lineTo(fx - 6, fyb - 54); c.fill();
      c.fillStyle = `rgba(255,236,220,${0.5 * face * ap})`; c.fillRect(fx - 4, fyb - 78, 2, 2); c.fillRect(fx + 2, fyb - 78, 2, 2);
    } else { // walking in profile, left to right
      c.beginPath(); c.arc(fx + 2, fyb - 76, 7, 0, TAU); c.fill(); c.beginPath(); c.moveTo(fx - 7, fyb - 66); c.lineTo(fx + 8, fyb - 66); c.lineTo(fx + 9 + 2 * Math.sin(t * 3 + i), fyb); c.lineTo(fx - 9 - 2 * Math.sin(t * 3 + i), fyb); c.closePath(); c.fill();
    }
  }
  // fog drifting past the window
  for (let k = 0; k < 6; k++) { const fx = x - 100 + ((t * 14 + k * 90) % (w + 200)), fy = y + 120 + k * 50; const gr = c.createRadialGradient(fx, fy, 0, fx, fy, 120); gr.addColorStop(0, pick(p, "rgba(230,226,214,0.45)", "rgba(90,104,130,0.4)")); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(fx - 120, fy - 120, 240, 240); }
  c.restore();
}
function blanket(c: C2, p: Pal, J: ReturnType<typeof sideJoints>) {
  const u = J.u, sh = J.sh, nk = J.neck, hp = J.hip; // facing left: back = +x
  const pts: P2[] = [[nk[0] + 0.012 * u, nk[1] - 0.02 * u], [sh[0] + 0.05 * u, sh[1] - 0.012 * u], [sh[0] + 0.085 * u, sh[1] + 0.08 * u], [hp[0] + 0.09 * u, hp[1] - 0.04 * u], [hp[0] + 0.08 * u, hp[1] + 0.025 * u], [hp[0] - 0.03 * u, hp[1] + 0.03 * u], [sh[0] - 0.035 * u, sh[1] + 0.2 * u], [sh[0] - 0.06 * u, sh[1] + 0.05 * u], [sh[0] - 0.03 * u, sh[1] - 0.02 * u]];
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; c.quadraticCurveTo(a[0] + (b[0] - a[0]) * 0.5 + (b[1] - a[1]) * 0.08, a[1] + (b[1] - a[1]) * 0.5 - (b[0] - a[0]) * 0.08, b[0], b[1]); } c.closePath(); };
  path(); c.fillStyle = pick(p, "#6a3a22", "#141c32"); c.fill();
  c.save(); path(); c.clip();
  // parang batik: diagonal rows of S-hooks + dots, border stripe
  c.strokeStyle = pick(p, "#e8d6ae", "#2a3654"); c.lineWidth = 3;
  const bx = Math.min(...pts.map((q) => q[0])), by = Math.min(...pts.map((q) => q[1]));
  for (let r = -8; r < 16; r++) for (let k = 0; k < 14; k++) {
    const cx = bx + k * 34 + r * 20, cy = by + r * 34 - k * 4;
    c.beginPath(); c.moveTo(cx - 10, cy + 8); c.bezierCurveTo(cx - 12, cy - 6, cx + 2, cy - 10, cx, cy); c.bezierCurveTo(cx - 2, cy + 10, cx + 12, cy + 6, cx + 10, cy - 8); c.stroke();
    c.fillStyle = pick(p, "#e8d6ae", "#2a3654"); c.beginPath(); c.arc(cx + 14, cy + 12, 2.4, 0, TAU); c.fill();
  }
  c.strokeStyle = pick(p, "#20120a", "#070b14"); c.lineWidth = 2.5; for (let k = 0; k < 10; k++) { c.beginPath(); c.moveTo(sh[0] + 0.02 * u + k * 6, sh[1] + 0.02 * u); c.quadraticCurveTo(sh[0] + 0.05 * u + k * 5, (sh[1] + hp[1]) / 2, hp[0] + 0.03 * u + k * 5, hp[1]); c.stroke(); } // folds
  c.restore();
  path(); c.strokeStyle = pick(p, "#1a0e08", "#04060c"); c.lineWidth = 3; c.stroke();
}
function drawDoubt(c: C2, p: Pal, t: number, L: (d: number) => void) {
  L(0.7); outside(c, p, t);
  L(1); cached(c, p, "d_room", (g) => doubtRoom(g, p));
  const pose = naamPoseD(t);
  // the giant soft shadow from the teplok on the wall
  castShadow(c, p, LAMP[0], LAMP[1] - 18, 1.55, (f) => { hiker(c, p, NX, FLOOR_D, HM, f, pose, { t, pack: false, beanie: false, weak: 0.5 }); }, 0.42, 14);
  // curtain (left half of the window), breathing in the fan's draught
  { const { x, y, w, h } = WIN, sw = 0.5 + 0.5 * Math.sin(t * 0.8); c.fillStyle = pick(p, "rgba(196,170,120,0.92)", "rgba(28,38,64,0.9)");
    c.beginPath(); c.moveTo(x - 50, y - 48); c.lineTo(x + 70 + 8 * sw, y - 48); for (let k = 0; k <= 12; k++) c.lineTo(x + 64 + 8 * sw + 7 * Math.sin(k * 1.1 + t * 1.1) + k * 1.5 * sw, y - 48 + k * (h + 80) / 12); c.lineTo(x - 50, y + h + 32); c.closePath(); c.fill();
    if (lit(p)) { c.strokeStyle = "rgba(60,40,20,0.45)"; c.lineWidth = 2; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(x - 36 + k * 22, y - 44); c.quadraticCurveTo(x - 30 + k * 22 + 4 * Math.sin(t + k), y + h / 2, x - 36 + k * 22, y + h + 28); c.stroke(); } } }
  // family in the doorway: a man in peci with sarung over the shoulders, a child half behind the jamb
  c.save(); c.beginPath(); c.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); c.clip();
  sideFigure(c, 975, 1395, HM * 0.62, p.fig, { peci: true, sarung: true }, { dir: -1, armB: [0.25, 0.9], head: 0.12, idle: { t, seed: 41, amount: 0.8 } });
  sideFigure(c, 905, 1395, HM * 0.38, p.fig, { hair: true, thin: true }, { dir: -1, reachF: [DOOR.x + 6, 1395 - HM * 0.38 * 0.62], head: 0.05, idle: { t, seed: 43, amount: 1 } });
  c.restore();
  // clock hands: hour/min fixed (21:47), second hand steps with the audio ticks
  { const ink = pick(p, "#2a1d12", "#2a3248"); c.strokeStyle = ink; c.lineCap = "round"; c.lineWidth = 6; c.beginPath(); c.moveTo(470, 400); c.lineTo(470 + Math.sin((9.8 / 12) * TAU) * 26, 400 - Math.cos((9.8 / 12) * TAU) * 26); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(470, 400); c.lineTo(470 + Math.sin((47 / 60) * TAU) * 38, 400 - Math.cos((47 / 60) * TAU) * 38); c.stroke();
    const sa = ((12 + clockSec(t)) / 60) * TAU; c.strokeStyle = pick(p, "#b3121a", "#3a1a20"); c.lineWidth = 2; c.beginPath(); c.moveTo(470 - Math.sin(sa) * 8, 400 + Math.cos(sa) * 8); c.lineTo(470 + Math.sin(sa) * 44, 400 - Math.cos(sa) * 44); c.stroke();
    c.fillStyle = ink; c.beginPath(); c.arc(470, 400, 4, 0, TAU); c.fill(); }
  // wall fan: head oscillates slowly, blades a soft disc with turning spokes
  { const osc = 0.35 * Math.sin(t * 0.5), fx = 735 + 22 * osc, fy = 272; c.save(); c.translate(fx, fy); c.scale(0.55 + 0.45 * Math.cos(osc * 2), 1);
    c.fillStyle = pick(p, "rgba(210,202,184,0.5)", "rgba(40,52,80,0.5)"); c.beginPath(); c.arc(0, 0, 54, 0, TAU); c.fill();
    c.strokeStyle = pick(p, "rgba(40,30,20,0.6)", "rgba(6,8,14,0.7)"); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 54, 0, TAU); c.stroke(); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 54, Math.sin(a) * 54); c.stroke(); }
    c.fillStyle = pick(p, "rgba(60,50,40,0.35)", "rgba(10,14,24,0.4)"); for (let k = 0; k < 3; k++) { const a = t * 4.2 + (k / 3) * TAU; c.beginPath(); c.ellipse(Math.cos(a) * 26, Math.sin(a) * 26, 24, 9, a, 0, TAU); c.fill(); }
    c.fillStyle = pick(p, "#3a3028", "#05070c"); c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill(); c.restore(); }
  // calendar page corner lifting in the draught
  { const lft = 0.5 + 0.5 * Math.sin(t * 0.8); c.fillStyle = pick(p, "#e2d9c2", "#18202f"); c.beginPath(); c.moveTo(604, 808); c.lineTo(604 - 26, 808); c.lineTo(604, 808 - 22 - 8 * lft); c.closePath(); c.fill(); }
  // bulb on its cord (dim) with moths circling, a cicak waiting near it
  { c.strokeStyle = pick(p, "#2a2018", "#05070c"); c.lineWidth = 2.5; c.beginPath(); c.moveTo(600, 230); c.lineTo(BULB[0], BULB[1] - 18); c.stroke(); c.fillStyle = pick(p, "#3a3028", "#05070c"); c.fillRect(BULB[0] - 7, BULB[1] - 22, 14, 12);
    c.fillStyle = pick(p, "rgba(255,240,200,0.95)", "rgba(200,170,110,0.7)"); c.beginPath(); c.ellipse(BULB[0], BULB[1], 12, 15, 0, 0, TAU); c.fill();
    for (let k = 0; k < 4; k++) { const a = t * (1.3 + 0.4 * k) + k * 2, r = 30 + 14 * Math.sin(t * 0.9 + k), mx = BULB[0] + Math.cos(a) * r, my = BULB[1] + Math.sin(a) * r * 0.6, fl = Math.sin(t * 40 + k) * 0.5; c.fillStyle = pick(p, "#4a3e30", "#05070c"); c.beginPath(); c.ellipse(mx - 3, my, 5, 3 + 2 * fl, 0.4, 0, TAU); c.ellipse(mx + 3, my, 5, 3 - 2 * fl, -0.4, 0, TAU); c.fill(); }
    const ck = settle(t, DA + 2.2, DA + 3.0, 0, 1), cx0 = 390, cy0 = 470 - 40 * ck; c.fillStyle = pick(p, "#4a3e2e", "#05070c"); c.save(); c.translate(cx0, cy0); c.rotate(-0.3);
    c.beginPath(); c.ellipse(0, 0, 6, 18, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -20, 5, 7, 0, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = c.fillStyle; c.beginPath(); c.moveTo(0, 16); c.quadraticCurveTo(6 + 4 * Math.sin(t * 1.3), 30, 0, 42); c.stroke();
    for (const [lx, ly, s] of [[-1, -8, -1], [1, -8, 1], [-1, 10, -1], [1, 10, 1]] as [number, number, number][]) { c.beginPath(); c.moveTo(lx * 4, ly); c.lineTo(s * 13, ly - 5); c.stroke(); } c.restore(); }
  // mosquito-coil smoke rising
  for (let k = 0; k < 10; k++) { const q = ((t * 0.18 + k / 10) % 1), sx = 160 + Math.sin(q * 6 + t * 0.6) * 10 * q, sy = 1590 - q * 260; c.strokeStyle = pick(p, `rgba(120,110,96,${0.35 * (1 - q)})`, `rgba(70,84,110,${0.35 * (1 - q)})`); c.lineWidth = 2 + 4 * q; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 3 * Math.sin(t + k), sy - 18); c.stroke(); }
  teplok(c, p, t);
  L(1); cached(c, p, "d_bale", (g) => bale(g, p));
  // Naam on the bale, wrapped in a batik blanket, hands around the hot tea
  const J = hiker(c, p, NX, FLOOR_D, HM, p.fig, pose, { t, pack: false, beanie: false, weak: 0.5, lamp: 0 });
  blanket(c, p, J);
  const gh = 0.078 * HM; coffeeGlass(c, GLASS[0], GLASS[1] + gh * 0.5, gh, 0.82, t, pick(p, "#160e0a", "#04060b"), pick(p, "rgba(245,238,220,0.55)", "rgba(60,80,120,0.35)"), pick(p, "#8a4a1a", "#160d0a"), 1, 3);
  c.fillStyle = p.fig; for (let k = 0; k < 3; k++) { const yy = GLASS[1] + gh * 0.08 + k * gh * 0.13, ww = gh * (0.36 - k * 0.04); c.beginPath(); c.ellipse(GLASS[0] - gh * 0.08, yy, ww, gh * 0.045, 0.04, 0, TAU); c.fill(); } c.beginPath(); c.ellipse(GLASS[0] + gh * 0.3, GLASS[1] + gh * 0.02, gh * 0.06, gh * 0.12, 0.3, 0, TAU); c.fill(); // fingers wrap the glass front, thumb tip at the rim
  fg(c, p, L, () => { c.fillRect(-PAD, -PAD, PAD + 34, H + 2 * PAD); c.beginPath(); c.ellipse(W + 30, H - 160, 70, 340, 0.1, 0, TAU); c.fill(); }, 9);
}

// ================================================================= OFFER (POV lost in the fog)
const [OA, OB] = SHOT_RANGE("offer");
const KABUT = CUE("kabut"), JANGAN = CUE("jangan");
function forestLayer(g: C2, p: Pal, n: number, seed: number, wMin: number, wMax: number, col: [string, string], moss: number, yTop = -PAD, yBase = 1500) {
  for (let k = 0; k < n; k++) {
    const x = -PAD + hs(k, seed) * (W + 2 * PAD), w = wMin + (wMax - wMin) * hs(k, seed + 1), lean = (hs(k, seed + 2) - 0.5) * 0.08;
    if (n > 3 && Math.abs(x - 560) < 140 && seed !== 501) continue; // keep the centre corridor open for the figure + hand
    g.fillStyle = pick(p, col[0], col[1]);
    g.beginPath(); g.moveTo(x - w / 2, yBase + 30); g.lineTo(x - w * 0.42 + lean * 1600, yTop); g.lineTo(x + w * 0.42 + lean * 1600, yTop); g.lineTo(x + w / 2, yBase + 30); g.closePath(); g.fill();
    for (let r = 0; r < 3; r++) { const a = (r - 1) * 0.9 + (hs(k, r) - 0.5) * 0.4; g.beginPath(); g.moveTo(x - w * 0.3, yBase); g.quadraticCurveTo(x + Math.sin(a) * w * 0.9, yBase + 10, x + Math.sin(a) * w * 1.4, yBase + 30); g.lineWidth = w * 0.18; g.strokeStyle = g.fillStyle as string; g.stroke(); } // roots
    if (moss > 0) {
      // moss beards hanging from a branch stub, lichen dots
      const by = 300 + hs(k, seed + 5) * 700; g.strokeStyle = pick(p, col[0], col[1]); g.lineWidth = w * 0.12; g.beginPath(); g.moveTo(x, by); g.lineTo(x + (hs(k, 9) > 0.5 ? 1 : -1) * w * 1.6, by - w * 0.6); g.stroke();
      g.strokeStyle = pick(p, "rgba(96,104,70,0.8)", "rgba(28,40,52,0.9)"); g.lineWidth = 1.4;
      for (let q = 0; q < 14 * moss; q++) { const mx = x + (hs(q, k + seed) - 0.3) * w * 1.6, L = 20 + 70 * hs(q, k * 3 + seed); g.beginPath(); g.moveTo(mx, by - 4); g.quadraticCurveTo(mx + 5, by + L * 0.5, mx - 2, by + L); g.stroke(); }
      g.fillStyle = pick(p, "rgba(210,206,170,0.55)", "rgba(60,74,96,0.6)"); for (let q = 0; q < 30 * moss; q++) { g.beginPath(); g.arc(x + (hs(q, k + 7) - 0.5) * w * 0.8, 200 + hs(q, k + 8) * 1200, 1.5 + 2.5 * hs(q, k + 9), 0, TAU); g.fill(); }
      if (lit(p)) { g.strokeStyle = "rgba(20,14,8,0.5)"; g.lineWidth = 1.2; for (let q = 0; q < 40; q++) { const yy = yTop + hs(q, k + 11) * (yBase - yTop), xx = x + (hs(q, k + 12) - 0.5) * w * 0.7; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 2, yy + 18 + 20 * hs(q, k)); g.stroke(); } } // bark grain
    }
  }
}
function offerFar(g: C2, p: Pal) {
  const gr = g.createLinearGradient(0, -PAD, 0, H); gr.addColorStop(0, pick(p, "#a7a291", "#0c1424")); gr.addColorStop(0.55, pick(p, "#c4bead", "#1c2840")); gr.addColorStop(1, pick(p, "#8f8a7a", "#0a101c"));
  g.fillStyle = gr; g.fillRect(-PAD, -PAD, W + 2 * PAD, H + 2 * PAD);
  forestLayer(g, p, 16, 401, 18, 40, ["rgba(110,106,92,0.55)", "rgba(40,54,80,0.6)"], 0, -PAD, 1300);
  g.fillStyle = pick(p, "rgba(196,190,174,0.6)", "rgba(40,54,80,0.5)"); g.fillRect(-PAD, 1150, W + 2 * PAD, 300);
}
function offerMid(g: C2, p: Pal) {
  forestLayer(g, p, 9, 451, 50, 90, ["#4a4638", "#0b111e"], 0.7, -PAD, 1420);
  // ground: moss, ferns, roots
  g.fillStyle = pick(p, "#3e3a2e", "#070b14"); g.beginPath(); g.moveTo(-PAD, 1400); for (let x = -PAD; x <= W + PAD; x += 30) g.lineTo(x, 1390 + 16 * Math.sin(x * 0.01) + 10 * hash(x)); g.lineTo(W + PAD, H + PAD); g.lineTo(-PAD, H + PAD); g.closePath(); g.fill();
  for (let k = 0; k < 16; k++) { const fx = -100 + k * 84 + hs(k, 461) * 40, fy = 1410 + hs(k, 462) * 120, L = 60 + 50 * hs(k, 463); g.strokeStyle = pick(p, "#2c2a20", "#05080f"); g.lineWidth = 2; for (let f = 0; f < 6; f++) { const a = -Math.PI / 2 + (f - 2.5) * 0.42, ex = fx + Math.cos(a) * L, ey = fy + Math.sin(a) * L * 0.8; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + Math.cos(a) * L * 0.5, fy + Math.sin(a) * L - 10, ex, ey + 8); g.stroke(); for (let q = 1; q < 7; q++) { const px = fx + (ex - fx) * q / 7, py = fy + (ey - fy) * q / 7 - 5; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 7, py - 5); g.moveTo(px, py); g.lineTo(px - 6, py - 6); g.stroke(); } } }
}
function offerNear(g: C2, p: Pal) {
  // two big mossy trunks framing the edges (outside the centre corridor and the caption block)
  for (const [x, w, sd] of [[-40, 190, 1], [W + 40, 210, 2]] as [number, number, number][]) {
    g.fillStyle = pick(p, "#2c281e", "#04070d"); g.beginPath(); g.moveTo(x - w / 2, H + PAD); g.lineTo(x - w * 0.4, -PAD); g.lineTo(x + w * 0.4, -PAD); g.lineTo(x + w / 2, H + PAD); g.closePath(); g.fill();
    g.fillStyle = pick(p, "rgba(120,124,84,0.75)", "rgba(24,36,48,0.9)"); for (let q = 0; q < 160; q++) { const yy = -PAD + hs(q, sd * 7) * (H + 2 * PAD), xx = x + (hs(q, sd * 9) - 0.5) * w * 0.8; g.beginPath(); g.ellipse(xx, yy, 6 + 10 * hs(q, sd), 3 + 4 * hs(q, sd + 1), 0, 0, TAU); g.fill(); }
    g.strokeStyle = pick(p, "rgba(140,144,100,0.8)", "rgba(30,44,58,0.9)"); g.lineWidth = 1.6; for (let q = 0; q < 40; q++) { const mx = x + (hs(q, sd * 3) - 0.5) * w * 1.1, my = 200 + hs(q, sd * 5) * 900, L = 40 + 90 * hs(q, sd * 11); g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo(mx + 6, my + L * 0.5, mx - 3, my + L); g.stroke(); }
  }
}
const handState = (t: number) => {
  const k = move(t, KABUT, JANGAN, 0, 1);                 // slides slowly out of the fog toward the lens, stops at "jangan"
  const s = lerp(46, 185, k);                             // tray centre stays near x 560 (tray is drawn to the right of the hand)
  return { k, x: 560 - 1.9 * s, y: lerp(640, 815, k), s, ang: 0.3, vis: ss(KABUT - 0.2, KABUT + 0.9, t) }; // tray bottom <= ~y 930 world (~960 on screen): clear of the captions
};
/** finger curl drawn over the cast hand after "jangan": the four draped fingers lift off the tray and hook back toward the palm (eased ~1 s).
 *  Same geometry as cast.offeringHand tray mode, so at curl 0 it sits exactly on the cast fingers; the vacated tray spot is covered with the leaf liner tone. */
function fingerCurl(c: C2, p: Pal, x: number, y: number, ang: number, s: number, t: number, k: number) {
  if (k <= 0.001) return;
  const LT = lit(p), skin = LT ? "#e8dfcc" : "#171d2b", line = LT ? "rgba(22,14,10,0.9)" : "rgba(96,116,152,0.3)", nail = LT ? "#d9cba6" : "#1f2636", lw = Math.max(1, s * 0.016);
  const K: P2 = [x + Math.cos(ang) * 0.5 * s, y + Math.sin(ang) * 0.5 * s];
  const fz: [number, number][] = [[-0.11, 0.78], [-0.04, 0.92], [0.03, 1.0], [0.1, 0.9]];
  const chain = (i: number, kk: number, dy: number, cu: number): P2[] => { const sc = 0.02 * Math.sin(t * 0.55); let a = -0.75 + i * 0.16, q: P2 = [0, dy * s]; const pts: P2[] = [q];
    const ls = [0.25 * s * kk, 0.2 * s * kk, 0.15 * s * kk], cs = [-0.45 * cu, 0.55 + sc * 0.4 + 0.95 * cu, 0.42 + sc * 0.8 + 1.15 * cu];
    ls.forEach((l, j) => { a += cs[j]; q = [q[0] + Math.cos(a) * l, q[1] + Math.sin(a) * l]; pts.push(q); }); return pts; };
  c.save(); c.translate(K[0], K[1]);
  // cover the original draped fingers (they rest on the banana-leaf liner)
  c.globalAlpha = clamp(k * 5); c.strokeStyle = LT ? "#8f8c63" : "#0d141b"; c.lineCap = "round";
  fz.forEach(([dy, kk], i) => { const P = chain(i, kk, dy, 0); c.lineWidth = 0.13 * s; c.beginPath(); c.moveTo(P[1][0], P[1][1]); c.lineTo(P[2][0], P[2][1]); c.lineTo(P[3][0], P[3][1]); c.stroke(); });
  c.globalAlpha = 1;
  fz.forEach(([dy, kk], i) => {
    const P = chain(i, kk, dy, k);
    for (const [col, extra] of [[line, lw * 2], [skin, 0]] as [string, number][]) { c.strokeStyle = col; c.beginPath(); for (let j = 0; j < 3; j++) { c.lineWidth = 2 * 0.05 * s * (1 - j * 0.14) + extra; c.beginPath(); c.moveTo(P[j][0], P[j][1]); c.lineTo(P[j + 1][0], P[j + 1][1]); c.stroke(); } }
    const tp = P[3], d0 = Math.atan2(tp[1] - P[2][1], tp[0] - P[2][0]); c.fillStyle = nail; c.strokeStyle = line; c.lineWidth = lw; c.beginPath(); c.ellipse(tp[0] + Math.cos(d0) * 0.04 * s, tp[1] + Math.sin(d0) * 0.04 * s, 0.055 * s, 0.024 * s, d0, 0, TAU); c.fill(); c.stroke(); // long nail
  });
  c.restore();
}
let GHOST: HTMLCanvasElement | null = null;
/** draw a figure as ONE even translucent silhouette (no doubled overlaps) */
function ghostly(c: C2, alpha: number, fn: (g: C2) => void) {
  if (!GHOST) { GHOST = document.createElement("canvas"); GHOST.width = W; GHOST.height = H; }
  const g = GHOST.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.setTransform(c.getTransform()); fn(g);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alpha; c.drawImage(GHOST, 0, 0); c.restore();
}
function drawOffer(c: C2, p: Pal, t: number, L: (d: number) => void) {
  L(0.55); cached(c, p, "o_far", (g) => offerFar(g, p));
  fogBand(c, p, 700, 220, lit(p) ? 0.45 : 0.4, t, 21); fogBand(c, p, 1150, 200, lit(p) ? 0.5 : 0.42, t, 23);
  // the very tall dim figure deep in the fog (no breath, still)
  { const a = (lit(p) ? 0.34 : 0.6) * (0.6 + 0.4 * ss(OA, KABUT + 1, t)), col = pick(p, "#4e483e", "#060a14");
    ghostly(c, a, (g) => { courtier(g, p, "abdi", 560, 1330, 1240, col, { dir: -1, head: 0.14 + 0.06 * move(t, KABUT, JANGAN, 0, 1), armF: [0.06, 0.12], armB: [0.03, 0.1] }, { t, ghost: 1, seed: 7 }); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.setTransform(1, 0, 0, 1, 0, 0); g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }); }
  fogBand(c, p, 900, 260, lit(p) ? 0.42 : 0.38, t, 25);
  L(0.85); cached(c, p, "o_mid", (g) => offerMid(g, p));
  fogBand(c, p, 1000, 240, lit(p) ? 0.3 : 0.28, t, 27);
  // incense smoke curling up from the tray, petals drifting down, the hand + tray
  const S = handState(t);
  if (S.vis > 0.01) {
    L(1);
    c.globalAlpha = S.vis;
    const curl = settle(t, JANGAN, JANGAN + 1.1, 0, 1, 0.03);
    const opt = { tray: true, steam: 1, curl };
    offeringHand(c, p, S.x, S.y, S.ang, S.s, t, opt as { tray?: boolean; steam?: number });
    fingerCurl(c, p, S.x, S.y, S.ang, S.s, t, curl);
    c.globalAlpha = 1;
    // incense stick ember + smoke above the tray
    const ix = S.x + S.s * 2.55, iy = S.y - S.s * 0.25;
    c.fillStyle = `rgba(255,80,50,${0.8 * S.vis})`; c.beginPath(); c.arc(ix, iy, 1.5 + 1.5 * S.k, 0, TAU); c.fill();
    for (let k = 0; k < 16; k++) { const q = ((t * 0.16 + k / 16) % 1), sx = ix + Math.sin(q * 7 + t * 0.7) * 14 * q * (1 + S.k), sy = iy - q * (160 + 200 * S.k); c.strokeStyle = pick(p, `rgba(230,224,210,${0.4 * (1 - q) * S.vis})`, `rgba(120,135,165,${0.35 * (1 - q) * S.vis})`); c.lineWidth = 1.5 + 4 * q; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + 6 * Math.sin(t + k), sy - 10, sx + 2, sy - 20); c.stroke(); }
    for (let k = 0; k < 9; k++) { const q = ((t * 0.12 + hs(k, 501)) % 1), px = S.x + S.s * (0.7 + 2.4 * hs(k, 502)) + Math.sin(t * 1.3 + k) * 14, py = S.y + q * 240 * (0.4 + S.k); c.fillStyle = pick(p, k % 2 ? "rgba(214,60,70,0.85)" : "rgba(240,226,180,0.9)", "rgba(80,40,60,0.6)"); c.globalAlpha = S.vis * (1 - q); c.save(); c.translate(px, py); c.rotate(t * 1.2 + k); c.beginPath(); c.ellipse(0, 0, 5 + S.k * 4, 3 + S.k * 2, 0, 0, TAU); c.fill(); c.restore(); c.globalAlpha = 1; }
    // fog still clinging to the forearm, thinning as it comes nearer
    const fa = (1 - S.k) * 0.7; if (fa > 0.02) fogBand(c, p, S.y - S.s * 0.3, S.s * 1.6, fa * (lit(p) ? 0.6 : 0.5), t, 29, S.x - S.s * 3, S.x + S.s * 4);
    const ex = S.x - Math.cos(S.ang) * S.s * 2.2, ey = S.y - Math.sin(S.ang) * S.s * 2.2; const gf = c.createRadialGradient(ex, ey, 0, ex, ey, S.s * 1.6); gf.addColorStop(0, pick(p, "rgba(200,194,178,0.95)", "rgba(40,54,80,0.95)")); gf.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gf; c.fillRect(ex - S.s * 1.6, ey - S.s * 1.6, S.s * 3.2, S.s * 3.2);
  }
  L(1.25); cached(c, p, "o_near", (g) => offerNear(g, p));
  // falling dew drops from the moss on the near trunks
  for (let k = 0; k < 6; k++) { const q = ((t * 0.5 + hs(k, 511)) % 1), dx = (k % 2 ? W - 20 : 20) + (hs(k, 512) - 0.5) * 60, dy = 300 + hs(k, 513) * 600 + q * q * 400; c.fillStyle = pick(p, `rgba(250,248,236,${0.8 * (1 - q)})`, `rgba(150,170,205,${0.6 * (1 - q)})`); c.beginPath(); c.ellipse(dx, dy, 2, 3.5, 0, 0, TAU); c.fill(); }
  fogBand(c, p, 1500, 260, lit(p) ? 0.35 : 0.3, t, 31);
  fg(c, p, L, () => { for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(-20 + k * 30, H - 40, 18, 230, -0.5 + k * 0.14 + 0.03 * Math.sin(t * 0.8 + k), 0, TAU); c.fill(); } }, 9);
}

// ================================================================= shots
const R_CAM = cuts([{ a: RA, z0: 1.05, z1: 1.1, cx0: 520, cy0: 990, cx1: 560, cy1: 960 }, { a: ALAS, z0: 1.05, z1: 1.09, cx0: 560, cy0: 960, cx1: 520, cy1: 960 }], RB);
export const SHOTS_C: Shot[] = [
  {
    name: "rescue", a: RA, b: RB,
    draw: (c, p, _u, t, L) => { if (t < ALAS) drawRescueA(c, p, t, L); else drawRescueB(c, p, t, L); },
    lights: (_u, t): Light[] => t < ALAS
      ? [{ k: "spot", x: 840, y: 360, r: 1600, i: 0.36, col: [255, 222, 168] as RGB }, { k: "spot", x: 520, y: 980, r: 800, i: 0.16, col: [240, 226, 196] as RGB }]
      : [{ k: "spot", x: 300, y: 560, r: 1600, i: 0.36, col: [255, 222, 168] as RGB }, { k: "spot", x: 620, y: 960, r: 800, i: 0.16, col: [240, 226, 196] as RGB }],
    amb: () => 0.3,
    cam: R_CAM,
  },
  {
    name: "doubt", a: DA, b: DB, dust: 0.4,
    draw: (c, p, _u, t, L) => drawDoubt(c, p, t, L),
    lights: (_u, t): Light[] => {
      const fl = 0.92 + 0.05 * Math.sin(t * 7.1) + 0.03 * Math.sin(t * 12.3 + 1), ap = ss(HAL - 0.2, HAL + 0.9, t);
      return [
        { k: "spot", x: LAMP[0], y: LAMP[1] - 20, r: 1250, i: 0.95 * fl, col: WARM },
        { k: "spot", x: BULB[0], y: BULB[1], r: 520, i: 0.3, col: WARM },
        { k: "spot", x: WIN.x + WIN.w / 2, y: WIN.y + WIN.h / 2, r: 330, i: 0.35, col: MOON },
        { k: "spot", x: DOOR.x + 100, y: DOOR.y + 300, r: 380, i: 0.18, col: WARM },
        { k: "spot", x: WIN.x + WIN.w * 0.55, y: WIN.y + WIN.h * 0.72, r: 200, i: 0.4 * ap, col: LANTERN },
      ];
    },
    amb: () => 0.06,
    cam: (_u, t) => ({ z: move(t, DA, DB, 1.05, 1.11) + 0.02 * settle(t, NYATA - 0.15, NYATA + 0.85, 0, 1), cx: move(t, DA, DB, 580, 540) - 30 * settle(t, NYATA - 0.15, DB, 0, 1), cy: move(t, DA, DB, 990, 960), rot: 0 }),
  },
  {
    name: "offer", a: OA, b: OB,
    draw: (c, p, _u, t, L) => drawOffer(c, p, t, L),
    lights: (_u, t): Light[] => { const S = handState(t); return [
      { k: "spot", x: 560, y: 760, r: 1300, i: 0.32, col: MOON },
      { k: "spot", x: S.x + S.s * 1.6, y: S.y - S.s * 0.1, r: Math.max(120, S.s * 3.2), i: 0.62 * S.vis, col: [236, 232, 222] as RGB },
    ]; },
    amb: () => 0.05,
    cam: (_u, t) => ({ z: move(t, OA, JANGAN, 1.05, 1.13) + 0.016 * heartPulse(t), cx: move(t, OA, KABUT, 520, 560), cy: move(t, OA, JANGAN, 960, 930), rot: 0.004 * Math.sin(t * 0.3) }),
  },
  {
    name: "end", a: SHOT_RANGE("end")[0], b: SHOT_RANGE("end")[1],
    draw: (c) => { c.fillStyle = "#000"; c.fillRect(-PAD, -PAD, W + 2 * PAD, H + 2 * PAD); },
    lights: () => [], amb: () => 0, cam: () => ({ z: 1.04, cx: 540, cy: 960, rot: 0 }),
  },
];
