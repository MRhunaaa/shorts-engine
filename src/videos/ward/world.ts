// All five 3D sets + the cast, posed per frame. Only the active set is visible (its lights cast shadows).
// Props are dense on purpose (burglar reference: 15-20 story props per room).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { NOINK } from "../dino/ink";
import { Character, LOOKS, mat, metalMat, glow, mesh, taper, shade, BODY_Y, Pose, V3 as RV3 } from "./rig";
import {
  SHOTS, SetName, WARD, WARD2, CELL, MORGUE, STREET, add, V3, smooth, clamp01, lerp, glide, camAt, docAPath, pushedPath,
  T_DIED, T_SAFER, T_CHLOR, T_HUNDRED, T_CLEAN, T_INFECT, T_LOCKED, FPS,
} from "./story";

// ---------------- canvas textures ----------------
const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rep?: [number, number]) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!; draw(c);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
};
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const wallpaper = (base: string, ink: string) => tex(256, 256, (c) => {
  c.fillStyle = base; c.fillRect(0, 0, 256, 256);
  c.strokeStyle = ink; c.globalAlpha = 0.35; c.lineWidth = 3;
  for (const x of [0, 128, 256]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
  c.globalAlpha = 0.28; c.fillStyle = ink;
  for (const [x, y] of [[64, 64], [192, 192], [64, 192 + 64 - 64], [192, 64 + 0]]) {
    c.save(); c.translate(x, y);
    for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.ellipse(0, -16, 7, 15, 0, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill(); c.restore();
  }
}, [3, 2]);
const planks = (base: string) => tex(512, 512, (c) => {
  for (let i = 0; i < 8; i++) {
    const v = 0.82 + 0.3 * rnd(); const col = new THREE.Color(base).multiplyScalar(v);
    c.fillStyle = "#" + col.getHexString(); c.fillRect(0, i * 64, 512, 64);
    c.strokeStyle = "rgba(20,10,5,0.55)"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, i * 64); c.lineTo(512, i * 64); c.stroke();
    const j = 120 + rnd() * 300; c.beginPath(); c.moveTo(j, i * 64); c.lineTo(j, i * 64 + 64); c.stroke();
    c.strokeStyle = "rgba(40,20,10,0.18)"; c.lineWidth = 1.5;
    for (let g = 0; g < 5; g++) { const y = i * 64 + 8 + rnd() * 48; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(170, y + 6 * rnd(), 340, y - 6 * rnd(), 512, y); c.stroke(); }
  }
}, [3, 6]);
const stones = (base: string, rows = 8, cols = 4, mortar = "rgba(25,25,30,0.7)") => tex(512, 512, (c) => {
  c.fillStyle = mortar; c.fillRect(0, 0, 512, 512);
  const h = 512 / rows, w = 512 / cols;
  for (let r = 0; r < rows; r++) for (let k = -1; k < cols; k++) {
    const x = k * w + (r % 2 ? w / 2 : 0); const col = new THREE.Color(base).multiplyScalar(0.8 + 0.35 * rnd());
    c.fillStyle = "#" + col.getHexString(); c.beginPath(); c.roundRect(x + 4, r * h + 4, w - 8, h - 8, 8); c.fill();
    c.fillStyle = "rgba(255,255,255,0.06)"; c.fillRect(x + 6, r * h + 6, w - 14, 5);
  }
}, [2, 2]);
const cobbles = () => tex(512, 512, (c) => {
  c.fillStyle = "#2a2a30"; c.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 16; r++) for (let k = 0; k < 16; k++) {
    const col = new THREE.Color("#7a7884").multiplyScalar(0.7 + 0.45 * rnd());
    c.fillStyle = "#" + col.getHexString(); c.beginPath();
    c.ellipse(k * 32 + 16 + (r % 2) * 16, r * 32 + 16, 13 + rnd() * 2, 12 + rnd() * 2, rnd(), 0, Math.PI * 2); c.fill();
  }
}, [6, 6]);
const tiles = () => tex(256, 256, (c) => {
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { c.fillStyle = (r + k) % 2 ? "#e8e6df" : "#d6d3ca"; c.fillRect(k * 32, r * 32, 32, 32); }
  c.strokeStyle = "rgba(60,60,60,0.35)"; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, 256); c.moveTo(0, i * 32); c.lineTo(256, i * 32); c.stroke(); }
}, [4, 2]);
const textTex = (w: number, h: number, bg: string, lines: [string, number, string, number][], frame?: string) => tex(w, h, (c) => {
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  if (frame) { c.strokeStyle = frame; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); }
  c.textAlign = "center"; c.textBaseline = "middle";
  for (const [s, y, col, px] of lines) { c.fillStyle = col; c.font = `bold ${px}px Georgia, 'Times New Roman', serif`; c.fillText(s, w / 2, y); }
});

// ---------------- prop helpers ----------------
const box = (w: number, h: number, d: number, m: THREE.Material, p: V3, parent: THREE.Object3D, r = 0) =>
  mesh(r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), m, p, parent);
const cyl = (r: number, h: number, m: THREE.Material, p: V3, parent: THREE.Object3D, seg = 20, r2 = r) => mesh(new THREE.CylinderGeometry(r, r2, h, seg), m, p, parent);
const noink = (o: THREE.Object3D) => { o.traverse((k) => { k.layers.set(NOINK); (k as THREE.Mesh).castShadow = false; (k as THREE.Mesh).receiveShadow = false; }); return o; };
const lathe = (pts: [number, number][], m: THREE.Material, p: V3, parent: THREE.Object3D) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 32), m, p, parent);

/** a lit candle: brass dish, wax, wick, flame (blooms), soft glow sprite */
type Candle = { g: THREE.Group; flame: THREE.Mesh; halo: THREE.Mesh; smoke: THREE.Group };
function candle(parent: THREE.Object3D, p: V3, h = 0.16): Candle {
  const g = new THREE.Group(); g.position.set(...p); parent.add(g);
  lathe([[0, 0], [0.06, 0], [0.065, 0.012], [0.03, 0.02], [0.02, 0.03], [0, 0.03]], metalMat("#c9a64a"), [0, 0, 0], g);
  cyl(0.018, h, mat("#f3ecd8", 0.6), [0, 0.03 + h / 2, 0], g, 16);
  const flame = mesh(new THREE.SphereGeometry(1, 16, 12), glow("#ffb347", 6), [0, 0.03 + h + 0.03, 0], g);
  flame.scale.set(0.011, 0.026, 0.011); flame.castShadow = false;
  const halo = noink(mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: "#ff9a3c", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 0.03 + h + 0.03, 0], g)) as THREE.Mesh;
  const smoke = new THREE.Group(); smoke.position.set(0, 0.03 + h + 0.03, 0); g.add(smoke);
  for (let i = 0; i < 6; i++) noink(mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshBasicMaterial({ color: "#cfcfd6", transparent: true, opacity: 0.0, depthWrite: false }), [0, 0, 0], smoke));
  return { g, flame, halo, smoke };
}
function setCandle(c: Candle, t: number, out = -1) {
  const lit = out < 0 || t < out;
  const fl = 1 + 0.12 * Math.sin(t * 23) + 0.08 * Math.sin(t * 37 + 1);
  c.flame.visible = c.halo.visible = lit;
  c.flame.scale.set(0.011 * fl, 0.026 * fl, 0.011 * fl);
  c.smoke.children.forEach((s, i) => {
    const k = out < 0 ? -1 : t - out - i * 0.08;
    const m = (s as THREE.Mesh).material as THREE.MeshBasicMaterial;
    if (k < 0 || k > 1.4) { m.opacity = 0; return; }
    s.position.set(0.03 * Math.sin(k * 6 + i), k * 0.35, 0.02 * Math.cos(k * 5));
    s.scale.setScalar(1 + k * 2.5); m.opacity = 0.45 * (1 - k / 1.4);
  });
}
/** hanging oil lamp: chain, brass cap, glass chimney, flame, reservoir; returns the lights */
function hangingLamp(parent: THREE.Object3D, p: V3, ceil: number, lit: boolean, shadow: boolean) {
  const g = new THREE.Group(); g.position.set(...p); parent.add(g);
  const len = ceil - p[1];
  cyl(0.008, len, metalMat("#6b5a3a"), [0, len / 2, 0], g, 6);
  lathe([[0, 0.16], [0.12, 0.06], [0.13, 0.05], [0.04, 0.04], [0, 0.04]], metalMat("#b8913e"), [0, 0, 0], g);
  const glass = mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 20, 1, true), mat("#fff3d6", 0.1, { transparent: true, opacity: 0.35, emissive: new THREE.Color(lit ? "#ffb060" : "#000"), emissiveIntensity: lit ? 0.8 : 0, side: THREE.DoubleSide }), [0, -0.05, 0], g);
  glass.castShadow = false;
  const flame = mesh(new THREE.SphereGeometry(1, 14, 10), glow("#ffb347", lit ? 7 : 0), [0, -0.07, 0], g); flame.scale.set(0.018, 0.04, 0.018); flame.castShadow = false; flame.visible = lit;
  lathe([[0, -0.13], [0.07, -0.16], [0.09, -0.22], [0.06, -0.28], [0, -0.3]], metalMat("#b8913e"), [0, 0, 0], g);
  const lights: THREE.Light[] = [];
  if (lit) {
    const pt = new THREE.PointLight("#ffa552", 11, 9, 1.4); pt.position.set(p[0], p[1] - 0.05, p[2]); parent.add(pt); lights.push(pt);
    if (shadow) {
      const sp = new THREE.SpotLight("#ffb066", 38, 8, 1.15, 0.6, 1.4); sp.position.set(p[0], p[1] - 0.1, p[2]);
      sp.target.position.set(p[0], 0, p[2]); parent.add(sp, sp.target);
      sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0006; sp.shadow.camera.near = 0.2; lights.push(sp);
    }
    const halo = noink(mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: "#ff9a3c", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }), [0, -0.06, 0], g));
    void halo;
  }
  return { g, lights, flame };
}
/** fabric with vertical folds (curtains) */
function curtain(parent: THREE.Object3D, w: number, h: number, col: string, p: V3, rotY: number, folds = 7) {
  const g = new THREE.PlaneGeometry(w, h, folds * 8, 4);
  const q = g.attributes.position;
  for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i); q.setZ(i, 0.05 * Math.sin((x / w) * folds * Math.PI * 2) * (0.6 + 0.4 * (0.5 - y / h))); }
  g.computeVertexNormals();
  const m = mesh(g, mat(col, 0.92, { side: THREE.DoubleSide }), p, parent); m.rotation.y = rotY; return m;
}
function frame(parent: THREE.Object3D, w: number, h: number, t: THREE.Texture, p: V3, rotY: number) {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = rotY; parent.add(g);
  const gold = metalMat("#b38b3a");
  for (const [x, y, ww, hh] of [[0, h / 2, w + 0.06, 0.05], [0, -h / 2, w + 0.06, 0.05], [w / 2, 0, 0.05, h], [-w / 2, 0, 0.05, h]] as const) box(ww, hh, 0.04, gold, [x, y, 0.02], g);
  mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), [0, 0, 0.005], g);
  return g;
}
const portrait = (bg: string, coat: string) => tex(256, 320, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, bg); gr.addColorStop(1, "#1a120c"); c.fillStyle = gr; c.fillRect(0, 0, 256, 320);
  c.fillStyle = coat; c.beginPath(); c.roundRect(58, 170, 140, 170, 40); c.fill();
  c.fillStyle = "#efe2c8"; c.beginPath(); c.arc(128, 120, 62, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#3a2a1c"; c.beginPath(); c.ellipse(128, 160, 50, 30, 0, 0, Math.PI); c.fill();
  c.fillStyle = "#111"; c.beginPath(); c.ellipse(106, 112, 6, 9, 0, 0, Math.PI * 2); c.ellipse(150, 112, 6, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.moveTo(118, 175); c.lineTo(138, 175); c.lineTo(128, 200); c.fill();
});
function clock(parent: THREE.Object3D, p: V3, rotY: number) {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = rotY; parent.add(g);
  const face = tex(256, 256, (c) => {
    c.fillStyle = "#f2ead8"; c.beginPath(); c.arc(128, 128, 124, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#1a1418"; c.font = "bold 30px Georgia"; c.textAlign = "center"; c.textBaseline = "middle";
    const R = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    R.forEach((s, i) => { const a = (i / 12) * Math.PI * 2; c.fillText(s, 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); });
  });
  const rim = mesh(new THREE.TorusGeometry(0.2, 0.025, 10, 40), mat("#4a2e1c", 0.5), [0, 0, 0.02], g); void rim;
  mesh(new THREE.CircleGeometry(0.2, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }), [0, 0, 0.012], g);
  const hh = box(0.012, 0.11, 0.006, mat("#111", 0.5), [0, 0.045, 0.03], g), mm = box(0.008, 0.16, 0.006, mat("#111", 0.5), [0, 0.07, 0.034], g);
  const hp = new THREE.Group(); hp.position.set(0, 0, 0.03); g.add(hp); hp.add(hh); hh.position.set(0, 0.045, 0);
  const mp = new THREE.Group(); mp.position.set(0, 0, 0.034); g.add(mp); mp.add(mm); mm.position.set(0, 0.07, 0);
  return { hp, mp };
}

