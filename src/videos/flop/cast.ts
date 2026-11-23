// Cast for "The Hot Ice Cream": lit flat cards in the 3D schoolyard (infrastructure from the bridge template's cast.ts).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxStars, fxContact, fxShadow, fxPuff, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { FPS, D0, SHOTS, V3, smooth, clamp01, UPX, MAT, PAPER, flop, J1, J3, JR, J6, J8, slowU, barH, Jump } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number]; sy?: number;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};
// ---- STAGE ----
export type Stage = { places: Place[]; fx: FxPlace[] };
const gctx = (p: Pen) => (p as unknown as { g: CanvasRenderingContext2D }).g;

// ---------------- cast ----------------
const FOS: Outfit = { jacket: "#1f8a4d", pants: "#f4f1ea", boots: "#f4f1ea", hat: "hair", hair: "#7a4a26", skin: "#f5c9a0", buttons: "#f6d23c" };
const COACH_A: Outfit = { jacket: "#d23b3b", pants: "#2f3f6e", boots: "#2a211c", hat: "cap", cap: "#2f3f6e", skin: "#ecd0b6", moustache: "#5a3b2a", build: "stout" };
const COACH_B: Outfit = { jacket: "#2f3f6e", pants: "#2f3f6e", boots: "#f4f1ea", hat: "hair", hair: "#3a2a20", skin: "#c99067" };
const RIVAL: Outfit = { jacket: "#2f7fd0", pants: "#f4f1ea", boots: "#f4f1ea", hat: "hair", hair: "#1d1512", skin: "#8d5a3b" };
const MODERN: Outfit[] = [
  { jacket: "#e8622c", pants: "#1f2a44", boots: "#f4f1ea", hat: "hair", hair: "#1d1512", skin: "#a86f4a" },
  { jacket: "#7b5ac9", pants: "#1f2a44", boots: "#f4f1ea", hat: "hair", hair: "#e0b35a", skin: "#f5c9a0", dress: "#7b5ac9" },
  { jacket: "#1f8a4d", pants: "#f4f1ea", boots: "#f4f1ea", hat: "hair", hair: "#7a4a26", skin: "#f5c9a0" },
];
const CROWD = [0, 1, 2, 3, 4, 5, 6, 7].map((v): Outfit => {
  const tops = ["#d23b3b", "#2f7fd0", "#f6d23c", "#29a35a", "#e8622c", "#7b5ac9", "#f4f1ea", "#2f3f6e"];
  const sk = ["#f5c9a0", "#c99067", "#8d5a3b", "#ecd0b6", "#a86f4a", "#f1c9a5", "#7a4b30", "#e0b896"][v];
  const o: Outfit = { jacket: tops[v], pants: "#3b3f52", boots: "#2a211c", hat: v % 3 === 0 ? "cap" : "hair", cap: tops[(v + 3) % 8], hair: ["#1d1512", "#5a3b2a", "#e0b35a"][v % 3], skin: sk };
  return v % 4 === 1 ? { ...o, dress: tops[(v + 2) % 8] } : o;
});

