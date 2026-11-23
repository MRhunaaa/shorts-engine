// TRUE-3D version of Character Rig v3 (vault: "Character Rig v3 - Official Spec"). Every part is a real mesh, built
// symmetric by construction (each left part is the exact mirror of the right one). Units: metres, feet at y = 0,
// face looks +z. Geometry from the approved 2D card: 1 card px = K m (522 px head-top..feet = 1.70 m).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const K = 1.7 / 522;
export const HEAD_R = 92 * K;            // 0.300
export const HEAD_Y = (640 - 210) * K;   // 1.400
export const BODY_W = 136 * K, BODY_H = 200 * K, BODY_D = 0.34;
export const BODY_Y = (640 - 396) * K;   // body centre 0.795
export const SH_X = 62 * K, SH_Y = (640 - 336) * K; // shoulders
export const HIP_X = 0.085, HIP_Y = (640 - 488) * K; // 0.495
export const INK = "#1a1418";

export type V3 = [number, number, number];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materials ----------------
const mats = new Map<string, THREE.Material>();
export const mat = (hex: string, rough = 0.78, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
  const key = hex + rough + JSON.stringify(opts);
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, ...opts }); mats.set(key, m); }
  return m;
};
export const metalMat = (hex: string) => mat(hex, 0.32, { metalness: 0.85 });
export const glow = (hex: string, k = 3) => mat(hex, 1, { emissive: new THREE.Color(hex), emissiveIntensity: k });

export const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p?: V3, parent?: THREE.Object3D) => {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true; o.receiveShadow = true;
  if (p) o.position.set(...p);
  if (parent) parent.add(o);
  return o;
};

/** tube along a smooth curve with a radius profile r(t): moustaches, whiskers, hair locks, piping, chains */
export function taper(pts: THREE.Vector3[], r: (t: number) => number, seg = 32, radial = 12, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, "centripetal");
  const frames = curve.computeFrenetFrames(seg, closed);
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, c = curve.getPointAt(t), rr = Math.max(1e-4, r(t));
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
      const n = v(N.x * cs + B.x * sn, N.y * cs + B.y * sn, N.z * cs + B.z * sn);
      pos.push(c.x + n.x * rr, c.y + n.y * rr, c.z + n.z * rr); nor.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** point on the head sphere from approved-card face coords (px from head centre, +u right, +v down), lifted by `lift` m */
export const onHead = (u: number, vv: number, lift = 0) => {
  const x = (u * K) / HEAD_R, y = (-vv * K) / HEAD_R, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return v(x, y, z).multiplyScalar(HEAD_R + lift);
};
/** orient an object so its +z points along the head normal at its position (sits flat on the face) */
const faceOut = (o: THREE.Object3D) => { const n = o.position.clone().normalize(); o.quaternion.setFromUnitVectors(v(0, 0, 1), n); };

// ---------------- outfit description ----------------
export type Brows = "calm" | "angry" | "sad" | "raised" | "worry" | "smug";
export type Mouth = "smile" | "frown" | "o" | "flat" | "grin" | "open";
export type Look = {
  skin?: string;
  hair?: string; hairStyle?: "bald-sides" | "full" | "bun" | "none";
  whiskers?: "mutton" | "side" | "none"; moustache?: "handlebar" | "walrus" | "pencil" | "none"; beard?: boolean;
  glasses?: "round" | "monocle" | "none";
  coat?: string; vest?: string; shirt?: string; cravat?: string; cravatStyle?: "bow" | "stock";
  trousers?: string; shoes?: string;
  dress?: string; apron?: string; cap?: "mob" | "none"; shawl?: string; gown?: boolean;
  watch?: boolean; skirt?: "frock" | "dress" | "gown" | "none";
  shirtSleeves?: boolean;
};

export type Pose = {
  x: number; z: number; yaw: number; y?: number;
  walk?: number;          // walk phase in cycles (0 = standing)
  stride?: number;        // 0..1 amount of stride
  lean?: number; tilt?: number;  // body pitch forward, body roll
  headYaw?: number; headPitch?: number; headRoll?: number;
  brows?: Brows; mouth?: Mouth; mouthOpen?: number;
  eyes?: [number, number]; blink?: number; eyeScale?: number;
  armL?: V3 | ArmName; armR?: V3 | ArmName;   // hand target in body space (from body centre), or a named pose
  squash?: number;        // vertical squash/stretch of the whole figure (1 = none)
  hidden?: boolean;
  seat?: number;          // sitting: hip height in m (feet stay on the floor in front)
  noLegs?: boolean;       // legs hidden (under a blanket)
  germs?: number;         // 0..1 glowing germs on the hands
};
export type ArmName = "hang" | "hips" | "point" | "up" | "scrub" | "head" | "front" | "shrug" | "fold" | "out" | "chin" | "wave";