// ---------------- WARD (clinic 1 by night / clinic 2 by day) ----------------
type Bed = { x: number; z: number; side: number };
type WardSet = { g: THREE.Group; lights: THREE.Light[]; candles: Candle[]; board?: { draw: (s: number) => void }; clock: { hp: THREE.Group; mp: THREE.Group }; beds: Bed[]; dust: THREE.Points };
function buildWard(origin: V3, day: boolean): WardSet {
  const g = new THREE.Group(); g.position.set(...origin);
  const lights: THREE.Light[] = []; const candles: Candle[] = [];
  const paper = new THREE.MeshStandardMaterial({ map: wallpaper(day ? "#cfd6b4" : "#b9c4a4", "#6f7a52"), roughness: 0.95 });
  const wood = mat("#5a3a26", 0.7), woodD = mat("#3e271a", 0.7), iron = mat("#2a2a30", 0.45, { metalness: 0.5 });
  // floor + runner rug + ceiling + beams
  const fl = mesh(new THREE.PlaneGeometry(6.8, 13.4), new THREE.MeshStandardMaterial({ map: planks("#8a5a36"), roughness: 0.75 }), [0, 0, -2.5], g); fl.rotation.x = -Math.PI / 2;
  const rug = tex(128, 512, (c) => { c.fillStyle = "#7a2a2a"; c.fillRect(0, 0, 128, 512); c.fillStyle = "#c8a05a"; c.fillRect(8, 0, 6, 512); c.fillRect(114, 0, 6, 512); c.fillStyle = "#4a1a1c"; for (let y = 20; y < 512; y += 48) { c.beginPath(); c.moveTo(64, y); c.lineTo(84, y + 20); c.lineTo(64, y + 40); c.lineTo(44, y + 20); c.fill(); } });
  const rg = mesh(new THREE.PlaneGeometry(1.1, 10.5), new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95 }), [0, 0.004, -3.2], g); rg.rotation.x = -Math.PI / 2;
  box(6.8, 0.1, 13.4, woodD, [0, 4.25, -2.5], g);
  for (let z = 3; z > -9; z -= 2) box(6.8, 0.22, 0.18, wood, [0, 4.1, z], g);
  // right wall (solid) + far wall with door + front wall
  const wainscot = (len: number, p: V3, rotY: number) => {
    const w = new THREE.Group(); w.position.set(...p); w.rotation.y = rotY; g.add(w);
    box(len, 1.0, 0.05, wood, [0, 0.5, 0], w); box(len, 0.06, 0.08, woodD, [0, 1.02, 0.02], w); box(len, 0.12, 0.07, woodD, [0, 0.06, 0.01], w);
    for (let x = -len / 2 + 0.35; x < len / 2 - 0.2; x += 0.7) box(0.5, 0.6, 0.02, woodD, [x, 0.52, 0.03], w);
  };
  box(0.2, 4.3, 13.4, paper, [3.3, 2.15, -2.5], g); wainscot(13.4, [3.18, 0, -2.5], -Math.PI / 2);
  // far wall z = -9 with a doorway at x = 0.9 (to the autopsy corridor)
  box(2.9, 4.3, 0.2, paper, [-1.85, 2.15, -9.1], g); box(1.3, 4.3, 0.2, paper, [2.65, 2.15, -9.1], g); box(1.0, 2.0, 0.2, paper, [0.9, 3.3, -9.1], g);
  wainscot(2.9, [-1.85, 0, -8.98], 0); wainscot(1.3, [2.65, 0, -8.98], 0);
  for (const x of [0.37, 1.43]) box(0.08, 2.35, 0.26, woodD, [x, 1.15, -9.0], g);
  box(1.14, 0.1, 0.26, woodD, [0.9, 2.3, -9.0], g);
  const door = new THREE.Group(); door.position.set(0.42, 0, -9.0); door.rotation.y = 1.25; g.add(door);
  box(0.95, 2.25, 0.05, wood, [0.47, 1.12, 0], door); for (const y of [0.6, 1.6]) box(0.7, 0.7, 0.02, woodD, [0.47, y, 0.035], door);
  box(1.1, 2.3, 0.1, mat("#0c0b10", 1), [0.9, 1.15, -9.6], g); // dark corridor beyond
  box(6.8, 4.3, 0.2, paper, [0, 2.15, 4.1], g); wainscot(6.8, [0, 0, 3.98], Math.PI);
  // left wall with two real window holes (so the moon / sun casts window shadows across the floor)
  const LX = -3.3;
  box(0.2, 1.2, 13.4, paper, [LX, 0.6, -2.5], g); box(0.2, 1.2, 13.4, paper, [LX, 3.7, -2.5], g);
  for (const [z0, z1] of [[-9.2, -5.3], [-4.3, -2.9], [-1.9, 4.2]]) box(0.2, 1.9, z1 - z0, paper, [LX, 2.15, (z0 + z1) / 2], g);
  wainscot(13.4, [LX + 0.12, 0, -2.5], Math.PI / 2);
  for (const zc of [-4.8, -2.4]) {
    const w = new THREE.Group(); w.position.set(LX, 0, zc); g.add(w);
    for (const [y, h] of [[1.2, 0.08], [3.1, 0.08], [2.3, 0.05]]) box(0.12, h, 1.0, wood, [0, y, 0], w);
    for (const z of [-0.5, 0, 0.5]) box(0.12, 1.9, 0.05, wood, [0, 2.15, z], w);
    box(0.3, 0.05, 1.1, wood, [0.12, 1.18, 0], w); // sill
    const gl = mesh(new THREE.PlaneGeometry(1.0, 1.9), new THREE.MeshBasicMaterial({ color: day ? "#dff1ff" : "#3a5a9a", transparent: true, opacity: day ? 0.18 : 0.28, side: THREE.DoubleSide }), [0, 2.15, 0], w);
    gl.rotation.y = Math.PI / 2; noink(gl);
    curtain(g, 0.45, 2.3, day ? "#b0473c" : "#7a2e2a", [LX + 0.18, 2.1, zc - 0.78], Math.PI / 2, 5);
    curtain(g, 0.45, 2.3, day ? "#b0473c" : "#7a2e2a", [LX + 0.18, 2.1, zc + 0.78], Math.PI / 2, 5);
    cyl(0.018, 2.0, metalMat("#9a7a3a"), [LX + 0.2, 3.28, zc], g, 8).rotation.x = Math.PI / 2;
  }
  // sky outside (night: stars + moon; day: pale blue + sun haze)
  const sky = tex(512, 256, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 256);
    if (day) { gr.addColorStop(0, "#9cc8ef"); gr.addColorStop(1, "#f4e6c8"); } else { gr.addColorStop(0, "#060b1e"); gr.addColorStop(1, "#24386a"); }
    c.fillStyle = gr; c.fillRect(0, 0, 512, 256);
    if (!day) { c.fillStyle = "#fff"; for (let i = 0; i < 90; i++) { c.globalAlpha = 0.3 + 0.7 * rnd(); c.fillRect(rnd() * 512, rnd() * 200, 1.5, 1.5); } c.globalAlpha = 1; c.fillStyle = "#f4f0dc"; c.beginPath(); c.arc(300, 70, 26, 0, Math.PI * 2); c.fill(); c.fillStyle = "#24386a"; c.globalAlpha = 0.25; c.beginPath(); c.arc(292, 64, 6, 0, 7); c.arc(310, 80, 4, 0, 7); c.fill(); c.globalAlpha = 1; }
    // rooftops silhouette
    c.fillStyle = day ? "#8a8070" : "#05070f"; c.beginPath(); c.moveTo(0, 256);
    for (let x = 0; x <= 512; x += 32) c.lineTo(x, 200 - ((x * 7) % 5) * 9 - (x % 96 === 0 ? 30 : 0));
    c.lineTo(512, 256); c.fill();
  });
  const skyM = mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ map: sky }), [-8, 3.5, -3.5], g); skyM.rotation.y = Math.PI / 2; noink(skyM);
  // moon / sun through the windows + light shafts + dust
  const dl = new THREE.DirectionalLight(day ? "#ffe2b0" : "#8fb2ff", day ? 3.2 : 2.4);
  dl.position.set(-9, 7.5, -2.6); dl.target.position.set(0, 0, -4.2); g.add(dl, dl.target);
  dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); dl.shadow.bias = -0.0004; dl.shadow.normalBias = 0.02;
  lights.push(dl);
  const hemi = new THREE.HemisphereLight(day ? "#fff4e0" : "#7486c0", day ? "#8a6a4a" : "#3a2a20", day ? 1.25 : 1.15); g.add(hemi); lights.push(hemi);
  const dir = new THREE.Vector3(9, -7.5, -1.6).normalize();
  for (const zc of [-4.8, -2.4]) {
    const c0 = [[LX, 1.25, zc - 0.5], [LX, 1.25, zc + 0.5], [LX, 3.05, zc + 0.5], [LX, 3.05, zc - 0.5]].map((p) => new THREE.Vector3(...(p as V3)));
    const L = 4.2, c1 = c0.map((p) => p.clone().addScaledVector(dir, L * (p.y / 2.4)));
    const pos: number[] = []; [...c0, ...c1].forEach((p) => pos.push(p.x, p.y, p.z));
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    sg.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
    noink(mesh(sg, new THREE.MeshBasicMaterial({ color: day ? "#ffd9a0" : "#7f9fff", transparent: true, opacity: day ? 0.045 : 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [0, 0, 0], g));
  }
  const dp: number[] = []; for (let i = 0; i < 260; i++) dp.push(-3 + rnd() * 3.5, 0.3 + rnd() * 3, -6 + rnd() * 5);
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: day ? "#fff0c8" : "#bcd0ff", size: 0.012, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(noink(dust));
  // hanging lamps (night: lit; day: unlit)
  for (const z of [-0.8, -5.6]) { const l = hangingLamp(g, [0, 3.1, z], 4.2, !day, true); lights.push(...l.lights); }
  if (day) { const fill = new THREE.PointLight("#fff0d8", 2.5, 9, 1.4); fill.position.set(0.5, 3, -2.5); g.add(fill); lights.push(fill); }
  // beds: 3 on the right, 2 on the left
  const beds: Bed[] = [{ x: 2.0, z: -1.2, side: 1 }, { x: 2.0, z: -3.6, side: 1 }, { x: 2.0, z: -6.0, side: 1 }, { x: -2.0, z: -1.0, side: -1 }, { x: -2.0, z: -6.4, side: -1 }];
  const blanket = tex(256, 256, (c) => { c.fillStyle = day ? "#c98a62" : "#7d8aa3"; c.fillRect(0, 0, 256, 256); c.fillStyle = "rgba(255,255,255,0.22)"; for (const y of [30, 46, 210, 226]) c.fillRect(0, y, 256, 8); c.fillStyle = "rgba(0,0,0,0.08)"; for (let x = 0; x < 256; x += 8) c.fillRect(x, 0, 2, 256); });
  for (const b of beds) {
    const bg = new THREE.Group(); bg.position.set(b.x, 0, b.z); bg.rotation.y = b.side > 0 ? 0 : Math.PI; g.add(bg);
    // iron frame: head (at the wall, +x) and foot rails, spindles, brass knobs
    for (const [x, hgt] of [[1.0, 1.15], [-0.95, 0.8]] as const) {
      for (const z of [-0.45, 0.45]) { cyl(0.025, hgt, iron, [x, hgt / 2, z], bg, 10); mesh(new THREE.SphereGeometry(0.04, 14, 10), metalMat("#d4ae52"), [x, hgt + 0.02, z], bg); }
      const rail = cyl(0.02, 0.9, iron, [x, hgt - 0.05, 0], bg, 8); rail.rotation.x = Math.PI / 2;
      const rail2 = cyl(0.016, 0.9, iron, [x, hgt * 0.55, 0], bg, 8); rail2.rotation.x = Math.PI / 2;
      for (let k = -2; k <= 2; k++) cyl(0.011, hgt * 0.4, iron, [x, hgt * 0.75, k * 0.16], bg, 6);
    }
    for (const z of [-0.45, 0.45]) { const sr = cyl(0.02, 1.95, iron, [0.02, 0.42, z], bg, 8); sr.rotation.z = Math.PI / 2; }
    box(1.9, 0.18, 0.9, mat("#ece6d8", 0.9), [0.02, 0.55, 0], bg, 0.05);
    box(0.3, 0.13, 0.62, mat("#f7f4ee", 0.9), [0.78, 0.7, 0], bg, 0.06);
    const bl = box(1.3, 0.1, 0.96, new THREE.MeshStandardMaterial({ map: blanket, roughness: 0.95 }), [-0.28, 0.66, 0], bg, 0.04);
    box(0.16, 0.11, 0.97, mat("#f4f1ea", 0.9), [0.37, 0.67, 0], bg, 0.03);
    void bl;
    // bedside table with candle, cup, bottle
    const tb = new THREE.Group(); tb.position.set(0.95, 0, b.side > 0 ? -0.78 : 0.78); bg.add(tb);
    box(0.42, 0.62, 0.38, wood, [0, 0.31, 0], tb, 0.02); box(0.44, 0.04, 0.4, woodD, [0, 0.63, 0], tb); box(0.3, 0.12, 0.02, woodD, [0, 0.45, 0.2], tb);
    mesh(new THREE.SphereGeometry(0.015, 10, 8), metalMat("#c9a64a"), [0, 0.45, 0.215], tb);
    candles.push(candle(tb, [-0.08, 0.65, -0.05]));
    lathe([[0, 0], [0.03, 0], [0.035, 0.07], [0.0, 0.07]], mat("#e9e4da", 0.4), [0.1, 0.65, 0.06], tb);
    lathe([[0, 0], [0.035, 0], [0.04, 0.1], [0.015, 0.14], [0.012, 0.18], [0, 0.18]], mat(day ? "#4a8a5a" : "#2c5a3a", 0.15, { transparent: true, opacity: 0.85 }), [0.08, 0.65, -0.1], tb);
    if (day) { // flowers
      lathe([[0, 0], [0.04, 0], [0.05, 0.12], [0.03, 0.14], [0, 0.14]], mat("#d9d2c2", 0.5), [-0.1, 0.65, 0.1], tb);
      for (let k = 0; k < 5; k++) mesh(new THREE.SphereGeometry(0.025, 10, 8), mat(["#e0525a", "#f2c84b", "#ffffff"][k % 3], 0.8), [-0.1 + 0.04 * Math.cos(k * 1.3), 0.86 + 0.03 * (k % 2), 0.1 + 0.04 * Math.sin(k * 1.3)], tb);
    }
    // privacy curtain on a rail between beds
    const rz = b.side > 0 ? -1.2 : 1.2;
    cyl(0.012, 1.7, metalMat("#9a7a3a"), [0.25, 2.25, rz], bg, 6).rotation.z = Math.PI / 2;
    curtain(bg, 1.0, 1.9, "#ece6d8", [0.6, 1.3, rz], 0, 6);
  }
  // walls: portraits, clock, calendar, shelf with bottles, coat hook with top hat, rules plaque
  frame(g, 0.55, 0.7, portrait("#5a4a3a", "#1a1a22"), [3.17, 2.35, -2.4], -Math.PI / 2);
  frame(g, 0.5, 0.62, portrait("#3a4a5a", "#2a1a12"), [3.17, 2.35, -4.8], -Math.PI / 2);
  const ck = clock(g, [-1.6, 2.85, -8.98], 0);
  frame(g, 0.36, 0.48, textTex(180, 240, "#f2ead6", [["1847", 60, "#8a1a1a", 54], ["MAI", 120, "#222", 36], ["17", 185, "#222", 64]]), [-2.5, 1.85, -8.97], 0);
  frame(g, 0.62, 0.42, textTex(310, 210, "#e9dfc6", [[day ? "CLINIC 2" : "CLINIC 1", 52, "#3a1a10", 40], [day ? "MIDWIVES" : "PHYSICIANS", 112, "#3a1a10", 30], ["VIENNA", 165, "#6a4a30", 24]]), [-0.7, 2.35, -8.97], 0);
  const sh = new THREE.Group(); sh.position.set(3.15, 1.5, 0.9); sh.rotation.y = -Math.PI / 2; g.add(sh);
  box(1.2, 0.04, 0.25, woodD, [0, 0, 0.1], sh); box(1.2, 0.04, 0.25, woodD, [0, 0.4, 0.1], sh);
  for (let k = 0; k < 7; k++) lathe([[0, 0], [0.04, 0], [0.045, 0.1 + 0.04 * (k % 3)], [0.015, 0.16 + 0.04 * (k % 3)], [0, 0.18 + 0.04 * (k % 3)]], mat(["#2c5a3a", "#6a3a1a", "#2a3a6a", "#7a6a2a"][k % 4], 0.15, { transparent: true, opacity: 0.88 }), [-0.5 + k * 0.16, k < 4 ? 0.02 : 0.42, 0.1], sh);
  const hook = new THREE.Group(); hook.position.set(-3.15, 1.75, 2.6); hook.rotation.y = Math.PI / 2; g.add(hook);
  box(0.6, 0.08, 0.03, woodD, [0, 0, 0], hook); cyl(0.012, 0.1, metalMat("#9a7a3a"), [0.15, 0, 0.05], hook, 6).rotation.x = Math.PI / 2;
  const hat = new THREE.Group(); hat.position.set(0.15, 0.02, 0.12); hat.rotation.x = 0.3; hook.add(hat);
  cyl(0.11, 0.2, mat("#141218", 0.5), [0, 0.12, 0], hat, 24); cyl(0.17, 0.012, mat("#141218", 0.5), [0, 0.02, 0], hat, 28); cyl(0.112, 0.03, mat("#5a1a1a", 0.6), [0, 0.04, 0], hat, 24);
  // washstand at the front (hook + scrub shots): two porcelain bowls, CHLORINE jug, brush, towel, bucket
  const ws = new THREE.Group(); ws.position.set(0, 0, 2.05); g.add(ws);
  box(1.35, 0.06, 0.55, wood, [0, 0.86, 0], ws, 0.01);
  for (const x of [-0.6, 0.6]) for (const z of [-0.22, 0.22]) box(0.05, 0.86, 0.05, woodD, [x, 0.43, z], ws);
  box(1.25, 0.04, 0.45, woodD, [0, 0.25, 0], ws);
  const porc = mat("#f7f6f2", 0.18);
  for (const x of [-0.32, 0.32]) {
    lathe([[0, 0.0], [0.08, 0.0], [0.19, 0.08], [0.21, 0.13], [0.2, 0.135], [0.18, 0.09], [0.07, 0.02], [0, 0.02]], porc, [x, 0.89, 0], ws);
    const water = mesh(new THREE.CircleGeometry(0.17, 32), mat("#9ccbd6", 0.05, { transparent: true, opacity: 0.8 }), [x, 0.99, 0], ws); water.rotation.x = -Math.PI / 2;
  }
  lathe([[0, 0], [0.07, 0], [0.09, 0.08], [0.085, 0.2], [0.05, 0.26], [0.045, 0.3], [0.06, 0.32], [0, 0.32]], mat("#e8f0e4", 0.2), [0.56, 0.89, -0.1], ws);
  const lab = mesh(new THREE.PlaneGeometry(0.14, 0.08), new THREE.MeshStandardMaterial({ map: textTex(256, 140, "#f4ecd2", [["CHLORINE", 70, "#1f4a2a", 44]], "#1f4a2a"), roughness: 0.8 }), [0.56, 1.03, -0.01], ws); void lab;
  box(0.16, 0.04, 0.06, mat("#8a5a2a", 0.7), [0.18, 0.91, 0.15], ws); for (let k = 0; k < 6; k++) cyl(0.006, 0.03, mat("#e8d8b0", 0.9), [0.12 + k * 0.024, 0.94, 0.15], ws, 5);
  curtain(ws, 0.28, 0.5, "#f2efe6", [0.69, 0.62, 0], Math.PI / 2, 3);
  lathe([[0, 0], [0.13, 0], [0.15, 0.26], [0, 0.26]], mat("#6a6a72", 0.4, { metalness: 0.6 }), [-0.5, 0.27, 0.0], ws);
  // chalkboard on an easel (redrawn when the numbers change)
  const bcv = document.createElement("canvas"); bcv.width = 512; bcv.height = 384;
  const btex = new THREE.CanvasTexture(bcv); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 8;
  let bstate = -1;
  const draw = (s: number) => {
    if (s === bstate) return; bstate = s;
    const c = bcv.getContext("2d")!;
    c.fillStyle = "#1e2a24"; c.fillRect(0, 0, 512, 384);
    c.fillStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 40; i++) c.fillRect(rnd() * 512, rnd() * 384, 60, 2);
    c.fillStyle = "#f2efe6"; c.textAlign = "center"; c.font = "bold 46px Georgia"; c.fillText(day ? "CLINIC 2" : "CLINIC 1", 256, 66);
    c.font = "28px Georgia"; c.fillText(day ? "midwives" : "deaths", 256, 106);
    c.font = "bold 128px Georgia"; c.fillStyle = s >= 1 ? "rgba(242,239,230,0.55)" : "#f2efe6";
    c.fillText(day ? "3x" : "1/10", 256, 236);
    if (day) { c.font = "bold 56px Georgia"; c.fillStyle = "#f6d36a"; c.fillText("SAFER", 256, 310); }
    if (!day && s >= 1) { c.strokeStyle = "#ff5a4a"; c.lineWidth = 12; c.beginPath(); c.moveTo(110, 250); c.lineTo(400, 160); c.stroke(); }
    if (!day && s >= 2) { c.font = "bold 92px Georgia"; c.fillStyle = "#8dff7a"; c.fillText("1/100", 256, 340); }
    btex.needsUpdate = true;
  };
  draw(0);
  const eas = new THREE.Group(); eas.position.set(0.9, 0, -6.3); eas.rotation.y = -0.55; g.add(eas);
  for (const s of [-1, 1]) { const lg = cyl(0.02, 1.9, wood, [0.42 * s, 0.92, 0.05], eas, 8); lg.rotation.z = -0.08 * s; lg.rotation.x = -0.1; }
  const bl2 = cyl(0.02, 1.8, wood, [0, 0.9, -0.35], eas, 8); bl2.rotation.x = 0.25;
  box(1.0, 0.75, 0.04, woodD, [0, 1.45, 0.1], eas); mesh(new THREE.PlaneGeometry(0.92, 0.69), new THREE.MeshStandardMaterial({ map: btex, roughness: 0.9 }), [0, 1.45, 0.122], eas);
  box(1.0, 0.04, 0.08, wood, [0, 1.06, 0.13], eas);
  // chairs
  const chair = (p: V3, ry: number) => { const ch = new THREE.Group(); ch.position.set(...p); ch.rotation.y = ry; g.add(ch); box(0.42, 0.04, 0.4, wood, [0, 0.45, 0], ch); for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) box(0.035, 0.45, 0.035, woodD, [x, 0.225, z], ch); box(0.42, 0.5, 0.03, wood, [0, 0.72, -0.19], ch); };
  chair([1.2, 0, -2.3], -1.2); chair([-1.3, 0, -3.8], 1.9);
  return { g, lights, candles, board: { draw }, clock: ck, beds, dust };
}

