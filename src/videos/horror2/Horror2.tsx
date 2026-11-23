// "DIPANGGIL DUA KALI" part 1/3, v2 engine: calm horror, smooth.
// Look "TINTA SENTER": every shot painted twice (DARK pass = moonlit navy, LIT pass = cream paper + woodcut ink),
// LIT multiplied by a light map and added on DARK. v2 adds: 5-sub-frame motion blur, smooth handheld drift (no random shake),
// parallax layers, volumetric torch beams with dust, soft ink dissolves, fading typography in TikTok safe zones.
// All times come from timeline.json (via types.ts), the same file the audio script reads.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps } from "remotion";
import { PAL, clamp, ss, hash, lerp } from "../horror1/paint";
import { shotAt } from "./scenes";
import { TL, CUE, SHOT_RANGE, Light, Shot, W, H } from "./types";
import { WORDS } from "./words";

const SUB = 5;
const SMASH = CUE("smash");
const [TITLE_A, TITLE_B] = SHOT_RANGE("title");

const mk = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
type Bufs = { dark: HTMLCanvasElement; lit: HTMLCanvasElement; light: HTMLCanvasElement; comp: HTMLCanvasElement; acc: HTMLCanvasElement; blotC: HTMLCanvasElement; grain: HTMLCanvasElement[]; blot: Float32Array };
let BUF: Bufs | null = null;
const BW = 54, BH = 96;
const bufs = (): Bufs => {
  if (BUF) return BUF;
  const grain = [0, 1, 2, 3, 4, 5].map((k) => {
    const g = mk(W / 2, H / 2), x = g.getContext("2d")!, im = x.createImageData(W / 2, H / 2);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (hash(i * 0.0137 + k * 91.7) - 0.5) * 230; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); return g;
  });
  // blot field for the ink dissolve (value noise, 2 octaves)
  const blot = new Float32Array(BW * BH);
  const vn = (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, h = (a: number, b: number) => hash(a * 17.3 + b * 91.1);
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h(i, j), h(i + 1, j), u), lerp(h(i, j + 1), h(i + 1, j + 1), u), v);
  };
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) blot[j * BW + i] = 0.65 * vn(i / 7, j / 7) + 0.35 * vn(i / 2.5 + 30, j / 2.5);
  BUF = { dark: mk(), lit: mk(), light: mk(), comp: mk(), acc: mk(), blotC: mk(BW, BH), grain, blot };
  return BUF;
};

// ---------- camera: shot move + smooth handheld drift + one decaying shake at the smash
type CamX = { z: number; cx: number; cy: number; rot: number; dx: number; dy: number };
const drift = (t: number) => {
  let dx = 7 * Math.sin(t * 0.37) + 4 * Math.sin(t * 0.71 + 1.1);
  let dy = 6 * Math.sin(t * 0.29 + 0.4) + 3 * Math.sin(t * 0.83);
  const rot = 0.0035 * Math.sin(t * 0.23);
  const k = t - SMASH;
  if (k >= 0 && k < 0.6) { const amp = 16 * Math.exp(-k / 0.16); dx += amp * Math.sin(k * 71); dy += amp * Math.sin(k * 53 + 1.3); }
  return { dx, dy, rot };
};
const camAt = (s: Shot, t: number): CamX => {
  const u = clamp((t - s.a) / (s.b - s.a)), c0 = s.cam(u, t), d = drift(t);
  const z = Math.max(1.04, c0.z);
  const hw = W / (2 * z) + 22 / z, hh = H / (2 * z) + 22 / z;
  return { z, cx: clamp(c0.cx, hw, W - hw), cy: clamp(c0.cy, hh, H - hh), rot: c0.rot + d.rot, dx: d.dx, dy: d.dy };
};
const base = (x: CanvasRenderingContext2D, c: CamX) => {
  x.setTransform(1, 0, 0, 1, 0, 0); x.translate(W / 2 + c.dx, H / 2 + c.dy); x.rotate(c.rot); x.scale(c.z, c.z); x.translate(-c.cx, -c.cy);
};
/** parallax layer setter for shot.draw: depth 1 = midground (plain camera + drift) */
const mkLayer = (x: CanvasRenderingContext2D, c: CamX) => (depth: number) => {
  base(x, c); const k = (depth - 1) * 2.2; x.translate(c.dx * k, c.dy * k);
};

