// QA turnaround of the true-3D cast: frame = view. 0 front, 1 three-quarter, 2 side, 3 back, 4.. face close-ups.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode, BloomEffect, BlendFunction } from "postprocessing";
import { InkPass } from "../dino/ink";
import { Character, LOOKS } from "./rig";

const NAMES = ["semmel", "klein", "docA", "docB", "mother", "midwife", "walker", "semmelAsy"];
export const CAST_FRAMES = 4 + NAMES.length;

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { scene, camera } = useThree();
  const world = useMemo(() => {
    const g = new THREE.Group();
    g.add(new THREE.HemisphereLight("#cfd8ff", "#6a5848", 0.9));
    const key = new THREE.DirectionalLight("#fff1dc", 2.2); key.position.set(3, 6, 5); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 4, bottom: -1 }); key.shadow.bias = -0.0005;
    g.add(key);
    const rim = new THREE.DirectionalLight("#9fc0ff", 1.4); rim.position.set(-4, 3, -5); g.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), new THREE.MeshStandardMaterial({ color: "#e8e1d4", roughness: 0.95 }));
    wall.position.set(0, 5, -3); wall.receiveShadow = true; g.add(wall);
    const chars = NAMES.map((n, i) => { const c = new Character(LOOKS[n]); g.add(c.root); return c; });
    return { g, chars };
  }, []);
  const fx = useMemo(() => ({ ink: new InkPass(scene, camera as THREE.PerspectiveCamera), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.4, luminanceThreshold: 1, mipmapBlur: true }) }), [scene, camera]);
  const cam = camera as THREE.PerspectiveCamera;
  const yaw = [0, 0.75, Math.PI / 2, Math.PI][Math.min(f, 3)];
  world.chars.forEach((c, i) => {
    const x = (i % 4 - 1.5) * 0.95, z = Math.floor(i / 4) * -1.6;
    const arms: any = i % 2 ? { armL: "hang", armR: "hang" } : { armL: "hips", armR: "point" };
    c.pose({ x, z, yaw: f < 4 ? yaw : 0, ...arms, hidden: f >= 4 && f - 4 !== i, brows: (["calm", "smug", "raised", "angry"] as const)[i % 4], mouth: (["smile", "flat", "smile", "frown"] as const)[i % 4], blink: 0 }, 0.5);
  });
  if (f < 4) { cam.position.set(0, 1.6, 5.6); cam.fov = 42; cam.lookAt(0, 0.6, -0.8); }
  else {
    const i = f - 4, x = (i % 4 - 1.5) * 0.95, z = Math.floor(i / 4) * -1.6;
    cam.position.set(x + 0.3, 1.45, z + 2.3); cam.fov = 34; cam.lookAt(x, 1.12, z);
  }
  cam.updateProjectionMatrix();
  return (<>
    <primitive object={world.g} />
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
    </EffectComposer>
  </>);
};

export const CastSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#ddd" }}>
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: 42, near: 0.05, far: 100 }} gl={{ antialias: false }}>
      <Inner />
    </ThreeCanvas>
  </AbsoluteFill>
);
