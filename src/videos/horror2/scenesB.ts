// Shots count..end of "Gelas Kelima" (v3: alive). People = sideFigure() only (rig proportions).
// Holds/points use IK targets: we pass reachF/reachB (rig v2) AND a locally solved armF/armB, so the pose is right
// whether or not the rig has its IK yet. Held glasses are drawn at the hand anchor, fingers wrap over them.
import { C2, Pal, box, cut, gedek, rough, rrect, castShadow, hash, clamp, ss, lerp } from "../horror1/paint";
import { Shot, Layer, Light, SHOT_RANGE, CUE, breathPhase, flick, move, settle, SIZE, W, H, WARM, TORCH, MOON } from "./types";
import * as RIG from "./rig";
import { sideFigure, sideJoints, torchCone, petromaks, coffeeGlass, kentongan, SidePose } from "./rig";
import { WORDS } from "./words";

const TAU = Math.PI * 2;
type P2 = [number, number];
type Grip = NonNullable<SidePose["gripB"]>;
const boxS = (c: C2, p: Pal, x: number, y: number, w: number, h: number, fill: string, hatch = 0, seed = 1, dir = 0.8, edge = 3) => box(c, p, x, y, w, h, fill, hatch, seed, dir, edge);
function cutS(c: C2, p: Pal, path: () => void, fill: string, opt: { edge?: number; hatch?: number; dir?: number; seed?: number; bbox?: [number, number, number, number] }) { path(); cut(c, p, fill, opt); }
const blurred = (c: C2, L: Layer, depth: number, px: number, fn: () => void) => { L(depth); c.filter = `blur(${px}px)`; fn(); c.filter = "none"; };
const jawFor = (who: string, t: number) => { for (const w of WORDS) if (w[0] === who && t >= w[2] - 0.03 && t <= w[3] + 0.03) return 0.35 + 0.35 * Math.abs(Math.sin((t - w[2]) * 19)); return 0; };
const talking = (who: string, t: number) => WORDS.some((w) => w[0] === who && t >= w[2] - 0.1 && t <= w[3] + 0.25);
const paper = (p: Pal) => (p.mode === "lit" ? "#fff6dc" : "#3a4a6a");
const glassCol = (p: Pal) => (p.mode === "lit" ? "rgba(255,252,240,0.35)" : "rgba(80,100,140,0.35)");
const coffeeCol = (p: Pal) => (p.mode === "lit" ? "#3a2010" : "#0a0c14");
const inkOf = (p: Pal) => (p.mode === "lit" ? p.ink : "#05070c");
const txt = (c: C2, p: Pal, s: string, x: number, y: number, size: number, col?: string, align: CanvasTextAlign = "center") => {
  c.font = `bold ${size}px 'Courier New', monospace`; c.textAlign = align; c.fillStyle = col ?? (p.mode === "lit" ? p.ink : "#1c2438"); c.fillText(s, x, y);
};
/** smooth value-noise wobble (no per-frame randomness) */
const wob = (t: number, seed: number, f = 0.5) => Math.sin(t * f * 1.7 + seed * 3.1) * 0.6 + Math.sin(t * f * 2.9 + seed * 1.3) * 0.4;

// ---------- IK (two-bone) in the rig's convention: angles from straight down, + toward the facing direction
const RIG_ANY = RIG as unknown as { handAnchor?: (J: ReturnType<typeof sideJoints>, s: "F" | "B") => { x: number; y: number; ang: number } };
function solveArm(x: number, y: number, Hh: number, pose: SidePose, target: P2): [number, number] {
  const J = sideJoints(x, y, Hh, { ...pose, reachF: undefined, reachB: undefined });
  const d = J.d, UA = 0.17 * Hh, FA = 0.15 * Hh;
  const lx = (target[0] - J.sh[0]) * d, ly = target[1] - J.sh[1];
  const D = Math.min(Math.hypot(lx, ly), (UA + FA) * 0.995) || 1;
  const base = Math.atan2(lx, ly);
  const a = Math.acos(clamp((UA * UA + D * D - FA * FA) / (2 * UA * D), -1, 1));
  const b = Math.acos(clamp((FA * FA + D * D - UA * UA) / (2 * FA * D), -1, 1));
  const s = base - a, f = base + b;      // elbow below the shoulder→hand line
  return [s, s - f];
}
/** pose with a hand reaching a world target (both rig v2 field and local IK fallback) */
function reach(x: number, y: number, Hh: number, pose: SidePose, side: "F" | "B", target: P2 | null, grip?: Grip): SidePose {
  if (!target) return { ...pose, ...(grip ? (side === "F" ? { gripF: grip } : { gripB: grip }) : {}) };
  const arm = solveArm(x, y, Hh, pose, target);
  return side === "F" ? { ...pose, armF: arm, reachF: target, gripF: grip ?? pose.gripF } : { ...pose, armB: arm, reachB: target, gripB: grip ?? pose.gripB };
}
/** where a held object sits: rig.handAnchor if available, else hand + forearm direction */
function anchor(J: ReturnType<typeof sideJoints>, side: "F" | "B") {
  if (RIG_ANY.handAnchor) return RIG_ANY.handAnchor(J, side);
  const A = side === "F" ? J.AF : J.AB, f = A.f, d = J.d;
  return { x: A.ha[0] + d * Math.sin(f) * 0.018 * J.u, y: A.ha[1] + Math.cos(f) * 0.018 * J.u, ang: d === 1 ? f : -f };
}
/** a glass held in a hand: upright-ish glass centred on the anchor, then 4 fingers wrapping its front */
function heldGlass(c: C2, p: Pal, J: ReturnType<typeof sideJoints>, side: "F" | "B", gh: number, level: number, t: number, tilt: number, steam: number, seed: number) {
  const A = anchor(J, side), d = J.d;
  c.save(); c.translate(A.x, A.y); c.rotate(tilt * d);
  coffeeGlass(c, 0, gh * 0.5, gh, level, t, inkOf(p), glassCol(p), coffeeCol(p), steam, seed);
  c.fillStyle = p.fig; c.strokeStyle = p.fig; c.lineCap = "round";
  for (let k = 0; k < 4; k++) { c.lineWidth = gh * (0.11 - k * 0.012); const yy = -gh * 0.12 + k * gh * 0.13; c.beginPath(); c.moveTo(-d * gh * 0.42, yy); c.quadraticCurveTo(0, yy + gh * 0.04, d * gh * 0.2, yy + gh * 0.02); c.stroke(); }
  c.beginPath(); c.ellipse(-d * gh * 0.36, 0, gh * 0.16, gh * 0.3, 0, 0, TAU); c.fill(); // palm behind
  c.restore();
}

/** shared night-wind gust (0..1): drives sarung, kentongan, curtain, smoke drift */
const gust = (t: number) => clamp(0.35 + 0.35 * Math.sin(t * 0.42) + 0.3 * Math.sin(t * 1.13 + 1.2) * Math.max(0, Math.sin(t * 0.21 + 0.4)), 0, 1);
const bump = (t: number, c0: number, w: number) => Math.exp(-((t - c0) / w) * ((t - c0) / w));
/** condensation beads on a glass (lit pass): bottom-centre (x,y), height h */
function condens(c: C2, p: Pal, x: number, y: number, h: number, seed: number) {
  if (p.mode !== "lit") return; c.fillStyle = "rgba(255,255,250,0.55)";
  for (let k = 0; k < 14; k++) { const fy = hash(seed + k * 1.7), fx = hash(seed * 3 + k) * 2 - 1, w = 0.34 * h + 0.08 * h * fy; c.beginPath(); c.arc(x + fx * w * 0.9, y - fy * h * 0.85, 1.2 + 1.6 * hash(k + seed), 0, TAU); c.fill(); }
}
/** a cloud of mosquitoes jittering (smoothly) under the lamp */
function mosquitos(c: C2, p: Pal, cx: number, cy: number, t: number, n = 22, r = 70) {
  c.fillStyle = p.mode === "lit" ? "rgba(22,14,10,0.75)" : "rgba(40,52,80,0.8)";
  for (let k = 0; k < n; k++) { const a = t * (1.5 + hash(k) * 2) + k, x = cx + Math.sin(a * 1.3 + k) * r * hash(k * 2.2) + Math.sin(t * 9 + k) * 3, y = cy + Math.cos(a * 0.9 + k * 0.7) * r * 0.6 * hash(k * 3.1) + Math.cos(t * 11 + k) * 3; c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
}
/** kretek ash: a flake drops from the ember every ~2.5 s */
function ashFall(c: C2, p: Pal, x: number, y: number, t: number, floorY: number) {
  c.fillStyle = p.mode === "lit" ? "rgba(140,130,120,0.85)" : "rgba(70,80,100,0.6)";
  for (let k = 0; k < 3; k++) { const ph = ((t + k * 0.83) % 2.5) / 2.5, fy = y + ph * ph * (floorY - y), fx = x + Math.sin(ph * 6 + k) * 6; if (fy < floorY) { c.beginPath(); c.ellipse(fx, fy, 3, 1.6, ph * 3, 0, TAU); c.fill(); } }
}
/** clay water jug (kendi) */
function kendi(c: C2, p: Pal, x: number, y: number, s: number) {
  c.fillStyle = p.mode === "lit" ? "#8a4a2a" : "#0c1020"; c.beginPath(); c.ellipse(x, y - s * 0.45, s * 0.42, s * 0.42, 0, 0, TAU); c.fill();
  c.fillRect(x - s * 0.1, y - s * 1.05, s * 0.2, s * 0.3); c.beginPath(); c.ellipse(x, y - s * 1.05, s * 0.14, s * 0.05, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.3, y - s * 0.6); c.lineTo(x + s * 0.62, y - s * 0.78); c.lineTo(x + s * 0.6, y - s * 0.7); c.lineTo(x + s * 0.32, y - s * 0.48); c.fill(); // spout
  c.strokeStyle = inkOf(p); c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y - s * 0.45, s * 0.42, s * 0.42, 0, 0, TAU); c.stroke();
  if (p.mode === "lit") { c.strokeStyle = "rgba(255,240,220,0.35)"; c.lineWidth = 4; c.beginPath(); c.arc(x - s * 0.12, y - s * 0.55, s * 0.22, 3.6, 4.6); c.stroke(); }
}
/** ants marching up a jar side */
function ants(c: C2, p: Pal, x: number, y0: number, y1: number, t: number) {
  c.fillStyle = p.mode === "lit" ? "#1a0e08" : "#05070c";
  for (let k = 0; k < 9; k++) { const f = ((t * 0.12 + k / 9) % 1), yy = lerp(y0, y1, f), xx = x + Math.sin(f * 20 + k) * 2; c.beginPath(); c.ellipse(xx, yy, 1.6, 2.6, 0, 0, TAU); c.fill(); }
}