function lightMap(x: CanvasRenderingContext2D, ls: Light[], amb: number) {
  x.globalCompositeOperation = "source-over"; const a = Math.round(amb * 255);
  x.fillStyle = `rgb(${a},${a},${Math.round(Math.min(255, a * 1.1))})`; x.fillRect(-W, -H, 3 * W, 3 * H);
  x.globalCompositeOperation = "lighter";
  for (const l of ls) {
    if (l.i <= 0.001) continue;
    const [r, g, b] = l.col, col = (al: number) => `rgba(${r},${g},${b},${clamp(al)})`;
    if (l.k === "spot") {
      const gr = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r); gr.addColorStop(0, col(l.i)); gr.addColorStop(0.45, col(l.i * 0.55)); gr.addColorStop(1, col(0));
      x.fillStyle = gr; x.fillRect(l.x - l.r, l.y - l.r, 2 * l.r, 2 * l.r);
    } else {
      const dx = l.tx - l.ox, dy = l.ty - l.oy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const gr = x.createLinearGradient(l.ox, l.oy, l.tx, l.ty); gr.addColorStop(0, col(l.i * 0.35)); gr.addColorStop(1, col(l.i * 0.6));
      x.fillStyle = gr; x.beginPath(); x.moveTo(l.ox - nx * 14, l.oy - ny * 14); x.lineTo(l.tx - nx * l.w, l.ty - ny * l.w); x.lineTo(l.tx + nx * l.w, l.ty + ny * l.w); x.lineTo(l.ox + nx * 14, l.oy + ny * 14); x.closePath(); x.fill();
      const sp = x.createRadialGradient(l.tx, l.ty, 0, l.tx, l.ty, l.r); sp.addColorStop(0, col(l.i)); sp.addColorStop(0.6, col(l.i * 0.45)); sp.addColorStop(1, col(0));
      x.fillStyle = sp; x.fillRect(l.tx - l.r, l.ty - l.r, 2 * l.r, 2 * l.r);
    }
  }
  x.globalCompositeOperation = "source-over";
}

/** one sub-frame: dark + lit*light (+ tint) into B.comp */
function composite(B: Bufs, t: number) {
  const s = shotAt(t), u = clamp((t - s.a) / (s.b - s.a)), cam = camAt(s, t);
  const dx = B.dark.getContext("2d")!, lx = B.lit.getContext("2d")!, mx = B.light.getContext("2d")!, cx = B.comp.getContext("2d")!;
  for (const x of [dx, lx]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.filter = "none"; x.fillStyle = "#000"; x.fillRect(0, 0, W, H); }
  const Ld = mkLayer(dx, cam), Ll = mkLayer(lx, cam);
  Ld(1); s.draw(dx, PAL.dark, u, t, Ld);
  Ll(1); s.draw(lx, PAL.lit, u, t, Ll);
  mx.setTransform(1, 0, 0, 1, 0, 0); base(mx, cam); lightMap(mx, s.lights(u, t), s.amb(u, t));
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalAlpha = 1; lx.filter = "none"; lx.globalCompositeOperation = "multiply"; lx.drawImage(B.light, 0, 0); lx.globalCompositeOperation = "source-over";
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1;
  cx.drawImage(B.dark, 0, 0);
  cx.globalCompositeOperation = "lighter"; cx.drawImage(B.lit, 0, 0); cx.globalCompositeOperation = "source-over";
  if (s.tint) { cx.globalCompositeOperation = "multiply"; cx.fillStyle = s.tint === "red" ? "rgb(255,150,135)" : "rgb(205,215,255)"; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = "source-over"; }
}

