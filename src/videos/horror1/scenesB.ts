// Shots 7-12 of "Dipanggil Dua Kali" part 1 (v2: calm, smooth, synced to timeline.json).
import { C2, Pal, box, cut, figure, profile, gedek, plaster, cracks, rough, rrect, castShadow, vnoise, clamp, ss, lerp } from "./paint";
import { Shot, Layer, Light, SHOT_RANGE, CUE, TL, stirPhase, heartPulse, breathPhase, flick, move, settle, SIZE, W, H, TORCH, STOVE, RED, MOON } from "./types";

// ---------- sync helpers
/** stir phase that freezes at the end of its range (arm holds still after the spoon stops) */
const stirHold = (t: number) => {
  const s = stirPhase(t); if (s !== null) return s;
  let last = 0;
  for (const [a, b] of TL.stir.ranges) if (t >= b) last = (2 * Math.PI * (b - a)) / TL.stir.period;
  return last;
};
const blurFg = (c: C2, L: Layer, fn: () => void) => { L(1.6); c.filter = "blur(6px)"; fn(); c.filter = "none"; };

// ---------- the corridor toward the kitchen (one-point perspective)
type HallOpt = { depth: number; t: number; stir: number; gap: number; ghost: number; red: boolean };
function hallGeom(depth: number) {
  const vx = W / 2, vy = 880, dw = 230 * depth, dh = 420 * depth;
  const L = vx - dw / 2, R = vx + dw / 2, T = vy - dh / 2 - 40 * depth, B = vy + dh / 2 + 10 * depth;
  return { vx, vy, dw, dh, L, R, T, B, stoveX: L + dw * 0.76, stoveY: B - dh * 0.3 };
}
function hallway(c: C2, p: Pal, Lay: Layer, o: HallOpt) {
  const g = hallGeom(o.depth), { vx, dw, dh, L, R, T, B } = g;
  Lay(0.6);
  c.fillStyle = p.wall2; c.fillRect(-60, -60, W + 120, H + 120);
  // floor
  rough(c, [[-60, H + 60], [W + 60, H + 60], [R, B], [L, B]], true, 2, 7); cut(c, p, p.wood, { hatch: 0.75, dir: 1.57, bbox: [0, B, W, H - B], seed: 8 });
  if (p.mode === "lit") { c.strokeStyle = p.ink; c.lineWidth = 2; for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(vx + k * 18 * o.depth, B); c.lineTo(vx + k * 260, H + 60); c.stroke(); } }
  // ceiling
  rough(c, [[-60, -60], [W + 60, -60], [R, T], [L, T]], true, 2, 9); cut(c, p, p.wood2, { hatch: 0.9, dir: 1.57, bbox: [0, 0, W, T], seed: 10 });
  // side walls (gedek)
  c.save(); rough(c, [[-60, -60], [L, T], [L, B], [-60, H + 60]], true, 1, 11); c.clip(); gedek(c, p, -60, -60, L + 62, H + 120); c.restore();
  c.save(); rough(c, [[W + 60, -60], [R, T], [R, B], [W + 60, H + 60]], true, 1, 12); c.clip(); gedek(c, p, R - 2, -60, W - R + 62, H + 120); c.restore();
  // Ibu's room door on the left wall, ajar: a black gap that widens shot by shot (rewatch detail)
  const f0 = 0.42, f1 = 0.62;
  const dx0 = lerp(-60, L, f0), dx1 = lerp(-60, L, f1);
  const yt0 = lerp(-60, T, f0) + 120, yt1 = lerp(-60, T, f1) + 80, yb0 = lerp(H + 60, B, f0), yb1 = lerp(H + 60, B, f1);
  rough(c, [[dx0, yt0], [dx1, yt1], [dx1, yb1], [dx0, yb0]], true, 2, 13); cut(c, p, p.wood2, { edge: 4, hatch: 0.5, dir: 0.4, bbox: [dx0, yt0, dx1 - dx0, yb0 - yt0], seed: 14 });
  const gx = lerp(dx0, dx1, 1 - o.gap);
  c.fillStyle = p.mode === "lit" ? "#0e0806" : "#010205";
  rough(c, [[gx, lerp(yt0, yt1, 1 - o.gap)], [dx1, yt1], [dx1, yb1], [gx, lerp(yb0, yb1, 1 - o.gap)]], true, 1, 15); c.fill();
  if (o.ghost > 0.01 && p.mode === "dark") { // someone standing in the gap, very still, barely there
    c.globalAlpha = o.ghost * 0.55; figure(c, "ibu", (gx + dx1) / 2 + 4, yb1 - 10, (yb1 - yt1) * 0.86, "#1b2338", { turn: 0 }); c.globalAlpha = 1;
  }
  // beams receding
  c.strokeStyle = p.ink; c.lineWidth = 6;
  for (let k = 0; k < 4; k++) { const f = 0.25 + k * 0.22; const xl = lerp(-60, L, f), xr = lerp(W + 60, R, f), yt = lerp(-60, T, f), yb = lerp(H + 60, B, f); c.beginPath(); c.moveTo(xl, yb); c.lineTo(xl, yt); c.lineTo(xr, yt); c.lineTo(xr, yb); c.stroke(); }
  // kitchen interior
  Lay(1);
  c.fillStyle = p.mode === "lit" ? (o.red ? "#d99a80" : "#d9b48a") : "#1a0d0a"; c.fillRect(L, T, dw, B - T);
  box(c, p, L + dw * 0.55, B - dh * 0.32, dw * 0.42, dh * 0.32, p.wood2, 0.4, 16, 0.8, 2); // tungku
  c.fillStyle = p.mode === "lit" ? "#2a1a10" : "#050304"; c.beginPath(); c.ellipse(L + dw * 0.76, B - dh * 0.33, dw * 0.13, dh * 0.03, 0, 0, Math.PI * 2); c.fill(); // pot
  const fx = L + dw * 0.52, fh = dh * 0.62;
  const kitchenFig = (fill: string) => figure(c, "ibu", fx, B, fh, fill, { stir: o.stir, bend: 0.12, breath: o.t * 1.9 });
  // the stove throws her shadow long, out of the doorway, across the corridor floor toward us
  castShadow(c, p, g.stoveX, g.stoveY, 1.8, kitchenFig, 0.5, 12);
  kitchenFig(p.mode === "lit" ? "#120b08" : "#000");
  c.lineWidth = 10 * o.depth + 4; c.strokeStyle = p.mode === "lit" ? p.wood2 : "#05070c"; c.strokeRect(L, T, dw, B - T);
}