// ================= POS RONDA interior (same layout as shots A) =================
const FY = 1250, HS = 760, SEAT = 0.28 * HS, SY = FY - SEAT;
const SEATS = { udin: 110, yanto: 310, darto: 510, aku: 710, empty: 900 };
const LAMP: P2 = [520, 300];
const lima = CUE("lima");
/** moths circling the petromaks; they FREEZE on "lima" (nature goes silent) and their shadows flutter on the wall */
function moths(c: C2, p: Pal, cx: number, cy: number, t: number, scale = 1, shadows = true) {
  const tt = Math.min(t, lima);
  for (let i = 0; i < 9; i++) {
    const r = (55 + 70 * hash(i * 3.3)) * scale, sp = 1.2 + 1.6 * hash(i * 7.1), a = tt * sp + i * 0.8;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a * 1.3) * r * 0.55 + (t > lima ? Math.min(30, (t - lima) * 4) * hash(i) : 0);
    const flap = t > lima ? 0.4 : 0.6 + 0.4 * Math.abs(Math.sin(t * 30 + i));
    if (shadows && p.mode === "lit") { // enlarged soft shadow thrown on the gedek behind (the lamp is between)
      const sx = cx + (x - cx) * 2.6, sy = cy + (y - cy) * 2.6 + 40;
      c.fillStyle = "rgba(22,14,10,0.16)"; c.beginPath(); c.ellipse(sx - 8 * scale, sy, 11 * scale * flap, 6 * scale, -0.5, 0, TAU); c.ellipse(sx + 8 * scale, sy, 11 * scale * flap, 6 * scale, 0.5, 0, TAU); c.fill();
    }
    c.fillStyle = p.mode === "lit" ? p.ink : "#2a3550";
    c.beginPath(); c.ellipse(x - 3 * scale, y, 4 * scale * flap, 2.2 * scale, -0.5, 0, TAU); c.ellipse(x + 3 * scale, y, 4 * scale * flap, 2.2 * scale, 0.5, 0, TAU); c.fill();
  }
}
/** cicak (house gecko): darts a short way every few seconds, freezes in between */
function cicak(c: C2, p: Pal, x0: number, y0: number, t: number, seed: number, scale = 1, path: P2 = [60, -40]) {
  const cyc = 3.6 + hash(seed) * 2, ph = ((t + seed * 1.7) % cyc) / cyc, k = Math.floor((t + seed * 1.7) / cyc);
  const dart = ss(0.0, 0.08, ph), dir = k % 2 ? -1 : 1;
  const x = x0 + dir * path[0] * (dart - 0.5), y = y0 + dir * path[1] * (dart - 0.5), ang = Math.atan2(path[1] * dir, path[0] * dir);
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(scale, scale); c.fillStyle = p.mode === "lit" ? "#3a2c20" : "#0a0e18"; c.strokeStyle = c.fillStyle; c.lineCap = "round";
  c.beginPath(); c.ellipse(0, 0, 16, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(17, 0, 6, 4.5, 0, 0, TAU); c.fill();
  c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-30, 4 * Math.sin(t * 2 + seed), -40, 2); c.stroke(); // tail
  c.lineWidth = 2.4; const st = dart > 0 && dart < 1 ? Math.sin(t * 40) * 3 : 0;
  for (const [lx, sy] of [[8, 1], [8, -1], [-8, 1], [-8, -1]] as P2[]) { c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx + 5 + st * sy, sy * 9); c.stroke(); }
  c.restore();
}
function smokeCurl(c: C2, p: Pal, x: number, y: number, t: number, len: number, drift: number, seed: number, alpha = 1) {
  c.strokeStyle = p.mode === "lit" ? `rgba(70,58,46,${0.28 * alpha})` : `rgba(130,148,185,${0.16 * alpha})`; c.lineWidth = 3;
  c.beginPath(); for (let k = 0; k < 44; k++) { const f = k / 44, yy = y - f * len, xx = x + drift * f * f + Math.sin(k * 0.32 + t * 1.2 + seed) * 18 * f; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
}
function posBack(c: C2, p: Pal, L: Layer, t: number) {
  L(0.6);
  gedek(c, p, -100, -100, W + 200, FY + 100);
  if (p.mode === "lit") { // crack + coffee-coloured water stain on the gedek
    c.strokeStyle = "rgba(22,14,10,0.55)"; c.lineWidth = 2; c.beginPath(); c.moveTo(460, 560); c.lineTo(472, 610); c.lineTo(462, 650); c.lineTo(480, 700); c.moveTo(472, 610); c.lineTo(495, 628); c.stroke();
    const sg = c.createRadialGradient(600, 900, 10, 600, 900, 120); sg.addColorStop(0, "rgba(120,90,50,0.18)"); sg.addColorStop(1, "rgba(120,90,50,0)"); c.fillStyle = sg; c.fillRect(480, 780, 240, 240);
  }
  boxS(c, p, -100, 150, W + 200, 46, p.wood2, 0.6, 201, 1.57, 3);
  for (let k = 0; k < 6; k++) boxS(c, p, -60 + k * 230, -100, 26, 250, p.wood2, 0.5, 202 + k, 0.2, 2);
  // rope lashings (knots) where rafters meet the beam
  c.strokeStyle = p.mode === "lit" ? "#5a4630" : "#05070c"; c.lineWidth = 3;
  for (let k = 0; k < 6; k++) { const rx = -47 + k * 230; for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(rx - 16, 150 + j * 9); c.lineTo(rx + 16, 158 + j * 9); c.stroke(); } }
  boxS(c, p, 60, 380, 330, 92, p.cloth, 0.15, 210, 0.8, 4);
  txt(c, p, "POS KAMLING", 225, 435, 40); txt(c, p, "RT 04 / RW 02", 225, 462, 20);
  // framed photo of Pak RT (faceless portrait)
  boxS(c, p, 420, 400, 80, 100, p.wood2, 0.3, 209, 0.8, 3);
  c.fillStyle = p.mode === "lit" ? "#d8ccb0" : "#101626"; c.fillRect(430, 410, 60, 80);
  c.fillStyle = inkOf(p); c.beginPath(); c.ellipse(460, 440, 13, 16, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(460, 495, 26, 30, 0, Math.PI, 0); c.fill(); c.fillRect(447, 421, 26, 9);
  boxS(c, p, 640, 250, 300, 300, p.wood, 0.2, 211, 0.8, 4);
  if (p.mode === "lit") {
    txt(c, p, "JADWAL RONDA", 790, 290, 24);
    c.strokeStyle = p.ink; c.lineWidth = 2;
    const days = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];
    days.forEach((dd, i) => { const y = 320 + i * 31; c.beginPath(); c.moveTo(655, y + 8); c.lineTo(925, y + 8); c.stroke(); txt(c, p, dd, 690, y + 2, 17); for (let k = 0; k < 4; k++) { c.fillStyle = p.ink; c.fillRect(735 + k * 46, y - 8, 34 + 8 * hash(i * 9 + k), 4); } });
    c.strokeStyle = "#b3121a"; c.lineWidth = 3; c.strokeRect(652, 320 + 4 * 31 - 18, 278, 30);
  }
  boxS(c, p, 290, 220, 120, 150, p.cloth, 0.1, 212, 0.8, 3);
  if (p.mode === "lit") { c.fillStyle = "#b3121a"; c.fillRect(290, 220, 120, 26); c.strokeStyle = p.ink; c.lineWidth = 1.5; for (let i = 0; i < 28; i++) c.strokeRect(298 + (i % 7) * 15, 255 + Math.floor(i / 7) * 26, 12, 20); }
  // hanging sarung on a nail, swaying a little in the night air
  c.save(); c.translate(1020, 298); c.rotate((0.012 + 0.04 * gust(t)) * Math.sin(t * 0.9) + 0.01 * Math.sin(t * 2.3)); c.translate(-1020, -298);
  cutS(c, p, () => rough(c, [[990, 300], [1050, 296], [1070, 560], [1040, 700], [985, 690], [975, 560]], true, 3, 213), p.mode === "lit" ? "#9a7a5a" : "#121a2a", { edge: 3, hatch: 0.35, dir: 1.57, bbox: [975, 296, 95, 404], seed: 214 });
  if (p.mode === "lit") { c.strokeStyle = "rgba(22,14,10,0.5)"; c.lineWidth = 3; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(980, 330 + k * 60); c.lineTo(1065, 326 + k * 60); c.stroke(); } }
  c.restore();
  boxS(c, p, 40, 620, 330, 18, p.wood2, 0.4, 215, 1.57, 2);
  boxS(c, p, 60, 520, 150, 100, p.wood, 0.3, 216, 0.8, 3);
  c.fillStyle = inkOf(p); c.beginPath(); c.arc(105, 570, 28, 0, TAU); c.fill();
  c.fillRect(150, 548, 46, 10); c.fillRect(150, 568, 46, 10); c.strokeStyle = c.fillStyle; c.lineWidth = 3; c.beginPath(); c.moveTo(195, 520); c.lineTo(250, 430); c.stroke();
  c.beginPath(); c.arc(250, 430, 4, 0, TAU); c.fill(); // antenna tip
  boxS(c, p, 250, 500, 56, 120, p.mode === "lit" ? "#7a2a22" : "#14182a", 0.3, 217, 0.8, 3);
  boxS(c, p, 256, 488, 44, 16, p.wood2, 0.2, 218, 0.8, 2);
  smokeCurl(c, p, 278, 486, t, 130, 20 + 40 * gust(t), 3.7, 0.9); // thermos steam
  // sugar jar (toples) + cigarette pack on the shelf
  boxS(c, p, 318, 560, 42, 58, glassCol(p), 0.1, 219, 0.8, 2); c.fillStyle = p.mode === "lit" ? "#efe8d8" : "#1a2236"; c.fillRect(322, 585, 34, 30);
  boxS(c, p, 205, 600, 36, 20, p.mode === "lit" ? "#b3121a" : "#1a1420", 0.1, 221, 0.8, 2);
  ants(c, p, 340, 618, 566, t);
  // gecko on the gedek, darting now and then; it FREEZES on "lima"
  cicak(c, p, 560, 760, Math.min(t, lima), 1, 1.1, [80, -50]);
  // floor
  L(1);
  boxS(c, p, -100, FY, W + 200, H - FY + 100, p.wood, 0.75, 220, 1.57, 0);
  if (p.mode === "lit") { c.strokeStyle = p.ink; c.lineWidth = 2; for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(-100, FY + 30 + k * k * 9); c.lineTo(W + 100, FY + 34 + k * k * 9); c.stroke(); } }
  // mosquito coil + its thin smoke
  c.strokeStyle = p.mode === "lit" ? "#3a2a1c" : "#05070c"; c.lineWidth = 4; c.beginPath(); for (let k = 0; k < 60; k++) { const a = k * 0.35, r = 4 + k * 0.45; k ? c.lineTo(840 + Math.cos(a) * r, FY + 40 + Math.sin(a) * r * 0.35) : c.moveTo(840, FY + 40); } c.stroke();
  c.fillStyle = "#ff6a20"; c.beginPath(); c.arc(866, FY + 38, 2.5, 0, TAU); c.fill();
  smokeCurl(c, p, 866, FY + 36, t, 360, 30 + 60 * gust(t), 2.2);
  kendi(c, p, 975, FY + 10, 110);
  // broom leaning on the left post
  c.strokeStyle = p.mode === "lit" ? "#6a5238" : "#05070c"; c.lineWidth = 7; c.beginPath(); c.moveTo(-20, FY - 520); c.lineTo(30, FY - 40); c.stroke();
  c.fillStyle = p.mode === "lit" ? "#8a6a3a" : "#05070c"; c.beginPath(); c.moveTo(12, FY - 60); c.lineTo(58, FY - 50); c.lineTo(70, FY); c.lineTo(-6, FY); c.closePath(); c.fill();
  if (p.mode === "lit") { c.strokeStyle = "rgba(22,14,10,0.6)"; c.lineWidth = 1.5; for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(18 + k * 5, FY - 52); c.lineTo(k * 9 - 2, FY); c.stroke(); } }
}
/** bale bambu with slats; `dent` bows the slats under the empty seat; coffee ring stains on the top */
function bale(c: C2, p: Pal, dent: number) {
  for (const lx of [-40, 250, 560, 860, W + 20]) boxS(c, p, lx, SY + 16, 26, FY - SY - 16, p.wood2, 0.6, 230 + lx, 0.2, 2);
  const x0 = -100, x1 = W + 100, dx0 = SEATS.empty - 80, dx1 = SEATS.empty + 140, d = 9 * dent;
  cutS(c, p, () => {
    c.beginPath(); c.moveTo(x0, SY); c.lineTo(dx0, SY); c.quadraticCurveTo((dx0 + dx1) / 2, SY + d * 2, dx1, SY); c.lineTo(x1, SY);
    c.lineTo(x1, SY + 24); c.lineTo(dx1, SY + 24); c.quadraticCurveTo((dx0 + dx1) / 2, SY + 24 + d * 2, dx0, SY + 24); c.lineTo(x0, SY + 24); c.closePath();
  }, p.wood, { edge: 3, hatch: 0.4, dir: 1.57, bbox: [x0, SY, x1 - x0, 24], seed: 235 });
  if (p.mode === "lit") {
    c.strokeStyle = p.ink; c.lineWidth = 1.5; for (let x = x0; x < x1; x += 34) { const yy = x > dx0 && x < dx1 ? d * 2 * (1 - Math.pow(((x - dx0) / (dx1 - dx0)) * 2 - 1, 2)) : 0; c.beginPath(); c.moveTo(x, SY + yy * 0.5); c.lineTo(x, SY + 24 + yy * 0.5); c.stroke(); }
    c.strokeStyle = "rgba(70,40,20,0.35)"; c.lineWidth = 2; for (const rx of [235, 430, 655]) { c.beginPath(); c.ellipse(rx, SY + 4, 22, 4, 0, 0, TAU); c.stroke(); }
  }
  boxS(c, p, -100, SY + 120, W + 200, 14, p.wood2, 0.4, 236, 1.57, 2);
  c.fillStyle = p.mode === "lit" ? "#2a1a10" : "#05070c";
  for (const sx of [150, 360, 610, 760]) for (const o of [0, 40]) { c.beginPath(); c.ellipse(sx + o, FY - 5, 22, 6, 0, 0, TAU); c.fill(); }
}
function lamp(c: C2, p: Pal, t: number, x = LAMP[0], y = LAMP[1], size = 230) {
  c.strokeStyle = inkOf(p); c.lineWidth = 3; c.beginPath(); c.moveTo(x, 196); c.lineTo(x, y); c.stroke();
  c.save(); c.translate(x, 196); c.rotate(0.012 * Math.sin(t * 0.7)); c.translate(-x, -196);
  petromaks(c, x, y, size, inkOf(p), (0.85 + 0.15 * flick(t)) * (1 - 0.65 * bump(t, lima + 0.25, 0.35)), paper(p));
  c.restore();
  moths(c, p, x, y + size * 0.36, t);
  mosquitos(c, p, x - 30, y + size * 1.25, Math.min(t, lima + 0.02), 20, 60);
}
/** kentongan with its wooden beater hanging on a short cord, both swaying a touch */
function kentWithBeater(c: C2, p: Pal, x: number, y: number, len: number, t: number) {
  const sw = (0.01 + 0.035 * gust(t)) * Math.sin(t * 0.8);
  kentongan(c, x, y, len, p.mode === "lit" ? p.wood2 : "#05070c", sw);
  c.save(); c.translate(x + len * 0.28, y + 6); c.rotate(0.05 * Math.sin(t * 0.9 + 1));
  c.strokeStyle = inkOf(p); c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, len * 0.25); c.stroke();
  c.fillStyle = p.mode === "lit" ? p.wood2 : "#05070c"; c.save(); c.translate(0, len * 0.25); c.rotate(0.15); c.fillRect(-5, 0, 10, len * 0.42); c.beginPath(); c.ellipse(0, len * 0.42, 11, 16, 0, 0, TAU); c.fill(); c.restore();
  c.restore();
}
/** tin tray with spoon + glasses' rings (drawn under the glasses) */
function tray(c: C2, p: Pal, x: number, y: number, w: number, jig = 0) {
  c.fillStyle = p.mode === "lit" ? "#9a9488" : "#141a28"; c.beginPath(); c.ellipse(x, y, w / 2, 12, 0, 0, TAU); c.fill();
  c.strokeStyle = inkOf(p); c.lineWidth = 3; c.stroke();
  // spoon: jiggles (clinks) when a glass is put down / picked up
  c.save(); c.translate(x + w * 0.27, y - 2); c.rotate(-0.08 + 0.12 * jig); c.translate(0, -5 * Math.abs(jig));
  c.strokeStyle = p.mode === "lit" ? "#5c5850" : "#0a0e18"; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * 0.17, -3); c.stroke();
  c.fillStyle = c.strokeStyle; c.beginPath(); c.ellipse(0, 0, 7, 3.5, -0.2, 0, TAU); c.fill(); c.restore();
}

