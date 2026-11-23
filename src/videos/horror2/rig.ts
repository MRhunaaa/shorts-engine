// SIDE-VIEW silhouette rig + symmetric props for "Gelas Kelima" (Kelir-style profiles, our woodcut/torch look).
// Proportions (H = standing height): head 0.13H (1/7.5), neck 0.04, torso 0.28, thigh 0.245, shin 0.245, upper arm 0.17, forearm 0.15.
// Everything that should be symmetric (torch, petromaks, glass, kentongan) is drawn about its own axis with mirrored paths.
import { C2 } from "../horror1/paint";

export type Look = { peci?: boolean; hair?: boolean; sarung?: boolean; belly?: number; jacket?: boolean; thin?: boolean };
export const LOOKS: Record<string, Look> = {
  aku: { jacket: true, hair: true },            // narrator, 30s
  darto: { peci: true, sarung: true, belly: 0.012 }, // elder, sarung over shoulders
  yanto: { peci: true, jacket: true },          // 40s
  udin: { hair: true, thin: true },             // young
};
export type SidePose = {
  dir?: 1 | -1;              // facing +x (1) or -x (-1)
  walk?: number;             // walk phase (rad); undefined = standing
  sit?: number;              // seat height above the feet line in px (legs hang); undefined = standing
  lean?: number;             // torso lean forward (rad)
  head?: number;             // head pitch (+ = look down)
  armF?: [number, number];   // front arm (far side from viewer): [shoulder angle from down, elbow bend] (+ = forward)
  armB?: [number, number];   // back arm (near side)
  torch?: "F" | "B";         // which hand holds a torch
  torchOn?: number;          // lens glow 0..1
  breath?: number;           // phase
  jaw?: number;              // 0..1 mouth open
  // ---- v2 "alive" contract (implemented in rig.ts by the rig agent; shots may use them now) ----
  reachF?: [number, number]; // WORLD point the front hand reaches (two-bone IK overrides armF)
  reachB?: [number, number]; // WORLD point the back hand reaches (overrides armB)
  gripF?: "open" | "fist" | "torch" | "glass" | "beater" | "point" | "cig"; // hand shape for the front hand
  gripB?: "open" | "fist" | "torch" | "glass" | "beater" | "point" | "cig";
  idle?: { t: number; seed: number; amount?: number }; // automatic micro-life: head glances, weight shift, shoulder/breath, finger/hand settle, sarung sway (amount 0..1, default 1)
  look?: number;             // extra head turn/pitch target (rad, + = look down/forward), eased by the shot
  stride?: number;           // walk stride scale (default 1); per-person variety
};
const TAU = Math.PI * 2;
type P2 = [number, number];
type Grip = NonNullable<SidePose["gripF"]>;
const rot = (a: number): P2 => [Math.sin(a), Math.cos(a)]; // angle from straight down, + toward +x
const ang = (dx: number, dy: number) => Math.atan2(dx, dy);  // inverse of rot
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** smooth deterministic noise in [-1,1] */
const sn = (t: number, s: number) => 0.55 * Math.sin(t * 0.83 + s * 1.7) + 0.3 * Math.sin(t * 1.37 + s * 4.1) + 0.15 * Math.sin(t * 2.21 + s * 7.3);

/** two-bone IK in LOCAL space (figure facing +x). Elbow chosen below the shoulder→wrist line (and behind on ties). */
function ik(sh: P2, target: P2, UA: number, FA: number) {
  let dx = target[0] - sh[0], dy = target[1] - sh[1]; let D = Math.hypot(dx, dy) || 1e-6;
  const maxD = (UA + FA) * 0.999, minD = Math.abs(UA - FA) + 1e-3;
  if (D > maxD) { dx *= maxD / D; dy *= maxD / D; D = maxD; }
  if (D < minD) { dx *= minD / D; dy *= minD / D; D = minD; }
  const base = ang(dx, dy), a = Math.acos(clampN((UA * UA + D * D - FA * FA) / (2 * UA * D), -1, 1));
  const cand = [base + a, base - a].map((s) => ({ s, el: [sh[0] + rot(s)[0] * UA, sh[1] + rot(s)[1] * UA] as P2 }));
  // signed side of the elbow relative to the shoulder→wrist line: pick the one "below/behind" (human elbow)
  const side = (e: P2) => (e[0] - sh[0]) * dy - (e[1] - sh[1]) * dx; // >0 = to the right of the direction
  const below = (e: P2) => e[1] - (sh[1] + (dy * ((e[0] - sh[0]) * dx + (e[1] - sh[1]) * dy)) / (D * D));
  cand.sort((p, q) => (below(q.el) - below(p.el)) || (p.el[0] - q.el[0]) || (side(p.el) - side(q.el)));
  const { s, el } = cand[0]; const ha: P2 = [sh[0] + dx, sh[1] + dy];
  return { el, ha, s, f: ang(ha[0] - el[0], ha[1] - el[1]) };
}

