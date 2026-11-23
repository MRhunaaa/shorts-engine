// CAST for Horror3 "Kabut Lalijiwo". CONTRACT: the signatures below are fixed (shot agents call them now).
// All built on horror2/rig.ts sideFigure() (side profiles, head = 0.13 H, IK reach, grips, idle life). `fill` = silhouette colour
// for the pass (p.fig / p.ink); inner detail is CARVED into the silhouette with pale lines (lit pass = woodcut white line,
// dark pass = faint moon-blue) so it reads in the lit pass and stays subtle in the dark pass.
// Draw order per figure: back props -> sideFigure -> far boot -> near leg redraw (+boot) -> torso details/straps -> near arm redraw -> head gear.
import { C2, Pal, hash } from "../horror1/paint";
import { sideFigure, sideJoints, SidePose, Joints, Look } from "../horror2/rig";
import { HEADLAMP, Light } from "./types";
export type { SidePose, Joints } from "../horror2/rig";

type P2 = [number, number];
const TAU = Math.PI * 2;
const HS = 0.118; // rig head scale (head units -> px = HS * H)
const isLit = (p: Pal) => p.mode === "lit";
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (a: number, b: number, v: number) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };
/** carved line colour */
const cv = (p: Pal, a = 1) => (isLit(p) ? `rgba(228,212,178,${(0.6 * a).toFixed(3)})` : `rgba(84,104,142,${(0.32 * a).toFixed(3)})`);
/** material tint over the silhouette */
const tn = (p: Pal, a = 1) => (isLit(p) ? `rgba(228,212,178,${(0.12 * a).toFixed(3)})` : `rgba(70,90,128,${(0.1 * a).toFixed(3)})`);
const lerp2 = (a: P2, b: P2, k: number): P2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const add = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const unit = (a: P2, b: P2): P2 => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };

function tube(c: C2, a: P2, b: P2, w0: number, w1: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  c.beginPath(); c.moveTo(a[0] + nx * w0, a[1] + ny * w0); c.lineTo(b[0] + nx * w1, b[1] + ny * w1); c.lineTo(b[0] - nx * w1, b[1] - ny * w1); c.lineTo(a[0] - nx * w0, a[1] - ny * w0); c.closePath(); c.fill();
  c.beginPath(); c.arc(a[0], a[1], w0, 0, TAU); c.fill(); c.beginPath(); c.arc(b[0], b[1], w1, 0, TAU); c.fill();
}
function poly(c: C2, pts: P2[], close = true) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); if (close) c.closePath(); }
function sk(c: C2, col: string, w: number, f: () => void) { c.beginPath(); f(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
function seg(c: C2, a: P2, b: P2) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }

// ---------------------------------------------------------------- frames
type Fr = { x: number; y: number; J: Joints; lift: number; u: number };
function loc(c: C2, F: Fr, fn: () => void) { c.save(); c.translate(F.x, F.y); c.scale(F.J.d, 1); fn(); c.restore(); }
/** head frame (rig head units: ear at origin, face toward +x, crown ≈ -0.62, chin ≈ +0.45). fn gets k = px->unit factor */
function hd(c: C2, F: Fr, fn: (k: number) => void) { const L = F.J.local, s = HS * F.u; loc(c, F, () => { c.translate(L.head[0], L.head[1] - F.lift); c.rotate(L.headPitch); c.scale(s, s); fn(1 / s); }); }
/** torso frame: origin = shoulder joint, -y up the spine, -x = back, hip ≈ (0, 0.28H) */
function tor(c: C2, F: Fr, fn: () => void) { const L = F.J.local; loc(c, F, () => { c.translate(L.sh[0], L.sh[1]); c.rotate(L.lean); fn(); }); }
const torPt = (F: Fr, q: P2): P2 => { const L = F.J.local, a = L.lean; return [L.sh[0] + Math.cos(a) * q[0] - Math.sin(a) * q[1], L.sh[1] + Math.sin(a) * q[0] + Math.cos(a) * q[1]]; };
const toW = (F: Fr, q: P2): P2 => [F.x + F.J.d * q[0], F.y + q[1]];
function headPt(J: Joints, hx: number, hy: number, lift = 0): P2 {
  const s = HS * J.u, a = J.local.headPitch;
  return [J.head[0] + J.d * (Math.cos(a) * hx * s - Math.sin(a) * hy * s), J.head[1] - lift + Math.sin(a) * hx * s + Math.cos(a) * hy * s];
}
/** rig.ts feet sit ~0.024 H above the (x,y) floor point when standing/walking; shift the figure so soles touch the floor. */
const FOOT_BARE = 0.024, FOOT_BOOT = 0.0146;
type Grip = NonNullable<SidePose["gripB"]>;
/** exact copy of rig.ts drawHand (not exported there) so the near hand can be redrawn ON TOP of straps/props */
function drawHand(c: C2, u: number, wrist: P2, f: number, g: Grip, settle: number, part: "all" | "back" = "all") {
  c.save(); c.translate(wrist[0], wrist[1]); c.rotate(-f + Math.PI / 2);
  const pl = 0.05 * u, pw = 0.019 * u, fw = 0.0075 * u;
  const capsule = (a: P2, b: P2, w: number) => tube(c, a, b, w, w * 0.9);
  const palm = () => { c.beginPath(); c.ellipse(pl * 0.5, 0, pl * 0.58, pw, 0, 0, TAU); c.fill(); };
  const fingerRow = (curl: number, len: number, spread: number) => {
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * spread, L1 = len * (k === 0 || k === 3 ? 0.82 : 1);
      const a0: P2 = [pl * 0.95, off * 0.4 - pw * 0.25], a1: P2 = [a0[0] + Math.cos(curl * 0.5) * L1 * 0.55, a0[1] - Math.sin(curl * 0.5) * L1 * 0.55];
      const a2: P2 = [a1[0] + Math.cos(curl * 1.3) * L1 * 0.45, a1[1] - Math.sin(curl * 1.3) * L1 * 0.45];
      capsule(a0, a1, fw); capsule(a1, a2, fw * 0.9);
    }
  };
  const thumb = (a: number, len: number) => { const t0: P2 = [pl * 0.25, -pw * 0.7]; capsule(t0, [t0[0] + Math.cos(a) * len, t0[1] - Math.sin(a) * len], fw * 1.1); };
  const fist = () => { c.beginPath(); c.ellipse(pl * 0.62, -pw * 0.15, pl * 0.62, pw * 1.25, 0, 0, TAU); c.fill(); for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(pl * 1.08, -pw * 0.9 + k * pw * 0.62, fw * 1.15, 0, TAU); c.fill(); } };
  if (g === "open") { palm(); fingerRow(0.55 + settle, 0.055 * u, fw * 1.6); thumb(0.7, 0.03 * u); }
  else if (g === "fist") { fist(); thumb(0.2, 0.026 * u); }
  else if (g === "beater") { const L = 0.15 * u; c.save(); c.translate(pl * 0.62, -pw * 0.15); c.rotate(-1.15); c.beginPath(); c.moveTo(-0.03 * u, -0.006 * u); c.lineTo(L, -0.009 * u); c.quadraticCurveTo(L + 0.012 * u, 0, L, 0.009 * u); c.lineTo(-0.03 * u, 0.006 * u); c.closePath(); c.fill(); c.restore(); fist(); thumb(0.2, 0.026 * u); }
  else if (g === "glass") { palm(); thumb(1.2, 0.034 * u); }
  else if (g === "point") { fist(); capsule([pl * 0.95, -pw * 0.6], [pl * 0.95 + 0.06 * u, -pw * 0.75], fw); thumb(0.4, 0.026 * u); }
  else if (g === "cig") { palm(); capsule([pl * 0.95, -pw * 0.5], [pl + 0.048 * u, -pw * 0.9], fw); capsule([pl * 0.95, -pw * 0.05], [pl + 0.05 * u, -pw * 0.3], fw); fingerRow(1.9, 0.04 * u, fw * 1.4); thumb(0.9, 0.028 * u); }
  void part; c.restore();
}
/** sideFigure with an optional too-long neck (ghost): head part redrawn `lift` px higher, the gap filled with stretched neck slices */
function figure(c: C2, x: number, y: number, H: number, fill: string, look: Look, pose: SidePose, lift: number): Joints {
  if (lift < 0.6) return sideFigure(c, x, y, H, fill, look, pose);
  const J = sideJoints(x, y, H, pose), cy = J.neck[1] - 0.004 * H, N = 3;
  const band = (y0: number, y1: number) => { c.beginPath(); c.rect(-1e5, y0, 2e5, y1 - y0); c.clip(); };
  c.save(); band(cy, 1e5); sideFigure(c, x, y, H, fill, look, pose); c.restore();
  for (let j = 1; j <= N; j++) {
    const dy = (lift * j) / N; c.save(); band(j === N ? -1e5 : cy - dy, cy - dy + lift / N + 0.6); c.translate(0, -dy); sideFigure(c, x, y, H, fill, look, pose); c.restore();
  }
  return { ...J, head: [J.head[0], J.head[1] - lift] as P2, neck: [J.neck[0], J.neck[1] - lift] as P2 };
}

// ---------------------------------------------------------------- shared body parts
/** small carved face: ear, eye, brow, nostril, mouth corner (head frame) */
function face(c: C2, p: Pal, F: Fr, o: { shut?: number; brow?: number } = {}) {
  hd(c, F, (k) => {
    const w = Math.max(0.6, 0.0028 * F.u) * k;
    sk(c, cv(p, 0.75), w, () => { c.ellipse(-0.05, 0.03, 0.085, 0.14, 0.15, -1.9, 1.7); c.moveTo(-0.06, -0.04); c.quadraticCurveTo(-0.0, 0.02, -0.05, 0.1); });
    const sh = o.shut ?? 0;
    sk(c, cv(p, 0.9), w * 1.1, () => { c.moveTo(0.27, -0.07); c.quadraticCurveTo(0.33, -0.1 + sh * 0.04, 0.39, -0.065); });
    sk(c, cv(p, 0.7), w, () => { c.moveTo(0.24, -0.17 + (o.brow ?? 0)); c.quadraticCurveTo(0.33, -0.2 + (o.brow ?? 0), 0.42, -0.16); c.moveTo(0.47, 0.13); c.quadraticCurveTo(0.44, 0.15, 0.45, 0.17); c.moveTo(0.36, 0.27); c.lineTo(0.43, 0.265); });
    sk(c, cv(p, 0.35), w, () => { c.moveTo(-0.02, 0.22); c.quadraticCurveTo(0.12, 0.42, 0.34, 0.43); });
  });
}
/** redraw the near arm over the straps (exact rig limb widths) + sleeve detail */
function nearArm(c: C2, p: Pal, F: Fr, fill: string, th: number, sleeve: "jacket" | "kaos" | "long" | "bare" | "band") {
  const L = F.J.local, u = F.u, A = L.AB, w = Math.max(0.8, 0.003 * u);
  loc(c, F, () => {
    c.fillStyle = fill; tube(c, L.sh, A.el, 0.022 * u * th, 0.018 * u * th); tube(c, A.el, A.ha, 0.017 * u * th, 0.0125 * u * th);
    const ua = unit(L.sh, A.el), fa = unit(A.el, A.ha), nU: P2 = [-ua[1], ua[0]], nF: P2 = [-fa[1], fa[0]];
    if (sleeve === "jacket" || sleeve === "long") {
      const c0 = lerp2(A.el, A.ha, 0.8), wc = 0.0152 * u * th; c.fillStyle = fill; tube(c, c0, lerp2(A.el, A.ha, 0.97), wc, wc); // cuff
      sk(c, cv(p, 0.85), w, () => { seg(c, add(c0, nF, wc), add(c0, nF, -wc)); const c1 = lerp2(A.el, A.ha, 0.9); seg(c, add(c1, nF, wc * 0.9), add(c1, nF, -wc * 0.6)); });
      sk(c, cv(p, 0.5), w, () => { // elbow creases + seam
        const e = A.el; c.moveTo(e[0] + nU[0] * 0.012 * u - ua[0] * 0.02 * u, e[1] + nU[1] * 0.012 * u - ua[1] * 0.02 * u); c.quadraticCurveTo(e[0] + nU[0] * 0.002 * u, e[1] + nU[1] * 0.002 * u, e[0] + nF[0] * 0.012 * u + fa[0] * 0.02 * u, e[1] + nF[1] * 0.012 * u + fa[1] * 0.02 * u);
        seg(c, lerp2(L.sh, A.el, 0.25), lerp2(L.sh, A.el, 0.8)); seg(c, lerp2(A.el, A.ha, 0.15), lerp2(A.el, A.ha, 0.72));
      });
      if (sleeve === "jacket") sk(c, cv(p, 0.6), w, () => { const q = lerp2(A.el, A.ha, 0.86); seg(c, add(q, nF, -0.014 * u), add(add(q, nF, -0.02 * u), fa, 0.012 * u)); }); // velcro tab
    } else if (sleeve === "kaos") {
      const q = lerp2(L.sh, A.el, 0.5), wq = 0.021 * u * th; c.fillStyle = fill; tube(c, lerp2(L.sh, A.el, 0.1), q, 0.024 * u * th, wq);
      sk(c, cv(p, 0.8), w, () => { seg(c, add(q, nU, wq), add(q, nU, -wq)); seg(c, add(lerp2(L.sh, A.el, 0.3), nU, wq * 0.6), add(lerp2(L.sh, A.el, 0.42), nU, -wq * 0.3)); });
    } else if (sleeve === "band") { // kelat bahu arm band + bracelet
      const q = lerp2(L.sh, A.el, 0.42), wq = 0.021 * u * th, b = lerp2(A.el, A.ha, 0.9);
      sk(c, cv(p, 0.85), w * 1.2, () => { seg(c, add(q, nU, wq), add(q, nU, -wq)); const q2 = add(q, ua, 0.008 * u); seg(c, add(q2, nU, wq), add(q2, nU, -wq)); seg(c, add(b, nF, 0.014 * u), add(b, nF, -0.014 * u)); });
    } else { // bare: bracelets
      const b = lerp2(A.el, A.ha, 0.88), b2 = lerp2(A.el, A.ha, 0.94);
      sk(c, cv(p, 0.75), w, () => { seg(c, add(b, nF, 0.0135 * u * th), add(b, nF, -0.0135 * u * th)); seg(c, add(b2, nF, 0.013 * u * th), add(b2, nF, -0.013 * u * th)); });
    }
    // the hand itself, on top of everything (torch hands stay as the rig drew them, with the torch)
    const g = F.J.gripB; if (g !== "torch" && L.torchSide !== "B") { c.fillStyle = fill; drawHand(c, u, A.ha, A.f, g, L.settle, g === "glass" ? "back" : "all"); }
  });
}
/** near leg redraw (exact rig widths, `baggy` scales it) with trouser detail */
function nearLeg(c: C2, p: Pal, F: Fr, fill: string, th: number, baggy: number, kind: "cargo" | "rolled" | "trouser" | "none") {
  const L = F.J.local, u = F.u, G = L.LB, hip = L.hip, w = Math.max(0.8, 0.003 * u);
  const legW = 0.032 * u * th * baggy, shinW = 0.024 * u * th * baggy;
  loc(c, F, () => {
    c.fillStyle = fill; tube(c, hip, G.k, legW, legW * 0.85); tube(c, G.k, G.a, shinW, shinW * 0.75);
    const ta = unit(hip, G.k), sa = unit(G.k, G.a), nT: P2 = [-ta[1], ta[0]], nS: P2 = [-sa[1], sa[0]];
    if (kind === "cargo") {
      const c0 = lerp2(hip, G.k, 0.5), c1 = lerp2(hip, G.k, 0.86), pw = legW * 0.62;
      const q = [add(c0, nT, pw), add(c1, nT, pw * 0.9), add(c1, nT, -pw * 0.9), add(c0, nT, -pw)];
      c.fillStyle = tn(p, 1.2); poly(c, q); c.fill();
      sk(c, cv(p, 0.85), w, () => { poly(c, q); const f0 = lerp2(hip, G.k, 0.6); seg(c, add(f0, nT, pw * 1.02), add(f0, nT, -pw * 1.02)); });
      c.fillStyle = cv(p, 1); const sn = add(lerp2(hip, G.k, 0.57), nT, 0); c.beginPath(); c.arc(sn[0], sn[1], 0.0032 * u, 0, TAU); c.fill();
      sk(c, cv(p, 0.5), w, () => { seg(c, add(lerp2(hip, G.k, 0.08), nT, -legW * 0.15), add(lerp2(hip, G.k, 0.95), nT, -legW * 0.1)); // side seam
        const k = G.k; c.moveTo(k[0] - nT[0] * legW * 0.6 - ta[0] * 0.015 * u, k[1] - nT[1] * legW * 0.6 - ta[1] * 0.015 * u); c.quadraticCurveTo(k[0] - nT[0] * legW * 0.2, k[1] - nT[1] * legW * 0.2, k[0] - nS[0] * shinW * 0.7 + sa[0] * 0.015 * u, k[1] - nS[1] * shinW * 0.7 + sa[1] * 0.015 * u);
        const k2 = add(k, sa, 0.012 * u); c.moveTo(k2[0] - nS[0] * shinW * 0.9, k2[1] - nS[1] * shinW * 0.9); c.lineTo(k2[0] - nS[0] * shinW * 0.2, k2[1] - nS[1] * shinW * 0.2);
        for (let i = 0; i < 3; i++) { const hq = lerp2(G.k, G.a, 0.7 + i * 0.06); seg(c, add(hq, nS, shinW * 0.85), add(add(hq, nS, -shinW * 0.6), sa, 0.006 * u)); } }); // gathered hem above the boot
    } else if (kind === "rolled" || kind === "trouser") {
      const r0 = kind === "rolled" ? 0.22 : 0.62, q0 = lerp2(G.k, G.a, r0), q1 = lerp2(G.k, G.a, r0 + 0.11), wr = shinW * 1.3;
      c.fillStyle = fill; tube(c, q0, q1, wr, wr);
      sk(c, cv(p, 0.85), w, () => { seg(c, add(q0, nS, wr), add(q0, nS, -wr)); seg(c, add(q1, nS, wr), add(q1, nS, -wr)); const qm = lerp2(q0, q1, 0.5); seg(c, add(qm, nS, wr * 0.8), add(qm, nS, -wr * 0.5)); });
      sk(c, cv(p, 0.45), w, () => { seg(c, add(lerp2(hip, G.k, 0.1), nT, -legW * 0.1), add(lerp2(hip, G.k, 0.9), nT, -legW * 0.1)); const k = G.k; seg(c, add(k, nT, -legW * 0.7), add(add(k, nS, -shinW * 0.2), sa, 0.01 * u)); });
    }
  });
}
/** bare foot detail (toes, mud) on a rig foot in local space */
function bareFoot(c: C2, p: Pal, u: number, a: P2, ft: number, mud: number) {
  c.save(); c.translate(a[0], a[1]); c.rotate(-ft); const w = Math.max(0.7, 0.0025 * u);
  sk(c, cv(p, 0.6), w, () => { for (let i = 0; i < 3; i++) { const xx = (0.064 + i * 0.006) * u; c.moveTo(xx, 0.0); c.lineTo(xx + 0.004 * u, 0.012 * u); } c.moveTo(-0.012 * u, -0.004 * u); c.quadraticCurveTo(-0.004 * u, 0.004 * u, -0.014 * u, 0.008 * u); });
  if (mud > 0) {
    c.fillStyle = isLit(p) ? `rgba(150,118,80,${0.55 * mud})` : `rgba(34,42,58,${0.3 * mud})`;
    c.beginPath(); c.moveTo(-0.028 * u, -0.03 * u);
    for (let i = 0; i <= 10; i++) { const xx = -0.028 * u + i * 0.0115 * u; c.lineTo(xx, -0.022 * u + (i > 4 ? (i - 4) * 0.004 * u : 0) + (hash(i * 7.1) - 0.5) * 0.008 * u); }
    c.lineTo(0.088 * u, 0.012 * u); c.lineTo(0.03 * u, 0.017 * u); c.lineTo(-0.027 * u, 0.017 * u); c.closePath(); c.fill();
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc((-0.03 + 0.012 * i) * u + hash(i * 3.3) * 0.006 * u, (-0.04 - hash(i * 5.7) * 0.03) * u, (0.0018 + 0.002 * hash(i)) * u, 0, TAU); c.fill(); }
  }
  c.restore();
}