// ---------------- CELL (asylum) ----------------
function buildCell(origin: V3) {
  const g = new THREE.Group(); g.position.set(...origin);
  const lights: THREE.Light[] = [];
  const stone = new THREE.MeshStandardMaterial({ map: stones("#6c6a72", 8, 4), roughness: 0.95 });
  const flag = new THREE.MeshStandardMaterial({ map: stones("#56545c", 4, 4), roughness: 0.95 });
  const f = mesh(new THREE.PlaneGeometry(8, 8), flag, [0, 0, 0.5], g); f.rotation.x = -Math.PI / 2;
  box(0.25, 3.3, 3.6, stone, [-1.9, 1.65, -0.2], g); box(0.25, 3.3, 3.6, stone, [1.9, 1.65, -0.2], g);
  box(4.0, 0.2, 3.6, stone, [0, 3.3, -0.2], g);
  // back wall with a small barred window (moonlight)
  box(4.0, 2.05, 0.25, stone, [0, 1.025, -2.0], g); box(4.0, 0.6, 0.25, stone, [0, 3.0, -2.0], g);
  box(1.7, 0.65, 0.25, stone, [-1.15, 2.375, -2.0], g); box(1.7, 0.65, 0.25, stone, [1.15, 2.375, -2.0], g);
  const iron = mat("#2a2a30", 0.45, { metalness: 0.6 });
  for (let k = -2; k <= 2; k++) cyl(0.014, 0.65, iron, [k * 0.11, 2.375, -1.95], g, 8);
  const sky = mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ color: "#2a4a8a" }), [0, 2.5, -2.6], g); noink(sky);
  noink(mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: "#f4f0dc" }), [0.18, 2.55, -2.55], g));
  const dl = new THREE.DirectionalLight("#8fb2ff", 2.6); dl.position.set(0.6, 7.5, -9); dl.target.position.set(0, 0, 0.6); g.add(dl, dl.target);
  dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); dl.shadow.bias = -0.0004; lights.push(dl);
  const hemi = new THREE.HemisphereLight("#6a7cb4", "#2a221c", 1.05); g.add(hemi); lights.push(hemi);
  // moon shaft
  const dir = new THREE.Vector3(-0.6, -7.5, 9.6).normalize();
  const c0 = [[-0.3, 2.07, -1.9], [0.3, 2.07, -1.9], [0.3, 2.68, -1.9], [-0.3, 2.68, -1.9]].map((p) => new THREE.Vector3(...(p as V3)));
  const c1 = c0.map((p) => p.clone().addScaledVector(dir, p.y / 0.62));
  const pos: number[] = []; [...c0, ...c1].forEach((p) => pos.push(p.x, p.y, p.z));
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
  noink(mesh(sg, new THREE.MeshBasicMaterial({ color: "#7f9fff", transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [0, 0, 0], g));
  // bars wall at z = 1.5: fixed bars + a sliding door section
  for (let x = -1.8; x <= 1.81; x += 0.15) if (Math.abs(x) > 0.66) cyl(0.016, 3.1, iron, [x, 1.55, 1.5], g, 8);
  for (const y of [0.15, 2.0, 3.1]) { const r = cyl(0.02, 3.6, iron, [0, y, 1.5], g, 8); r.rotation.z = Math.PI / 2; }
  const door = new THREE.Group(); door.position.set(0, 0, 1.56); g.add(door);
  for (let k = 0; k < 9; k++) cyl(0.016, 2.0, iron, [-0.6 + k * 0.15, 1.05, 0], door, 8);
  for (const y of [0.1, 1.0, 2.0]) { const r = cyl(0.02, 1.25, iron, [0, y, 0], door, 8); r.rotation.z = Math.PI / 2; }
  box(0.14, 0.2, 0.08, iron, [0.55, 1.05, 0.03], door); mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), metalMat("#8a7a5a"), [0.55, 0.92, 0.07], door);
  // outside floor (camera side)
  const of = mesh(new THREE.PlaneGeometry(6, 3), flag, [0, 0.001, 3.0], g); of.rotation.x = -Math.PI / 2;
  // cot with straw mattress + blanket, bucket, tin cup, wall chain, tally marks
  const cot = new THREE.Group(); cot.position.set(-0.85, 0, -0.75); cot.rotation.y = 0.15; g.add(cot);
  const wood = mat("#4a3020", 0.8);
  box(0.75, 0.08, 1.9, wood, [0, 0.38, 0], cot); for (const [x, z] of [[-0.33, -0.88], [0.33, -0.88], [-0.33, 0.88], [0.33, 0.88]]) box(0.06, 0.38, 0.06, wood, [x, 0.19, z], cot);
  box(0.7, 0.1, 1.8, mat("#c8a860", 0.95), [0, 0.47, 0], cot, 0.04);
  box(0.72, 0.05, 0.9, mat("#5a5a62", 0.95), [0, 0.53, 0.4], cot, 0.02);
  for (let k = 0; k < 14; k++) { const s = cyl(0.003, 0.12, mat("#d8bc70", 0.9), [-0.3 + rnd() * 0.6, 0.53, -0.9 + rnd() * 1.8], cot, 4); s.rotation.set(rnd() * 3, rnd() * 3, 1.5); }
  lathe([[0, 0], [0.13, 0], [0.15, 0.3], [0, 0.3]], mat("#5a5048", 0.6, { metalness: 0.4 }), [1.2, 0, -1.3], g);
  lathe([[0, 0], [0.035, 0], [0.04, 0.08], [0, 0.08]], metalMat("#8a8a90"), [0.95, 0, -1.5], g);
  for (let k = 0; k < 7; k++) mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 14), metalMat("#5a5a60"), [-1.76, 1.6 - k * 0.06, -1.2], g).rotation.set(0, Math.PI / 2, k % 2 ? Math.PI / 2 : 0);
  const tally = mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshBasicMaterial({ map: tex(256, 150, (c) => { c.strokeStyle = "rgba(230,225,210,0.55)"; c.lineWidth = 5; for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(14 + i * 60 + j * 10, 20); c.lineTo(14 + i * 60 + j * 10, 120); c.stroke(); } c.beginPath(); c.moveTo(8 + i * 60, 110); c.lineTo(58 + i * 60, 30); c.stroke(); } }), transparent: true }), [1.765, 1.3, -0.6], g);
  tally.rotation.y = -Math.PI / 2;
  const cnd = candle(g, [0.15, 0, -0.25], 0.12);
  const pl = new THREE.PointLight("#ffa552", 6, 5, 1.4); pl.position.set(0.15, 0.32, -0.25); g.add(pl); lights.push(pl);
  return { g, lights, door, candle: cnd, candleLight: pl };
}