/** forward kinematics + IK in WORLD coords. (x,y) = point on the floor under the hip (or under the seat when sitting). */
export function sideJoints(x: number, y: number, H: number, p: SidePose = {}) {
  const d = p.dir ?? 1, u = H;
  const T = 0.245 * u, S = 0.245 * u, UA = 0.17 * u, FA = 0.15 * u;
  const toL = (w: P2): P2 => [(w[0] - x) * d, w[1] - y];
  // ---- idle micro-life (deterministic, smooth)
  const am = p.idle ? (p.idle.amount ?? 1) : 0, it = p.idle?.t ?? 0, sd = p.idle?.seed ?? 0;
  const glance = am * (0.055 * sn(it * 1.6, sd) + 0.025 * Math.sin(it * 2 * Math.PI / 4.2 + sd));      // slow head pitch glances
  const sway = am * 0.006 * u * sn(it * 0.9, sd + 3);                                                    // weight shift
  const breathPh = p.breath ?? (p.idle ? it * 2 * Math.PI / 3.6 + sd : undefined);
  const br = breathPh !== undefined ? 0.0045 * u * Math.sin(breathPh) : 0;
  const settle = am * 0.08 * sn(it * 1.2, sd + 9);                                                       // finger/hand settle
  // ---- legs
  let hip: P2, thF: number, thB: number, knF: number, knB: number, ftF = 0, ftB = 0;
  let headBobComp = 0, shX = 0;
  const st = p.stride ?? 1;
  if (p.sit !== undefined) {
    hip = [sway * 0.3, -p.sit];
    thF = Math.PI / 2 - 0.1; thB = Math.PI / 2 - 0.02;                    // thighs forward, slightly down to the knee
    const kneeY = (th: number) => -p.sit! + Math.cos(th) * T;
    const shinFor = (th: number, fwd: number) => {
      const drop = -kneeY(th) - 0.03 * u;                                  // knee height above the foot sole
      if (drop <= S * 0.98) { const a = Math.acos(clampN(drop / S, -1, 1)) * fwd; return { kn: a - th, ft: -a * 0.2 }; } // foot flat on the floor
      const dangle = 0.1 * fwd + am * 0.05 * Math.sin(it * 1.1 + sd + fwd); return { kn: dangle - th, ft: -0.45 };   // dangling, relaxed ankle
    };
    const a1 = shinFor(thF, 1), a2 = shinFor(thB, -0.4); knF = a1.kn; knB = a2.kn; ftF = a1.ft; ftB = a2.ft;
  } else if (p.walk !== undefined) {
    const ph = p.walk, A = 0.36 * st;
    const bob = 0.014 * u * Math.abs(Math.sin(ph));                        // lowest at heel strike (legs spread)
    hip = [0, -0.53 * u + bob]; headBobComp = -bob * 0.5;                  // head bobs half as much
    thF = A * Math.sin(ph); thB = A * Math.sin(ph + Math.PI);
    const knee = (q: number) => -(0.06 + 0.62 * Math.pow(Math.max(0, Math.cos(q)), 1.6) + 0.1 * Math.max(0, Math.sin(q - 0.6)) * Math.max(0, -Math.cos(q)));
    knF = knee(ph); knB = knee(ph + Math.PI);
    const foot = (q: number) => 0.3 * Math.max(0, Math.sin(q)) * (1 - Math.max(0, Math.cos(q))) - 0.42 * Math.max(0, -Math.sin(q)) * Math.max(0, -Math.cos(q) + 0.2); // heel strike toe-up / toe-off heel-up
    ftF = foot(ph); ftB = foot(ph + Math.PI); shX = 0.008 * u * Math.sin(ph);
  } else {
    hip = [sway, -0.53 * u]; thF = 0.035 + sway / u; thB = -0.03 + sway / u; knF = -0.02; knB = 0;
  }
  const leg = (th: number, kn: number, ft: number) => { const k: P2 = [hip[0] + rot(th)[0] * T, hip[1] + rot(th)[1] * T]; const a: P2 = [k[0] + rot(th + kn)[0] * S, k[1] + rot(th + kn)[1] * S]; return { k, a, th, kn, ft }; };
  const LF = leg(thF, knF, ftF), LB = leg(thB, knB, ftB);
  // ---- torso / head
  const lean = (p.lean ?? 0) + (p.walk !== undefined ? 0.06 : 0) + (p.sit !== undefined ? 0.09 : 0) + am * 0.012 * sn(it * 0.7, sd + 5);
  const sh: P2 = [hip[0] + Math.sin(lean) * 0.28 * u + shX, hip[1] - Math.cos(lean) * 0.28 * u - br];
  const neck: P2 = [sh[0] + Math.sin(lean * 1.4) * 0.04 * u, sh[1] - 0.04 * u + br * 0.3];
  const head: P2 = [neck[0] + 0.012 * u, neck[1] - 0.06 * u + headBobComp];
  const headPitch = (p.head ?? 0) + (p.look ?? 0) + glance + lean * 0.3 - (p.sit !== undefined ? 0.05 : 0);
  // ---- arms: explicit angles, IK reach, sitting rest on thighs, or walk swing
  type ArmR = { el: P2; ha: P2; s: number; f: number };
  const fk = (s: number, e: number): ArmR => { const el: P2 = [sh[0] + rot(s)[0] * UA, sh[1] + rot(s)[1] * UA]; const ha: P2 = [el[0] + rot(s - e)[0] * FA, el[1] + rot(s - e)[1] * FA]; return { el, ha, s, f: s - e }; };
  const armFor = (which: "F" | "B"): ArmR => {
    const reach = which === "F" ? p.reachF : p.reachB, explicit = which === "F" ? p.armF : p.armB;
    if (reach) return ik(sh, toL(reach), UA, FA);
    if (explicit) return fk(explicit[0], explicit[1]);
    if (p.walk !== undefined) {
      const sgn = which === "F" ? -1 : 1, s = sgn * 0.3 * st * Math.sin(p.walk + Math.PI);
      return fk(s, -(0.2 + 0.35 * Math.max(0, s) / 0.3));                  // elbow bends more when the arm swings forward
    }
    if (p.sit !== undefined) { // hands resting on the thighs
      const Lg = which === "F" ? LF : LB, k = Lg.k;
      const tgt: P2 = [hip[0] + (k[0] - hip[0]) * (which === "F" ? 0.72 : 0.55), hip[1] + (k[1] - hip[1]) * 0.7 - 0.035 * u];
      return ik(sh, tgt, UA, FA);
    }
    return fk((which === "F" ? 0.1 : 0.05) + settle * 0.3, -0.18 - settle * 0.5); // relaxed hang, slightly in front
  };
  const AF = armFor("F"), AB = armFor("B");
  // ---- grips + held-object anchors
  const gF: Grip = p.gripF ?? (p.torch === "F" ? "torch" : p.sit !== undefined && !p.armF && !p.reachF ? "open" : "open");
  const gB: Grip = p.gripB ?? (p.torch === "B" ? "torch" : "open");
  const tl = 0.12 * u;
  const anchorL = (A: ArmR, g: Grip) => {
    const hx = rot(A.f), palm: P2 = [A.ha[0] + hx[0] * 0.045 * u, A.ha[1] + hx[1] * 0.045 * u];
    const front: P2 = [hx[1], -hx[0]];                              // perpendicular, toward the front of the hand (local +x side for a hanging arm)
    if (g === "glass") return { c: [A.ha[0] + hx[0] * 0.068 * u, A.ha[1] + hx[1] * 0.068 * u - 0.004 * u] as P2, axis: Math.PI, tip: palm }; // glass sits in the curl of the fingers, beyond the palm
    if (g === "beater") { const ax = A.f + 1.15; return { c: palm, axis: ax, tip: [palm[0] + rot(ax)[0] * 0.15 * u, palm[1] + rot(ax)[1] * 0.15 * u] as P2 }; }
    if (g === "cig") { const tp: P2 = [palm[0] + hx[0] * 0.05 * u, palm[1] + hx[1] * 0.05 * u]; const ax = A.f + Math.PI / 2; return { c: tp, axis: ax, tip: [tp[0] + rot(ax)[0] * 0.05 * u, tp[1] + rot(ax)[1] * 0.05 * u] as P2 }; }
    if (g === "point") return { c: palm, axis: A.f, tip: [palm[0] + hx[0] * 0.075 * u, palm[1] + hx[1] * 0.075 * u] as P2 };
    return { c: palm, axis: A.f, tip: [palm[0] + hx[0] * 0.06 * u, palm[1] + hx[1] * 0.06 * u] as P2 };
  };
  const anF = anchorL(AF, gF), anB = anchorL(AB, gB);
  const TA = p.torch === "F" || gF === "torch" ? AF : p.torch === "B" || gB === "torch" ? AB : null;
  const lensL: P2 | null = TA ? [TA.ha[0] + rot(TA.f)[0] * (0.045 * u + 0.5 * tl), TA.ha[1] + rot(TA.f)[1] * (0.045 * u + 0.5 * tl)] : null; // fist sits mid-barrel
  const W = (q: P2): P2 => [x + d * q[0], y + q[1]];
  const wAng = (a: number) => (d === 1 ? a : -a);
  const anW = (an: ReturnType<typeof anchorL>) => ({ c: W(an.c), axis: wAng(an.axis), tip: W(an.tip) });
  return { d, u, hip: W(hip), sh: W(sh), neck: W(neck), head: W(head), LF: { k: W(LF.k), a: W(LF.a) }, LB: { k: W(LB.k), a: W(LB.a) },
    AF: { el: W(AF.el), ha: W(AF.ha), f: AF.f }, AB: { el: W(AB.el), ha: W(AB.ha), f: AB.f }, lens: lensL ? W(lensL) : null,
    torchAng: TA ? wAng(TA.f) : 0, gripF: gF, gripB: gB, anchF: anW(anF), anchB: anW(anB), anchFL: anF.c, anchBL: anB.c,
    local: { hip, sh, neck, head, LF, LB, AF, AB, lean, headPitch, lensL, torchSide: TA === AF ? "F" : TA === AB ? "B" : null, settle, sarungSway: am * 0.012 * u * Math.sin(it * 1.3 + sd) + (p.walk !== undefined ? 0.01 * u * Math.sin(p.walk * 2) : 0) } };
}
export type Joints = ReturnType<typeof sideJoints>;
/** where a held object goes, in WORLD coords: x,y = object centre (glass centre / fist centre), ang = object axis angle
 *  (from straight down, + toward +x; a glass returns π = upright), rot = canvas rotation to draw an upright-by-default object
 *  (0 for a glass), tip = stick tip / cigarette tip / finger tip. */
