// Shots A (wall, title, bedroom, photo, exterior, flashback). Times from timeline.json via types.ts.
import { C2, Pal, box, cut, figure, profile, gedek, plaster, castShadow, rough, rrect, clamp } from "./paint";
import { Shot, Layer, SHOT_RANGE, CUE, W, H, WARM, TORCH, RED, MOON, flick, move, settle, SIZE } from "./types";

const rng = (n: string) => SHOT_RANGE(n);
const cam = (name: string, z0: number, z1: number, cx0: number, cy0: number, cx1 = cx0, cy1 = cy0) => {
  const [a, b] = rng(name);
  return (_u: number, t: number) => ({ z: move(t, a, b, z0, z1), cx: move(t, a, b, cx0, cx1), cy: move(t, a, b, cy0, cy1), rot: 0 });
};
/** dark out-of-focus foreground silhouette */
const fg = (c: C2, p: Pal, L: Layer, fn: () => void) => { L(1.6); c.save(); c.filter = "blur(6px)"; c.fillStyle = p.fig; c.strokeStyle = p.fig; fn(); c.restore(); c.filter = "none"; };

function windowBars(c: C2, p: Pal, x: number, y: number, w: number, h: number) {
  c.fillStyle = p.mode === "dark" ? "#22365a" : p.sky; c.fillRect(x, y, w, h);
  if (p.mode === "dark") { const g = c.createRadialGradient(x + w * 0.7, y + h * 0.3, 4, x + w * 0.7, y + h * 0.3, w * 0.5); g.addColorStop(0, "rgba(220,230,255,0.95)"); g.addColorStop(0.15, "rgba(200,215,255,0.5)"); g.addColorStop(1, "rgba(60,90,150,0)"); c.fillStyle = g; c.fillRect(x, y, w, h); }
  c.fillStyle = p.ink; for (let i = 1; i < 5; i++) c.fillRect(x + (w * i) / 5 - 5, y, 10, h);
  c.lineWidth = 14; c.strokeStyle = p.mode === "dark" ? "#0a0f1a" : p.wood2; c.strokeRect(x, y, w, h);
}

const [WA, WB] = rng("wall"), [TA, TB] = rng("title"), [BA, BB] = rng("bedroom"), [PA, PB] = rng("photo"), [EA, EB] = rng("exterior"), [FA, FB] = rng("flashback");

// bedroom staging (shared by draw + lights)
const BED_TORCH = { ox: 610, oy: 1300 };
const bedSweep = (t: number) => move(t, CUE("torchClickBed") + 0.6, CUE("torchHitsDoor"), 0, 1);
const bedTarget = (t: number) => { const s = bedSweep(t); return { tx: 860 + (250 - 860) * s, ty: 560 + (900 - 560) * s }; };