// ================= shots =================
const [coA, coB] = SHOT_RANGE("count");
const [daA, daB] = SHOT_RANGE("darto");
const [drA, drB] = SHOT_RANGE("drink");
const [dwA, dwB] = SHOT_RANGE("dawn");
const [udA, udB] = SHOT_RANGE("udin");
const [hoA, hoB] = SHOT_RANGE("home");
const [enA, enB] = SHOT_RANGE("end");
const C1 = CUE("count1"), C2c = CUE("count2"), C3 = CUE("count3"), C4 = CUE("count4"), POINT = CUE("point");
const torchOff = CUE("torchOff"), sipStart = CUE("sipStart"), sipEnd = CUE("sipEnd"), rooster = CUE("rooster"), udinAsk = CUE("udinAsk");
const H1 = CUE("countHome1"), H5 = CUE("countHome5");
const sips = [0, 1, 2].map((k) => sipStart + 0.4 + k * 0.95);

// ---- count shot poses
const idleOf = (t: number, seed: number, amount = 1) => ({ t, seed, amount });
const yantoFreeze = (t: number) => Math.min(t, lima - 0.05); // Yanto freezes on "lima" (his time stops)
function poseUdin(t: number): SidePose {
  const glance = settle(t, C4 - 0.2, C4 + 0.5, 0, 1) * (1 - ss(lima + 0.8, lima + 1.6, t)); // glances up at the narrator while he counts
  return { sit: SEAT * 0.97, armB: [0.6, 1.2], breath: t * 2.0 + 1.1, head: 0.06 - 0.12 * glance + 0.02 * wob(t, 1), idle: idleOf(t, 11) };
}
function poseYanto(t: number): SidePose {
  const ty = yantoFreeze(t);
  const base: SidePose = { sit: SEAT, breath: ty * 1.9 + 2.3, head: 0.05 + 0.03 * wob(ty, 2), idle: idleOf(ty, 12, t > lima ? 0 : 1) };
  // he holds his glass near his lap, lifting it toward his mouth slowly... and stops dead on "lima"
  const lift = move(ty, C3, lima, 0, 0.55);
  const Jb = sideJoints(SEATS.yanto, FY, HS, base);
  const mouth: P2 = [Jb.head[0] + 0.05 * HS, Jb.head[1] + 0.07 * HS];
  const lap: P2 = [Jb.hip[0] + 0.17 * HS, Jb.hip[1] - 0.06 * HS];
  return reach(SEATS.yanto, FY, HS, base, "B", [lerp(lap[0], mouth[0], lift), lerp(lap[1], mouth[1], lift)], "glass");
}
function poseDarto(t: number): SidePose {
  return { sit: SEAT, armF: [0.65, 0.9], torch: "F", gripF: "torch", torchOn: 1, breath: t * 1.7 + 0.4, head: 0.18 + 0.015 * wob(t, 3, 0.3), jaw: jawFor("D", t), idle: idleOf(t, 13, 0.5) };
}
/** the narrator: faces back (-x) and points at each man's chest (IK, settle between targets); on "point" he turns to the empty seat */
const chestOf = (x: number, pose: SidePose, Hh = HS): P2 => { const J = sideJoints(x, FY, Hh, pose); return [J.sh[0] + J.d * 0.03 * Hh, J.sh[1] + 0.07 * Hh]; };
function akuPoseAt(t: number, dir: 1 | -1): SidePose {
  const base: SidePose = { dir, sit: SEAT, breath: t * 2.1, head: dir === -1 ? 0.06 : 0.12, idle: idleOf(t, 14, 0.6) };
  if (dir === -1) {
    const targets: [number, P2][] = [[C1, chestOf(SEATS.udin, poseUdin(t), HS * 0.97)], [C2c, chestOf(SEATS.yanto, poseYanto(t))], [C3, chestOf(SEATS.darto, poseDarto(t))],
      [C4, (() => { const J = sideJoints(SEATS.aku, FY, HS, base); return [J.sh[0] + 0.02 * HS, J.sh[1] + 0.09 * HS] as P2; })()]];
    if (t < C1 - 0.45) return reach(SEATS.aku, FY, HS, base, "B", null);
    // arm travels along an arc between targets (lift a little mid-way), settles on each
    let tgt: P2 = targets[0][1];
    for (let i = 0; i < targets.length; i++) {
      const [tc, pt] = targets[i]; if (t < tc - 0.4) break;
      const prev = i ? targets[i - 1][1] : ([pt[0] + 0.15 * HS, pt[1] + 0.12 * HS] as P2);
      const k = settle(t, tc - 0.4, tc + 0.12, 0, 1), arc = Math.sin(clamp((t - (tc - 0.4)) / 0.52) * Math.PI) * 0.05 * HS;
      tgt = [lerp(prev[0], pt[0], k), lerp(prev[1], pt[1], k) - arc];
    }
    return reach(SEATS.aku, FY, HS, base, "B", tgt, "point");
  }
  // facing front: arm follows the head with a lag (anticipation): rises from the lap to the empty seat
  const seat: P2 = [SEATS.empty + 10, SY - 0.2 * HS];
  const Jb = sideJoints(SEATS.aku, FY, HS, base), lap: P2 = [Jb.hip[0] + 0.16 * HS, Jb.hip[1] - 0.05 * HS];
  const k = settle(t, POINT - 0.05, POINT + 0.55, 0, 1);
  return reach(SEATS.aku, FY, HS, { ...base, head: 0.12 - 0.06 * k }, "B", [lerp(lap[0], seat[0], k), lerp(lap[1], seat[1], k)], k > 0.2 ? "point" : "open");
}
const swell = (t: number, tc: number) => ss(tc - 0.3, tc, t) * (1 - ss(tc + 0.5, tc + 0.95, t));
/** the FIFTH one: exists only as a shadow on the gedek (lamp light). Sits at the empty seat facing the narrator; lifts the glass on "lima" */
function poseGhost(t: number): SidePose {
  const base: SidePose = { dir: -1, sit: SEAT, breath: 0, head: 0.1, idle: idleOf(0, 77, 0) };
  const J = sideJoints(SEATS.empty, FY, HS, base);
  const glass: P2 = [SEATS.empty + 40, SY - 30], mouth: P2 = [J.head[0] - 0.05 * HS, J.head[1] + 0.075 * HS];
  const k = move(t, lima - 0.1, lima + 1.0, 0, 1) * (1 - move(t, coB - 1.6, coB - 0.6, 0, 1));
  return reach(SEATS.empty, FY, HS, { ...base, head: 0.1 - 0.25 * k }, "B", [lerp(glass[0], mouth[0], k), lerp(glass[1], mouth[1], k)], "glass");
}
/** count camera: wide row, a tight profile insert on each counted face, a dolly along the pointing arm, then a macro of the 5th glass */
function countCam(t: number) {
  const heads = [sideJoints(SEATS.udin, FY, HS * 0.97, poseUdin(t)).head, sideJoints(SEATS.yanto, FY, HS, poseYanto(t)).head, sideJoints(SEATS.darto, FY, HS, poseDarto(t)).head, sideJoints(SEATS.aku, FY, HS, akuPoseAt(t, -1)).head];
  const cs = [C1, C2c, C3, C4];
  for (let i = 0; i < 4; i++) if (t >= cs[i] - 0.15 && t < cs[i] + 0.55) { const k = (t - cs[i] + 0.15) / 0.7; return { z: 2.5 + 0.12 * k, cx: heads[i][0] + 20, cy: heads[i][1] + 40, rot: 0 }; }
  if (t >= lima - 0.12) return { z: move(t, lima - 0.12, coB, 3.3, 3.75), cx: SEATS.empty + 40, cy: SY - 60, rot: 0 };
  if (t >= POINT - 0.1) { const Ja = sideJoints(SEATS.aku, FY, HS, akuPoseAt(t, 1)); const k = move(t, POINT - 0.1, lima - 0.12, 0, 1); return { z: lerp(1.9, 2.3, k), cx: lerp(Ja.sh[0], SEATS.empty + 20, k), cy: lerp(Ja.sh[1] + 40, SY - 90, k), rot: 0 }; }
  const cx = t < C1 ? move(t, coA, C1, 430, 330) : move(t, C1, C4 + 0.6, 330, 560);
  return { z: move(t, coA, POINT, 1.05, 1.12), cx, cy: move(t, coA, coB, 900, 960), rot: 0 };
}

