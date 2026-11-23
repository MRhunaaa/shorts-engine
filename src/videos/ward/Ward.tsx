// "WASH YOUR HANDS": true-3D short. Post chain: Ink (world + characters, own pass) -> thin-lens DOF -> motion blur ->
// bloom (flames, lamps) -> Neutral tone map -> LensFX (bubble / zoom-through transitions + night/day grade, own pass).
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, NOINK } from "../dino/ink";
import { LensBlur } from "../dino/lensblur";
import { MotionBlur } from "../dino/motionblur";
import { LensFX, GRADE_NIGHT, GRADE_DAY } from "./lensfx";
import { World } from "./world";
import { TOTAL, SHOTS, layersAt, camAt, DOF, bubbleAt, zoomAt } from "./story";
import { WORDS } from "./words";

export const WARD_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.75, luminanceThreshold: 0.95, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.7 });
  const mip = b.mipmapBlurPass; const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3();
const pcam = new THREE.PerspectiveCamera(40, 9 / 16, 0.05, 80);

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, { widthNear: 4.2, widthFar: 2.6, distNear: 1.5, distFar: 12 }),
    lens: new LensBlur({ maxCoC: 20, nearScale: 1.0 }),
    mblur: new MotionBlur(),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    lfx: new LensFX(),
  }), [camera, scene]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.mblur} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.lfx} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  cam.layers.enable(NOINK);
  const target = world.update(id, f, cam);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, target.clone().sub(cam.position).dot(fwd));
  fx.lens.cInf = DOF[id];
  const s = SHOTS[id - 1];
  // final fade to dark when the candle dies
  const end = f > 948 ? Math.max(0.12, 1 - (f - 948) / 14) : 1;
  fx.lfx.set(s.grade === "day" ? GRADE_DAY : GRADE_NIGHT, bubbleAt(f), zoomAt(f), end);
  {
    const g = f - 1 >= s.a ? f - 1 : f + 1, c = camAt(id, g);
    pcam.position.set(...c.pos); pcam.up.set(0, 1, 0); pcam.lookAt(...c.look); pcam.rotateZ(c.roll);
    pcam.fov = c.fov; pcam.aspect = cam.aspect; pcam.updateProjectionMatrix(); pcam.updateMatrixWorld();
    const p = cam.position.clone().addScaledVector(fwd, 20).project(pcam);
    let dx = 0.25 * p.x, dy = 0.25 * p.y; const L = Math.hypot(dx, dy), maxL = 0.085;
    if (L > maxL) { dx *= maxL / L; dy *= maxL / L; }
    fx.mblur.setDir(L < 0.004 ? 0 : dx, L < 0.004 ? 0 : dy);
  }
  return (<>
    <primitive object={world.root} dispose={null} />
    {post}
  </>);
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.05, far: 80 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

const KEY = new Set(["doctor", "wash", "hands", "asylum", "vienna", "1847", "ten", "died", "three", "safer", "street", "semmelweis", "dead", "bodies", "babies", "same", "chlorine", "hundred", "offended", "clean", "pushed", "infected", "wound"]);
const Caption: React.FC<{ f: number }> = ({ f }) => {
  const t = f / 30;
  let i = -1;
  for (let k = 0; k < WORDS.length; k++) if (t >= WORDS[k][1] - 0.03) i = k;
  if (i < 0) return null;
  const [w, , e] = WORDS[i], next = WORDS[i + 1]?.[1] ?? Infinity;
  if (t > Math.min(next, e + 0.35)) return null;
  const n = Math.max(0, f - Math.round((WORDS[i][1] - 0.03) * 30)), sc = n === 0 ? 0.8 : n === 1 ? 1.1 : 1.0;
  const word = w.replace(/[.,!?]+$/g, "").replace(/\.\.\.$/, "");
  const key = KEY.has(word.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 1270 }}>
      <div style={{ fontFamily: "'Arial Black', 'Arial', sans-serif", fontWeight: 900, fontSize: 96, color: key ? "#ffd84a" : "#ffffff", transform: `scale(${sc}) rotate(${key ? -2 : 0}deg)`,
        WebkitTextStroke: "15px #000000", paintOrder: "stroke fill", letterSpacing: 1, textShadow: "0 7px 0 rgba(0,0,0,0.4)" }}>{word}</div>
    </AbsoluteFill>
  );
};

export const WardShort: React.FC = () => {
  const f = useCurrentFrame();
  const caps = (getInputProps() as { captions?: boolean }).captions !== false;
  return (
    <AbsoluteFill style={{ background: "#05070c" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {caps && <Caption f={f} />}
    </AbsoluteFill>
  );
};