// ---------------------------------------------------------------- hiker kit
type Kit = { packH: number; packD: number; mat: boolean; bottle: boolean; head: "beanie" | "cap" | "hair"; long: boolean; pole: boolean; mug: boolean; seed: number; round: number };

/** hiking boot over the rig foot (foot frame at the ankle) */
function boot(c: C2, p: Pal, u: number, a: P2, ft: number, fill: string, sw: number, detail: boolean) {
  c.save(); c.translate(a[0], a[1]); c.rotate(-ft); c.fillStyle = fill; const w = Math.max(0.7, 0.0026 * u);
  c.beginPath(); c.moveTo(-0.029 * u, -0.06 * u); c.lineTo(0.021 * u, -0.062 * u); c.quadraticCurveTo(0.025 * u, -0.034 * u, 0.042 * u, -0.022 * u);
  c.quadraticCurveTo(0.078 * u, -0.017 * u, 0.092 * u, -0.002 * u); c.lineTo(0.094 * u, 0.012 * u); c.lineTo(-0.033 * u, 0.012 * u); c.quadraticCurveTo(-0.037 * u, -0.028 * u, -0.029 * u, -0.06 * u); c.closePath(); c.fill();
  // lug sole (silhouette teeth)
  c.beginPath(); c.moveTo(-0.036 * u, 0.006 * u); c.lineTo(0.095 * u, 0.006 * u); c.quadraticCurveTo(0.1 * u, 0.014 * u, 0.092 * u, 0.021 * u);
  for (let i = 0; i <= 9; i++) { const xx = 0.09 * u - i * 0.0136 * u; c.lineTo(xx, 0.021 * u); c.lineTo(xx - 0.004 * u, 0.0255 * u); c.lineTo(xx - 0.0095 * u, 0.0255 * u); c.lineTo(xx - 0.0136 * u, 0.021 * u); }
  c.lineTo(-0.037 * u, 0.019 * u); c.closePath(); c.fill();
  if (detail) {
    sk(c, cv(p, 0.85), w, () => { c.moveTo(-0.035 * u, 0.007 * u); c.lineTo(0.095 * u, 0.007 * u); // sole seam
      c.moveTo(0.056 * u, -0.019 * u); c.quadraticCurveTo(0.064 * u, -0.004 * u, 0.06 * u, 0.006 * u); c.moveTo(-0.031 * u, -0.012 * u); c.quadraticCurveTo(-0.016 * u, -0.022 * u, -0.006 * u, 0.006 * u); // toe cap + heel counter
      c.moveTo(-0.03 * u, -0.054 * u); c.lineTo(0.021 * u, -0.056 * u); }); // padded collar
    sk(c, cv(p, 0.95), w, () => { // laces zig-zag over the tongue + hooks
      for (let i = 0; i < 4; i++) { const y0 = -0.05 * u + i * 0.009 * u, x0 = 0.012 * u + i * 0.004 * u; c.moveTo(x0 - 0.008 * u, y0); c.lineTo(x0 + 0.008 * u, y0 + 0.008 * u); c.moveTo(x0 + 0.008 * u, y0); c.lineTo(x0 - 0.006 * u, y0 + 0.008 * u); } });
    c.fillStyle = cv(p, 1); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0.004 * u + i * 0.004 * u, -0.05 * u + i * 0.009 * u, 0.0022 * u, 0, TAU); c.fill(); }
    sk(c, cv(p, 0.6), w * 0.8, () => { for (let i = 0; i < 9; i++) { const xx = 0.085 * u - i * 0.0136 * u; c.moveTo(xx, 0.013 * u); c.lineTo(xx, 0.019 * u); } }); // lug grooves
    // bow + lace ends swinging
    c.fillStyle = fill; sk(c, fill, w * 1.2, () => { c.moveTo(0.01 * u, -0.06 * u); c.quadraticCurveTo(0.03 * u + sw * 0.01 * u, -0.07 * u, 0.026 * u + sw * 0.012 * u, -0.05 * u); c.moveTo(0.01 * u, -0.06 * u); c.quadraticCurveTo(0.03 * u + sw * 0.02 * u, -0.052 * u, 0.034 * u + sw * 0.02 * u, -0.038 * u); });
  }
  c.restore();
}
/** carrier backpack in the torso frame (origin shoulder, -x back) */
function pack(c: C2, p: Pal, F: Fr, fill: string, k: Kit, swing: number, t: number) {
  const u = F.u, w = Math.max(0.8, 0.003 * u), yB = 0.235 * u, yL = yB - k.packH * u, yT = yL + 0.052 * u, D = k.packD * u;
  const xf = (yy: number) => -0.05 * u - 0.016 * u * (yy / (0.28 * u));
  tor(c, F, () => {
    c.fillStyle = fill;
    // load lifter straps + haul loop (thin silhouette bands between neck and pack)
    sk(c, fill, 0.006 * u, () => { c.moveTo(xf(yT) + 0.002 * u, yT + 0.028 * u); c.lineTo(-0.012 * u, -0.036 * u); c.moveTo(xf(yT) - 0.004 * u, yT + 0.004 * u); c.quadraticCurveTo(xf(yT) + 0.006 * u, yT - 0.022 * u, xf(yT) + 0.014 * u, yT + 0.006 * u); });
    // main body
    const r = k.round;
    c.beginPath(); c.moveTo(xf(yT), yT); c.quadraticCurveTo(xf(yT) - D * 0.5, yT - 0.012 * u, xf(yT) - D * (0.9 + 0.04 * r), yT + 0.01 * u);
    c.bezierCurveTo(xf(yT) - D * (1.04 + 0.04 * r), yT + 0.08 * u, xf(yB) - D * (1.06 + 0.06 * r), yB - 0.09 * u, xf(yB) - D * 0.95, yB - 0.016 * u);
    c.quadraticCurveTo(xf(yB) - D * 0.8, yB + 0.008 * u, xf(yB) - D * 0.4, yB + 0.006 * u); c.lineTo(xf(yB), yB - 0.004 * u); c.closePath(); c.fill();
    // top lid
    c.beginPath(); c.moveTo(xf(yT) + 0.004 * u, yT + 0.012 * u); c.quadraticCurveTo(xf(yT) - 0.004 * u, yL - 0.004 * u, xf(yT) - D * 0.45, yL);
    c.quadraticCurveTo(xf(yT) - D * 0.98, yL + 0.003 * u, xf(yT) - D * 1.02, yT + 0.016 * u); c.lineTo(xf(yT) - D * 0.92, yT + 0.024 * u); c.lineTo(xf(yT), yT + 0.022 * u); c.closePath(); c.fill();
    const mx = xf(yT) - D * 0.52, mr = 0.033 * u, my = yL - mr * 0.82;
    if (k.mat) { c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill(); }
    // compression strap tails (hang behind, swing)
    const tails: [number, number][] = [[yT + 0.075 * u, 0], [yT + 0.165 * u, 1.3]];
    for (const [ty, ph] of tails) { const bx = xf(yT) - D * 1.02, sw = 0.006 * u * Math.sin(t * 1.3 + ph) + swing * 0.02 * u; sk(c, fill, 0.008 * u, () => { c.moveTo(bx + 0.006 * u, ty); c.quadraticCurveTo(bx - 0.008 * u, ty + 0.02 * u, bx - 0.004 * u + sw, ty + 0.045 * u); }); }
    // --- carved detail
    sk(c, cv(p, 0.8), w, () => {
      c.moveTo(xf(yT) - 0.002 * u, yT + 0.02 * u); c.quadraticCurveTo(xf(yT) - D * 0.5, yT + 0.026 * u, xf(yT) - D * 0.95, yT + 0.02 * u); // lid seam
      c.moveTo(xf(yT) - D * 0.15, yL + 0.016 * u); c.quadraticCurveTo(xf(yT) - D * 0.55, yL + 0.008 * u, xf(yT) - D * 0.92, yL + 0.022 * u); // lid zipper
      for (const [ty] of tails) { c.moveTo(xf(ty), ty + 0.006 * u); c.lineTo(xf(ty) - D * 1.02, ty - 0.004 * u); c.moveTo(xf(ty), ty + 0.014 * u); c.lineTo(xf(ty) - D * 1.02, ty + 0.004 * u); }
      c.moveTo(xf(yT) - 0.007 * u, yT + 0.03 * u); c.lineTo(xf(yB) - 0.007 * u, yB - 0.02 * u); // frame stay
      c.moveTo(xf(yB) - D * 0.1, yB - 0.002 * u); c.quadraticCurveTo(xf(yB) - D * 0.5, yB - 0.012 * u, xf(yB) - D * 0.92, yB - 0.02 * u); // base panel
    });
    c.fillStyle = cv(p, 0.9); // buckles on the compression straps
    for (const [ty] of tails) { const bx = xf(ty) - D * 0.55; c.fillRect(bx - 0.011 * u, ty - 0.001 * u, 0.022 * u, 0.017 * u); }
    c.fillStyle = fill; for (const [ty] of tails) { const bx = xf(ty) - D * 0.55; c.fillRect(bx - 0.004 * u, ty + 0.003 * u, 0.008 * u, 0.009 * u); }
    sk(c, cv(p, 0.55), w * 0.8, () => { for (let i = 0; i < 7; i++) { const yy = yT + 0.04 * u + i * 0.02 * u, xb = xf(yy) - D * (0.98 + 0.05 * Math.sin((i / 6) * Math.PI)); c.moveTo(xb + 0.006 * u, yy); c.lineTo(xb + 0.013 * u, yy); } }); // daisy chain
    sk(c, cv(p, 0.7), w, () => { c.rect(xf(yT) - D * 0.6, yL + 0.026 * u, 0.026 * u, 0.012 * u); }); // logo patch
    if (k.bottle) { // side mesh pocket + bottle
      const px0 = xf(yB) - D * 0.22, px1 = xf(yB) - D * 0.92, py = yB - 0.075 * u, bx = xf(yB) - D * 0.58, bw = 0.021 * u, bt = yB - 0.13 * u;
      c.save(); c.beginPath(); c.moveTo(px0, py); c.quadraticCurveTo((px0 + px1) / 2, py + 0.008 * u, px1, py - 0.004 * u); c.lineTo(px1, yB); c.lineTo(px0, yB); c.closePath(); c.clip();
      sk(c, cv(p, 0.4), w * 0.7, () => { for (let i = -6; i < 12; i++) { const xx = px1 + i * 0.012 * u; c.moveTo(xx, py - 0.01 * u); c.lineTo(xx + 0.08 * u, yB + 0.01 * u); c.moveTo(xx + 0.08 * u, py - 0.01 * u); c.lineTo(xx, yB + 0.01 * u); } }); c.restore();
      sk(c, cv(p, 0.9), w, () => { c.moveTo(px0, py); c.quadraticCurveTo((px0 + px1) / 2, py + 0.008 * u, px1, py - 0.004 * u);
        c.moveTo(bx - bw, py + 0.002 * u); c.lineTo(bx - bw, bt + 0.012 * u); c.quadraticCurveTo(bx - bw, bt, bx - bw * 0.55, bt - 0.004 * u); c.lineTo(bx + bw * 0.55, bt - 0.004 * u); c.quadraticCurveTo(bx + bw, bt, bx + bw, bt + 0.012 * u); c.lineTo(bx + bw, py + 0.002 * u);
        c.rect(bx - bw * 0.6, bt - 0.02 * u, bw * 1.2, 0.016 * u); });
      sk(c, cv(p, 0.55), w * 0.8, () => { for (let i = 1; i < 4; i++) seg(c, [bx - bw * 0.6, bt - 0.02 * u + i * 0.004 * u], [bx + bw * 0.6, bt - 0.02 * u + i * 0.004 * u]); seg(c, [bx - bw * 0.4, bt + 0.012 * u], [bx - bw * 0.4, py - 0.004 * u]); });
    }
    if (k.mat) {
      sk(c, cv(p, 0.75), w, () => { for (const f of [0.72, 0.45, 0.2]) { c.moveTo(mx + mr * f, my); c.arc(mx, my, mr * f, 0, TAU); } });
      sk(c, cv(p, 0.5), w * 0.8, () => { for (let i = 0; i <= 24; i++) { const a = i * 0.55, rr = mr * (0.08 + 0.035 * i); const q: P2 = [mx + Math.cos(a) * rr, my + Math.sin(a) * rr]; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } });
      c.fillStyle = fill; sk(c, fill, 0.007 * u, () => { c.moveTo(mx - mr * 0.75, my + mr * 0.9); c.lineTo(mx - mr * 0.95, my - mr * 0.2); c.moveTo(mx + mr * 0.75, my + mr * 0.9); c.lineTo(mx + mr * 0.95, my - mr * 0.2); }); // mat straps
      c.fillStyle = cv(p, 0.8); c.fillRect(mx + mr * 0.82, my + mr * 0.15, 0.009 * u, 0.012 * u);
    }
  });
  // carabiner + mug dangling from the base loop (pendulum in world-down)
  if (k.mug) {
    const an = torPt(F, [xf(yB) - D * 0.8, yB - 0.004 * u]);
    loc(c, F, () => {
      c.translate(an[0], an[1]); c.rotate(-swing); c.fillStyle = fill;
      sk(c, fill, 0.0042 * u, () => { c.ellipse(0, 0.016 * u, 0.0075 * u, 0.0165 * u, 0, 0, TAU); });
      sk(c, cv(p, 0.8), w * 0.8, () => { seg(c, [0.0075 * u, 0.006 * u], [0.0075 * u, 0.024 * u]); });
      c.translate(0, 0.032 * u); c.rotate(swing * 0.4);
      sk(c, fill, 0.0045 * u, () => { c.arc(0.0, 0.006 * u, 0.007 * u, Math.PI, 0); });
      c.beginPath(); c.moveTo(-0.017 * u, 0.008 * u); c.lineTo(0.017 * u, 0.008 * u); c.lineTo(0.015 * u, 0.04 * u); c.quadraticCurveTo(0, 0.044 * u, -0.015 * u, 0.04 * u); c.closePath(); c.fill();
      sk(c, cv(p, 0.85), w * 0.8, () => { c.ellipse(0, 0.0095 * u, 0.016 * u, 0.003 * u, 0, 0, TAU); seg(c, [-0.012 * u, 0.03 * u], [0.012 * u, 0.03 * u]); });
    });
  }
}
/** trekking pole held in the far hand: grip at the fist, tip planted on the ground (lifted when the hand is too high) */
function pole(c: C2, p: Pal, J: Joints, y: number, fill: string) {
  const u = J.u, g = J.anchF.c, Lp = 0.6 * u, hh = y - g[1]; let tip: P2;
  if (hh < Lp - 0.002 * u) tip = [g[0] + J.d * Math.sqrt(Lp * Lp - hh * hh), y]; else tip = [g[0] + J.d * Lp * Math.sin(0.08), g[1] + Lp * Math.cos(0.08)];
  const ax = unit(g, tip), n: P2 = [-ax[1], ax[0]], w = Math.max(0.8, 0.003 * u), at = (k: number) => add(g, ax, k * Lp);
  c.fillStyle = fill;
  tube(c, add(g, ax, -0.06 * u), add(g, ax, 0.05 * u), 0.0085 * u, 0.0075 * u); // foam grip
  tube(c, add(g, ax, 0.05 * u), at(0.48), 0.0042 * u, 0.0042 * u); tube(c, at(0.48), at(0.97), 0.0034 * u, 0.0026 * u);
  tube(c, at(0.47), at(0.5), 0.0062 * u, 0.0062 * u); // lever lock
  const bk = at(0.9); poly(c, [add(bk, n, 0.015 * u), add(add(bk, n, 0.012 * u), ax, 0.005 * u), add(add(bk, n, -0.012 * u), ax, 0.005 * u), add(bk, n, -0.015 * u)]); c.fill(); // basket
  sk(c, fill, 0.0035 * u, () => { const top = add(g, ax, -0.062 * u); c.moveTo(top[0], top[1]); c.quadraticCurveTo(top[0] - n[0] * 0.03 * u + ax[0] * 0.05 * u, top[1] - n[1] * 0.03 * u + ax[1] * 0.05 * u, g[0] - n[0] * 0.01 * u, g[1] - n[1] * 0.01 * u); }); // wrist strap
  sk(c, cv(p, 0.75), w, () => { for (let i = 0; i < 4; i++) { const q = add(g, ax, -0.05 * u + i * 0.009 * u); seg(c, add(q, n, 0.007 * u), add(q, n, -0.007 * u)); } const l = at(0.485); seg(c, add(l, n, 0.006 * u), add(l, n, -0.006 * u)); });
}
/** beanie with ribs + fold cuff (head frame) */
function beanie(c: C2, p: Pal, F: Fr, fill: string) {
  hd(c, F, (k) => {
    const w = Math.max(0.7, 0.003 * F.u) * k; c.fillStyle = fill;
    c.beginPath(); c.moveTo(0.46, -0.27); c.bezierCurveTo(0.46, -0.72, 0.05, -0.92, -0.3, -0.82); c.bezierCurveTo(-0.62, -0.72, -0.74, -0.34, -0.66, -0.02);
    c.lineTo(-0.5, 0.0); c.lineTo(0.2, -0.2); c.closePath(); c.fill();
    sk(c, cv(p, 0.9), w, () => { c.moveTo(0.46, -0.42); c.bezierCurveTo(0.2, -0.46, -0.3, -0.38, -0.7, -0.16); }); // cuff top edge
    sk(c, cv(p, 0.55), w * 0.85, () => { for (let i = 0; i < 11; i++) { const f = i / 10, bx = 0.44 - f * 1.12, by = -0.43 + f * 0.27 + Math.sin(f * Math.PI) * 0.02; c.moveTo(bx, by); c.quadraticCurveTo(bx * 0.6 - 0.1, by - 0.25, -0.16 + (f - 0.5) * 0.12, -0.84); }
      for (let i = 0; i < 12; i++) { const f = i / 11, bx = 0.45 - f * 1.12, by = -0.3 + f * 0.27; c.moveTo(bx, by - 0.02); c.lineTo(bx, by - 0.11); } }); // ribs on crown + cuff
  });
}
function cap(c: C2, p: Pal, F: Fr, fill: string) {
  hd(c, F, (k) => {
    const w = Math.max(0.7, 0.003 * F.u) * k; c.fillStyle = fill;
    c.beginPath(); c.moveTo(0.44, -0.33); c.bezierCurveTo(0.42, -0.76, -0.1, -0.86, -0.4, -0.7); c.bezierCurveTo(-0.6, -0.56, -0.66, -0.32, -0.62, -0.2); c.lineTo(0.1, -0.3); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0.36, -0.38); c.quadraticCurveTo(0.62, -0.42, 0.86, -0.32); c.lineTo(0.84, -0.27); c.quadraticCurveTo(0.6, -0.31, 0.4, -0.27); c.closePath(); c.fill(); // brim
    sk(c, cv(p, 0.8), w, () => { c.moveTo(0.4, -0.36); c.quadraticCurveTo(0.6, -0.39, 0.82, -0.3); c.moveTo(0.1, -0.84); c.quadraticCurveTo(0.25, -0.6, 0.4, -0.36); c.moveTo(-0.26, -0.79); c.quadraticCurveTo(-0.3, -0.5, -0.5, -0.3); c.moveTo(-0.6, -0.3); c.lineTo(-0.48, -0.26); });
    c.fillStyle = cv(p, 0.9); c.beginPath(); c.arc(-0.08, -0.84, 0.035, 0, TAU); c.fill();
    sk(c, cv(p, 0.5), w, () => { c.rect(0.0, -0.6, 0.16, 0.1); });
  });
}
function hairCap(c: C2, p: Pal, F: Fr, fill: string) {
  hd(c, F, (k) => {
    c.fillStyle = fill; c.beginPath(); c.moveTo(-0.56, 0.06); c.bezierCurveTo(-0.7, -0.56, -0.1, -0.84, 0.4, -0.5); c.lineTo(0.44, -0.33); c.bezierCurveTo(0.2, -0.45, 0.02, -0.38, -0.08, -0.3); c.lineTo(-0.42, 0.14); c.closePath(); c.fill();
    sk(c, cv(p, 0.45), Math.max(0.6, 0.0025 * F.u) * k, () => { for (let i = 0; i < 6; i++) { const f = i / 5; c.moveTo(0.36 - f * 0.2, -0.5 + f * 0.05); c.quadraticCurveTo(-0.1 - f * 0.1, -0.72 + f * 0.1, -0.5 - f * 0.08, -0.2 + f * 0.25); } });
  });
}
/** headlamp band + housing + glowing lens (head frame) */
function headlamp(c: C2, p: Pal, F: Fr, fill: string, lamp: number) {
  hd(c, F, (k) => {
    const w = Math.max(0.7, 0.003 * F.u) * k;
    sk(c, fill, 0.1, () => { c.moveTo(0.46, -0.3); c.bezierCurveTo(0.2, -0.36, -0.3, -0.3, -0.7, -0.1); c.moveTo(-0.1, -0.33); c.quadraticCurveTo(-0.16, -0.62, -0.18, -0.86); });
    sk(c, cv(p, 0.85), w, () => { c.moveTo(0.44, -0.35); c.bezierCurveTo(0.2, -0.41, -0.3, -0.35, -0.72, -0.15); c.moveTo(0.44, -0.25); c.bezierCurveTo(0.2, -0.31, -0.3, -0.25, -0.68, -0.05); });
    c.fillStyle = fill; c.beginPath(); c.moveTo(0.42, -0.4); c.lineTo(0.58, -0.4); c.quadraticCurveTo(0.66, -0.4, 0.66, -0.3); c.quadraticCurveTo(0.66, -0.19, 0.58, -0.19); c.lineTo(0.42, -0.19); c.closePath(); c.fill();
    sk(c, cv(p, 0.9), w, () => { c.moveTo(0.5, -0.4); c.lineTo(0.5, -0.19); c.moveTo(0.53, -0.43); c.lineTo(0.6, -0.43); });
    const g = clamp01(lamp);
    c.fillStyle = g > 0.02 ? `rgba(255,248,226,${0.35 + 0.65 * g})` : cv(p, 0.7); c.beginPath(); c.ellipse(0.655, -0.295, 0.025, 0.075, 0, 0, TAU); c.fill();
    if (g > 0.02) { const gr = c.createRadialGradient(0.67, -0.3, 0, 0.67, -0.3, 0.42); gr.addColorStop(0, `rgba(255,250,232,${0.55 * g})`); gr.addColorStop(1, "rgba(255,250,232,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0.67, -0.3, 0.42, 0, TAU); c.fill(); }
  });
}
/** calm breath puffs from the mouth, born at the start of each exhale */
function breathPuffs(c: C2, p: Pal, J: Joints, ph: number, amt: number) {
  if (amt <= 0.01) return; const u = J.u, m = headPt(J, 0.52, 0.33), col = isLit(p) ? "238,232,218" : "150,170,204", A = (isLit(p) ? 0.34 : 0.2) * amt;
  const f0 = ((((ph - Math.PI / 2) / TAU) % 1) + 1) % 1;
  for (const a of [f0, f0 + 1]) {
    const env = sm(0, 0.14, a) * (1 - sm(0.3, 1.7, a)); if (env < 0.01) continue;
    for (let i = 0; i < 3; i++) {
      const r = 0.012 * u + 0.045 * u * Math.pow(a, 0.7) * (1 - 0.2 * i), px = m[0] + J.d * (0.014 * u + 0.085 * u * Math.pow(a, 0.8) + i * 0.012 * u), py = m[1] - 0.026 * u * a - i * 0.006 * u + 0.004 * u * Math.sin(a * 3 + i);
      const g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${col},${(A * env * (1 - 0.25 * i)).toFixed(3)})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
    }
  }
}

function trekker(c: C2, p: Pal, x: number, y: number, H: number, fill: string, pose0: SidePose, o: HikerOpt, k: Kit): Joints {
  const u = H, wk = clamp01(o.weak ?? 0), t = o.t, pose: SidePose = { ...pose0 };
  if (wk > 0) {
    pose.lean = (pose.lean ?? 0) + 0.2 * wk; pose.head = (pose.head ?? 0) + 0.3 * wk;
    if (pose.idle) pose.idle = { ...pose.idle, t: pose.idle.t * (1 - 0.45 * wk), amount: (pose.idle.amount ?? 1) * (1 - 0.5 * wk) };
    if (pose.walk !== undefined) pose.stride = (pose.stride ?? 1) * (1 - 0.35 * wk);
    if (!pose.armB && !pose.reachB && pose.sit === undefined && pose.walk === undefined) pose.armB = [0.12 * wk, -0.08];
  }
  const usePole = k.pole;
  if (usePole) {
    if (!pose.gripF) pose.gripF = "fist";
    if (!pose.armF && !pose.reachF) pose.armF = pose.walk !== undefined ? [0.28 + 0.22 * Math.sin(pose.walk), -(0.85 + 0.25 * Math.sin(pose.walk))] : [0.3, -0.95 + 0.05 * Math.sin(t * 0.6)];
  }
  const yg = y; if (pose.sit === undefined) y += FOOT_BOOT * H; // soles on the floor
  const J0 = sideJoints(x, y, H, pose);
  if (usePole) pole(c, p, J0, yg, fill);
  const look: Look = { jacket: true, hair: false };
  const J = sideFigure(c, x, y, H, fill, look, pose);
  const F: Fr = { x, y, J, lift: 0, u }, L = J.local, w = Math.max(0.8, 0.003 * u);
  const it = pose.idle?.t ?? t, sd = pose.idle?.seed ?? k.seed;
  const swing = pose.walk !== undefined ? 0.26 * Math.sin(pose.walk + 1.1) - L.lean : 0.07 * Math.sin(it * 1.25 + sd) - L.lean * 0.6;
  // hood rolled at the back of the collar (under the pack top)
  loc(c, F, () => { c.fillStyle = fill; tube(c, [L.neck[0] - 0.028 * u, L.neck[1] + 0.008 * u], [L.sh[0] - 0.045 * u, L.sh[1] - 0.014 * u], 0.017 * u, 0.019 * u);
    sk(c, cv(p, 0.6), w, () => { c.moveTo(L.neck[0] - 0.042 * u, L.neck[1] + 0.0 * u); c.quadraticCurveTo(L.sh[0] - 0.05 * u, L.sh[1] - 0.04 * u, L.sh[0] - 0.062 * u, L.sh[1] - 0.012 * u); c.moveTo(L.neck[0] - 0.02 * u, L.neck[1] + 0.02 * u); c.quadraticCurveTo(L.sh[0] - 0.03 * u, L.sh[1] - 0.012 * u, L.sh[0] - 0.04 * u, L.sh[1] + 0.002 * u); }); });
  if (o.pack ?? true) pack(c, p, F, fill, k, swing, it);
  // far boot, then near leg + near boot (so the near leg correctly covers the far boot detail)
  const lsw = pose.walk !== undefined ? Math.sin(pose.walk * 2) : Math.sin(it * 0.9 + sd) * 0.4;
  loc(c, F, () => boot(c, p, u, L.LF.a, L.LF.ft, fill, lsw, true));
  nearLeg(c, p, F, fill, 1, 1.06, "cargo");
  loc(c, F, () => boot(c, p, u, L.LB.a, L.LB.ft, fill, -lsw, true));
  if (o.hurt) loc(c, F, () => { // elastic bandage around the near ankle, over the boot shaft
    c.save(); c.translate(L.LB.a[0], L.LB.a[1]); c.rotate(-L.LB.ft);
    c.fillStyle = isLit(p) ? "#e6dcc6" : "#28324a"; c.beginPath(); c.moveTo(-0.034 * u, -0.078 * u); c.lineTo(0.026 * u, -0.08 * u); c.lineTo(0.03 * u, -0.026 * u); c.quadraticCurveTo(0.0, -0.016 * u, -0.036 * u, -0.03 * u); c.closePath(); c.fill();
    sk(c, isLit(p) ? "rgba(22,14,10,0.55)" : "rgba(5,8,14,0.6)", w * 0.8, () => { for (let i = 0; i < 6; i++) { const yy = -0.074 * u + i * 0.009 * u; c.moveTo(-0.034 * u, yy + 0.006 * u); c.lineTo(0.028 * u, yy); } });
    c.fillStyle = isLit(p) ? "rgba(22,14,10,0.7)" : "rgba(5,8,14,0.7)"; c.fillRect(0.004 * u, -0.06 * u, 0.012 * u, 0.003 * u); c.restore(); });
  // ---- torso detail (clipped away from the near hand)
  c.save();
  if (k.long) loc(c, F, () => { const hp = L.hip; c.fillStyle = fill; poly(c, [[hp[0] - 0.07 * u, hp[1] + 0.04 * u], [hp[0] + 0.064 * u, hp[1] + 0.04 * u], [hp[0] + 0.07 * u, hp[1] + 0.105 * u], [hp[0] - 0.078 * u, hp[1] + 0.1 * u]]); c.fill();
    sk(c, cv(p, 0.75), w, () => { seg(c, [hp[0] - 0.076 * u, hp[1] + 0.092 * u], [hp[0] + 0.068 * u, hp[1] + 0.097 * u]); seg(c, [hp[0] + 0.03 * u, hp[1] + 0.06 * u], [hp[0] + 0.06 * u, hp[1] + 0.055 * u]); }); });
  tor(c, F, () => {
    sk(c, cv(p, 0.85), w, () => { c.moveTo(0.04 * u, -0.014 * u); c.quadraticCurveTo(0.062 * u, 0.13 * u, 0.048 * u, k.long ? 0.37 * u : 0.33 * u); }); // zipper
    sk(c, cv(p, 0.5), w * 0.7, () => { for (let i = 1; i < 16; i++) { const f = i / 16, q: P2 = [(1 - f) * (1 - f) * 0.04 * u + 2 * f * (1 - f) * 0.062 * u + f * f * 0.048 * u, (1 - f) * (1 - f) * -0.014 * u + 2 * f * (1 - f) * 0.13 * u + f * f * 0.33 * u]; seg(c, [q[0] - 0.004 * u, q[1]], [q[0] + 0.002 * u, q[1]]); } });
    sk(c, cv(p, 0.9), w, () => { seg(c, [0.04 * u, -0.012 * u], [0.046 * u, 0.012 * u]); seg(c, [0.012 * u, 0.052 * u], [0.05 * u, 0.04 * u]); seg(c, [0.05 * u, 0.04 * u], [0.053 * u, 0.056 * u]); }); // zip pulls, chest pocket
    sk(c, cv(p, 0.45), w, () => { c.moveTo(-0.035 * u, 0.12 * u); c.quadraticCurveTo(0.0, 0.16 * u, 0.012 * u, 0.215 * u); c.moveTo(-0.04 * u, 0.04 * u); c.quadraticCurveTo(0.0, 0.035 * u, 0.045 * u, 0.045 * u); c.moveTo(0.0, 0.1 * u); c.quadraticCurveTo(0.02 * u, 0.15 * u, 0.03 * u, 0.2 * u); });
  });
  loc(c, F, () => { const hp = L.hip; sk(c, cv(p, 0.7), w, () => { seg(c, [hp[0] - 0.068 * u, hp[1] + 0.05 * u], [hp[0] + 0.062 * u, hp[1] + 0.052 * u]); });
    c.fillStyle = fill; const tg: P2 = [hp[0] + 0.06 * u, hp[1] + 0.05 * u]; sk(c, fill, 0.003 * u, () => { c.moveTo(tg[0], tg[1]); c.lineTo(tg[0] + 0.004 * u + swing * 0.008 * u, tg[1] + 0.03 * u); }); c.beginPath(); c.ellipse(tg[0] + 0.004 * u + swing * 0.008 * u, tg[1] + 0.034 * u, 0.0045 * u, 0.007 * u, 0, 0, TAU); c.fill(); }); // hem + drawcord toggle
  if (o.pack ?? true) tor(c, F, () => { // shoulder strap, sternum strap, hip belt
    c.fillStyle = fill;
    c.beginPath(); c.moveTo(-0.054 * u, -0.042 * u); c.quadraticCurveTo(-0.012 * u, -0.064 * u, 0.03 * u, -0.032 * u); c.quadraticCurveTo(0.06 * u, 0.0, 0.052 * u, 0.1 * u); c.lineTo(0.038 * u, 0.152 * u);
    c.lineTo(0.022 * u, 0.15 * u); c.lineTo(0.031 * u, 0.1 * u); c.quadraticCurveTo(0.036 * u, 0.012 * u, 0.014 * u, -0.012 * u); c.quadraticCurveTo(-0.014 * u, -0.036 * u, -0.05 * u, -0.018 * u); c.closePath(); c.fill();
    sk(c, cv(p, 0.85), w, () => { c.moveTo(-0.054 * u, -0.042 * u); c.quadraticCurveTo(-0.012 * u, -0.064 * u, 0.03 * u, -0.032 * u); c.quadraticCurveTo(0.06 * u, 0.0, 0.052 * u, 0.1 * u); c.lineTo(0.038 * u, 0.152 * u);
      c.moveTo(0.022 * u, 0.15 * u); c.lineTo(0.031 * u, 0.1 * u); c.quadraticCurveTo(0.036 * u, 0.012 * u, 0.014 * u, -0.012 * u); c.quadraticCurveTo(-0.014 * u, -0.036 * u, -0.05 * u, -0.018 * u); });
    c.save(); c.setLineDash([0.004 * u, 0.004 * u]); sk(c, cv(p, 0.55), w * 0.8, () => { c.moveTo(-0.045 * u, -0.03 * u); c.quadraticCurveTo(-0.012 * u, -0.05 * u, 0.022 * u, -0.022 * u); c.quadraticCurveTo(0.048 * u, 0.006 * u, 0.042 * u, 0.1 * u); c.lineTo(0.031 * u, 0.15 * u); }); c.restore();
    sk(c, fill, 0.008 * u, () => { c.moveTo(0.03 * u, 0.152 * u); c.lineTo(-0.052 * u, 0.205 * u); }); // lower webbing to the pack
    c.fillStyle = cv(p, 0.9); c.fillRect(0.022 * u, 0.146 * u, 0.018 * u, 0.012 * u);
    c.fillStyle = fill; sk(c, fill, 0.005 * u, () => { c.moveTo(0.03 * u, 0.156 * u); c.lineTo(0.034 * u + swing * 0.01 * u, 0.19 * u); }); // strap tail
    // sternum strap with a buckle that sticks out of the chest line
    c.fillStyle = fill; c.fillRect(0.022 * u, 0.05 * u, 0.044 * u, 0.008 * u); c.fillRect(0.058 * u, 0.045 * u, 0.012 * u, 0.018 * u);
    sk(c, cv(p, 0.85), w, () => { c.rect(0.058 * u, 0.045 * u, 0.012 * u, 0.018 * u); seg(c, [0.064 * u, 0.045 * u], [0.064 * u, 0.063 * u]); });
    // hip belt: padded wing + webbing + front buckle
    c.fillStyle = fill; c.beginPath(); c.moveTo(-0.062 * u, 0.2 * u); c.quadraticCurveTo(-0.01 * u, 0.204 * u, 0.042 * u, 0.226 * u); c.lineTo(0.044 * u, 0.256 * u); c.quadraticCurveTo(-0.01 * u, 0.25 * u, -0.064 * u, 0.248 * u); c.closePath(); c.fill();
    c.fillRect(0.04 * u, 0.236 * u, 0.034 * u, 0.01 * u); c.fillRect(0.066 * u, 0.23 * u, 0.012 * u, 0.022 * u);
    sk(c, cv(p, 0.85), w, () => { c.moveTo(-0.062 * u, 0.2 * u); c.quadraticCurveTo(-0.01 * u, 0.204 * u, 0.042 * u, 0.226 * u); c.lineTo(0.044 * u, 0.256 * u); c.quadraticCurveTo(-0.01 * u, 0.25 * u, -0.064 * u, 0.248 * u);
      c.moveTo(-0.03 * u, 0.218 * u); c.quadraticCurveTo(0.0, 0.222 * u, 0.03 * u, 0.234 * u); c.rect(0.066 * u, 0.23 * u, 0.012 * u, 0.022 * u); seg(c, [0.04 * u, 0.236 * u], [0.066 * u, 0.236 * u]); seg(c, [0.04 * u, 0.246 * u], [0.066 * u, 0.246 * u]); });
    c.fillStyle = cv(p, 1); c.fillRect(0.026 * u, 0.232 * u, 0.006 * u, 0.004 * u); // pocket zip pull
    c.fillStyle = fill; sk(c, fill, 0.006 * u, () => { c.moveTo(0.074 * u, 0.248 * u); c.quadraticCurveTo(0.08 * u, 0.27 * u, 0.076 * u + swing * 0.012 * u, 0.29 * u); });
  });
  c.restore();
  nearArm(c, p, F, fill, 1, "jacket");
  // head: hair / beanie / cap, headlamp, face, breath
  if (k.head === "beanie") beanie(c, p, F, fill); else if (k.head === "cap") cap(c, p, F, fill); else hairCap(c, p, F, fill);
  face(c, p, F, { shut: wk * 0.9, brow: wk * 0.03 });
  if (o.lamp !== undefined || k.seed === 0) headlamp(c, p, F, fill, o.lamp ?? 0);
  if (o.breathFog) { const ph = pose.breath ?? (it * TAU) / 3.6 + sd; breathPuffs(c, p, J, ph, o.breathFog); }
  return J;
}

/** Naam, the hiker (34): carrier backpack with frame + rolled sleeping mat + water bottle + dangling carabiner, beanie,
 *  headlamp (lamp 0..1 = on), windbreaker with hood, cargo pants, hiking boots, trekking pole in the front hand (pole).
 *  weak 0..1 = slumped exhausted posture (shots fast/ravine/rescue). breathFog = visible breath puffs (cold). */
export type HikerOpt = { pack?: boolean; lamp?: number; pole?: boolean; beanie?: boolean; weak?: number; breathFog?: number; t: number; hurt?: boolean };
export function hiker(c: C2, p: Pal, x: number, y: number, H: number, fill: string, pose: SidePose, o: HikerOpt): Joints {
  return trekker(c, p, x, y, H, fill, pose, { ...o, lamp: o.lamp ?? 0 }, { packH: 0.33, packD: 0.135, mat: true, bottle: true, head: (o.beanie ?? true) ? "beanie" : "hair", long: false, pole: o.pole ?? false, mug: true, seed: 0, round: 0 });
}
/** headlamp light cone for a figure drawn by hiker()/friend(): origin at the lens, aimed along the head pitch (slightly down). */
export function headlampCone(J: Joints, len: number, w: number, i: number): Light {
  const o = headPt(J, 0.68, -0.3), a = J.local.headPitch + 0.14, dx = Math.cos(a) * J.d, dy = Math.sin(a);
  return { k: "cone", ox: o[0], oy: o[1], tx: o[0] + dx * len, ty: o[1] + dy * len, w, r: w * 1.15, i, col: HEADLAMP, beam: 0.7 };
}
/** the 4 friends at the summit: same hiker kit with variety (seed changes jacket/hat/pack colour tones and gear). */
export function friend(c: C2, p: Pal, x: number, y: number, H: number, fill: string, pose: SidePose, o: HikerOpt & { seed: number }): Joints {
  const s = o.seed, r = (k: number) => hash(s * 13.7 + k * 3.1);
  const head: Kit["head"] = o.beanie === true ? "beanie" : o.beanie === false ? (r(1) < 0.5 ? "cap" : "hair") : r(1) < 0.4 ? "beanie" : r(1) < 0.75 ? "cap" : "hair";
  return trekker(c, p, x, y, H, fill, pose, o, { packH: 0.28 + 0.07 * r(2), packD: 0.115 + 0.04 * r(3), mat: r(4) < 0.6, bottle: r(5) < 0.7, head, long: r(6) < 0.45, pole: o.pole ?? (r(7) < 0.5 && pose.sit === undefined), mug: r(8) < 0.5, seed: s + 1, round: r(9) });
}

// ---------------------------------------------------------------- court figures
/** jarik wrap skirt from the waist to `hemK` (1 = ankle, ~0.5 = knee) following the legs; returns its polygon (local) */
function jarikPoly(L: Joints["local"], u: number, hemK: number): P2[] {
  const hp = L.hip, F = L.LF, B = L.LB, kf = Math.max(F.k[0], B.k[0]), kb = Math.min(F.k[0], B.k[0]), ky = (F.k[1] + B.k[1]) / 2;
  const at = (G: typeof F) => (hemK > 0.55 ? lerp2(G.k, G.a, (hemK - 0.5) * 2) : lerp2(hp, G.k, hemK * 2));
  const hf = at(F), hb = at(B), front = Math.max(hf[0], hb[0]), back = Math.min(hf[0], hb[0]), hy = Math.max(hf[1], hb[1]) - (hemK > 0.9 ? 0.03 * u : 0);
  const pts: P2[] = [[hp[0] - 0.072 * u, hp[1] - 0.035 * u], [hp[0] + 0.06 * u, hp[1] - 0.035 * u], [hp[0] + 0.068 * u, hp[1] + 0.04 * u]];
  if (hemK > 0.55) pts.push([kf + 0.036 * u, ky]);
  pts.push([front + 0.034 * u, hy], [back - 0.03 * u, hy + 0.004 * u]);
  if (hemK > 0.55) pts.push([kb - 0.036 * u, ky + 0.01 * u]);
  pts.push([hp[0] - 0.09 * u, hp[1] + 0.05 * u]);
  return pts;
}
/** batik motif (lit pass) clipped to a polygon: parang (diagonal S-bands) or kawung (four-petal circles) */
function batik(c: C2, p: Pal, pts: P2[], u: number, motif: "parang" | "kawung", a = 1) {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = Math.max(0.6, 0.0022 * u);
  c.save(); poly(c, pts); c.clip(); c.beginPath(); const s = 0.03 * u;
  if (motif === "kawung") {
    for (let yy = y0; yy < y1 + s; yy += s) for (let xx = x0 + ((Math.round((yy - y0) / s) % 2) * s) / 2; xx < x1 + s; xx += s) {
      for (let q = 0; q < 4; q++) { const an = q * (Math.PI / 2) + Math.PI / 4, cx = xx + Math.cos(an) * s * 0.22, cy = yy + Math.sin(an) * s * 0.22; c.moveTo(cx + Math.cos(an) * s * 0.17, cy + Math.sin(an) * s * 0.17); c.ellipse(cx, cy, s * 0.17, s * 0.09, an, 0, TAU); }
    }
  } else {
    for (let d = x0 - (y1 - y0) - s; d < x1 + s; d += s * 1.1) {
      c.moveTo(d, y0); c.lineTo(d + (y1 - y0), y1); c.moveTo(d + s * 0.28, y0); c.lineTo(d + s * 0.28 + (y1 - y0), y1);
      for (let yy = y0; yy < y1; yy += s * 0.55) { const xx = d + (yy - y0) + s * 0.62; c.moveTo(xx - s * 0.14, yy); c.quadraticCurveTo(xx + s * 0.1, yy - s * 0.05, xx + s * 0.04, yy + s * 0.18); }
    }
  }
  c.strokeStyle = cv(p, isLit(p) ? 0.55 * a : 0.25 * a); c.lineWidth = w; c.stroke(); c.restore();
}
/** front pleats (wiru) + edge line of a jarik */
function wiru(c: C2, p: Pal, pts: P2[], u: number, fill: string) {
  const w0 = pts[1], hem = pts.find((_, i) => i > 2 && pts[i][1] === Math.max(...pts.map((q) => q[1])))!;
  const front = pts.reduce((m, q) => (q[1] > w0[1] + 0.05 * u && q[0] > m[0] ? q : m), pts[2]), hy = hem[1], fx = front[0], w = Math.max(0.7, 0.0028 * u);
  c.fillStyle = fill; for (let i = 0; i < 4; i++) { const xx = fx - 0.008 * u - i * 0.008 * u; poly(c, [[xx, hy - 0.002 * u], [xx + 0.004 * u, hy + 0.008 * u], [xx + 0.008 * u, hy - 0.002 * u]]); c.fill(); }
  sk(c, cv(p, 0.75), w, () => { for (let i = 0; i < 4; i++) { const xx = fx - 0.006 * u - i * 0.008 * u; c.moveTo(w0[0] - 0.006 * u - i * 0.004 * u, w0[1] + 0.03 * u); c.quadraticCurveTo(xx + 0.006 * u, (w0[1] + hy) / 2, xx, hy - 0.004 * u); } seg(c, [w0[0] - 0.09 * u, w0[1] + 0.01 * u], [fx - 0.04 * u, hy - 0.01 * u]); });
}
function blangkon(c: C2, p: Pal, F: Fr, fill: string, iket: boolean) {
  hd(c, F, (k) => {
    const w = Math.max(0.7, 0.003 * F.u) * k; c.fillStyle = fill;
    c.beginPath(); c.moveTo(0.46, -0.3); c.bezierCurveTo(0.44, -0.66, 0.1, -0.8, -0.22, -0.74); c.bezierCurveTo(-0.56, -0.66, -0.7, -0.34, -0.62, -0.06); c.lineTo(-0.46, 0.0); c.quadraticCurveTo(-0.1, -0.2, 0.46, -0.3); c.closePath(); c.fill();
    if (!iket) { c.beginPath(); c.ellipse(-0.68, -0.14, 0.25, 0.19, 0.35, 0, TAU); c.fill(); // mondolan knot (egg-shaped bulge at the back)
      sk(c, cv(p, 0.7), w, () => { c.ellipse(-0.7, -0.13, 0.15, 0.1, 0.35, 0.4, 5.2); c.moveTo(-0.86, -0.04); c.quadraticCurveTo(-0.72, -0.26, -0.5, -0.26); }); }
    else { c.beginPath(); c.moveTo(-0.5, -0.62); c.quadraticCurveTo(-0.78, -0.72, -0.98, -0.66); c.quadraticCurveTo(-0.78, -0.56, -0.62, -0.44); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-0.62, -0.42); c.quadraticCurveTo(-0.86, -0.42, -1.02, -0.3); c.quadraticCurveTo(-0.8, -0.3, -0.62, -0.28); c.closePath(); c.fill(); }
    sk(c, cv(p, 0.85), w, () => { c.moveTo(0.46, -0.3); c.quadraticCurveTo(-0.1, -0.2, -0.46, 0.0); c.moveTo(0.44, -0.37); c.quadraticCurveTo(-0.1, -0.28, -0.5, -0.08); });
    sk(c, cv(p, 0.5), w * 0.9, () => { for (let i = 0; i < 3; i++) { const f = i / 2; c.moveTo(0.3 - f * 0.4, -0.36 + f * 0.12); c.quadraticCurveTo(0.05 - f * 0.4, -0.52 + f * 0.1, -0.2 - f * 0.32, -0.72 + f * 0.1); } c.moveTo(0.42, -0.5); c.quadraticCurveTo(0.3, -0.66, 0.1, -0.74); });
  });
}
function caping(c: C2, p: Pal, F: Fr, fill: string) {
  hd(c, F, (k) => {
    const w = Math.max(0.7, 0.003 * F.u) * k, Ax = -0.06, Ay = -0.4, R = 0.15 / HS, h = 0.075 / HS, e = 0.09;
    c.save(); c.translate(Ax, Ay); c.rotate(-0.06);
    c.fillStyle = fill; c.beginPath(); c.moveTo(-R, 0); c.quadraticCurveTo(-R * 0.5, -h * 0.58, 0, -h); c.quadraticCurveTo(R * 0.5, -h * 0.58, R, 0); c.quadraticCurveTo(R * 0.6, e * 1.1, 0, e); c.quadraticCurveTo(-R * 0.6, e * 1.1, -R, 0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-0.05, -h - 0.06); c.lineTo(0.05, -h - 0.06); c.lineTo(0.07, -h + 0.04); c.lineTo(-0.07, -h + 0.04); c.closePath(); c.fill(); // apex binding
    const sideAt = (f: number, ph: number): P2 => { const rx = Math.cos(ph) * R * f, ry = Math.sin(ph) * e * f; return [rx, -h * (1 - f) + ry * 0.9 - (f < 1 ? 0 : 0)]; };
    sk(c, cv(p, 0.5), w * 0.85, () => { for (let i = 1; i < 14; i++) { const ph = (i / 14) * Math.PI; const q = sideAt(1, ph); c.moveTo(0, -h + 0.02); c.lineTo(q[0], q[1] - 0.01); } });
    sk(c, cv(p, 0.8), w, () => { for (const f of [0.66, 0.82, 0.93]) { for (let i = 0; i <= 20; i++) { const ph = (i / 20) * Math.PI, q = sideAt(f, ph); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } } });
    sk(c, cv(p, 0.65), w, () => { for (let i = 0; i < 26; i++) { const f = i / 25, xx = -R + f * 2 * R, yy = Math.sin(Math.acos(Math.max(-1, Math.min(1, xx / R)))) * e * 0.9; c.moveTo(xx - 0.03, yy - 0.05); c.lineTo(xx + 0.03, yy + 0.03); } }); // rim binding
    c.restore();
    sk(c, cv(p, 0.45), w * 0.8, () => { c.moveTo(-0.3, -0.36); c.quadraticCurveTo(-0.2, 0.2, 0.2, 0.44); }); // chin cord
  });
}

