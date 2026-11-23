// Cast for "The Hot Ice Cream": lit flat cards in the 3D schoolyard (infrastructure from the bridge template's cast.ts).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxStars, fxContact, fxShadow, fxPuff, fxSplash, Outfit, Expr, FrontOpts, SideOpts, Prop } from "./toon";
import { FPS, D0, SHOTS, V3, smooth, clamp01, SKULL, STALL, PLES, SOC, MUS, SHORE, PULL_T, FAKE_T, GLUE_T, REAL_T, SLAM_T, CREDIT_T, TWIST_T } from "./story";
import { dino, DinoOpts } from "./dino";
import { MOUTH } from "./mouth";
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
const MARY_KID: Outfit = { jacket: "#7a5240", pants: "#3b3f52", boots: "#2a211c", hat: "bonnet", dress: "#5a3f6e", skin: "#f5c9a0", build: "kid" };
const MARY: Outfit = { ...MARY_KID, build: "adult", dress: "#4a3a62" };
const GENT = [0, 1, 2].map((v): Outfit => ({ jacket: ["#241f26", "#2f3f6e", "#4a2f3a"][v], pants: "#241f26", boots: "#120d10", hat: "tophat", skin: ["#f1c9a5", "#ecd0b6", "#e0b896"][v], moustache: ["#d8d8d8", "#5a3b2a", "#9a9a9a"][v], build: v === 1 ? "stout" : "adult" }));
const LADY: Outfit = { jacket: "#c25a7a", pants: "#3b3f52", boots: "#2a211c", hat: "bonnet", dress: "#d9a441", skin: "#ecd0b6" };
const VIS = [0, 1, 2].map((v): Outfit => ({ jacket: ["#2f7fd0", "#e8622c", "#29a35a"][v], pants: "#1f2a44", boots: "#f4f1ea", hat: "hair", hair: ["#1d1512", "#e0b35a", "#5a3b2a"][v], skin: ["#a86f4a", "#f5c9a0", "#c99067"][v], build: v === 2 ? "kid" : "adult" }));

