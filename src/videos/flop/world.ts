// Video 2 world: an athletics stadium (sky / light rig / clouds / actor loop shared with the schoolyard world):
// red track and apron, blue landing mat, striped bar on uprights (rises + gets knocked), tiered stands with a canopy,
// scoreboard, flags, floodlights, bunting, a bench for the newspaper, trees, hills and a distant city.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit } from "./build";
import { rep, ctex, rng, grassHD, cloudHD, planksHD, beam } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, UPX, MAT, BENCH, barH, barKnock, RISE_T } from "./story";

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
  private bar: THREE.Mesh; private olympic = new THREE.Group(); private boards: THREE.Mesh[] = [];
  private flags: THREE.Mesh[] = [];
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
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 600 + (i % 3) * 60, w = 140 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 36, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.apron = lam("apron", () => ({ map: rep(tartan("apronT", "#d0613f"), 6, 6) }));
    M.lanes = lam("lanes", () => ({ map: lanes(), side: THREE.DoubleSide }));
    M.matSide = lam("matSide", () => ({ color: "#2550a8" })); M.matTop = lam("matTop", () => ({ map: matTop() }));
    M.post = lam("postW", () => ({ color: "#e8e4dc" })); M.dark = lam("dark", () => ({ color: "#3b3f52" }));
    M.concrete = lam("concrete", () => ({ color: "#c9c3b8" })); M.seats = lam("seats", () => ({ map: rep(seats(), 4, 1) }));
    M.roof = lam("roofCanopy", () => ({ color: "#e8e4dc", side: THREE.DoubleSide })); M.steel = lam("steelBlue", () => ({ color: "#2f63b0" }));
    M.wood = lam("wood", () => ({ map: beam() })); M.planks = lam("planksT", () => ({ map: planksHD() }));
    M.trunk = lam("trunk", () => ({ color: "#7a4f33" }));
    M.leafA = lam("leafA", () => ({ color: "#4f9a43" })); M.leafB = lam("leafB", () => ({ color: "#62ae4c" })); M.leafC = lam("leafC", () => ({ color: "#3f8a3e" }));
    M.hill = lam("hill", () => ({ color: "#6fae55" })); M.hill2 = lam("hill2", () => ({ color: "#5d9e4d" })); M.mount = lam("mount", () => ({ color: "#6f8fb8" }));
    M.city = lam("city", () => ({ color: "#d8cdb8" })); M.city2 = lam("city2", () => ({ color: "#b9c4d0" }));
    M.towel = lam("towel", () => ({ color: "#f6d23c" })); M.bottle = lam("bottle", () => ({ color: "#2f7fd0" }));

    const b = new Batch();
    const ground = new THREE.PlaneGeometry(1800, 1800); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 450, uv.getY(i) * 450);
    b.add(ground, M.grass);
    const ring = new THREE.RingGeometry(30, 38, 96, 1); ring.rotateX(-Math.PI / 2); b.add(ring, M.lanes, at(0, 0.01, 4));
    const apron = new THREE.CircleGeometry(9.5, 48); apron.rotateX(-Math.PI / 2);
    const auv = apron.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < auv.count; i++) auv.setXY(i, auv.getX(i) * 4, auv.getY(i) * 4);
    b.add(apron, M.apron, at(0, 0.012, -1.5));
    // landing mat
    b.add(boxGeo(V(MAT.x0, 0, MAT.z0), V(MAT.x1, MAT.top - 0.02, MAT.z1)), M.matSide);
    b.add(boxGeo(V(MAT.x0 + 0.02, MAT.top - 0.02, MAT.z0 + 0.02), V(MAT.x1 - 0.02, MAT.top, MAT.z1 - 0.02)), M.matTop);
    // uprights with weighted bases and pegs
    for (const s of [-1, 1]) {
      b.add(new THREE.CylinderGeometry(0.035, 0.035, 2.75, 10), M.post, at(s * UPX, 1.375, 0));
      b.add(boxGeo(V(s * UPX - 0.25, 0, -0.25), V(s * UPX + 0.25, 0.06, 0.25)), M.dark);
      b.add(boxGeo(V(s * UPX - 0.02, 2.75, -0.02), V(s * UPX + 0.02, 2.8, 0.02)), M.dark);
    }
    // stands: three tiers behind the mat, canopy on blue steel posts
    for (let r = 0; r < 4; r++) b.add(boxGeo(V(-8, 0, 7.8 + r * 1.35), V(8, 0.6 + r * 0.72, 9.15 + r * 1.35)), r % 2 ? M.concrete : M.seats);
    b.add(boxGeo(V(-8, 0, 13.2), V(8, 4.2, 13.6)), M.concrete);
    const canopy = new THREE.BoxGeometry(17, 0.1, 6.5); b.add(canopy, M.roof, new THREE.Matrix4().makeRotationX(-0.12).premultiply(at(0, 6.1, 10.8)));
    for (const x of [-7.8, -2.6, 2.6, 7.8]) b.add(new THREE.CylinderGeometry(0.08, 0.08, 6.0, 8), M.steel, at(x, 3.0, 13.4));
    // bench with towel + bottle (newspaper lands here)
    b.add(boxGeo(V(BENCH[0] - 0.9, 0.4, BENCH[2] - 0.22), V(BENCH[0] + 0.9, 0.46, BENCH[2] + 0.22)), M.planks);
    for (const dx of [-0.8, 0.8]) b.add(boxGeo(V(BENCH[0] + dx - 0.04, 0, BENCH[2] - 0.2), V(BENCH[0] + dx + 0.04, 0.4, BENCH[2] + 0.2)), M.wood);
    b.add(boxGeo(V(BENCH[0] + 0.35, 0.46, BENCH[2] - 0.18), V(BENCH[0] + 0.75, 0.5, BENCH[2] + 0.18)), M.towel);
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 12), M.bottle, at(BENCH[0] - 0.65, 0.57, BENCH[2] + 0.05));
    // trees, hills, mountains, distant city
    const r = rng(11);
    const tree = (x: number, z: number, s: number) => {
      b.add(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 3.2 * s, 8), M.trunk, at(x, 1.6 * s, z));
      for (let k = 0; k < 4; k++) b.add(new THREE.IcosahedronGeometry((1.2 + r() * 0.6) * s, 1), [M.leafA, M.leafB, M.leafC][k % 3], at(x + (r() - 0.5) * 1.6 * s, (3.4 + r() * 1.2) * s, z + (r() - 0.5) * 1.6 * s));
    };
    for (const [x, z, s] of [[-12, 10, 1.3], [12.5, 11, 1.2], [-15, -4, 1.4], [16, -6, 1.3], [-9, -14, 1.1], [10, -15, 1.2], [-20, 6, 1.5], [21, 4, 1.4]]) tree(x, z, s);
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, d = 110 + r() * 90, rr = 30 + r() * 40; const g = new THREE.SphereGeometry(rr, 24, 12); g.scale(1, 0.3 + r() * 0.2, 1); b.add(g, i % 2 ? M.hill : M.hill2, at(Math.cos(a) * d, -4, Math.sin(a) * d)); }
    for (let i = 0; i < 9; i++) { const a = 1.1 + (i / 9) * 1.2, d = 320 + r() * 120, h = 90 + r() * 70; b.add(new THREE.ConeGeometry(h * 1.4, h, 7), M.mount, at(Math.cos(a) * d, h / 2 - 10, Math.sin(a) * d)); }
    for (let i = 0; i < 22; i++) { const x = -70 + i * 6.5 + r() * 3, z = 48 + r() * 22, w = 4 + r() * 3, h = 6 + r() * 14; b.add(boxGeo(V(x, 0, z), V(x + w, h, z + 5)), i % 2 ? M.city : M.city2); }
    b.build(R);

    // ---- dynamic ----
    const barM = lam("barM", () => ({ map: barTex() }));
    this.bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2 * UPX + 0.1, 12).rotateZ(Math.PI / 2), barM);
    this.bar.castShadow = true; R.add(this.bar);
    // olympic dressing: scoreboard, flags on the stand roof, floodlights, bunting
    const ob = new Batch();
    ob.add(boxGeo(V(-7.3, 0, 5.6), V(-4.7, 5.0, 5.9)), M.dark);
    for (const x of [-11, 11]) { ob.add(new THREE.CylinderGeometry(0.15, 0.2, 16, 8), M.steel, at(x, 8, 12)); ob.add(boxGeo(V(x - 1.4, 15.2, 11.8), V(x + 1.4, 16.8, 12.2)), M.dark); }
    for (let k = 0; k < 7; k++) ob.add(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), M.post, at(-6.9 + k * 2.3, 7.2, 13.4));
    ob.build(this.olympic);
    for (const [k, txt] of [[0, "2.00 m"], [1, "2.24 m"]] as const) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: board(txt), color: 0xe6e6e6 }));
      m.position.set(-6.0, 4.0, 5.55); m.rotation.y = Math.PI; m.layers.set(NOINK); this.boards.push(m); this.olympic.add(m);
    }
    const lamps = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.3) });
    for (const x of [-11, 11]) { const l = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.05), lamps); l.position.set(x, 16, 11.75); l.layers.set(NOINK); this.olympic.add(l); }
    for (let k = 0; k < 7; k++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7, 10, 1), lam("flagM" + k, () => ({ map: flagTex(k), side: THREE.DoubleSide })));
      f.position.set(-6.9 + k * 2.3, 8.05, 13.4); f.castShadow = true; f.frustumCulled = false; this.flags.push(f); this.olympic.add(f);
    }
    const penG = new THREE.BufferGeometry(); penG.setAttribute("position", new THREE.Float32BufferAttribute([-0.14, 0, 0, 0.14, 0, 0, 0, -0.32, 0], 3)); penG.computeVertexNormals();
    const cols = ["#e43b3b", "#f6d23c", "#2f7fd0", "#29a35a", "#ffffff"];
    for (let k = 0; k < 40; k++) { const x = -7.8 + k * 0.4, m = new THREE.Mesh(penG, lam("pen" + (k % 5), () => ({ color: cols[k % 5], side: THREE.DoubleSide }))); m.position.set(x, 5.75 - 0.3 * Math.sin((k / 39) * Math.PI), 7.7); this.olympic.add(m); }
    R.add(this.olympic);
    void smokeTex;
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
    const bk = barKnock(id, t);
    this.bar.position.set(0, barH(id, t) - bk.drop, bk.dz); this.bar.rotation.set(bk.spin * 0.6, 0, bk.spin * 0.25);
    this.olympic.visible = s.olympic;
    this.boards[0].visible = t < RISE_T + 0.25 && id === 5; this.boards[1].visible = !this.boards[0].visible;
    for (const fl of this.flags) {
      const p = fl.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const u = (i % 11) / 10, y = i < 11 ? 0.35 : -0.35; p.setXYZ(i, u * 1.1 - 0.0, y + 0.04 * u * Math.sin(t * 4 - u * 3), 0.16 * u * Math.sin(t * 5.5 - u * 5 + fl.position.x)); }
      p.needsUpdate = true;
    }    // ---- cast + effects (template loop) ----
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
