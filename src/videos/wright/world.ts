// Video 3 world: Kitty Hawk beach + bike shop + experts + Langley houseboat, machines built from primitives.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { rep, ctex, rng, grassHD, cloudHD, planksHD, beam, roofHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, PAPER, BROS, DUNE, SHOP, TUNNEL, BOOK, BOAT, RAIL, SEA_Z, glider, flyer, aerodrome, Pose } from "./story";

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

const sandT = () => ctex("sandHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#ecd39a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 300; i++) { const x = r() * 1024, y = r() * 1024, s = 20 + r() * 90; g.fillStyle = r() > 0.5 ? "rgba(255,245,220,0.12)" : "rgba(170,130,70,0.10)"; g.beginPath(); g.ellipse(x, y, s, s * 0.4, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() > 0.5 ? "#c9a96a" : "#fff1cc"; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 2 + r() * 2); }
});
const seaT = () => ctex("seaHD", 512, 512, (g, r) => {
  g.fillStyle = "#3f8fd6"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i++) { const x = r() * 512, y = r() * 512, w = 30 + r() * 60; g.strokeStyle = r() > 0.4 ? "rgba(255,255,255,0.55)" : "rgba(30,80,150,0.5)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 8, x + w, y); g.stroke(); }
});
const fabric = () => ctex("fabric", 256, 256, (g) => { g.fillStyle = "#efe6cf"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "rgba(120,100,70,0.35)"; g.lineWidth = 3; for (let x = 0; x < 256; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } });
const bookPage = () => ctex("bookPage", 1024, 640, (g) => {
  g.fillStyle = "#f6efd9"; g.fillRect(0, 0, 1024, 640); g.fillStyle = "#c9b98f"; g.fillRect(506, 0, 12, 640);
  g.fillStyle = "#241726"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "bold 56px Georgia, serif"; g.fillText("LIFT TABLE", 256, 90); g.fillText("OF AIR", 768, 90);
  g.font = "bold 150px Georgia, serif"; g.fillText("k =", 256, 330); g.fillStyle = "#1f3f8a"; g.fillText("0.005", 768, 330);
  g.fillStyle = "#8a8f94"; for (let k = 0; k < 5; k++) { g.fillRect(60, 470 + k * 30, 390, 10); g.fillRect(574, 470 + k * 30, 390, 10); }
});
const shopSign = () => ctex("shopSign", 1024, 160, (g) => {
  g.fillStyle = "#2f5a3a"; g.fillRect(0, 0, 1024, 160); g.strokeStyle = "#e8c45a"; g.lineWidth = 10; g.strokeRect(8, 8, 1008, 144);
  g.fillStyle = "#f6e7b5"; g.font = "bold 78px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("WRIGHT CYCLE CO.", 512, 84);
});

type Mats = Record<string, THREE.Material>;
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };

/** biplane: forward = local -z. span s, chord c, gap gp. withEngine adds canard, rudders, engine and two pusher props */
const biplane = (M: Mats, span: number, withEngine: boolean) => {
  const g = new THREE.Group(); g.rotation.order = "YXZ";
  const c = 0.85, gp = 0.85, th = 0.04;
  for (const y of [0, gp]) g.add(mesh(new THREE.BoxGeometry(span, th, c), M.fabric, 0, y, 0));
  for (let k = 0; k < 6; k++) { const x = -span / 2 + 0.2 + k * ((span - 0.4) / 5); for (const z of [-c / 2 + 0.08, c / 2 - 0.08]) g.add(mesh(new THREE.BoxGeometry(0.03, gp, 0.03), M.strut, x, gp / 2, z)); }
  g.add(mesh(new THREE.BoxGeometry(1.2, th, 0.35), M.fabric, 0, gp * 0.45, -1.5)); // canard elevator
  for (const x of [-0.3, 0.3]) g.add(mesh(new THREE.BoxGeometry(0.025, 0.025, 1.3), M.strut, x, gp * 0.45, -0.95));
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.7, 0.4), M.fabric, 0, gp * 0.5, 1.45)); // rudder
  for (const x of [-0.25, 0.25]) g.add(mesh(new THREE.BoxGeometry(0.025, 0.025, 1.1), M.strut, x, gp * 0.4, 0.95));
  const props: THREE.Object3D[] = [];
  if (withEngine) {
    g.add(mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), M.iron, 0.25, 0.2, 0.05));
    for (const x of [-0.9, 0.9]) { const p = new THREE.Group(); p.position.set(x, gp * 0.5, c / 2 + 0.12); p.add(mesh(new THREE.BoxGeometry(1.5, 0.12, 0.03), M.wood)); g.add(p); props.push(p); }
  }
  return { g, props };
};
/** Langley's Aerodrome: tandem dihedral wings on a long silver body, forward = -z */
const aerodromeGeo = (M: Mats) => {
  const g = new THREE.Group(); g.rotation.order = "YXZ";
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.1, 6.5, 12).rotateX(Math.PI / 2), M.steel));
  for (const z of [-1.9, 1.9]) for (const s of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(4.4, 0.04, 1.4), M.fabric, s * 2.2, 0.25, z); w.rotation.z = s * 0.22; g.add(w); }
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.9, 0.9), M.fabric, 0, 0.1, 3.3));
  const props: THREE.Object3D[] = [];
  for (const x of [-0.7, 0.7]) { const p = new THREE.Group(); p.position.set(x, 0.1, 0); p.add(mesh(new THREE.BoxGeometry(1.1, 0.1, 0.03), M.wood)); g.add(p); props.push(p); }
  return { g, props };
};
const bicycle = (M: Mats) => {
  const g = new THREE.Group();
  for (const x of [-0.5, 0.5]) { const w = mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 28), M.iron, x, 0.35, 0); g.add(w); }
  const bar = (a: THREE.Vector3, b: THREE.Vector3) => { const d = b.clone().sub(a); const m = mesh(new THREE.CylinderGeometry(0.02, 0.02, d.length(), 6), M.bikeRed); m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m); };
  const V3_ = (x: number, y: number) => new THREE.Vector3(x, y, 0);
  bar(V3_(-0.5, 0.35), V3_(-0.05, 0.35)); bar(V3_(-0.05, 0.35), V3_(0.35, 0.78)); bar(V3_(-0.5, 0.35), V3_(-0.15, 0.8)); bar(V3_(-0.15, 0.8), V3_(0.35, 0.78)); bar(V3_(0.5, 0.35), V3_(0.38, 0.9)); bar(V3_(-0.05, 0.35), V3_(-0.15, 0.85));
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.05, 0.1), M.iron, -0.15, 0.88, 0)); g.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), M.iron, 0.38, 0.92, 0));
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
  private gl!: { g: THREE.Group; props: THREE.Object3D[] }; private fl!: { g: THREE.Group; props: THREE.Object3D[] }; private ae!: { g: THREE.Group; props: THREE.Object3D[] };
  private fan!: THREE.Group; private sea!: THREE.Mesh; private bike!: THREE.Group;
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
    M.sand = lam("sandHD", () => ({ map: sandT() })); M.dune = lam("dune", () => ({ color: "#e6c98c" }));
    M.grass = lam("grassHD", () => ({ map: grassHD() })); M.seaGrass = lam("seaGrass", () => ({ color: "#7fa84a" }));
    M.fabric = lam("fabric", () => ({ map: fabric(), side: THREE.DoubleSide })); M.strut = lam("strut", () => ({ color: "#8a5a34" }));
    M.wood = lam("wood", () => ({ map: beam() })); M.planks = lam("planksT", () => ({ map: planksHD() }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 50 }), 0.15);
    M.steel = twoTone(new THREE.MeshPhongMaterial({ color: "#b9c0c9", specular: "#ffffff", shininess: 70 }), 0.15);
    M.bikeRed = lam("bikeRed", () => ({ color: "#c43a2f" }));
    M.shed = lam("shed", () => ({ color: "#a8784a" })); M.roofR = lam("roofR", () => ({ map: roofHD("#8a3a2a") })); M.white = lam("whiteW", () => ({ color: "#efece4" }));
    M.brick = lam("brickW", () => ({ color: "#b8553a" })); M.glass = lam("glass", () => ({ color: "#9cc8e8" }));
    M.hull = lam("hull", () => ({ color: "#5a3b2a" })); M.cabin = lam("cabin", () => ({ color: "#d8cdb8" }));
    M.trunk = lam("trunk", () => ({ color: "#7a4f33" })); M.leafA = lam("leafA", () => ({ color: "#4f9a43" })); M.leafB = lam("leafB", () => ({ color: "#62ae4c" }));
    M.page = new THREE.MeshBasicMaterial({ map: bookPage(), color: 0xeeeeee }); M.sign = new THREE.MeshBasicMaterial({ map: shopSign(), color: 0xeeeeee });

    const b = new Batch();
    const ground = new THREE.PlaneGeometry(1800, 1800); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 300, uv.getY(i) * 300);
    b.add(ground, M.sand);
    // the town side (shop + experts) sits on grass
    const lawn = new THREE.PlaneGeometry(40, 30); lawn.rotateX(-Math.PI / 2);
    const luv = lawn.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < luv.count; i++) luv.setXY(i, luv.getX(i) * 10, luv.getY(i) * 8);
    b.add(lawn, M.grass, at(SHOP[0] + 3, 0.01, SHOP[2] - 2));
    // dunes + sea grass
    const r = rng(5);
    const dune = (x: number, z: number, rad: number, h: number) => { const g = new THREE.SphereGeometry(rad, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, h / rad, 1); b.add(g, M.dune, at(x, 0, z)); };
    dune(DUNE[0], DUNE[2], 4.2, 2.2);
    for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, d = 12 + r() * 30, x = Math.cos(a) * d, z = Math.min(SEA_Z - 6, Math.sin(a) * d), rad = 2 + r() * 5, h = 0.6 + r() * 2.2; if ((x > -24 && x < 12 && Math.abs(z - RAIL[2]) < rad + 4) || Math.hypot(x - PAPER[0], z - PAPER[2]) < rad + 6 || (z > -6 && z < 14 && x > -8 && x < 10)) continue; dune(x, z, rad, h); }
    for (let i = 0; i < 70; i++) { const x = -18 + r() * 36, z = -10 + r() * 28; if (Math.hypot(x - PAPER[0], z - PAPER[2]) < 2.5 || Math.hypot(x - BROS[0], z - BROS[2]) < 2 || (x > -16 && x < 6 && z > 6 && z < 10)) continue; for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.04, 0.5 + r() * 0.4, 4), M.seaGrass, new THREE.Matrix4().makeRotationZ((r() - 0.5) * 0.6).premultiply(at(x + (r() - 0.5) * 0.3, 0.25, z + (r() - 0.5) * 0.3))); }
    // camp shed + lifesaving station
    b.add(boxGeo(V(-14, 0, 9), V(-9.5, 2.6, 12.5)), M.shed); { const rf = new THREE.ConeGeometry(3.4, 1.2, 4); rf.rotateY(Math.PI / 4); rf.scale(1, 1, 0.78); b.add(rf, M.roofR, at(-11.75, 3.2, 10.75)); }
    b.add(boxGeo(V(8, 0, 13), V(13, 3.4, 17)), M.white); { const rf = new THREE.ConeGeometry(3.7, 1.5, 4); rf.rotateY(Math.PI / 4); rf.scale(1, 1, 0.8); b.add(rf, M.roofR, at(10.5, 4.15, 15)); }
    b.add(boxGeo(V(10.2, 4.6, 14.7), V(10.8, 5.8, 15.3)), M.white);
    // Flyer launch rail
    b.add(boxGeo(V(RAIL[0] - 18, 0, RAIL[2] - 0.06), V(RAIL[0] + 1, 0.08, RAIL[2] + 0.06)), M.wood);
    // houseboat with catapult tower
    b.add(boxGeo(V(BOAT[0] - 4, -0.4, BOAT[2] - 1.6), V(BOAT[0] + 4, 1.2, BOAT[2] + 1.6)), M.hull);
    b.add(boxGeo(V(BOAT[0] - 3, 1.2, BOAT[2] - 1.2), V(BOAT[0] + 2.5, 3.9, BOAT[2] + 1.2)), M.cabin);
    b.add(boxGeo(V(BOAT[0] - 3.4, 3.9, BOAT[2] - 0.15), V(BOAT[0] + 3, 4.05, BOAT[2] + 0.15)), M.wood);
    for (const x of [-2.6, 2.2]) b.add(boxGeo(V(BOAT[0] + x - 0.08, 3.9, BOAT[2] - 0.5), V(BOAT[0] + x + 0.08, 4.4, BOAT[2] + 0.5)), M.wood);
    // bike shop: open front facing -z, workbench, shelves with wheels, sign
    const S = SHOP;
    b.add(boxGeo(V(S[0] - 3.2, 0, S[2] + 2.6), V(S[0] + 3.2, 3.2, S[2] + 2.8)), M.brick);
    for (const s of [-1, 1]) b.add(boxGeo(V(S[0] + s * 3.2 - 0.1, 0, S[2] - 1.2), V(S[0] + s * 3.2 + 0.1, 3.2, S[2] + 2.8)), M.brick);
    b.add(boxGeo(V(S[0] - 3.4, 3.2, S[2] - 1.4), V(S[0] + 3.4, 3.4, S[2] + 2.9)), M.wood);
    b.add(boxGeo(V(S[0] - 3.0, 0.005, S[2] - 1.2), V(S[0] + 3.0, 0.02, S[2] + 2.6)), M.planks);
    b.add(boxGeo(V(TUNNEL[0] - 1.3, 0.8, TUNNEL[2] - 0.35), V(TUNNEL[0] + 1.3, 0.86, TUNNEL[2] + 0.35)), M.planks);
    for (const dx of [-1.2, 1.2]) for (const dz of [-0.3, 0.3]) b.add(boxGeo(V(TUNNEL[0] + dx - 0.04, 0, TUNNEL[2] + dz - 0.04), V(TUNNEL[0] + dx + 0.04, 0.8, TUNNEL[2] + dz + 0.04)), M.wood);
    // the wind tunnel: 1.8 m wooden box with a glass window on top, open at +x
    b.add(boxGeo(V(TUNNEL[0] - 0.9, 0.86, TUNNEL[2] - 0.22), V(TUNNEL[0] + 0.9, 0.9, TUNNEL[2] + 0.22)), M.wood);
    for (const dz of [-0.22, 0.2]) b.add(boxGeo(V(TUNNEL[0] - 0.9, 0.86, TUNNEL[2] + dz), V(TUNNEL[0] + 0.9, 1.3, TUNNEL[2] + dz + 0.02)), M.wood);
    b.add(boxGeo(V(TUNNEL[0] - 0.9, 1.3, TUNNEL[2] - 0.22), V(TUNNEL[0] + 0.9, 1.32, TUNNEL[2] + 0.22)), M.glass);
    for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(0.3, 0.025, 8, 24), M.iron, at(S[0] - 2.2 + k * 0.7, 2.2, S[2] + 2.45));
    b.add(boxGeo(V(S[0] - 2.8, 1.8, S[2] + 2.3), V(S[0] + 0.3, 1.85, S[2] + 2.6)), M.wood);
    // lectern for the experts' book, town houses + trees behind
    b.add(boxGeo(V(BOOK[0] - 0.35, 0, BOOK[2] - 0.25), V(BOOK[0] + 0.35, 1.05, BOOK[2] + 0.25)), M.wood);
    for (let i = 0; i < 6; i++) { const x = SHOP[0] - 10 + i * 5.5, w = 4 + r() * 1.5; b.add(boxGeo(V(x, 0, 9), V(x + w, 5 + r() * 3, 13)), i % 2 ? M.brick : M.white); }
    for (const [x, z] of [[-30, 5], [-27, -6], [-46, 6], [-49, -4]]) { b.add(new THREE.CylinderGeometry(0.16, 0.24, 3, 8), M.trunk, at(x, 1.5, z)); for (let k = 0; k < 3; k++) b.add(new THREE.IcosahedronGeometry(1.3, 1), k % 2 ? M.leafA : M.leafB, at(x + (k - 1) * 0.8, 3.6 + (k % 2) * 0.6, z)); }
    b.build(R);
    // sea (scrolling texture)
    const seaM = lam("seaM", () => ({ map: rep(seaT(), 60, 30) }));
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1800, 900), seaM); this.sea.rotation.x = -Math.PI / 2; this.sea.position.set(0, 0.03, SEA_Z + 450); this.sea.receiveShadow = true; R.add(this.sea);
    // signs + book pages (unlit, readable)
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.66), M.sign); sg.position.set(SHOP[0], 2.85, SHOP[2] - 1.42); sg.rotation.y = Math.PI; sg.layers.set(NOINK); R.add(sg);
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), M.page); pg.position.set(BOOK[0], 1.2, BOOK[2] - 0.05); pg.rotation.set(-0.55, Math.PI, 0, "YXZ"); pg.layers.set(NOINK); R.add(pg);
    const cover = mesh(new THREE.BoxGeometry(1.0, 0.04, 0.64), M.bikeRed, BOOK[0], 1.15, BOOK[2]); cover.rotation.x = 0.55; R.add(cover);
    // bicycle between the brothers, one in the shop
    const bk = bicycle(M); bk.position.set(BROS[0] + 0.1, 0, BROS[2] + 0.35); bk.rotation.y = 0.15; R.add(bk); this.bike = bk;
    const bk2 = bicycle(M); bk2.position.set(SHOP[0] + 2.2, 0, SHOP[2] + 2.0); bk2.rotation.y = -0.3; R.add(bk2);
    // machines
    this.gl = biplane(M, 5.0, false); R.add(this.gl.g);
    this.fl = biplane(M, 6.0, true); R.add(this.fl.g);
    this.ae = aerodromeGeo(M); R.add(this.ae.g);
    this.fan = new THREE.Group(); this.fan.position.set(TUNNEL[0] - 0.95, 1.08, TUNNEL[2]);
    for (let k = 0; k < 4; k++) { const bl = mesh(new THREE.BoxGeometry(0.02, 0.38, 0.08), M.iron); bl.rotation.x = (k * Math.PI) / 2; bl.position.y = 0; this.fan.add(bl); }
    R.add(this.fan);
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
    const setPose = (o: { g: THREE.Group; props: THREE.Object3D[] }, p: Pose | null) => {
      o.g.visible = !!p; if (!p) return;
      o.g.position.set(...p.p); o.g.rotation.set(p.pitch, p.yaw, p.roll);
      for (const pr of o.props) pr.rotation.z = p.prop;
    };
    setPose(this.gl, id === 3 ? glider(t) : null);
    const fp = flyer(id, t);
    setPose(this.fl, fp ?? (id === 7 ? null : null));
    setPose(this.ae, id === 6 ? aerodrome(t) : null);
    this.fan.rotation.x = t * 35; this.bike.visible = id === 2;
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