/** volumetric haze in torch cones + slow dust motes (deterministic, drift with t) */
function beamsAndDust(ctx: CanvasRenderingContext2D, t: number) {
  const s = shotAt(t), u = clamp((t - s.a) / (s.b - s.a)), cam = camAt(s, t), ls = s.lights(u, t);
  ctx.save(); base(ctx, cam); ctx.globalCompositeOperation = "lighter";
  ls.forEach((l, li) => {
    if (l.k !== "cone" || !l.beam || l.beam <= 0 || l.i <= 0.01) return;
    const [r, g, b] = l.col, al = clamp(0.07 * l.beam * l.i);
    const dx = l.tx - l.ox, dy = l.ty - l.oy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const gr = ctx.createLinearGradient(l.ox, l.oy, l.tx, l.ty);
    gr.addColorStop(0, `rgba(${r},${g},${b},${al * 0.45})`); gr.addColorStop(0.7, `rgba(${r},${g},${b},${al})`); gr.addColorStop(1, `rgba(${r},${g},${b},${al * 0.6})`);
    ctx.filter = "blur(18px)"; ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(l.ox - nx * 14, l.oy - ny * 14); ctx.lineTo(l.tx - nx * l.w, l.ty - ny * l.w); ctx.lineTo(l.tx + nx * l.w, l.ty + ny * l.w); ctx.lineTo(l.ox + nx * 14, l.oy + ny * 14); ctx.closePath(); ctx.fill();
    ctx.filter = "none";
    // dust: particles parameterised in cone space, so they are always inside the cone
    for (let i = 0; i < 70; i++) {
      const h1 = hash(i * 1.37 + li * 7.1), h2 = hash(i * 3.11 + li * 2.3), h3 = hash(i * 5.71 + li);
      const sAl = (h1 + t * 0.012 * (0.4 + h3)) % 1; const sp = 0.06 + 0.94 * sAl;
      const lat = clamp((h2 - 0.5) * 1.8 + 0.18 * Math.sin(t * (0.25 + 0.3 * h3) + i), -0.95, 0.95);
      const half = 14 + (l.w - 14) * sp;
      const px = l.ox + ux * sp * L + nx * lat * half + 4 * Math.sin(t * 0.6 + i * 2.1), py = l.oy + uy * sp * L + ny * lat * half + 4 * Math.cos(t * 0.5 + i * 1.3) - t * 3 * h3 % 40;
      const edge = 1 - Math.abs(lat) * 0.7, a = clamp(l.i * (0.15 + 0.6 * sp) * edge * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 4.7)) * 0.55);
      const sz = 1.5 + 2 * h3;
      ctx.fillStyle = `rgba(255,240,215,${a})`; ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
    }
  });
  if (s.dust && s.dust > 0) ls.forEach((l, li) => {
    if (l.k !== "spot" || l.i < 0.2) return;
    const n = Math.round(24 * s.dust!), R = l.r * 0.55;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 2.17 + li * 9.3), h2 = hash(i * 4.03 + li * 1.9), h3 = hash(i * 6.61 + li * 3.3);
      const ang = h1 * Math.PI * 2 + t * 0.05 * (h3 - 0.5), rad = Math.sqrt(h2) * R;
      const px = l.x + Math.cos(ang) * rad + 5 * Math.sin(t * 0.4 + i), py = l.y + Math.sin(ang) * rad + 5 * Math.cos(t * 0.35 + i * 1.7);
      const a = clamp(0.35 * l.i * (1 - rad / R) * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 3.9)));
      ctx.fillStyle = `rgba(255,240,215,${a})`; ctx.beginPath(); ctx.arc(px, py, 1.4 + 1.8 * h3, 0, Math.PI * 2); ctx.fill();
    }
  });
  ctx.restore(); ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
}

const gs = (x: number, w: number) => Math.exp(-(x / w) * (x / w));
const dissolveAmt = (t: number) => { let m = 0; for (const d of TL.dissolves) m = Math.max(m, 1 - ss(0, 0.55, Math.abs(t - d))); return m; };

function paint(ctx: CanvasRenderingContext2D, f: number) {
  const B = bufs(), t = f / 30;
  const ac = B.acc.getContext("2d")!;
  ac.setTransform(1, 0, 0, 1, 0, 0); ac.globalCompositeOperation = "source-over";
  for (let k = 0; k < SUB; k++) {
    const ts = (f + (k / (SUB - 1) - 0.5) * 0.5) / 30;
    composite(B, Math.max(0, ts));
    ac.globalAlpha = 1 / (k + 1); ac.drawImage(B.comp, 0, 0);
  }
  ac.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.filter = "none";
  ctx.drawImage(B.acc, 0, 0);
  beamsAndDust(ctx, t);
  // vignette
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(W / 2, H * 0.47, H * 0.22, W / 2, H * 0.5, H * 0.72); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // grain: finer, calmer, changes every 2 frames
  ctx.globalAlpha = 0.1; ctx.globalCompositeOperation = "overlay"; ctx.drawImage(B.grain[Math.floor(f / 2) % 6], 0, 0, W, H); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  // calm ink dissolve through dark
  const b = dissolveAmt(t);
  if (b > 0.005) {
    const bx = B.blotC.getContext("2d")!, im = bx.createImageData(BW, BH);
    for (let i = 0; i < BW * BH; i++) im.data[i * 4 + 3] = Math.round(clamp((b * 1.35 - B.blot[i]) / 0.25) * 255);
    bx.putImageData(im, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(B.blotC, 0, 0, W, H);
  }
  // the only flash: the smash
  const fl = gs(t - SMASH, 0.05);
  if (fl > 0.01 && t < SMASH + 0.1) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(190,10,10,${clamp(fl) * 0.6})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
  if (t >= SMASH + 0.08) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
}

const Stage: React.FC = () => {
  const f = useCurrentFrame(); const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const c = ref.current; if (c) paint(c.getContext("2d")!, f); }, [f]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", width: W, height: H }} />;
};

