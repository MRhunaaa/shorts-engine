// "TINTA SENTER" look: woodcut ink + flashlight. Every shot is painted twice:
//   DARK pass = the room as moonlight leaves it (navy silhouettes)
//   LIT pass  = cream paper + black woodcut ink (what a light reveals)
// The LIT pass is multiplied by a light map (torch cone, stove glow, candle) and added on top of DARK.
export type Mode = "dark" | "lit";
export type Pal = { mode: Mode; wall: string; wall2: string; wood: string; wood2: string; cloth: string; ink: string; fig: string; sky: string; glass: string };
export const PAL: Record<Mode, Pal> = {
  lit: { mode: "lit", wall: "#e8dec6", wall2: "#d3c4a3", wood: "#b7976b", wood2: "#8e7150", cloth: "#f3ecdc", ink: "#160e0a", fig: "#120b08", sky: "#cfc3a6", glass: "#efe6cf" },
  dark: { mode: "dark", wall: "#0b0f19", wall2: "#0d1321", wood: "#0f1524", wood2: "#0a0f1b", cloth: "#1b2539", ink: "#04060b", fig: "#03050a", sky: "#0f1a30", glass: "#2c4570" },
};
export type C2 = CanvasRenderingContext2D;

// ---------- deterministic noise
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const vnoise = (x: number) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ss = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- woodcut primitives
/** jittered polyline path (hand-cut edge) */
export function rough(ctx: C2, pts: [number, number][], close = true, amp = 2.2, seed = 1) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = (hash(seed + i * 3.1) - 0.5) * amp, jy = (hash(seed + i * 7.7) - 0.5) * amp;
    if (i === 0) ctx.moveTo(x + jx, y + jy); else ctx.lineTo(x + jx, y + jy);
  });
  if (close) ctx.closePath();
}
/** rough rectangle with subdivided edges */
export function rrect(ctx: C2, x: number, y: number, w: number, h: number, seed = 1, amp = 2.5) {
  const pts: [number, number][] = []; const n = 6;
  for (let i = 0; i < n; i++) pts.push([x + (w * i) / n, y]);
  for (let i = 0; i < n; i++) pts.push([x + w, y + (h * i) / n]);
  for (let i = 0; i < n; i++) pts.push([x + w - (w * i) / n, y + h]);
  for (let i = 0; i < n; i++) pts.push([x, y + h - (h * i) / n]);
  rough(ctx, pts, true, amp, seed);
}
/** fill current path with base colour, ink edge, and woodcut hatching that thickens toward `shadeDir` */
export function cut(ctx: C2, p: Pal, fill: string, opt: { edge?: number; hatch?: number; dir?: number; seed?: number; bbox?: [number, number, number, number] } = {}) {
  ctx.fillStyle = fill; ctx.fill();
  // edge FIRST, while the shape's path is still the current path (the hatch loop below replaces the path;
  // stroking after it drew the last hatch line unclipped across the frame = the stray diagonal lines)
  if (opt.edge) { ctx.strokeStyle = p.ink; ctx.lineWidth = opt.edge; ctx.lineJoin = "round"; ctx.stroke(); }
  if (p.mode === "lit" && opt.hatch && opt.bbox) {
    const [x, y, w, h] = opt.bbox; const dir = opt.dir ?? 0.8;
    ctx.save(); ctx.clip();
    ctx.strokeStyle = p.ink; ctx.lineCap = "round";
    const step = 9, L = Math.hypot(w, h) + 40;
    const cx = x + w / 2, cy = y + h / 2, ca = Math.cos(dir), sa = Math.sin(dir);
    for (let k = -L / 2; k < L / 2; k += step) {
      const s = (k + L / 2) / L; // 0..1 across shape
      const a = clamp((s - (1 - opt.hatch)) / opt.hatch);
      if (a <= 0.02) continue;
      ctx.globalAlpha = 0.85; ctx.lineWidth = 0.8 + 2.6 * a;
      const ox = cx + ca * k, oy = cy + sa * k;
      const r = (hash(k * 0.37 + (opt.seed ?? 0)) - 0.5) * 6;
      ctx.beginPath(); ctx.moveTo(ox - sa * L + r, oy + ca * L); ctx.lineTo(ox + sa * L + r, oy - ca * L); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.beginPath();
  }
}
/** simple rect cut */
export function box(ctx: C2, p: Pal, x: number, y: number, w: number, h: number, fill: string, hatch = 0, seed = 1, dir = 0.8, edge = 3) {
  rrect(ctx, x, y, w, h, seed); cut(ctx, p, fill, { edge, hatch, dir, seed, bbox: [x, y, w, h] });
}
/** woven bamboo wall (gedek) texture inside rect */
export function gedek(ctx: C2, p: Pal, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = p.wall; ctx.fillRect(x, y, w, h);
  if (p.mode !== "lit") return;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = p.ink; ctx.globalAlpha = 0.35;
  const s = 38;
  for (let i = -h; i < w + h; i += s) {
    for (let j = 0; j < h; j += s) {
      const odd = ((i / s + j / s) | 0) % 2;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (odd) { ctx.moveTo(x + i, y + j + 6); ctx.lineTo(x + i + s, y + j + 6); ctx.moveTo(x + i, y + j + 19); ctx.lineTo(x + i + s, y + j + 19); ctx.moveTo(x + i, y + j + 31); ctx.lineTo(x + i + s, y + j + 31); }
      else { ctx.moveTo(x + i + 6, y + j); ctx.lineTo(x + i + 6, y + j + s); ctx.moveTo(x + i + 19, y + j); ctx.lineTo(x + i + 19, y + j + s); ctx.moveTo(x + i + 31, y + j); ctx.lineTo(x + i + 31, y + j + s); }
      ctx.stroke();
    }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
/** plaster wall with cracks */
export function plaster(ctx: C2, p: Pal, x: number, y: number, w: number, h: number, crack = 0.3, seed = 3) {
  ctx.fillStyle = p.wall; ctx.fillRect(x, y, w, h);
  if (p.mode !== "lit") return;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // stains
  for (let i = 0; i < 26; i++) {
    const sx = x + hash(seed + i) * w, sy = y + hash(seed + i * 2.3) * h, r = 30 + hash(seed + i * 5.1) * 120;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, "rgba(120,96,60,0.16)"); g.addColorStop(1, "rgba(120,96,60,0)");
    ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r);
  }
  // speckle hatch
  ctx.strokeStyle = p.ink; ctx.globalAlpha = 0.18; ctx.lineWidth = 1.2;
  for (let i = 0; i < 260; i++) {
    const sx = x + hash(seed * 9 + i) * w, sy = y + hash(seed * 4 + i * 1.7) * h;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 7, sy - 5); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
  cracks(ctx, p, x + w * 0.5, y + h * 0.3, crack, seed, h);
}
/** branching cracks growing with `amt` 0..1 */
export function cracks(ctx: C2, p: Pal, x0: number, y0: number, amt: number, seed: number, len = 900) {
  if (p.mode !== "lit" || amt <= 0) return;
  ctx.strokeStyle = p.ink; ctx.lineCap = "round";
  const branch = (x: number, y: number, ang: number, L: number, wdt: number, sd: number, depth: number) => {
    const segs = 14; let px = x, py = y;
    ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(px, py);
    const n = Math.floor(segs * amt);
    for (let i = 0; i < n; i++) {
      ang += (hash(sd + i) - 0.5) * 0.9;
      px += Math.cos(ang) * (L / segs); py += Math.sin(ang) * (L / segs);
      ctx.lineTo(px, py);
      if (depth < 2 && hash(sd * 3 + i) > 0.78) { ctx.stroke(); branch(px, py, ang + (hash(sd + i * 9) - 0.5) * 2.2, L * 0.45, wdt * 0.6, sd + i * 13, depth + 1); ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(px, py); }
    }
    ctx.stroke();
  };
  for (let k = 0; k < 4; k++) branch(x0, y0, (k / 4) * Math.PI * 2 + hash(seed + k), len * 0.45, 4, seed * 31 + k * 101, 0);
}

/** side-profile head silhouette facing +x (forehead, brow, nose, lips, chin, throat); jaw 0..1 parts the lips. Origin = ear, unit = head height */
export function profile(ctx: C2, x: number, y: number, s: number, fill: string, o: { jaw?: number; hair?: "boy" | "bun"; rot?: number } = {}) {
  const j = (o.jaw ?? 0) * 0.1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(s, s); ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-0.42, 0.55);                    // nape
  ctx.bezierCurveTo(-0.62, 0.2, -0.6, -0.42, -0.2, -0.56); // back of skull
  ctx.bezierCurveTo(0.12, -0.66, 0.38, -0.52, 0.44, -0.24); // crown -> forehead
  ctx.bezierCurveTo(0.47, -0.14, 0.47, -0.1, 0.45, -0.06);  // brow
  ctx.bezierCurveTo(0.47, -0.02, 0.56, 0.06, 0.58, 0.12);   // nose bridge -> tip
  ctx.lineTo(0.5, 0.17);                      // under nose
  ctx.bezierCurveTo(0.53, 0.2, 0.52, 0.22, 0.5, 0.23);      // upper lip
  ctx.lineTo(0.45, 0.245 + j * 0.3);          // mouth corner (opens)
  ctx.bezierCurveTo(0.51, 0.26 + j, 0.51, 0.29 + j, 0.48, 0.31 + j); // lower lip
  ctx.bezierCurveTo(0.5, 0.36 + j, 0.47, 0.42 + j, 0.36, 0.44 + j);  // chin
  ctx.bezierCurveTo(0.22, 0.46 + j, 0.12, 0.5, 0.06, 0.62); // jaw -> throat
  ctx.lineTo(0.0, 0.95); ctx.lineTo(-0.38, 0.95); ctx.closePath(); ctx.fill();
  if (j > 0.001) { ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.ellipse(0.47, 0.255 + j * 0.5, 0.035, 0.008 + j * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
  if (o.hair === "boy") { ctx.beginPath(); ctx.moveTo(-0.55, 0.05); ctx.bezierCurveTo(-0.66, -0.5, -0.1, -0.78, 0.36, -0.5); ctx.lineTo(0.42, -0.36); ctx.bezierCurveTo(0.2, -0.46, 0.05, -0.38, -0.05, -0.3); ctx.lineTo(-0.45, 0.2); ctx.closePath(); ctx.fill(); }
  if (o.hair === "bun") { ctx.beginPath(); ctx.ellipse(-0.58, -0.08, 0.2, 0.18, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// ---------- faceless silhouette figures (Javanese household, 1990s village)
export type Fig = "bayu" | "ibu" | "mbah" | "bapak" | "tall";
/** arm: shoulder angle from hanging (rad, + swings toward +x), elb: elbow bend (rad). eyes: 0..1 two pale eye points (only for the "wrong" one) */
export type FigPose = { turn?: number; arm?: number; armR?: number; elb?: number; elbR?: number; bend?: number; jaw?: number; stir?: number; neck?: number; eyes?: number; breath?: number };
/** giant torch shadow on the wall: re-draws `fig` scaled about the light (k > 1 = bigger), soft, only in the lit pass */
export function castShadow(ctx: C2, p: Pal, lx: number, ly: number, k: number, fig: (fill: string) => void, alpha = 0.6, blur = 10) {
  if (p.mode !== "lit") return;
  ctx.save(); ctx.translate(lx, ly); ctx.scale(k, k); ctx.translate(-lx, -ly);
  ctx.globalAlpha = alpha; ctx.filter = `blur(${blur}px)`; fig("#2a1d14"); ctx.restore();
  ctx.globalAlpha = 1; ctx.filter = "none";
}
/** standing figure, feet at (x,y), total height H px */
export function figure(ctx: C2, kind: Fig, x: number, y: number, H: number, fill: string, pose: FigPose = {}) {
  ctx.save(); ctx.translate(x, y); const s = H / 100; ctx.scale(s, s); ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (pose.breath !== undefined) { ctx.scale(1, 1 + 0.009 * Math.sin(pose.breath)); ctx.translate(0.5 * Math.sin(pose.breath * 0.5), 0); } // breathing + weight sway
  const woman = kind === "ibu" || kind === "mbah" || kind === "tall", child = kind === "bayu";
  const neck = pose.neck ?? 0, tall = kind === "tall" ? 1.12 : 1;
  const hipY = child ? -40 : -47 * tall, waistY = child ? -52 : -58 * tall, shY = child ? -70 : -80 * tall;
  const shW = child ? 9.5 : woman ? 10.5 : 12, waistW = child ? 8 : woman ? 7.2 : 9.5;
  // ---- lower body
  ctx.beginPath();
  if (woman) { // jarik: wrapped batik skirt, ankle length, slight A-line + front fold
    ctx.moveTo(-waistW - 1.5, hipY + 2); ctx.bezierCurveTo(-11.5, hipY + 14, -10.5, -14, -9.5, -1.5); ctx.lineTo(-4, 0); ctx.lineTo(-3, -1.5); ctx.lineTo(9.8, -1.5);
    ctx.bezierCurveTo(10.8, -14, 11.6, hipY + 14, waistW + 1.5, hipY + 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-6, -0.8, 4, 1.6, 0, 0, Math.PI * 2); ctx.ellipse(6, -0.8, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill(); // sandals/feet
  } else {
    const legTop = child ? -26 : hipY;
    if (child) { ctx.moveTo(-9, hipY - 2); ctx.lineTo(9, hipY - 2); ctx.lineTo(9.5, legTop); ctx.lineTo(0.8, legTop); ctx.lineTo(0, legTop - 3); ctx.lineTo(-0.8, legTop); ctx.lineTo(-9.5, legTop); ctx.closePath(); ctx.fill(); } // shorts
    ctx.lineWidth = child ? 3.6 : 5.4;
    ctx.beginPath(); ctx.moveTo(-4.5, legTop); ctx.lineTo(-5, -2); ctx.moveTo(4.5, legTop); ctx.lineTo(5, -2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-6, -1.2, 3.6, 1.8, 0, 0, Math.PI * 2); ctx.ellipse(6.2, -1.2, 3.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    if (!child) { ctx.beginPath(); ctx.moveTo(-waistW, hipY - 2); ctx.lineTo(waistW, hipY - 2); ctx.lineTo(7.5, hipY + 6); ctx.lineTo(-7.5, hipY + 6); ctx.closePath(); ctx.fill(); }
  }
  // ---- torso (bends at the waist)
  ctx.save(); ctx.translate(0, waistY); ctx.rotate(pose.bend ?? 0); ctx.translate(0, -waistY);
  ctx.beginPath();
  const sy = shY;
  ctx.moveTo(-3, sy - 2.5); ctx.bezierCurveTo(-7, sy - 2, -shW, sy - 0.5, -shW, sy + 3);  // shoulder slope
  ctx.bezierCurveTo(-shW, sy + 10, -waistW - 0.5, waistY - 6, -waistW, waistY);
  if (woman) { ctx.bezierCurveTo(-waistW - 2, waistY + 4, -12, hipY - 2, -12.5, hipY + 4); ctx.lineTo(12.5, hipY + 4); ctx.bezierCurveTo(12, hipY - 2, waistW + 2, waistY + 4, waistW, waistY); } // kebaya peplum
  else { ctx.lineTo(-waistW, hipY); ctx.lineTo(waistW, hipY); ctx.lineTo(waistW, waistY); }
  ctx.bezierCurveTo(waistW + 0.5, waistY - 6, shW, sy + 10, shW, sy + 3); ctx.bezierCurveTo(shW, sy - 0.5, 7, sy - 2, 3, sy - 2.5); ctx.closePath(); ctx.fill();
  // arms: tapered upper + forearm + hand
  const arm = (side: number, a: number, e: number) => {
    const L1 = (child ? 15 : 18) * tall * (kind === "tall" ? 1.25 : 1), L2 = (child ? 14 : 17) * tall * (kind === "tall" ? 1.3 : 1);
    const ox = side * (shW - 1.8), oy = sy + 2.5;
    const a1 = side * 0.07 + a, ex = ox + Math.sin(a1) * L1, ey = oy + Math.cos(a1) * L1;
    const a2 = a1 + e, hx = ex + Math.sin(a2) * L2, hy = ey + Math.cos(a2) * L2;
    ctx.lineWidth = child ? 4.6 : 5.4; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.lineWidth = child ? 3.6 : 4.2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + Math.sin(a2) * 1.6, hy + Math.cos(a2) * 1.6, 2.4, 3.2, -a2, 0, Math.PI * 2); ctx.fill();
  };
  const stirA = pose.stir !== undefined ? 0.85 + 0.22 * Math.sin(pose.stir) : undefined;
  arm(-1, pose.arm ?? 0, pose.elb ?? 0.12); arm(1, pose.armR ?? (stirA !== undefined ? stirA : 0), pose.elbR ?? (stirA !== undefined ? 0.9 + 0.25 * Math.cos(pose.stir!) : -0.12));
  // neck + head (front view, faceless)
  const hr = child ? 8.2 : 7.0;
  ctx.fillRect(-2.3, sy - 6 - neck, 4.6, 7 + neck);
  ctx.save(); ctx.translate(0, sy - 6 - neck - hr + 1.5); ctx.rotate(Math.sin(pose.turn ?? 0) * 0.08);
  const turn = pose.turn ?? 0, sq = 0.86 + 0.06 * Math.cos(turn);
  ctx.beginPath(); ctx.ellipse(0, 0, hr * sq, hr * 1.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, hr * 0.62, hr * 0.55, hr * 0.5, 0, 0, Math.PI * 2); ctx.fill(); // jaw mass
  if (woman) { const bx = -Math.sin(turn) * hr * 0.9; ctx.beginPath(); ctx.ellipse(bx, -hr * 0.2 + Math.abs(Math.cos(turn)) * 0, hr * 0.62, hr * 0.55, 0, 0, Math.PI * 2); ctx.globalAlpha = Math.abs(Math.sin(turn)) > 0.15 || Math.cos(turn) < 0 ? 1 : 0.0; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.ellipse(0, -hr * 0.55, hr * 0.95, hr * 0.62, 0, Math.PI, 0); ctx.fill(); }
  if (child) { ctx.beginPath(); ctx.ellipse(0, -hr * 0.5, hr * 1.02, hr * 0.68, 0, Math.PI * 1.02, -0.02); ctx.fill(); }
  if (kind === "bapak") { ctx.beginPath(); ctx.rect(-hr * 0.95, -hr * 1.45, hr * 1.9, hr * 0.85); ctx.fill(); } // peci
  if (pose.eyes && pose.eyes > 0.01) { ctx.fillStyle = `rgba(255,236,220,${pose.eyes})`; ctx.beginPath(); ctx.ellipse(-2.6, -0.4, 1.1, 0.7, 0, 0, Math.PI * 2); ctx.ellipse(2.6, -0.4, 1.1, 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = fill; }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}
