// QA sheet for the side-view rig v2: idle life, walk cycle, sitting + IK reach, grips (glass, torch, beater, point, cig).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { sideFigure, petromaks, coffeeGlass, kentongan, torchCone, handAnchor, drawGripFingers } from "./rig";

export const RigSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!; c.fillStyle = "#e8dec6"; c.fillRect(0, 0, 1080, 1920);
    c.strokeStyle = "#cdbf9f"; c.lineWidth = 2; for (let y = 100; y < 1920; y += 100) { c.beginPath(); c.moveTo(0, y); c.lineTo(1080, y); c.stroke(); }
    const ink = "#160e0a", red = "rgba(196,18,26,0.7)";
    // row 1: 4 looks standing with idle at t=0 (solid) and t=2.7 (ghost) — shows head glance / weight shift / hand settle
    const H1 = 400; c.strokeStyle = red; c.beginPath(); c.moveTo(0, 470 - H1); c.lineTo(1080, 470 - H1); c.moveTo(0, 470); c.lineTo(1080, 470); c.stroke();
    (["aku", "darto", "yanto", "udin"] as const).forEach((k, i) => {
      c.globalAlpha = 0.3; sideFigure(c, 130 + i * 260, 470, H1, "#7a5a40", k, { idle: { t: 2.7, seed: i * 1.3 } });
      c.globalAlpha = 1; sideFigure(c, 130 + i * 260, 470, H1, ink, k, { idle: { t: 0, seed: i * 1.3 } });
    });
    // row 2: walk cycle, 6 phases
    const H2 = 300;
    for (let i = 0; i < 6; i++) sideFigure(c, 90 + i * 175, 860, H2, ink, i % 2 ? "darto" : "yanto", { walk: (i / 6) * Math.PI * 2, idle: { t: i * 0.3, seed: 2 } });
    // row 3: seated man reaching a glass on a bale (IK + glass grip, fingers in front) + a seated man with hands resting
    const H3 = 420, floor = 1330, seat = 0.28 * H3;
    c.fillStyle = "#8e7150"; c.fillRect(30, floor - seat, 560, 16); for (const lx of [50, 560]) c.fillRect(lx, floor - seat, 14, seat);
    sideFigure(c, 110, floor, H3, ink, "darto", { sit: seat, idle: { t: 1, seed: 4 } });
    const gTarget: [number, number] = [470, floor - seat - 70];
    const J = sideFigure(c, 330, floor, H3, ink, "aku", { sit: seat, reachF: gTarget, gripF: "glass", idle: { t: 0.5, seed: 1 } });
    const a = handAnchor(J, "F"); coffeeGlass(c, a.x, a.y + 26, 52, 0.7, 0, ink, "rgba(255,255,255,0.55)", "#3a2010", 1); drawGripFingers(c, J, "F", ink);
    coffeeGlass(c, 540, floor - seat, 52, 0.8, 0, ink, "rgba(255,255,255,0.55)", "#3a2010", 1);
    // torch holder (beam from the lens through the fist)
    const JT = sideFigure(c, 760, floor, H3, ink, "yanto", { torch: "F", reachF: [900, floor - 0.62 * H3], torchOn: 1, idle: { t: 0.2, seed: 5 } });
    const cone = torchCone(JT, 260, 60, 1, [255, 230, 190]); if (cone) { c.strokeStyle = red; c.beginPath(); c.moveTo(cone.ox, cone.oy); c.lineTo(cone.tx, cone.ty); c.stroke(); }
    // row 4: kentongan beater, pointing, cigarette (big, to read the hands)
    const H4 = 460, f4 = 1880;
    kentongan(c, 260, 1430, 260, ink, 0.05);
    const JB = sideFigure(c, 110, f4, H4, ink, "udin", { reachF: [180, 1640], gripF: "beater", idle: { t: 0, seed: 3 } });
    const b = handAnchor(JB, "F"); c.strokeStyle = red; c.beginPath(); c.arc(b.tip[0], b.tip[1], 6, 0, 7); c.stroke();
    sideFigure(c, 520, f4, H4, ink, "aku", { reachF: [720, f4 - 0.72 * H4], gripF: "point", idle: { t: 0, seed: 6 } });
    const JC = sideFigure(c, 860, f4, H4, ink, "darto", { reachF: [930, f4 - 0.86 * H4], gripF: "cig", idle: { t: 0, seed: 7 } });
    const cg = handAnchor(JC, "F"); c.strokeStyle = "#f3ecdc"; c.lineWidth = 4; c.beginPath(); c.moveTo(cg.x, cg.y); c.lineTo(cg.tip[0], cg.tip[1]); c.stroke();
    c.fillStyle = "#ff7a2a"; c.beginPath(); c.arc(cg.tip[0], cg.tip[1], 4, 0, 7); c.fill();
    petromaks(c, 980, 1000, 150, ink, 1, "#fff6dc");
  }, []);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} /></AbsoluteFill>;
};
