// Cast for "The Hot Ice Cream": lit flat cards in the 3D schoolyard (infrastructure from the bridge template's cast.ts).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxStars, fxContact, fxShadow, fxPuff, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { FPS, D0, SHOTS, V3, smooth, clamp01, ERA, TEACH, KIDS, FREEZER, FZ, POT_TABLE, BOARD, LID_OPEN_F, potFlight, POT_THROW } from "./story";
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

// ---------------- outfits ----------------
const HAIR = "#1d1512";
const SK = ["#8d5a3b", "#a86f4a", "#7a4b30", "#b07a52", "#6e4329", "#9a6442", "#83532f", "#a06a45"];
const kidO = (v: number): Outfit => {
  const shirt = ["#f4f1ea", "#dfeaf6", "#f4f1ea", "#f6e7b5", "#f4f1ea", "#dfeaf6", "#f4f1ea", "#f6e7b5"][v % 8];
  const o: Outfit = { jacket: shirt, pants: v % 3 === 1 ? "#2f3f6e" : "#a8875a", boots: "#2a211c", hat: "hair", hair: HAIR, skin: SK[v % 8], build: "kid" };
  return v % 4 === 2 ? { ...o, dress: "#3d6fb8" } : o;
};
const ERASTO: Outfit = { jacket: "#d8432f", pants: "#a8875a", boots: "#2a211c", hat: "hair", hair: HAIR, skin: "#8f5b3a", build: "kid" };
const TEACHER: Outfit = { jacket: "#6b4a2f", pants: "#3b3f52", boots: "#2a211c", hat: "hair", hair: "#2a2320", skin: "#7d4f33", moustache: "#1d1512", buttons: "#e8c45a", build: "stout" };
const SCI: Outfit[] = [
  { jacket: "#f3f3f0", pants: "#3b3f52", boots: "#2a211c", hat: "hair", hair: "#9a9a9a", skin: "#f1c9a5", moustache: "#9a9a9a" },
  { jacket: "#f3f3f0", pants: "#4a3f35", boots: "#2a211c", hat: "hair", hair: "#5a3b2a", skin: "#c99067" },
];
const KIDO = [0, 1, 2, 3, 4, 5, 6, 7].map(kidO);
const gctx = (p: Pen) => (p as unknown as { g: CanvasRenderingContext2D }).g;