// ---------- shots
const [chA, chB] = SHOT_RANGE("clockhall");
const [kcA, kcB] = SHOT_RANGE("kitchencall");
const [bcA, bcB] = SHOT_RANGE("bayuclose");
const [whA, whB] = SHOT_RANGE("wallhand");
const [spA, spB] = SHOT_RANGE("split");
const [enA, enB] = SHOT_RANGE("end");
const clockEnd = CUE("clockEnd"), kitchenCall = CUE("kitchenCall"), torchDim = CUE("torchDim"), clue = CUE("clue");
const pressFrom = CUE("handPressFrom"), pressTo = CUE("handPressTo"), whisperWall = CUE("whisperWall");
const stopStir = CUE("stopStir"), splitTake = CUE("splitTake"), turnFrom = CUE("turnFrom"), turnTo = CUE("turnTo"), smash = CUE("smash");
const tick0 = TL.clockTicks[0];
const ghostAt = (t: number) => 0.55 * ss(37.1, 37.3, t) * (1 - ss(37.7, 37.9, t));
const hallDepth = (t: number) => move(t, clockEnd, chB, 1.0, 1.32);

export const SHOTS_B: Shot[] = [
  { // clock 00:13, then the corridor: someone at the stove, stirring
    name: "clockhall", a: chA, b: chB, dust: 0.6,
    draw: (c, p, u, t, L) => {
      if (t < clockEnd) {
        L(0.6); plaster(c, p, -60, -60, W + 120, H + 120, 0.05, 15);
        L(1);
        box(c, p, 270, 380, 540, 1180, p.wood2, 0.55, 91, 0.8, 6);
        c.fillStyle = p.cloth; c.beginPath(); c.arc(540, 690, 220, 0, 7); c.fill(); c.strokeStyle = p.ink; c.lineWidth = 8; c.stroke();
        c.lineWidth = 6; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.beginPath(); c.moveTo(540 + Math.sin(a) * 190, 690 - Math.cos(a) * 190); c.lineTo(540 + Math.sin(a) * 165, 690 - Math.cos(a) * 165); c.stroke(); }
        const hand = (a: number, len: number, w: number) => { c.lineWidth = w; c.beginPath(); c.moveTo(540, 690); c.lineTo(540 + Math.sin(a) * len, 690 - Math.cos(a) * len); c.stroke(); };
        hand(0.02, 120, 14); hand((13 / 60) * Math.PI * 2, 170, 9);
        // second hand: steps exactly on the tick seconds, tiny settle wobble after each step
        const k = Math.floor(t - tick0), q = t - tick0 - k;
        const wob = q < 0.12 ? 0.035 * Math.sin((q / 0.12) * Math.PI * 2) * (1 - q / 0.12) : 0;
        c.strokeStyle = "#b3121a"; hand(((k + 12) / 60) * Math.PI * 2 + wob, 180, 3);
        c.fillStyle = p.ink; c.beginPath(); c.arc(540, 690, 10, 0, 7); c.fill();
        const sw = 0.3 * Math.sin((t - tick0) * Math.PI); c.save(); c.translate(540, 960); c.rotate(sw); c.strokeStyle = p.ink; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 420); c.stroke(); c.fillStyle = p.wood; c.beginPath(); c.arc(0, 430, 60, 0, 7); c.fill(); c.stroke(); c.restore();
        blurFg(c, L, () => { c.fillStyle = p.fig; c.fillRect(-80, -60, 150, H + 120); }); // door-frame edge
      } else {
        hallway(c, p, L, { depth: hallDepth(t), t, stir: stirHold(t), gap: 0.25, ghost: ghostAt(t), red: false });
        blurFg(c, L, () => { c.fillStyle = p.fig; rough(c, [[W - 110, -60], [W + 60, -60], [W + 60, H + 60], [W - 60, H + 60]], true, 4, 17); c.fill(); }); // hanging cloth at the right edge
      }
    },
    lights: (u, t): Light[] => t < clockEnd ? [{ k: "spot", x: 540, y: 760, r: 560, i: flick(t), col: TORCH }]
      : (() => { const g = hallGeom(hallDepth(t)); return [
        { k: "cone", ox: 540, oy: 1980, tx: 540, ty: 1340, w: 420, r: 300, i: 0.9 * flick(t), col: TORCH, beam: 0.75 },
        { k: "spot", x: g.stoveX - 40, y: g.stoveY - 60, r: 420 * g.dw / 230 * 0.9 + 120, i: 0.95 * (0.88 + 0.12 * vnoise(t * 3)), col: STOVE }] as Light[]; })(),
    amb: () => 0.03,
    cam: (u, t) => t < clockEnd ? { z: move(t, chA, clockEnd, 1.04, 1.12), cx: 540, cy: 760, rot: 0 } : { z: move(t, clockEnd, chB, 1.04, 1.1), cx: 540, cy: 940, rot: 0 },
  },
  { // the kitchen calls: "Le... ambilin air." She stops stirring and stands still.
    name: "kitchencall", a: kcA, b: kcB, tint: "red", dust: 0.5,
    draw: (c, p, u, t, L) => {
      hallway(c, p, L, { depth: 1.5, t, stir: stirHold(t), gap: 0.45, ghost: 0, red: true });
      blurFg(c, L, () => { c.fillStyle = p.fig; c.fillRect(-70, -60, 140, H + 120); }); // left door-frame edge
    },
    lights: (u, t) => { const g = hallGeom(1.5); return [
      { k: "cone", ox: 540, oy: 1980, tx: 540, ty: 1300, w: 380, r: 260, i: 0.75 * flick(t, [torchDim]), col: TORCH, beam: 0.8 },
      { k: "spot", x: g.stoveX - 50, y: g.stoveY - 80, r: 560, i: 1.1, col: RED }] as Light[]; },
    amb: () => 0.02, cam: (u, t) => ({ z: move(t, kcA, kcB, 1.04, 1.16), cx: 560, cy: 880, rot: 0 }),
  },
  { // Bayu's profile; he says he only almost answered, but his lips part at the clue
    name: "bayuclose", a: bcA, b: bcB,
    draw: (c, p, u, t, L) => {
      L(0.6); gedek(c, p, -60, -60, W + 120, H + 120);
      // window with moon
      c.fillStyle = p.mode === "dark" ? "#22365a" : p.sky; c.fillRect(600, 200, 380, 460);
      if (p.mode === "dark") { const g = c.createRadialGradient(866, 338, 4, 866, 338, 190); g.addColorStop(0, "rgba(220,230,255,0.95)"); g.addColorStop(0.15, "rgba(200,215,255,0.5)"); g.addColorStop(1, "rgba(60,90,150,0)"); c.fillStyle = g; c.fillRect(600, 200, 380, 460); }
      c.fillStyle = p.ink; for (let i = 1; i < 5; i++) c.fillRect(600 + (380 * i) / 5 - 5, 200, 10, 460);
      c.lineWidth = 14; c.strokeStyle = p.mode === "dark" ? "#0a0f1a" : p.wood2; c.strokeRect(600, 200, 380, 460);
      L(1);
      const bp = breathPhase(t), ch = Math.max(0, Math.sin(bp)) * 6 - 1; // chest rises in the first half of each cycle
      const jaw = settle(t, clue, clue + 0.18, 0, 1, 0.05) * (1 - move(t, clue + 1.0, clue + 1.25, 0, 1));
      c.fillStyle = p.fig; c.beginPath(); c.moveTo(80, 2000); c.bezierCurveTo(120, 1500 - ch, 300, 1380 - ch, 420, 1360 - ch); c.lineTo(640, 1380 - ch); c.bezierCurveTo(760, 1440 - ch, 860, 1600, 900, 2000); c.closePath(); c.fill();
      profile(c, 360, 940 - ch * 0.5, 820, p.fig, { jaw, hair: "boy", rot: -0.06 + 0.01 * Math.sin(bp) });
      // hand + torch, a slow nervous tremor (not jitter)
      const hx = 820 + 4 * Math.sin(t * 7.1), hy = 1500 + 3 * Math.sin(t * 5.3);
      c.fillStyle = p.fig; c.beginPath(); c.ellipse(hx, hy, 60, 44, -0.4, 0, Math.PI * 2); c.fill();
      box(c, p, hx - 150, hy - 34, 140, 52, p.mode === "lit" ? "#9a9a92" : "#141a28", 0.4, 97, 1.57, 3);
      blurFg(c, L, () => { // blanket edge + bed post in the foreground
        rough(c, [[-80, 1720], [1160, 1680], [1160, 2000], [-80, 2000]], true, 5, 95); c.fillStyle = p.mode === "lit" ? p.cloth : p.cloth; c.fill();
        c.fillStyle = p.fig; c.fillRect(960, 980, 90, 1100);
      });
    },
    lights: (u, t) => [
      { k: "cone", ox: 680, oy: 1500, tx: 90 + 12 * Math.sin(t * 1.3), ty: 1250 + 18 * Math.sin(t * 0.9), w: 280, r: 340, i: 0.95 * flick(t, [clue + 0.4]), col: TORCH, beam: 0.85 },
      { k: "spot", x: 790, y: 430, r: 700, i: 0.55, col: MOON }],
    amb: () => 0.03,
    cam: (u, t) => ({ z: move(t, bcA, bcB, 1.04, 1.14) + 0.02 * heartPulse(t), cx: 540, cy: 900, rot: 0 }),
  },
  { // the wall between the rooms: a hand presses from the other side, cracks spread, then the whisper
    name: "wallhand", a: whA, b: whB, dust: 0.6,
    draw: (c, p, u, t, L) => {
      L(1);
      const press = move(t, pressFrom, pressTo, 0, 1) * (1 + 0.04 * Math.sin(t * 1.6));
      plaster(c, p, -60, -60, W + 120, H + 120, 0.1 + 0.7 * move(t, pressFrom + 1.0, whisperWall + 0.6, 0, 1), 27);
      if (press > 0.01 && p.mode === "lit") {
        c.save(); c.translate(540, 980); c.scale(1 + 0.08 * press, 1 + 0.08 * press);
        const g = c.createRadialGradient(-30, -40, 10, 0, 0, 260); g.addColorStop(0, `rgba(255,248,230,${0.6 * press})`); g.addColorStop(0.6, `rgba(60,40,20,${0.25 * press})`); g.addColorStop(1, "rgba(60,40,20,0)");
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 40, 150, 180, 0, 0, 7); c.fill();
        c.strokeStyle = `rgba(22,14,10,${0.8 * press})`; c.lineWidth = 5;
        const fingers: [number, number, number][] = [[-120, -40, -0.5], [-70, -180, -0.15], [-5, -215, 0], [60, -190, 0.12], [115, -120, 0.35]];
        for (const [fx, fy, a] of fingers) { c.save(); c.translate(fx, fy); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 26, 78, 0, 0, 7); c.fillStyle = `rgba(255,246,225,${0.45 * press})`; c.fill(); c.stroke(); c.restore(); }
        c.beginPath(); c.ellipse(0, 40, 150, 180, 0, 0, 7); c.stroke();
        c.restore();
        cracks(c, p, 540, 900, press, 77, 1100);
      }
      blurFg(c, L, () => { c.fillStyle = p.fig; c.beginPath(); c.moveTo(W - 40, H + 60); c.lineTo(W - 40, 1380); c.quadraticCurveTo(W + 20, 1300, W + 80, 1320); c.lineTo(W + 80, H + 60); c.fill(); }); // chair back, bottom right
    },
    lights: (u, t) => [{ k: "spot", x: 540 + 22 * Math.sin(t * 0.7), y: 960 + 12 * Math.sin(t * 0.5), r: 640, i: flick(t, [whisperWall - 0.15]), col: TORCH }],
    amb: () => 0.025, cam: (u, t) => ({ z: move(t, whA, whB, 1.04, 1.16), cx: 540, cy: 980, rot: 0 }),
  },
  { // split: the too-tall one in the room | the one in the kitchen. The kitchen takes over, stops, turns.
    name: "split", a: spA, b: spB, tint: "blue",
    draw: (c, p, u, t, L) => {
      const take = move(t, splitTake, splitTake + 1.8, 0, 1), mid = lerp(540, -60, take);
      // LEFT: Ibu's room, door wide open, a figure too tall for the ceiling
      c.save(); L(1); rough(c, [[-60, -60], [mid + 30, -60], [mid - 30, H + 60], [-60, H + 60]], true, 6, 101); c.clip();
      L(0.6); gedek(c, p, -60, -60, W + 120, H + 120); box(c, p, -60, 1500, W + 120, 480, p.wood, 0.8, 102, 1.57, 0);
      L(1);
      rrect(c, 20, 420, 470, 1080, 103); cut(c, p, p.mode === "lit" ? "#2a1d14" : "#03050a", { edge: 8 });
      const tallH = 0.62 * H, tilt = 0.55 + 0.06 * Math.sin(t * 0.45);
      const tallFig = (fill: string) => figure(c, "tall", 255, 1500, tallH, fill, { neck: 18, bend: -0.04, turn: tilt, breath: t * 1.3 });
      castShadow(c, p, 120, 300, 1.35, tallFig, 0.5, 14); // moonlight throws it up the wall
      tallFig(p.fig);
      c.restore();
      // RIGHT: the kitchen
      c.save(); L(1); rough(c, [[mid + 30, -60], [W + 60, -60], [W + 60, H + 60], [mid - 30, H + 60]], true, 6, 104); c.clip();
      L(0.6); c.fillStyle = p.mode === "lit" ? "#d8b089" : "#120808"; c.fillRect(-60, -60, W + 120, H + 120);
      L(1);
      box(c, p, lerp(600, 520, take), 1180, lerp(420, 520, take), 360, p.wood2, 0.5, 105, 0.8, 4);
      c.fillStyle = p.mode === "lit" ? "#1d120c" : "#020102"; c.beginPath(); c.ellipse(lerp(810, 780, take), 1170, 120, 34, 0, 0, 7); c.fill();
      const turnK = settle(t, turnFrom, turnTo, 0, 1, 0.05);
      const turn = turnK * Math.PI * 0.9, eyes = ss(0.6, 1.0, turnK) * 0.9;
      figure(c, "ibu", lerp(760, 470, take), 1540, lerp(SIZE.medium * 0.92, SIZE.medium * 1.18, take), p.fig, { stir: stirHold(t), turn, bend: 0.12 * (1 - move(t, stopStir, stopStir + 0.6, 0, 1)), eyes, breath: t * 1.7 });
      c.restore();
      // the jagged ink seam
      L(1);
      if (take < 0.98) { c.strokeStyle = "#000"; c.lineWidth = 14; rough(c, [[mid + 30, -60], [mid - 30, H + 60]], false, 10, 106); c.stroke(); }
      blurFg(c, L, () => { c.fillStyle = p.fig; c.fillRect(W - 60, -60, 140, H + 120); }); // right door-frame edge
    },
    lights: (u, t) => {
      const take = move(t, splitTake, splitTake + 1.8, 0, 1), mid = lerp(540, -60, take);
      return [
        { k: "spot", x: lerp(250, -200, take), y: 800, r: 560, i: 1.0 * flick(t), col: MOON },
        { k: "spot", x: lerp(800, 720, take), y: 1100, r: lerp(480, 700, take), i: 1.0 * (0.88 + 0.12 * vnoise(t * 3)), col: t > turnTo - 0.2 ? RED : STOVE },
        { k: "cone", ox: mid + 220, oy: 1980, tx: lerp(250, 560, take), ty: 980, w: 260, r: 300, i: 0.7 * flick(t) * (1 - 0.6 * take), col: TORCH, beam: 0.7 }] as Light[];
    },
    amb: () => 0.03,
    cam: (u, t) => ({ z: move(t, spA, spB, 1.04, 1.1) + 0.06 * move(t, turnTo - 0.4, smash, 0, 1), cx: 600, cy: 1000, rot: 0.012 * move(t, turnTo - 0.4, smash, 0, 1) }),
  },
  { // end card (drawn by the engine overlay)
    name: "end", a: enA, b: enB,
    draw: (c, p, u, t, L) => { L(1); c.fillStyle = "#000"; c.fillRect(-200, -200, W + 400, H + 400); },
    lights: () => [], amb: () => 0, cam: () => ({ z: 1.04, cx: 540, cy: 960, rot: 0 }),
  },
];