// ---------- typography: typewriter narration (letters fade in), in-scene dialogue, title + end cards
const TYPE = "'Courier New', Courier, monospace";
const STAMP = "Impact, 'Arial Black', sans-serif";
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const KEY = new Set(["berempat", "lima", "gelas", "kopinya", "kliwon", "senter", "bambu", "makam", "ngebul", "hitung", "satu", "dua", "tiga", "empat", "sebelahku", "kelima", "berkurang", "habis", "diam", "rumahmu", "lebih", "ulang", "dihitung", "menunjuk"]);
const NARR = WORDS.filter((w) => w[0] === "N" && !/[\[\]]/.test(w[1]));
const CHUNKS: { a: number; b: number; ws: [string, number, number][] }[] = [];
{
  let cur: [string, number, number][] = [];
  NARR.forEach((w, i) => {
    cur.push([w[1], w[2], w[3]]);
    const endS = /[.,]$|\.\.\.$/.test(w[1]);
    if (endS || cur.length >= 5 || i === NARR.length - 1) { CHUNKS.push({ a: cur[0][1], b: cur[cur.length - 1][2], ws: cur }); cur = []; }
  });
}
const Narration: React.FC<{ t: number }> = ({ t }) => {
  const k = CHUNKS.findIndex((c, i) => t >= c.a - 0.05 && t < Math.min((CHUNKS[i + 1]?.a ?? Infinity) - 0.02, c.b + 0.9));
  if (k < 0) return null;
  const c = CHUNKS[k], endT = Math.min((CHUNKS[k + 1]?.a ?? Infinity) - 0.02, c.b + 0.9);
  const op = clamp((t - (c.a - 0.05)) * 8) * (1 - ss(endT - 0.18, endT, t));
  return (
    <div style={{ position: "absolute", left: 500 - 410, width: 820, top: 1150, textAlign: "center", opacity: op, fontFamily: TYPE, fontWeight: 700, fontSize: 52, lineHeight: 1.3, color: "#efe6cf", textShadow: "0 0 18px rgba(0,0,0,0.95), 0 3px 0 #000" }}>
      {c.ws.map(([w, a, b], i) => {
        const n = w.length, dur = Math.max(0.12, b - a);
        const key = KEY.has(w.toLowerCase().replace(/[^a-z\-]/g, ""));
        return (
          <span key={i} style={{ color: key ? "#e0261f" : undefined }}>
            {w.split("").map((ch, j) => <span key={j} style={{ opacity: clamp((t - (a + (j / n) * dur)) * 12) }}>{ch}</span>)}
            {i < c.ws.length - 1 ? " " : ""}
          </span>
        );
      })}
      <span style={{ opacity: 0.5 + 0.5 * Math.sin(t * 6), color: "#e0261f" }}>▌</span>
    </div>
  );
};
/** dialogue lines (D = Pak Darto, U = Udin): a speaker tag + the quoted line, typed with the word timestamps, in the caption zone */
const SPEAKER: Record<string, string> = { D: "PAK DARTO", U: "UDIN" };
const DLINES: { who: string; a: number; b: number; ws: [string, number, number][] }[] = [];
{ let cur: typeof DLINES[number] | null = null;
  for (const w of WORDS) { if (w[0] === "N") continue;
    if (!cur || cur.who !== w[0] || w[2] - cur.b > 0.9) { cur = { who: w[0], a: w[2], b: w[3], ws: [] }; DLINES.push(cur); }
    cur.ws.push([w[1], w[2], w[3]]); cur.b = w[3]; } }
