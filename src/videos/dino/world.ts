// Video 4 world (DINO TIME-TRAVELS #1): Lyme Regis cliff beach, fossils, the society facade, the museum hall.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { rep, ctex, rng, grassHD, cloudHD, planksHD, beam, roofHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, CLIFF_Z, SKULL, STALL, PLES, SOC, MUS, SHORE, SEA_Z, skullOut, SLAM_T } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);
const discTex = () => ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128, a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const tartan = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(80,20,10,0.10)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2 + r() * 3); }
});
const lanes = () => ctex("lanes", 1024, 128, (g) => { g.fillStyle = "#c8553a"; g.fillRect(0, 0, 1024, 128); g.fillStyle = "#f4f1ea"; for (let k = 0; k <= 8; k++) g.fillRect(0, k * 15.5, 1024, 3); });
const barTex = () => ctex("barStripes", 512, 32, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#f4f1ea" : "#e43b3b"; g.fillRect(k * 64, 0, 64, 32); } });
const matTop = () => ctex("matTop", 512, 512, (g) => { g.fillStyle = "#2f63c8"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "#1d3f8a"; g.lineWidth = 6; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(k * 128, 0); g.lineTo(k * 128, 512); g.stroke(); } g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(0, 0, 512, 60); });
const seats = () => ctex("seats", 512, 128, (g) => { g.fillStyle = "#b9c0c9"; g.fillRect(0, 0, 512, 128); for (let x = 0; x < 512; x += 32) { g.fillStyle = ["#2f7fd0", "#e43b3b", "#f6d23c"][(x / 32) % 3]; g.fillRect(x + 4, 20, 24, 40); } g.fillStyle = "rgba(40,40,50,0.35)"; g.fillRect(0, 120, 512, 8); });
const board = (txt: string) => ctex("board_" + txt, 512, 320, (g) => {
  g.fillStyle = "#14181f"; g.fillRect(0, 0, 512, 320); g.strokeStyle = "#f6d23c"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 308);
  g.fillStyle = "#ffd84a"; g.font = "bold 54px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("HIGH JUMP", 256, 80);
  g.fillStyle = "#ffffff"; g.font = "bold 130px Arial Black, Arial"; g.fillText(txt, 256, 210);
});
const flagTex = (k: number) => ctex("flag" + k, 240, 160, (g) => {
  const c = [["#e43b3b", "#f4f1ea", "#2f7fd0"], ["#29a35a", "#f6d23c", "#29a35a"], ["#f6d23c", "#2f7fd0", "#f6d23c"], ["#e8622c", "#f4f1ea", "#29a35a"], ["#7b5ac9", "#f4f1ea", "#7b5ac9"]][k % 5];
  for (let i = 0; i < 3; i++) { g.fillStyle = c[i]; if (k % 2) g.fillRect(i * 80, 0, 80, 160); else g.fillRect(0, i * 53.4, 240, 54); }
});
const smokeTex = () => ctex("smoke", 256, 256, (g) => { for (const [x, y, rr, c] of [[90, 150, 60, "#cfd0d6"], [150, 120, 70, "#e1e2e8"]] as const) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rr, rr * 0.85, 0, 0, 7); g.fill(); } });