/** a figure of the "kerajaan" procession seen in the fog: Javanese court dress.
 *  kind: "abdi" (man: blangkon, beskap jacket, keris tucked at the back, jarik batik wrap, barefoot),
 *        "putri" (woman: sanggul bun with flowers, kemben, selendang scarf, jarik, carrying a bakul basket on the hip),
 *        "prajurit" (soldier: tall tombak spear, iket headcloth, sash, short jarik over trousers),
 *        "raja" (seated on a dais in the pendopo: tall kuluk crown hat, layered robe, very still), "pedagang" (market seller: caping, pikulan shoulder pole with two baskets).
 *  ghost 0..1 = how wrong it looks: slightly too tall neck, feet that do not quite touch the ground, no breath. */
export type CourtKind = "abdi" | "putri" | "prajurit" | "raja" | "pedagang";
export function courtier(c: C2, p: Pal, kind: CourtKind, x: number, y: number, H: number, fill: string, pose0: SidePose, o: { t: number; ghost?: number; seed?: number }): Joints {
  const u = H, g = clamp01(o.ghost ?? 0), sd = o.seed ?? 0, t = o.t, pose: SidePose = { ...pose0 }, w = Math.max(0.8, 0.003 * u);
  const motif: "parang" | "kawung" = hash(sd * 7.3 + 1) < 0.5 ? "parang" : "kawung";
  if (kind === "raja") pose.idle = pose.idle ? { ...pose.idle, amount: (pose.idle.amount ?? 1) * 0.3 } : undefined;
  if (kind !== "prajurit" && kind !== "raja" && pose.walk !== undefined && pose.stride === undefined) pose.stride = 0.62;
  if (g > 0) {
    const it = pose.idle?.t ?? t, s0 = pose.idle?.seed ?? sd, ph = pose.breath ?? (it * TAU) / 3.6 + s0;
    pose.breath = Math.asin((1 - g) * Math.sin(ph));
    if (pose.idle) pose.idle = { ...pose.idle, amount: (pose.idle.amount ?? 1) * (1 - 0.7 * g) };
    pose.look = (pose.look ?? 0) + g * 0.07 * Math.sin((t - 1.4) * 0.38 + sd * 2.1);
  }
  const yy = y + (pose.sit === undefined ? FOOT_BARE * u : 0) - g * 0.012 * u, lift = g * 0.016 * u;
  const J0 = sideJoints(x, yy, H, pose), L0 = J0.local, F0: Fr = { x, y: yy, J: J0, lift, u };
  const sway = (pose.walk !== undefined ? 0.01 * u * Math.sin(pose.walk * 2 + 0.5) : 0) + (1 - g) * 0.004 * u * Math.sin(t * 0.9 + sd);
  // pre-set reaches for held props
  let spearX = 0;
  if (kind === "prajurit") { const q: P2 = [L0.hip[0] + 0.12 * u, L0.sh[1] + 0.2 * u]; spearX = q[0]; if (!pose.reachF && !pose.armF) pose.reachF = toW(F0, q); if (!pose.gripF) pose.gripF = "fist"; }
  const basketC: P2 = [L0.hip[0] + 0.03 * u, L0.hip[1] - 0.005 * u];
  if (kind === "putri" && !pose.reachB && !pose.armB) { pose.reachB = toW(F0, [basketC[0] + 0.06 * u, basketC[1] - 0.06 * u]); if (!pose.gripB) pose.gripB = "fist"; }
  const S: P2 = [L0.sh[0] - 0.004 * u, L0.sh[1] - 0.03 * u], bounce = pose.walk !== undefined ? Math.sin(pose.walk * 2) : 0.15 * Math.sin(t * 1.1 + sd);
  if (kind === "pedagang" && !pose.reachB && !pose.armB) { pose.reachB = toW(F0, [S[0] + 0.15 * u, S[1] + 0.012 * u]); if (!pose.gripB) pose.gripB = "fist"; }
  // spear behind the far hand
  if (kind === "prajurit") {
    const Jt = sideJoints(x, yy, H, pose), hx = pose.reachF ? (Jt.AF.ha[0] - x) * Jt.d : spearX, butt = pose.walk !== undefined ? -0.03 * u : 0, top = butt - 1.4 * u;
    loc(c, F0, () => {
      c.fillStyle = fill; tube(c, [hx, butt], [hx, top + 0.13 * u], 0.0065 * u, 0.0055 * u);
      c.fillRect(hx - 0.009 * u, butt - 0.03 * u, 0.018 * u, 0.03 * u); // ferrule
      const bt = top + 0.13 * u; c.beginPath(); c.moveTo(hx, top); c.bezierCurveTo(hx + 0.022 * u, top + 0.05 * u, hx + 0.02 * u, bt - 0.03 * u, hx + 0.01 * u, bt - 0.01 * u); c.lineTo(hx - 0.01 * u, bt - 0.01 * u); c.bezierCurveTo(hx - 0.02 * u, bt - 0.03 * u, hx - 0.022 * u, top + 0.05 * u, hx, top); c.closePath(); c.fill(); // leaf blade, mirrored
      c.fillRect(hx - 0.011 * u, bt - 0.012 * u, 0.022 * u, 0.008 * u); c.fillRect(hx - 0.009 * u, bt - 0.002 * u, 0.018 * u, 0.012 * u);
      const ts = (1 - g) * 0.004 * u * Math.sin(t * 0.8 + sd) + sway * 0.4; c.fillStyle = isLit(p) ? "#3a1410" : fill;
      c.beginPath(); c.moveTo(hx - 0.009 * u, bt + 0.012 * u); c.quadraticCurveTo(hx - 0.022 * u + ts, bt + 0.05 * u, hx - 0.012 * u + ts * 1.6, bt + 0.085 * u); c.lineTo(hx + 0.012 * u + ts * 1.6, bt + 0.085 * u); c.quadraticCurveTo(hx + 0.022 * u + ts, bt + 0.05 * u, hx + 0.009 * u, bt + 0.012 * u); c.closePath(); c.fill(); // tassel
      sk(c, cv(p, 0.8), w, () => { seg(c, [hx, top + 0.012 * u], [hx, bt - 0.014 * u]); for (let i = 0; i < 7; i++) { const yq = bt + 0.02 * u + i * 0.009 * u; c.moveTo(hx - 0.008 * u + ts * (i / 7) * 1.5, yq); c.lineTo(hx - 0.004 * u + ts * (i / 7) * 1.5, yq + 0.045 * u); }
        for (const f of [0.25, 0.5, 0.75]) { const yq = butt + (bt - butt) * f; seg(c, [hx - 0.006 * u, yq], [hx + 0.006 * u, yq]); seg(c, [hx - 0.006 * u, yq + 0.006 * u], [hx + 0.006 * u, yq + 0.006 * u]); } seg(c, [hx - 0.011 * u, bt - 0.004 * u], [hx + 0.011 * u, bt - 0.004 * u]); });
    });
  }
  const look: Look = kind === "putri" || kind === "pedagang" ? { thin: true } : kind === "raja" ? { belly: 0.008 } : {};
  const J = figure(c, x, yy, H, fill, look, pose, lift), L = J.local;
  const F: Fr = { x, y: yy, J, lift, u }, hp = L.hip;
  // ---- lower garment
  c.save();
  if (kind === "raja") {
    loc(c, F, () => {
      const kf = L.LF.k[0] > L.LB.k[0] ? L.LF : L.LB, af = Math.max(L.LF.a[0], L.LB.a[0]), ay = Math.max(L.LF.a[1], L.LB.a[1]);
      const robe: P2[] = [[L.sh[0] - 0.05 * u, L.sh[1] - 0.005 * u], [hp[0] - 0.088 * u, hp[1] + 0.0], [hp[0] - 0.07 * u, hp[1] + 0.05 * u], [Math.min(kf.k[0], af) - 0.045 * u, ay - 0.035 * u],
        [Math.max(kf.k[0], af) + 0.045 * u, ay - 0.03 * u], [kf.k[0] + 0.045 * u, kf.k[1] - 0.025 * u], [hp[0] + 0.075 * u, hp[1] - 0.04 * u], [L.sh[0] + 0.07 * u, (L.sh[1] + hp[1]) / 2], [L.sh[0] + 0.05 * u, L.sh[1] + 0.01 * u]];
      c.fillStyle = fill; c.beginPath(); c.moveTo(robe[0][0], robe[0][1]); for (let i = 1; i < robe.length; i++) { const a = robe[i - 1], b = robe[i]; c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } c.closePath(); c.fill();
      batik(c, p, robe.slice(2, 6), u, motif, 0.8);
      sk(c, cv(p, 0.8), w, () => { const hm = ay - 0.034 * u; seg(c, [Math.min(kf.k[0], af) - 0.04 * u, hm], [Math.max(kf.k[0], af) + 0.04 * u, hm + 0.004 * u]); seg(c, [Math.min(kf.k[0], af) - 0.04 * u, hm - 0.012 * u], [Math.max(kf.k[0], af) + 0.04 * u, hm - 0.008 * u]);
        c.moveTo(L.sh[0] + 0.045 * u, L.sh[1] + 0.012 * u); c.quadraticCurveTo(hp[0] + 0.07 * u, hp[1] - 0.12 * u, hp[0] + 0.06 * u, hp[1] - 0.03 * u); c.lineTo(kf.k[0] + 0.03 * u, kf.k[1] - 0.02 * u);
        c.moveTo(hp[0] - 0.084 * u, hp[1] - 0.04 * u); c.lineTo(hp[0] + 0.07 * u, hp[1] - 0.05 * u); c.moveTo(hp[0] - 0.084 * u, hp[1] - 0.025 * u); c.lineTo(hp[0] + 0.072 * u, hp[1] - 0.035 * u); });
      c.fillStyle = cv(p, 0.85); for (let i = 0; i < 9; i++) { const f = i / 8, q = lerp2([L.sh[0] + 0.048 * u, L.sh[1] + 0.02 * u], [hp[0] + 0.064 * u, hp[1] - 0.05 * u], f); c.beginPath(); c.arc(q[0] + Math.sin(f * Math.PI) * 0.012 * u - 0.006 * u, q[1], 0.0026 * u, 0, TAU); c.fill(); }
    });
  } else {
    const hemK = kind === "prajurit" ? 0.47 : kind === "pedagang" ? 0.8 : 1;
    loc(c, F, () => { const jp = jarikPoly(L, u, hemK); c.fillStyle = fill; poly(c, jp); c.fill(); batik(c, p, jp, u, kind === "pedagang" ? "kawung" : motif, kind === "pedagang" ? 0.6 : 1); if (kind !== "pedagang") wiru(c, p, jp, u, fill); else sk(c, cv(p, 0.7), w, () => { c.moveTo(hp[0] - 0.074 * u, hp[1] - 0.03 * u); c.lineTo(hp[0] + 0.062 * u, hp[1] - 0.03 * u); }); });
    if (kind === "prajurit") { loc(c, F, () => { for (const G of [L.LF, L.LB]) { const q0 = lerp2(G.k, G.a, 0.5), q1 = lerp2(G.k, G.a, 0.58), n = unit(G.k, G.a), nn: P2 = [-n[1], n[0]]; c.fillStyle = fill; tube(c, q0, q1, 0.026 * u, 0.026 * u); if (G === L.LB) sk(c, cv(p, 0.8), w, () => { seg(c, add(q1, nn, 0.026 * u), add(q1, nn, -0.026 * u)); seg(c, add(q0, nn, 0.026 * u), add(q0, nn, -0.026 * u)); }); } }); }
  }
  // ---- torso garments + sash
  tor(c, F, () => {
    const sash = (y0: number) => { c.fillStyle = fill; poly(c, [[-0.07 * u, y0], [0.066 * u, y0 - 0.004 * u], [0.068 * u, y0 + 0.028 * u], [-0.072 * u, y0 + 0.03 * u]]); c.fill(); sk(c, cv(p, 0.8), w, () => { seg(c, [-0.07 * u, y0], [0.066 * u, y0 - 0.004 * u]); seg(c, [-0.072 * u, y0 + 0.03 * u], [0.068 * u, y0 + 0.028 * u]); for (let i = 0; i < 10; i++) { const xq = -0.065 * u + i * 0.014 * u; seg(c, [xq, y0 + 0.006 * u], [xq + 0.006 * u, y0 + 0.024 * u]); } }); };
    if (kind === "abdi") {
      sash(0.225 * u);
      sk(c, cv(p, 0.85), w, () => { c.moveTo(0.032 * u, -0.028 * u); c.quadraticCurveTo(0.07 * u, 0.06 * u, 0.06 * u, 0.215 * u); c.moveTo(0.064 * u, 0.215 * u); c.quadraticCurveTo(0.0, 0.2 * u, -0.068 * u, 0.17 * u); // beskap front + cut-away back hem
        c.moveTo(-0.03 * u, -0.036 * u); c.quadraticCurveTo(0.005 * u, -0.05 * u, 0.04 * u, -0.034 * u); c.moveTo(-0.032 * u, -0.026 * u); c.quadraticCurveTo(0.005 * u, -0.04 * u, 0.042 * u, -0.024 * u); }); // stand collar
      c.fillStyle = cv(p, 1); for (let i = 0; i < 6; i++) { const f = i / 5, xq = 0.034 * u + 0.03 * u * Math.sin(f * 1.4) - 0.006 * u, yq = -0.01 * u + f * 0.2 * u; c.beginPath(); c.arc(xq + 0.003 * u, yq, 0.0034 * u, 0, TAU); c.fill(); }
      sk(c, cv(p, 0.4), w, () => { c.moveTo(-0.04 * u, 0.05 * u); c.quadraticCurveTo(0.0, 0.1 * u, 0.0, 0.16 * u); c.moveTo(0.02 * u, 0.08 * u); c.quadraticCurveTo(0.03 * u, 0.12 * u, 0.03 * u, 0.19 * u); });
    } else if (kind === "putri") {
      sk(c, cv(p, 0.85), w, () => { c.moveTo(-0.047 * u, 0.062 * u); for (let i = 0; i <= 8; i++) c.lineTo(-0.047 * u + i * 0.0145 * u, 0.06 * u - (i % 2) * 0.004 * u - i * 0.0005 * u); });
      sk(c, cv(p, 0.45), w, () => { for (let i = 1; i < 9; i++) { const yq = 0.06 * u + i * 0.019 * u; c.moveTo(-0.05 * u - i * 0.0012 * u, yq); c.quadraticCurveTo(0.0, yq + 0.006 * u, 0.064 * u, yq - 0.002 * u); } // kemben wrap bands
        c.moveTo(-0.01 * u, -0.03 * u); c.quadraticCurveTo(0.03 * u, 0.01 * u, 0.055 * u, 0.0); }); // necklace
      c.fillStyle = cv(p, 0.9); c.beginPath(); c.arc(0.048 * u, 0.004 * u, 0.0035 * u, 0, TAU); c.fill();
      sash(0.215 * u);
    } else if (kind === "prajurit") {
      sash(0.22 * u);
      c.fillStyle = fill; sk(c, cv(p, 0.75), w * 1.2, () => { c.moveTo(-0.03 * u, -0.03 * u); c.quadraticCurveTo(0.02 * u, 0.08 * u, 0.06 * u, 0.2 * u); c.moveTo(-0.04 * u, -0.022 * u); c.quadraticCurveTo(0.008 * u, 0.09 * u, 0.048 * u, 0.205 * u); }); // diagonal sabuk across the chest
      sk(c, fill, 0.008 * u, () => { c.moveTo(0.06 * u, 0.24 * u); c.quadraticCurveTo(0.07 * u, 0.3 * u, 0.066 * u + sway, 0.34 * u); c.moveTo(-0.07 * u, 0.24 * u); c.quadraticCurveTo(-0.082 * u, 0.29 * u, -0.078 * u + sway, 0.33 * u); }); // sampur ends
      sk(c, cv(p, 0.7), w, () => { for (const sx of [0.066, -0.078]) for (let i = 0; i < 4; i++) { const xq = sx * u + sway + (i - 1.5) * 0.003 * u; seg(c, [xq, 0.335 * u], [xq + (i - 1.5) * 0.002 * u, 0.355 * u]); } });
    } else if (kind === "raja") {
      sk(c, cv(p, 0.8), w * 1.1, () => { for (const r of [0.0, 0.016, 0.03]) { c.moveTo(-0.03 * u, -0.03 * u + r * 0.3 * u); c.quadraticCurveTo(0.03 * u, 0.04 * u + r * u, 0.06 * u, 0.0 + r * 0.6 * u); } }); // kalung chains
      c.fillStyle = cv(p, 0.95); c.beginPath(); c.moveTo(0.04 * u, 0.06 * u); c.lineTo(0.048 * u, 0.072 * u); c.lineTo(0.04 * u, 0.084 * u); c.lineTo(0.032 * u, 0.072 * u); c.closePath(); c.fill();
    } else if (kind === "pedagang") {
      sk(c, cv(p, 0.75), w, () => { c.moveTo(-0.01 * u, -0.034 * u); c.quadraticCurveTo(0.03 * u, -0.006 * u, 0.05 * u, -0.026 * u); c.moveTo(-0.068 * u, 0.25 * u); c.lineTo(0.064 * u, 0.252 * u); });
      sk(c, cv(p, 0.4), w, () => { c.moveTo(-0.03 * u, 0.1 * u); c.quadraticCurveTo(0.0, 0.14 * u, 0.0, 0.2 * u); c.ellipse(0.02 * u, 0.12 * u, 0.006 * u, 0.004 * u, 0.4, 0, TAU); });
    }
  });
  if (kind === "abdi") { // keris tucked at the back of the waist
    const P = torPt(F, [-0.075 * u, 0.215 * u]);
    loc(c, F, () => {
      c.save(); c.translate(P[0], P[1]); c.rotate(-0.35); c.fillStyle = fill;
      c.beginPath(); c.moveTo(0.012 * u, 0.004 * u); c.quadraticCurveTo(-0.02 * u, 0.014 * u, -0.06 * u, 0.0); c.quadraticCurveTo(-0.075 * u, -0.012 * u, -0.068 * u, -0.022 * u); c.quadraticCurveTo(-0.04 * u, -0.006 * u, 0.012 * u, -0.01 * u); c.closePath(); c.fill(); // warangka
      c.beginPath(); c.moveTo(-0.014 * u, -0.008 * u); c.quadraticCurveTo(-0.022 * u, -0.03 * u, -0.012 * u, -0.046 * u); c.quadraticCurveTo(0.0, -0.05 * u, -0.004 * u, -0.036 * u); c.quadraticCurveTo(0.006 * u, -0.02 * u, -0.002 * u, -0.008 * u); c.closePath(); c.fill(); // hulu handle
      tube(c, [-0.01 * u, 0.006 * u], [0.012 * u, 0.06 * u], 0.007 * u, 0.005 * u); // gandar sheath
      sk(c, cv(p, 0.8), w, () => { c.moveTo(0.006 * u, -0.002 * u); c.quadraticCurveTo(-0.03 * u, 0.004 * u, -0.062 * u, -0.012 * u); seg(c, [-0.016 * u, -0.01 * u], [-0.002 * u, -0.011 * u]); c.moveTo(-0.014 * u, -0.022 * u); c.quadraticCurveTo(-0.006 * u, -0.03 * u, -0.01 * u, -0.04 * u); });
      c.restore();
    });
  }
  // ---- carried props (in front of the body)
  if (kind === "putri") loc(c, F, () => { // bakul basket on the near hip
    const bc = basketC, bw = 0.078 * u, bh = 0.1 * u, top = bc[1] - bh * 0.55; c.fillStyle = fill;
    const bk: P2[] = [[bc[0] - bw, top], [bc[0] + bw, top], [bc[0] + bw * 0.72, top + bh], [bc[0] - bw * 0.72, top + bh]];
    c.beginPath(); c.moveTo(bk[0][0], bk[0][1]); c.lineTo(bk[1][0], bk[1][1]); c.quadraticCurveTo(bc[0] + bw * 0.95, top + bh * 0.7, bk[2][0], bk[2][1]); c.lineTo(bk[3][0], bk[3][1]); c.quadraticCurveTo(bc[0] - bw * 0.95, top + bh * 0.7, bk[0][0], bk[0][1]); c.fill();
    c.beginPath(); c.ellipse(bc[0], top, bw * 1.02, 0.012 * u, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(bc[0] - 0.01 * u, top - 0.012 * u, bw * 0.7, 0.02 * u, 0, Math.PI, 0); c.fill(); // cloth bundle inside
    c.save(); poly(c, bk); c.clip(); sk(c, cv(p, 0.5), w * 0.8, () => { for (let i = -8; i < 10; i++) { const xq = bc[0] + i * 0.014 * u; seg(c, [xq, top], [xq + bh, top + bh]); seg(c, [xq + bh, top], [xq, top + bh]); } }); c.restore();
    sk(c, cv(p, 0.85), w, () => { c.ellipse(bc[0], top, bw * 1.02, 0.012 * u, 0, 0, TAU); seg(c, [bk[3][0], bk[3][1] - 0.008 * u], [bk[2][0], bk[2][1] - 0.008 * u]); c.moveTo(bc[0] - bw * 0.6, top - 0.014 * u); c.quadraticCurveTo(bc[0], top - 0.03 * u, bc[0] + bw * 0.5, top - 0.012 * u); });
  });
  if (kind === "pedagang") loc(c, F, () => { // pikulan: bamboo pole on the near shoulder, two baskets on ropes
    const half = 0.4 * u, bow = 0.018 * u * (1 + 0.25 * bounce), tilt = -0.04, ca = Math.cos(tilt), sa = Math.sin(tilt);
    const P = (s: number): P2 => [S[0] + ca * s - sa * 0, S[1] + sa * s + bow * (s / half) * (s / half)];
    c.fillStyle = fill; sk(c, fill, 0.012 * u, () => { c.moveTo(P(-half)[0], P(-half)[1]); c.quadraticCurveTo(S[0], S[1] - bow, P(half)[0], P(half)[1]); });
    sk(c, cv(p, 0.75), w, () => { c.moveTo(P(-half)[0], P(-half)[1] - 0.002 * u); c.quadraticCurveTo(S[0], S[1] - bow - 0.002 * u, P(half)[0], P(half)[1] - 0.002 * u); for (const s of [-0.3, -0.12, 0.12, 0.3]) { const q = P(s * u); seg(c, [q[0], q[1] - 0.006 * u], [q[0], q[1] + 0.006 * u]); } });
    for (const sgn of [-1, 1]) {
      const e = P(sgn * (half - 0.02 * u)), sw = (pose.walk !== undefined ? 0.07 * Math.sin(pose.walk + sgn) : 0.02 * Math.sin(t * 0.8 + sgn + sd)) * (1 - g * 0.8), rl = 0.37 * u;
      c.save(); c.translate(e[0], e[1]); c.rotate(-sw); const bw = 0.088 * u, bh = 0.075 * u;
      sk(c, fill, 0.003 * u, () => { c.moveTo(0, 0); c.lineTo(-bw * 0.92, rl); c.moveTo(0, 0); c.lineTo(bw * 0.92, rl); c.moveTo(0, 0); c.lineTo(-bw * 0.2, rl); });
      c.fillStyle = fill; // goods heaped above the rim
      for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-bw * 0.7 + i * bw * 0.28, rl - 0.012 * u - hash(i + sgn * 3 + sd) * 0.012 * u, 0.02 * u, 0, TAU); c.fill(); }
      c.beginPath(); c.moveTo(-bw * 0.3, rl - 0.02 * u); c.quadraticCurveTo(0.0, rl - 0.075 * u, bw * 0.35, rl - 0.03 * u); c.lineTo(bw * 0.2, rl - 0.01 * u); c.closePath(); c.fill(); // leafy bundle
      c.beginPath(); c.moveTo(-bw, rl); c.lineTo(bw, rl); c.quadraticCurveTo(bw * 0.95, rl + bh, bw * 0.55, rl + bh); c.lineTo(-bw * 0.55, rl + bh); c.quadraticCurveTo(-bw * 0.95, rl + bh, -bw, rl); c.fill();
      c.save(); c.beginPath(); c.moveTo(-bw, rl); c.lineTo(bw, rl); c.lineTo(bw * 0.55, rl + bh); c.lineTo(-bw * 0.55, rl + bh); c.closePath(); c.clip();
      sk(c, cv(p, 0.5), w * 0.8, () => { for (let i = -8; i < 10; i++) { const xq = i * 0.014 * u; seg(c, [xq, rl], [xq + bh, rl + bh]); seg(c, [xq + bh, rl], [xq, rl + bh]); } }); c.restore();
      sk(c, cv(p, 0.85), w, () => { c.ellipse(0, rl, bw, 0.008 * u, 0, 0, TAU); for (let i = 0; i < 6; i++) { const xq = -bw * 0.7 + i * bw * 0.28; c.moveTo(xq + 0.008 * u, rl - 0.03 * u - hash(i + sgn * 3 + sd) * 0.012 * u); c.arc(xq, rl - 0.012 * u - hash(i + sgn * 3 + sd) * 0.012 * u, 0.012 * u, -0.6, 0.2); } c.moveTo(-bw * 0.2, rl - 0.03 * u); c.quadraticCurveTo(0.02 * u, rl - 0.06 * u, bw * 0.3, rl - 0.03 * u); });
      c.restore();
    }
  });
  if (kind === "putri") loc(c, F, () => { // selendang over the near shoulder, tassels at both ends
    const sw2 = sway * 1.4, fe: P2 = [L.sh[0] + 0.07 * u + sw2, hp[1] + 0.12 * u], be: P2 = [L.sh[0] - 0.085 * u + sw2 * 0.8, hp[1] + 0.07 * u], wd = 0.017 * u;
    c.fillStyle = fill;
    c.beginPath(); c.moveTo(L.sh[0] - 0.035 * u, L.sh[1] - 0.03 * u); c.quadraticCurveTo(L.sh[0] + 0.02 * u, L.sh[1] - 0.045 * u, L.sh[0] + 0.05 * u, L.sh[1] - 0.005 * u); c.quadraticCurveTo(L.sh[0] + 0.07 * u, hp[1] - 0.12 * u, fe[0] + wd, fe[1]); c.lineTo(fe[0] - wd, fe[1] + 0.004 * u);
    c.quadraticCurveTo(L.sh[0] + 0.045 * u, hp[1] - 0.12 * u, L.sh[0] + 0.025 * u, L.sh[1] + 0.01 * u); c.quadraticCurveTo(L.sh[0] - 0.02 * u, L.sh[1] - 0.02 * u, L.sh[0] - 0.05 * u, L.sh[1] + 0.02 * u); c.quadraticCurveTo(L.sh[0] - 0.08 * u, hp[1] - 0.12 * u, be[0] - wd, be[1]); c.lineTo(be[0] + wd, be[1] + 0.004 * u); c.quadraticCurveTo(L.sh[0] - 0.05 * u, hp[1] - 0.14 * u, L.sh[0] - 0.035 * u, L.sh[1] - 0.03 * u); c.closePath(); c.fill();
    sk(c, cv(p, 0.75), w, () => { c.moveTo(L.sh[0] + 0.035 * u, L.sh[1] - 0.012 * u); c.quadraticCurveTo(L.sh[0] + 0.058 * u, hp[1] - 0.12 * u, fe[0], fe[1] - 0.004 * u); c.moveTo(L.sh[0] - 0.044 * u, L.sh[1] + 0.0); c.quadraticCurveTo(L.sh[0] - 0.068 * u, hp[1] - 0.13 * u, be[0], be[1] - 0.004 * u); seg(c, [fe[0] - wd, fe[1] - 0.01 * u], [fe[0] + wd, fe[1] - 0.012 * u]); seg(c, [be[0] - wd, be[1] - 0.01 * u], [be[0] + wd, be[1] - 0.012 * u]); });
    sk(c, fill, Math.max(0.8, 0.0025 * u), () => { for (const [e, d2] of [[fe, 1], [be, 0.8]] as [P2, number][]) for (let i = 0; i < 6; i++) { const xq = e[0] - wd * 0.9 + i * wd * 0.36; c.moveTo(xq, e[1]); c.lineTo(xq + sway * 0.6 * d2 + (i - 2.5) * 0.001 * u, e[1] + 0.024 * u); } });
  });
  c.restore();
  // ---- arms, head gear
  if (kind !== "raja") nearArm(c, p, F, fill, kind === "putri" || kind === "pedagang" ? 0.88 : 1, kind === "abdi" ? "long" : kind === "prajurit" ? "band" : kind === "pedagang" ? "kaos" : "bare");
  else nearArm(c, p, F, fill, 1, "long");
  if (kind === "abdi" || kind === "prajurit") blangkon(c, p, F, fill, kind === "prajurit");
  else if (kind === "pedagang") caping(c, p, F, fill);
  else if (kind === "putri") hd(c, F, (k) => {
    const wq = Math.max(0.7, 0.003 * u) * k; c.fillStyle = fill;
    c.beginPath(); c.moveTo(0.42, -0.36); c.bezierCurveTo(0.34, -0.74, -0.22, -0.8, -0.52, -0.52); c.bezierCurveTo(-0.66, -0.36, -0.66, -0.06, -0.52, 0.16); c.lineTo(-0.36, 0.12); c.quadraticCurveTo(-0.1, -0.28, 0.42, -0.36); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(-0.74, -0.08, 0.24, 0.2, -0.2, 0, TAU); c.fill(); // sanggul
    sk(c, cv(p, 0.5), wq * 0.85, () => { for (let i = 0; i < 6; i++) { const f = i / 5; c.moveTo(0.38 - f * 0.08, -0.4 + f * 0.02); c.bezierCurveTo(0.2 - f * 0.1, -0.7 + f * 0.08, -0.3, -0.66 + f * 0.1, -0.56, -0.2 + f * 0.04); } });
    sk(c, cv(p, 0.75), wq, () => { c.ellipse(-0.74, -0.08, 0.15, 0.12, -0.2, 0, TAU); c.moveTo(-0.86, -0.02); c.quadraticCurveTo(-0.74, -0.2, -0.6, -0.16); });
    c.fillStyle = cv(p, 1.1); // melati flowers on the bun + ronce string draping down the nape
    for (const [fx, fy] of [[-0.86, -0.2], [-0.66, -0.26], [-0.94, 0.0]] as P2[]) for (let q = 0; q < 5; q++) { const an = (q / 5) * TAU + sd; c.beginPath(); c.ellipse(fx + Math.cos(an) * 0.04, fy + Math.sin(an) * 0.04, 0.035, 0.02, an, 0, TAU); c.fill(); }
    const rs = (1 - g) * 0.03 * Math.sin(t * 0.9 + sd) + sway / (HS * u) * 0.5; for (let q = 0; q < 9; q++) { const f = q / 8; c.beginPath(); c.arc(-0.72 + f * 0.18 + rs * f * f, 0.1 + f * 0.9, 0.035, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(0.0, 0.16, 0.035, 0, TAU); c.fill(); // earring
  });
  else if (kind === "raja") hd(c, F, (k) => { // kuluk crown hat + sumping ear ornament
    const wq = Math.max(0.7, 0.003 * u) * k; c.fillStyle = fill;
    c.beginPath(); c.moveTo(0.42, -0.34); c.lineTo(0.4, -1.12); c.quadraticCurveTo(-0.08, -1.24, -0.54, -1.14); c.lineTo(-0.58, -0.4); c.quadraticCurveTo(-0.08, -0.5, 0.42, -0.34); c.closePath(); c.fill();
    sk(c, cv(p, 0.85), wq, () => { c.moveTo(0.42, -0.44); c.quadraticCurveTo(-0.08, -0.58, -0.58, -0.5); c.moveTo(0.42, -0.56); c.quadraticCurveTo(-0.08, -0.7, -0.57, -0.62); c.moveTo(0.4, -1.1); c.quadraticCurveTo(-0.08, -1.2, -0.54, -1.12); });
    sk(c, cv(p, 0.45), wq * 0.85, () => { for (let i = 0; i < 9; i++) { const f = i / 8, xq = 0.38 - f * 0.92; c.moveTo(xq, -0.62 - Math.sin(f * Math.PI) * 0.06); c.lineTo(xq + 0.01, -1.08 - Math.sin(f * Math.PI) * 0.08); } });
    c.fillStyle = cv(p, 1); for (let i = 0; i < 8; i++) { const f = i / 7; c.beginPath(); c.arc(0.4 - f * 0.96, -0.5 - Math.sin(f * Math.PI) * 0.07, 0.022, 0, TAU); c.fill(); }
    c.beginPath(); c.moveTo(0.44, -0.62); c.lineTo(0.5, -0.5); c.lineTo(0.44, -0.4); c.lineTo(0.38, -0.5); c.closePath(); c.fill();
    c.fillStyle = fill; c.beginPath(); c.moveTo(-0.08, -0.06); c.quadraticCurveTo(-0.34, -0.22, -0.5, -0.5); c.quadraticCurveTo(-0.24, -0.34, -0.02, -0.12); c.closePath(); c.fill();
    sk(c, cv(p, 0.7), wq, () => { c.moveTo(-0.1, -0.1); c.quadraticCurveTo(-0.3, -0.22, -0.44, -0.44); });
  });
  face(c, p, F, { shut: kind === "raja" ? 0.5 : 0 });
  return J;
}

// ---------------------------------------------------------------- farmer
/** cangkul: wooden handle from `a` (blade end) to `b`, iron blade at `a` pointing along `bd` (local space) */
function cangkul(c: C2, p: Pal, u: number, a: P2, b: P2, bd: P2, fill: string) {
  const w = Math.max(0.8, 0.003 * u), ax = unit(a, b), n: P2 = [-ax[1], ax[0]];
  c.fillStyle = fill; tube(c, a, b, 0.0105 * u, 0.0095 * u);
  sk(c, cv(p, 0.55), w * 0.8, () => { seg(c, add(add(a, ax, 0.04 * u), n, 0.004 * u), add(add(b, ax, -0.03 * u), n, 0.004 * u)); seg(c, add(add(a, ax, 0.12 * u), n, -0.003 * u), add(add(a, ax, 0.32 * u), n, -0.004 * u)); });
  const bn: P2 = [-bd[1], bd[0]], s0 = add(a, ax, -0.004 * u);
  tube(c, add(s0, ax, -0.012 * u), add(s0, ax, 0.02 * u), 0.016 * u, 0.014 * u); // socket (bawak)
  const e0 = add(s0, bd, 0.012 * u), e1 = add(s0, bd, 0.15 * u);
  const blade: P2[] = [add(e0, bn, 0.016 * u), add(e1, bn, 0.03 * u), add(add(e1, bd, 0.006 * u), bn, 0.0), add(e1, bn, -0.03 * u), add(e0, bn, -0.016 * u)];
  poly(c, blade); c.fill();
  sk(c, cv(p, 0.85), w, () => { seg(c, add(add(e1, bd, -0.012 * u), bn, 0.028 * u), add(add(e1, bd, -0.012 * u), bn, -0.028 * u)); seg(c, add(e0, bn, 0.0), add(add(e1, bd, -0.02 * u), bn, 0.0)); seg(c, add(add(s0, ax, -0.01 * u), n, 0.015 * u), add(add(s0, ax, -0.01 * u), n, -0.015 * u)); });
  c.fillStyle = isLit(p) ? "rgba(150,118,80,0.6)" : "rgba(60,70,90,0.35)"; for (let i = 0; i < 7; i++) { const q = add(add(e0, bd, (0.04 + 0.1 * hash(i * 2.3)) * u), bn, (hash(i * 5.1) - 0.5) * 0.04 * u); c.beginPath(); c.arc(q[0], q[1], (0.002 + 0.003 * hash(i)) * u, 0, TAU); c.fill(); }
}
/** the farmer who found him: caping (conical bamboo hat), worn kaos + sarung tied at the waist / rolled trousers, bare feet with mud,
 *  cangkul (hoe) over the shoulder or in the hands (tool: "cangkul" | "none"), small towel around the neck. */
export function farmer(c: C2, p: Pal, x: number, y: number, H: number, fill: string, pose0: SidePose, o: { t: number; tool?: "cangkul" | "none"; seed?: number }): Joints {
  const u = H, sd = o.seed ?? 0, t = o.t, pose: SidePose = { ...pose0 }, w = Math.max(0.8, 0.003 * u), sarung = hash(sd * 5.7 + 2) < 0.4;
  const tool = o.tool ?? "none", hands = tool === "cangkul" && !!pose.reachF && !!pose.reachB;
  if (pose.sit === undefined) y += FOOT_BARE * u;
  const J0 = sideJoints(x, y, H, pose), F0: Fr = { x, y, J: J0, lift: 0, u }, L0 = J0.local;
  const S: P2 = [L0.sh[0] - 0.006 * u, L0.sh[1] - 0.028 * u];
  if (tool === "cangkul" && !hands && !pose.reachB && !pose.armB) { pose.reachB = toW(F0, [L0.sh[0] + 0.17 * u, L0.sh[1] + 0.02 * u]); if (!pose.gripB) pose.gripB = "fist"; }
  if (hands) { if (!pose.gripF) pose.gripF = "fist"; if (!pose.gripB) pose.gripB = "fist"; }
  const J = sideFigure(c, x, y, H, fill, { thin: true }, pose), L = J.local, F: Fr = { x, y, J, lift: 0, u };
  // legs: far foot mud, near leg redraw with rolled trousers or sarung
  loc(c, F, () => bareFoot(c, p, u, L.LF.a, L.LF.ft, 0.7));
  if (!sarung) nearLeg(c, p, F, fill, 0.88, 1.08, "rolled"); else nearLeg(c, p, F, fill, 0.88, 1, "none");
  loc(c, F, () => bareFoot(c, p, u, L.LB.a, L.LB.ft, 1));
  c.save();
  if (sarung) loc(c, F, () => { const jp = jarikPoly(L, u, 0.5); c.fillStyle = fill; poly(c, jp); c.fill();
    c.save(); poly(c, jp); c.clip(); sk(c, cv(p, 0.4), w * 0.8, () => { for (let i = -10; i < 10; i++) { seg(c, [L.hip[0] + i * 0.022 * u, L.hip[1] - 0.06 * u], [L.hip[0] + i * 0.022 * u, L.hip[1] + 0.3 * u]); seg(c, [L.hip[0] - 0.2 * u, L.hip[1] + i * 0.022 * u], [L.hip[0] + 0.2 * u, L.hip[1] + i * 0.022 * u]); } }); c.restore();
    c.fillStyle = fill; c.beginPath(); c.ellipse(L.hip[0] + 0.06 * u, L.hip[1] - 0.02 * u, 0.016 * u, 0.012 * u, 0, 0, TAU); c.fill(); // waist knot
    sk(c, cv(p, 0.8), w, () => { seg(c, [L.hip[0] - 0.072 * u, L.hip[1] - 0.02 * u], [L.hip[0] + 0.06 * u, L.hip[1] - 0.025 * u]); c.ellipse(L.hip[0] + 0.06 * u, L.hip[1] - 0.02 * u, 0.01 * u, 0.007 * u, 0, 0, TAU); }); });
  tor(c, F, () => { // worn kaos: stretched neckline, hem, holes, wrinkles
    sk(c, cv(p, 0.8), w, () => { c.moveTo(-0.012 * u, -0.036 * u); c.quadraticCurveTo(0.02 * u, 0.0, 0.05 * u, -0.012 * u); c.moveTo(-0.064 * u, 0.29 * u); c.lineTo(0.058 * u, 0.29 * u); });
    sk(c, cv(p, 0.6), w, () => { c.ellipse(0.02 * u, 0.13 * u, 0.006 * u, 0.004 * u, 0.3, 0, TAU); c.moveTo(-0.044 * u, 0.2 * u); c.ellipse(-0.048 * u, 0.2 * u, 0.004 * u, 0.006 * u, 0, 0, TAU); });
    sk(c, cv(p, 0.38), w, () => { c.moveTo(-0.03 * u, 0.06 * u); c.quadraticCurveTo(0.0, 0.1 * u, 0.01 * u, 0.17 * u); c.moveTo(0.03 * u, 0.18 * u); c.quadraticCurveTo(0.04 * u, 0.22 * u, 0.03 * u, 0.27 * u); });
  });
  loc(c, F, () => { // small towel around the neck, one end hanging on the chest
    const sw = 0.004 * u * Math.sin(t * 1.1 + sd) + (pose.walk !== undefined ? 0.006 * u * Math.sin(pose.walk * 2) : 0), e: P2 = torPt(F, [0.05 * u + sw, 0.1 * u]);
    c.fillStyle = fill; c.beginPath(); c.moveTo(L.neck[0] - 0.034 * u, L.neck[1] + 0.004 * u); c.quadraticCurveTo(L.sh[0] + 0.02 * u, L.sh[1] - 0.05 * u, L.sh[0] + 0.05 * u, L.sh[1] - 0.012 * u);
    c.lineTo(e[0] + 0.012 * u, e[1]); c.lineTo(e[0] - 0.014 * u, e[1] + 0.003 * u); c.lineTo(L.sh[0] + 0.024 * u, L.sh[1] + 0.0); c.quadraticCurveTo(L.sh[0] - 0.01 * u, L.sh[1] - 0.026 * u, L.sh[0] - 0.05 * u, L.sh[1] - 0.006 * u); c.closePath(); c.fill();
    sk(c, cv(p, 0.75), w, () => { c.moveTo(L.neck[0] - 0.03 * u, L.neck[1] + 0.012 * u); c.quadraticCurveTo(L.sh[0] + 0.012 * u, L.sh[1] - 0.04 * u, L.sh[0] + 0.04 * u, L.sh[1] - 0.006 * u); seg(c, [e[0] - 0.012 * u, e[1] - 0.012 * u], [e[0] + 0.011 * u, e[1] - 0.014 * u]); seg(c, [e[0] - 0.013 * u, e[1] - 0.018 * u], [e[0] + 0.011 * u, e[1] - 0.02 * u]); });
    sk(c, fill, Math.max(0.8, 0.0022 * u), () => { for (let i = 0; i < 6; i++) { const xq = e[0] - 0.012 * u + i * 0.0048 * u; c.moveTo(xq, e[1]); c.lineTo(xq + sw * 0.5, e[1] + 0.012 * u); } });
  });
  c.restore();
  // cangkul
  if (tool === "cangkul") loc(c, F, () => {
    if (hands) {
      const rB: P2 = [(pose.reachB![0] - x) * J.d, pose.reachB![1] - y], rF: P2 = [(pose.reachF![0] - x) * J.d, pose.reachF![1] - y];
      const up = rB[1] < rF[1] ? L.AB.ha : L.AF.ha, lo = up === L.AB.ha ? L.AF.ha : L.AB.ha, v = rB[1] < rF[1] ? unit(rB, rF) : unit(rF, rB), a = add(lo, v, 0.2 * u), b = add(a, v, -0.62 * u);
      void up;
      const c1: P2 = [Math.cos(2.0) * v[0] - Math.sin(2.0) * v[1], Math.sin(2.0) * v[0] + Math.cos(2.0) * v[1]], c2: P2 = [Math.cos(-2.0) * v[0] - Math.sin(-2.0) * v[1], Math.sin(-2.0) * v[0] + Math.cos(-2.0) * v[1]];
      cangkul(c, p, u, a, b, c1[0] < c2[0] ? c1 : c2, fill);
    } else {
      const hnd = L.AB.ha, v = unit(hnd, S), front = add(hnd, v, -0.05 * u), back = add(front, v, 0.62 * u);
      const c1: P2 = [-v[1], v[0]], c2: P2 = [v[1], -v[0]], bd = c1[1] > c2[1] ? c1 : c2;
      cangkul(c, p, u, back, front, [bd[0] * 0.9 - v[0] * 0.3, bd[1] * 0.9 - v[1] * 0.3], fill);
    }
  });
  nearArm(c, p, F, fill, 0.88, "kaos");
  caping(c, p, F, fill);
  face(c, p, F);
  return J;
}

// ---------------------------------------------------------------- offering hand
/** a long pale offering hand (the "alam lain" host) entering from frame edge, holding a tray (tampah) of food.
 *  (x,y) = wrist; ang = forearm direction (rad from +x); s = hand length px; items drawn ON the tray: nasi tumpeng, ingkung chicken,
 *  jajan pasar, kembang setaman petals, a glass of tea with steam; rings + long nails; fingers settle slowly. */
export function offeringHand(c: C2, p: Pal, x: number, y: number, ang: number, s: number, t: number, o: { tray?: boolean; steam?: number } = {}): void {
  const LT = isLit(p), skin = LT ? "#e8dfcc" : "#171d2b", line = LT ? "rgba(22,14,10,0.9)" : "rgba(96,116,152,0.3)", lw = Math.max(1, s * 0.016);
  const nail = LT ? "#d9cba6" : "#1f2636", sleeve = LT ? "#140d09" : "#05070d", flip = Math.cos(ang) < 0 ? -1 : 1;
  const settleC = 0.22 * (1 - sm(0, 4.5, t)) + 0.02 * Math.sin(t * 0.55);
  const outline = (f: () => void, fillCol: string) => { c.beginPath(); f(); c.fillStyle = fillCol; c.fill(); c.strokeStyle = line; c.lineWidth = lw; c.lineJoin = "round"; c.stroke(); };
  // one jointed finger in the current frame: base, direction angle, lengths, curls, width
  const finger = (b: P2, a0: number, ls: number[], curls: number[], wd: number, ring = false) => {
    let q = b, a = a0; const pts: P2[] = [b];
    ls.forEach((l, i) => { a += curls[i]; q = [q[0] + Math.cos(a) * l, q[1] + Math.sin(a) * l]; pts.push(q); });
    for (let i = 0; i < ls.length; i++) { const w0 = wd * (1 - i * 0.14), w1 = wd * (1 - (i + 1) * 0.14); c.fillStyle = skin; tube(c, pts[i], pts[i + 1], w0, w1); }
    { // one continuous outline per side (joint normals averaged) so the finger reads as flesh, not bones
      const nrm = (i: number): P2 => { const a = unit(pts[Math.max(0, i - 1)], pts[Math.min(pts.length - 1, Math.max(1, i))]), b = unit(pts[Math.min(i, pts.length - 2)], pts[Math.min(i + 1, pts.length - 1)]); const m = unit([0, 0], [a[0] + b[0], a[1] + b[1]]); return [-m[1], m[0]]; };
      c.beginPath(); for (const sg of [1, -1]) { for (let i = 1; i < pts.length; i++) { const q = add(pts[i], nrm(i), sg * wd * (1 - i * 0.14)); i === 1 ? c.moveTo(add(pts[0], nrm(0), sg * wd)[0], add(pts[0], nrm(0), sg * wd)[1]) : 0; c.lineTo(q[0], q[1]); } }
      c.strokeStyle = line; c.lineWidth = lw; c.stroke();
    }
    c.beginPath(); for (let i = 1; i < ls.length; i++) { const dd = unit(pts[i - 1], pts[i]), n: P2 = [-dd[1], dd[0]], wq = wd * (1 - i * 0.14); c.moveTo(pts[i][0] + n[0] * wq * 0.7, pts[i][1] + n[1] * wq * 0.7); c.quadraticCurveTo(pts[i][0] - dd[0] * wq * 0.3, pts[i][1] - dd[1] * wq * 0.3, pts[i][0] - n[0] * wq * 0.2, pts[i][1] - n[1] * wq * 0.2); }
    c.lineWidth = lw * 0.7; c.stroke(); // knuckle creases
    const tp = pts[pts.length - 1], dd = unit(pts[pts.length - 2], tp), n: P2 = [-dd[1], dd[0]], nw = wd * 0.5;
    outline(() => { c.moveTo(tp[0] - dd[0] * wd * 0.6 + n[0] * nw, tp[1] - dd[1] * wd * 0.6 + n[1] * nw); c.quadraticCurveTo(tp[0] + dd[0] * s * 0.06 + n[0] * nw, tp[1] + dd[1] * s * 0.06 + n[1] * nw, tp[0] + dd[0] * s * 0.11 - n[0] * nw * 0.2, tp[1] + dd[1] * s * 0.11 - n[1] * nw * 0.2); c.quadraticCurveTo(tp[0] + dd[0] * s * 0.03 - n[0] * nw, tp[1] + dd[1] * s * 0.03 - n[1] * nw, tp[0] - dd[0] * wd * 0.6 - n[0] * nw, tp[1] - dd[1] * wd * 0.6 - n[1] * nw); c.closePath(); }, nail);
    if (ring) { const rq = lerp2(pts[0], pts[1], 0.62), dr = unit(pts[0], pts[1]), nr: P2 = [-dr[1], dr[0]]; c.strokeStyle = LT ? "#2a1a10" : "#4a5876"; c.lineWidth = wd * 0.45; c.beginPath(); seg(c, add(rq, nr, wd * 1.05), add(rq, nr, -wd * 1.05)); c.stroke();
      c.fillStyle = LT ? "#5a1a12" : "#3a4256"; c.beginPath(); c.arc(rq[0] + nr[0] * wd * 1.0, rq[1] + nr[1] * wd * 1.0, wd * 0.42, 0, TAU); c.fill(); c.strokeStyle = line; c.lineWidth = lw * 0.6; c.stroke(); }
    return pts;
  };
  // ---- sleeve + forearm + back of the hand (rotated arm frame; -y = up on screen)
  const armFrame = (fn: () => void) => { c.save(); c.translate(x, y); c.rotate(ang); c.scale(1, flip); fn(); c.restore(); };
  armFrame(() => {
    c.fillStyle = skin; tube(c, [-0.9 * s, 0], [0.02 * s, 0], 0.15 * s, 0.12 * s);
    c.beginPath(); c.moveTo(-0.9 * s, -0.15 * s); c.lineTo(0.02 * s, -0.12 * s); c.moveTo(-0.9 * s, 0.15 * s); c.lineTo(0.02 * s, 0.12 * s); c.strokeStyle = line; c.lineWidth = lw; c.stroke();
    c.beginPath(); c.moveTo(-0.6 * s, -0.05 * s); c.quadraticCurveTo(-0.3 * s, -0.08 * s, -0.05 * s, -0.04 * s); c.moveTo(-0.55 * s, 0.03 * s); c.quadraticCurveTo(-0.28 * s, 0.0, -0.06 * s, 0.03 * s); c.lineWidth = lw * 0.6; c.stroke(); // tendons / veins
    // sleeve with a batik edge band
    // sleeve: cuff ≈ 0.5 × hand length wide, widening gently toward the elbow, a soft droop, fabric folds, batik cuff band;
    // a thin pale wrist gap stays between the cuff (x = xc) and the hand (x = 0)
    const xc = -0.2 * s, N = 18;
    const cy = (xq: number) => 0.16 * s * Math.pow(Math.max(0, xc - xq) / (3 * s), 2), hw = (xq: number) => 0.24 * s + 0.055 * s * Math.min(1, Math.max(0, xc - xq) / (1.3 * s));
    const edge = (sg: number, k: number) => { const xq = xc - (k / N) * 3.1 * s, wob = 0.008 * s * Math.sin(k * 1.9 + sg); return [xq, cy(xq) + sg * (hw(xq) + wob)] as P2; };
    c.fillStyle = sleeve; c.beginPath(); for (let k = N; k >= 0; k--) { const q = edge(-1, k); k === N ? c.moveTo(q[0], q[1]) : c.lineTo(q[0], q[1]); }
    c.quadraticCurveTo(xc + 0.05 * s, cy(xc), edge(1, 0)[0], edge(1, 0)[1]); for (let k = 1; k <= N; k++) { const q = edge(1, k); c.lineTo(q[0], q[1]); } c.closePath(); c.fill();
    const band = () => { c.beginPath(); c.moveTo(xc - 0.15 * s, cy(xc) - hw(xc - 0.15 * s)); c.lineTo(edge(-1, 0)[0], edge(-1, 0)[1]); c.quadraticCurveTo(xc + 0.05 * s, cy(xc), edge(1, 0)[0], edge(1, 0)[1]); c.lineTo(xc - 0.15 * s, cy(xc) + hw(xc - 0.15 * s)); c.quadraticCurveTo(xc - 0.11 * s, cy(xc), xc - 0.15 * s, cy(xc) - hw(xc - 0.15 * s)); c.closePath(); };
    band(); c.fillStyle = LT ? "#2a1d14" : "#090d16"; c.fill();
    c.save(); band(); c.clip(); c.strokeStyle = LT ? "rgba(228,212,178,0.75)" : "rgba(84,104,142,0.25)"; c.lineWidth = lw * 0.7; c.beginPath();
    for (let i = 0; i < 6; i++) { const yq = cy(xc) - 0.2 * s + i * 0.08 * s, xq = xc - 0.065 * s; for (let q = 0; q < 4; q++) { const an = q * (Math.PI / 2) + Math.PI / 4; c.moveTo(xq + Math.cos(an) * 0.024 * s + 0.016 * s, yq + Math.sin(an) * 0.024 * s); c.ellipse(xq + Math.cos(an) * 0.024 * s, yq + Math.sin(an) * 0.024 * s, 0.016 * s, 0.008 * s, an, 0, TAU); } }
    c.stroke(); c.restore();
    c.strokeStyle = LT ? "rgba(228,212,178,0.4)" : "rgba(84,104,142,0.14)"; c.lineWidth = lw * 0.9; c.beginPath(); // soft folds: crescents across the sleeve + two long drape lines
    for (let i = 0; i < 7; i++) { const xq = xc - 0.3 * s - i * 0.38 * s - hash(i * 3.1) * 0.12 * s, h = hw(xq), y0 = cy(xq), sg = i % 2 ? 1 : -1; c.moveTo(xq + 0.06 * s, y0 + sg * h * 0.95); c.quadraticCurveTo(xq - 0.05 * s, y0 + sg * h * 0.2, xq + 0.02 * s, y0 - sg * h * 0.35); }
    for (const f of [-0.45, 0.4]) { c.moveTo(xc - 0.25 * s, cy(xc - 0.25 * s) + f * hw(xc)); for (let k = 1; k <= 10; k++) { const xq = xc - 0.25 * s - k * 0.28 * s; c.lineTo(xq, cy(xq) + f * hw(xq) + 0.01 * s * Math.sin(k * 1.3)); } }
    c.stroke();
  });
  if (!o.tray) { // open beckoning palm, fingers fanned, settling
    armFrame(() => {
      outline(() => { c.moveTo(0, -0.12 * s); c.quadraticCurveTo(0.3 * s, -0.16 * s, 0.48 * s, -0.1 * s); c.lineTo(0.5 * s, 0.08 * s); c.quadraticCurveTo(0.25 * s, 0.14 * s, 0, 0.12 * s); c.closePath(); }, skin);
      c.beginPath(); c.moveTo(0.12 * s, -0.04 * s); c.quadraticCurveTo(0.28 * s, 0.0, 0.42 * s, -0.05 * s); c.strokeStyle = line; c.lineWidth = lw * 0.7; c.stroke();
      const base: [P2, number, boolean][] = [[[0.46 * s, -0.085 * s], 0.75, false], [[0.49 * s, -0.04 * s], 0.88, true], [[0.5 * s, 0.01 * s], 1.0, false], [[0.48 * s, 0.06 * s], 0.95, true]];
      base.forEach(([b, k], i) => finger(b, -0.12 + i * 0.08, [0.27 * s * k, 0.19 * s * k, 0.15 * s * k], [-0.1 - settleC, -0.28 - settleC * 1.4 + 0.02 * Math.sin(t * 0.5 + i), -0.3 - settleC], 0.05 * s, i === 1));
      finger([0.16 * s, -0.11 * s], -0.7, [0.2 * s, 0.16 * s], [0, 0.25 + settleC * 0.5], 0.056 * s);
    });
    return;
  }
  // ---- tray mode: the hand grips the near rim, four fingers draped over the rim onto the tray top
  const K: P2 = [x + Math.cos(ang) * 0.5 * s, y + Math.sin(ang) * 0.5 * s], rx = 1.36 * s, ry = 0.3 * s, rimH = 0.09 * s;
  const tx = K[0] + flip * (rx + 0.02 * s), ty = K[1] + 0.05 * s;
  armFrame(() => { outline(() => { c.moveTo(0, -0.12 * s); c.quadraticCurveTo(0.26 * s, -0.17 * s, 0.5 * s, -0.12 * s); c.lineTo(0.52 * s, 0.1 * s); c.quadraticCurveTo(0.24 * s, 0.15 * s, 0, 0.12 * s); c.closePath(); }, skin);
    c.beginPath(); for (let i = 0; i < 4; i++) { const yq = -0.08 * s + i * 0.05 * s; c.moveTo(0.1 * s, yq * 0.5); c.quadraticCurveTo(0.3 * s, yq, 0.47 * s, yq * 1.1); } c.strokeStyle = line; c.lineWidth = lw * 0.55; c.stroke(); }); // back-of-hand tendons
  // thumb under the rim
  c.save(); c.translate(K[0], K[1]); c.scale(flip, 1); finger([-0.02 * s, 0.1 * s], 0.3, [0.2 * s, 0.17 * s], [0, -0.25 + settleC * 0.3], 0.055 * s); c.restore();
  // tampah (symmetric about its centre)
  c.save(); c.translate(tx, ty);
  const ink = LT ? p.ink : "#04060b", bam = LT ? "#c9b48a" : "#0f1522", bam2 = LT ? "#a58e64" : "#0c111c", leaf = LT ? "#8f8c63" : "#0d141b", leaf2 = LT ? "#6f6c48" : "#0a1016";
  c.fillStyle = bam2; c.beginPath(); c.ellipse(0, rimH, rx, ry, 0, 0, Math.PI); c.lineTo(-rx, 0); c.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fill(); // rim side band
  c.save(); c.clip(); c.strokeStyle = LT ? "rgba(22,14,10,0.45)" : "rgba(110,130,168,0.2)"; c.lineWidth = lw * 0.7; c.beginPath(); for (let i = -30; i <= 30; i++) { const xq = (i / 30) * rx; c.moveTo(xq - 0.03 * s, 0); c.lineTo(xq + 0.03 * s, rimH + ry); } c.stroke(); c.restore();
  c.fillStyle = bam; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.ellipse(0, 0, rx * 0.97, ry * 0.94, 0, 0, TAU); c.clip(); c.strokeStyle = LT ? "rgba(22,14,10,0.22)" : "rgba(110,130,168,0.12)"; c.lineWidth = lw * 0.6; c.beginPath(); // anyaman weave
  for (let i = -24; i <= 24; i++) { const d = i * 0.06 * s; c.moveTo(d - ry * 2, -ry); c.lineTo(d + ry * 2, ry); c.moveTo(d + ry * 2, -ry); c.lineTo(d - ry * 2, ry); } c.stroke(); c.restore();
  c.strokeStyle = ink; c.lineWidth = lw * 1.2; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.moveTo(rx * 0.97, 0); c.ellipse(0, 0, rx * 0.97, ry * 0.94, 0, 0, TAU); c.moveTo(-rx, 0); c.lineTo(-rx, rimH); c.moveTo(rx, 0); c.lineTo(rx, rimH); c.moveTo(rx, rimH); c.ellipse(0, rimH, rx, ry, 0, 0, Math.PI); c.stroke();
  // banana leaf liner, mirrored scallops
  c.fillStyle = leaf; c.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU, r = 0.8 + 0.05 * Math.cos(a * 6) * Math.cos(a * 6); const q: P2 = [Math.cos(a) * rx * r, Math.sin(a) * ry * r]; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.closePath(); c.fill();
  c.strokeStyle = leaf2; c.lineWidth = lw * 0.6; c.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.moveTo(Math.cos(a) * rx * 0.2, Math.sin(a) * ry * 0.2); c.lineTo(Math.cos(a) * rx * 0.78, Math.sin(a) * ry * 0.78); } c.stroke();
  const ol = (fillCol: string, f: () => void) => { c.beginPath(); f(); c.fillStyle = fillCol; c.fill(); c.strokeStyle = ink; c.lineWidth = lw; c.stroke(); };
  // kembang setaman petals (back half first)
  const petal = (i: number) => { const a = hash(i * 3.7) * TAU, r = 0.55 + 0.25 * hash(i * 9.1); return { q: [Math.cos(a) * rx * r, Math.sin(a) * ry * r] as P2, col: LT ? ["#efe6d0", "#b5523a", "#e8d48a", "#c98a7a"][i % 4] : ["#2c3548", "#1f2433", "#2a3142", "#232a3a"][i % 4], ro: hash(i * 5.3) * 3 }; };
  for (let i = 0; i < 46; i++) { const P = petal(i); if (P.q[1] > 0) continue; c.fillStyle = P.col; c.beginPath(); c.ellipse(P.q[0], P.q[1], 0.03 * s, 0.017 * s, P.ro, 0, TAU); c.fill(); }
  // glass of tea (back right) + steam
  const gx = rx * 0.5, gy = -ry * 0.25, gh = 0.34 * s, gwB = 0.08 * s, gwT = 0.1 * s;
  c.fillStyle = LT ? "rgba(140,90,40,0.75)" : "rgba(40,30,30,0.8)"; c.beginPath(); c.moveTo(gx - gwB, gy); c.lineTo(gx - gwT * 0.96, gy - gh * 0.85); c.lineTo(gx + gwT * 0.96, gy - gh * 0.85); c.lineTo(gx + gwB, gy); c.closePath(); c.fill();
  c.strokeStyle = ink; c.lineWidth = lw; c.beginPath(); c.moveTo(gx - gwB, gy); c.lineTo(gx - gwT, gy - gh); c.moveTo(gx + gwT, gy - gh); c.lineTo(gx + gwB, gy); c.moveTo(gx + gwB, gy); c.ellipse(gx, gy, gwB, gwB * 0.25, 0, 0, Math.PI); c.moveTo(gx + gwT, gy - gh); c.ellipse(gx, gy - gh, gwT, gwT * 0.25, 0, 0, TAU); c.moveTo(gx + gwT * 0.96, gy - gh * 0.85); c.ellipse(gx, gy - gh * 0.85, gwT * 0.96, gwT * 0.22, 0, 0, Math.PI); c.stroke();
  c.strokeStyle = LT ? "rgba(255,250,235,0.7)" : "rgba(150,170,200,0.25)"; c.lineWidth = lw; c.beginPath(); c.moveTo(gx - gwT * 0.6, gy - gh * 0.8); c.lineTo(gx - gwB * 0.55, gy - gh * 0.1); c.stroke();
  const st = o.steam ?? 1;
  if (st > 0.01) for (const sg of [-1, 1]) { c.strokeStyle = LT ? `rgba(120,110,95,${0.35 * st})` : `rgba(170,185,210,${0.22 * st})`; c.lineWidth = lw * 1.4; c.beginPath(); for (let k = 0; k < 24; k++) { const yq = gy - gh - k * 0.03 * s, xq = gx + sg * 0.025 * s + Math.sin(k * 0.32 + t * 0.9 + sg * 1.3) * 0.035 * s * (k / 24); k ? c.lineTo(xq, yq) : c.moveTo(xq, yq); } c.stroke(); }
  // nasi tumpeng (centre, symmetric) with its lauk ring
  const tw = 0.3 * s, th = 0.66 * s, ty0 = -ry * 0.1;
  c.fillStyle = leaf2; c.beginPath(); c.ellipse(0, ty0, tw * 1.55, tw * 0.36, 0, 0, TAU); c.fill();
  ol(LT ? "#f1ead8" : "#1a2130", () => { c.moveTo(-tw, ty0); c.quadraticCurveTo(-tw * 0.55, ty0 - th * 0.55, 0, ty0 - th); c.quadraticCurveTo(tw * 0.55, ty0 - th * 0.55, tw, ty0); c.ellipse(0, ty0, tw, tw * 0.22, 0, 0, Math.PI); });
  c.fillStyle = LT ? "rgba(120,104,80,0.45)" : "rgba(120,140,170,0.15)"; for (let i = 0; i < 70; i++) { const f = hash(i * 1.7), yq = ty0 - th * (0.05 + 0.85 * f), half = tw * (1 - (ty0 - yq) / th) * 0.9, xq = (hash(i * 4.3) * 2 - 1) * half; c.fillRect(xq, yq, 0.012 * s, 0.006 * s); }
  ol(LT ? "#6a2a1a" : "#1a1f2c", () => { c.moveTo(-0.025 * s, ty0 - th + 0.01 * s); c.quadraticCurveTo(0, ty0 - th - 0.09 * s, 0.025 * s, ty0 - th + 0.01 * s); c.closePath(); }); // chilli on top
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + 0.8 * (i / 6)), q: P2 = [Math.cos(a) * tw * 1.25, ty0 + Math.sin(a) * tw * 0.3]; if (i % 2) { ol(LT ? "#f4efe0" : "#2a3142", () => c.ellipse(q[0], q[1], 0.05 * s, 0.03 * s, 0, 0, TAU)); c.fillStyle = LT ? "#e2b84a" : "#232a38"; c.beginPath(); c.arc(q[0], q[1] - 0.004 * s, 0.018 * s, 0, TAU); c.fill(); } else ol(LT ? "#8a6a3e" : "#151b28", () => c.rect(q[0] - 0.04 * s, q[1] - 0.025 * s, 0.08 * s, 0.04 * s)); }
  // ingkung chicken (front left of centre, clear of the fingers)
  const cx = -rx * 0.28, cy = ry * 0.35;
  ol(LT ? "#9a6c3a" : "#121826", () => { c.moveTo(cx - 0.17 * s, cy - 0.09 * s); c.quadraticCurveTo(cx - 0.27 * s, cy - 0.2 * s, cx - 0.2 * s, cy - 0.27 * s); c.quadraticCurveTo(cx - 0.13 * s, cy - 0.28 * s, cx - 0.14 * s, cy - 0.2 * s); c.quadraticCurveTo(cx - 0.12 * s, cy - 0.14 * s, cx - 0.08 * s, cy - 0.12 * s); }); // neck curled up, head resting on the breast
  ol(LT ? "#a97a45" : "#141b29", () => { c.moveTo(cx - 0.24 * s, cy); c.bezierCurveTo(cx - 0.27 * s, cy - 0.2 * s, cx + 0.2 * s, cy - 0.24 * s, cx + 0.25 * s, cy - 0.05 * s); c.bezierCurveTo(cx + 0.27 * s, cy + 0.07 * s, cx - 0.2 * s, cy + 0.09 * s, cx - 0.24 * s, cy); });
  ol(LT ? "#9a6c3a" : "#121826", () => c.ellipse(cx + 0.06 * s, cy - 0.02 * s, 0.1 * s, 0.055 * s, -0.25, 0, TAU)); // thigh + drumstick tucked
  ol(LT ? "#efe3c8" : "#1a2130", () => c.ellipse(cx + 0.165 * s, cy - 0.05 * s, 0.022 * s, 0.016 * s, -0.25, 0, TAU)); // knuckle end of the leg bone
  ol(LT ? "#9a6c3a" : "#121826", () => { c.moveTo(cx - 0.12 * s, cy - 0.06 * s); c.quadraticCurveTo(cx - 0.02 * s, cy - 0.14 * s, cx + 0.1 * s, cy - 0.11 * s); c.quadraticCurveTo(cx - 0.02 * s, cy - 0.08 * s, cx - 0.12 * s, cy - 0.06 * s); }); // wing
  c.strokeStyle = LT ? "rgba(255,240,200,0.55)" : "rgba(130,150,185,0.18)"; c.lineWidth = lw * 0.8; c.beginPath(); c.moveTo(cx - 0.12 * s, cy - 0.11 * s); c.quadraticCurveTo(cx, cy - 0.16 * s, cx + 0.12 * s, cy - 0.12 * s); c.moveTo(cx - 0.05 * s, cy - 0.04 * s); c.quadraticCurveTo(cx + 0.02 * s, cy - 0.08 * s, cx + 0.08 * s, cy - 0.07 * s); c.stroke();
  // jajan pasar (front right): kue lapis, klepon, nagasari packets
  const jx = rx * 0.32, jy = ry * 0.42;
  ol(LT ? "#d8b07a" : "#1a2130", () => c.rect(jx - 0.09 * s, jy - 0.08 * s, 0.1 * s, 0.08 * s)); c.strokeStyle = LT ? "rgba(110,40,30,0.7)" : "rgba(110,130,168,0.25)"; c.lineWidth = lw * 0.8; c.beginPath(); for (let i = 1; i < 4; i++) { c.moveTo(jx - 0.09 * s, jy - 0.08 * s + i * 0.02 * s); c.lineTo(jx + 0.01 * s, jy - 0.08 * s + i * 0.02 * s); } c.stroke();
  for (let i = 0; i < 3; i++) { const q: P2 = [jx + 0.06 * s + i * 0.055 * s, jy - 0.02 * s + (i % 2) * 0.02 * s]; ol(LT ? "#7f8a52" : "#151c26", () => c.arc(q[0], q[1], 0.03 * s, 0, TAU)); c.fillStyle = LT ? "#f3ecda" : "#2a3142"; for (let k = 0; k < 5; k++) { c.fillRect(q[0] - 0.02 * s + hash(i * 9 + k) * 0.035 * s, q[1] - 0.025 * s + hash(i * 5 + k * 3) * 0.02 * s, 0.006 * s, 0.004 * s); } }
  for (const [qx, qy] of [[jx - 0.2 * s, jy + 0.0], [jx + 0.25 * s, jy - 0.08 * s]] as P2[]) { // nagasari packets in banana leaf (rounded, folded ends)
    ol(leaf, () => { c.moveTo(qx - 0.06 * s, qy); c.quadraticCurveTo(qx - 0.065 * s, qy - 0.05 * s, qx, qy - 0.055 * s); c.quadraticCurveTo(qx + 0.065 * s, qy - 0.05 * s, qx + 0.06 * s, qy); c.closePath(); });
    c.strokeStyle = leaf2; c.lineWidth = lw * 0.7; c.beginPath(); c.moveTo(qx - 0.04 * s, qy - 0.04 * s); c.lineTo(qx, qy - 0.012 * s); c.lineTo(qx + 0.04 * s, qy - 0.04 * s); c.stroke(); }
  // incense stick + ember + thin smoke line
  const ix = rx * 0.08, iy = ry * 0.55, itop: P2 = [ix + 0.08 * s, iy - 0.62 * s];
  c.strokeStyle = LT ? "#3a2416" : "#0a0e16"; c.lineWidth = Math.max(1, s * 0.012); c.beginPath(); c.moveTo(ix, iy); c.lineTo(itop[0], itop[1]); c.stroke();
  c.fillStyle = LT ? "#a03a1c" : "rgba(255,150,80,0.8)"; c.beginPath(); c.arc(itop[0], itop[1], s * 0.01, 0, TAU); c.fill();
  c.strokeStyle = LT ? "rgba(90,82,70,0.45)" : "rgba(170,185,210,0.2)"; c.lineWidth = Math.max(0.8, s * 0.008); c.beginPath(); for (let k = 0; k < 40; k++) { const yq = itop[1] - k * 0.04 * s, xq = itop[0] + Math.sin(k * 0.22 + t * 0.6) * 0.05 * s * (k / 40) + Math.sin(k * 0.07 + t * 0.25) * 0.03 * s * (k / 40); k ? c.lineTo(xq, yq) : c.moveTo(xq, yq); } c.stroke();
  // front petals
  for (let i = 0; i < 46; i++) { const P = petal(i); if (P.q[1] <= 0) continue; c.fillStyle = P.col; c.beginPath(); c.ellipse(P.q[0], P.q[1], 0.03 * s, 0.017 * s, P.ro, 0, TAU); c.fill(); }
  c.restore();
  // four long fingers draped over the near rim onto the tray top (drawn far -> near)
  c.save(); c.translate(K[0], K[1]); c.scale(flip, 1);
  const fz: [number, number, boolean][] = [[-0.11, 0.78, false], [-0.04, 0.92, true], [0.03, 1.0, false], [0.1, 0.9, true]];
  fz.forEach(([dy, kk, ring], i) => finger([0.0, dy * s], -0.75 + i * 0.16, [0.25 * s * kk, 0.2 * s * kk, 0.15 * s * kk], [0, 0.55 + settleC * 0.4, 0.42 + settleC * 0.8 + 0.02 * Math.sin(t * 0.45 + i)], 0.05 * s, ring));
  c.restore();
}