export const SHOTS_A: Shot[] = [
  { // 1 cold open: the wall whispers
    name: "wall", a: WA, b: WB,
    draw: (c, p, u, t, L) => {
      L(0.6); plaster(c, p, 0, 0, W, H, move(t, WA, WB, 0.12, 0.55), 3);
      fg(c, p, L, () => { c.fillRect(-60, 0, 150, H); }); // door-frame edge, left
    },
    lights: (u, t) => [{ k: "spot", x: W / 2 + 30 * Math.sin(t * 0.9), y: 900, r: 640, i: clamp((t - CUE("torchOnWall")) / 0.25) * flick(t) * 0.95, col: TORCH }],
    amb: () => 0.02, cam: cam("wall", 1.04, 1.13, 540, 920),
  },
  { // 2 title: engine draws the text on black
    name: "title", a: TA, b: TB,
    draw: (c) => { c.fillStyle = "#000"; c.fillRect(-W, -H, 3 * W, 3 * H); },
    lights: () => [], amb: () => 0, cam: () => ({ z: 1.03, cx: 540, cy: 960, rot: 0 }),
  },
  { // 3 bedroom: Ibu never says my name
    name: "bedroom", a: BA, b: BB, dust: 0.6,
    draw: (c, p, u, t, L) => {
      L(0.6);
      gedek(c, p, -80, -80, W + 160, 1500);
      box(c, p, -80, 1420, W + 160, 600, p.wood, 0.8, 31, 1.57, 0);
      windowBars(c, p, 690, 330, 290, 360);
      rrect(c, 80, 520, 300, 900, 41); cut(c, p, p.mode === "lit" ? "#3a2a1c" : "#05070c", { edge: 8 });
      L(1);
      // second, barely-visible figure deep in the hallway: dark pass only, ~1 s when the torch first reaches the door
      const ghost = clamp((t - (CUE("torchHitsDoor") - 0.7)) / 0.3) * (1 - clamp((t - (CUE("torchHitsDoor") + 0.3)) / 0.4));
      if (p.mode === "dark" && ghost > 0.01) { c.globalAlpha = 0.5 * ghost; figure(c, "ibu", 300, 1250, 0.26 * H, "#000", { breath: t * 2.0 + 2 }); c.globalAlpha = 1; }
      // Ibu at the doorway (+ her giant torch shadow on the wall beside the door)
      const ibuIn = move(t, CUE("ibuAtDoor") - 0.8, CUE("ibuAtDoor") + 0.6, 0, 1) * (1 - move(t, BB - 1.2, BB - 0.3, 0, 1));
      const ibuTurn = settle(t, CUE("torchHitsDoor") + 0.2, CUE("torchHitsDoor") + 1.2, -0.15, 0.18);
      const drawIbu = (fill: string) => figure(c, "ibu", 230, 1415, 0.42 * H, fill, { turn: ibuTurn, breath: t * 2.0 + 0.7 });
      const lit = clamp(bedSweep(t) * 1.4 - 0.3);
      if (ibuIn > 0.01) {
        c.globalAlpha = ibuIn;
        castShadow(c, p, BED_TORCH.ox, BED_TORCH.oy, 1.6, drawIbu, 0.55 * lit, 12);
        drawIbu(p.fig);
        c.globalAlpha = 1;
      }
      // mattress + Bayu sitting up under the blanket, torch aimed at the door
      box(c, p, 400, 1500, 680, 70, p.cloth, 0.35, 21, 1.4);
      rough(c, [[880, 1478], [1040, 1470], [1050, 1520], [870, 1526]], true, 3, 4); cut(c, p, p.cloth, { edge: 3, hatch: 0.3, bbox: [870, 1470, 180, 56], dir: 1.2, seed: 5 });
      const s = bedSweep(t);
      figure(c, "bayu", 790, 1760, 0.4 * H * 1.45, p.fig, { arm: -1.0 + (-1.55 + 1.0) * s, elb: -0.15, armR: 0.25, turn: settle(t, CUE("torchClickBed"), CUE("torchClickBed") + 1.0, 0.1, -0.3), breath: t * 2.0 });
      rough(c, [[540, 1540], [700, 1480], [880, 1488], [1040, 1550], [1080, 1620], [520, 1630]], true, 4, 51); cut(c, p, p.cloth, { edge: 3, hatch: 0.5, dir: 1.2, bbox: [520, 1480, 560, 150], seed: 52 });
      // foreground: bed post right + curtain edge left
      fg(c, p, L, () => { c.fillRect(980, 1100, 70, 900); c.beginPath(); c.moveTo(-40, -40); c.quadraticCurveTo(110, 600, 30, 2000); c.lineTo(-40, 2000); c.fill(); });
    },
    lights: (u, t) => {
      const on = clamp((t - CUE("torchClickBed")) / 0.2);
      const { tx, ty } = bedTarget(t);
      return [{ k: "cone", ox: BED_TORCH.ox, oy: BED_TORCH.oy, tx, ty, w: 250, r: 380, i: 1.0 * on * flick(t), col: TORCH, beam: 0.8 },
              { k: "spot", x: 835, y: 470, r: 520, i: 0.25, col: MOON }];
    },
    amb: () => 0.04, cam: cam("bedroom", 1.1, 1.04, 560, 1120, 520, 1080),
  },
  { // 4 Mbah's photo, 40 days
    name: "photo", a: PA, b: PB, dust: 0.6,
    draw: (c, p, u, t, L) => {
      L(0.6); plaster(c, p, -80, -80, W + 160, H + 160, 0.1, 9);
      L(1);
      // tilted frame + faceless portrait + mourning ribbon
      c.save(); c.translate(460, 360); c.rotate(-0.035); c.translate(-460, -360);
      box(c, p, 250, 360, 420, 540, p.wood2, 0.5, 61, 0.8, 6);
      c.fillStyle = p.mode === "lit" ? "#d8c9a5" : "#101626"; c.beginPath(); c.ellipse(460, 630, 160, 220, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.beginPath(); c.ellipse(460, 630, 160, 220, 0, 0, Math.PI * 2); c.clip();
      figure(c, "mbah", 460, 1010, 620, p.fig, { turn: settle(t, CUE("photoTurn"), CUE("photoTurn") + 1.1, 0, 0.55, 0.05) }); c.restore();
      c.fillStyle = p.ink; rough(c, [[560, 360], [670, 360], [670, 470]], true, 2, 62); c.fill();
      c.restore();
      // table, flower glass, kemenyan burner + smoke
      box(c, p, 180, 1180, 720, 60, p.wood, 0.6, 63, 1.57);
      box(c, p, 260, 1240, 30, 420, p.wood2, 0.6, 64); box(c, p, 790, 1240, 30, 420, p.wood2, 0.6, 65);
      box(c, p, 640, 1060, 70, 120, p.glass, 0.25, 66, 0.8, 3);
      c.strokeStyle = p.mode === "lit" ? "#5c4a36" : "#1a2236"; c.lineWidth = 6; c.beginPath(); c.moveTo(675, 1060); c.quadraticCurveTo(650, 960, 690, 900); c.stroke();
      c.fillStyle = p.mode === "lit" ? "#c23a2a" : "#2a1418"; c.beginPath(); c.arc(690, 895, 22, 0, Math.PI * 2); c.fill();
      box(c, p, 380, 1120, 90, 60, p.wood2, 0.5, 67);
      c.strokeStyle = p.mode === "lit" ? "rgba(40,30,20,0.5)" : "rgba(120,140,180,0.25)"; c.lineWidth = 5;
      c.beginPath(); for (let k = 0; k < 44; k++) { const yy = 1120 - k * 14, xx = 425 + 34 * Math.sin(k * 0.3 + t * 0.9) * (k / 44); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
      // calendar: 40 crosses drawn in step with "empat puluh hari"
      box(c, p, 760, 300, 260, 340, p.cloth, 0.15, 68, 0.8, 4);
      if (p.mode === "lit") {
        c.fillStyle = "#b3121a"; c.fillRect(760, 300, 260, 50);
        c.strokeStyle = p.ink; c.lineWidth = 3; const shown = Math.floor(move(t, CUE("calendarFrom"), CUE("calendarTo"), 0, 40));
        for (let i = 0; i < 42; i++) { const gx = 775 + (i % 7) * 34, gy = 365 + Math.floor(i / 7) * 44; c.strokeRect(gx, gy, 28, 36); if (i < shown) { c.beginPath(); c.moveTo(gx + 3, gy + 4); c.lineTo(gx + 25, gy + 32); c.moveTo(gx + 25, gy + 4); c.lineTo(gx + 3, gy + 32); c.stroke(); } }
      }
      fg(c, p, L, () => { c.fillRect(-40, 1350, 1160, 120); c.fillRect(-40, 1350, 90, 700); }); // chair back rail + post
    },
    lights: (u, t) => {
      const k = move(t, CUE("calendarFrom") - 0.6, CUE("calendarFrom") + 0.6, 0, 1) * (1 - move(t, CUE("photoTurn") - 0.9, CUE("photoTurn") - 0.1, 0, 1));
      return [{ k: "spot", x: 460 + (880 - 460) * k, y: 640 + (480 - 640) * k, r: 470 + (380 - 470) * k, i: flick(t), col: TORCH },
              { k: "spot", x: 430, y: 1110, r: 160, i: 0.5 + 0.08 * Math.sin(t * 3), col: WARM }];
    },
    amb: () => 0.035, cam: cam("photo", 1.04, 1.12, 560, 720, 600, 680),
  },
  { // 5 exterior: Bapak cycles to the night shift; someone watches from the window
    name: "exterior", a: EA, b: EB,
    draw: (c, p, u, t, L) => {
      L(0.6);
      const g = c.createLinearGradient(0, 0, 0, 1100); g.addColorStop(0, p.mode === "lit" ? "#c4b796" : "#081024"); g.addColorStop(1, p.mode === "lit" ? "#e2d7bd" : "#13213f"); c.fillStyle = g; c.fillRect(-100, -100, W + 200, 1250);
      if (p.mode === "dark") { c.fillStyle = "#dfe6ff"; c.beginPath(); c.arc(820, 260, 70, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = p.ink; c.fillRect(900, 620, 46, 480); c.fillRect(860, 900, 160, 200);
      c.fillStyle = p.mode === "lit" ? "rgba(60,50,40,0.4)" : "rgba(30,40,70,0.7)"; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(925 - k * 40 - (t - EA) * 5, 600 - k * 30, 30 + k * 8, 0, Math.PI * 2); c.fill(); }
      L(1);
      box(c, p, -100, 1100, W + 200, 900, p.mode === "lit" ? "#9c8c5e" : "#0a1220", 0.0, 71, 1.57, 0);
      c.strokeStyle = p.ink; c.lineWidth = 3; for (let k = 0; k < 18; k++) { const yy = 1110 + k * k * 2.6; c.beginPath(); c.moveTo(-100, yy); c.lineTo(W + 100, yy + 8); c.stroke(); }
      rough(c, [[120, 830], [560, 830], [640, 980], [40, 980]], true, 3, 72); cut(c, p, p.wood2, { edge: 4, hatch: 0.6, dir: 1.0, bbox: [40, 830, 600, 150], seed: 73 });
      c.save(); rrect(c, 80, 980, 520, 300, 74); c.clip(); gedek(c, p, 80, 980, 520, 300); c.restore(); rrect(c, 80, 980, 520, 300, 74); c.strokeStyle = p.ink; c.lineWidth = 4; c.stroke();
      c.fillStyle = p.mode === "lit" ? "#f2d49a" : "#3a2a12"; c.fillRect(380, 1040, 120, 110);
      // Ibu stands still in the lit window, watching
      c.save(); c.beginPath(); c.rect(380, 1040, 120, 110); c.clip(); figure(c, "ibu", 452, 1260, 0.1 * H, p.fig, { breath: t * 2.0 + 1.4, turn: 0.3 }); c.restore();
      c.fillStyle = p.ink; c.fillRect(436, 1040, 8, 110); c.fillRect(380, 1092, 120, 8);
      box(c, p, 180, 1110, 110, 170, p.wood2, 0.5, 75);
      c.fillStyle = p.ink; c.fillRect(700, 760, 16, 560); c.fillRect(660, 790, 96, 10);
      c.strokeStyle = p.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(-100, 700); c.quadraticCurveTo(350, 860, 708, 795); c.quadraticCurveTo(900, 840, W + 100, 760); c.stroke();
      box(c, p, -100, 1330, W + 200, 90, p.mode === "lit" ? "#b9a77d" : "#0c1424", 0.3, 76, 1.57, 2);
      const bx = move(t, EA + 0.3, EB - 0.2, 520, 1260);
      const wh = (t - EA) * 4.5;
      c.strokeStyle = p.ink; c.lineWidth = 6;
      for (const ox of [-50, 50]) { c.beginPath(); c.arc(bx + ox, 1370, 34, 0, 7); c.stroke(); c.beginPath(); c.moveTo(bx + ox, 1370); c.lineTo(bx + ox + 30 * Math.cos(wh), 1370 + 30 * Math.sin(wh)); c.stroke(); }
      c.beginPath(); c.moveTo(bx - 50, 1370); c.lineTo(bx, 1330); c.lineTo(bx + 50, 1370); c.moveTo(bx, 1330); c.lineTo(bx + 30, 1310); c.stroke();
      figure(c, "bapak", bx - 4, 1345, 170, p.fig, { bend: 0.25, arm: 1.0, armR: 1.0, breath: t * 2.0 + 0.3 });
      fg(c, p, L, () => { c.fillRect(-30, -40, 60, 2100); c.fillRect(1010, 1500, 140, 500); c.beginPath(); c.ellipse(1080, 1520, 160, 70, 0, 0, 7); c.fill(); }); // bamboo pole + bush
    },
    lights: (u, t) => {
      const bx = move(t, EA + 0.3, EB - 0.2, 520, 1260);
      return [{ k: "spot", x: 440, y: 1095, r: 300, i: 0.85, col: WARM }, { k: "spot", x: bx + 90, y: 1340, r: 160, i: 0.7 * flick(t), col: WARM },
              { k: "spot", x: 820, y: 260, r: 900, i: 0.28, col: MOON }, { k: "spot", x: 923, y: 610, r: 50, i: 0.6 + 0.6 * Math.max(0, Math.sin(t * 2.2)), col: RED }];
    },
    amb: () => 0.05, cam: cam("exterior", 1.12, 1.04, 440, 1100, 520, 1060),
  },
  { // 6 flashback: Mbah's one message (red)
    name: "flashback", a: FA, b: FB, tint: "red",
    draw: (c, p, u, t, L) => {
      L(0.6); gedek(c, p, -80, -80, W + 160, 1330);
      box(c, p, -80, 1250, W + 160, 760, p.wood, 0.7, 81, 1.57, 0);
      L(1);
      const grip = move(t, CUE("gripAt") - 0.4, CUE("gripAt") + 0.8, 0, 1);
      const drawBayu = (fill: string) => figure(c, "bayu", 700, 1250, 0.36 * H, fill, { arm: -0.2 + (-0.95 + 0.2) * grip, elb: -0.3, turn: 0.1, breath: t * 2.0 + 0.9 });
      castShadow(c, p, 83, 1035, 1.55, drawBayu, 0.5, 14); // candle throws his shadow up the gedek wall
      box(c, p, 90, 1080, 900, 60, p.wood, 0.4, 82, 1.57); for (let k = 0; k < 4; k++) box(c, p, 110 + k * 280, 1140, 34, 260, p.wood2, 0.6, 83 + k);
      box(c, p, 150, 1040, 170, 42, p.cloth, 0.3, 84, 1.3); // pillow
      // Mbah lying on her back, head ≈ 0.13 of her body length (body ≈ 640 px → head ≈ 88 px)
      const lift = move(t, CUE("mbahLift") - 0.3, CUE("mbahLift") + 0.7, 0, 1);
      const lips = CUE("mbahLift") < t && t < CUE("mbahLift") + 1.0 ? 0.5 + 0.5 * Math.sin((t - CUE("mbahLift")) * 18) : 0;
      c.fillStyle = p.fig; c.beginPath(); c.ellipse(300, 1035 - 18 * lift, 34, 22, 0, 0, Math.PI * 2); c.fill(); // neck/shoulder under the head
      profile(c, 240 + 14 * lift, 1012 - 34 * lift, 88, p.fig, { rot: -Math.PI / 2 + 0.9 * settle(t, CUE("mbahLift") - 0.3, CUE("mbahLift") + 0.9, 0, 1), hair: "bun", jaw: lips * 0.7 });
      // jarik over the body: shoulders, chest, hips, feet bumps
      rough(c, [[285, 1050], [320, 1012], [420, 1000], [520, 1010], [620, 1004], [760, 1012], [860, 1000], [905, 1020], [915, 1078], [285, 1082]], true, 3, 85); cut(c, p, p.cloth, { edge: 3, hatch: 0.35, dir: 1.3, bbox: [285, 1000, 630, 82], seed: 86 });
      c.strokeStyle = p.fig; c.lineCap = "round"; c.lineWidth = 15; c.beginPath(); c.lineWidth = 12; c.moveTo(430, 1012); c.quadraticCurveTo(420, 1000 - 120 * grip, 430 + 30 * grip, 1005 - 175 * grip); c.stroke(); // thin old arm rises to Bayu's wrist
      drawBayu(p.fig);
      // candle on the floor, left
      box(c, p, 40, 1100, 90, 140, p.wood2, 0.5, 88, 0.8, 2); box(c, p, 70, 1050, 26, 50, p.cloth, 0.2, 87, 0.8, 2); // stool + candle
      fg(c, p, L, () => { c.fillRect(-40, 1520, 1160, 70); c.fillRect(1035, -40, 40, 2100); }); // amben edge + thin bamboo post at the far right
    },
    lights: (u, t) => [{ k: "spot", x: 520, y: 900, r: 650, i: 0.9 * (0.94 + 0.06 * Math.sin(t * 6)), col: RED }, { k: "spot", x: 83, y: 1035, r: 240, i: 0.65 * flick(t), col: WARM }],
    amb: () => 0.06, cam: cam("flashback", 1.04, 1.13, 450, 1020, 430, 1000),
  },
];
