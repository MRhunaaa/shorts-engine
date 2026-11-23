// QA sheet for the Horror3 cast (composition H3Cast, 1 frame): every character in the lit pass on paper + a dark-pass strip.
// Red guide lines: top of head (y - H) and chin (y - 0.87 H) per row, so head size = 0.13 H can be checked at a glance; grey = ground.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { PAL, Pal, C2 } from "../horror1/paint";
import { hiker, friend, courtier, farmer, offeringHand, headlampCone } from "./cast";

const guides = (c: C2, y: number, H: number, x0 = 0, x1 = 1080) => {
  c.strokeStyle = "rgba(200,30,20,0.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y - H); c.lineTo(x1, y - H); c.moveTo(x0, y - 0.87 * H); c.lineTo(x1, y - 0.87 * H); c.stroke();
  c.strokeStyle = "rgba(90,70,50,0.5)"; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
};
const label = (c: C2, p: Pal, s: string, x: number, y: number) => { c.fillStyle = p.mode === "lit" ? "rgba(60,40,30,0.8)" : "rgba(160,180,210,0.7)"; c.font = "15px monospace"; c.textAlign = "center"; c.fillText(s, x, y); };

export const CastSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    const p = PAL.lit; c.fillStyle = p.wall; c.fillRect(0, 0, 1080, 1920);
    const f = p.fig, t = 1.3;
    // row 1: court kinds
    let y = 455, H = 300; guides(c, y, H);
    courtier(c, p, "abdi", 95, y, H, f, { idle: { t, seed: 1 } }, { t, seed: 1 });
    courtier(c, p, "putri", 255, y, H, f, { idle: { t, seed: 2 }, dir: -1 }, { t, seed: 2 });
    courtier(c, p, "prajurit", 405, y, H, f, { idle: { t, seed: 3 } }, { t, seed: 3 });
    c.fillStyle = "#8e7150"; c.fillRect(505, y - 0.27 * H, 150, 0.27 * H); // dais
    courtier(c, p, "raja", 570, y - 0.27 * H, H, f, { sit: 0.25 * H, idle: { t, seed: 4 } }, { t, seed: 4 });
    courtier(c, p, "pedagang", 790, y, H, f, { walk: 1.2, idle: { t, seed: 5 } }, { t, seed: 5 });
    courtier(c, p, "abdi", 990, y, H, f, { walk: 2.4, idle: { t, seed: 6 } }, { t, seed: 6, ghost: 1 });
    ["abdi", "putri", "prajurit", "raja", "pedagang", "abdi ghost"].forEach((s, i) => label(c, p, s, [95, 255, 405, 580, 790, 990][i], y + 22));
    // row 2: hiker
    y = 830; H = 280; guides(c, y, H);
    hiker(c, p, 90, y, H, f, { idle: { t, seed: 1 } }, { t });
    hiker(c, p, 250, y, H, f, { walk: 0.0, idle: { t, seed: 1 } }, { t, pole: true });
    hiker(c, p, 410, y, H, f, { walk: 1.6, idle: { t, seed: 1 } }, { t, pole: true });
    hiker(c, p, 570, y, H, f, { walk: 3.3, idle: { t, seed: 1 } }, { t });
    c.fillStyle = "#8e7150"; c.fillRect(680, y - 0.22 * H, 120, 0.22 * H);
    hiker(c, p, 740, y, H, f, { sit: 0.22 * H, idle: { t, seed: 1 } }, { t, weak: 1, beanie: false, breathFog: 1 });
    const Jl = hiker(c, p, 930, y, H, f, { idle: { t, seed: 1 } }, { t, lamp: 1, pole: true, breathFog: 1 });
    const cone = headlampCone(Jl, 120, 30, 1); if (cone.k === "cone") { c.strokeStyle = "rgba(200,30,20,0.7)"; c.beginPath(); c.moveTo(cone.ox, cone.oy); c.lineTo(cone.tx, cone.ty); c.stroke(); }
    ["stand", "walk 0 pole", "walk 1.6 pole", "walk 3.3", "sit weak", "lamp+pole+fog"].forEach((s, i) => label(c, p, s, [90, 250, 410, 570, 740, 930][i], y + 22));
    // row 3: friends
    y = 1190; H = 280; guides(c, y, H);
    [1, 2, 3, 4].forEach((sd, i) => friend(c, p, 90 + i * 165, y, H, f, { idle: { t, seed: sd }, dir: i % 2 ? -1 : 1 }, { t, seed: sd }));
    c.fillStyle = "#8e7150"; c.fillRect(740, y - 0.2 * H, 120, 0.2 * H);
    friend(c, p, 790, y, H, f, { sit: 0.2 * H, idle: { t, seed: 7 }, lean: 0.1 }, { t, seed: 7, hurt: true, weak: 0.6 });
    friend(c, p, 970, y, H, f, { walk: 0.8, idle: { t, seed: 8 } }, { t, seed: 8 });
    ["friend 1", "friend 2", "friend 3", "friend 4", "hurt", "friend walk"].forEach((s, i) => label(c, p, s, [90, 255, 420, 585, 790, 970][i], y + 22));
    // row 4: farmer + offering hand
    y = 1560; H = 300; guides(c, y, H, 0, 560);
    farmer(c, p, 150, y, H, f, { idle: { t, seed: 1 } }, { t, tool: "cangkul", seed: 1 });
    farmer(c, p, 300, y, H, f, { lean: 0.35, reachB: [355, y - 0.42 * H], reachF: [405, y - 0.27 * H], idle: { t, seed: 2 } }, { t, tool: "cangkul", seed: 2 });
    farmer(c, p, 470, y, H, f, { walk: 1.0, idle: { t, seed: 3 } }, { t, tool: "none", seed: 4 });
    ["cangkul shoulder", "cangkul hands", "walk"].forEach((s, i) => label(c, p, s, [150, 310, 470][i], y + 22));
    offeringHand(c, p, 800, 1520, -0.2, 80, 2, { tray: true, steam: 1 });
    offeringHand(c, p, 870, 1300, 0.15, 70, 2, {});
    label(c, p, "offering hand + tampah", 840, 1600);
    // dark strip
    const d = PAL.dark; c.fillStyle = d.wall; c.fillRect(0, 1620, 1080, 300);
    y = 1890; H = 240; guides(c, y, H);
    const Jd = hiker(c, d, 90, y, H, d.fig, { walk: 1.0, idle: { t, seed: 1 } }, { t, lamp: 1, breathFog: 1 });
    void Jd;
    courtier(c, d, "putri", 230, y, H, d.fig, { idle: { t, seed: 2 } }, { t, seed: 2, ghost: 1 });
    courtier(c, d, "prajurit", 350, y, H, d.fig, { idle: { t, seed: 3 } }, { t, seed: 3, ghost: 0.6 });
    farmer(c, d, 480, y, H, d.fig, { idle: { t, seed: 1 } }, { t, tool: "cangkul", seed: 1 });
    friend(c, d, 610, y, H, d.fig, { idle: { t, seed: 2 } }, { t, seed: 2 });
    offeringHand(c, d, 800, 1830, -0.15, 75, 2, { tray: true });
  }, []);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} /></AbsoluteFill>;
};
