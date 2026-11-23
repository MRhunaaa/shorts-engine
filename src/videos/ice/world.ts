// The schoolyard as one three.js scene (sky / light rig / clouds / actor loop kept from the bridge template's world.ts):
// a long plastered school block with a tin veranda and a chalkboard, a red-earth yard, a chest freezer whose lid
// opens, two wooden tables with pots, trees, green Usambara-style hills and blue mountains.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { rep, ctex, rng, grassHD, facadeHD, roofHD, beam, cloudHD, planksHD } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, FREEZER, FZ, BOARD, POT_TABLE, TABLE2, LID_OPEN_F, potFlight, POT_THROW, POT_SLOT } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- painted textures (flat with dark seams, same family as paint.ts) ----------------
const dirtHD = () => ctex("dirtHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#c98154"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { const x = r() * 1024, y = r() * 1024, s = 20 + r() * 90; g.fillStyle = r() > 0.5 ? "rgba(255,220,180,0.10)" : "rgba(120,60,30,0.10)"; g.beginPath(); g.ellipse(x, y, s, s * 0.6, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 900; i++) { const x = r() * 1024, y = r() * 1024; g.fillStyle = r() > 0.5 ? "#9e5c38" : "#e3a57a"; g.fillRect(x, y, 3 + r() * 5, 2 + r() * 3); }
});
const tinHD = () => ctex("tinHD", 512, 512, (g) => {
  for (let x = 0; x < 512; x += 32) { g.fillStyle = (x / 32) % 2 ? "#a9b3bb" : "#bcc5cc"; g.fillRect(x, 0, 32, 512); g.fillStyle = "rgba(40,40,50,0.45)"; g.fillRect(x, 0, 3, 512); }
  for (let i = 0; i < 12; i++) { g.fillStyle = "rgba(170,80,40,0.25)"; g.fillRect(Math.random() * 512, Math.random() * 512, 20, 60); }
});
const enamel = () => ctex("enamel", 256, 256, (g) => { g.fillStyle = "#f2f4f6"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(60,70,90,0.5)"; g.fillRect(0, 0, 256, 6); g.fillRect(0, 250, 256, 6); });
const freezerFront = () => ctex("fzFront", 512, 320, (g) => {
  g.fillStyle = "#f2f4f6"; g.fillRect(0, 0, 512, 320);
  g.fillStyle = "#3b4150"; g.fillRect(0, 0, 512, 10); g.fillRect(0, 300, 512, 20);
  g.fillStyle = "#c9ced6"; g.fillRect(30, 270, 452, 18); // kick plate vent
  for (let x = 40; x < 480; x += 22) { g.fillStyle = "#7d8592"; g.fillRect(x, 274, 10, 10); }
  g.fillStyle = "#3a73c4"; g.fillRect(60, 60, 120, 40); g.fillStyle = "#ffffff"; g.font = "bold 30px Arial"; g.fillText("FROST", 70, 91);
  g.fillStyle = "#9aa1ab"; g.fillRect(230, 20, 52, 16); // handle
});
const boardTex = (k: 0 | 1 | 2) => ctex("board" + k, 1024, 576, (g, r) => {
  g.fillStyle = "#2f4a3a"; g.fillRect(0, 0, 1024, 576);
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,0.035)"; g.fillRect(r() * 1024, r() * 576, 120 + r() * 200, 20 + r() * 40); }
  g.fillStyle = "#8a5a34"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 550, 1024, 26); g.fillRect(0, 0, 26, 576); g.fillRect(998, 0, 26, 576);
  g.fillStyle = "#f4f1ea"; g.strokeStyle = "#f4f1ea"; g.lineCap = "round"; g.textAlign = "center"; g.textBaseline = "middle";
  if (k === 0) { g.font = "bold 64px Comic Sans MS, Arial"; g.fillText("ICE CREAM DAY", 512, 140); g.font = "48px Comic Sans MS, Arial"; g.fillText("milk + sugar", 512, 260); }
  if (k === 1) {
    g.font = "bold 70px Comic Sans MS, Arial"; g.fillText("HOT = ICE ?", 512, 180);
    g.font = "54px Comic Sans MS, Arial"; g.fillText("??   !!   ??", 512, 330);
    g.lineWidth = 6; g.beginPath(); g.moveTo(160, 430); g.lineTo(420, 470); g.lineTo(700, 410); g.lineTo(880, 450); g.stroke();
  }
  if (k === 2) {
    g.font = "bold 118px Arial Black, Arial"; g.fillText("MPEMBA", 512, 210); g.fillText("EFFECT", 512, 360);
    g.lineWidth = 8; g.beginPath(); g.moveTo(170, 470); g.lineTo(854, 470); g.stroke();
    // a snowflake doodle
    for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(930, 110); g.lineTo(930 + 46 * Math.cos(a * 1.047), 110 + 46 * Math.sin(a * 1.047)); g.stroke(); }
  }
});
const signTex = () => ctex("schoolSign", 1024, 160, (g) => {
  g.fillStyle = "#1f4f8f"; g.fillRect(0, 0, 1024, 160); g.strokeStyle = "#f6d23c"; g.lineWidth = 10; g.strokeRect(8, 8, 1008, 144);
  g.fillStyle = "#ffffff"; g.font = "bold 74px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("MAGAMBA SCHOOL", 512, 84);
});
/** Tanzania flag: green upper-left, blue lower-right, yellow-edged black diagonal */
const flagTZ = () => ctex("flagTZ", 300, 200, (g) => {
  g.fillStyle = "#1eb53a"; g.fillRect(0, 0, 300, 200);
  g.fillStyle = "#00a3dd"; g.beginPath(); g.moveTo(300, 0); g.lineTo(300, 200); g.lineTo(0, 200); g.fill();
  g.strokeStyle = "#fcd116"; g.lineWidth = 70; g.beginPath(); g.moveTo(-10, 210); g.lineTo(310, -10); g.stroke();
  g.strokeStyle = "#000000"; g.lineWidth = 48; g.beginPath(); g.moveTo(-10, 210); g.lineTo(310, -10); g.stroke();
});
const cloudTex = () => ctex("smoke", 256, 256, (g) => { const p = new Pen(g); for (const [x, y, rr, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"]] as const) p.ell(x, y, rr, rr * 0.85, c, 0); });

type Mats = Record<string, THREE.Material>;
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

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
  private lid = new THREE.Group();
  private potIn: THREE.Group; private boards: THREE.Mesh[] = [];
  private flag!: THREE.Mesh; private bunting = new THREE.Group();
  private smoke: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; top: V3; k: number }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root, M: Mats = {};
    // ---- sky + light (template) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
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
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 600 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 36, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.dirt = lam("dirtHD", () => ({ map: rep(dirtHD(), 1, 1) }));
    M.wall = lam("schoolFac2", () => ({ map: facadeHD("school2", 26, 3.6, { wall: "#f3c45a", shutter: "#2f8f86", door: true }) }));
    M.plaster = lam("plasterSide2", () => ({ color: "#efbf57" }));
    M.band = lam("blueBand", () => ({ color: "#2f63b0" }));
    M.barrel = lam("barrel", () => ({ color: "#2f7fd0" }));
    M.banana = lam("banana", () => ({ color: "#58b043", side: THREE.DoubleSide }));
    M.bell = twoTone(new THREE.MeshPhongMaterial({ color: "#d9a640", specular: "#fff1c0", shininess: 60 }), 0.15);
    M.pole = lam("pole", () => ({ color: "#e8e4dc" }));
    M.sign = new THREE.MeshBasicMaterial({ map: signTex(), color: 0xe6e6e6 });
    M.tin = lam("tinHD", () => ({ map: rep(tinHD(), 6, 2), side: THREE.DoubleSide }));
    M.wood = lam("wood", () => ({ map: beam() }));
    M.planks = lam("planksT", () => ({ map: planksHD() }));
    M.post = lam("postBlue", () => ({ color: "#3e6fa8" }));
    M.enamel = lam("enamel", () => ({ map: enamel() }));
    M.fzFront = lam("fzFront", () => ({ map: freezerFront() }));
    M.fzIn = lam("fzIn", () => ({ color: "#8fa6bf" }));
    M.frost = lam("frost", () => ({ color: "#f7e9cc" }));
    M.bowl = lam("bowlOrange", () => ({ color: "#e08a5a" }));
    M.mixC = lam("mixCream", () => ({ color: "#f3e6c8" }));
    M.trunk = lam("trunk", () => ({ color: "#7a4f33" }));
    M.leafA = lam("leafA", () => ({ color: "#4f9a43" })); M.leafB = lam("leafB", () => ({ color: "#62ae4c" })); M.leafC = lam("leafC", () => ({ color: "#3f8a3e" }));
    M.hill = lam("hill", () => ({ color: "#6fae55" })); M.hill2 = lam("hill2", () => ({ color: "#5d9e4d" }));
    M.mount = lam("mount", () => ({ color: "#6f8fb8" }));
    M.house = lam("houseW", () => ({ color: "#e9d6b0" })); M.roofR = lam("roofR", () => ({ map: roofHD("#b84a32") }));
    M.metal = twoTone(new THREE.MeshPhongMaterial({ color: "#b9c0c9", specular: "#ffffff", shininess: 70 }), 0.15);

    const b = new Batch();
    // ground: grass everywhere, red-earth yard in front of the school
    const ground = new THREE.PlaneGeometry(1800, 1800, 1, 1); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 450, uv.getY(i) * 450);
    b.add(ground, M.grass);
    const yard = new THREE.CircleGeometry(11, 48); yard.rotateX(-Math.PI / 2);
    const yuv = yard.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < yuv.count; i++) yuv.setXY(i, yuv.getX(i) * 4, yuv.getY(i) * 4);
    b.add(yard, M.dirt, at(0, 0.01, 3.2));
    // school block: wall face at z = 8 (facing -z), 26 m long, 3.6 m tall; veranda roof + blue posts
    b.add(boxGeo(V(-13, 0, 8), V(13, 3.6, 14)), M.plaster);
    const fac = boxGeo(V(-13, 0, 7.99), V(13, 3.6, 8.0)); b.add(fac, M.wall);
    const roof = new THREE.BoxGeometry(27.5, 0.08, 9.5); b.add(roof, M.tin, new THREE.Matrix4().makeRotationX(-0.12).premultiply(at(0, 4.15, 10.2)));
    const ver = new THREE.BoxGeometry(27, 0.06, 2.6); b.add(ver, M.tin, new THREE.Matrix4().makeRotationX(0.16).premultiply(at(0, 3.25, 6.8)));
    for (let x = -12.5; x <= 12.6; x += 3.1) b.add(boxGeo(V(x - 0.09, 0, 5.62), V(x + 0.09, 3.05, 5.8)), M.post);
    b.add(boxGeo(V(-13, 0, 5.5), V(13, 0.18, 8)), M.plaster); // veranda step
    // chalkboard frame (board faces are separate meshes, swapped per shot)
    b.add(boxGeo(V(BOARD[0] - 1.35, BOARD[1] - 0.8, BOARD[2] - 0.02), V(BOARD[0] + 1.35, BOARD[1] + 0.8, BOARD[2] + 0.08)), M.wood);
    // tables with pots and bowls
    for (const [tx, tz] of [[POT_TABLE[0], POT_TABLE[2]], [TABLE2[0], TABLE2[2]]]) {
      b.add(boxGeo(V(tx - 1.0, 0.7, tz - 0.45), V(tx + 1.0, 0.78, tz + 0.45)), M.planks);
      for (const [lx, lz] of [[-0.9, -0.38], [0.9, -0.38], [-0.9, 0.38], [0.9, 0.38]]) b.add(boxGeo(V(tx + lx - 0.04, 0, tz + lz - 0.04), V(tx + lx + 0.04, 0.7, tz + lz + 0.04)), M.wood);
      for (const dx of [0.55, 0.8]) { b.add(new THREE.CylinderGeometry(0.11, 0.08, 0.09, 18), M.bowl, at(tx + dx, 0.825, tz + 0.1)); b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 18), M.mixC, at(tx + dx, 0.865, tz + 0.1)); }
    }
    // the steaming pot on the left table (explanation shot)
    b.add(new THREE.CylinderGeometry(0.2, 0.18, 0.22, 24), M.metal, at(POT_TABLE[0], 0.89, POT_TABLE[2]));
    b.add(new THREE.CylinderGeometry(0.185, 0.185, 0.01, 24), M.mixC, at(POT_TABLE[0], 0.99, POT_TABLE[2]));
    // freezer body: open-top box, walls 6 cm, enamel outside, icy inside, frosted rim, bowls inside (one gap)
    const [fx, , fz] = FREEZER, hw = FZ.w / 2, hd = FZ.d / 2, H = FZ.h, t = 0.06;
    b.add(boxGeo(V(fx - hw, 0.05, fz - hd), V(fx + hw, H, fz - hd + t)), M.enamel);
    b.add(boxGeo(V(fx - hw, 0.05, fz - hd - 0.002), V(fx + hw, H, fz - hd)), M.fzFront);
    b.add(boxGeo(V(fx - hw, 0.05, fz + hd - t), V(fx + hw, H, fz + hd)), M.enamel);
    b.add(boxGeo(V(fx - hw, 0.05, fz - hd), V(fx - hw + t, H, fz + hd)), M.enamel);
    b.add(boxGeo(V(fx + hw - t, 0.05, fz - hd), V(fx + hw, H, fz + hd)), M.enamel);
    b.add(boxGeo(V(fx - hw, 0, fz - hd), V(fx + hw, 0.05, fz + hd)), M.trunk);
    b.add(boxGeo(V(fx - hw + t, 0.05, fz - hd + t), V(fx + hw - t, H - 0.2, fz + hd - t)), M.fzIn);
    for (const gx of [-0.42, 0, 0.42]) for (const gz of [-0.15, 0.15]) {
      if (gx === 0.42 && gz === 0.15) continue; // the one spot left
      b.add(new THREE.CylinderGeometry(0.15, 0.11, 0.1, 20), M.bowl, at(fx + gx, H - 0.15, fz + gz));
      b.add(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 20), M.frost, at(fx + gx, H - 0.1, fz + gz));
    }
    // trees around the yard
    const r = rng(7);
    const tree = (x: number, z: number, s: number) => {
      b.add(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 3.2 * s, 8), M.trunk, at(x, 1.6 * s, z));
      for (let k = 0; k < 4; k++) {
        const g = new THREE.IcosahedronGeometry((1.2 + r() * 0.6) * s, 1);
        b.add(g, [M.leafA, M.leafB, M.leafC][k % 3], at(x + (r() - 0.5) * 1.6 * s, (3.4 + r() * 1.2) * s, z + (r() - 0.5) * 1.6 * s));
      }
    };
    for (const [x, z, s] of [[-9.5, 2.5, 1.2], [9.8, 1.5, 1.1], [-14.5, 9, 1.4], [15.5, 10, 1.3], [-7, -6, 1.0], [8, -7, 1.15], [-18, -2, 1.3], [19, -1, 1.2], [3, -14, 1.3], [-4, -16, 1.1]]) tree(x, z, s);
    // distant hills, houses and mountains (fog takes them to the horizon colour)
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, d = 90 + r() * 90, rr = 30 + r() * 40;
      const g = new THREE.SphereGeometry(rr, 24, 12); g.scale(1, 0.32 + r() * 0.2, 1);
      b.add(g, i % 2 ? M.hill : M.hill2, at(Math.cos(a) * d, -4, Math.sin(a) * d));
    }
    for (let i = 0; i < 9; i++) {
      const a = 1.1 + (i / 9) * 1.2, d = 300 + r() * 120, h = 90 + r() * 70;
      b.add(new THREE.ConeGeometry(h * 1.4, h, 7), M.mount, at(Math.cos(a) * d, h / 2 - 10, Math.sin(a) * d));
    }
    for (let i = 0; i < 14; i++) {
      const x = -60 + i * 9 + r() * 4, z = 38 + r() * 25, w = 4 + r() * 3;
      b.add(boxGeo(V(x, 0, z), V(x + w, 3 + r(), z + 4)), M.house);
      const rf = new THREE.ConeGeometry(w * 0.78, 1.8, 4); rf.rotateY(Math.PI / 4); rf.scale(1, 1, 4 / w);
      b.add(rf, M.roofR, at(x + w / 2, 4.3, z + 2));
    }
    // ---- v2 set dressing ----
    b.add(boxGeo(V(-13, 0.18, 7.97), V(13, 0.75, 7.99)), M.band); // painted blue skirting band
    for (const [x, z] of [[-6.2, 6.6], [6.5, 6.7]]) { b.add(new THREE.CylinderGeometry(0.32, 0.3, 0.85, 20), M.barrel, at(x, 0.43, z)); b.add(new THREE.TorusGeometry(0.31, 0.03, 6, 20).rotateX(Math.PI / 2), M.post, at(x, 0.6, z)); }
    for (const [x, z] of [[-5.0, 6.9], [5.2, 6.9]]) { b.add(boxGeo(V(x - 1.0, 0.42, z - 0.18), V(x + 1.0, 0.48, z + 0.18)), M.planks); for (const dx of [-0.85, 0.85]) b.add(boxGeo(V(x + dx - 0.04, 0, z - 0.15), V(x + dx + 0.04, 0.42, z + 0.15)), M.wood); }
    const banana = (x: number, z: number, s: number) => {
      b.add(new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 2.2 * s, 8), M.leafC, at(x, 1.1 * s, z));
      for (let k = 0; k < 6; k++) { const g = new THREE.PlaneGeometry(0.5 * s, 1.6 * s); g.translate(0, 0.8 * s, 0); g.rotateX(-0.9); g.rotateY((k / 6) * Math.PI * 2); b.add(g, M.banana, at(x, 2.1 * s, z)); }
    };
    for (const [x, z, s] of [[-7.8, 5.2, 1.1], [7.6, 5.0, 1.0], [-11.5, 4.0, 1.2], [11.8, 4.6, 1.15], [-5.5, -3.5, 0.9]]) banana(x, z, s);
    b.add(new THREE.ConeGeometry(0.16, 0.24, 14, 1, true), M.bell, at(-2.4, 2.75, 6.4)); b.add(boxGeo(V(-2.42, 2.87, 6.38), V(-2.38, 3.15, 6.42)), M.wood);
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 7, 8), M.pole, at(-5.2, 3.5, 3.6));
    b.add(boxGeo(V(-1.6, 2.95, 7.9), V(1.6, 3.5, 7.95)), M.wood);
    b.build(R);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.48), M.sign); sg.position.set(0, 3.22, 7.88); sg.rotation.y = Math.PI; sg.layers.set(NOINK); R.add(sg);
    this.flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9, 12, 1), lam("tzflag", () => ({ map: flagTZ(), side: THREE.DoubleSide })));
    this.flag.position.set(-5.2, 6.4, 3.6); this.flag.castShadow = true; this.flag.frustumCulled = false; R.add(this.flag);
    // bunting: two strings of pennants across the veranda front
    const penG = new THREE.BufferGeometry(); penG.setAttribute("position", new THREE.Float32BufferAttribute([-0.14, 0, 0, 0.14, 0, 0, 0, -0.34, 0], 3)); penG.computeVertexNormals();
    const cols = ["#e43b3b", "#f6d23c", "#2f7fd0", "#29a35a", "#ffffff"];
    for (let row = 0; row < 2; row++) for (let k = 0; k < 34; k++) {
      const x = -12.5 + k * 0.76, sag = 0.35 * Math.sin((k / 33) * Math.PI);
      const m = new THREE.Mesh(penG, lam("pen" + (k % 5), () => ({ color: cols[k % 5], side: THREE.DoubleSide })));
      m.position.set(x, 3.0 - sag - row * 0.0, 5.45 - row * 0.02 + (row ? 1.2 : 0)); m.castShadow = true; this.bunting.add(m);
    }
    R.add(this.bunting);
    const smokeT = cloudTex();
    for (let k = 0; k < 7; k++) { const mat = new THREE.MeshLambertMaterial({ map: smokeT, transparent: true, depthWrite: false }); const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.layers.set(NOINK); this.smoke.push({ m, mat, top: [-20, 6, 46], k: k / 7 }); R.add(m); }

    // ---- dynamic: freezer lid (hinged at the back top edge), pot inside, chalkboard faces ----
    const lidMesh = new THREE.Mesh(boxGeo(V(-hw, 0, -FZ.d), V(hw, 0.07, 0), 0, true), M.enamel);
    lidMesh.castShadow = true; lidMesh.receiveShadow = true;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), M.metal); handle.position.set(0, 0.04, -FZ.d - 0.02);
    this.lid.add(lidMesh, handle); this.lid.position.set(fx, H, fz + hd); R.add(this.lid);
    this.potIn = new THREE.Group();
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.2, 24), M.metal); pm.castShadow = true;
    const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 24), M.mixC); pt.position.y = 0.1;
    this.potIn.add(pm, pt); this.potIn.position.set(fx + 0.42, H - 0.12, fz + 0.15); R.add(this.potIn);
    for (const k of [0, 1, 2] as const) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.46), new THREE.MeshBasicMaterial({ map: boardTex(k), color: 0xdedede }));
      m.position.set(BOARD[0], BOARD[1], BOARD[2] - 0.03); m.rotation.y = Math.PI; m.layers.set(NOINK);
      this.boards.push(m); R.add(m);
    }
    void cloudTex;
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
    this.lid.rotation.x = Math.max(0, s.lid(f));
    const th = POT_THROW[id], pf = potFlight(id, t);
    this.potIn.visible = !!pf || (th !== undefined && t >= th[1]) || (id >= 6 && id <= 9);
    if (pf) { this.potIn.position.set(...pf.p); this.potIn.rotation.set(pf.rot * 0.3, 0, pf.rot); }
    else { this.potIn.position.set(...POT_SLOT); this.potIn.rotation.set(0, 0, 0); }
    // flag + bunting flutter, smoke plume drift
    const fp = this.flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) { const u = (i % 13) / 12, y = i < 13 ? 0.45 : -0.45; fp.setXYZ(i, u * 1.5, y + 0.05 * u * Math.sin(t * 4 - u * 3), 0.2 * u * Math.sin(t * 5.5 - u * 5)); }
    fp.needsUpdate = true;
    this.bunting.rotation.x = 0.06 * Math.sin(t * 2.3); this.bunting.visible = id < 10;
    for (const sm of this.smoke) {
      const u = (t * 0.09 + sm.k) % 1, sz = 2.5 + u * 8;
      sm.m.position.set(sm.top[0] + u * 10, sm.top[1] + u * 12, sm.top[2]); sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(cam.quaternion);
      sm.mat.opacity = 0.8 * (1 - u) ** 1.2;
    }
    this.boards.forEach((m, k) => (m.visible = k === s.board));
    // ---- cast + effects (template loop) ----
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
    void LID_OPEN_F;
    return focus;
  }
}
