// Cast for "The Hot Ice Cream": lit flat cards in the 3D schoolyard (infrastructure from the bridge template's cast.ts).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxStars, fxContact, fxShadow, fxPuff, fxSplash, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { FPS, D0, SHOTS, V3, smooth, clamp01, PAPER, BROS, DUNE, CRASH, TUNNEL, BOOK, BOAT, RAIL, glider, flyer, aerodrome, CRASH_T, TEASE, TAKEOFF_T, LAUNCH_T, SPLASH_T, Pose } from "./story";
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
const WILBUR: Outfit = { jacket: "#3b3f52", pants: "#3b3f52", boots: "#2a211c", hat: "cap", cap: "#5a5f6e", skin: "#f5c9a0", buttons: "#f4f1ea" };
const ORVILLE: Outfit = { jacket: "#7a4f33", pants: "#4a3f35", boots: "#2a211c", hat: "cap", cap: "#a0784a", skin: "#f5c9a0", moustache: "#5a3b2a", buttons: "#f4f1ea" };
const EXPERT = [0, 1, 2].map((v): Outfit => ({ jacket: ["#241f26", "#2f3f6e", "#4a2f3a"][v], pants: "#241f26", boots: "#120d10", hat: "tophat", skin: ["#f1c9a5", "#ecd0b6", "#e0b896"][v], moustache: ["#d8d8d8", "#5a3b2a", "#9a9a9a"][v], build: v === 1 ? "stout" : "adult" }));
const LANGLEY: Outfit = { jacket: "#241f26", pants: "#241f26", boots: "#120d10", hat: "tophat", skin: "#f1c9a5", moustache: "#f0f0f0", build: "stout", buttons: "#e8c45a" };
const LOCALS = [0, 1, 2, 3].map((v): Outfit => ({ jacket: ["#2f3f6e", "#d8432f", "#5d7a3a", "#2f7fd0"][v], pants: "#3b3f52", boots: "#2a211c", hat: v % 2 ? "cap" : "hair", cap: "#3b3f52", hair: "#5a3b2a", skin: ["#f5c9a0", "#c99067", "#ecd0b6", "#8d5a3b"][v], moustache: v === 2 ? "#5a3b2a" : undefined }));