// ---------------- fx drawings ----------------
const fxText = (txt: string, fill: string, size: number, cw: number, ch: number) => (p: Pen) => {
  const g = gctx(p);
  g.font = `900 ${size}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = size * 0.15; g.strokeStyle = "#241726"; g.lineJoin = "round"; g.strokeText(txt, cw / 2, ch / 2);
  g.fillStyle = fill; g.fillText(txt, cw / 2, ch / 2);
};
const fxHa = fxText("HA!", "#ffd84a", 150, 300, 200);
const fxHa2 = fxText("HA HA", "#ffffff", 110, 400, 200);
const fxQ = fxText("?", "#ffffff", 220, 200, 240);
const fxBang = fxText("!", "#ff5a3c", 220, 200, 240);
const fxSweat = (p: Pen) => { p.poly([[60, 10], [95, 80], [60, 110], [25, 80]], "#8fd3ff", 7); p.ell(52, 70, 7, 12, "#ffffff", 0); };
const fxBird = (p: Pen, up: number) => { const w = up ? -28 : 22; p.stroke([[10, 60 + w], [60, 60], [110, 60 + w]], 9, "#2a2430"); };
const fxTwinkle = (p: Pen) => p.poly([[50, 0], [62, 38], [100, 50], [62, 62], [50, 100], [38, 62], [0, 50], [38, 38]], "#fff6b0", 6);
/** cartoon fish, tail flick k (-1..1) */
const fxFish = (p: Pen, k: number) => {
  p.poly([[250, 120], [300, 70 + 30 * k], [300, 170 + 30 * k]], "#ff8a3c", 8);
  p.ell(150, 120, 120, 62, "#ffb04a", 9);
  p.arc(110, 120, 40, 50, -60, 60, 7);
  p.ell(70, 100, 16, 16, "#ffffff", 6); p.dot(66, 100, 7);
  p.arc(40, 140, 14, 10, 200, 340, 6);
};
const fxConfetti = (p: Pen, c: number) => p.poly([[0, 10], [60, 0], [70, 30], [10, 40]], ["#e43b3b", "#f6d23c", "#2f7fd0", "#29a35a", "#ffffff"][c % 5], 4);
const fxMedal = (p: Pen) => {
  p.poly([[60, 0], [110, 0], [150, 120], [100, 120]], "#2f7fd0", 6); p.poly([[190, 0], [140, 0], [100, 120], [150, 120]], "#e43b3b", 6);
  p.ell(125, 175, 62, 62, "#f6c63c", 9); p.ell(125, 175, 40, 40, "#ffe27a", 5);
  p.poly([[125, 150], [132, 168], [150, 170], [136, 181], [140, 200], [125, 190], [110, 200], [114, 181], [100, 170], [118, 168]], "#f6c63c", 4);
};
const fxDot = (col: string, ring = true) => (p: Pen) => { p.ell(50, 50, 40, 40, col, ring ? 9 : 0); if (ring) p.ell(38, 38, 10, 8, "#ffffff", 0); };
const fxArrow = (p: Pen) => { // vertical double arrow
  p.stroke([[60, 30], [60, 370]], 16, "#241726"); p.stroke([[60, 30], [60, 370]], 9, "#ffd84a");
  p.poly([[60, 0], [100, 50], [20, 50]], "#ffd84a", 7); p.poly([[60, 400], [100, 350], [20, 350]], "#ffd84a", 7);
};
const fxPaper = (p: Pen) => {
  const g = gctx(p);
  g.fillStyle = "#f3eee0"; g.fillRect(0, 0, 900, 1200); g.strokeStyle = "#241726"; g.lineWidth = 14; g.strokeRect(7, 7, 886, 1186);
  g.fillStyle = "#241726"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "bold 70px Georgia, serif"; g.fillText("THE DAILY SPORTS", 450, 90);
  g.fillRect(40, 140, 820, 8); g.fillRect(40, 156, 820, 3);
  g.font = "900 104px Arial Black, Arial"; g.fillText("WORLD'S", 450, 260); g.fillText("LAZIEST", 450, 380); g.font = "900 80px Arial Black, Arial"; g.fillText("HIGH JUMPER", 450, 490);
  // photo: a stick jumper flopping over a bar
  g.fillStyle = "#cfd8dc"; g.fillRect(90, 560, 720, 420); g.strokeRect(90, 560, 720, 420);
  g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(150, 900); g.lineTo(150, 700); g.moveTo(750, 900); g.lineTo(750, 700); g.moveTo(140, 745); g.lineTo(760, 745); g.stroke();
  g.lineWidth = 26; g.beginPath(); g.moveTo(300, 820); g.quadraticCurveTo(450, 600, 600, 800); g.stroke();
  g.beginPath(); g.arc(285, 840, 40, 0, Math.PI * 2); g.fillStyle = "#f3eee0"; g.fill(); g.lineWidth = 10; g.stroke();
  g.fillStyle = "#8a8f94"; for (let k = 0; k < 6; k++) g.fillRect(90, 1020 + k * 26, k % 2 ? 560 : 720, 12);
};

// ---------------- acting helpers ----------------
type Act = { sy: number; dy: number };
const pop = (t: number, tE: number, amt = 0.14, jump = 0): Act => {
  const u = t - tE;
  if (u < -0.1 || u > 0.7) return { sy: 1, dy: 0 };
  if (u < 0) return { sy: 1 - 0.08 * (1 + u / 0.1) * (jump ? 1 : 0.4), dy: 0 };
  const sy = 1 + amt * Math.sin(u * 22) * Math.exp(-u * 6);
  const dy = jump && u < 0.36 ? jump * Math.sin((Math.PI * u) / 0.36) : 0;
  return { sy: jump && u >= 0.36 && u < 0.46 ? 0.9 : sy, dy };
};
const breathe = (t: number, i: number) => 1 + 0.014 * Math.sin(t * 2.6 + i * 1.3);
const laughBounce = (t: number, i: number): Act => { const s = Math.abs(Math.sin(t * 11 + i)); return { sy: 1 - 0.05 * s, dy: 0.035 * s }; };
const mul = (a: Act, b: Act): Act => ({ sy: a.sy * b.sy, dy: a.dy + b.dy });
const talking = (t: number, a: number, b: number, i = 0) => t >= a && t < b && Math.sin((t - a) * 2 * Math.PI * 4.6 + i) > -0.2;
const idle = (t: number, i: number) => q(1.5 * Math.sin(t * 2.1 + i * 1.7), 4);
const W = (s: number) => s - LEAD;
const fx1 = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false, flat = false) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft, flat });
const puffAt = (out: Stage, t: number, tE: number, x: number, y: number, z: number, s = 1) => {
  const u = (t - tE) / 0.5;
  if (u < 0 || u >= 1) return;
  fx1(out, `puff${q(u, 20)}`, 300, 300, (p) => fxPuff(p, q(u, 20)), x, y, z - 0.05, 0.9 * s, 0.9 * s, 0, true);
};
type Who2 = { i: number; o: Outfit; okey: string };
const put = (out: Stage, cam: CamInfo, who: Who2, x: number, y: number, z: number, fo: FrontOpts, t: number, act: Act = { sy: 1, dy: 0 }, scale = 1, shadow = true) => {
  const pl = person(cam, who, x, y + act.dy, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale);
  out.places.push({ ...pl, sy: act.sy * breathe(t, who.i) });
  if (shadow) blob(out, x, y, z, scale * (1 - Math.min(0.5, act.dy * 1.5)));
};
/** a jumper placed by body centre + roll (card pivots at the soles, so offset the feet) */
const CEN = 0.95;
const putJump = (out: Stage, cam: CamInfo, who: Who2, j: Jump, t: number, expr: Expr, extra: Partial<FrontOpts> = {}) => {
  const r = cam.right, sgn = r.z >= 0 ? -1 : 1, rho = sgn * j.th; // + th = head toward +z
  const ox = -CEN * Math.sin(rho), oy = CEN * Math.cos(rho);
  const fx = j.C[0] - r.x * ox, fy = j.C[1] - oy, fz = j.C[2] - r.z * ox;
  const mode: FrontOpts["mode"] = j.phase === "run" ? "stroll" : j.phase === "air" ? "fall" : "stand";
  const pl = person(cam, who, fx, fy, fz, { side: false, mirror: false }, { mode, phase: q(j.runPh, 20), expr, blink: lidAt(t, who.i), ...extra }, {});
  out.places.push({ ...pl, roll: rho, sy: j.phase === "land" ? 0.92 : 1 });
  if (j.phase === "run") blob(out, j.C[0], 0, j.C[2]);
  else blob(out, j.C[0], j.phase === "air" ? (Math.abs(j.C[2] - 1.6) < 1.4 ? MAT.top : 0) : MAT.top, j.C[2], 1.3);
};

/** spectators in the stand behind the mat: 3 rows; mood: watch | laugh | cheer */
const crowd = (out: Stage, cam: CamInfo, t: number, mood: "watch" | "laugh" | "cheer" | "gasp", olympic: boolean) => {
  const rows = olympic ? 3 : 2, per = olympic ? 13 : 9;
  for (let r = 0; r < rows; r++) for (let k = 0; k < per; k++) {
    const i = r * 20 + k, x = -6.6 + (k + (r % 2) * 0.5) * (13.2 / per) + (((i * 37) % 10) / 10 - 0.5) * 0.3;
    const z = 8.4 + r * 1.35, y = 0.62 + r * 0.72;
    const o = CROWD[(i * 5 + r) % 8];
    const ex: Expr = mood === "laugh" ? (i % 3 ? "laugh" : "grin") : mood === "cheer" ? (i % 2 ? "laugh" : "grin") : mood === "gasp" ? (i % 2 ? "shock" : "nervous") : (i % 3 ? "smile" : "neutral");
    const a = mood === "laugh" || mood === "cheer" ? laughBounce(t, i) : { sy: 1, dy: 0 };
    const wave = mood === "cheer" && i % 2 === 0 ? q(Math.sin(t * 9 + i), 20) : undefined;
    put(out, cam, { i: 100 + i, o, okey: `c${(i * 5 + r) % 8}` }, x, y, z, { mode: "stand", expr: ex, wave, prop: mood === "laugh" && i % 4 === 1 ? "belly" : mood === "laugh" && i % 4 === 3 ? "point" : null, look: Math.round(Math.sin(i) * 1) }, t, a, 1, false);
    if (mood === "laugh" && i % 6 === 2 && ((t * 2 + i * 0.3) % 1) < 0.6) fx1(out, i % 4 ? "ha" : "ha2", i % 4 ? 300 : 400, 200, i % 4 ? fxHa : fxHa2, x + 0.2, y + 2.2, z - 0.1, 0.45, 0.3, ((i % 3) - 1) * 0.2);
  }
};
const ambient = (out: Stage, t: number) => {
  for (let k = 0; k < 9; k++) {
    const a = t * (0.05 + 0.01 * (k % 3)) + k * 0.7, R = 34 + (k % 4) * 10, up = Math.floor(t * 6 + k) % 2;
    fx1(out, `bird${up}`, 120, 120, (p) => fxBird(p, up), Math.cos(a) * R, 15 + (k % 3) * 3 + Math.sin(t + k), 6 + Math.sin(a) * R, 0.6, 0.6);
  }
};
const confetti = (out: Stage, t: number, t0: number, cx: number, cz: number) => {
  if (t < t0) return;
  for (let k = 0; k < 28; k++) {
    const u = t - t0, x = cx + ((k * 0.37) % 1 - 0.5) * 4 + 0.3 * Math.sin(u * 3 + k), y = 4.5 + (k % 5) * 0.4 - 1.2 * u - 0.15 * ((k * 0.61) % 1) * u, z = cz + ((k * 0.73) % 1 - 0.5) * 3;
    if (y < 0.1) continue;
    fx1(out, `conf${k % 5}`, 80, 50, (p) => fxConfetti(p, k % 5), x, y, z, 0.09, 0.06, u * (4 + (k % 3)) + k);
  }
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  ambient(out, t);
  const F = { i: 1, o: FOS, okey: "fos" };

  if (id === 1) {
    const j = flop(t, J1, barH(1, t));
    const ex: Expr = j.phase === "run" ? "smug" : j.phase === "air" ? "proud" : "smile_closed";
    putJump(out, cam, F, j, t, ex);
    puffAt(out, t, J1 + 0.62, j.C[0], MAT.top + 0.1, 1.6, 1.2);
    crowd(out, cam, t, t >= W(1.9) ? "laugh" : t > J1 ? "gasp" : "watch", false);
  }

  if (id === 2) {
    const demo = t >= W(5.43);
    put(out, cam, F, 0.8, 0, -2.6, { mode: "stand", expr: t < W(4.26) ? "smug" : "smile_closed", prop: "hips", look: -1, facing: -1, tilt: idle(t, 1) }, t, pop(t, 4.26, 0.06));
    put(out, cam, { i: 2, o: COACH_A, okey: "ca" }, -0.15, 0, -2.45,
      { mode: "stand", expr: talking(t, 2.8, 5.3) ? "talk" : "nervous", prop: demo ? "point" : "push", look: 1, facing: 1, tilt: idle(t, 2) + (talking(t, 2.8, 5.3, 1) ? 2 : 0) }, t, pop(t, 3.19, 0.1));
    // coach B demonstrates "face first": a little dive forward
    const dv = demo ? smooth((t - 5.43) / 0.3) * (1 - smooth((t - 6.1) / 0.3)) : 0;
    put(out, cam, { i: 3, o: COACH_B, okey: "cb" }, -1.0, 0, -2.95,
      { mode: dv > 0.3 ? "fall" : "stand", expr: demo ? "shock" : "talk", prop: demo ? null : "push", look: 1, facing: 1, tilt: 25 * dv + idle(t, 3) }, t, mul(pop(t, 5.43, 0.14, 0.12), { sy: 1, dy: 0 }));
    if (demo && t < 6.1) fx1(out, "bang", 200, 240, fxBang, -0.8, 2.0, -3.05, 0.22, 0.26, 0.2);
    crowd(out, cam, t, "watch", false);
  }

  if (id === 3) {
    const j = flop(t, J3, barH(3, t));
    putJump(out, cam, F, j, t, j.phase === "run" ? "smug" : j.phase === "air" ? "proud" : "smug");
    puffAt(out, t, J3 + 0.62, j.C[0], MAT.top + 0.1, 1.6, 1.2);
    // a fish flopping on the mat right next to him
    if (t > 7.35) {
      const big = t >= W(8.37) ? Math.max(0, Math.sin(Math.min(1, (t - 8.33) / 0.45) * Math.PI)) * 0.5 : 0;
      const hop = Math.abs(Math.sin(t * 9)) * 0.18 + big, k = q(Math.sin(t * 18), 6);
      fx1(out, `fish${k}`, 320, 240, (p) => fxFish(p, k), -0.7, MAT.top + 0.16 + hop, 1.7, 0.62, 0.46, Math.sin(t * 9) * 0.6);
      if (t >= W(8.37) && t < 8.9) puffAt(out, t, 8.37, -0.7, MAT.top + 0.1, 1.7, 0.7);
    }
    crowd(out, cam, t, t > 7.6 ? "laugh" : "watch", false);
  }

  if (id === 4) {
    const u = clamp01((t - 8.72) / 0.32), y = PAPER[1] + 0.9 * (1 - u) ** 2;
    const sc = 1 + 0.12 * pop(t, 10.26, 1).sy - 0.12 + (u < 1 ? 0 : 0);
    fx1(out, "paper", 900, 1200, fxPaper, PAPER[0], y + 0.005, PAPER[2], 0.5 * sc, 0.667 * sc, Math.PI + 2.2 * (1 - u) ** 2 + 0.05, false, true);
    if (u >= 1 && t < 9.5) puffAt(out, t, 9.04, PAPER[0], PAPER[1] + 0.05, PAPER[2] - 0.1, 0.6);
    if (t >= W(10.26) && t < 10.76) { const v = q((t - W(10.26)) / 0.5, 30); fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v), PAPER[0], PAPER[1] + 0.2, PAPER[2] + 0.05, 0.75, 0.75); }
  }

  if (id === 5) {
    crowd(out, cam, t, t >= 14.55 ? "gasp" : "watch", true);
    const j = flop(t, JR, barH(5, t), 0.6, true);
    putJump(out, cam, { i: 4, o: RIVAL, okey: "riv" }, j, t, j.phase === "air" ? (t > 14.5 ? "shock" : "stern") : j.phase === "run" ? "stern" : "dazed");
    if (t > 14.6) puffAt(out, t, JR + 0.62, 0.6, MAT.top + 0.1, 1.6, 1.1);
    put(out, cam, F, -3.3, 0, -2.6, { mode: "stand", expr: t >= 14.6 ? "smug" : "neutral", look: 1, facing: 1, tilt: idle(t, 1) }, t, pop(t, 14.6, 0.08));
    if (t >= 14.6 && t < 15.1) fx1(out, "bang", 200, 240, fxBang, 0.2, 2.8, 0.1, 0.3, 0.36, 0.15);
  }

  if (id === 6) {
    const gold = t >= W(16.58);
    if (t < 16.25) {
      const j = flop(t, J6, 2.24);
      putJump(out, cam, F, j, t, j.phase === "run" ? "stern" : j.phase === "air" ? "proud" : "relief");
      puffAt(out, t, J6 + 0.62, j.C[0], MAT.top + 0.1, 1.6, 1.3);
    } else { // springs up on the mat, arms up, medal
      put(out, cam, F, 0.2, MAT.top, 1.6, { mode: "stand", expr: gold ? "laugh" : "proud", wave: q(0.6 + 0.3 * Math.sin(t * 8), 20), tilt: idle(t, 1) } as FrontOpts, t, mul(pop(t, 16.25, 0.16, 0.25), gold ? laughBounce(t, 1) : { sy: 1, dy: 0 }), 1, true);
      if (gold) {
        const pu = clamp01((t - W(16.58)) / 0.25);
        fx1(out, "medal", 250, 250, fxMedal, 0.2 - cam.right.x * 0.02, MAT.top + 1.0, 1.45, 0.3 * pu, 0.3 * pu, 0.1 * Math.sin(t * 5));
        if (t < 16.58 + 0.5) { const v = q((t - W(16.58)) / 0.5, 30); fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v), 0.2, MAT.top + 1.2, 1.75, 1.6, 1.6); }
        for (let k = 0; k < 5; k++) { const ph = (t * 1.6 + k * 0.21) % 1, sc = Math.sin(ph * Math.PI); fx1(out, "twinkle", 100, 100, fxTwinkle, 0.2 + 0.32 * Math.cos(k * 1.3), MAT.top + 1.0 + 0.3 * Math.sin(k * 2.1), 1.4, 0.1 * sc + 0.01, 0.1 * sc + 0.01, ph); }
      }
    }
    confetti(out, t, 16.5, 0.2, 2.0);
    crowd(out, cam, t, t >= 15.5 ? "cheer" : "watch", true);
  }

  if (id === 7) {
    const u = slowU(t), tj = J6 + u * 0.62, j = flop(tj, J6, 2.24);
    putJump(out, cam, F, j, t, "proud");
    // centre of mass: sits ~0.3 m below the arched body's centre -> passes UNDER the bar
    const cm = (uu: number): V3 => { const jj = flop(J6 + uu * 0.62, J6, 2.24); return [jj.C[0] + 0.45, jj.C[1] - 0.3 * Math.sin(uu * Math.PI) - 0.05, jj.C[2]]; };
    if (t >= W(19.28)) {
      for (let k = 1; k <= 12; k++) { const uu = u - k * 0.035; if (uu < 0) break; const p = cm(uu); fx1(out, "trail", 100, 100, fxDot("#ff5a3c", false), p[0], p[1], p[2], 0.045, 0.045); }
      const p = cm(u), pu = clamp01((t - W(19.28)) / 0.3);
      fx1(out, "cm", 100, 100, fxDot("#ff3b2f"), p[0], p[1], p[2], 0.16 * pu, 0.16 * pu);
    }
    if (t >= W(21.26)) { // ghost straddle path: its centre of mass must clear the bar
      const g = clamp01((t - W(21.26)) / 0.4);
      for (let k = 0; k <= 16; k++) { const uu = k / 16, z = -0.75 + 2.35 * uu, y = 1.05 + (2.34 - 1.05) * Math.sin(uu * Math.PI); if (uu > g) break; fx1(out, "ghost", 100, 100, fxDot("#e8ecf2", false), 0.5, y, z, 0.05, 0.05); }
      if (t >= W(21.94)) { const a = clamp01((t - W(21.94)) / 0.25); fx1(out, "arrow", 120, 400, fxArrow, 0.55, 2.2, -0.05, 0.08 * a, 0.27 * a); }
    }
  }

  if (id === 8) {
    J8.forEach((t0, k) => {
      if (t < t0 - 0.8) return;
      const j = flop(t, t0, 2.24, -1.3 + k * 1.3);
      putJump(out, cam, { i: 50 + k, o: MODERN[k], okey: `m${k}` }, j, t, j.phase === "air" ? "proud" : j.phase === "run" ? "smug" : "smile_closed");
      puffAt(out, t, t0 + 0.62, j.C[0], MAT.top + 0.1, 1.6, 1.1);
    });
    if (t >= W(25.66)) { const v = q(clamp01((t - W(25.66)) / 0.5), 30); if (v < 1) fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v), 1.3, MAT.top + 0.5, 1.75, 1.4, 1.4); }
    crowd(out, cam, t, "cheer", true);
    confetti(out, t, 25.5, 0.5, 2.5);
  }
  return out;
};
export { FPS };