// ---- drink shot (medium close, everyone faces LEFT; the empty seat is at the left, safe from the TikTok UI)
const HD = 1220, SEATD = 0.28 * HD, SYD = 1350, FYD = SYD + SEATD;
const DSEAT = { empty: 170, aku: 440, darto: 700, yanto: 960, udin: 1250 }; // Udin sits just off-frame right
const DLOOK = { aku: "aku", darto: "darto", yanto: "yanto", udin: "udin" } as const;
/** one drinker: reach to the glass on the tray, lift to the mouth (head tips back), sip, lower, release */
function drinker(t: number, who: keyof typeof DLOOK, start: number, end: number, seed: number) {
  const x = DSEAT[who], Hh = who === "udin" ? HD * 0.97 : HD;
  const base: SidePose = { dir: -1, sit: SEATD * (who === "udin" ? 0.97 : 1), breath: t * (1.6 + seed * 0.1) + seed, idle: idleOf(t, 20 + seed, who === "aku" && t < sipEnd ? 0.15 : 0.8),
    torch: who === "darto" ? "F" : undefined, torchOn: 0, armF: who === "darto" ? [0.3, 0.6] : [0.25, 0.35] };
  const Jb = sideJoints(x, FYD, Hh, base);
  const glassRest: P2 = [x - 0.17 * Hh, SYD - 0.05 * Hh];       // glass on the tray in front of him
  const mouth: P2 = [Jb.head[0] - 0.055 * Hh, Jb.head[1] + 0.075 * Hh];
  const lap: P2 = [Jb.hip[0] - 0.12 * Hh, Jb.hip[1] - 0.05 * Hh];
  const r1 = move(t, start, start + 0.55, 0, 1);                  // reach to the glass
  const up = move(t, start + 0.6, start + 1.35, 0, 1) * (1 - move(t, end - 0.75, end, 0, 1)); // lift / lower
  const back = move(t, end, end + 0.5, 0, 1);                     // put down and release
  const sip = up > 0.95 ? ss(start + 1.4, start + 1.8, t) * (1 - ss(end - 1.1, end - 0.8, t)) : 0;
  const glassPos: P2 = [lerp(glassRest[0], mouth[0] - 0.01 * Hh, up), lerp(glassRest[1], mouth[1] + 0.03 * Hh, up)];
  const hand: P2 = back > 0 ? [lerp(glassRest[0], lap[0], back), lerp(glassRest[1], lap[1], back)] : r1 < 1 ? [lerp(lap[0], glassRest[0], r1), lerp(lap[1], glassRest[1], r1)] : glassPos;
  const holding = r1 >= 0.98 && back < 0.02;
  const pose = reach(x, FYD, Hh, { ...base, head: 0.05 - 0.28 * up - 0.06 * sip + 0.02 * wob(t, seed) }, "B", hand, holding ? "glass" : r1 > 0.6 && back < 0.5 ? "open" : "fist");
  const level = 0.82 - 0.35 * move(t, start + 1.5, end - 0.9, 0, 1);
  return { x, Hh, pose, holding, glassRest, up, level, look: DLOOK[who] };
}
function drinkers(t: number) {
  return [drinker(t, "yanto", 45.25, 49.6, 1), drinker(t, "darto", 45.6, 49.9, 2), drinker(t, "udin", 45.95, 50.1, 3), drinker(t, "aku", sipEnd - 0.55, sipEnd + 3.6, 4)];
}

// ---- darto close-up
function dartoClose(t: number) {
  const on = 1 - move(t, torchOff - 0.05, torchOff + 0.25, 0, 1);
  const nod = 0.025 * Math.sin((t - daA) * 0.9) * (talking("D", t) ? 1.6 : 1) + 0.01 * wob(t, 7);
  const pose: SidePose = { dir: 1, armF: [0.55, 1.5], torch: "F", gripF: "torch", torchOn: on, breath: breathPhase(t), head: 0.28 + nod, jaw: jawFor("D", t), idle: idleOf(t, 31, 0.4) };
  const J = sideJoints(430, 3160, 2600, pose);
  return { J, on, pose };
}