const ARM: Record<ArmName, V3> = {
  hang: [0.29, -0.36, 0.02], hips: [0.25, -0.12, 0.05], point: [0.33, 0.14, 0.46], up: [0.3, 0.62, 0.12],
  scrub: [0.06, -0.06, 0.33], head: [0.27, 0.6, 0.12], front: [0.13, -0.02, 0.38], shrug: [0.4, 0.06, 0.18],
  fold: [-0.06, 0.0, 0.24], out: [0.55, 0.02, 0.1], chin: [0.08, 0.38, 0.32], wave: [0.42, 0.55, 0.08],
};

/** two-bone limb (cylinder + cylinder + ball joints) solved toward a target with a pole */
class Limb {
  a: THREE.Mesh; b: THREE.Mesh; j: THREE.Mesh; end: THREE.Mesh;
  constructor(parent: THREE.Object3D, public l1: number, public l2: number, r: number, m: THREE.Material, endGeo: THREE.BufferGeometry, endMat: THREE.Material) {
    const cyl = new THREE.CylinderGeometry(r, r, 1, 14, 1, true);
    cyl.translate(0, 0.5, 0);
    this.a = mesh(cyl, m, undefined, parent); this.b = mesh(cyl, m, undefined, parent);
    this.j = mesh(new THREE.SphereGeometry(r, 14, 10), m, undefined, parent);
    this.end = mesh(endGeo, endMat, undefined, parent);
    mesh(new THREE.SphereGeometry(r, 14, 10), m, undefined, this.a); // root cap
  }
  solve(root: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3) {
    const d = target.clone().sub(root); let L = d.length();
    const max = (this.l1 + this.l2) * 0.999;
    if (L > max) { d.multiplyScalar(max / L); L = max; }
    const dir = d.clone().normalize();
    const a = (this.l1 * this.l1 - this.l2 * this.l2 + L * L) / (2 * L);
    const h = Math.sqrt(Math.max(0, this.l1 * this.l1 - a * a));
    const side = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const elbow = root.clone().addScaledVector(dir, a).addScaledVector(side, h);
    const end = root.clone().add(d);
    const place = (o: THREE.Object3D, p: THREE.Vector3, q: THREE.Vector3) => {
      const s = q.clone().sub(p); o.position.copy(p); o.scale.set(1, s.length(), 1);
      o.quaternion.setFromUnitVectors(v(0, 1, 0), s.normalize());
    };
    place(this.a, root, elbow); place(this.b, elbow, end);
    this.j.position.copy(elbow); this.end.position.copy(end);
    return { elbow, end };
  }
}

export class Character {
  root = new THREE.Group();   // world placement
  body = new THREE.Group();   // pitch/roll/squash pivot at the hips
  torso = new THREE.Group();
  head = new THREE.Group();
  eyes: THREE.Group[] = [];
  brows: THREE.Mesh[] = [];
  mouths: Record<string, THREE.Object3D> = {};
  arms: Limb[] = []; legs: Limb[] = [];
  tails: THREE.Object3D[] = [];
  skirt?: THREE.Mesh;
  props = new THREE.Group();  // attached to the right hand
  propsL = new THREE.Group(); // attached to the left hand
  germs: THREE.Group[] = [];
  look: Look;
  constructor(look: Look) {
    this.look = look;
    this.root.add(this.body);
    this.body.add(this.torso);
    this.torso.add(this.head);
    this.head.position.set(0, HEAD_Y, 0);
    this.build();
  }