// ---------------- fx drawings ----------------
const fxText = (txt: string, fill: string, size: number, cw: number, ch: number) => (p: Pen) => {
  const g = gctx(p);
  g.font = `900 ${size}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = size * 0.15; g.strokeStyle = "#241726"; g.lineJoin = "round"; g.strokeText(txt, cw / 2, ch / 2);
  g.fillStyle = fill; g.fillText(txt, cw / 2, ch / 2);
};
const fxStampT = (txt: string, col: string) => (p: Pen) => {
  const g = gctx(p);
  g.save(); g.translate(300, 150); g.rotate(-0.16);
  g.strokeStyle = col; g.lineWidth = 22; g.strokeRect(-270, -105, 540, 210);
  g.fillStyle = col; g.font = `900 ${txt.length > 6 ? 110 : 150}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 8);
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 140; k++) { g.beginPath(); g.arc(((k * 97) % 540) - 270, ((k * 53) % 210) - 105, 2 + (k % 4), 0, 7); g.fill(); }
  g.restore();
};
const fxFake = fxStampT("FAKE?", "#d61f1f");
const fxReal = fxStampT("ALL REAL", "#1f9a3a");
const fxCheck = (p: Pen) => { p.stroke([[20, 60], [50, 92], [108, 18]], 30, "#241726"); p.stroke([[20, 60], [50, 92], [108, 18]], 18, "#4ee06a"); };
const fxGlue = (p: Pen) => { p.poly([[40, 60], [100, 60], [110, 220], [30, 220]], "#f4f1ea", 8); p.poly([[55, 20], [85, 20], [90, 60], [50, 60]], "#e8622c", 7); const g = gctx(p); g.fillStyle = "#241726"; g.font = "900 34px Arial Black"; g.textAlign = "center"; g.fillText("GLUE", 70, 150); };
const fxCoin = (p: Pen, k: number) => { p.ell(50, 50, 40 * Math.abs(Math.cos(k)) + 4, 40, "#f6c63c", 7); };
const fxRock = (p: Pen, k: number) => p.poly([[10, 40 + (k % 3) * 5], [40, 10], [80, 20 + (k % 2) * 8], [90, 60], [50, 90], [15, 75]], ["#7d8a9a", "#6f7b8a", "#8b97a6"][k % 3], 6);
const fxAnger = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) { const u = (t + k / 3) % 1, x = 60 + k * 90 + (k - 1) * 40 * u, y = 230 - 170 * u, r = 26 + 34 * u; p.ell(x, y, r, r * 0.85, `rgba(255,255,255,${(1 - u).toFixed(3)})`, 5 * (1 - u)); }
};
const fxTwinkle = (p: Pen) => p.poly([[50, 0], [62, 38], [100, 50], [62, 62], [50, 100], [38, 62], [0, 50], [38, 38]], "#fff6b0", 6);
const fxBird = (p: Pen, up: number) => { const w = up ? -28 : 22; p.stroke([[10, 60 + w], [60, 60], [110, 60 + w]], 9, "#2a2430"); };
const fxShells = (p: Pen) => {
  p.poly([[20, 120], [280, 120], [250, 220], [50, 220]], "#b0794a", 8);
  for (let k = 0; k < 7; k++) { const x = 50 + k * 34, y = 105 - (k % 2) * 16; p.ell(x, y, 24, 18, ["#ffe0c8", "#ffd1dc", "#fff2b3"][k % 3], 5); p.stroke([[x - 12, y + 6], [x, y - 12], [x + 12, y + 6]], 3); }
};
const fxPlan = (p: Pen) => { // a drawing of the plesiosaur on paper (what the men show off)
  p.poly([[0, 0], [400, 0], [400, 260], [0, 260]], "#f3eee0", 8);
  p.stroke([[60, 170], [150, 160], [230, 150], [300, 110], [340, 70], [365, 60]], 10); p.ell(150, 165, 70, 34, null, 8); p.ell(372, 58, 16, 12, null, 6);
  for (const [x, y, r] of [[110, 200, 0.6], [200, 200, -0.6], [100, 130, -0.6], [200, 130, 0.6]] as const) p.ell(x, y, 34, 12, null, 6, 0, 360, r * 60);
};
const fxSwirlTongue = (p: Pen) => { for (let k = 0; k < 3; k++) p.arc(100, 100, 30 + k * 22, 30 + k * 22, k * 40, 300 + k * 40, 8, "#ff7a8a"); };

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
const idle = (t: number, i: number) => q(1.5 * Math.sin(t * 2.1 + i * 1.7), 4);
const W = (s: number) => s - LEAD;
const NONE: Act = { sy: 1, dy: 0 };
const fx1 = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, rot = 0, soft = false, flat = false) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, rot, soft, flat });
type Who2 = { i: number; o: Outfit; okey: string };
const put = (out: Stage, cam: CamInfo, who: Who2, x: number, z: number, fo: FrontOpts, t: number, act: Act = NONE, y = 0, scale = 1) => {
  const pl = person(cam, who, x, y + act.dy, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale);
  out.places.push({ ...pl, sy: act.sy * breathe(t, who.i) });
  blob(out, x, y, z, scale * (1 - Math.min(0.5, act.dy * 1.5)));
};
/** Dino: lip-synced from MOUTH[frame]; quantised options so canvases are reused */
const putDino = (out: Stage, cam: CamInfo, x: number, z: number, t: number, o: Partial<DinoOpts>, act: Act = NONE, y = 0, scale = 1) => {
  const f = Math.min(MOUTH.length - 1, Math.max(0, Math.round(t * FPS)));
  const mouth = o.mouth ?? MOUTH[f], blink = lidAt(t, 7);
  const opts: DinoOpts = { mouth: q(mouth, 7), expr: o.expr ?? "talk", look: q(o.look ?? 0, 4), blink, arm: o.arm ?? "none", armK: q(o.armK ?? t, 10), tail: q(Math.sin(t * 3.2), 6), lean: q(o.lean ?? 0, 2) };
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  out.places.push({ key: `DINO|${JSON.stringify(opts)}`, x, y: y + act.dy, z, scale, draw: (p) => dino(p, opts), size: [w, h, k], sy: act.sy * breathe(t, 7) });
  blob(out, x, y, z, 1.15 * scale);
};
const ambient = (out: Stage, t: number, cx: number, cz: number) => {
  for (let k = 0; k < 8; k++) {
    const a = t * (0.05 + 0.01 * (k % 3)) + k * 0.7, R = 30 + (k % 4) * 9, up = Math.floor(t * 6 + k) % 2;
    fx1(out, `bird${up}`, 120, 120, (p) => fxBird(p, up), cx + Math.cos(a) * R, 13 + (k % 3) * 3 + Math.sin(t + k), cz + Math.sin(a) * R, 0.6, 0.6);
  }
};
const twinkles = (out: Stage, t: number, x: number, y: number, z: number, r = 0.35, n = 5, s = 0.1) => {
  for (let k = 0; k < n; k++) { const ph = (t * 1.6 + k * 0.21) % 1, sc = Math.sin(ph * Math.PI); fx1(out, "twinkle", 100, 100, fxTwinkle, x + r * Math.cos(k * 1.3), y + r * 0.8 * Math.sin(k * 2.1), z, s * sc + 0.01, s * sc + 0.01, ph); }
};
const stampAt = (out: Stage, t: number, tE: number, draw: (p: Pen) => void, key: string, x: number, y: number, z: number, w: number) => {
  if (t < W(tE)) return;
  const u = clamp01((t - W(tE)) / 0.12), sc = 1.6 - 0.6 * u + 0.08 * (pop(t, tE, 1).sy - 1);
  fx1(out, key, 600, 300, draw, x, y, z, w * sc, w * 0.5 * sc);
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const K = SKULL, P = PLES;
  ambient(out, t, id === 7 ? SOC[0] : id === 8 ? MUS[0] : 0, 0);

  if (id === 1) {
    const fake = t >= W(FAKE_T);
    put(out, cam, { i: 3, o: MARY_KID, okey: "mk" }, K[0] - 1.1, K[2] - 1.0, { mode: "stand", expr: fake ? "shock" : "proud", prop: fake ? null : "point", look: 1, facing: 1, tilt: idle(t, 3) }, t, pop(t, FAKE_T + 0.05, 0.14, 0.12));
    put(out, cam, { i: 4, o: GENT[1], okey: "g1" }, K[0] + 1.35, K[2] - 1.7, { mode: "stand", expr: fake ? "angry" : "smug", prop: fake ? "point" : "hips", look: -1, facing: -1, tilt: idle(t, 4) }, t, pop(t, FAKE_T, 0.1));
    if (fake && t < FAKE_T + 0.8) { const u = q(((t - FAKE_T) * 1.4) % 1, 20); fx1(out, `ang${u}`, 300, 260, (p) => fxAnger(p, u), K[0] + 1.35, 2.15, K[2] - 1.75, 0.5, 0.44, 0, true); }
    stampAt(out, t, FAKE_T, fxFake, "fake", K[0], 1.05, K[2] - 0.35, 0.8);
  }

  if (id === 2) {
    const tIn = 131 / FPS;
    const photo = t >= W(6.3), wave = t >= 4.3 && t < 6.2;
    putDino(out, cam, K[0] - 1.1, K[2] - 1.9, t, { expr: photo ? "proud" : "happy", arm: photo ? "photo" : wave ? "wave" : "hips", armK: t * 1.6, look: photo ? 0 : 0 }, mul(pop(t, tIn + 0.02, 0.2, 0.3), pop(t, 6.3, 0.1)));
    if (t < tIn + 0.6) twinkles(out, t, K[0] - 1.1, 1.3, K[2] - 2.0, 0.8, 7, 0.16);
    put(out, cam, { i: 3, o: MARY_KID, okey: "mk" }, K[0] + 0.1, K[2] - 0.7, { mode: "stand", expr: "shock", look: -1, facing: -1, tilt: idle(t, 3) }, t, pop(t, tIn + 0.15, 0.12, 0.1));
  }

  if (id === 3) {
    const pulling = t >= W(PULL_T);
    const k = pulling ? 1 : Math.max(0, Math.sin((t - 7.6) * Math.PI * 2 * 2.2)) > 0.55 ? 1 : 0;
    put(out, cam, { i: 3, o: MARY_KID, okey: "mk" }, K[0] - 0.9, K[2] - 0.8,
      { mode: "stand", expr: pulling ? "proud" : "stern", prop: pulling ? "push" : ["hammer", k] as ["hammer", number], look: 1, facing: 1, tilt: idle(t, 3) + (pulling ? -6 * smooth((t - PULL_T) / 0.4) : 0) }, t, pop(t, PULL_T + 0.55, 0.12, 0.1));
    if (!pulling) for (let r = 0; r < 4; r++) { const ph = ((t * 2.2 + r * 0.27) % 1), y = 1.3 - 1.25 * ph * ph; fx1(out, `rock${r % 3}`, 100, 100, (p) => fxRock(p, r), K[0] - 0.45 + r * 0.12, y, K[2] - 0.3, 0.08, 0.08, ph * 6 + r); }
    if (t >= PULL_T + 0.55 && t < PULL_T + 1.1) { const v = q((t - PULL_T - 0.55) / 0.55, 30); fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v), K[0] + 0.1, 1.1, K[2] - 0.1, 0.75, 0.75); }
    putDino(out, cam, K[0] + 1.7, K[2] - 1.9, t, { expr: pulling ? "shock" : "talk", arm: pulling ? "shrug" : "point", look: -1 }, pop(t, PULL_T + 0.55, 0.16, 0.2));
  }

  if (id === 4) {
    const ST = STALL;
    put(out, cam, { i: 3, o: MARY_KID, okey: "mk" }, ST[0], ST[2] + 0.75, { mode: "stand", expr: t > 13.3 ? "smile_closed" : "smile", prop: t > 13.2 && t < 13.9 ? "push" : null, look: 1, tilt: idle(t, 3) }, t, pop(t, 13.3, 0.1));
    put(out, cam, { i: 5, o: GENT[0], okey: "g0" }, ST[0] + 1.45, ST[2] - 0.25, { mode: "stand", expr: "smug", prop: t > 12.9 && t < 13.5 ? "point" : null, look: -1, facing: -1 }, t);
    put(out, cam, { i: 6, o: LADY, okey: "lady" }, ST[0] + 2.15, ST[2] + 0.15, { mode: "stand", expr: "smile", look: -1, facing: -1 }, t);
    for (const [tc, k] of [[13.0, 0], [13.75, 1]] as const) { const u = clamp01((t - tc) / 0.4); if (u > 0 && u < 1) fx1(out, `coin${q(t * 20, 1) % 6}`, 100, 100, (p) => fxCoin(p, t * 20), ST[0] + 0.85 - 0.8 * u, 1.3 + 0.5 * Math.sin(u * Math.PI), ST[2] + 0.1, 0.1, 0.1); else if (u >= 1) fx1(out, "coin0", 100, 100, (p) => fxCoin(p, 0), ST[0] + 0.05 + k * 0.1, 0.83, ST[2] + 0.2, 0.08, 0.08); }
    putDino(out, cam, ST[0] - 1.45, ST[2] - 0.5, t, { expr: t > 14.1 ? "smug" : "talk", arm: t > 14.1 ? "shrug" : "hips", look: 1 });
  }

  if (id === 5) {
    if (t < 17.6) { // runs along the neck, out of breath
      const u = clamp01((t - 14.95) / 2.3);
      putDino(out, cam, P[0] + 5.7 - 5.3 * u, P[2] - 0.9, t, { expr: u < 1 ? "shock" : "talk", arm: "none", lean: u < 1 ? 8 : 0 }, { sy: 1 - 0.04 * Math.abs(Math.sin(t * 14)), dy: 0.05 * Math.abs(Math.sin(t * 14)) });
    } else {
      putDino(out, cam, P[0] + 0.1, P[2] - 1.2, t, { expr: t > GLUE_T ? "shock" : "talk", arm: t > GLUE_T ? "shrug" : "point", look: -1 }, pop(t, GLUE_T, 0.14, 0.14));
      put(out, cam, { i: 8, o: GENT[1], okey: "g1" }, P[0] + 1.6, P[2] - 1.5, { mode: "stand", expr: t > GLUE_T ? "talk" : "smug", prop: "point", look: -1, facing: -1 }, t, pop(t, GLUE_T, 0.1));
      put(out, cam, { i: 9, o: MARY, okey: "mary" }, P[0] - 1.25, P[2] - 1.3, { mode: "stand", expr: t > GLUE_T ? "angry" : "neutral", prop: "hips", look: 1, facing: 1 }, t, pop(t, GLUE_T + 0.1, 0.12));
      if (t > GLUE_T - 0.3) { const u = clamp01((t - GLUE_T + 0.3) / 0.4); fx1(out, "glue", 140, 240, fxGlue, P[0] + 0.9 - 0.5 * u, 0.4 + 0.7 * Math.sin(u * Math.PI), P[2] - 0.4, 0.18, 0.3, (1 - u) * 6); }
      stampAt(out, t, GLUE_T, fxFake, "fake", P[0] + 0.9, 1.15, P[2] - 0.3, 0.9);
    }
  }

  if (id === 6) {
    for (let k = 0; k < 12; k++) { const tk = 19.25 + k * 0.13; if (t < tk) break; const u = clamp01((t - tk) / 0.12); fx1(out, "check", 128, 110, fxCheck, P[0] + 0.3 + k * 0.5, 0.55 + 0.1 * (1 - u), P[2] - 0.05, 0.16 * (0.6 + 0.4 * u), 0.14 * (0.6 + 0.4 * u)); }
    [0, 2].forEach((g, k) => put(out, cam, { i: 10 + k, o: GENT[g], okey: `g${g}` }, P[0] + 1.6 + k * 2.6, P[2] - 1.0, { mode: "stand", expr: t > REAL_T ? "shock" : "stern", tilt: 18 * (t < REAL_T ? 1 : 0) + idle(t, 10 + k), look: 1 }, t, pop(t, REAL_T, 0.12, 0.12)));
    stampAt(out, t, REAL_T, fxReal, "real", P[0] + 3.0, 1.35, P[2] - 0.6, 1.4);
    if (t > REAL_T) twinkles(out, t, P[0] + 3.0, 1.4, P[2] - 0.7, 1.0, 7, 0.14);
    putDino(out, cam, P[0] + 4.9, P[2] - 1.6, t, { expr: t > REAL_T ? "proud" : "talk", arm: t > REAL_T ? "hips" : "point", look: -1 }, pop(t, REAL_T, 0.14, 0.18));
  }

  if (id === 7) {
    const S = SOC, slammed = t >= W(SLAM_T);
    const wu = clamp01((t - 22.0) / 0.55);
    put(out, cam, { i: 9, o: MARY, okey: "mary" }, S[0] - 1.0 + 0.6 * wu - (slammed ? 0.35 * smooth((t - SLAM_T) / 0.2) : 0), S[2] - 1.1,
      { mode: wu < 1 && !slammed ? "stroll" : "stand", phase: q((t * 2.2) % 1, 20), expr: slammed ? "shock" : "neutral", look: 1, facing: 1 }, t, pop(t, SLAM_T, 0.16, 0.15));
    if (slammed && t < SLAM_T + 0.5) { const v = q((t - W(SLAM_T)) / 0.5, 30); fx1(out, `burst${v}`, 500, 500, (p) => fxBurst(p, v, "#ffffff"), S[0], 1.6, S[2] - 0.4, 1.5, 1.5); }
    if (t > 23.4) { // the men on the balcony show off HER drawing and bow
      const bow = Math.max(0, Math.sin((t - 23.4) * 5)) * 14;
      [[-0.9, 0], [0.9, 2]].forEach(([dx, g]) => put(out, cam, { i: 12 + g, o: GENT[g], okey: `g${g}` }, S[0] + dx, S[2] - 0.5, { mode: "stand", expr: "proud", tilt: bow, look: 0 }, t, NONE, 3.1));
      fx1(out, "plan", 400, 260, fxPlan, S[0], 4.25, S[2] - 0.6, 1.0, 0.65, 0.04 * Math.sin(t * 3));
      twinkles(out, t, S[0], 4.3, S[2] - 0.65, 0.8, 5, 0.12);
    }
    const angry = t >= W(CREDIT_T);
    putDino(out, cam, S[0] - 1.7, S[2] - 1.0, t, { expr: slammed ? "angry" : "talk", arm: angry ? "facepalm" : slammed ? "hips" : "point", look: 1 }, pop(t, SLAM_T + 0.1, 0.12));
    if (slammed) { const u = q((t * 1.3) % 1, 20); fx1(out, `ang${u}`, 300, 260, (p) => fxAnger(p, u), S[0] - 1.7, 2.55, S[2] - 1.05, 0.6, 0.52, 0, true); }
  }

  if (id === 8) {
    const M = MUS;
    VIS.forEach((o, k) => put(out, cam, { i: 20 + k, o, okey: `v${k}` }, M[0] - 1.8 + k * 1.6, M[2] - 0.6 + (k % 2) * 0.4, { mode: "stand", expr: k === 1 ? "shock" : "proud", prop: k === 0 ? "point" : null, look: 0 }, t, pop(t, 25.9 + k * 0.1, 0.1), 0, o.build === "kid" ? 0.9 : 1));
    putDino(out, cam, M[0] + 1.9, M[2] - 1.6, t, { expr: "proud", arm: "point", look: -1 }, pop(t, 26.4, 0.12, 0.12));
    twinkles(out, t, M[0], 3.0, M[2] + 2.3, 1.4, 6, 0.16);
  }

  if (id === 9) {
    const SH = SHORE, tw = t >= W(TWIST_T) && t < TWIST_T + 1.1;
    put(out, cam, { i: 9, o: MARY, okey: "mary" }, SH[0] - 0.9, SH[2] - 0.4, { mode: "stand", expr: tw ? "laugh" : "smile_closed", look: 1, facing: 1, tilt: idle(t, 9) }, t, tw ? laughBounce(t, 9) : NONE);
    fx1(out, "shells", 300, 240, fxShells, SH[0] - 0.4, 0.42, SH[2] - 0.15, 0.55, 0.44);
    putDino(out, cam, SH[0] + 0.6, SH[2] + 0.2, t, { expr: tw ? "tangled" : t > TWIST_T + 1.1 ? "happy" : "talk", arm: tw ? "facepalm" : "wave", armK: t * 1.4, look: -1 }, mul(pop(t, TWIST_T, 0.16, 0.12), tw ? { sy: 1 + 0.03 * Math.sin(t * 30), dy: 0 } : NONE));
    if (tw) fx1(out, "swirlT", 200, 200, fxSwirlTongue, SH[0] + 0.85, 1.45, SH[2] + 0.05, 0.32, 0.32, -t * 8);
  }
  return out;
};
export { FPS };