export const SHOTS_B: Shot[] = [
  { // the count along the bale; "lima" lands on the empty seat
    name: "count", a: coA, b: coB, dust: 0.5,
    draw: (c, p, u, t, L) => {
      posBack(c, p, L, t);
      L(1);
      lamp(c, p, t);
      kentWithBeater(c, p, 40, 196, 300, t);
      const dent = move(t, POINT, lima + 0.4, 0, 1);
      // the narrator turns: a 0.24 s cross-fade between facing back and facing front (no pop)
      const turnK = ss(POINT - 0.4, POINT - 0.16, t);
      const people = (fill: string, withHeld: boolean) => {
        sideFigure(c, SEATS.udin, FY, HS * 0.97, fill, "udin", poseUdin(t));
        const py = poseYanto(t), Jy = sideFigure(c, SEATS.yanto, FY, HS, fill, "yanto", py);
        sideFigure(c, SEATS.darto, FY, HS, fill, "darto", poseDarto(t));
        if (turnK < 1) { c.globalAlpha = 1 - turnK; sideFigure(c, SEATS.aku, FY, HS, fill, "aku", akuPoseAt(t, -1)); }
        if (turnK > 0) { c.globalAlpha = turnK; sideFigure(c, SEATS.aku, FY, HS, fill, "aku", akuPoseAt(t, 1)); }
        c.globalAlpha = 1;
        if (withHeld) heldGlass(c, p, Jy, "B", 62, 0.7, yantoFreeze(t), 0, t > lima ? 0.2 : 0.9, 3.3);
      };
      // FIVE shadows on the gedek for four men: the fifth sits at the empty seat (shadow only) and lifts its glass on "lima"
      castShadow(c, p, LAMP[0], LAMP[1] + 80, 1.12, (fill) => {
        people(fill, false);
        const Jg = sideFigure(c, SEATS.empty, FY, HS, fill, "darto", poseGhost(t));
        const A = anchor(Jg, "B"); c.fillStyle = fill; c.beginPath(); c.moveTo(A.x - 20, A.y + 31); c.lineTo(A.x - 25, A.y - 31); c.lineTo(A.x + 25, A.y - 31); c.lineTo(A.x + 20, A.y + 31); c.closePath(); c.fill();
      }, 0.33 * (1 - 0.5 * bump(t, lima + 0.25, 0.35)), 12);
      bale(c, p, dent);
      tray(c, p, 520, SY + 2, 560);
      people(p.fig, true);
      // the remaining glasses on the bale edge (Yanto holds his), fifth on the empty seat
      [SEATS.udin, SEATS.darto, SEATS.aku].forEach((sx, i) => coffeeGlass(c, sx + 135, SY + 2, 62, 0.8, t, inkOf(p), glassCol(p), coffeeCol(p), 1, i * 1.7));
      coffeeGlass(c, SEATS.empty + 40, SY + 2 + 9 * dent, 62, 0.85, t, inkOf(p), glassCol(p), coffeeCol(p), 1.2, 9.1);
      // ashtray with an ember + kretek smoke next to Darto
      c.fillStyle = p.mode === "lit" ? "#5a5048" : "#0c1020"; c.beginPath(); c.ellipse(SEATS.darto - 70, SY - 4, 30, 8, 0, 0, TAU); c.fill();
      c.fillStyle = "#ff6a24"; c.beginPath(); c.arc(SEATS.darto - 62, SY - 9, 3.2 + 0.8 * Math.sin(t * 2.3), 0, TAU); c.fill();
      smokeCurl(c, p, SEATS.darto - 62, SY - 12, t, 300, 30 + 90 * gust(t), 4.4);
      ashFall(c, p, SEATS.darto - 62, SY - 9, t, SY + 2);
      // condensation on the fifth glass (seen in the macro)
      condens(c, p, SEATS.empty + 40, SY + 2 + 9 * dent, 62, 5);
      // cigarette pack + matchbox on the bale
      boxS(c, p, SEATS.udin + 40, SY - 14, 34, 14, p.mode === "lit" ? "#b3121a" : "#1a1420", 0.1, 260, 0.8, 2);
      boxS(c, p, SEATS.udin + 80, SY - 10, 24, 10, p.mode === "lit" ? "#c8a050" : "#141a28", 0.1, 261, 0.8, 2);
      blurred(c, L, 1.6, 7, () => { c.fillStyle = p.fig; c.fillRect(W - 40, -100, 70, H + 200); c.fillRect(-100, H - 150, W + 200, 260); });
    },
    lights: (u, t) => {
      const Jd = sideJoints(SEATS.darto, FY, HS, poseDarto(t));
      const out: Light[] = [{ k: "spot", x: LAMP[0], y: LAMP[1] + 90, r: 980, i: 0.92 * flick(t) * (1 - 0.6 * bump(t, lima + 0.25, 0.35)), col: WARM },
        { k: "spot", x: SEATS.darto - 62, y: SY - 9, r: 40, i: 0.6, col: [255, 120, 50] }];
      const cone = torchCone(Jd, 380, 70, 0.75 * flick(t + 3), TORCH, 0.8); if (cone) out.push(cone);
      const heads = [SEATS.udin, SEATS.yanto, SEATS.darto, SEATS.aku];
      [C1, C2c, C3, C4].forEach((tc, i) => { const s = swell(t, tc); if (s > 0.01) out.push({ k: "spot", x: heads[i] + 20, y: SY - 0.42 * HS, r: 230, i: 0.45 * s, col: WARM }); });
      const e = ss(POINT, lima, t); if (e > 0.01) out.push({ k: "spot", x: SEATS.empty + 40, y: SY - 160, r: 300, i: 0.4 * e, col: [220, 225, 255] });
      return out;
    },
    amb: () => 0.05,
    cam: (u, t) => countCam(t),
  },
  { // close-up: Pak Darto whispers, nods a little, thumbs his torch off; kretek smoke drifts across his face
    name: "darto", a: daA, b: daB, dust: 0.5,
    draw: (c, p, u, t, L) => {
      L(0.6);
      c.fillStyle = p.wall; c.fillRect(-100, -100, W + 200, H + 200);
      if (p.mode === "lit") { c.fillStyle = "rgba(22,14,10,0.08)"; for (let k = 0; k < 30; k++) c.fillRect(-100, -100 + k * 76, W + 200, 30); }
      blurred(c, L, 0.6, 5, () => {
        c.fillStyle = p.wood2; c.fillRect(-100, 150, W + 200, 46);
        kentongan(c, 900, 196, 560, p.mode === "lit" ? p.wood2 : "#05070c", 0.02 * Math.sin(t * 0.7));
        petromaks(c, 120, 120, 300, inkOf(p), 0.9, paper(p));
      });
      // moth shadow passing over the wall behind him
      if (p.mode === "lit") { const mx = 700 + 160 * Math.sin(t * 0.8), my = 520 + 90 * Math.sin(t * 1.1); c.fillStyle = "rgba(22,14,10,0.13)"; c.beginPath(); c.ellipse(mx - 20, my, 34, 16, -0.5, 0, TAU); c.ellipse(mx + 20, my, 34, 16, 0.5, 0, TAU); c.fill(); }
      L(1);
      const D = dartoClose(t);
      const J = sideFigure(c, 430, 3160, 2600, p.fig, "darto", D.pose);
      // thumb presses the switch at torchOff (small knuckle bump on top of the torch)
      if (J.lens) {
        const press = ss(torchOff - 0.25, torchOff - 0.05, t) * (1 - ss(torchOff + 0.1, torchOff + 0.4, t));
        const A = anchor(J, "F"), ux = Math.sin(J.torchAng), uy = Math.cos(J.torchAng);
        c.fillStyle = p.fig; c.beginPath(); c.ellipse(A.x + ux * 30 - uy * (34 - 10 * press), A.y + uy * 30 + ux * (34 - 10 * press), 15, 22, -J.torchAng, 0, TAU); c.fill();
      }
      // kretek smoke rising from below the frame, drifting across in front of his face
      for (let k = 0; k < 3; k++) smokeCurl(c, p, 160 + k * 60, 1700, t + k * 1.3, 1100, 420 + k * 60, 5 + k, 1.6);
      blurred(c, L, 1.6, 8, () => { c.fillStyle = p.fig; c.fillRect(W - 60, -100, 140, H + 200); });
    },
    lights: (u, t) => {
      const { J, on } = dartoClose(t);
      const out: Light[] = [{ k: "spot", x: 140, y: 260, r: 1300, i: 0.8 * flick(t, [42.2]), col: WARM },
        { k: "spot", x: 760, y: 560, r: 300, i: 0.22 * (0.7 + 0.3 * Math.sin(t * 7.3) * Math.sin(t * 2.9)), col: WARM }]; // flicker kissing his profile edge
      // as the torch dies its pool on the wall shrinks to a dot, then goes out
      const shrink = move(t, torchOff - 0.05, torchOff + 0.9, 1, 0), alive = 1 - move(t, torchOff + 0.7, torchOff + 1.1, 0, 1);
      const cone = torchCone(J, 1100, 8 + 162 * shrink ** 1.5, 0.9 * Math.max(0.35, shrink) * alive, TORCH, 0.8 * shrink); if (cone && alive > 0.01) out.push(cone);
      return out;
    },
    amb: () => 0.05,
    cam: (u, t) => {
      const D = dartoClose(t), hd = D.J.head;
      if (t < torchOff - 0.15) return { z: 2.3, cx: hd[0] + 140, cy: hd[1] + 90, rot: 0 };                       // extreme close: lips / peci edge
      const k = move(t, torchOff - 0.15, torchOff + 1.2, 0, 1);                                                      // pull back as the torch dies
      return { z: lerp(2.3, 1.06, k) + 0.05 * move(t, torchOff + 1.2, daB, 0, 1), cx: lerp(hd[0] + 140, 520, k), cy: lerp(hd[1] + 90, 880, k), rot: 0 };
    },
  },
  { // medium close on the bale: the men lift their glasses and drink; the fifth glass drains by itself; the narrator drinks last
    name: "drink", a: drA, b: drB, dust: 0.5,
    draw: (c, p, u, t, L) => {
      L(0.6);
      gedek(c, p, -100, -100, W + 200, FYD + 100);
      if (p.mode === "lit") { c.strokeStyle = "rgba(22,14,10,0.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(300, 420); c.lineTo(312, 470); c.lineTo(300, 520); c.stroke(); }
      cicak(c, p, 300, 700, t, 3, 1.4, [90, 40]);
      L(1);
      boxS(c, p, -100, FYD, W + 200, H, p.wood, 0.7, 401, 1.57, 0);
      const ds = drinkers(t);
      const all = (fill: string) => ds.forEach((d) => sideFigure(c, d.x, FYD, d.Hh, fill, d.look, d.pose));
      // the wall shows FIVE shadows: the fifth sits at the empty seat and drinks in sync with the level drops
      castShadow(c, p, 560, 120, 1.1, (fill) => {
        all(fill);
        const sipK = sips.reduce((a, st) => Math.max(a, ss(st - 0.45, st - 0.05, t) * (1 - ss(st + 0.35, st + 0.7, t))), 0);
        const base: SidePose = { dir: -1, sit: SEATD, head: 0.08 - 0.26 * sipK, idle: idleOf(0, 78, 0) };
        const Jb = sideJoints(DSEAT.empty, FYD, HD, base), rest: P2 = [DSEAT.empty - 80, SYD - 60], mouth: P2 = [Jb.head[0] - 0.055 * HD, Jb.head[1] + 0.08 * HD];
        const Jg = sideFigure(c, DSEAT.empty, FYD, HD, fill, "darto", reach(DSEAT.empty, FYD, HD, base, "B", [lerp(rest[0], mouth[0], sipK), lerp(rest[1], mouth[1], sipK)], "glass"));
        const A = anchor(Jg, "B"), gh = 0.09 * HD; c.save(); c.translate(A.x, A.y); c.rotate(0.5 * sipK); c.fillStyle = fill; c.beginPath(); c.moveTo(-0.34 * gh, gh / 2); c.lineTo(-0.42 * gh, -gh / 2); c.lineTo(0.42 * gh, -gh / 2); c.lineTo(0.34 * gh, gh / 2); c.closePath(); c.fill(); c.restore();
      }, 0.3, 12);
      // bale top with slats, tray, ring stains
      boxS(c, p, -100, SYD, W + 200, 34, p.wood, 0.4, 402, 1.57, 3);
      if (p.mode === "lit") { c.strokeStyle = p.ink; c.lineWidth = 2; for (let x = -100; x < W + 100; x += 46) { c.beginPath(); c.moveTo(x, SYD); c.lineTo(x, SYD + 34); c.stroke(); } }
      for (const lx of [40, 520, 980]) boxS(c, p, lx, SYD + 34, 30, FYD - SYD - 34, p.wood2, 0.6, 410 + lx, 0.2, 2);
      const jig = ds.reduce((a, d) => a + Math.sin((t - d.glassRest[0]) * 40) * (bump(t, 45.25 + 0.55, 0.12) + bump(t, 49.6, 0.12) + bump(t, 49.9, 0.12) + bump(t, 50.1, 0.12)) * 0.25, 0);
      tray(c, p, 420, SYD + 2, 760, clamp(jig, -1, 1));
      all(p.fig);
      // glasses: on the tray when not held, in the hand when held
      ds.forEach((d, i) => {
        if (d.holding) { const J = sideJoints(d.x, FYD, d.Hh, d.pose); heldGlass(c, p, J, "B", 0.085 * d.Hh, d.level, t, -0.55 * d.up, 0.5 * (1 - d.up), i * 2.1); }
        else coffeeGlass(c, d.glassRest[0], SYD + 2, 0.085 * d.Hh, d.level, t, inkOf(p), glassCol(p), coffeeCol(p), 1, i * 2.1);
      });
      // the FIFTH glass at the empty seat (left): drains in 3 steps synced with the sips; steam pulled up-left toward an unseen mouth
      const g5: P2 = [DSEAT.empty - 80, SYD + 2], gh5 = 0.09 * HD;
      const lv5 = 0.82 - sips.reduce((a, st) => a + 0.2 * move(t, st, st + 0.35, 0, 1), 0);
      coffeeGlass(c, g5[0], g5[1], gh5, lv5, t, inkOf(p), glassCol(p), coffeeCol(p), 0, 5.5);
      condens(c, p, g5[0], g5[1], gh5, 9);
      if (p.mode === "lit") { c.strokeStyle = "rgba(255,240,215,0.5)"; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const st = sips[k]; if (t > st) { const yy = g5[1] - gh5 * 0.9 * (0.82 - 0.2 * k); c.beginPath(); c.moveTo(g5[0] - 0.36 * gh5, yy); c.lineTo(g5[0] + 0.36 * gh5, yy); c.stroke(); } } } // tide marks of each sip
      const pull = sips.reduce((a, st) => a + ss(st - 0.25, st, t) * (1 - ss(st + 0.35, st + 0.75, t)), 0);
      if (lv5 > 0.05) {
        c.strokeStyle = p.mode === "lit" ? "rgba(235,228,212,0.6)" : "rgba(160,175,205,0.35)"; c.lineWidth = 9;
        for (const sd of [-1, 1]) { c.beginPath(); for (let k = 0; k < 26; k++) { const f = k / 26, yy = g5[1] - gh5 - k * 12 * (1 + pull * 0.3), xx = g5[0] + sd * 15 + Math.sin(k * 0.45 + t * 1.6 + sd) * 13 * f * (1 - pull * 0.6) - (25 + pull * 90) * f * f; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
      }
      // sugar jar + cigarette pack on the bale (right of the tray)
      boxS(c, p, 900, SYD - 70, 60, 70, glassCol(p), 0.1, 420, 0.8, 3); c.fillStyle = p.mode === "lit" ? "#efe8d8" : "#1a2236"; c.fillRect(905, SYD - 38, 50, 36);
      ants(c, p, 902, SYD, SYD - 66, t);
      blurred(c, L, 1.6, 7, () => { c.fillStyle = p.fig; c.fillRect(-100, H - 150, W + 200, 300); });
    },
    lights: (u, t) => [{ k: "spot", x: 560, y: 640, r: 1100, i: 0.85 * flick(t), col: WARM }, { k: "spot", x: DSEAT.empty - 80, y: SYD - 120, r: 300, i: 0.3 + 0.3 * ss(sipStart - 0.5, sipStart, t), col: [230, 232, 255] }],
    amb: () => 0.05,
    cam: (u, t) => {
      // each sip step = a cut to the macro of the fifth glass, then back to the row
      for (const st of sips) if (t >= st - 0.22 && t < st + 0.72) return { z: 3.4 + 0.15 * (t - st + 0.22), cx: DSEAT.empty - 80, cy: SYD - 70, rot: 0 };
      return { z: move(t, drA, drB, 1.05, 1.12), cx: move(t, drA, drB, 560, 470), cy: move(t, drA, drB, 1060, 1110), rot: 0 };
    },
  },
  { // dawn: the pos from outside, four men walking home, five empty glasses
    name: "dawn", a: dwA, b: dwB,
    draw: (c, p, u, t, L) => {
      L(0.5);
      const g = c.createLinearGradient(0, 0, 0, 1200);
      g.addColorStop(0, p.mode === "lit" ? "#9aa4b4" : "#14223e"); g.addColorStop(1, p.mode === "lit" ? "#e6e0d2" : "#4a5878");
      c.fillStyle = g; c.fillRect(-100, -100, W + 200, 1300);
      // pale setting moon + a bat crossing it in the early sky
      c.fillStyle = p.mode === "lit" ? "rgba(250,248,240,0.8)" : "rgba(210,220,245,0.55)"; c.beginPath(); c.arc(820, 380, 46, 0, TAU); c.fill();
      { const bk = (t - dwA) / 1.8; if (bk > 0 && bk < 1) { const bx = lerp(620, 1040, bk), by = 400 - 60 * Math.sin(bk * Math.PI), fl = Math.sin(t * 26); c.fillStyle = inkOf(p); c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 14, by - 12 * fl, bx - 26, by - 4 * fl); c.quadraticCurveTo(bx - 14, by + 2, bx, by + 4); c.quadraticCurveTo(bx + 14, by + 2, bx + 26, by - 4 * fl); c.quadraticCurveTo(bx + 14, by - 12 * fl, bx, by); c.fill(); } }
      // distant mosque silhouette + tree line
      c.fillStyle = p.mode === "lit" ? "#6a7080" : "#101830";
      c.beginPath(); c.ellipse(860, 1040, 55, 50, 0, Math.PI, 0); c.fill(); c.fillRect(805, 1040, 110, 70); c.fillRect(940, 930, 14, 180); c.beginPath(); c.moveTo(938, 930); c.lineTo(947, 900); c.lineTo(956, 930); c.fill();
      c.fillStyle = p.mode === "lit" ? "#5a6070" : "#0c1222";
      c.beginPath(); c.moveTo(-100, 1150); for (let x = -100; x <= W + 100; x += 40) c.lineTo(x, 1120 - 40 * hash(x * 0.37) - 20 * Math.sin(x * 0.01)); c.lineTo(W + 100, 1200); c.lineTo(-100, 1200); c.fill();
      // smoke from a distant kitchen roof
      c.fillStyle = p.mode === "lit" ? "#6a7080" : "#101830"; c.beginPath(); c.moveTo(380, 1110); c.lineTo(470, 1070); c.lineTo(560, 1110); c.fill();
      smokeCurl(c, p, 500, 1080, t, 380, -120, 8, 1.4);
      L(0.8);
      boxS(c, p, -100, 1150, W + 200, H, p.mode === "lit" ? "#9c8c5e" : "#0a1220", 0, 501, 1.57, 0);
      c.strokeStyle = inkOf(p); c.lineWidth = 2; for (let k = 0; k < 14; k++) { const yy = 1160 + k * k * 4; c.beginPath(); c.moveTo(-100, yy); c.lineTo(W + 100, yy + 6); c.stroke(); }
      // dew drops glinting on the grass (twinkle)
      if (p.mode === "lit") for (let k = 0; k < 40; k++) { const dx = hash(k * 4.1) * W, dy = 1200 + hash(k * 2.7) * 600, tw = Math.max(0, Math.sin(t * 2 + k * 1.9)); c.fillStyle = `rgba(255,255,250,${0.7 * tw})`; c.beginPath(); c.arc(dx, dy, 2 + 2 * tw, 0, TAU); c.fill(); }
      for (let k = 0; k < 4; k++) { const mg = c.createLinearGradient(0, 1080 + k * 90, 0, 1180 + k * 90); mg.addColorStop(0, "rgba(230,232,238,0)"); mg.addColorStop(0.5, `rgba(230,232,238,${p.mode === "lit" ? 0.35 : 0.12})`); mg.addColorStop(1, "rgba(230,232,238,0)"); c.fillStyle = mg; c.fillRect(-100 + Math.sin(t * 0.2 + k) * 40, 1080 + k * 90, W + 200, 100); }
      L(1);
      const hx = 620, hy = 1330;
      cutS(c, p, () => rough(c, [[hx - 40, hy - 330], [hx + 400, hy - 330], [hx + 460, hy - 250], [hx - 100, hy - 250]], true, 3, 502), p.wood2, { edge: 3, hatch: 0.6, dir: 1.0, bbox: [hx - 100, hy - 330, 560, 80], seed: 503 });
      for (const px of [hx - 60, hx + 410]) boxS(c, p, px, hy - 250, 22, 250, p.wood2, 0.5, 504 + px, 0.2, 2);
      boxS(c, p, hx - 70, hy - 90, 500, 16, p.wood, 0.4, 506, 1.57, 2);
      for (let i = 0; i < 5; i++) coffeeGlass(c, hx + 10 + i * 46, hy - 92, 26, 0, t, inkOf(p), glassCol(p), coffeeCol(p), 0, i);
      kentongan(c, hx - 30, hy - 250, 110, p.mode === "lit" ? p.wood2 : "#05070c", 0.03 * Math.sin(t * 0.9));
      c.strokeStyle = inkOf(p); c.lineWidth = 2; c.beginPath(); c.moveTo(hx + 190, hy - 250); c.lineTo(hx + 190, hy - 210); c.stroke();
      petromaks(c, hx + 190, hy - 210, 70, inkOf(p), 0.1, paper(p));
      c.fillStyle = p.mode === "lit" ? p.wood2 : "#05070c";
      for (let k = 0; k < 7; k++) c.fillRect(20 + k * 70, 1180, 12, 130); c.fillRect(0, 1210, 500, 8); c.fillRect(0, 1260, 500, 8);
      drawRooster(c, p, 230, 1180, t);
      // two hens pecking by the fence
      hen(c, p, 120, 1330, t, 0); hen(c, p, 420, 1350, t, 1.7);
      // FIVE sets of footprints in the dew leaving the pos: four sandals going left (home), one BAREFOOT going the other way
      c.fillStyle = p.mode === "lit" ? "rgba(40,32,22,0.55)" : "rgba(5,7,12,0.7)";
      for (let s = 0; s < 4; s++) for (let k = 0; k < 9; k++) { const fx = hx - 40 - k * 70 - s * 22, fy = 1372 + s * 26 + (k % 2) * 12; c.beginPath(); c.ellipse(fx, fy, 13, 5, 0.05, 0, TAU); c.fill(); }
      for (let k = 0; k < 7; k++) { const fx = hx + 80 + k * 72, fy = 1478 + (k % 2) * 13; c.beginPath(); c.ellipse(fx, fy, 10, 5, -0.05, 0, TAU); c.fill(); for (let to = 0; to < 4; to++) { c.beginPath(); c.arc(fx + 12 + to * 2, fy - 5 + to * 3.2, 2, 0, TAU); c.fill(); } }
      // a rooster strutting past the bale (seen in the ground-level shot)
      { const rk = move(t, 53.2, dwB, 0, 1); drawRooster(c, p, lerp(900, 560, rk), 1330 - 4 * Math.abs(Math.sin(t * 6)), t * 2); }
      if (t > rooster) { c.strokeStyle = p.mode === "lit" ? p.ink : "#0a0e1a"; c.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = t - rooster - k * 0.15; if (a < 0) continue; const bx = 300 + k * 60 + a * 90, by = 700 - k * 30 - a * 40, fl = 10 * Math.sin(a * 12 + k); c.beginPath(); c.moveTo(bx - 14, by - fl); c.lineTo(bx, by); c.lineTo(bx + 14, by - fl); c.stroke(); } }
      // four men walking home (left), each with his own stride and pace
      const Hw = SIZE.wide * 0.85;
      const looks = ["darto", "yanto", "udin", "aku"] as const, stride = [0.85, 1.0, 1.1, 0.95], per = [1.12, 1.02, 0.96, 1.06];
      looks.forEach((lk, i) => {
        const x = lerp(560, -520, clamp((t - dwA) / (53.4 - dwA + 0.6))) + i * 110 + 6 * Math.sin(t * 0.7 + i); // they leave frame before the ground-level shot
        sideFigure(c, x, 1480, lk === "udin" ? Hw * 0.97 : Hw, p.fig, lk, { dir: -1, walk: (t - dwA) * TAU / per[i] + i * 0.9, stride: stride[i], breath: t * 2 + i, idle: idleOf(t, 40 + i, 0.6), head: lk === "aku" ? 0.16 : 0.04 });
      });
      blurred(c, L, 1.6, 7, () => { c.fillStyle = p.fig; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(-40 + k * 70, H - 40, 90, 260, -0.4 + k * 0.2 + 0.04 * Math.sin(t + k), 0, TAU); c.fill(); } });
    },
    lights: (u, t) => [{ k: "spot", x: 880, y: 820, r: 1700, i: 0.6 + 0.05 * Math.sin(t * 0.3), col: [205, 212, 235] }],
    amb: () => 0.18,
    cam: (u, t) => t < 53.4 ? ({ z: move(t, dwA, 53.4, 1.04, 1.08), cx: 520, cy: 1150, rot: 0 })
      : ({ z: move(t, 53.4, dwB, 2.9, 3.1), cx: move(t, 53.4, dwB, 760, 720), cy: 1250, rot: 0 }), // ground level: the five empty glasses, a rooster walks past
  },
  { // Udin asks (gesturing, scratches his head once); the narrator slowly looks down at the hand that pointed
    name: "udin", a: udA, b: udB,
    draw: (c, p, u, t, L) => {
      L(0.5);
      const g = c.createLinearGradient(0, 0, 0, 1300);
      g.addColorStop(0, p.mode === "lit" ? "#a8b0bc" : "#1a2846"); g.addColorStop(1, p.mode === "lit" ? "#e8e2d4" : "#4c5a78");
      c.fillStyle = g; c.fillRect(-100, -100, W + 200, 1500);
      c.fillStyle = p.mode === "lit" ? "#6a6a5a" : "#0e1628";
      for (const [bx, s] of [[120, 1], [860, 1.2], [520, 0.8]] as [number, number][]) {
        c.fillRect(bx - 14 * s, 700, 28 * s, 700);
        for (let k = 0; k < 6; k++) { c.save(); c.translate(bx, 720 - k * 18 * s); c.rotate(-1.2 + k * 0.5 + 0.035 * Math.sin(t * 0.8 + k + bx)); c.beginPath(); c.ellipse(170 * s, 0, 190 * s, 46 * s, 0, 0, TAU); c.fill();
          if (p.mode === "lit") { c.strokeStyle = "rgba(240,236,226,0.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(340 * s, 0); c.stroke(); } c.restore(); }
      }
      // a bird hopping on the fence top
      const hop = Math.abs(Math.sin(t * 2.2)) * 10; c.fillStyle = p.mode === "lit" ? p.ink : "#060a14"; c.beginPath(); c.ellipse(640, 1196 - hop, 13, 9, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(652, 1188 - hop, 6, 0, TAU); c.fill();
      L(0.8);
      c.fillStyle = p.mode === "lit" ? p.wood2 : "#060a14";
      for (let k = 0; k < 18; k++) c.fillRect(-80 + k * 70, 1220 - 30 * hash(k), 16, 520); c.fillRect(-100, 1300, W + 200, 10); c.fillRect(-100, 1420, W + 200, 10);
      if (p.mode === "lit") { c.strokeStyle = "#5a4630"; c.lineWidth = 3; for (let k = 0; k < 18; k++) { c.beginPath(); c.moveTo(-86 + k * 70, 1296); c.lineTo(-58 + k * 70, 1312); c.moveTo(-86 + k * 70, 1312); c.lineTo(-58 + k * 70, 1296); c.stroke(); } } // rope ties
      const mg = c.createLinearGradient(0, 1250, 0, 1500); mg.addColorStop(0, "rgba(230,232,238,0)"); mg.addColorStop(0.5, `rgba(230,232,238,${p.mode === "lit" ? 0.35 : 0.14})`); mg.addColorStop(1, "rgba(230,232,238,0)"); c.fillStyle = mg; c.fillRect(-100 + 30 * Math.sin(t * 0.15), 1250, W + 200, 250);
      L(1);
      boxS(c, p, -100, 1720, W + 200, 400, p.mode === "lit" ? "#b9a77d" : "#0c1424", 0.45, 601, 1.57, 0);
      const U = udinPose(t), A = akuUdinPose(t);
      sideFigure(c, 300, 1720, SIZE.medium * 0.97, p.fig, "udin", U);
      sideFigure(c, 790, 1720, SIZE.medium, p.fig, "aku", A);
      blurred(c, L, 1.6, 7, () => { c.fillStyle = p.fig; c.fillRect(-100, -100, 60, H + 200); });
    },
    lights: (u, t) => [{ k: "spot", x: 540, y: 600, r: 1600, i: 0.55 + 0.04 * Math.sin(t * 0.4), col: [205, 212, 235] }],
    amb: () => 0.16,
    cam: (u, t) => {
      if (t >= udinAsk + 2.3) { const J = sideJoints(790, 1720, SIZE.medium, akuUdinPose(t)), A = anchor(J, "B"); return { z: move(t, udinAsk + 2.3, udB, 2.6, 2.85), cx: A.x - 40, cy: A.y - 60, rot: 0 }; } // close on the trembling hand
      return { z: move(t, udinAsk, udinAsk + 2.3, 1.04, 1.14), cx: move(t, udinAsk, udinAsk + 2.3, 540, 700), cy: move(t, udinAsk, udinAsk + 2.3, 1000, 860), rot: 0 };
    },
  },
  { // the viewer's home, 3/4 from above: one kasur, four sleepers side by side; count them... and the fifth in the corner
    name: "home", a: hoA, b: hoB,
    draw: (c, p, u, t, L) => {
      const ink = inkOf(p);
      L(0.6);
      gedek(c, p, -100, -100, W + 200, 1150);
      boxS(c, p, -100, 1040, W + 200, H, p.wood, 0.75, 701, 1.57, 0);
      if (p.mode === "lit") { c.strokeStyle = p.ink; c.lineWidth = 2; for (let k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(540 + k * 60, 1040); c.lineTo(540 + k * 150, H + 100); c.stroke(); } }
      boxS(c, p, 700, 330, 300, 360, p.wood2, 0.3, 702, 0.8, 8);
      c.fillStyle = p.mode === "lit" ? p.sky : "#22365a"; c.fillRect(716, 346, 268, 328);
      if (p.mode === "dark") { const mg = c.createRadialGradient(900, 420, 4, 900, 420, 160); mg.addColorStop(0, "rgba(225,232,255,0.95)"); mg.addColorStop(0.2, "rgba(200,215,255,0.4)"); mg.addColorStop(1, "rgba(60,90,150,0)"); c.fillStyle = mg; c.fillRect(716, 346, 268, 328); }
      c.fillStyle = ink; for (let k = 1; k < 5; k++) c.fillRect(700 + k * 60 - 5, 346, 10, 328);
      // thin curtain on the left half of the window, breathing in the draught
      const cw = 0.3 + 0.7 * gust(t) * (0.5 + 0.5 * Math.sin(t * 0.6));
      c.fillStyle = p.mode === "lit" ? "rgba(236,226,206,0.75)" : "rgba(40,56,90,0.6)";
      c.beginPath(); c.moveTo(700, 336); c.lineTo(800 + 14 * cw, 336); for (let k = 0; k <= 10; k++) c.lineTo(790 + 14 * cw + 10 * Math.sin(k * 1.3 + t * 1.2) + k * 2 * cw, 336 + k * 36); c.lineTo(700, 696); c.closePath(); c.fill();
      // wall clock (00:13) with a ticking second hand
      c.fillStyle = p.cloth; c.beginPath(); c.arc(470, 430, 58, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 6; c.stroke();
      c.beginPath(); c.moveTo(470, 430); c.lineTo(473, 388); c.moveTo(470, 430); c.lineTo(470 + Math.sin(13 / 60 * TAU) * 48, 430 - Math.cos(13 / 60 * TAU) * 48); c.stroke();
      const sec = Math.floor(t - hoA) + settle(t - Math.floor(t - hoA) - hoA, 0, 0.12, 0, 1, 0.3) * 0;
      const tc = Math.min(t, H5); // the second hand STOPS at the fifth count
      const sa = ((Math.floor(tc) % 60) / 60) * TAU + 0.02 * Math.exp(-((tc % 1) / 0.06)) * Math.sin((tc % 1) * 60);
      c.strokeStyle = p.mode === "lit" ? "#b3121a" : "#2a1418"; c.lineWidth = 2; c.beginPath(); c.moveTo(470, 430); c.lineTo(470 + Math.sin(sa) * 50, 430 - Math.cos(sa) * 50); c.stroke(); void sec;
      c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(560, -100); c.lineTo(560, 200); c.stroke();
      c.fillStyle = ink; c.beginPath(); c.moveTo(510, 240); c.lineTo(610, 240); c.lineTo(580, 196); c.lineTo(540, 196); c.closePath(); c.fill();
      boxS(c, p, -60, 470, 250, 600, p.wood2, 0.45, 711, 0.8, 4);
      boxS(c, p, -40, 500, 100, 520, p.wood, 0.3, 712, 0.8, 3); boxS(c, p, 75, 500, 100, 520, p.wood, 0.3, 713, 0.8, 3);
      c.fillStyle = ink; c.fillRect(52, 740, 6, 40); c.fillRect(80, 740, 6, 40);
      c.fillStyle = ink; c.beginPath(); c.arc(300, 470, 5, 0, TAU); c.fill();
      cutS(c, p, () => rough(c, [[300, 472], [350, 500], [372, 560], [352, 566], [346, 680], [254, 680], [248, 566], [228, 560], [250, 500]], true, 2, 714), p.mode === "lit" ? "#c8b48c" : "#141c2e", { edge: 3, hatch: 0.3, dir: 1.2, bbox: [228, 472, 144, 208], seed: 715 });
      c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 10; c.beginPath(); c.moveTo(640, 1030); c.lineTo(640, 860); c.stroke();
      c.beginPath(); c.ellipse(640, 1034, 50, 12, 0, 0, TAU); c.fill();
      c.lineWidth = 4; c.beginPath(); c.arc(640, 800, 66, 0, TAU); c.stroke();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; c.beginPath(); c.moveTo(640, 800); c.lineTo(640 + Math.cos(a) * 66, 800 + Math.sin(a) * 66); c.stroke(); }
      c.beginPath(); c.arc(640, 800, 12, 0, TAU); c.fill();
      cicak(c, p, 560, 640, t, 5, 1.0, [70, 30]);
      L(1);
      // the faint fifth in the corner (dark pass only); in the corner close-up it reads a touch more, and at the very end its head lifts toward us
      if (p.mode === "dark") { c.globalAlpha = t >= H5 ? 0.6 : 0.45; sideFigure(c, 965, 1230, 600, "#1a2236", "yanto", { dir: -1, sit: 0.22 * 600, armB: [0.4, 1.3], head: 0.15 + 0.01 * Math.sin(t * 0.5) - 0.3 * settle(t, hoB - 1.0, hoB - 0.1, 0, 1, 0.02) }); c.globalAlpha = 1; }
      // a cat on the windowsill: turns its head toward the corner at the fifth count
      { const ck = settle(t, H5 - 0.1, H5 + 0.7, 0, 1); c.fillStyle = inkOf(p); const cx0 = 780, cy0 = 690;
        c.beginPath(); c.ellipse(cx0, cy0 - 26, 30, 26, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(cx0 - 28, cy0 - 10); c.quadraticCurveTo(cx0 - 60, cy0 + 10, cx0 - 40 + 6 * Math.sin(t * 1.4), cy0 + 30); c.lineWidth = 7; c.strokeStyle = inkOf(p); c.stroke();
        const hx2 = cx0 + 10 + 28 * ck, hy2 = cy0 - 62; c.beginPath(); c.ellipse(hx2, hy2, 17, 15, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(hx2 - 14, hy2 - 8); c.lineTo(hx2 - 10, hy2 - 28); c.lineTo(hx2 - 2, hy2 - 12); c.moveTo(hx2 + 2, hy2 - 12); c.lineTo(hx2 + 10, hy2 - 28); c.lineTo(hx2 + 14, hy2 - 8); c.fill(); }
      const back = 1070, front = 1330, bl = 150, br = 860, fl = 70, fr = 920;
      cutS(c, p, () => { c.beginPath(); c.moveTo(bl, back); c.lineTo(br, back); c.lineTo(fr, front); c.lineTo(fl, front); c.closePath(); }, p.cloth, { edge: 3, hatch: 0.2, dir: 1.4, bbox: [fl, back, fr - fl, front - back], seed: 720 });
      boxS(c, p, fl, front, fr - fl, 34, p.mode === "lit" ? "#c8bca0" : "#121a2a", 0.4, 721, 1.57, 3);
      // four sleepers: each breathes at its own rate; the younger kid turns his head once
      const S = [{ x: 270, len: 420, rate: 1.05 }, { x: 460, len: 390, rate: 1.25 }, { x: 640, len: 300, rate: 1.6 }, { x: 790, len: 270, rate: 1.85 }];
      const headY = back + 24, kidTurn = settle(t, 65.4, 66.4, 0, 1);
      S.forEach((s, i) => {
        const hl = 0.13 * s.len, tx = i === 3 ? 0.18 * hl * kidTurn : 0;
        c.fillStyle = p.mode === "lit" ? "#f0e8d6" : "#18213a"; c.beginPath(); c.ellipse(s.x, headY + 6, hl * 1.25, hl * 0.42, 0, 0, TAU); c.fill();
        c.fillStyle = p.fig; c.beginPath(); c.ellipse(s.x + tx, headY, hl * (0.5 - 0.06 * Math.abs(tx) / hl), hl * 0.62, 0, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(s.x + tx * 0.7, headY - hl * 0.15, hl * 0.52, hl * 0.42, 0, Math.PI, 0); c.fill();
      });
      const bt = headY + 0.13 * 420 * 0.7;
      cutS(c, p, () => {
        c.beginPath(); c.moveTo(fl + 40, front - 6); c.lineTo(bl + 20, bt + 6);
        S.forEach((s) => { const br2 = 1 + 0.045 * Math.sin(t * s.rate * 1.4 + s.x); c.quadraticCurveTo(s.x - 60, bt - 16 * br2, s.x, bt - 22 * br2); c.quadraticCurveTo(s.x + 60, bt - 16 * br2, s.x + 85, bt + 4); });
        c.lineTo(br - 10, bt + 6); c.lineTo(fr - 30, front - 6); c.closePath();
      }, p.mode === "lit" ? "#a77e4e" : "#141c30", { edge: 3, hatch: 0.28, dir: 1.3, bbox: [fl, bt - 30, fr - fl, front - bt + 30], seed: 722 });
      if (p.mode === "lit") {
        c.strokeStyle = "rgba(22,14,10,0.45)"; c.lineWidth = 2; c.fillStyle = "rgba(22,14,10,0.45)";
        for (let r = 0; r < 4; r++) { const yy = bt + 30 + r * 55, x0 = lerp(bl + 30, fl + 50, (yy - back) / (front - back)), x1 = lerp(br - 20, fr - 40, (yy - back) / (front - back)); c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke(); for (let x = x0 + 20; x < x1; x += 46) { c.beginPath(); c.moveTo(x, yy + 14); c.lineTo(x + 12, yy + 27); c.lineTo(x, yy + 40); c.lineTo(x - 12, yy + 27); c.closePath(); c.stroke(); c.beginPath(); c.arc(x, yy + 27, 3, 0, TAU); c.fill(); } }
      }
      S.forEach((s) => { const br2 = 1 + 0.05 * Math.sin(t * s.rate * 1.4 + s.x); c.strokeStyle = p.mode === "lit" ? "rgba(255,248,230,0.35)" : "rgba(60,75,110,0.35)"; c.lineWidth = 10 * br2; c.beginPath(); c.moveTo(s.x, bt); c.lineTo(s.x - 18, bt + s.len * 0.75); c.stroke(); });
      c.fillStyle = p.mode === "lit" ? "#2a1a10" : "#05070c";
      for (const sx of [300, 350, 600, 640]) { c.beginPath(); c.ellipse(sx, front + 70, 18, 32, 0.15, 0, TAU); c.fill(); }
      coffeeGlass(c, 120, front + 90, 60, 0.6, t, ink, glassCol(p), p.mode === "lit" ? "rgba(200,220,240,0.6)" : "rgba(40,60,90,0.5)", 0, 0);
      if (p.mode === "dark") {
        for (let i = 0; i < 5; i++) {
          const tc = H1 + ((H5 - H1) * i) / 4, a = ss(tc - 0.1, tc + 0.25, t); if (a <= 0.01) continue;
          if (i < 4 && t >= H5 - 0.05) continue; // corner close-up: only the red 5 (numbers 1-4 would land on the caption)
          const [x, y] = i < 4 ? [S[i].x, headY - 70] : [945, 1230 - 600 * 0.78 - 30];
          c.globalAlpha = a; txt(c, p, String(i + 1), x, y - (1 - a) * 10, i < 4 ? 58 : 64, i < 4 ? "#efe6cf" : "#e0261f"); c.globalAlpha = 1;
        }
      }
      blurred(c, L, 1.6, 8, () => { c.fillStyle = p.fig; c.fillRect(W - 50, -100, 140, H + 200); c.fillRect(-100, H - 140, W + 200, 260); });
    },
    lights: (u, t) => [{ k: "spot", x: 840, y: 650, r: 1150, i: 0.6 * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 0.35 + 1))), col: MOON }], // clouds passing the moon
    amb: () => 0.03,
    cam: (u, t) => t >= H5 - 0.05 ? ({ z: move(t, H5 - 0.05, hoB, 2.3, 2.55), cx: 930, cy: 930, rot: 0 }) // cut to the dark corner, very slow push
      : ({ z: move(t, hoA, H5, 1.04, 1.13), cx: move(t, hoA, H5, 540, 580), cy: move(t, hoA, H5, 1000, 1080), rot: 0 }),
  },
  { // end card (engine draws it)
    name: "end", a: enA, b: enB,
    draw: (c) => { c.fillStyle = "#000"; c.fillRect(-100, -100, W + 200, H + 200); },
    lights: () => [], amb: () => 0, cam: () => ({ z: 1, cx: 540, cy: 960, rot: 0 }),
  },
];

// ---------- udin shot poses
function udinPose(t: number): SidePose {
  const base: SidePose = { dir: 1, jaw: jawFor("U", t), breath: t * 2.2, head: -0.02 + 0.03 * wob(t, 9), idle: idleOf(t, 51) };
  const x = 300, Hh = SIZE.medium * 0.97, J = sideJoints(x, 1720, Hh, base);
  // scratches his head once (just before the question), then gestures with an open hand on "nunjuk siapa"
  const scratch = ss(56.5, 56.9, t) * (1 - ss(57.8, 58.2, t));
  const gest = ss(udinAsk - 0.3, udinAsk + 0.1, t) * (1 - ss(60.6, 61.3, t));
  const rest: P2 = [J.hip[0] + 0.05 * Hh, J.hip[1] + 0.12 * Hh];
  const headTop: P2 = [J.head[0] - 0.02 * Hh + 0.012 * Hh * Math.sin(t * 22), J.head[1] - 0.06 * Hh];
  const point: P2 = [J.sh[0] + 0.24 * Hh, J.sh[1] + 0.08 * Hh + 0.015 * Hh * Math.sin(t * 3)];
  let tgt = rest; let grip: Grip = "fist";
  if (scratch > 0) { tgt = [lerp(rest[0], headTop[0], scratch), lerp(rest[1], headTop[1], scratch)]; grip = "open"; }
  else if (gest > 0) { tgt = [lerp(rest[0], point[0], gest), lerp(rest[1], point[1], gest)]; grip = "open"; }
  return reach(x, 1720, Hh, base, "B", tgt, grip);
}
function akuUdinPose(t: number): SidePose {
  const base: SidePose = { dir: -1, breath: t * 1.4, head: 0.1, idle: idleOf(t, 52, 0.3) };
  const x = 790, Hh = SIZE.medium, J = sideJoints(x, 1720, Hh, base);
  // after the question he lifts the hand that pointed, looks down at it, slowly
  const k = settle(t, udinAsk + 1.6, udinAsk + 3.2, 0, 1, 0.04);
  const rest: P2 = [J.hip[0] - 0.03 * Hh, J.hip[1] + 0.12 * Hh], front: P2 = [J.sh[0] - 0.16 * Hh, J.sh[1] + 0.2 * Hh];
  const tr = 0.0035 * Hh * k; // the hand trembles slightly once raised
  return reach(x, 1720, Hh, { ...base, head: 0.1 + 0.32 * move(t, udinAsk + 1.9, udinAsk + 3.6, 0, 1) }, "B", [lerp(rest[0], front[0], k) + tr * Math.sin(t * 57), lerp(rest[1], front[1], k) + tr * Math.sin(t * 43 + 1)], k > 0.3 ? "open" : "fist");
}
function drawRooster(c: C2, p: Pal, x: number, y: number, t = 0) {
  const peck = Math.max(0, Math.sin(t * 1.3)) ** 6 * 0.25;
  c.fillStyle = inkOf(p);
  c.beginPath(); c.ellipse(x, y - 38, 30, 22, -0.2, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - 24, y - 46); c.quadraticCurveTo(x - 70, y - 100 + 4 * Math.sin(t * 2), x - 50, y - 30); c.quadraticCurveTo(x - 40, y - 50, x - 24, y - 30); c.fill();
  c.save(); c.translate(x + 22, y - 50); c.rotate(peck);
  c.beginPath(); c.moveTo(-4, -2); c.lineTo(2, -30); c.lineTo(12, -26); c.lineTo(8, 0); c.fill();
  c.beginPath(); c.arc(9, -32, 9, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(16, -34); c.lineTo(28, -30); c.lineTo(16, -27); c.fill();
  c.fillStyle = p.mode === "lit" ? "#b3121a" : "#2a1418"; c.beginPath(); c.ellipse(8, -43, 7, 5, 0, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = inkOf(p); c.lineWidth = 3; c.beginPath(); c.moveTo(x - 4, y - 18); c.lineTo(x - 6, y); c.moveTo(x + 6, y - 18); c.lineTo(x + 8, y); c.stroke();
}
/** a small hen pecking at the ground on her own rhythm */
function hen(c: C2, p: Pal, x: number, y: number, t: number, seed: number) {
  const pk = Math.max(0, Math.sin(t * 2.1 + seed)) ** 4;
  c.fillStyle = inkOf(p); c.beginPath(); c.ellipse(x, y - 22, 22, 15, 0.1, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - 18, y - 28); c.quadraticCurveTo(x - 36, y - 46, x - 30, y - 18); c.fill();
  c.save(); c.translate(x + 16, y - 30); c.rotate(0.2 + 1.1 * pk); c.beginPath(); c.moveTo(-3, 0); c.lineTo(3, -16); c.lineTo(10, -14); c.lineTo(7, 2); c.fill(); c.beginPath(); c.arc(8, -17, 6, 0, TAU); c.fill(); c.beginPath(); c.moveTo(13, -18); c.lineTo(21, -15); c.lineTo(13, -13); c.fill(); c.restore();
  c.strokeStyle = inkOf(p); c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 3, y - 8); c.lineTo(x - 4, y + 2); c.moveTo(x + 5, y - 8); c.lineTo(x + 6, y + 2); c.stroke();
}