  private build() {
    const L = this.look, T = this.torso, H = this.head;
    const skin = L.skin ?? "#f7f1e8";
    const long = L.skirt === "dress" || L.skirt === "gown";
    // ---- head: perfect sphere, cream, soft ----
    mesh(new THREE.SphereGeometry(HEAD_R, 64, 48), mat(skin, 0.62), [0, 0, 0], H);
    // eyes: black ovals 8.5 x 12 px at +-31 px, white glint top-left (identical on both sides)
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); H.add(g);
      g.position.copy(onHead(31 * s, -4, 0.002)); faceOut(g);
      mesh(new THREE.SphereGeometry(1, 20, 14), mat("#0d0b0e", 0.3), [0, 0, 0], g).scale.set(8.5 * K, 12 * K, 0.006);
      const gl = mesh(new THREE.SphereGeometry(1, 10, 8), mat("#ffffff", 0.2, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.6 }), [-3 * K, 4.5 * K, 0.005], g);
      gl.scale.set(2.6 * K, 2.6 * K, 0.002);
      this.eyes.push(g);
    }
    // brows: capsules lying on the face, 9 px thick
    const browCol = L.hair && L.hairStyle !== "none" ? L.hair : INK;
    for (const s of [-1, 1]) {
      const b = mesh(new THREE.CapsuleGeometry(4.5 * K, 26 * K, 6, 12), mat(browCol, 0.8), undefined, H);
      b.userData.side = s; this.brows.push(b);
    }
    // mouths (one shown at a time)
    const mInk = mat("#1a1012", 0.6);
    const arc = (sign: number, w = 22, d = 7) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8 - 0.5; pts.push(onHead(t * 2 * w, 44 + sign * d * (1 - 4 * t * t), 0.003)); }
      return mesh(taper(pts, () => 3.6 * K, 16, 8), mInk, undefined, H);
    };
    this.mouths.smile = arc(1); this.mouths.frown = arc(-1); this.mouths.flat = arc(0, 18, 0); this.mouths.grin = arc(1, 30, 11);
    const o = new THREE.Group(); H.add(o); o.position.copy(onHead(0, 46, 0.001)); faceOut(o);
    mesh(new THREE.SphereGeometry(1, 20, 14), mat("#2a1216", 0.5), [0, 0, 0], o).scale.set(9 * K, 12 * K, 0.004);
    mesh(new THREE.SphereGeometry(1, 16, 10), mat("#c45a63", 0.6), [0, -5 * K, 0.002], o).scale.set(5.5 * K, 4 * K, 0.002);
    this.mouths.o = o; this.mouths.open = o;
    // ---- hair ----
    if (L.hair && L.hairStyle !== "none") this.hair(L.hair, L.hairStyle ?? "full");
    if (L.whiskers && L.whiskers !== "none") this.whiskers(L.hair ?? "#3a2a20", L.whiskers);
    if (L.beard) this.beard(L.hair ?? "#3a2a20");
    if (L.moustache && L.moustache !== "none") this.moustache(L.hair ?? "#3a2a20", L.moustache);
    if (L.glasses && L.glasses !== "none") this.glasses(L.glasses);
    if (L.cap === "mob") this.mobCap();

    // ---- body: rounded rectangle prism (approved 136 x 200, r 44 px) ----
    const bodyCol = long ? L.dress ?? "#8a8f9c" : L.shirtSleeves ? L.vest ?? "#5a2430" : L.coat ?? "#22222c";
    const bodyGeo = new RoundedBoxGeometry(BODY_W, BODY_H, BODY_D, 6, 0.1);
    mesh(bodyGeo, mat(bodyCol, 0.85), [0, BODY_Y, 0], T);
    const zf = BODY_D / 2 + 0.001;
    if (!long) this.gentleman(zf);
    else this.lady(zf);

    // ---- skirts ----
    if (L.skirt === "frock") {
      // knee-length frock-coat skirt (closed front, 1840s), with the two back vents as separate swinging tails
      const g = new THREE.CylinderGeometry(0.205, 0.255, 0.26, 40, 1, true); g.scale(1, 1, 0.78);
      this.skirt = mesh(g, mat(L.coat ?? "#22222c", 0.85, { side: THREE.DoubleSide }), [0, BODY_Y - BODY_H / 2 - 0.08, 0], T);
      for (const s of [-1, 1]) {
        const t = new THREE.Group(); T.add(t); t.position.set(0.055 * s, BODY_Y - BODY_H / 2 + 0.04, -0.15);
        const tail = mesh(new RoundedBoxGeometry(0.1, 0.4, 0.025, 3, 0.012), mat(L.coat ?? "#22222c", 0.85), [0, -0.2, 0], t);
        tail.userData.s = s;
        mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 16), metalMat("#c9a64a"), [0, 0.15, -0.015], tail).rotation.x = Math.PI / 2;
        this.tails.push(t);
      }
    } else if (long) {
      const g = new THREE.CylinderGeometry(0.2, 0.36, 0.5, 48, 6, true); g.scale(1, 1, 0.82);
      // soft vertical folds
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = (0.25 - y) / 0.5;
        const f = 1 + 0.035 * k * Math.sin(a * 12);
        p.setXYZ(i, x * f, y, z * f);
      }
      g.computeVertexNormals();
      this.skirt = mesh(g, mat(L.dress ?? "#8a8f9c", 0.9, { side: THREE.DoubleSide }), [0, 0.3, 0], T);
      // hem band
      const hem = new THREE.TorusGeometry(0.36, 0.012, 8, 64); hem.rotateX(Math.PI / 2); hem.scale(1, 1, 0.82);
      mesh(hem, mat(shade(L.dress ?? "#8a8f9c", 0.7), 0.9), [0, 0.06, 0], T);
      if (L.apron) {
        const ap = new THREE.CylinderGeometry(0.205, 0.35, 0.44, 24, 1, true, -0.75, 1.5); ap.scale(1, 1, 0.84);
        mesh(ap, mat(L.apron, 0.9, { side: THREE.DoubleSide }), [0, 0.32, 0.006], T);
        mesh(new RoundedBoxGeometry(0.19, 0.22, 0.012, 3, 0.02), mat(L.apron, 0.9), [0, BODY_Y + 0.02, zf + 0.004], T);
        for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.02, 0.2, 0.01), mat(L.apron, 0.9), [0.085 * s, BODY_Y + 0.2, zf - 0.01], T).rotation.z = 0.2 * s;
      }
    }

    // ---- limbs (ink sticks, 8 / 9 px), dot hands, shoes ----
    const ink = mat(INK, 0.55);
    const hand = new THREE.SphereGeometry(11 * K, 18, 14);
    for (let i = 0; i < 2; i++) {
      const limb = new Limb(T, 0.26, 0.27, 4 * K, ink, hand, ink);
      mesh(new THREE.SphereGeometry(1, 8, 6), mat("#ffffff", 0.2), [-0.012, 0.012, 0.02], limb.end).scale.setScalar(0.006);
      this.arms.push(limb);
    }
    this.arms[1].end.add(this.props); this.arms[0].end.add(this.propsL);
    const shoeGeo = new RoundedBoxGeometry(0.095, 0.06, 0.16, 3, 0.028); shoeGeo.translate(0, 0.03, 0.035);
    const shoe = mat(L.shoes ?? "#1b1514", 0.35);
    for (let i = 0; i < 2; i++) {
      const legMat = long ? ink : mat(L.trousers ?? INK, 0.8);
      const limb = new Limb(this.root, 0.25, 0.25, (long ? 4.5 : 6) * K, legMat, shoeGeo, shoe);
      this.legs.push(limb);
    }
    // germs on the hands (hidden unless enabled): tiny glowing green specks, the story's "cadaverous particles"
    for (let i = 0; i < 2; i++) {
      const gg = new THREE.Group(); this.arms[i].end.add(gg);
      for (let k = 0; k < 9; k++) {
        const a = k * 2.4, r = 0.042 + 0.012 * Math.sin(k * 1.7);
        const s = mesh(new THREE.IcosahedronGeometry(0.008 + 0.004 * ((k * 7) % 3) / 2, 0), glow("#7dff5a", 2.5), [Math.cos(a) * r, Math.sin(a * 1.3) * r, Math.sin(a) * r]);
        s.castShadow = false; gg.add(s);
      }
      gg.visible = false; this.germs.push(gg);
      gg.userData.hand = i;
    }
  }

  // ---------------- outfit builders ----------------
  private gentleman(zf: number) {
    const L = this.look, T = this.torso;
    const top = BODY_Y + BODY_H / 2;
    const coat = L.coat ?? "#22222c";
    // shirt front + collar points + cravat (always visible under the chin)
    const shirt = mat(L.shirt ?? "#f4f1ea", 0.8);
    const vGeo = new THREE.ShapeGeometry(tri(0.11, 0.17));
    const vee = mesh(vGeo, shirt, [0, top - 0.02, zf + 0.002], T);
    for (const s of [-1, 1]) {
      const c = mesh(new THREE.ShapeGeometry(tri(0.05, 0.065)), shirt, [0.028 * s, top - 0.035, zf + 0.006], T);
      c.rotation.z = 0.5 * s; c.rotation.x = -0.25;
    }
    vee.renderOrder = 1;
    if (L.cravatStyle === "stock") {
      mesh(new RoundedBoxGeometry(0.1, 0.05, 0.03, 3, 0.012), mat(L.cravat ?? "#f2efe6", 0.75), [0, top - 0.06, zf + 0.012], T);
      mesh(new RoundedBoxGeometry(0.05, 0.08, 0.025, 3, 0.012), mat(L.cravat ?? "#f2efe6", 0.75), [0, top - 0.11, zf + 0.012], T);
    } else {
      // bow: two mirrored lobes + knot
      const cm = mat(L.cravat ?? "#141216", 0.6);
      for (const s of [-1, 1]) {
        const lobe = mesh(new THREE.SphereGeometry(1, 16, 12), cm, [0.03 * s, top - 0.065, zf + 0.012], T);
        lobe.scale.set(0.032, 0.02, 0.012); lobe.rotation.z = 0.25 * s;
      }
      mesh(new THREE.SphereGeometry(0.013, 12, 10), cm, [0, top - 0.065, zf + 0.018], T);
    }
    // waistcoat panel, 5 buttons, watch chain
    if (!L.shirtSleeves) {
      const vest = mat(L.vest ?? "#5a2430", 0.8);
      const vs = new THREE.Shape(); vs.moveTo(-0.07, 0.0); vs.lineTo(0.07, 0.0); vs.lineTo(0.075, -0.33); vs.lineTo(0, -0.37); vs.lineTo(-0.075, -0.33); vs.closePath();
      mesh(new THREE.ShapeGeometry(vs), vest, [0, top - 0.1, zf + 0.001], T);
      for (let i = 0; i < 5; i++) button(T, [0, top - 0.14 - i * 0.05, zf + 0.004], 0.009, L.watch ? "#c9a64a" : "#18141a", L.watch === true);
      // lapels of the coat: extruded, mirrored, with a notch and edge stitching
      for (const s of [-1, 1]) {
        const ls = new THREE.Shape();
        ls.moveTo(0, 0); ls.lineTo(0.05, 0.0); ls.lineTo(0.035, -0.06); ls.lineTo(0.06, -0.08); ls.lineTo(0.0, -0.36); ls.lineTo(-0.02, -0.36); ls.closePath();
        const g = new THREE.ExtrudeGeometry(ls, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
        if (s < 0) { g.scale(-1, 1, 1); flipFaces(g); }
        mesh(g, mat(shade(coat, 1.18), 0.7), [0.075 * s, top - 0.035, zf - 0.004], T);
      }
      if (L.watch) {
        const pts = [v(-0.065, top - 0.27, zf + 0.008), v(-0.03, top - 0.31, zf + 0.012), v(0, top - 0.3, zf + 0.012), v(0.035, top - 0.32, zf + 0.012), v(0.07, top - 0.29, zf + 0.008)];
        mesh(taper(pts, () => 0.0035, 40, 6), metalMat("#d8b45a"), undefined, T);
        mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 20), metalMat("#d8b45a"), [0.075, top - 0.295, zf + 0.006], T).rotation.x = Math.PI / 2;
      }
      // pocket square on the left chest (wearer's left = +x when facing +z? wearer's left is +x)
      const ps = new THREE.Shape(); ps.moveTo(-0.025, 0); ps.lineTo(-0.012, 0.03); ps.lineTo(0, 0.012); ps.lineTo(0.013, 0.032); ps.lineTo(0.025, 0); ps.closePath();
      mesh(new THREE.ShapeGeometry(ps), mat("#f4f1ea", 0.8), [0.15, top - 0.15, zf + 0.004], T);
      mesh(new THREE.BoxGeometry(0.06, 0.006, 0.006), mat(shade(coat, 0.6), 0.8), [0.15, top - 0.15, zf + 0.003], T);
      // coat front buttons (double row each side of the vest, 1840s frock coat)
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) button(T, [0.125 * s, top - 0.27 - i * 0.075, zf + 0.002], 0.011, "#121014", false);
      // waist seam
      mesh(new THREE.BoxGeometry(BODY_W - 0.02, 0.006, 0.004), mat(shade(coat, 0.7), 0.8), [0, top - 0.46, zf + 0.001], T);
    } else {
      // shirt sleeves: just the waistcoat (body colour) with buttons + braces hint
      for (let i = 0; i < 5; i++) button(T, [0, top - 0.14 - i * 0.05, zf + 0.004], 0.009, "#18141a", false);
    }
  }

  private lady(zf: number) {
    const L = this.look, T = this.torso;
    const top = BODY_Y + BODY_H / 2;
    if (L.shawl) {
      for (const s of [-1, 1]) {
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.12, 0); sh.lineTo(0.0, -0.3); sh.closePath();
        const g = new THREE.ShapeGeometry(sh); if (s < 0) { g.scale(-1, 1, 1); flipFaces(g); }
        mesh(g, mat(L.shawl, 0.92, { side: THREE.DoubleSide }), [0.105 * s, top - 0.01, zf + 0.003], T);
      }
    }
    // lace collar (scalloped ring) + small buttons
    const col = new THREE.TorusGeometry(0.075, 0.012, 8, 28, Math.PI); col.rotateZ(Math.PI);
    mesh(col, mat("#f6f2ea", 0.85), [0, top - 0.02, zf - 0.006], T);
    for (let i = 0; i < 4; i++) button(T, [0, top - 0.08 - i * 0.055, zf + 0.004], 0.0075, "#e8e2d6", false);
    if (L.gown) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.004, 0.16, 0.004), mat(shade(L.dress ?? "#ffffff", 0.85), 0.9), [s * (0.03 + i * 0.012), top - 0.12, zf + 0.001], T); // pintucks
  }

  private hair(col: string, style: string) {
    const H = this.head, m = mat(col, 0.85);
    if (style === "bald-sides") {
      // horseshoe of hair: back + sides, bald crown/front (Semmelweis's receding hairline)
      const g = new THREE.SphereGeometry(HEAD_R * 1.025, 48, 24, Math.PI - 0.55, Math.PI + 1.1, 0.34 * Math.PI, 0.3 * Math.PI);
      mesh(g, m, [0, 0, 0], H);
    } else if (style === "full") {
      const g = new THREE.SphereGeometry(HEAD_R * 1.03, 48, 24, 0, Math.PI * 2, 0, 0.36 * Math.PI);
      mesh(g, m, [0, 0, 0], H).rotation.x = -0.32;
      // side part locks (mirrored)
      for (const s of [-1, 1]) {
        const pts = [onHead(-6 * s, -78, 0.012), onHead(30 * s, -74, 0.014), onHead(62 * s, -56, 0.01)];
        mesh(taper(pts, (t) => 0.018 * (1 - 0.6 * t), 20, 10), m, undefined, H);
      }
    } else if (style === "bun") {
      const g = new THREE.SphereGeometry(HEAD_R * 1.03, 48, 24, 0, Math.PI * 2, 0, 0.42 * Math.PI);
      mesh(g, m, [0, 0, 0], H).rotation.x = -0.25;
      mesh(new THREE.SphereGeometry(0.085, 24, 16), m, [0, 0.12, -0.27], H);
      // centre parting
      mesh(taper([onHead(0, -88, 0.012), onHead(0, -70, 0.012)], () => 0.004, 8, 6), mat(shade(col, 0.6), 0.9), undefined, H);
    }
  }
  private whiskers(col: string, kind: string) {
    const H = this.head, m = mat(col, 0.85);
    for (const s of [-1, 1]) {
      const big = kind === "mutton";
      const pts = [onHead(80 * s, -30, 0.004), onHead(84 * s, 4, 0.008), onHead((big ? 76 : 80) * s, 34, big ? 0.012 : 0.008), onHead((big ? 58 : 66) * s, big ? 58 : 52, big ? 0.01 : 0.006)];
      mesh(taper(pts, (t) => (big ? 0.014 + 0.02 * Math.sin(t * Math.PI) : 0.012 * (1 - 0.5 * t)), 28, 12), m, undefined, H);
    }
  }
  private beard(col: string) {
    const H = this.head, m = mat(col, 0.88);
    // full beard: a shell over the lower front of the head (jaw + chin), slightly pointed at the chin
    const g = new THREE.SphereGeometry(HEAD_R * 1.06, 48, 24, 0, Math.PI, 0.6 * Math.PI, 0.4 * Math.PI);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y < 0) p.setY(i, y - 0.05 * Math.max(0, z / HEAD_R) * (-y / HEAD_R)); }
    g.computeVertexNormals();
    mesh(g, m, [0, 0, 0], H);
  }
  /** moustaches are built from ONE side curve and its exact mirror, attached to the face surface */
  private moustache(col: string, kind: string) {
    const H = this.head, m = mat(col, 0.82);
    for (const s of [-1, 1]) {
      let pts: THREE.Vector3[], r: (t: number) => number;
      if (kind === "handlebar") {
        // starts past the centre line (-3 px) so the two halves overlap into one solid moustache, full body, waxed tips curled up
        pts = [onHead(-3 * s, 30, 0.016), onHead(12 * s, 31, 0.022), onHead(26 * s, 35, 0.02), onHead(38 * s, 37, 0.013), onHead(47 * s, 31, 0.008), onHead(49 * s, 22, 0.006)];
        r = (t) => 0.005 + 0.016 * Math.sin(Math.min(1, 0.18 + t * 1.15) * Math.PI) ** 0.9;
      } else if (kind === "walrus") {
        pts = [onHead(-3 * s, 29, 0.016), onHead(16 * s, 31, 0.024), onHead(30 * s, 39, 0.022), onHead(37 * s, 52, 0.012)];
        r = (t) => 0.009 + 0.016 * Math.sin(Math.min(1, 0.3 + t * 0.8) * Math.PI);
      } else {
        pts = [onHead(2 * s, 34, 0.008), onHead(14 * s, 34, 0.009), onHead(26 * s, 35, 0.007)];
        r = (t) => 0.0035 + 0.004 * Math.sin(t * Math.PI);
      }
      mesh(taper(pts, r, 32, 12), m, undefined, H);
    }
  }
  private glasses(kind: string) {
    const H = this.head, gm = metalMat("#c9a64a");
    const sides = kind === "monocle" ? [1] : [-1, 1];
    for (const s of sides) {
      const g = new THREE.Group(); H.add(g); g.position.copy(onHead(31 * s, -4, 0.022)); faceOut(g);
      mesh(new THREE.TorusGeometry(0.036, 0.0035, 8, 32), gm, [0, 0, 0], g);
      const lens = mesh(new THREE.CircleGeometry(0.035, 32), mat("#cfe6ff", 0.05, { transparent: true, opacity: 0.18, metalness: 0.2 }), [0, 0, 0], g);
      lens.castShadow = false;
    }
    if (kind === "round") {
      mesh(taper([onHead(-12, -8, 0.026), onHead(0, -12, 0.03), onHead(12, -8, 0.026)], () => 0.003, 10, 6), gm, undefined, H);
      for (const s of [-1, 1]) mesh(taper([onHead(53 * s, -6, 0.02), onHead(84 * s, -8, 0.008), v(HEAD_R * 0.98 * s, 0.0, -0.05)], () => 0.0028, 12, 6), gm, undefined, H);
    } else {
      // monocle cord
      mesh(taper([onHead(56, 4, 0.02), onHead(64, 40, 0.01), v(0.2, -0.3, 0.12)], () => 0.0018, 16, 5), mat("#111", 0.6), undefined, H);
    }
  }
  private mobCap() {
    const H = this.head, m = mat("#f7f4ee", 0.9);
    const cap = new THREE.SphereGeometry(HEAD_R * 1.07, 48, 24, 0, Math.PI * 2, 0, 0.42 * Math.PI);
    // puffy gathers
    const p = cap.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), f = 1 + 0.025 * Math.sin(a * 14) * (1 - y / (HEAD_R * 1.07));
      p.setXYZ(i, x * f, y, z * f);
    }
    cap.computeVertexNormals();
    const cm = mesh(cap, m, [0, 0.0, -0.01], H); cm.rotation.x = -0.35;
    // ruffled frill exactly on the cap's rim, ribbon just above it (children of the cap, so they stay seated)
    const R = HEAD_R * 1.07, yr = R * Math.cos(0.42 * Math.PI), rr = R * Math.sin(0.42 * Math.PI);
    const fr = new THREE.TorusGeometry(rr + 0.004, 0.017, 8, 72);
    const q = fr.attributes.position;
    for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), a = Math.atan2(y, x); q.setZ(i, q.getZ(i) + 0.009 * Math.sin(a * 36)); }
    fr.computeVertexNormals();
    mesh(fr, m, [0, yr, 0], cm).rotation.x = Math.PI / 2;
    const y2 = yr + 0.045, r2 = Math.sqrt(R * R - y2 * y2) + 0.004;
    mesh(new THREE.TorusGeometry(r2, 0.008, 6, 72), mat("#9fb8d8", 0.7), [0, y2, 0], cm).rotation.x = Math.PI / 2;
  }

  // ---------------- per-frame pose ----------------
  pose(p: Pose, t: number) {
    const r = this.root;
    r.visible = !p.hidden;
    if (p.hidden) return;
    r.position.set(p.x, p.y ?? 0, p.z); r.rotation.set(0, p.yaw, 0);
    const walk = p.walk ?? 0, stride = p.stride ?? (walk ? 1 : 0);
    const ph = walk * Math.PI * 2;
    const bob = stride * 0.025 * Math.abs(Math.sin(ph));
    const sq = p.squash ?? 1;
    const seatOff = p.seat !== undefined ? p.seat - HIP_Y : 0;
    this.body.position.set(0, bob + seatOff, 0);
    this.body.rotation.set((p.lean ?? 0) + stride * 0.06, 0, (p.tilt ?? 0) + stride * 0.03 * Math.sin(ph));
    this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    // breathing
    this.torso.scale.set(1, 1 + 0.008 * Math.sin(t * 2.4), 1);
    // head
    this.head.rotation.set(p.headPitch ?? 0, p.headYaw ?? 0, p.headRoll ?? 0, "YXZ");
    // eyes: look + blink
    const blink = Math.max(p.blink ?? 0, autoBlink(t + this.look.skin!.length * 0.37));
    const [ex, ey] = p.eyes ?? [0, 0];
    this.eyes.forEach((e, i) => {
      const s = i ? 1 : -1;
      e.position.copy(onHead(31 * s + ex * 7, -4 - ey * 6, 0.002)); faceOut(e);
      const es = p.eyeScale ?? 1;
      e.scale.set(es, Math.max(0.08, 1 - blink) * es, 1);
    });
    // brows: position/rotation by expression (mirrored)
    const B: Record<Brows, [number, number]> = { calm: [-30, 0.08], angry: [-24, -0.42], sad: [-28, 0.4], raised: [-42, 0.12], worry: [-36, 0.32], smug: [-34, -0.15] };
    const [bv, ba] = B[p.brows ?? "calm"];
    this.brows.forEach((b) => {
      const s = b.userData.side as number;
      const smugTweak = p.brows === "smug" && s < 0 ? -8 : 0;
      b.position.copy(onHead(31 * s, bv + smugTweak, 0.006)); faceOut(b);
      b.rotateZ(Math.PI / 2 - ba * s);
    });
    // mouth
    for (const k in this.mouths) this.mouths[k].visible = false;
    const mk = p.mouth ?? "flat";
    this.mouths[mk].visible = true;
    if (mk === "o" || mk === "open") { const o = this.mouths.o; const k = mk === "o" ? 0.8 : 0.4 + 0.8 * (p.mouthOpen ?? 0.6); o.scale.set(1, k, 1); }
    // skirt / coat tails swing
    if (this.skirt) this.skirt.rotation.set(0.05 * stride * Math.sin(ph), 0, 0.04 * stride * Math.sin(ph));
    this.tails.forEach((tl, i) => { tl.rotation.x = 0.18 * stride * Math.max(0, Math.sin(ph + i * Math.PI)) + 0.04 * Math.sin(t * 1.7 + i); });
    this.root.updateMatrixWorld(true);
    // ---- arms (in torso space) ----
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1;
      const a = (i ? p.armR : p.armL) ?? "hang";
      let tg: V3 = typeof a === "string" ? ARM[a] : a;
      if (a === "scrub") tg = [0.06 + 0.035 * Math.sin(t * 22 + i * Math.PI), -0.06 + 0.02 * Math.cos(t * 22), 0.33];
      if (a === "wave") tg = [0.42, 0.55, 0.08 + 0.12 * Math.sin(t * 14)];
      const swing = typeof a === "string" && a === "hang" ? 0.12 * stride * Math.sin(ph + (i ? 0 : Math.PI)) : 0;
      const sh = v(SH_X * s, SH_Y, 0);
      const target = v(tg[0] * s, BODY_Y + tg[1], tg[2] + swing);
      const pole = v(0.6 * s, -0.5, -0.6);
      this.arms[i].solve(sh, target, pole);
    }
    // ---- legs (in root space, hips follow the body bob) ----
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1;
      const q = ph + (i ? Math.PI : 0);
      const fz = stride * 0.17 * Math.sin(q), lift = stride * 0.07 * Math.max(0, Math.cos(q));
      const lg = this.legs[i];
      [lg.a, lg.b, lg.j, lg.end].forEach((o) => (o.visible = !p.noLegs));
      if (p.noLegs) continue;
      if (p.seat !== undefined) {
        const hip = v(HIP_X * s, p.seat, 0);
        lg.solve(hip, v(0.11 * s, 0, Math.min(0.42, Math.sqrt(Math.max(0.01, 0.245 - p.seat * p.seat)) + 0.04)), v(0, 0.3, 1));
      } else {
        lg.solve(v(HIP_X * s, HIP_Y + bob, 0), v(0.095 * s, lift, fz), v(0, 0, 1));
      }
      lg.end.quaternion.identity();
    }
    this.setGerms(p.germs ?? 0, t);
  }
  setGerms(k: number, t = 0) {
    this.germs.forEach((g, i) => {
      g.visible = k > 0.01; g.rotation.set(t * 2 + i, t * 3, 0);
      const pulse = 1 + 0.15 * Math.sin(t * 9 + i);
      g.scale.setScalar(Math.max(0.001, k) * pulse);
    });
  }
}