// ---------------- MORGUE (autopsy room) ----------------
function buildMorgue(origin: V3) {
  const g = new THREE.Group(); g.position.set(...origin);
  const lights: THREE.Light[] = [];
  const tileM = new THREE.MeshStandardMaterial({ map: tiles(), roughness: 0.4 });
  const stone = new THREE.MeshStandardMaterial({ map: stones("#7a7680", 8, 4), roughness: 0.95 });
  const f = mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: stones("#5e5c62", 5, 5), roughness: 0.8 }), [0, 0, 0], g); f.rotation.x = -Math.PI / 2;
  mesh(new THREE.CircleGeometry(0.12, 20), mat("#111", 0.6), [0.3, 0.004, 0.9], g).rotation.x = -Math.PI / 2;
  for (const [p, r] of [[[0, 0, -3], 0], [[-3, 0, 0], Math.PI / 2], [[3, 0, 0], -Math.PI / 2], [[0, 0, 3], Math.PI]] as [V3, number][]) {
    const w = new THREE.Group(); w.position.set(...p); w.rotation.y = r; g.add(w);
    box(6.2, 1.3, 0.12, tileM, [0, 0.65, 0], w); box(6.2, 2.4, 0.12, stone, [0, 2.5, 0], w);
  }
  box(6.2, 0.15, 6.2, stone, [0, 3.7, 0], g);
  // table with a sheet-covered body (no gore: just the shape under the sheet)
  const tb = new THREE.Group(); g.add(tb);
  const wood = mat("#4a3020", 0.75);
  box(2.1, 0.1, 0.85, mat("#8a8a8e", 0.5, { metalness: 0.3 }), [0, 0.86, 0], tb, 0.02);
  for (const [x, z] of [[-0.95, -0.35], [0.95, -0.35], [-0.95, 0.35], [0.95, 0.35]]) box(0.08, 0.85, 0.08, wood, [x, 0.42, z], tb);
  const sheet = mat("#cfcbc0", 0.95);
  box(1.75, 0.2, 0.5, sheet, [0.1, 1.0, 0], tb, 0.09);
  mesh(new THREE.SphereGeometry(0.15, 20, 14), sheet, [-0.86, 1.02, 0], tb).scale.set(1, 0.75, 1);
  for (const z of [-0.09, 0.09]) mesh(new THREE.SphereGeometry(0.07, 14, 10), sheet, [1.0, 1.1, z], tb);
  for (const s of [-1, 1]) curtain(tb, 1.9, 0.22, "#ece8de", [0.05, 0.86, 0.43 * s], 0, 9);
  // instrument tray, jars, bucket, apron hook
  const st = new THREE.Group(); st.position.set(1.4, 0, 0.9); g.add(st);
  box(0.6, 0.04, 0.4, mat("#7a7a80", 0.4, { metalness: 0.6 }), [0, 0.95, 0], st); box(0.04, 0.95, 0.04, wood, [0, 0.47, 0], st);
  for (let k = 0; k < 5; k++) { const ins = box(0.012, 0.006, 0.18, metalMat("#d8d8de"), [-0.2 + k * 0.1, 0.975, 0], st); ins.rotation.y = 0.15 * k; }
  const sh = new THREE.Group(); sh.position.set(-2.8, 1.6, -1.0); sh.rotation.y = Math.PI / 2; g.add(sh);
  box(1.6, 0.04, 0.3, wood, [0, 0, 0.1], sh); box(1.6, 0.04, 0.3, wood, [0, 0.5, 0.1], sh);
  for (let k = 0; k < 8; k++) lathe([[0, 0], [0.07, 0], [0.07, 0.22], [0.05, 0.25], [0, 0.25]], mat(["#c8d86a", "#d8b46a", "#a8c8a0"][k % 3], 0.1, { transparent: true, opacity: 0.7 }), [-0.7 + k * 0.2, k < 4 ? 0.02 : 0.52, 0.1], sh);
  lathe([[0, 0], [0.13, 0], [0.15, 0.28], [0, 0.28]], mat("#6a6a72", 0.4, { metalness: 0.6 }), [-0.9, 0, 1.2], g);
  // swinging hanging lamp over the table: the only warm light, strong cone + visible beam
  const lamp = new THREE.Group(); lamp.position.set(0, 3.65, 0); g.add(lamp);
  const arm = new THREE.Group(); lamp.add(arm);
  cyl(0.008, 1.3, metalMat("#5a4a2a"), [0, -0.65, 0], arm, 6);
  const shade2 = lathe([[0, 0], [0.04, 0], [0.3, -0.18], [0.32, -0.2], [0, -0.2]], mat("#2a3a2a", 0.5, { side: THREE.DoubleSide }), [0, -1.3, 0], arm); void shade2;
  const bulb = mesh(new THREE.SphereGeometry(0.06, 14, 10), glow("#ffc070", 8), [0, -1.44, 0], arm); bulb.castShadow = false;
  const sp = new THREE.SpotLight("#ffc27a", 34, 8, 0.7, 0.5, 1.3); sp.position.set(0, -1.45, 0); arm.add(sp);
  const tgt = new THREE.Object3D(); tgt.position.set(0, -3, 0); arm.add(tgt); sp.target = tgt;
  sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -0.0005; lights.push(sp);
  const beam = noink(mesh(new THREE.ConeGeometry(1.15, 2.1, 32, 1, true), new THREE.MeshBasicMaterial({ color: "#ffcf8a", transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [0, -2.5, 0], arm));
  void beam;
  const hemi = new THREE.HemisphereLight("#5a6aa0", "#241e1a", 0.95); g.add(hemi); lights.push(hemi);
  const rim = new THREE.DirectionalLight("#5a7acc", 0.8); rim.position.set(-3, 4, -4); g.add(rim); lights.push(rim);
  return { g, lights, arm };
}

// ---------------- STREET (hospital entrance, night, snow) ----------------
function buildStreet(origin: V3) {
  const g = new THREE.Group(); g.position.set(...origin);
  const lights: THREE.Light[] = [];
  const stucco = new THREE.MeshStandardMaterial({ map: stones("#c9b48a", 10, 3, "rgba(80,60,40,0.5)"), roughness: 0.9 });
  const gr = mesh(new THREE.PlaneGeometry(20, 14), new THREE.MeshStandardMaterial({ map: cobbles(), roughness: 0.7 }), [0, 0, 5], g); gr.rotation.x = -Math.PI / 2;
  // facade (z = 0) with a door opening at x = 0 (1.5 x 2.7 from y = 0.45)
  box(5.25, 9, 0.4, stucco, [-3.375, 4.5, -0.2], g); box(5.25, 9, 0.4, stucco, [3.375, 4.5, -0.2], g);
  box(1.5, 5.85, 0.4, stucco, [0, 6.075, -0.2], g); box(1.5, 0.45, 0.4, stucco, [0, 0.225, -0.2], g);
  const stoneM = mat("#9a9488", 0.85);
  for (const s of [-1, 1]) { box(0.3, 3.2, 0.5, stoneM, [0.92 * s, 1.95, 0.02], g); box(0.4, 0.2, 0.6, stoneM, [0.92 * s, 3.6, 0.02], g); }
  box(2.3, 0.35, 0.6, stoneM, [0, 3.85, 0.05], g);
  const ped = new THREE.Shape(); ped.moveTo(-1.3, 0); ped.lineTo(1.3, 0); ped.lineTo(0, 0.55); ped.closePath();
  mesh(new THREE.ExtrudeGeometry(ped, { depth: 0.5, bevelEnabled: false }), stoneM, [0, 4.02, -0.2], g);
  mesh(new THREE.PlaneGeometry(1.25, 0.32), new THREE.MeshStandardMaterial({ map: textTex(400, 100, "#2a1e16", [["CLINIC 1", 52, "#e8c878", 56]], "#c8a050"), roughness: 0.6 }), [0, 3.32, 0.04], g);
  mesh(new THREE.PlaneGeometry(4.6, 0.5), new THREE.MeshStandardMaterial({ map: textTex(920, 100, "#b8a27a", [["GENERAL HOSPITAL · VIENNA", 54, "#3a2a1a", 58]]), roughness: 0.8 }), [0, 5.1, 0.01], g);
  // door leaves (hinged at the jambs)
  const leaves: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group(); h.position.set(0.75 * s, 0.45, -0.1); g.add(h); leaves.push(h);
    const wood = mat("#4a2a1a", 0.6);
    box(0.74, 2.7, 0.07, wood, [-0.37 * s, 1.35, 0], h);
    for (const y of [0.7, 1.9]) box(0.5, 0.8, 0.02, mat("#3a2014", 0.6), [-0.37 * s, y, 0.045], h);
    mesh(new THREE.SphereGeometry(0.03, 12, 10), metalMat("#d4ae52"), [-0.66 * s, 1.35, 0.06], h);
  }
  // warm interior seen through the door
  box(1.5, 2.7, 0.1, mat("#1a120c", 1, { emissive: new THREE.Color("#ff9a4a"), emissiveIntensity: 0.25 }), [0, 1.8, -1.2], g);
  const inl = new THREE.PointLight("#ffa552", 9, 6, 1.4); inl.position.set(0, 1.8, -0.7); g.add(inl); lights.push(inl);
  // steps
  for (let i = 0; i < 3; i++) box(2.4, 0.15, 0.35 * (3 - i), stoneM, [0, 0.075 + i * 0.15, 0.35 * (3 - i) / 2], g);
  // windows (some lit)
  const winLit = mat("#2a1a0c", 1, { emissive: new THREE.Color("#ffb060"), emissiveIntensity: 1.6 }), winDark = mat("#141a2a", 0.3);
  for (const [x, y, lit] of [[-2.6, 2.2, 1], [-4.4, 2.2, 0], [2.6, 2.2, 0], [4.4, 2.2, 1], [-2.6, 5.9, 0], [-4.4, 5.9, 1], [0, 6.6, 1], [2.6, 5.9, 1], [4.4, 5.9, 0]] as const) {
    box(0.8, 1.4, 0.05, lit ? winLit : winDark, [x, y, 0.01], g);
    box(0.06, 1.4, 0.08, stoneM, [x, y, 0.04], g); box(0.8, 0.06, 0.08, stoneM, [x, y + 0.2, 0.04], g);
    box(1.0, 0.1, 0.2, stoneM, [x, y - 0.75, 0.08], g); box(1.0, 0.16, 0.12, stoneM, [x, y + 0.78, 0.05], g);
  }
  // gas street lamp + bench
  const iron = mat("#1e2024", 0.45, { metalness: 0.6 });
  const lp = new THREE.Group(); lp.position.set(1.85, 0, 2.05); g.add(lp);
  cyl(0.12, 0.3, iron, [0, 0.15, 0], lp, 16, 0.16); cyl(0.045, 2.9, iron, [0, 1.6, 0], lp, 12); cyl(0.07, 0.12, iron, [0, 3.0, 0], lp, 12);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; box(0.02, 0.42, 0.02, iron, [Math.cos(a) * 0.15, 3.3, Math.sin(a) * 0.15], lp); }
  mesh(new THREE.ConeGeometry(0.26, 0.2, 4), iron, [0, 3.6, 0], lp).rotation.y = Math.PI / 4;
  const gl = mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), mat("#fff1d0", 0.1, { emissive: new THREE.Color("#ffc46a"), emissiveIntensity: 2.2, transparent: true, opacity: 0.85 }), [0, 3.3, 0], lp); gl.castShadow = false;
  const sp = new THREE.SpotLight("#ffbf70", 65, 10, 0.95, 0.55, 1.4); sp.position.set(1.85, 3.25, 2.05); sp.target.position.set(1.6, 0, 2.2); g.add(sp, sp.target);
  sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -0.0005; lights.push(sp);
  noink(mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffb860", transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }), [1.85, 3.3, 2.05], g));
  const bench = new THREE.Group(); bench.position.set(1.15, 0, 1.75); bench.rotation.y = 0.5; g.add(bench);
  const bw = mat("#5a3a22", 0.75);
  for (let k = 0; k < 3; k++) box(1.3, 0.04, 0.1, bw, [0, 0.45, -0.12 + k * 0.12], bench);
  for (let k = 0; k < 2; k++) box(1.3, 0.1, 0.03, bw, [0, 0.66 + k * 0.14, -0.2], bench);
  for (const x of [-0.55, 0.55]) { box(0.05, 0.45, 0.4, iron, [x, 0.22, 0], bench); box(0.05, 0.4, 0.05, iron, [x, 0.68, -0.2], bench); }
  // moon light + sky + snow + snow patches
  const dl = new THREE.DirectionalLight("#8fb2ff", 1.2); dl.position.set(-6, 9, 8); dl.target.position.set(0, 0, 1); g.add(dl, dl.target);
  dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); dl.shadow.bias = -0.0004; lights.push(dl);
  const hemi = new THREE.HemisphereLight("#7084c0", "#2a221e", 1.1); g.add(hemi); lights.push(hemi);
  const sky = mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ color: "#0c1430" }), [0, 9, -1], g); noink(sky);
  for (let k = 0; k < 9; k++) { const p = mesh(new THREE.CircleGeometry(0.5 + rnd() * 0.8, 20), mat("#e8eef8", 0.9), [-4 + rnd() * 9, 0.006 + k * 0.0004, 1.2 + rnd() * 6], g); p.rotation.x = -Math.PI / 2; p.scale.set(1.6, 0.6, 1); }
  for (const s of [-1, 1]) box(2.4, 0.03, 0.3, mat("#eef2fa", 0.9), [0, 0.465, 0.15 + (s > 0 ? 0 : 0.6)], g).scale.set(1, 1, 0.6);
  const sp2: number[] = []; for (let i = 0; i < 900; i++) sp2.push(-5 + rnd() * 10, rnd() * 6, -0.2 + rnd() * 7);
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute("position", new THREE.Float32BufferAttribute(sp2, 3));
  const snow = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: "#ffffff", size: 0.03, transparent: true, opacity: 0.9, depthWrite: false }));
  g.add(noink(snow));
  return { g, lights, leaves, snow, snow0: sp2.slice() };
}