export function handAnchor(J: Joints, which: "F" | "B") {
  const a = which === "F" ? J.anchF : J.anchB, g = which === "F" ? J.gripF : J.gripB;
  return { x: a.c[0], y: a.c[1], ang: a.axis, rot: g === "glass" ? 0 : -a.axis + Math.PI / 2, tip: a.tip, grip: g };
}

/** head in profile, height ≈ 0.13H, facing +x in local space (ear at origin) */
function headProfile(c: C2, u: number, look: Look, jaw: number, pitch: number) {
  const s = 0.118 * u, j = jaw * 0.08;
  c.save(); c.rotate(pitch); c.scale(s, s);
  c.beginPath();
  c.moveTo(-0.38, 0.5); c.bezierCurveTo(-0.6, 0.18, -0.58, -0.42, -0.18, -0.56); c.bezierCurveTo(0.12, -0.66, 0.38, -0.52, 0.44, -0.24);
  c.bezierCurveTo(0.47, -0.14, 0.47, -0.1, 0.45, -0.06); c.bezierCurveTo(0.47, -0.02, 0.56, 0.06, 0.58, 0.12); c.lineTo(0.5, 0.17);
  c.bezierCurveTo(0.53, 0.2, 0.52, 0.22, 0.5, 0.23); c.lineTo(0.45, 0.245 + j * 0.3); c.bezierCurveTo(0.51, 0.26 + j, 0.51, 0.29 + j, 0.48, 0.31 + j);
  c.bezierCurveTo(0.5, 0.36 + j, 0.47, 0.42 + j, 0.36, 0.44 + j); c.bezierCurveTo(0.22, 0.46 + j, 0.12, 0.5, 0.06, 0.62); c.lineTo(0.02, 0.8); c.lineTo(-0.3, 0.8); c.closePath(); c.fill();
  if (look.peci) { c.beginPath(); c.moveTo(-0.5, -0.36); c.quadraticCurveTo(-0.06, -0.44, 0.36, -0.42); c.lineTo(0.33, -0.72); c.quadraticCurveTo(-0.06, -0.77, -0.46, -0.7); c.closePath(); c.fill(); }
  if (look.hair) { c.beginPath(); c.moveTo(-0.56, 0.0); c.bezierCurveTo(-0.66, -0.52, -0.1, -0.78, 0.38, -0.48); c.lineTo(0.42, -0.34); c.bezierCurveTo(0.2, -0.44, 0.04, -0.36, -0.06, -0.28); c.lineTo(-0.44, 0.12); c.closePath(); c.fill(); }
  c.restore();
}
function limb(c: C2, a: P2, b: P2, w0: number, w1: number) { // tapered limb segment
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  c.beginPath(); c.moveTo(a[0] + nx * w0, a[1] + ny * w0); c.lineTo(b[0] + nx * w1, b[1] + ny * w1); c.lineTo(b[0] - nx * w1, b[1] - ny * w1); c.lineTo(a[0] - nx * w0, a[1] - ny * w0); c.closePath(); c.fill();
  c.beginPath(); c.arc(a[0], a[1], w0, 0, TAU); c.arc(b[0], b[1], w1, 0, TAU); c.fill();
}
const cap = (c: C2, a: P2, b: P2, w: number) => limb(c, a, b, w, w * 0.9);