// ---------------- fx drawings ----------------
const fxText = (txt: string, fill: string, size: number, cw: number, ch: number, stroke = "#241726") => (p: Pen) => {
  const g = gctx(p);
  g.font = `900 ${size}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = size * 0.15; g.strokeStyle = stroke; g.lineJoin = "round"; g.strokeText(txt, cw / 2, ch / 2);
  g.fillStyle = fill; g.fillText(txt, cw / 2, ch / 2);
};
const fxHa = fxText("HA!", "#ffd84a", 150, 300, 200);
const fxHa2 = fxText("HA HA", "#ffffff", 110, 400, 200);
const fxBang = fxText("!", "#ff5a3c", 220, 200, 240);
const fxQ = fxText("?", "#ffffff", 220, 200, 240);
/** red rubber stamp WRONG, slightly rotated, ink texture */
const fxStamp = (p: Pen) => {
  const g = gctx(p);
  g.save(); g.translate(300, 150); g.rotate(-0.18);
  g.strokeStyle = "#d61f1f"; g.lineWidth = 22; g.strokeRect(-270, -105, 540, 210);
  g.fillStyle = "#d61f1f"; g.font = "900 150px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("WRONG", 0, 8);
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 140; k++) { g.beginPath(); g.arc(((k * 97) % 540) - 270, ((k * 53) % 210) - 105, 2 + (k % 4), 0, 7); g.fill(); }
  g.restore();
};
const fxGull = (p: Pen, laugh: number) => {
  p.ell(150, 140, 90, 52, "#ffffff", 8);                                   // body
  p.ell(120, 125, 55, 30, "#b9c0c9", 6);                                   // wing
  p.ell(225, 95, 42, 38, "#ffffff", 8);                                    // head
  p.dot(232, 85, 7);
  if (laugh) { p.poly([[258, 92], [300, 78], [262, 100]], "#ff9a3c", 5); p.poly([[258, 104], [298, 120], [262, 108]], "#ff9a3c", 5); }
  else p.poly([[258, 95], [302, 102], [258, 108]], "#ff9a3c", 5);
  p.stroke([[140, 190], [135, 230]], 6, "#ff9a3c"); p.stroke([[170, 190], [175, 230]], 6, "#ff9a3c");
};
const fxWingTiny = (p: Pen, k: number) => { p.poly([[10, 50], [60, 18 + (k % 3) * 4], [190, 30], [190, 46], [60, 60]], ["#efe6cf", "#e8dcc0", "#f4ecd8"][k % 3], 6); };
const fxLift = (p: Pen) => {
  p.poly([[20, 260], [110, 225], [260, 240], [260, 262], [110, 270]], "#efe6cf", 7);
  p.stroke([[140, 210], [140, 60]], 20, "#241726"); p.stroke([[140, 210], [140, 60]], 11, "#5ad1ff");
  p.poly([[140, 10], [190, 80], [90, 80]], "#5ad1ff", 8);
};
const fxSand = (p: Pen, t: number) => {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI, d = 40 + 160 * t, r = (26 + 14 * (i % 3)) * (1 - 0.5 * t);
    p.ell(200 + d * Math.cos(a), 230 - d * 0.7 * Math.sin(a), r, r * 0.8, `rgba(226,196,140,${(1 - t).toFixed(3)})`, 0);
  }
};
const fxTwinkle = (p: Pen) => p.poly([[50, 0], [62, 38], [100, 50], [62, 62], [50, 100], [38, 62], [0, 50], [38, 38]], "#fff6b0", 6);
const fxBird = (p: Pen, up: number) => { const w = up ? -28 : 22; p.stroke([[10, 60 + w], [60, 60], [110, 60 + w]], 9, "#2a2430"); };
const fxPaper = (stamped: boolean) => (p: Pen) => {
  const g = gctx(p);
  g.fillStyle = "#f3eee0"; g.fillRect(0, 0, 900, 1200); g.strokeStyle = "#241726"; g.lineWidth = 14; g.strokeRect(7, 7, 886, 1186);
  g.fillStyle = "#241726"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "bold 72px Georgia, serif"; g.fillText("THE DAILY HERALD", 450, 90);
  g.font = "28px Georgia, serif"; g.fillText("OCTOBER 1903", 450, 150); g.fillRect(40, 175, 820, 8);
  g.font = "900 92px Arial Black, Arial"; g.fillText("MAN WON'T FLY", 450, 290);
  g.font = "900 70px Arial Black, Arial"; g.fillText("FOR", 450, 385);
  g.fillStyle = "#c81f1f"; g.font = "900 120px Arial Black, Arial"; g.fillText("10,000,000", 450, 500);
  g.fillStyle = "#241726"; g.font = "900 96px Arial Black, Arial"; g.fillText("YEARS", 450, 615);
  g.fillStyle = "#cfd8dc"; g.fillRect(90, 690, 720, 300); g.strokeRect(90, 690, 720, 300);
  g.lineWidth = 10; g.beginPath(); g.moveTo(200, 900); g.lineTo(450, 760); g.lineTo(700, 900); g.stroke(); g.beginPath(); g.moveTo(450, 760); g.lineTo(450, 940); g.stroke();
  g.fillStyle = "#8a8f94"; for (let k = 0; k < 6; k++) g.fillRect(90, 1020 + k * 26, k % 2 ? 560 : 720, 12);
  if (stamped) { g.save(); g.translate(450, 560); g.rotate(-0.2); g.strokeStyle = "#d61f1f"; g.lineWidth = 26; g.strokeRect(-330, -120, 660, 240); g.fillStyle = "#d61f1f"; g.font = "900 170px Arial Black, Arial"; g.fillText("WRONG", 0, 10); g.restore(); }
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
const NONE: Act = { sy: 1, dy: 0 };
const fx1 = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false, flat = false) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft, flat });
const sandAt = (out: Stage, t: number, tE: number, x: number, y: number, z: number, s = 1) => {
  const u = (t - tE) / 0.6;
  if (u < 0 || u >= 1) return;
  fx1(out, `sand${q(u, 20)}`, 400, 300, (p) => fxSand(p, q(u, 20)), x, y + 0.4 * s, z - 0.1, 1.6 * s, 1.2 * s, 0, true);
};
type Who2 = { i: number; o: Outfit; okey: string };
const put = (out: Stage, cam: CamInfo, who: Who2, x: number, y: number, z: number, fo: FrontOpts, t: number, act: Act = NONE, scale = 1, shadow = true) => {
  const pl = person(cam, who, x, y + act.dy, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale);
  out.places.push({ ...pl, sy: act.sy * breathe(t, who.i) });
  if (shadow) blob(out, x, y, z, scale * (1 - Math.min(0.5, act.dy * 1.5)));
};
/** a card rotated in the camera plane about its body centre (lying on a wing, upside down in the sand) */
const putRot = (out: Stage, cam: CamInfo, who: Who2, C: V3, rho: number, fo: FrontOpts, t: number, cen = 0.95) => {
  const r = cam.right, ox = -cen * Math.sin(rho), oy = cen * Math.cos(rho);
  const pl = person(cam, who, C[0] - r.x * ox, C[1] - oy, C[2] - r.z * ox, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {});
  out.places.push({ ...pl, roll: rho });
};
/** + = lie with the head toward world -x (the way the machines fly) */
const lieRho = (cam: CamInfo) => (cam.right.x >= 0 ? 1 : -1) * Math.PI / 2;
const gull = (out: Stage, t: number, x: number, y: number, z: number, laughFrom = 1e9, s = 0.42) => {
  const lg = t >= laughFrom ? Math.floor(t * 8) % 2 : 0, hop = t >= laughFrom ? Math.abs(Math.sin(t * 16)) * 0.05 : Math.abs(Math.sin(t * 3)) * 0.02;
  fx1(out, `gull${lg}`, 320, 240, (p) => fxGull(p, lg), x, y + 0.16 + hop, z, s, s * 0.75, 0);
  if (t >= laughFrom && ((t * 2) % 1) < 0.6) fx1(out, "ha", 300, 200, fxHa, x + 0.15, y + 0.55, z - 0.05, 0.3, 0.2, 0.2);
};
const ambient = (out: Stage, t: number) => {
  for (let k = 0; k < 8; k++) {
    const a = t * (0.05 + 0.01 * (k % 3)) + k * 0.7, R = 30 + (k % 4) * 9, up = Math.floor(t * 6 + k) % 2;
    fx1(out, `bird${up}`, 120, 120, (p) => fxBird(p, up), Math.cos(a) * R, 13 + (k % 3) * 3 + Math.sin(t + k), 10 + Math.sin(a) * R, 0.6, 0.6);
  }
};
const crowdLaugh = (out: Stage, cam: CamInfo, t: number, from: number, spots: [number, number][], cheer = false) =>
  spots.forEach(([x, z], k) => {
    const on = t >= W(from + k * 0.05);
    put(out, cam, { i: 60 + k, o: LOCALS[k % 4], okey: `l${k}` }, x, 0, z,
      { mode: "stand", expr: on ? (k % 2 ? "laugh" : "grin") : "neutral", prop: on && !cheer ? (k % 2 ? "belly" : "point") : null, wave: on && cheer ? q(Math.sin(t * 9 + k), 20) : undefined, tilt: on ? q(5 * Math.sin(t * 12 + k), 3) : idle(t, 60 + k), look: 1 } as FrontOpts,
      t, on ? mul(pop(t, from + k * 0.05, 0.14, cheer ? 0.15 : 0), laughBounce(t, k)) : NONE);
    if (on && !cheer && ((t * 2 + k * 0.4) % 1) < 0.6) fx1(out, k % 2 ? "ha2" : "ha", k % 2 ? 400 : 300, 200, k % 2 ? fxHa2 : fxHa, x + 0.2, 2.15, z - 0.1, k % 2 ? 0.5 : 0.4, 0.26, (k % 2 ? 0.2 : -0.2));
  });

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  ambient(out, t);
  const Wi = { i: 1, o: WILBUR, okey: "wil" }, Or = { i: 2, o: ORVILLE, okey: "orv" };
  const paperAt = (stamped: boolean, scale = 1) => {
    const fl = 0.02 * Math.sin(t * 7);
    fx1(out, stamped ? "paperS" : "paper", 900, 1200, fxPaper(stamped), PAPER[0], PAPER[1] + 0.004, PAPER[2], 0.62 * scale, 0.827 * scale, Math.PI + fl, false, true);
  };

  if (id === 1) {
    const sc = 1 + 0.1 * (pop(t, 1.73, 1).sy - 1);
    paperAt(false, sc);
    if (t >= W(1.73)) for (let k = 0; k < 6; k++) { const ph = (t * 1.7 + k * 0.19) % 1, sc = Math.sin(ph * Math.PI); fx1(out, "twinkle", 100, 100, fxTwinkle, PAPER[0] - 0.36 + (k % 3) * 0.36, 0.07, PAPER[2] + (k < 3 ? 0.1 : -0.17), 0.07 * sc + 0.01, 0.07 * sc + 0.01, ph); }
    gull(out, t, PAPER[0] + 0.42, 0, PAPER[2] - 0.05, 2.4, 0.3);
  }

  if (id === 2) {
    paperAt(false);
    const up = t >= W(TEASE[0] - 0.1) && t < TEASE[1] + 0.3;
    put(out, cam, Wi, BROS[0] - 0.55, 0, BROS[2], { mode: "stand", expr: up ? "shock" : "smug", prop: up ? "point" : "hips", headTilt: up ? -6 : 0, look: 1, tilt: idle(t, 1) }, t, pop(t, TEASE[0], 0.12, 0.12));
    put(out, cam, Or, BROS[0] + 0.75, 0, BROS[2] + 0.1, { mode: "stand", expr: up ? "proud" : "smile_closed", wave: up ? q(Math.sin(t * 10), 20) : undefined, look: -1, tilt: idle(t, 2) } as FrontOpts, t, pop(t, TEASE[0] + 0.08, 0.12, 0.1));
    if (up) for (let k = 0; k < 4; k++) { const ph = (t * 2 + k * 0.25) % 1, sc = Math.sin(ph * Math.PI); fx1(out, "twinkle", 100, 100, fxTwinkle, -0.4 + k * 0.5, 3.4 + 0.3 * Math.sin(k), 2.4, 0.12 * sc + 0.01, 0.12 * sc + 0.01, ph); }
    gull(out, t, PAPER[0] + 0.42, 0, PAPER[2] - 0.05, 1e9, 0.3);
  }

  if (id === 3) {
    const g = glider(t), crashed = t >= CRASH_T;
    if (!crashed) { // Wilbur lies on the lower wing, Orville runs at the wingtip until it leaves him behind
      putRot(out, cam, Wi, [g.p[0], g.p[1] + 0.18, g.p[2]], lieRho(cam) + g.pitch * 0.6, { mode: "stand", expr: t > 6.1 ? "shock" : "proud" }, t, 0.8);
      const ru = clamp01((t - 5.6) / 0.6), ox = DUNE[0] + 1.6 + (CRASH[0] - DUNE[0] + 0.6) * ru * 0.7, oz = DUNE[2] - 1.8 + 1.5 * ru;
      put(out, cam, Or, ox, Math.max(0, 1.6 * (1 - ru * 1.4)), oz, { mode: t > 5.6 ? "stroll" : "stand", phase: q((t * 2.2) % 1, 20), expr: t > 6.0 ? "shock" : "grin", prop: t < 5.6 ? "push" : null, look: -1 }, t);
    } else { // head stuck in the sand, legs kicking; Orville rushes over
      const kick = q((t * 3) % 1, 12);
      putRot(out, cam, Wi, [CRASH[0] + 0.9, 0.95 - 0.35, CRASH[2] - 1.3], Math.PI, { mode: "march", phase: kick, expr: "dazed", lift: 90 }, t, 0.95);
      sandAt(out, t, CRASH_T, CRASH[0] + 0.7, 0, CRASH[2] - 1.4, 1.2);
      sandAt(out, t, CRASH_T + 0.15, CRASH[0] + 0.6, 0, CRASH[2] - 0.5, 0.7);
      const ru = clamp01((t - 6.7) / 0.9);
      put(out, cam, Or, CRASH[0] - 0.6 + 0.4 * ru, 0, CRASH[2] - 0.6, { mode: ru < 1 ? "stroll" : "stand", phase: q((t * 2.4) % 1, 20), expr: t < 8.6 ? "shock" : "nervous", prop: ru >= 1 ? "push" : null, look: -1 }, t, pop(t, CRASH_T + 0.1, 0.14, 0.2));
      if (t < CRASH_T + 0.5) { const v = q((t - CRASH_T) / 0.5, 30); fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v, "#ffffff"), CRASH[0], 0.9, CRASH[2] - 0.3, 1.4, 1.4); }
      crowdLaugh(out, cam, t, 8.79, [[-3.3, 5.6], [-2.2, 6.2], [-4.3, 6.4]]);
      gull(out, t, -0.9, 0, 1.5, 8.9, 0.36);
    }
  }

  if (id === 4) {
    const B = BOOK;
    [[-0.9, 0, 0], [0.85, 0.1, 1], [1.75, 0.35, 2]].forEach(([dx, dz, k]) => {
      const pointing = k === 1 && t >= W(11.48);
      put(out, cam, { i: 20 + k, o: EXPERT[k], okey: `ex${k}` }, B[0] + dx, 0, B[2] + dz,
        { mode: "stand", expr: talking(t, 10.2, 12.0, k) && k === 0 ? "talk" : "smug", prop: pointing ? "point" : k === 2 ? "hips" : null, look: dx > 0 ? -1 : 1, facing: (dx > 0 ? -1 : 1) as -1 | 1, tilt: idle(t, 20 + k) + q(3 * Math.max(0, Math.sin(t * 4 + k)), 3) }, t, pop(t, 11.48 + k * 0.08, 0.08));
    });
    if (t >= W(11.83) && t < 12.4) { const v = q((t - W(11.83)) / 0.55, 30); fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v), B[0], 1.32, B[2] - 0.2, 0.55, 0.55); }
    if (t >= W(12.78)) { const a = clamp01((t - W(12.78)) / 0.25), bob = 0.05 * Math.sin(t * 5); fx1(out, "lift", 280, 280, fxLift, B[0] + 0.55, 1.75 + bob, B[2] - 0.4, 0.35 * a, 0.35 * a); }
  }

  if (id === 5) {
    const T0 = TUNNEL;
    put(out, cam, Wi, T0[0] - 0.75, 0, T0[2] + 0.55, { mode: "stand", expr: t > 18.5 ? "shock" : "stern", prop: t > 19.6 ? "point" : null, look: 1, facing: 1, tilt: idle(t, 1) + (t < 18.4 ? 6 : 0) }, t, pop(t, 18.5, 0.14, 0.12));
    put(out, cam, Or, T0[0] + 0.85, 0, T0[2] + 0.5, { mode: "stand", expr: talking(t, 16.6, 18.3, 2) ? "talk" : t > 18.5 ? "proud" : "neutral", prop: t > 18.5 ? "push" : null, look: -1, facing: -1, tilt: idle(t, 2) }, t, pop(t, 18.6, 0.14, 0.15));
    // 200 tiny wings: one shoots out of the tunnel every ~0.075 s and lands on a growing stack
    const n = Math.floor(clamp01((t - 16.64) / 1.75) * 24);
    for (let k = 0; k < n; k++) {
      const tk = 16.64 + k * 0.073, u = clamp01((t - tk) / 0.35);
      const x = T0[0] + 0.95 + 0.55 * u, y = T0[1] + 0.25 + 0.25 * Math.sin(u * Math.PI) - 0.2 * u + Math.min(k, 14) * 0.012 * u, z = T0[2] - 0.05;
      fx1(out, `tw${k % 3}`, 200, 80, (p) => fxWingTiny(p, k % 3), x, y, z, 0.18, 0.072, (1 - u) * 6 + k * 0.4);
    }
    if (t >= 16.64 && t < 18.4) { const c = q(clamp01((t - 16.64) / 1.75), 30); fx1(out, `cnt${Math.round(c * 200)}`, 360, 160, fxText(`${Math.round(c * 200)}`, "#ffffff", 120, 360, 160), T0[0] + 0.3, T0[1] + 1.05, T0[2], 0.42, 0.19); }
  }
  if (id === 5 && t >= W(19.67)) { // the WRONG stamp slams onto the famous number
    const u = clamp01((t - W(19.67)) / 0.12), sc = 1.6 - 0.6 * u + 0.08 * (pop(t, 19.67, 1).sy - 1);
    fx1(out, "stamp", 600, 300, fxStamp, BOOK[0], 1.26, BOOK[2] - 0.12, 0.5 * sc, 0.25 * sc, 0);
  }

  if (id === 6) {
    const a = aerodrome(t), splash = t >= SPLASH_T;
    const lx = BOAT[0] + 0.6, ly = 3.9;
    const hatOff = splash;
    put(out, cam, { i: 30, o: hatOff ? { ...LANGLEY, hat: "hair", hair: "#d8d8d8" } : LANGLEY, okey: hatOff ? "lang0" : "lang" }, lx, ly, BOAT[2] - 0.9,
      { mode: "stand", expr: splash ? "shock" : t > 24.0 ? "nervous" : "proud", prop: t < LAUNCH_T ? "hips" : t < 24 ? "point" : null, look: -1, tilt: idle(t, 30) }, t, mul(pop(t, LAUNCH_T, 0.1), pop(t, SPLASH_T, 0.16, 0.25)));
    if (hatOff) { const u = t - SPLASH_T; fx1(out, "hat", 200, 200, (p) => { p.poly([[50, 150], [150, 150], [140, 40], [60, 40]], "#241f26", 8); p.ell(100, 152, 80, 16, "#241f26", 7); }, lx + 0.4 * u, ly + 2.1 + 1.6 * u - 2.4 * u * u, BOAT[2] - 0.9, 0.3, 0.3, u * 6); }
    [[1.6, -1.2, 0], [2.4, -0.6, 1]].forEach(([dx, dz, k]) => put(out, cam, { i: 31 + k, o: EXPERT[k], okey: `ex${k}` }, BOAT[0] + dx, 1.25, BOAT[2] + dz, { mode: "stand", expr: splash ? "shock" : "smug", look: -1 }, t, pop(t, SPLASH_T + 0.1 * k, 0.14, 0.2)));
    if (splash) {
      const u = clamp01((t - SPLASH_T) / 1.0);
      if (u < 1) fx1(out, `splash${q(u, 30)}`, 800, 800, (p) => fxSplash(p, q(u, 30)), a.p[0] + 1, 2.6, a.p[2], 7, 7);
      gull(out, t, BOAT[0] - 1.6, 1.25, BOAT[2] - 1.4, SPLASH_T + 0.3, 0.45);
    }
  }

  if (id === 7) {
    const fp = flyer(7, t)!;
    putRot(out, cam, Or, [fp.p[0] + 0.1, fp.p[1] + 0.12, fp.p[2]], lieRho(cam) + fp.pitch * 0.6, { mode: "stand", expr: t > TAKEOFF_T ? "proud" : "stern" }, t, 0.8);
    const run = clamp01((t - (TAKEOFF_T - 0.9)) / 1.3), wx = RAIL[0] - 1.0 - 3.0 * run;
    const cheer = t >= W(27.18);
    put(out, cam, Wi, wx, 0, RAIL[2] - 1.3, { mode: run < 1 && !cheer ? "stroll" : "stand", phase: q((t * 2.4) % 1, 20), expr: cheer ? "laugh" : "grin", wave: cheer ? q(Math.sin(t * 10), 20) : undefined, look: -1 } as FrontOpts, t, cheer ? mul(pop(t, 27.18, 0.18, 0.3), laughBounce(t, 1)) : NONE);
    if (cheer && t < 27.7) { const v = q((t - W(27.18)) / 0.5, 30); fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v), fp.p[0], fp.p[1] + 0.4, fp.p[2] + 0.4, 2.2, 2.2); }
    crowdLaugh(out, cam, t, 27.18, [[RAIL[0] - 6.2, RAIL[2] + 1.5], [RAIL[0] - 5.2, RAIL[2] + 2.3]], true);
    sandAt(out, t, TAKEOFF_T, fp.p[0] + 1.2, 0, RAIL[2], 0.8);
  }

  if (id === 8) {
    const fp = flyer(8, t)!;
    putRot(out, cam, Or, [fp.p[0] + 0.1, fp.p[1] + 0.12, fp.p[2]], lieRho(cam) + fp.pitch * 0.6, { mode: "stand", expr: "laugh" }, t, 0.8);
    const stamped = t >= W(29.85);
    paperAt(stamped, stamped ? 1 + 0.12 * (pop(t, 29.85, 1).sy - 1) : 1);
    if (stamped) for (let k = 0; k < 6; k++) { const ph = (t * 1.7 + k * 0.19) % 1, sc = Math.sin(ph * Math.PI); fx1(out, "twinkle", 100, 100, fxTwinkle, PAPER[0] - 0.4 + (k % 3) * 0.4, 0.07, PAPER[2] + (k < 3 ? 0.36 : -0.36), 0.08 * sc + 0.01, 0.08 * sc + 0.01, ph); }
    gull(out, t, PAPER[0] + 0.42, 0, PAPER[2] - 0.05, 29.95, 0.3);
  }
  return out;
};
export { FPS };