// ---------------- fx drawings ----------------
const fxSteam = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const x0 = 80 + k * 70, pts: [number, number][] = [];
    const ph = t * Math.PI * 2 + k * 2.1;
    for (let i = 0; i <= 14; i++) { const v = i / 14; pts.push([x0 + 22 * Math.sin(ph + v * 7) * (0.4 + v), 580 - v * 520 - 40 * ((t + k * 0.33) % 1)]); }
    const cut = Math.floor(3 + 10 * ((t + k * 0.37) % 1));
    const seg = pts.slice(Math.max(0, cut - 9), cut + 1);
    if (seg.length > 1) { p.stroke(seg, 30, "#3a3442"); p.stroke(seg, 20, "#ffffff"); }
  }
};
const fxMist = (p: Pen, u: number) => {
  const a = 1 - u;
  for (const [x, y, r] of [[150, 170, 95], [250, 150, 110], [350, 175, 90], [210, 110, 80], [300, 100, 70]] as const)
    p.ell(x, y + 40 * (1 - u), r * (0.6 + 0.6 * u), r * 0.55 * (0.6 + 0.6 * u), `rgba(232,244,255,${(0.85 * a).toFixed(3)})`, 0);
};
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
const fxSwirl = (p: Pen) => {
  for (let k = 0; k < 2; k++) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 1.6 + k * Math.PI, r = 60 + 150 * (i / 40); pts.push([250 + r * Math.cos(a), 250 + r * 0.55 * Math.sin(a)]); }
    p.stroke(pts, 26, "#241726"); p.stroke(pts, 15, "#ff9a3c");
    const [x1, y1] = pts[40], [x0, y0] = pts[37], ang = Math.atan2(y1 - y0, x1 - x0);
    const tip = (d: number, s: number): [number, number] => [x1 + d * Math.cos(ang + s), y1 + d * Math.sin(ang + s)];
    p.poly([tip(28, 0), tip(30, 2.4), tip(30, -2.4)], "#ff9a3c", 7);
  }
};
const fxHeat = (p: Pen, t: number) => {
  for (let k = 0; k < 4; k++) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) pts.push([60 + k * 60 + 12 * Math.sin(t * 6.28 + i * 0.9 + k), 280 - i * 25]);
    p.stroke(pts, 9, "#ff7b39");
  }
};
const fxDrip = (p: Pen) => { p.poly([[50, 0], [80, 70], [50, 100], [20, 70]], "#f3e6c8", 6); };
/** comic anger: three puffs of steam from the head */
const fxAnger = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const u = (t + k / 3) % 1, x = 60 + k * 90 + (k - 1) * 40 * u, y = 230 - 170 * u, r = 26 + 34 * u;
    p.ell(x, y, r, r * 0.85, `rgba(255,255,255,${(1 - u).toFixed(3)})`, 5 * (1 - u));
  }
};
const fxBird = (p: Pen, up: number) => {
  const w = up ? -28 : 22;
  p.stroke([[10, 60 + w], [60, 60], [110, 60 + w]], 9, "#2a2430");
};
const fxLeaf = (p: Pen, k: number) => { p.ell(50, 30, 42, 18, ["#e3a33a", "#7cb648", "#c96a2c"][k % 3], 5); p.stroke([[12, 30], [88, 30]], 3); };
const fxFlake = (p: Pen) => { for (let a = 0; a < 6; a++) p.stroke([[50, 50], [50 + 40 * Math.cos(a * 1.047), 50 + 40 * Math.sin(a * 1.047)]], 9, "#ffffff"); };
const fxTwinkle = (p: Pen) => p.poly([[50, 0], [62, 38], [100, 50], [62, 62], [50, 100], [38, 62], [0, 50], [38, 38]], "#fff6b0", 6);
const fxSpeed = (p: Pen) => { for (let k = 0; k < 5; k++) { const y = 30 + k * 35, x0 = 30 + (k % 2) * 60; p.stroke([[x0, y], [x0 + 260 - (k % 3) * 50, y]], 12, "#ffffff"); } };

// ---------------- acting helpers ----------------
type Act = { sy: number; dy: number };
/** stretch-then-settle pop after a reaction at tE (squash & stretch), plus an optional jump */
const pop = (t: number, tE: number, amt = 0.14, jump = 0): Act => {
  const u = t - tE;
  if (u < -0.1 || u > 0.7) return { sy: 1, dy: 0 };
  if (u < 0) return { sy: 1 - 0.08 * (1 + u / 0.1) * (jump ? 1 : 0.4), dy: 0 }; // anticipation squash
  const sy = 1 + amt * Math.sin(u * 22) * Math.exp(-u * 6);
  const dy = jump && u < 0.36 ? jump * Math.sin((Math.PI * u) / 0.36) : 0;
  return { sy: jump && u >= 0.36 && u < 0.46 ? 0.9 : sy, dy };
};
const breathe = (t: number, i: number) => 1 + 0.014 * Math.sin(t * 2.6 + i * 1.3);
const laughBounce = (t: number, i: number): Act => { const s = Math.abs(Math.sin(t * 11 + i)); return { sy: 1 - 0.05 * s, dy: 0.035 * s }; };
const mul = (a: Act, b: Act): Act => ({ sy: a.sy * b.sy, dy: a.dy + b.dy });
const talking = (t: number, a: number, b: number, i = 0) => t >= a && t < b && Math.sin((t - a) * 2 * Math.PI * 4.6 + i) > -0.2;