/** HAND in LOCAL figure space. Hand frame: origin = wrist, +X along the forearm, front of the hand (finger-curl side) = -Y of that frame.
 *  Sizes: hand length ≈ 0.105u (palm 0.05 + fingers 0.055). `part`: "back" = palm/back of hand, "front" = fingers that wrap in front of a held object. */
function drawHand(c: C2, u: number, wrist: P2, f: number, g: Grip, settle: number, part: "all" | "back" | "front" = "all") {
  c.save(); c.translate(wrist[0], wrist[1]); c.rotate(-f + Math.PI / 2); // local +x = forearm direction
  const pl = 0.05 * u, pw = 0.019 * u, fw = 0.0075 * u;
  const palm = () => { c.beginPath(); c.ellipse(pl * 0.5, 0, pl * 0.58, pw, 0, 0, TAU); c.fill(); };
  const fingerRow = (curl: number, len: number, spread: number) => { // 4 fingers as capsules curling toward -Y (front)
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * spread, L1 = len * (k === 0 || k === 3 ? 0.82 : 1);
      const a0: P2 = [pl * 0.95, off * 0.4 - pw * 0.25], a1: P2 = [a0[0] + Math.cos(curl * 0.5) * L1 * 0.55, a0[1] - Math.sin(curl * 0.5) * L1 * 0.55];
      const a2: P2 = [a1[0] + Math.cos(curl * 1.3) * L1 * 0.45, a1[1] - Math.sin(curl * 1.3) * L1 * 0.45];
      cap(c, a0, a1, fw); cap(c, a1, a2, fw * 0.9);
    }
  };
  const thumb = (a: number, len: number) => { const t0: P2 = [pl * 0.25, -pw * 0.7]; cap(c, t0, [t0[0] + Math.cos(a) * len, t0[1] - Math.sin(a) * len], fw * 1.1); };
  const fist = () => { c.beginPath(); c.ellipse(pl * 0.62, -pw * 0.15, pl * 0.62, pw * 1.25, 0, 0, TAU); c.fill(); for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(pl * 1.08, -pw * 0.9 + k * pw * 0.62, fw * 1.15, 0, TAU); c.fill(); } };
  if (part !== "front") {
    if (g === "open") { palm(); fingerRow(0.55 + settle, 0.055 * u, fw * 1.6); thumb(0.7, 0.03 * u); }
    else if (g === "fist") { fist(); thumb(0.2, 0.026 * u); }
    else if (g === "beater") { // short wooden beater through the fist, angled forward like a hammer
      const a = 1.15, L = 0.15 * u, cx0 = pl * 0.62; c.save(); c.translate(cx0, -pw * 0.15); c.rotate(-a + Math.PI / 2 - Math.PI / 2);
      c.beginPath(); c.moveTo(-0.03 * u, -0.006 * u); c.lineTo(L, -0.009 * u); c.quadraticCurveTo(L + 0.012 * u, 0, L, 0.009 * u); c.lineTo(-0.03 * u, 0.006 * u); c.closePath(); c.fill(); c.restore();
      fist(); thumb(0.2, 0.026 * u); }
    else if (g === "torch") { palm(); }                               // fingers are drawn OVER the torch barrel (part "front")
    else if (g === "glass") { palm(); thumb(1.2, 0.034 * u); }        // palm behind the glass; fingers in front come later
    else if (g === "point") { fist(); cap(c, [pl * 0.95, -pw * 0.6], [pl * 0.95 + 0.06 * u, -pw * 0.75], fw); thumb(0.4, 0.026 * u); }
    else if (g === "cig") { palm(); cap(c, [pl * 0.95, -pw * 0.5], [pl + 0.048 * u, -pw * 0.9], fw); cap(c, [pl * 0.95, -pw * 0.05], [pl + 0.05 * u, -pw * 0.3], fw); fingerRow(1.9, 0.04 * u, fw * 1.4); thumb(0.9, 0.028 * u); }
  }
  if (part !== "back") {
    if (g === "torch") { for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(pl * 0.35 + k * 0.012 * u, -pw * 0.2, fw * 1.05, pw * 1.35, 0, 0, TAU); c.fill(); } thumb(-0.25, 0.03 * u); }

  }
  c.restore();
}
/** draw the fingers that wrap IN FRONT of a held object (glass/torch). Call after drawing the object at handAnchor(). */
export function drawGripFingers(c: C2, J: Joints, which: "F" | "B", fill: string) {
  const A = which === "F" ? J.local.AF : J.local.AB, g = which === "F" ? J.gripF : J.gripB;
  if (g !== "glass" && g !== "torch") return;
  c.save(); c.translate(J.d === 1 ? J.hip[0] - J.local.hip[0] : J.hip[0] + J.local.hip[0], J.hip[1] - J.local.hip[1]); c.scale(J.d, 1); c.fillStyle = fill;
  if (g === "torch") drawHand(c, J.u, A.ha, A.f, g, J.local.settle, "front");
  else { // glass: 4 fingers wrap horizontally across the FRONT of the upright glass, stacked; thumb tip over the far rim
    const u = J.u, ac = J.local.AF === A ? J.anchFL : J.anchBL, fw = 0.0078 * u, gx = ac[0], gy = ac[1];
    for (let k = 0; k < 4; k++) { const yy = gy - 0.01 * u + k * 0.0115 * u, w = k === 3 ? 0.017 * u : 0.021 * u; cap(c, [gx - 0.026 * u, yy], [gx + w, yy + 0.002 * u], fw); c.beginPath(); c.arc(gx + w, yy + 0.002 * u, fw * 1.05, 0, TAU); c.fill(); }
  }
  c.restore();
}