// ---------------- helpers ----------------
const autoBlink = (t: number) => { const c = (t % 3.3) / 3.3; return c > 0.955 ? Math.sin(((c - 0.955) / 0.045) * Math.PI) : 0; };
export const shade = (hex: string, k: number) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return "#" + c.getHexString(); };
const tri = (w: number, h: number) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, -h); s.closePath(); return s; };
function flipFaces(g: THREE.BufferGeometry) {
  const ix = g.index;
  if (ix) { for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i); ix.setX(i, ix.getX(i + 2)); ix.setX(i + 2, a); } }
  else { const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i += 3) { for (let k = 0; k < 3; k++) { const a = p.getComponent(i, k); p.setComponent(i, k, p.getComponent(i + 2, k)); p.setComponent(i + 2, k, a); } } }
  g.computeVertexNormals();
}
/** 4-hole button with a bevel; brass ones get the metal material */
export function button(parent: THREE.Object3D, p: V3, r: number, col: string, brass: boolean) {
  const b = mesh(new THREE.CylinderGeometry(r, r * 0.92, r * 0.5, 20), brass ? metalMat(col) : mat(col, 0.4), p, parent);
  b.rotation.x = Math.PI / 2;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const h = mesh(new THREE.CylinderGeometry(r * 0.15, r * 0.15, r * 0.52, 6), mat("#050405", 0.9), [dx * r * 0.32, 0.001, dy * r * 0.32], b);
    h.castShadow = false;
  }
  return b;
}

