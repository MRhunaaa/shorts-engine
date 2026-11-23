// DINO: our original on-screen host (green dinosaur in a yellow hoodie, talks to camera with lip-sync).
// Drawn on the same 600 x 1000 design canvas as the toon cast (soles at y = 975) so it shares sizing, cards and lighting.
import { Pen, INK } from "./toon";

export type DinoExpr = "happy" | "talk" | "shock" | "angry" | "smug" | "proud" | "tangled";
export type DinoArm = "none" | "wave" | "point" | "hips" | "shrug" | "photo" | "facepalm";
export type DinoOpts = { mouth: number; expr: DinoExpr; look?: number; blink?: number; arm?: DinoArm; armK?: number; tail?: number; lean?: number };

const G = "#57c065", GL = "#7fd88a", GD = "#3e9a4c", PLATE = "#ff8a3c", HOOD = "#f6c43c", HOODD = "#d9a42a", MOUTH = "#5a1f2e", TONGUE = "#ff7a8a", CHEEK = "rgba(255,120,140,0.35)";
type P2 = [number, number];

const rotP = ([x, y]: P2, a: number, cx: number, cy: number): P2 => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];

export const dino = (p: Pen, o: DinoOpts) => {
  const { mouth, expr, look = 0, blink = 0, arm = "none", armK = 1, tail = 0, lean = 0 } = o;
  const g = (p as unknown as { g: CanvasRenderingContext2D }).g;
  // ---- tail (behind everything), sways ----
  const tip: P2 = [560, 780 + 40 * tail];
  p.poly([[370, 880], [470, 900], [540, 860], tip, [520, 845], [450, 860], [380, 845]], G, 9);
  for (let k = 0; k < 3; k++) { const u = 0.3 + k * 0.22, x = 400 + 140 * u, y = 860 - 60 * u + 25 * tail * u; p.poly([[x - 14, y], [x, y - 26], [x + 14, y]], PLATE, 6); }
  // ---- legs + feet ----
  for (const s of [-1, 1]) {
    const x = 300 + s * 62;
    p.poly([[x - 36, 815], [x + 36, 815], [x + 34, 950], [x - 34, 950]], G, 9);
    p.ell(x, 958, 52, 22, GD, 9);
    for (const dx of [-28, 0, 28]) p.poly([[x + dx - 7, 970], [x + dx, 984], [x + dx + 7, 970]], "#fff6e6", 4);
  }
  g.save(); g.translate(300, 820); g.rotate((lean * Math.PI) / 180); g.translate(-300, -820);
  // ---- arms behind (wave arm goes up) ----
  const shL: P2 = [192, 610], shR: P2 = [408, 610];
  const armPts = (side: number): [P2, P2, P2] => {
    const sh = side < 0 ? shL : shR, k = armK;
    switch (side > 0 ? arm : arm === "hips" || arm === "shrug" || arm === "facepalm" ? arm : "none") {
      case "wave": return [sh, [sh[0] + 70, sh[1] - 80], [sh[0] + 60 + 30 * Math.sin(k * 6), sh[1] - 190]];
      case "point": return [sh, [sh[0] + 90, sh[1] - 10], [sh[0] + 175, sh[1] - 40]];
      case "hips": return [sh, [sh[0] + side * 70, sh[1] + 80], [sh[0] - side * 10, sh[1] + 150]];
      case "shrug": return [sh, [sh[0] + side * 80, sh[1] + 40], [sh[0] + side * 110, sh[1] - 40]];
      case "photo": return [sh, [sh[0] - 10, sh[1] + 100], [300 + 40, 690]];
      case "facepalm": return side > 0 ? [sh, [sh[0] + 20, sh[1] - 60], [345, 420]] : [sh, [sh[0] - 30, sh[1] + 90], [sh[0] - 10, sh[1] + 170]];
      default: return [sh, [sh[0] + side * 30, sh[1] + 100], [sh[0] + side * 20, sh[1] + 185]];
    }
  };
  const drawArm = (side: number) => {
    const [a, b, c] = armPts(side);
    p.stroke([a, b, c], 46, INK); p.stroke([a, b], 36, HOOD); p.stroke([b, c], 30, G);
    p.ell(c[0], c[1], 22, 22, G, 7);
    for (const d of [-1, 0, 1]) p.ell(c[0] + d * 14, c[1] - 18, 7, 10, G, 5);
  };
  drawArm(-1);
  if (arm !== "photo") drawArm(1);
  // ---- hoodie body ----
  p.ell(300, 560, 112, 40, HOODD, 8); // hood behind the neck
  p.ell(300, 705, 128, 150, HOOD, 10);
  g.save(); g.globalAlpha = 0.18; p.ell(250, 650, 50, 90, "#ffffff", 0); g.restore();
  p.arc(300, 770, 70, 34, 0, 180, 7); p.stroke([[230, 770], [370, 770]], 7);
  p.stroke([[280, 585], [272, 650]], 6); p.stroke([[320, 585], [328, 650]], 6);
  p.dot(272, 655, 7, "#ffffff"); p.dot(328, 655, 7, "#ffffff");
  if (arm === "photo") { // holds a little framed portrait of "my cousin" (an ichthyosaur)
    p.poly([[240, 640], [360, 640], [360, 740], [240, 740]], "#8a5a34", 8);
    p.poly([[254, 654], [346, 654], [346, 726], [254, 726]], "#bfe3f5", 4);
    p.ell(300, 692, 34, 14, "#7a8fa8", 4); p.poly([[264, 692], [240 + 30, 686], [270, 698]], "#7a8fa8", 3); p.dot(318, 688, 4);
    drawArm(1);
  }
  // ---- neck + head ----
  p.poly([[255, 520], [345, 520], [350, 570], [250, 570]], G, 9);
  // back plates along the crown
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (1.12 + k * 0.127), cx = 300 + 150 * Math.cos(a), cy = 395 + 128 * Math.sin(a);
    const n: P2 = [Math.cos(a), Math.sin(a)], h = k === 3 ? 58 : 44 - Math.abs(k - 3) * 3;
    p.poly([[cx - n[1] * 22, cy + n[0] * 22], [cx + n[0] * h, cy + n[1] * h], [cx + n[1] * 22, cy - n[0] * 22]], PLATE, 7);
  }
  p.ell(300, 400, 152, 128, G, 11);
  g.save(); g.globalAlpha = 0.16; p.ell(240, 330, 70, 45, "#ffffff", 0); g.restore();
  p.ell(300, 468, 128, 70, GL, 9); // snout
  p.ell(268, 440, 8, 6, GD, 0); p.ell(332, 440, 8, 6, GD, 0);
  p.ell(198, 470, 26, 16, CHEEK, 0); p.ell(402, 470, 26, 16, CHEEK, 0);
  // ---- eyes: big white sclera, pupils follow `look`, lids blink ----
  const browY = expr === "angry" ? 8 : expr === "shock" ? -14 : 0;
  for (const s of [-1, 1]) {
    const ex = 300 + s * 58, ey = 352, rx = expr === "shock" ? 42 : 38, ry = expr === "shock" ? 52 : 46;
    p.ell(ex, ey, rx, ry, "#ffffff", 8);
    if (expr === "tangled") { p.arc(ex, ey, 18, 18, 0, 300, 6); continue; }
    const pr = expr === "shock" ? 12 : 17;
    p.ell(ex + look * 12, ey + 6, pr, pr * 1.15, INK, 0); p.dot(ex + look * 12 - 5, ey - 1, 5, "#ffffff");
    if (blink > 0) p.ell(ex, ey - ry * (1 - blink), rx + 3, ry * blink + 2, G, 0);
    if (expr === "happy" || expr === "proud") p.ell(ex, ey + ry - 6, rx + 4, 16, G, 0);
    // brows
    const inner = s < 0 ? ex + 30 : ex - 30, outer = s < 0 ? ex - 34 : ex + 34;
    const ty = ey - ry - 16 + browY;
    if (expr === "angry") p.stroke([[outer, ty - 10], [inner, ty + 12]], 13);
    else if (expr === "smug") p.stroke([[outer, ty + (s < 0 ? 0 : -10)], [inner, ty + (s < 0 ? 4 : 0)]], 12);
    else p.stroke([[outer, ty + 4], [(outer + inner) / 2, ty - 6], [inner, ty + 2]], 12);
  }
  // ---- mouth: lip-sync level 0..1 ----
  const mx = 300, my = 492, m = Math.max(0, Math.min(1, mouth));
  if (expr === "tangled") { // tongue twisted out
    p.ell(mx, my, 40, 14 + 20 * m, MOUTH, 7);
    p.poly([[mx - 12, my + 6], [mx + 40, my + 30], [mx + 10, my + 46], [mx + 50, my + 70], [mx + 30, my + 74], [mx - 20, my + 30]], TONGUE, 6);
  } else if (m < 0.08) {
    if (expr === "angry") p.stroke([[mx - 46, my + 8], [mx, my - 2], [mx + 46, my + 8]], 9);
    else if (expr === "shock") p.ell(mx, my + 4, 18, 22, MOUTH, 8);
    else if (expr === "smug") p.arc(mx + 10, my - 10, 50, 18, 20, 160, 9);
    else p.arc(mx, my - 14, 62, 26, 15, 165, 10);
  } else {
    const w = 46 + 22 * m + (expr === "happy" || expr === "proud" ? 12 : 0), h = 10 + 46 * m;
    p.ell(mx, my + h * 0.3, w, h, MOUTH, 9);
    p.ell(mx, my + h * 0.3 + h * 0.55, w * 0.55, h * 0.38, TONGUE, 0);
    for (const s of [-1, 1]) p.poly([[mx + s * 26 - 9, my + h * 0.3 - h + 4], [mx + s * 26 + 9, my + h * 0.3 - h + 4], [mx + s * 26, my + h * 0.3 - h + 22]], "#ffffff", 4);
  }
  g.restore();
};
export { rotP };
