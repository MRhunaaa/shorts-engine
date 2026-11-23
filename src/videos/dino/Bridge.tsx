// "The Bridge That Fell for a Song": our original 67 s short in the flat-characters-in-a-3D-toon-world style.
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain (look-match pass):
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";
import { TOTAL, FLASHES, SHOTS, layersAt, dofAt, camAt, PORTALS } from "./story";
import { MotionBlur } from "./motionblur";
import { WORDS } from "./words";

export const BRIDGE_FRAMES = TOTAL;

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const pcam = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 1500);

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("bridge kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; kit: Kit }> = ({ id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
    mblur: new MotionBlur(),
  }), [camera, scene]);
  useEffect(() => () => { const d = (fx.ink as unknown as { dispose?: () => void }).dispose; if (typeof d === "function") d.call(fx.ink); }, [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      <primitive object={fx.mblur} dispose={null} />
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
      {on.grain ? <primitive object={fx.grain} dispose={null} /> : null}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  fx.grain.seed = f; // deterministic per frame
  // motion blur: where the point 40 m ahead of the lens sat in the neighbouring frame of the same shot (half shutter)
  {
    const s = SHOTS[id - 1], g = f - 1 >= s.a ? f - 1 : f + 1;
    const c = camAt(id, g);
    pcam.position.set(...c.pos); pcam.up.set(0, 1, 0); pcam.lookAt(...c.look); pcam.rotateZ(c.roll);
    pcam.fov = c.fov; pcam.aspect = cam.aspect; pcam.updateProjectionMatrix(); pcam.updateMatrixWorld();
    cam.getWorldDirection(fwd);
    const p = cam.position.clone().addScaledVector(fwd, 40).project(pcam);
    let dx = 0.5 * p.x * 0.5, dy = 0.5 * p.y * 0.5;
    const L = Math.hypot(dx, dy), maxL = 0.085;
    if (L > maxL) { dx *= maxL / L; dy *= maxL / L; }
    fx.mblur.setDir(L < 0.004 ? 0 : dx, L < 0.004 ? 0 : dy);
  }
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number }> = ({ id, kit, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** one bold word at a time, popping in on its onset (reference-channel caption style) */
const Caption: React.FC<{ f: number }> = ({ f }) => {
  const t = f / 30;
  let i = -1;
  for (let k = 0; k < WORDS.length; k++) if (t >= WORDS[k][1] - 0.03) i = k;
  if (i < 0) return null;
  const [w, a, e] = WORDS[i], next = WORDS[i + 1]?.[1] ?? Infinity;
  if (t > Math.min(next, e + 0.35)) return null;
  const n = Math.max(0, f - Math.round((a - 0.03) * 30)), sc = n === 0 ? 0.8 : n === 1 ? 1.08 : 1.0;
  const word = w.replace(/^["“]|["”]$/g, "");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 1270 }}>
      <div style={{ fontFamily: "'Arial Black', 'Arial', sans-serif", fontWeight: 900, fontSize: 92, color: KEY.has(word.toLowerCase().replace(/[^a-z]/g, "")) ? "#7CFC6A" : "#ffffff", transform: `scale(${sc})`,
        WebkitTextStroke: "14px #000000", paintOrder: "stroke fill", letterSpacing: 1, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>{word}</div>
    </AbsoluteFill>
  );
};

/** brand keywords in green */
const KEY = new Set(["girl", "monster", "fake", "dino", "cousin", "mary", "anning", "twelve", "cliff", "fossils", "eat", "neck", "long", "glued", "bone", "real", "women", "club", "credit", "museum", "legend", "seashells", "seashore"]);
/** DINO TIME-TRAVELS signature transition: a spinning green/white/blue portal that zooms through the frame + flash */
const Portal: React.FC<{ f: number }> = ({ f }) => {
  for (const c of PORTALS) {
    const d = f - c;
    if (d < -9 || d > 9) continue;
    const e = 1 - Math.abs(d) / 9, sc = 0.2 + 2.8 * ((d + 9) / 18) ** 1.6, rot = f * 28;
    const mask = "radial-gradient(circle, transparent 0%, transparent 18%, black 30%, black 62%, transparent 72%)";
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 1400, height: 1400, borderRadius: "50%", transform: `scale(${sc}) rotate(${rot}deg)`, opacity: Math.min(1, e * 1.6),
          background: "conic-gradient(from 0deg, rgba(124,252,106,0.0), rgba(124,252,106,0.9), rgba(255,255,255,0.95), rgba(90,200,255,0.9), rgba(124,252,106,0.0), rgba(124,252,106,0.9), rgba(255,255,255,0.95), rgba(90,200,255,0.9), rgba(124,252,106,0.0))",
          WebkitMaskImage: mask, maskImage: mask }} />
        {Math.abs(d) <= 1 && <AbsoluteFill style={{ background: "#ffffff", opacity: d === 0 ? 0.9 : 0.5 }} />}
      </AbsoluteFill>
    );
  }
  return null;
};

export const BridgeShort: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  if (!kit) return null;
  let flash = 0;
  for (const fa of FLASHES) if (f >= fa && f < fa + 6) flash = [1, 0.85, 0.6, 0.4, 0.2, 0.08][f - fa];
  const caps = (getInputProps() as { captions?: boolean }).captions !== false;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      <Portal f={f} />
      {caps && <Caption f={f} />}
    </AbsoluteFill>
  );
};