/** draw a side-view figure. Returns the joints (lens position for the torch light cone, hand anchors). */
export function sideFigure(c: C2, x: number, y: number, H: number, fill: string, lookKey: keyof typeof LOOKS | Look, p: SidePose = {}) {
  const look = typeof lookKey === "string" ? LOOKS[lookKey] : lookKey;
  const J = sideJoints(x, y, H, p), u = H, L = J.local;
  c.save(); c.translate(x, y); c.scale(J.d, 1); c.fillStyle = fill; c.strokeStyle = fill; c.lineCap = "round"; c.lineJoin = "round";
  const th = look.thin ? 0.88 : 1;
  const legW = 0.032 * u * th, shinW = 0.024 * u * th;
  const drawLeg = (Lg: typeof L.LF) => {
    limb(c, L.hip, Lg.k, legW, legW * 0.85); limb(c, Lg.k, Lg.a, shinW, shinW * 0.75);
    c.save(); c.translate(Lg.a[0], Lg.a[1]); c.rotate(-Lg.ft);
    // foot pivots near the heel; sandal/foot profile with a little arch
    c.beginPath(); c.moveTo(-0.024 * u, -0.014 * u); c.quadraticCurveTo(0.02 * u, -0.02 * u, 0.06 * u, -0.006 * u); c.quadraticCurveTo(0.088 * u, 0.0, 0.082 * u, 0.012 * u);
    c.lineTo(0.03 * u, 0.016 * u); c.quadraticCurveTo(0.0, 0.01 * u, -0.026 * u, 0.016 * u); c.closePath(); c.fill(); c.restore();
  };
  const torchSide = L.torchSide;
  const drawArm = (A: typeof L.AF, g: Grip, which: "F" | "B") => {
    limb(c, L.sh, A.el, 0.022 * u * th, 0.018 * u * th); limb(c, A.el, A.ha, 0.017 * u * th, 0.0125 * u * th);
    if (torchSide === which && L.lensL) { drawHand(c, u, A.ha, A.f, "torch", L.settle, "back"); drawTorch(c, L.lensL, A.f, 0.12 * u, fill, p.torchOn ?? 0); drawHand(c, u, A.ha, A.f, "torch", L.settle, "front"); }
    else drawHand(c, u, A.ha, A.f, g, L.settle, g === "glass" ? "back" : "all");
  };
  drawArm(L.AF, J.gripF, "F"); drawLeg(L.LF);
  // torso: chest front / back, belly; sitting adds a slouched back curve
  const sh = L.sh, hp = L.hip, b = (look.belly ?? 0) * u;
  const slouch = p.sit !== undefined ? 0.012 * u : 0;
  c.beginPath();
  c.moveTo(sh[0] - 0.045 * u, sh[1] - 0.004 * u);
  c.quadraticCurveTo(sh[0] + 0.01 * u, sh[1] - 0.03 * u, sh[0] + 0.05 * u, sh[1] + 0.01 * u);
  c.quadraticCurveTo(sh[0] + 0.07 * u + b, (sh[1] + hp[1]) / 2, hp[0] + 0.055 * u + b, hp[1] - 0.02 * u);
  c.lineTo(hp[0] + 0.05 * u, hp[1] + 0.03 * u); c.lineTo(hp[0] - 0.065 * u, hp[1] + 0.03 * u);
  c.quadraticCurveTo(hp[0] - 0.072 * u - slouch, (sh[1] + hp[1]) / 2 - slouch, sh[0] - 0.045 * u, sh[1] - 0.004 * u); c.closePath(); c.fill();
  if (look.jacket) { c.beginPath(); c.moveTo(hp[0] + 0.058 * u, hp[1] + 0.025 * u); c.lineTo(hp[0] + 0.064 * u, hp[1] + 0.06 * u); c.lineTo(hp[0] - 0.07 * u, hp[1] + 0.06 * u); c.lineTo(hp[0] - 0.068 * u, hp[1] + 0.025 * u); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(sh[0] + 0.04 * u, sh[1] - 0.01 * u); c.lineTo(sh[0] + 0.062 * u, sh[1] - 0.034 * u); c.lineTo(sh[0] + 0.03 * u, sh[1] - 0.026 * u); c.closePath(); c.fill(); } // collar
  limb(c, sh, L.neck, 0.022 * u, 0.019 * u);
  c.save(); c.translate(L.head[0], L.head[1]); headProfile(c, u, look, p.jaw ?? 0, L.headPitch); c.restore();
  // throat/collar filler: closes the background sliver between the chin and the chest (QA catch)
  c.beginPath(); c.moveTo(L.neck[0] - 0.02 * u, L.neck[1] - 0.01 * u); c.lineTo(L.head[0] + 0.03 * u, L.head[1] + 0.045 * u);
  c.quadraticCurveTo(sh[0] + 0.05 * u, sh[1] - 0.01 * u, sh[0] + 0.045 * u, sh[1] + 0.02 * u); c.lineTo(sh[0] - 0.03 * u, sh[1] + 0.01 * u); c.closePath(); c.fill();
  if (look.sarung) { // sarung draped over the shoulders; its hem sways
    const sw = L.sarungSway;
    c.beginPath(); c.moveTo(L.neck[0] - 0.03 * u, L.neck[1] + 0.005 * u);
    c.quadraticCurveTo(sh[0] + 0.075 * u, sh[1] - 0.02 * u, sh[0] + 0.08 * u, sh[1] + 0.06 * u);
    c.quadraticCurveTo(hp[0] + 0.09 * u + b + sw, (sh[1] + hp[1]) / 2 + 0.05 * u, hp[0] + 0.075 * u + b + sw, hp[1] + 0.07 * u);
    c.lineTo(hp[0] + 0.02 * u + sw * 0.6, hp[1] + 0.085 * u); c.lineTo(hp[0] - 0.085 * u + sw * 0.4, hp[1] + 0.07 * u);
    c.quadraticCurveTo(sh[0] - 0.085 * u, sh[1] + 0.02 * u, L.neck[0] - 0.03 * u, L.neck[1] + 0.005 * u); c.closePath(); c.fill();
  }
  drawLeg(L.LB); drawArm(L.AB, J.gripB, "B");
  c.restore();
  return J;
}