const fx1 = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft });
const steamAt = (out: Stage, t: number, x: number, y: number, z: number, s = 1, i = 0) => {
  const u = q(((t * 0.8 + i * 0.31) % 1), 24);
  fx1(out, `steam${u}`, 360, 620, (p) => fxSteam(p, u), x, y + 0.24 * s, z, 0.26 * s, 0.46 * s);
};
const puffAt = (out: Stage, t: number, tE: number, x: number, z: number, s = 1) => {
  const u = (t - tE) / 0.5;
  if (u < 0 || u >= 1) return;
  fx1(out, `puff${q(u, 20)}`, 300, 300, (p) => fxPuff(p, q(u, 20)), x, 0.12 * s, z - 0.05, 0.7 * s, 0.7 * s, 0, true);
};
type Who2 = { i: number; o: Outfit; okey: string };
const put = (out: Stage, cam: CamInfo, who: Who2, x: number, z: number, fo: FrontOpts, t: number, act: Act = { sy: 1, dy: 0 }, scale = 1) => {
  const pl = person(cam, who, x, D0 + act.dy, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale);
  out.places.push({ ...pl, sy: act.sy * breathe(t, who.i) });
  blob(out, x, D0, z, scale * (1 - Math.min(0.5, act.dy * 1.5)));
};
const idle = (t: number, i: number) => q(1.5 * Math.sin(t * 2.1 + i * 1.7), 4);
const W = (s: number) => s - LEAD;
const RING: [number, number][] = [[-0.35, 2.55], [0.55, 2.75], [1.25, 2.9], [-1.95, 2.6], [2.1, 3.1], [-2.6, 3.2], [-3.2, 2.2], [2.75, 2.2]];