// ---------------- cast ----------------
export const LOOKS: Record<string, Look> = {
  semmel: { skin: "#f7f1e8", hair: "#4a3324", hairStyle: "bald-sides", whiskers: "side", moustache: "handlebar", coat: "#23232d", vest: "#6b2632", cravat: "#141216", trousers: "#2b2a33", watch: true, skirt: "frock" },
  semmelAsy: { skin: "#f2ece2", hair: "#6d6258", hairStyle: "bald-sides", whiskers: "side", moustache: "handlebar", vest: "#7a7468", shirtSleeves: true, cravat: "#e9e4d8", cravatStyle: "stock", trousers: "#5c5850", skirt: "none" },
  klein: { skin: "#f5efe5", hair: "#cfcac2", hairStyle: "bald-sides", whiskers: "mutton", moustache: "none", glasses: "round", coat: "#17171d", vest: "#2a2a34", cravat: "#f2efe6", cravatStyle: "stock", trousers: "#202027", watch: true, skirt: "frock" },
  docA: { skin: "#f6efe4", hair: "#2a1d16", hairStyle: "full", moustache: "walrus", beard: true, coat: "#3b2b22", vest: "#c8b48a", cravat: "#141216", trousers: "#3a3530", skirt: "frock" },
  docB: { skin: "#f7f0e6", hair: "#8a5a2c", hairStyle: "full", moustache: "pencil", glasses: "monocle", coat: "#3a3f4a", vest: "#2e5040", cravat: "#141216", trousers: "#2d2f36", skirt: "frock" },
  mother: { skin: "#f7f1e8", hair: "#6b4630", hairStyle: "bun", cap: "mob", dress: "#f3efe6", gown: true, skirt: "gown" },
  mother2: { skin: "#f6efe4", hair: "#2f2219", hairStyle: "bun", cap: "mob", dress: "#e9e6f1", gown: true, skirt: "gown" },
  walker: { skin: "#f7f1e8", hair: "#7a4a2a", hairStyle: "bun", cap: "none", dress: "#6f4a5e", shawl: "#b48a5a", skirt: "dress", shoes: "#2a1d18" },
  midwife: { skin: "#f6efe4", hair: "#5a3a28", hairStyle: "bun", cap: "mob", dress: "#55657e", apron: "#f6f3ec", skirt: "dress" },
};