/** SYMMETRIC flashlight. `lens` = point of the lens, ang = direction (angle from down, + toward +x). Drawn about its own axis. */
export function drawTorch(c: C2, lens: P2, ang: number, L: number, fill: string, glow = 0) {
  c.save(); c.translate(lens[0], lens[1]); c.rotate(-ang + Math.PI / 2); // local +x = beam direction
  const r = 0.11 * L;
  const half: P2[] = [[-L, r * 0.9], [-L * 0.95, r], [-L * 0.3, r], [-L * 0.22, r * 1.55], [0, r * 1.55]]; // one half, mirrored below
  c.fillStyle = fill; c.beginPath(); c.moveTo(half[0][0], 0);
  half.forEach(([px, py]) => c.lineTo(px, py)); [...half].reverse().forEach(([px, py]) => c.lineTo(px, -py)); c.closePath(); c.fill();
  c.strokeStyle = fill; c.lineWidth = r * 0.25; for (const gx of [-0.92, -0.86]) { c.beginPath(); c.moveTo(gx * L, -r * 1.05); c.lineTo(gx * L, r * 1.05); c.stroke(); } // tail rings (symmetric)
  if (glow > 0.01) { c.fillStyle = `rgba(255,244,214,${glow})`; c.beginPath(); c.ellipse(0, 0, r * 0.35, r * 1.45, 0, 0, TAU); c.fill(); }
  c.restore();
}
/** cone light for a torch held by a figure: origin at the lens, along the torch axis */
export function torchCone(J: Joints, len: number, w: number, i: number, col: [number, number, number], beam = 0.8) {
  if (!J.lens) return null;
  const a = J.torchAng; return { k: "cone" as const, ox: J.lens[0], oy: J.lens[1], tx: J.lens[0] + Math.sin(a) * len, ty: J.lens[1] + Math.cos(a) * len, w, r: w * 1.15, i, col, beam };
}
/** SYMMETRIC petromaks (pressure lamp). (x,y) = hook point at the top; size = total height. mantle glows. */
export function petromaks(c: C2, x: number, y: number, size: number, fill: string, glow: number, paper: string) {
  const s = size; c.save(); c.translate(x, y); c.fillStyle = fill; c.strokeStyle = fill; c.lineWidth = s * 0.02;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, s * 0.08); c.stroke();                         // hook
  const sym = (pts: P2[]) => { c.beginPath(); c.moveTo(0, pts[0][1]); pts.forEach(([px, py]) => c.lineTo(px, py)); [...pts].reverse().forEach(([px, py]) => c.lineTo(-px, py)); c.closePath(); c.fill(); };
  sym([[0.04 * s, 0.08 * s], [0.22 * s, 0.16 * s], [0.24 * s, 0.2 * s], [0.08 * s, 0.22 * s]]);          // hood
  c.fillStyle = paper; c.globalAlpha = 0.35 + 0.65 * glow; sym([[0.1 * s, 0.22 * s], [0.13 * s, 0.3 * s], [0.13 * s, 0.44 * s], [0.1 * s, 0.48 * s]]); c.globalAlpha = 1; // glass globe
  c.fillStyle = `rgba(255,250,225,${0.4 + 0.6 * glow})`; c.beginPath(); c.ellipse(0, 0.35 * s, 0.045 * s, 0.06 * s, 0, 0, TAU); c.fill(); // mantle
  c.fillStyle = fill; for (const gx of [-0.13, 0.13]) c.fillRect(gx * s - 0.008 * s, 0.22 * s, 0.016 * s, 0.26 * s); // cage bars, mirrored
  sym([[0.1 * s, 0.48 * s], [0.2 * s, 0.56 * s], [0.22 * s, 0.86 * s], [0.18 * s, 0.94 * s], [0.06 * s, 1.0 * s]]); // fuel tank
  c.restore();
}
/** SYMMETRIC clear coffee glass. (x,y) = bottom centre, h = height, level 0..1 of coffee, steam animated by t */
export function coffeeGlass(c: C2, x: number, y: number, h: number, level: number, t: number, ink: string, glass: string, coffee: string, steam = 1, seed = 0) {
  const wB = 0.34 * h, wT = 0.42 * h; c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(-wB, 0); c.lineTo(-wT, -h); c.lineTo(wT, -h); c.lineTo(wB, 0); c.closePath(); c.fillStyle = glass; c.fill();
  if (level > 0.01) { const lh = h * 0.9 * level, wl = wB + (wT - wB) * (lh / h); c.beginPath(); c.moveTo(-wB + 2, -2); c.lineTo(-wl + 2, -lh); c.lineTo(wl - 2, -lh); c.lineTo(wB - 2, -2); c.closePath(); c.fillStyle = coffee; c.fill(); }
  c.strokeStyle = ink; c.lineWidth = Math.max(1.5, h * 0.035); c.beginPath(); c.moveTo(-wB, 0); c.lineTo(-wT, -h); c.moveTo(wT, -h); c.lineTo(wB, 0); c.lineTo(-wB, 0); c.stroke();
  c.beginPath(); c.ellipse(0, -h, wT, wT * 0.18, 0, 0, TAU); c.stroke();
  if (steam > 0.01 && level > 0.05) { // two mirrored wisps drifting up
    c.strokeStyle = `rgba(235,228,212,${0.45 * steam})`; c.lineWidth = h * 0.06;
    for (const sd of [-1, 1]) { c.beginPath(); for (let k = 0; k < 22; k++) { const yy = -h - k * h * 0.07, xx = sd * h * 0.12 + Math.sin(k * 0.45 + t * 1.6 + seed + sd) * h * 0.12 * (k / 22); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.globalAlpha = 1; c.stroke(); }
  }
  c.restore();
}
/** SYMMETRIC kentongan (hollow log slit drum) hanging from a rope at (x,y) top */
export function kentongan(c: C2, x: number, y: number, len: number, fill: string, swing = 0) {
  c.save(); c.translate(x, y); c.rotate(swing); c.strokeStyle = fill; c.lineWidth = len * 0.03; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, len * 0.2); c.stroke();
  c.fillStyle = fill; const r = len * 0.16; c.beginPath(); c.moveTo(-r, len * 0.24); c.quadraticCurveTo(-r * 1.15, len * 0.62, -r, len); c.lineTo(r, len); c.quadraticCurveTo(r * 1.15, len * 0.62, r, len * 0.24); c.closePath(); c.fill();
  c.globalCompositeOperation = "destination-out"; c.fillRect(-r * 0.12, len * 0.38, r * 0.24, len * 0.48); c.globalCompositeOperation = "source-over";
  c.restore();
}