/** ambient life in every shot: birds circling high, leaves drifting through the yard */
const ambient = (out: Stage, t: number, cam: CamInfo) => {
  for (let k = 0; k < 9; k++) {
    const a = t * (0.05 + 0.01 * (k % 3)) + k * 0.7, R = 30 + (k % 4) * 9;
    const up = Math.floor(t * 6 + k) % 2;
    fx1(out, `bird${up}`, 120, 120, (p) => fxBird(p, up), Math.cos(a) * R, 14 + (k % 3) * 3 + Math.sin(t + k), 4 + Math.sin(a) * R, 0.55, 0.55);
  }
  for (let k = 0; k < 10; k++) {
    const per = 5 + (k % 4), u = ((t + k * 1.37) % per) / per;
    const x = -4 + ((k * 1.9) % 8) + 0.8 * Math.sin(u * 9 + k), z = 0.5 + ((k * 2.3) % 6), y = 3.2 - 3.2 * u;
    if (y < 0.05 || Math.hypot(x - cam.pos.x, y - cam.pos.y, z - cam.pos.z) < 2.6) continue;
    fx1(out, `leaf${k % 3}`, 100, 60, (p) => fxLeaf(p, k % 3), x, y, z, 0.07, 0.042, Math.sin(t * 3 + k) * 1.2);
  }
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  ambient(out, t, cam);
  const E = { i: 1, o: ERASTO, okey: "era" };
  const kid = (k: number): Who2 => ({ i: 10 + k, o: KIDO[KIDS[k][2]], okey: `k${KIDS[k][2]}` });
  const potY = 0.78;
  const toward = (x: number) => (x > ERA[0] ? -1 : 1);

  if (id === 1 || id === 2 || id === 3) {
    const th = POT_THROW[id];
    const holding = id === 2 || (th !== undefined && t < W(th[0]));
    const pushing = th !== undefined && t >= W(th[0]) && t < th[1] + 0.6;
    // walk-in (shot 1): strolls in from the left with the steaming pot, stops at the freezer
    const walkU = id === 1 ? clamp01(t / 0.6) : 1;
    const ex0 = id === 1 ? ERA[0] - 1.3 * (1 - (1 - walkU) ** 2) * 0 - 0.25 * (1 - walkU) : ERA[0];
    const ez = id === 3 ? ERA[2] + 0.05 : ERA[2];
    const walking = id === 1 && t < 0.6;
    const ex: Expr = id === 1 ? (holding ? "smug" : t < W(4.56) ? "proud" : "smile_closed") : id === 3 ? (holding ? "stern" : "smug") : "neutral";
    const lean = th && t >= W(th[0]) - 0.25 && t < W(th[0]) ? -7 * smooth((t - (W(th[0]) - 0.25)) / 0.25) : pushing ? 6 * Math.exp(-(t - th![0]) * 4) : 0;
    let act: Act = th ? pop(t, th[0], 0.12) : { sy: 1, dy: 0 };
    if (walking) act = { sy: 1 - 0.03 * Math.abs(Math.sin(t * Math.PI * 2.4)), dy: 0.03 * Math.abs(Math.sin(t * Math.PI * 2.4)) };
    put(out, cam, E, ex0, ez, { mode: walking ? "stroll" : "stand", phase: walking ? q((t * 1.2) % 1, 30) : 0, expr: ex, prop: holding ? "pot" : pushing ? "push" : null, tilt: lean + idle(t, 1), facing: 1 }, t, act);
    if (holding) steamAt(out, t, ex0 + 0.02, potY, ez - 0.12, 0.8, 0);
    // the pot in flight: speed lines behind it
    const pf = potFlight(id, t);
    if (pf) fx1(out, "speed", 320, 200, fxSpeed, pf.p[0] - 0.22, pf.p[1] + 0.05, pf.p[2] - 0.05, 0.4, 0.25, -0.35);
    const potIn = th !== undefined && t >= th[1];
    if (potIn) {
      for (let k = 0; k < 3; k++) steamAt(out, t, FREEZER[0] - 0.3 + k * 0.3, FZ.h, FREEZER[2] - 0.1, 1.3, k + 1);
      const u = (t - th![1]) / 0.35;
      if (u < 1) fx1(out, `burst${q(u, 20)}`, 500, 500, (p) => fxBurst(p, q(u, 20), "#ffffff"), 0.42, FZ.h + 0.1, FREEZER[2] + 0.1, 0.6, 0.6);
    }
    const laughing = id === 1 && t >= W(4.56);
    KIDS.forEach(([x, z], k) => {
      if (id === 3 && k > 2) return;
      const zz = id === 2 && k > 3 ? z + 2.4 : z;
      const ex2: Expr = laughing ? (k % 3 === 0 ? "grin" : "laugh") : id === 2 ? (k % 2 ? "smile" : "neutral") : id === 1 && t > 2.9 ? "shock" : "neutral";
      const pr: Prop = laughing ? (k % 2 ? "belly" : "point") : null;
      let a: Act = laughing ? mul(pop(t, 4.56 + k * 0.05, 0.12), laughBounce(t, k)) : id === 1 ? pop(t, 2.95 + k * 0.03, 0.1) : { sy: 1, dy: 0 };
      if (id === 2) a = { sy: 1 + 0.03 * Math.sin(t * 5 + k), dy: 0 }; // stirring at the tables
      put(out, cam, kid(k), x, zz, { mode: "stand", expr: ex2, prop: pr, tilt: laughing ? q(6 * Math.sin(t * 12 + k), 3) : idle(t, k + 10), look: toward(x), facing: toward(x) as -1 | 1 }, t, a);
      if (laughing && k < 4 && ((t * 2 + k * 0.5) % 1) < 0.6) fx1(out, k % 2 ? "ha2" : "ha", k % 2 ? 400 : 300, 200, k % 2 ? fxHa2 : fxHa, x + 0.25, 1.62, zz - 0.1, k % 2 ? 0.5 : 0.42, 0.26, (k % 2 ? 0.2 : -0.2));
    });
    if (id === 2 && t >= W(11.12) && t < 11.12 + 0.5) { const u = q((t - W(11.12)) / 0.5, 30); fx1(out, `burst${u}`, 500, 500, (p) => fxBurst(p, u), FREEZER[0] + 0.42, FZ.h + 0.05, FREEZER[2] + 0.15, 0.55, 0.55); }
    if (id === 2) for (const k of [0, 1, 2, 3]) steamAt(out, t, -3.2 + k * 0.25 - 0.4, 0.86, 5.3, 0.45, k); // pots steaming on the tables
  }

  if (id === 4) {
    const groan = t < W(17.4);
    [0, 1, 2].forEach((k) => {
      const [x, z] = KIDS[k];
      const talk = k === 1 && talking(t, 17.4, 19.04);
      const ex: Expr = groan ? (t < W(16.56) ? "smug" : "stern") : talk ? "tease" : k === 1 ? "laugh" : "grin";
      const pr: Prop = groan ? (k === 2 ? "hips" : null) : k === 0 ? "point" : k === 1 ? "belly" : "point";
      const a = groan ? pop(t, 16.56, 0.06) : mul(pop(t, 17.4 + k * 0.06, 0.15), laughBounce(t, k));
      put(out, cam, kid(k), x, z, { mode: "stand", expr: ex, prop: pr, look: -1, facing: -1, tilt: groan ? idle(t, k) : q(5 * Math.sin(t * 13 + k * 2), 3) }, t, a);
      if (!groan && ((t * 2.2 + k * 0.4) % 1) < 0.6) fx1(out, k === 1 ? "ha2" : "ha", k === 1 ? 400 : 300, 200, k === 1 ? fxHa2 : fxHa, x + 0.22, 1.55, z - 0.1, k === 1 ? 0.5 : 0.38, 0.25, k % 2 ? 0.2 : -0.25);
    });
    steamAt(out, t, ERA[0], FZ.h, FREEZER[2], 1.2, 2);
  }

  if (id === 5) {
    const scolded = t >= W(21.28);
    const talk = talking(t, 21.0, 24.08, 1);
    put(out, cam, { i: 30, o: TEACHER, okey: "teach" }, TEACH[0], TEACH[2],
      { mode: "stand", expr: t < W(20.08) ? "neutral" : talk ? "talk" : scolded ? "angry" : "stern", prop: t >= W(20.08) ? (scolded ? "point" : "hips") : null, look: -1, facing: -1,
        tilt: idle(t, 30) + (talk ? q(2 * Math.sin(t * 9), 3) : 0), headTilt: scolded ? q(4 * Math.sin(t * 8), 3) : 0 }, t, mul(pop(t, 20.08, 0.08), pop(t, 21.28, 0.1)));
    if (t >= W(20.08) && t < 20.9) { const u = q(((t - 20.08) / 0.8) % 1, 20); fx1(out, `ang${u}`, 300, 260, (p) => fxAnger(p, u), TEACH[0], 2.15, TEACH[2] - 0.1, 0.55, 0.48, 0, true); } // the sigh
    if (scolded) { const u = q((t * 1.2) % 1, 20); fx1(out, `ang${u}`, 300, 260, (p) => fxAnger(p, u), TEACH[0], 2.15, TEACH[2] - 0.1, 0.55, 0.48, 0, true); }
    put(out, cam, E, ERA[0], ERA[2], { mode: "stand", expr: scolded ? "nervous" : "neutral", look: 1, facing: 1, tilt: idle(t, 1) + (scolded ? q(1.2 * Math.sin(t * 30), 2) : 0) }, t,
      scolded ? { sy: 0.97 - 0.03 * smooth((t - 21.28) / 0.4), dy: 0 } : { sy: 1, dy: 0 }); // shrinks a little
    if (scolded) { const u = ((t - 21.28) * 0.9) % 1; fx1(out, "sweat", 120, 120, fxSweat, ERA[0] + 0.24, 1.36 - 0.18 * u, ERA[2] - 0.12, 0.13, 0.13); }
    [3, 5].forEach((k) => put(out, cam, kid(k), KIDS[k][0], KIDS[k][1] + 0.8, { mode: "stand", expr: scolded ? "smug" : "smile_closed", look: 1 }, t));
  }

  if (id >= 6 && id <= 8) {
    const tOpen = LID_OPEN_F / FPS, opened = id > 6 || t >= tOpen;
    const solid = id === 8 && t >= W(30.88);
    const eEx: Expr = id === 6 ? (opened ? "shock" : "nervous") : id === 8 ? (solid ? "laugh" : "proud") : "smug";
    const eAct = id === 6 ? pop(t, tOpen, 0.16, 0.22) : id === 8 ? mul(pop(t, 30.88, 0.2, 0.18), solid ? laughBounce(t, 1) : { sy: 1, dy: 0 }) : { sy: 1, dy: 0 };
    put(out, cam, E, ERA[0], ERA[2], { mode: "stand", expr: eEx, prop: id === 8 ? "bowlUp" : null, look: 1, facing: id === 8 ? 0 : 1, tilt: idle(t, 1) }, t, eAct);
    if (id === 6) puffAt(out, t, tOpen + 0.36, ERA[0], ERA[2]);
    RING.forEach(([x, z], k) => {
      const slushKid = id === 7 ? k === 2 : opened && k % 3 === 2;
      const ex: Expr = id === 8 ? (solid ? "shock" : "nervous") : id === 7 ? (k === 2 ? "pained" : "nervous") : opened ? (k % 2 ? "shock" : "nervous") : "neutral";
      const a = id === 6 ? pop(t, tOpen + 0.04 * k, 0.15, k % 2 ? 0.18 : 0) : id === 8 ? pop(t, 30.88 + 0.05 * k, 0.14, k % 3 === 0 ? 0.2 : 0) : id === 7 && k === 2 ? { sy: 1 + 0.02 * Math.sin(t * 7), dy: 0 } : { sy: 1, dy: 0 };
      put(out, cam, kid(k), x, z, { mode: "stand", expr: ex, prop: slushKid ? "slush" : null, look: toward(x), facing: toward(x) as -1 | 1, tilt: idle(t, k + 10) }, t, a);
      if (id === 7 && k === 2) for (const d of [0, 0.5]) { const u = (t * 1.6 + d) % 1; fx1(out, "drip", 100, 110, fxDrip, x + 0.17 - d * 0.3, 0.72 - 0.45 * u, z - 0.12, 0.05, 0.055); }
      if (id === 8 && solid && k < 3 && t < 31.6) fx1(out, "bang", 200, 240, fxBang, x + 0.15, 1.55, z - 0.1, 0.16, 0.19, 0.2);
    });
    // frost flakes floating up out of the open freezer
    if (opened) for (let k = 0; k < 8; k++) {
      const u = ((t * 0.5 + k * 0.137) % 1);
      fx1(out, "flake", 100, 100, fxFlake, FREEZER[0] - 0.55 + (k * 0.16) % 1.1 + 0.08 * Math.sin(t * 2 + k), FZ.h + 0.1 + 1.1 * u, FREEZER[2] - 0.05, 0.07 * (1 - u * 0.5), 0.07 * (1 - u * 0.5), t + k);
    }
    if (id === 6 && opened) { const u = clamp01((t - tOpen) / 0.9); if (u < 1) fx1(out, `mist${q(u, 30)}`, 500, 260, (p) => fxMist(p, q(u, 30)), FREEZER[0], FZ.h + 0.35 + 0.4 * u, FREEZER[2], 2.2, 1.15, 0, true); }
    if (solid && t < 30.88 + 0.5) { const u = q((t - W(30.88)) / 0.5, 30); fx1(out, `burst${u}`, 500, 500, (p) => fxBurst(p, u), ERA[0] + 0.25, 1.62, ERA[2] + 0.1, 0.9, 0.9); }
    if (solid) for (let k = 0; k < 5; k++) { // twinkles around the solid ice cream
      const ph = (t * 1.8 + k * 0.23) % 1, sc = Math.sin(ph * Math.PI);
      fx1(out, "twinkle", 100, 100, fxTwinkle, ERA[0] + 0.22 + 0.22 * Math.cos(k * 1.3), 1.42 + 0.18 * Math.sin(k * 2.1), ERA[2] - 0.15, 0.09 * sc + 0.01, 0.09 * sc + 0.01, ph);
    }
  }

  if (id === 9) {
    const P = POT_TABLE, top = 0.98;
    for (let k = 0; k < 4; k++) steamAt(out, t, P[0] - 0.15 + k * 0.1, top, P[2] - 0.05, 0.75 + 0.1 * (k % 2), k);
    if (t < W(35.44)) { const u = q((t * 0.9) % 1, 24); fx1(out, `heat${u}`, 300, 300, (p) => fxHeat(p, u), P[0], top + 0.35, P[2] - 0.2, 0.45, 0.45); }
    else {
      const grow = smooth((t - 35.44) / 0.4) * (1 + 0.25 * pop(t, 38.16, 1).sy - 0.25);
      fx1(out, "swirl", 500, 500, fxSwirl, P[0], top + 0.05, P[2] - 0.18, 0.62 * grow, 0.62 * grow, -t * (2.2 + (t > 38 ? 2 : 0)));
    }
  }

  if (id === 10) {
    const xs = [BOARD[0] - 0.55, BOARD[0] + 0.55];
    xs.forEach((x, k) => {
      const beat = Math.floor((t - 39.68) * 2.2 + k);
      const tk = (beat % 2) === 0;
      const ex: Expr = tk ? (talking(t, 39.6, 41.9, k) ? "talk" : "angry") : "shock";
      put(out, cam, { i: 40 + k, o: SCI[k], okey: `sci${k}` }, x, BOARD[2] - 0.75, { mode: "stand", expr: ex, prop: tk ? "point" : "hips", facing: k ? -1 : 1, look: k ? -1 : 1, tilt: q(3 * Math.sin(t * 7 + k * 3), 3) }, t, pop(t, 39.68 + beat / 2.2, 0.08));
      const bob = 0.04 * Math.sin(t * 6 + k * 2);
      fx1(out, "q", 200, 240, fxQ, x + (k ? -0.15 : 0.15), 2.05 + bob, BOARD[2] - 0.8, 0.22, 0.27, k ? 0.15 : -0.15);
      if (tk) { const u = q((t * 1.5 + k * 0.5) % 1, 20); fx1(out, `ang${u}`, 300, 260, (p) => fxAnger(p, u), x, 2.2, BOARD[2] - 0.85, 0.4, 0.35, 0, true); }
    });
  }

  if (id === 11) {
    const hit = t >= W(43.44);
    put(out, cam, E, BOARD[0], BOARD[2] - 0.55, { mode: "stand", expr: hit ? "laugh" : "proud", prop: hit ? "bowlUp" : "icecream", tilt: idle(t, 1) }, t, mul(pop(t, 43.44, 0.2, 0.2), hit ? laughBounce(t, 2) : { sy: 1, dy: 0 }));
    puffAt(out, t, 43.44 + 0.36, BOARD[0], BOARD[2] - 0.55);
    [[-0.95, 0], [1.0, 1], [-1.6, 3]].forEach(([dx, k]) => {
      const x = BOARD[0] + dx;
      put(out, cam, kid(k), x, BOARD[2] - 0.95, { mode: "stand", expr: hit ? "laugh" : "smile", prop: hit ? (k === 1 ? "bowlUp" : null) : null, wave: hit && k !== 1 ? q(Math.sin(t * 10 + k), 20) : undefined, look: dx > 0 ? -1 : 1, facing: (dx > 0 ? -1 : 1) as -1 | 1, tilt: idle(t, k + 10) } as FrontOpts, t, mul(pop(t, 43.5 + k * 0.05, 0.15, 0.15), hit ? laughBounce(t, k) : { sy: 1, dy: 0 }));
    });
    if (t >= W(43.44) && t < 43.44 + 0.5) { const u = q((t - W(43.44)) / 0.5, 30); fx1(out, `burst${u}`, 500, 500, (p) => fxBurst(p, u), BOARD[0], 1.25, BOARD[2] - 0.45, 1.3, 1.3); }
    if (hit) for (let k = 0; k < 6; k++) { const ph = (t * 1.5 + k * 0.17) % 1, sc = Math.sin(ph * Math.PI); fx1(out, "twinkle", 100, 100, fxTwinkle, BOARD[0] - 1.1 + k * 0.44, 2.45 + 0.1 * Math.sin(k), BOARD[2] - 0.1, 0.12 * sc + 0.01, 0.12 * sc + 0.01, ph); }
  }
  return out;
};
export { FPS };