// ---------------- world ----------------
type CharName = "semmel" | "semmelAsy" | "klein" | "docA" | "docB" | "m1" | "m2" | "m3" | "m4" | "m5" | "midwife" | "walker";
export class World {
  root = new THREE.Group();
  ward: WardSet; ward2: WardSet; cell: ReturnType<typeof buildCell>; morgue: ReturnType<typeof buildMorgue>; street: ReturnType<typeof buildStreet>;
  sets: Record<SetName, { g: THREE.Group; lights: THREE.Light[] }>;
  ch: Record<CharName, Character>;
  drops: THREE.Mesh[] = []; foam: THREE.Group[] = []; babies: THREE.Group[] = []; bandage: THREE.Mesh; fill!: THREE.DirectionalLight;
  constructor() {
    seed = 7;
    this.ward = buildWard(WARD, false); this.ward2 = buildWard(WARD2, true);
    this.cell = buildCell(CELL); this.morgue = buildMorgue(MORGUE); this.street = buildStreet(STREET);
    this.sets = { ward: this.ward, ward2: this.ward2, cell: this.cell, morgue: this.morgue, street: this.street };
    for (const s of Object.values(this.sets)) this.root.add(s.g);
    const mk = (k: string) => { const c = new Character(LOOKS[k]); this.root.add(c.root); return c; };
    this.ch = {
      semmel: mk("semmel"), semmelAsy: mk("semmelAsy"), klein: mk("klein"), docA: mk("docA"), docB: mk("docB"),
      m1: mk("mother"), m2: mk("mother2"), m3: mk("mother"), m4: mk("mother2"), m5: mk("mother"), midwife: mk("midwife"), walker: mk("walker"),
    };
    // water drops for the hook (fall from Semmelweis's raised hands)
    for (let i = 0; i < 14; i++) { const d = mesh(new THREE.SphereGeometry(0.012, 10, 8), mat("#bfe6ff", 0.05, { transparent: true, opacity: 0.85, emissive: new THREE.Color("#4a7aa0"), emissiveIntensity: 0.4 })); d.castShadow = false; d.scale.set(1, 1.6, 1); this.root.add(d); this.drops.push(d); }
    // soap foam on the scrubbing doctors' hands
    for (const n of ["docA", "docB"] as const) for (let i = 0; i < 2; i++) {
      const fg = new THREE.Group(); this.ch[n].arms[i].end.add(fg); this.foam.push(fg);
      for (let k = 0; k < 7; k++) { const b = mesh(new THREE.SphereGeometry(0.018 + 0.01 * (k % 3), 12, 10), mat("#ffffff", 0.3, { transparent: true, opacity: 0.92 }), [0.04 * Math.cos(k * 2.3), 0.03 * Math.sin(k * 1.7), 0.04 * Math.sin(k * 2.3)]); b.castShadow = false; fg.add(b); }
    }
    // swaddled babies (clinic 2 mothers + midwife)
    for (const n of ["m1", "m2", "m3", "midwife"] as const) {
      const bb = new THREE.Group(); this.ch[n].props.add(bb); this.babies.push(bb);
      mesh(new THREE.SphereGeometry(1, 20, 14), mat("#f4efe2", 0.9), [-0.08, 0, 0.05], bb).scale.set(0.13, 0.075, 0.075);
      mesh(new THREE.SphereGeometry(0.055, 18, 14), mat("#f7e6d6", 0.6), [0.07, 0.02, 0.05], bb);
      mesh(new THREE.SphereGeometry(1, 16, 10), mat("#cfe0f2", 0.9), [-0.12, 0.0, 0.05], bb).scale.set(0.06, 0.078, 0.078);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.006, 8, 6), mat("#111", 0.4), [0.105, 0.03, 0.05 + 0.018 * s], bb);
    }
    this.bandage = mesh(new THREE.SphereGeometry(0.048, 16, 12), mat("#e8e2d2", 0.9), [0, 0, 0], this.ch.semmelAsy.arms[0].end);
    this.bandage.scale.set(1, 0.85, 1.2);
    this.fill = new THREE.DirectionalLight("#ffe6cc", 0.9); this.root.add(this.fill, this.fill.target);
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera) {
    const shot = SHOTS[id - 1], t = f / FPS;
    for (const [n, s] of Object.entries(this.sets)) {
      const on = n === shot.set; s.g.visible = on;
      s.lights.forEach((l) => { l.visible = on; });
    }
    for (const c of Object.values(this.ch)) c.pose({ x: 0, z: 0, yaw: 0, hidden: true }, t);
    this.drops.forEach((d) => (d.visible = false));
    this.foam.forEach((fm) => (fm.visible = false));
    this.babies.forEach((b) => (b.visible = false));
    this.bandage.visible = false;
    const W = this.ward, W2s = this.ward2;
    // ambient life in the sets
    W.candles.forEach((c, i) => setCandle(c, t + i, id === 4 && i === 2 ? T_DIED : -1));
    W2s.candles.forEach((c, i) => { setCandle(c, t + i); c.flame.visible = c.halo.visible = false; });
    W.clock.mp.rotation.z = -t * 0.6; W.clock.hp.rotation.z = -t * 0.05 - 1.3;
    W.dust.rotation.y = Math.sin(t * 0.2) * 0.03; W.dust.position.y = Math.sin(t * 0.5) * 0.03;
    W2s.dust.position.y = Math.sin(t * 0.5) * 0.03;
    this.morgue.arm.rotation.z = 0.16 * Math.sin(t * 1.9); this.morgue.arm.rotation.x = 0.07 * Math.sin(t * 1.3 + 1);
    setCandle(this.cell.candle, t, id === 16 ? 31.65 : -1);
    this.cell.candleLight.visible = shot.set === "cell" && !(id === 16 && t > 31.65);
    this.cell.candleLight.intensity = 6 * (1 + 0.1 * Math.sin(t * 23));
    {
      const pa = this.street.snow.geometry.attributes.position as THREE.BufferAttribute, s0 = this.street.snow0;
      for (let i = 0; i < pa.count; i++) { let y = s0[i * 3 + 1] - ((t * 0.55 + (i % 7) * 0.13) % 6); if (y < 0) y += 6; pa.setXYZ(i, s0[i * 3] + 0.12 * Math.sin(t * 1.3 + i), y, s0[i * 3 + 2]); }
      pa.needsUpdate = true;
    }
    W.board!.draw(id === 12 ? (t >= 22.6 ? (t >= 23.0 ? 2 : 1) : 0) : id > 12 ? 2 : 0);
    // bars door: open (slid right) until "locked", then shut; shut in the callback
    this.cell.door.position.x = id === 2 ? lerp(1.3, 0, clamp01(((t - T_LOCKED) + 0.2) / 0.2) ** 2) : 0;
    // street doors: open while she leaves / he is pushed, slam on "out"
    const doorOpen = id === 6 ? 1 : id === 15 ? 1 - clamp01((f - 832) / 4) : 0;
    this.street.leaves.forEach((h, i) => (h.rotation.y = (i ? -1 : 1) * 1.45 * doorOpen));

    const P = (n: CharName, p: Pose) => this.ch[n].pose(p, t);
    const wp = (o: V3, x: number, z: number) => ({ x: o[0] + x, z: o[2] + z });
    const talk = (k = 1) => 0.35 + 0.5 * k * Math.abs(Math.sin(t * 13)) * Math.abs(Math.sin(t * 7.3));
    // mothers in beds (sitting up, legs under the blanket): beds face the aisle
    const mothers = (o: V3, beds: Bed[], mood: "worried" | "happy", extra: (i: number) => Partial<Pose> = () => ({})) => {
      const names: CharName[] = ["m1", "m2", "m3", "m4", "m5"];
      beds.forEach((b, i) => {
        const x = b.x + b.side * 0.72;
        const base: Pose = { ...wp(o, x, b.z), y: 0, yaw: b.side > 0 ? -Math.PI / 2 : Math.PI / 2, seat: 0.66, noLegs: true, lean: -0.12,
          brows: mood === "happy" ? "raised" : i % 2 ? "worry" : "sad", mouth: mood === "happy" ? (i % 2 ? "grin" : "smile") : "frown",
          armL: [0.2, -0.12, 0.2], armR: [0.2, -0.12, 0.2], headYaw: 0.25 * Math.sin(t * 0.7 + i), headRoll: 0.05 * Math.sin(t + i) };
        P(names[i], { ...base, ...extra(i) });
      });
    };

    switch (id) {
      case 1: {
        // hook: Semmelweis holds up dripping hands over the basin, telling them; colleagues laugh at him
        const k = smooth(f / 10);
        P("semmel", { ...wp(WARD, 0, 1.5), yaw: 0, armL: [0.42, lerp(0.4, 0.78, k) + 0.03 * Math.sin(t * 9), 0.14], armR: [0.42, lerp(0.4, 0.78, k) + 0.03 * Math.sin(t * 9 + 1), 0.14],
          brows: f < 40 ? "raised" : "worry", mouth: "open", mouthOpen: talk(), headYaw: f < 44 ? 0 : -0.3 * smooth((f - 44) / 10), headRoll: 0.04 * Math.sin(t * 3), eyes: f < 44 ? [0, 0] : [-0.6, 0] });
        const lau = Math.abs(Math.sin(t * 9));
        P("docA", { ...wp(WARD, -0.95, 0.35), yaw: 0.55, lean: -0.12 - 0.08 * lau, armL: [0.2, -0.05, 0.22], armR: "hips", brows: "raised", mouth: "grin", eyes: [0.5, 0], blink: 0.6 + 0.4 * lau, squash: 1 + 0.02 * lau });
        P("docB", { ...wp(WARD, 1.0, 0.15), yaw: -0.65, armR: "point", armL: [0.15, -0.08, 0.24], brows: "smug", mouth: "grin", lean: -0.06 - 0.05 * lau, headRoll: 0.1 * Math.sin(t * 9) });
        P("klein", { ...wp(WARD, 0.4, -2.2), yaw: -0.1, walk: t * 0.9, armL: "hang", armR: "hang", brows: "smug", mouth: "flat" });
        // drops falling from the hands
        this.drops.forEach((d, i) => {
          const per = 0.55, ph = ((t + i * 0.137) % per) / per, hand = this.ch.semmel.arms[i % 2].end;
          const hp = new THREE.Vector3(); hand.getWorldPosition(hp);
          d.visible = true; d.position.set(hp.x + 0.02 * Math.sin(i * 3.1), hp.y - 0.03 - 0.6 * ph * ph, hp.z + 0.02 * Math.cos(i * 2.3));
        });
        mothers(WARD, W.beds, "worried");
        break;
      }
      case 2: case 16: {
        const C = CELL;
        if (id === 2) {
          const u = smooth((f - 82) / 12);
          const grab = f >= 96;
          P("semmelAsy", { ...wp(C, 0.05, lerp(0.35, 1.22, u)), yaw: 0, walk: f < 96 ? t * 2.2 : 0, stride: f < 96 ? 1 : 0, lean: f < 96 ? 0.12 : 0.04,
            armL: grab ? [0.17, 0.48 + 0.01 * Math.sin(t * 20), 0.26] : "front", armR: grab ? [0.17, 0.48 + 0.01 * Math.sin(t * 20 + 2), 0.26] : "front",
            brows: "worry", mouth: grab ? "open" : "o", mouthOpen: talk(1.2), headYaw: grab ? 0.25 * Math.sin(t * 6) : 0, eyeScale: 1.1 });
        } else {
          const inf = clamp01((t - T_INFECT + 0.2) / 0.5);
          P("semmelAsy", { ...wp(C, -0.62, -0.62), yaw: 0.45, seat: 0.47, lean: 0.16, headPitch: 0.25 - 0.1 * smooth((t - 29.0) / 1.0), headYaw: -0.1,
            armL: [0.1, 0.08, 0.3], armR: [0.22, -0.3, 0.22], brows: "sad", mouth: "frown", blink: t > 31.7 ? 1 : 0, germs: 0 });
          this.bandage.visible = true;
          // germs glow on the bandaged hand on "infected"
          const g0 = this.ch.semmelAsy.germs[0]; g0.visible = inf > 0.01; g0.scale.setScalar(Math.max(0.001, inf) * (1 + 0.15 * Math.sin(t * 9)));
        }
        break;
      }
      case 3: {
        mothers(WARD, W.beds, "worried");
        P("klein", { ...wp(WARD, 0.2, lerp(-1.0, -3.4, (f - 135) / 48)), yaw: Math.PI, walk: t * 1.1, brows: "smug", mouth: "flat" });
        P("docA", { ...wp(WARD, -0.4, lerp(-5.8, -4.2, (f - 135) / 48)), yaw: 0, walk: t * 1.1, germs: 0.8 });
        break;
      }
      case 4: {
        mothers(WARD, W.beds, "worried", (i) => (i === 2 && t > T_DIED ? { headYaw: 0.6, brows: "sad", mouth: "o", eyes: [0.8, 0] } : i === 1 && t > T_DIED ? { headYaw: -0.5, eyes: [-0.8, 0], mouth: "o" } : {}));
        P("klein", { ...wp(WARD, 0.3, lerp(-4.6, -7.2, (f - 183) / 93)), yaw: Math.PI, walk: t * 1.0, brows: "smug" });
        break;
      }
      case 5: {
        // clinic 2: midwife walks with a baby, mothers hold babies, cheer on "safer"
        const ch = t > T_SAFER - 0.1;
        mothers(WARD2, W2s.beds.slice(0, 3), "happy", (i) => ({ armL: [0.1, -0.05, 0.3], armR: ch && i === 1 ? "wave" : [0.15, -0.02, 0.32], brows: ch ? "raised" : "calm", mouth: ch ? "grin" : "smile", headRoll: 0.08 * Math.sin(t * 4 + i) }));
        [0, 1, 2].forEach((i) => (this.babies[i].visible = true));
        this.babies[3].visible = true;
        P("midwife", { ...wp(WARD2, -0.1, lerp(-3.2, -2.2, smooth((f - 276) / 60))), yaw: 0.1, walk: f < 336 ? t * 0.9 : 0, armL: [0.12, -0.04, 0.32], armR: [0.14, -0.02, 0.34], brows: "raised", mouth: "smile", headYaw: 0.2 * Math.sin(t * 1.5) });
        break;
      }
      case 6: case 7: {
        const S = STREET;
        if (f < 382) P("walker", { ...wp(S, 0.05, -0.05), y: 0.45, yaw: Math.PI * 0.08, armL: [0.1, 0.18, 0.26], armR: [0.12, 0.05, 0.28], headYaw: 0.45 * Math.sin(t * 9), brows: "worry", mouth: "frown", lean: -0.08 });
        else {
          const u = smooth((f - 382) / 30), x = lerp(0.05, 1.15, u), z = lerp(0.1, 1.85, u);
          const sit = f > 410;
          P("walker", { ...wp(S, x, z), y: sit ? 0 : Math.max(0, 0.45 - 0.43 * Math.max(0, z) / 1.05), yaw: 0.5, walk: sit ? 0 : t * 1.6,
            seat: sit ? 0.47 : undefined, armL: [0.12, -0.12, 0.28], armR: [0.12, -0.1, 0.28], brows: "sad", mouth: "frown", headPitch: sit ? -0.15 : 0, headYaw: sit ? 0.15 * Math.sin(t) : 0 });
        }
        break;
      }
      case 8: {
        P("semmel", { ...wp(WARD, -0.6, -6.2), yaw: 0, armR: "chin", armL: "fold", brows: "angry", mouth: "flat", eyeScale: lerp(1, 0.82, smooth((f - 440) / 20)), eyes: [lerp(0, -0.9, smooth((f - 445) / 12)), 0], headYaw: lerp(0, -0.18, smooth((f - 445) / 15)), headRoll: 0.04 });
        P("docA", { ...wp(WARD, 0.9, lerp(-8.6, -7.4, (f - 430) / 44)), yaw: 0, walk: t * 1.0, germs: 1 });
        mothers(WARD, W.beds, "worried");
        break;
      }
      case 9: {
        const M = MORGUE;
        const wipe = f > 515;
        P("docA", { ...wp(M, 0.15, 0.72), yaw: Math.PI, armL: wipe ? [0.1 + 0.05 * Math.sin(t * 14), -0.12, 0.2] : [0.12, 0.25, 0.42], armR: wipe ? [0.1 + 0.05 * Math.sin(t * 14 + 2), -0.12, 0.2] : [0.15, 0.22, 0.44], brows: "calm", mouth: "smile", germs: 1, headPitch: 0.2 });
        P("docB", { ...wp(M, 0.25, -0.72), yaw: 0, armL: [0.14, 0.22, 0.42], armR: [0.2, 0.24, 0.44], brows: "raised", mouth: "flat", germs: 1, headPitch: 0.25, eyes: [0, -0.6] });
        P("klein", { ...wp(M, -1.45, 0.05), yaw: Math.PI / 2, armL: "hips", armR: "point", brows: "smug", mouth: "open", mouthOpen: talk(0.8), germs: 1 });
        break;
      }
      case 10: {
        const p = docAPath(f), arrive = f > 586;
        P("docA", { x: p[0], z: p[2], yaw: arrive ? Math.PI / 2 - 0.2 : 0.06, walk: arrive ? 0 : t * 1.25, armL: arrive ? [0.25, 0.0, 0.4] : f > 562 ? [0.24, 0.02, 0.36] : "hang", armR: arrive ? [0.3, 0.02, 0.44] : f > 562 ? [0.26, 0.04, 0.38] : "hang", brows: "calm", mouth: "smile", germs: 1 });
        mothers(WARD, W.beds, "worried", (i) => (i === 1 ? { headYaw: -0.35, eyes: [-0.7, 0], mouth: "o", brows: "worry" } : {}));
        break;
      }
      case 11: {
        const gone = 1 - clamp01((t - T_CHLOR) / 0.6);
        P("semmel", { ...wp(WARD, -0.85, 1.5), yaw: 0.5, armL: "hips", armR: f < 640 ? "point" : [0.3, 0.3, 0.35], brows: "angry", mouth: "open", mouthOpen: talk(), headYaw: 0.2 });
        P("docA", { ...wp(WARD, -0.3, 1.55), yaw: 0, armL: "scrub", armR: "scrub", brows: "sad", mouth: "frown", lean: 0.12, headPitch: 0.2, germs: gone });
        P("docB", { ...wp(WARD, 0.35, 1.55), yaw: 0, armL: "scrub", armR: "scrub", brows: "worry", mouth: "o", lean: 0.12, headPitch: 0.2, germs: gone });
        this.foam.forEach((fm) => { fm.visible = true; fm.scale.setScalar(0.6 + 0.4 * clamp01((f - 612) / 12)); });
        break;
      }
      case 12: {
        mothers(WARD, W.beds, t > 23.1 ? "happy" : "worried", (i) => (t > 23.3 && i === 2 ? { armR: "wave" } : {}));
        break;
      }
      case 13: {
        const L = (s: number) => ({ armL: "fold" as const, armR: "fold" as const, brows: "angry" as const, mouth: "frown" as const, lean: -0.05 + 0.02 * Math.sin(t * 2 + s) });
        P("klein", { ...wp(WARD, 0, -1.65), yaw: 0, ...L(0), headPitch: -0.18 });
        P("docA", { ...wp(WARD, -0.72, -1.95), yaw: 0.2, ...L(1), headYaw: 0.3 });
        P("docB", { ...wp(WARD, 0.72, -1.95), yaw: -0.2, ...L(2), headYaw: -0.3, brows: "smug" });
        break;
      }
      case 14: {
        const up = smooth((f - 772) / 10);
        P("klein", { ...wp(WARD, 0, -1.6), yaw: 0, headPitch: -0.22 * up, brows: "smug", mouth: t > T_CLEAN ? "smile" : "open", mouthOpen: talk(0.7), armL: [0.28, lerp(-0.3, 0.32, up), lerp(0.05, 0.3, up)], armR: [0.28, lerp(-0.3, 0.32, up), lerp(0.05, 0.3, up)], germs: 1, eyes: [0, -0.4] });
        P("docA", { ...wp(WARD, -0.9, -2.4), yaw: 0.3, armL: "fold", armR: "fold", brows: "smug", mouth: "smile" });
        break;
      }
      case 15: {
        const p = pushedPath(f), fall = f > 826;
        P("semmel", { x: p[0], y: p[1], z: p[2], yaw: 0.15, walk: f < 834 ? t * 2.6 : 0, stride: f < 834 ? 1 : 0, lean: fall ? 0.35 : 0.2, armL: "out", armR: "out", brows: "worry", mouth: "o", headPitch: -0.1 });
        break;
      }
    }
    // camera
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    this.fill.position.set(c.pos[0] + 0.6, c.pos[1] + 1.2, c.pos[2]); this.fill.target.position.set(...c.look); this.fill.intensity = shot.grade === "day" ? 0.4 : 1.0;
    cam.fov = c.fov; cam.near = 0.05; cam.far = 80; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    return new THREE.Vector3(...c.look);
  }
}
void glide; void T_HUNDRED; void BODY_Y; void taper; void shade; type _ = RV3;