const Dialogue: React.FC<{ t: number }> = ({ t }) => {
  // a line stays up to 0.9 s after its last word, but always clears 0.1 s before the next narration word (no overlap)
  const endOf = (l: typeof DLINES[number]) => { const nx = WORDS.find((w) => w[0] === "N" && w[2] > l.b); return Math.min(l.b + 0.9, (nx ? nx[2] : 1e9) - 0.1); };
  const L = DLINES.find((l) => t >= l.a - 0.15 && t < endOf(l)); if (!L) return null;
  const e = endOf(L), op = clamp((t - L.a + 0.15) / 0.25) * (1 - ss(e - 0.3, e, t));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 1110, paddingRight: 80, opacity: op }}>
      <div style={{ fontFamily: TYPE, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: "#e0261f", marginBottom: 10 }}>{SPEAKER[L.who]}</div>
      <div style={{ maxWidth: 820, textAlign: "center", fontFamily: TYPE, fontWeight: 700, fontStyle: "italic", fontSize: 54, lineHeight: 1.3, color: "#f4efe2", textShadow: "0 0 18px rgba(0,0,0,0.95), 0 3px 0 #000" }}>
        “{L.ws.map(([w, a, b], i) => { const n = w.length; return <span key={i}>{w.split("").map((ch, k) => <span key={k} style={{ opacity: clamp((t - (a + ((b - a) * k) / n)) * 12) }}>{ch}</span>)}{i < L.ws.length - 1 ? " " : ""}</span>; })}”
      </div>
    </AbsoluteFill>
  );
};
const Stamp: React.FC<{ text: string; size: number; t0: number; t: number; top: number; color?: string; rot?: number }> = ({ text, size, t0, t, top, color = "#d4141a", rot = -3 }) => {
  const a = t - t0; if (a < 0) return null; const sc = a < 0.08 ? 1.8 - 10 * a : 1;
  return <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", transform: `scale(${sc}) rotate(${rot}deg)` }}>
    <span style={{ fontFamily: STAMP, fontSize: size, color, letterSpacing: 8, padding: "6px 28px", border: `8px solid ${color}`, display: "inline-block", opacity: 0.94,
      maskImage: "repeating-linear-gradient(115deg, #000 0 7px, rgba(0,0,0,0.78) 7px 9px)" }}>{text}</span></div>;
};
const FadeLine: React.FC<{ text: string; size: number; t0: number; t: number; top: number; color: string; spacing?: number }> = ({ text, size, t0, t, top, color, spacing = 4 }) => {
  const a = easeOut((t - t0) / 0.8); if (t < t0) return null;
  return <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: a, transform: `translateY(${(1 - a) * 10}px)`,
    fontFamily: TYPE, fontWeight: 700, fontSize: size, color, letterSpacing: spacing }}>{text}</div>;
};
const TitleCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < TITLE_A - 0.3 || t >= TITLE_B) return null;
  const bg = ss(TITLE_A - 0.3, TITLE_A, t);
  const t0 = CUE("kentongan"), a = easeOut((t - t0) / 0.8), out = 1 - ss(TITLE_B - 0.45, TITLE_B - 0.05, t);
  const line = (txt: string, top: number, delay: number) => {
    const b = easeOut((t - t0 - delay) / 0.8);
    return <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: b * out, transform: `scale(${1.04 - 0.04 * b})`,
      fontFamily: STAMP, fontSize: 150, color: "#c4121a", letterSpacing: 30 - 22 * b, textShadow: "0 0 30px rgba(200,0,0,0.35)" }}>{txt}</div>;
  };
  return <AbsoluteFill style={{ background: `rgba(0,0,0,${bg})` }}>{a > 0 && <>{line("GELAS", 760, 0)}{line("KELIMA", 940, 0.42)}</>}</AbsoluteFill>;
};
const Header: React.FC<{ t: number }> = ({ t }) => {
  if (t < TITLE_B || t >= SMASH) return null;
  return <div style={{ position: "absolute", top: 210, left: 60, display: "flex", alignItems: "center", gap: 18, opacity: easeOut((t - TITLE_B) / 0.6) }}>
    <span style={{ fontFamily: STAMP, fontSize: 40, color: "#efe6cf", background: "#c4121a", padding: "4px 16px", letterSpacing: 4 }}>GELAS KELIMA</span>
    <span style={{ fontFamily: TYPE, fontWeight: 700, fontSize: 28, color: "#efe6cf", letterSpacing: 4 }}>CERITA RONDA</span></div>;
};
const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < SMASH) return null;
  const st = CUE("stampEnd");
  return <AbsoluteFill style={{ background: "#000" }}>
    <Stamp text="JANGAN DIHITUNG ULANG" size={76} t0={st} t={t} top={780} />
    <FadeLine text="JANGAN DIJAWAB" size={48} t0={st + 0.8} t={t} top={990} color="#efe6cf" spacing={10} />
    <FadeLine text="cerita baru tiap Selasa & Jumat, 19.00" size={34} t0={st + 1.5} t={t} top={1080} color="#8a8070" />
  </AbsoluteFill>;
};

export const HORROR2_FRAMES = Math.round(TL.total * 30);
export const Horror2: React.FC = () => {
  const f = useCurrentFrame(), t = f / 30;
  const audio = (getInputProps() as { audio?: boolean }).audio === true;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage />
      <Header t={t} />
      <TitleCard t={t} />
      {t < SMASH && <Narration t={t} />}
      <Dialogue t={t} />
      <EndCard t={t} />
      {audio && <Audio src={staticFile("horror2_mix.wav")} />}
    </AbsoluteFill>
  );
};