const cliffT = () => ctex("cliffT", 1024, 1024, (g, r) => {
  const cols = ["#b3a690", "#c9bda4", "#9a9284", "#d6c9ab", "#a89d8a", "#8f9aa6"];
  let y = 0; let k = 0;
  while (y < 1024) { const h = 20 + r() * 60; g.fillStyle = cols[k % 5]; g.fillRect(0, y, 1024, h); g.fillStyle = "rgba(30,35,50,0.35)"; g.fillRect(0, y + h - 4, 1024, 4); y += h; k++; }
  for (let i = 0; i < 260; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(20,25,40,0.12)"; g.fillRect(r() * 1024, r() * 1024, 10 + r() * 60, 3 + r() * 6); }
  for (let i = 0; i < 18; i++) { g.strokeStyle = "rgba(30,35,50,0.45)"; g.lineWidth = 3; g.beginPath(); let x = r() * 1024, yy = r() * 1024; g.moveTo(x, yy); for (let s = 0; s < 5; s++) { x += (r() - 0.5) * 40; yy += 20 + r() * 30; g.lineTo(x, yy); } g.stroke(); }
});
const pebbleT = () => ctex("pebbleT", 1024, 1024, (g, r) => {
  g.fillStyle = "#cdbb98"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { const x = r() * 1024, y = r() * 1024, s = 3 + r() * 9; g.fillStyle = ["#9aa3ad", "#b8aa8c", "#e2d6bc", "#8a8f99", "#c9c2b4"][i % 5]; g.beginPath(); g.ellipse(x, y, s, s * 0.7, r() * 3, 0, 7); g.fill(); }
});
const seaT = () => ctex("seaHD", 512, 512, (g, r) => {
  g.fillStyle = "#3f8fd6"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i++) { const x = r() * 512, y = r() * 512, w = 30 + r() * 60; g.strokeStyle = r() > 0.4 ? "rgba(255,255,255,0.55)" : "rgba(30,80,150,0.5)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 8, x + w, y); g.stroke(); }
});
const signT = (key: string, txt: string, bg: string, fg: string, w = 1024, h = 180, size = 84) => ctex(key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg; g.font = `bold ${size}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2 + 4);
});
const portraitT = () => ctex("maryPortrait", 512, 640, (g) => {
  g.fillStyle = "#c9a86a"; g.fillRect(0, 0, 512, 640); g.fillStyle = "#2f4a3a"; g.fillRect(36, 36, 440, 568);
  g.fillStyle = "#4a3a62"; g.beginPath(); g.ellipse(256, 560, 170, 150, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#f5c9a0"; g.beginPath(); g.ellipse(256, 300, 95, 110, 0, 0, 7); g.fill();
  g.fillStyle = "#7a5240"; g.beginPath(); g.ellipse(256, 250, 125, 95, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#241726"; g.beginPath(); g.arc(222, 300, 9, 0, 7); g.arc(290, 300, 9, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 6; g.beginPath(); g.arc(256, 335, 30, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = "#f3eee0"; g.font = "bold 38px Georgia, serif"; g.textAlign = "center"; g.fillText("MARY ANNING", 256, 615);
});

type Mats = Record<string, THREE.Material>;
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
/** plesiosaur skeleton lying along +x from its tiny head: vertebrae, ribs, 4 flippers */
const plesio = (M: Mats) => {
  const g = new THREE.Group();
  const spine: [number, number][] = [];
  for (let k = 0; k <= 40; k++) { const u = k / 40; spine.push([u * 6.6, 0.12 + 0.06 * Math.sin(u * 7) + (u > 0.55 ? 0.12 * Math.sin((u - 0.55) * 5) : 0)]); }
  spine.forEach(([x, y], k) => { const r = k < 18 ? 0.07 : k < 30 ? 0.11 : 0.07 * (1 - (k - 30) / 14); g.add(mesh(new THREE.SphereGeometry(Math.max(0.03, r), 10, 8), M.bone, x, y, 0)); });
  g.add(mesh(new THREE.SphereGeometry(0.14, 14, 10).scale(1.4, 0.8, 0.9), M.bone, -0.15, 0.13, 0));
  for (let k = 19; k < 30; k++) { const [x, y] = spine[k]; for (const s of [-1, 1]) { const rb = mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 12, Math.PI * 0.8), M.bone, x, y, 0); rb.rotation.set(Math.PI / 2, 0, s > 0 ? -0.2 : Math.PI + 0.2); g.add(rb); } }
  for (const [x, s] of [[3.9, -1], [3.9, 1], [5.2, -1], [5.2, 1]] as const) { const fl = mesh(new THREE.SphereGeometry(0.5, 12, 8).scale(1, 0.12, 0.35), M.bone, x, 0.08, s * 0.55); fl.rotation.y = s * 0.5; g.add(fl); }
  return g;
};
/** ichthyosaur skull: long snout, big sclerotic eye ring */
const ichSkull = (M: Mats) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.45, 16, 12).scale(1.2, 0.8, 0.8), M.bone));
  const sn = mesh(new THREE.ConeGeometry(0.22, 1.6, 14), M.bone, -1.15, -0.05, 0); sn.rotation.z = Math.PI / 2; g.add(sn);
  const ring = mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16), M.boneD, 0.05, 0.08, -0.36); g.add(ring);
  g.add(mesh(new THREE.CircleGeometry(0.16, 16), M.dark, 0.05, 0.08, -0.37));
  for (let k = 0; k < 8; k++) g.add(mesh(new THREE.ConeGeometry(0.02, 0.07, 5), M.white, -0.5 - k * 0.12, -0.17, -0.12));
  return g;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private skull!: THREE.Group; private door!: THREE.Group; private sea!: THREE.Mesh; private menSign!: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root, M: Mats = {};
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 600 + (i % 3) * 60, w = 140 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 100 + (i % 4) * 36, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    M.pebble = lam("pebbleT", () => ({ map: pebbleT() })); M.cliff = lam("cliffT", () => ({ map: cliffT() }));
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.bone = lam("bone", () => ({ color: "#efe1bf" })); M.boneD = lam("boneD", () => ({ color: "#c9b48a" })); M.dark = lam("darkC", () => ({ color: "#2a2430" })); M.white = lam("whiteW", () => ({ color: "#f4f1ea" }));
    M.wood = lam("wood", () => ({ map: beam() })); M.planks = lam("planksT", () => ({ map: planksHD() }));
    M.stone = lam("stoneW", () => ({ color: "#e6dccb" })); M.stoneD = lam("stoneD", () => ({ color: "#cfc3ad" })); M.door = lam("doorG", () => ({ color: "#2f5a3a" }));
    M.marble = lam("marble", () => ({ color: "#efe9dd" })); M.wall = lam("wallM", () => ({ color: "#e8d9b8" })); M.glass = lam("glass", () => ({ color: "#9cc8e8" }));
    M.ammo = lam("ammo", () => ({ color: "#b8a27a" })); M.cloth = lam("cloth", () => ({ color: "#d23b3b" }));
    M.roofR = lam("roofR", () => ({ map: roofHD("#8a3a2a") })); M.brick = lam("brickW", () => ({ color: "#b8553a" }));

    const b = new Batch();
    const ground = new THREE.PlaneGeometry(1800, 1800); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 260, uv.getY(i) * 260);
    b.add(ground, M.pebble);
    // the cliff: a long layered wall at z = CLIFF_Z with a ragged top, grass on top, fallen boulders at the foot
    const r = rng(9);
    for (let k = 0; k < 16; k++) {
      const x0 = -40 + k * 5, h = 10 + r() * 4;
      b.add(boxGeo(V(x0, 0, CLIFF_Z + r() * 0.6), V(x0 + 5.2, h, CLIFF_Z + 6), 4), M.cliff);
      b.add(boxGeo(V(x0, h, CLIFF_Z + 0.3), V(x0 + 5.2, h + 0.4, CLIFF_Z + 6)), M.grass);
    }
    for (let i = 0; i < 26; i++) { const x = -20 + r() * 40, z = CLIFF_Z - 0.4 - r() * 2.6; if (Math.abs(x - SKULL[0]) < 2.2) continue; const s = 0.15 + r() * 0.5; b.add(new THREE.DodecahedronGeometry(s, 0), M.cliff, at(x, s * 0.6, z)); }
    // fossil stall: table, cloth, ammonites, sign post
    b.add(boxGeo(V(STALL[0] - 1.1, 0.75, STALL[2] - 0.45), V(STALL[0] + 1.1, 0.8, STALL[2] + 0.45)), M.planks);
    b.add(boxGeo(V(STALL[0] - 1.12, 0.55, STALL[2] - 0.47), V(STALL[0] + 1.12, 0.8, STALL[2] - 0.45)), M.cloth);
    for (const [dx, dz] of [[-1.0, -0.4], [1.0, -0.4], [-1.0, 0.4], [1.0, 0.4]]) b.add(boxGeo(V(STALL[0] + dx - 0.04, 0, STALL[2] + dz - 0.04), V(STALL[0] + dx + 0.04, 0.75, STALL[2] + dz + 0.04)), M.wood);
    for (let k = 0; k < 6; k++) b.add(new THREE.TorusGeometry(0.09, 0.04, 8, 16).rotateX(Math.PI / 2 - 0.5), M.ammo, at(STALL[0] - 0.8 + k * 0.32, 0.86, STALL[2] - 0.1 + (k % 2) * 0.15));
    b.add(boxGeo(V(STALL[0] - 1.6, 0, STALL[2] - 0.6), V(STALL[0] - 1.52, 1.9, STALL[2] - 0.52)), M.wood);
    // Geological Society facade: steps, 4 columns, pediment, balcony
    const S = SOC;
    b.add(boxGeo(V(S[0] - 6, 0, S[2]), V(S[0] + 6, 7.5, S[2] + 6)), M.stone);
    for (let k = 0; k < 3; k++) b.add(boxGeo(V(S[0] - 4 + k * 0.3, 0, S[2] - 1.4 + k * 0.4), V(S[0] + 4 - k * 0.3, 0.18 * (k + 1), S[2])), M.stoneD);
    for (const x of [-3.2, -1.6, 1.6, 3.2]) b.add(new THREE.CylinderGeometry(0.28, 0.32, 5.4, 14), M.stone, at(S[0] + x, 0.54 + 2.7, S[2] - 0.6));
    b.add(boxGeo(V(S[0] - 4.2, 5.94, S[2] - 1.0), V(S[0] + 4.2, 6.4, S[2])), M.stoneD);
    { const pd = new THREE.BufferGeometry(); pd.setAttribute("position", new THREE.Float32BufferAttribute([-4.3, 0, 0, 4.3, 0, 0, 0, 1.4, 0], 3)); pd.computeVertexNormals(); b.add(pd, M.stoneD, at(S[0], 6.4, S[2] - 1.0)); }
    b.add(boxGeo(V(S[0] - 1.6, 2.95, S[2] - 0.9), V(S[0] + 1.6, 3.1, S[2])), M.stoneD);
    for (let k = 0; k < 9; k++) b.add(boxGeo(V(S[0] - 1.5 + k * 0.37, 3.1, S[2] - 0.88), V(S[0] - 1.46 + k * 0.37, 3.6, S[2] - 0.84)), M.stoneD);
    b.add(boxGeo(V(S[0] - 0.75, 0.54, S[2] - 0.02), V(S[0] + 0.75, 2.75, S[2] + 0.05)), M.dark);
    // museum hall: floor, walls, arched windows, plinth
    const H = MUS;
    b.add(boxGeo(V(H[0] - 8, 0, H[2] - 9), V(H[0] + 8, 0.02, H[2] + 6)), M.marble);
    b.add(boxGeo(V(H[0] - 8, 0, H[2] + 6), V(H[0] + 8, 8, H[2] + 6.4)), M.wall);
    for (const s of [-1, 1]) b.add(boxGeo(V(H[0] + s * 8 - 0.2, 0, H[2] - 9), V(H[0] + s * 8 + 0.2, 8, H[2] + 6.4)), M.wall);
    for (const x of [-5.5, 5.5]) { b.add(boxGeo(V(H[0] + x - 1.0, 2.5, H[2] + 5.95), V(H[0] + x + 1.0, 6.5, H[2] + 6.0)), M.glass); b.add(new THREE.CircleGeometry(1.0, 20, 0, Math.PI), M.glass, at(H[0] + x, 6.5, H[2] + 5.94)); }
    b.add(boxGeo(V(H[0] - 4, 0, H[2] + 1.2), V(H[0] + 4, 0.7, H[2] + 3.6)), M.stoneD);
    // seashore: a rowing boat and a post
    b.add(boxGeo(V(SHORE[0] - 3.2, 0, SHORE[2] - 1.5), V(SHORE[0] - 1.4, 0.45, SHORE[2] - 0.7)), M.wood);
    b.add(boxGeo(V(SHORE[0] + 2.6, 0, SHORE[2] - 0.6), V(SHORE[0] + 2.75, 1.6, SHORE[2] - 0.45)), M.wood);
    b.build(R);
    const seaM = lam("seaM", () => ({ map: rep(seaT(), 60, 30) }));
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1800, 900), seaM); this.sea.rotation.x = -Math.PI / 2; this.sea.position.set(0, 0.03, SEA_Z - 450); this.sea.receiveShadow = true; R.add(this.sea);
    // signs and the portrait (unlit, readable)
    const add = (m: THREE.Mesh, x: number, y: number, z: number) => { m.position.set(x, y, z); m.rotation.y = Math.PI; m.layers.set(NOINK); R.add(m); };
    add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: signT("stallSign", "FOSSILS FOR SALE", "#f3e6c8", "#5a2f1a", 1024, 320, 120), color: 0xeeeeee })), STALL[0] - 1.56, 1.7, STALL[2] - 0.62);
    add(new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.55), new THREE.MeshBasicMaterial({ map: signT("socSign", "GEOLOGICAL SOCIETY", "#e6dccb", "#2a2430", 1400, 140, 96), color: 0xeeeeee })), S[0], 5.6, S[2] - 1.03);
    this.menSign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.38), new THREE.MeshBasicMaterial({ map: signT("menOnly", "GENTLEMEN ONLY", "#2f2a26", "#e8c45a", 1024, 300, 104), color: 0xeeeeee })); add(this.menSign, S[0], 2.0, S[2] - 0.16);
    add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.88), new THREE.MeshBasicMaterial({ map: portraitT(), color: 0xeeeeee })), H[0] - 4.2, 3.4, H[2] + 5.9);
    add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.7), new THREE.MeshBasicMaterial({ map: signT("musSign", "NATURAL HISTORY MUSEUM", "#2f4a3a", "#f3e6c8", 1600, 175, 100), color: 0xeeeeee })), H[0], 7.2, H[2] + 5.9);
    // fossils + the door
    this.skull = ichSkull(M); R.add(this.skull);
    const pl = plesio(M); pl.position.set(PLES[0], PLES[1], PLES[2]); R.add(pl);
    const pl2 = plesio(M); pl2.position.set(MUS[0] - 3.3, 1.0, MUS[2] + 2.4); pl2.scale.setScalar(1.0); pl2.rotation.x = 0.0; R.add(pl2);
    this.door = new THREE.Group(); this.door.position.set(S[0] - 0.75, 0.54, S[2] - 0.06);
    const dl = mesh(new THREE.BoxGeometry(1.5, 2.2, 0.08), M.door, 0.75, 1.1, 0); this.door.add(dl); this.door.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), M.ammo, 1.3, 1.1, -0.06)); R.add(this.door);
  }
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.light === "golden" ? 35 : L.az), el = THREE.MathUtils.degToRad(s.light === "golden" ? 14 : L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.3 + 8, 12, 60);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    // ---- story props ----
    const so = skullOut(id, t);
    this.skull.position.set(SKULL[0] - 0.0, SKULL[1] + 0.05 * so, SKULL[2] + 0.65 * (1 - so)); this.skull.rotation.set(0, 0.25, 0.05 * so);
    this.menSign.visible = id === 7 && t >= SLAM_T; this.door.rotation.y = id === 7 ? (t < SLAM_T - 0.5 ? -1.4 : t < SLAM_T ? -1.4 * (1 - ((t - (SLAM_T - 0.5)) / 0.5) ** 2) : 0) : 0;
    const sm = this.sea.material as THREE.MeshLambertMaterial; if (sm.map) sm.map.offset.set(t * 0.01, t * 0.004);    // ---- cast + effects (template loop) ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      if (Math.hypot(p.x - cam.position.x, p.z - cam.position.z) < 1.35) continue; // nobody right in front of the lens
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      const sq = p.sy ?? 1, sx = sc2 / Math.sqrt(sq);
      a.mesh.scale.set(p.mirror ? -sx : sx, sc2 * sq, sc2);
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const ef = this.fx(fi++);
      ef.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      ef.use(!!p.soft);
      ef.mesh.visible = true;
      ef.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { ef.mesh.quaternion.copy(cam.quaternion); ef.mesh.rotateZ(p.rot ?? 0); }
      ef.mesh.scale.set(p.w, p.h, 1);
      fused.push(ef);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
