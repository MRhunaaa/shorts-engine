// ---------- human heads (drawn around x=150, y=170) ----------
/** base human head: egg shape, ears, cheeks, nose, eyes, brows, mouth; hair/hat drawn by callbacks */
function humanHead(c, ex, o) {
  const { skin, back, front, eyeOpt = {}, nose = "button", mouthW = 20, extra } = o;
  if (back) back(c);
  for (const s of [-1, 1]) { E(c, 150 + s * 86, 176, 16, 20, skin, 7); E(c, 150 + s * 86, 178, 7, 10, hex(skin, 0.85), 0); }
  const g = c.createLinearGradient(80, 90, 210, 260); g.addColorStop(0, hex(skin, 1.08)); g.addColorStop(0.6, skin); g.addColorStop(1, hex(skin, 0.86));
  path(c, () => { c.moveTo(150, 82); c.bezierCurveTo(232, 82, 246, 180, 226, 222); c.bezierCurveTo(206, 262, 94, 262, 74, 222); c.bezierCurveTo(54, 180, 68, 82, 150, 82); });
  fillInk(c, g);
  c.save(); c.globalAlpha = 0.25; E(c, 112, 132, 24, 14, "#ffffff", 0, -0.4); c.restore();
  E(c, 104, 204, 15, 9, "rgba(255,110,120,0.22)", 0); E(c, 196, 204, 15, 9, "rgba(255,110,120,0.22)", 0);
  eyes(c, 150, 168, 34, 19, ex, { lid: skin, ...eyeOpt });
  if (nose === "button") Q(c, [144, 194], [156, 200], [150, 188], 5); else Q(c, [146, 180], [160, 200], [146, 202], 5);
  if (extra) extra(c, ex);
  mouth(c, 150, 222, ex, mouthW);
  if (front) front(c, ex);
}
const SK = { light: "#f6d2b4", fair: "#ffe0c8", tan: "#d9a77c", brown: "#a8714a", deep: "#7a4b30", olive: "#c9a07a" };
const H = {
  nico(c, ex) { humanHead(c, ex, { skin: SK.fair,
    back: (c) => { E(c, 150, 112, 92, 56, "#6b3f22", 8); },
    front: (c) => { path(c, () => { c.moveTo(66, 150); c.quadraticCurveTo(80, 70, 150, 72); c.quadraticCurveTo(222, 70, 234, 150); c.quadraticCurveTo(200, 104, 150, 112); c.quadraticCurveTo(96, 104, 66, 150); }); fillInk(c, "#7a4826", 8); Q(c, [150, 74], [168, 34], [186, 50], 9); Q(c, [150, 74], [168, 34], [186, 50], 4, "#7a4826"); },
    eyeOpt: { glasses: true } }); },
  ada(c, ex) { humanHead(c, ex, { skin: SK.deep,
    back: (c) => { for (const [x, y, r] of [[150, 70, 54], [96, 96, 40], [204, 96, 40], [76, 140, 30], [224, 140, 30]]) E(c, x, y, r, r * 0.9, "#2a1b14", 8); L(c, [[176, 40], [214, 66]], 8, "#f6c43c"); },
    front: (c) => { path(c, () => c.roundRect(82, 104, 136, 30, 14)); fillInk(c, "rgba(140,220,240,0.75)", 7); L(c, [[150, 104], [150, 134]], 5); },
    nose: "line" }); },
  gus(c, ex) { humanHead(c, ex, { skin: SK.light, mouthW: 16,
    back: (c) => { for (const s of [-1, 1]) E(c, 150 + s * 76, 150, 26, 34, "#e9e9ee", 7); },
    front: (c, ex) => { path(c, () => { c.moveTo(108, 210); c.quadraticCurveTo(150, 190, 192, 210); c.quadraticCurveTo(170, 224, 150, 214); c.quadraticCurveTo(130, 224, 108, 210); }); fillInk(c, "#f2f2f4", 6); for (const s of [-1, 1]) Q(c, [150 + s * 16, 136], [150 + s * 40, 128], [150 + s * 58, 140], 10, "#e9e9ee"); },
    extra: (c) => { L(c, [[118, 108], [132, 102]], 4, "rgba(36,23,38,0.35)"); L(c, [[168, 102], [182, 108]], 4, "rgba(36,23,38,0.35)"); } }); },
  luna(c, ex) { humanHead(c, ex, { skin: SK.olive,
    back: (c) => { E(c, 150, 120, 98, 70, "#3a2a5e", 8); path(c, () => { c.moveTo(214, 110); c.quadraticCurveTo(290, 120, 268, 220); c.quadraticCurveTo(250, 170, 222, 160); c.closePath(); }); fillInk(c, "#3a2a5e", 8); },
    front: (c) => { path(c, () => { c.moveTo(64, 160); c.quadraticCurveTo(70, 80, 160, 80); c.quadraticCurveTo(230, 84, 236, 140); c.quadraticCurveTo(170, 96, 112, 130); c.quadraticCurveTo(84, 140, 64, 160); }); fillInk(c, "#46336e", 8);
      Q(c, [62, 176], [150, 40], [238, 176], 12); for (const s of [-1, 1]) { path(c, () => c.roundRect(150 + s * 92 - 18, 150, 36, 52, 14)); fillInk(c, "#ff6a9a", 7); } } }); },
  max(c, ex) { humanHead(c, ex, { skin: SK.tan,
    front: (c) => { E(c, 150, 104, 128, 24, "#c9a46a", 8); path(c, () => { c.moveTo(80, 104); c.quadraticCurveTo(84, 40, 150, 40); c.quadraticCurveTo(216, 40, 220, 104); c.closePath(); }); fillInk(c, "#d9b77c", 8); L(c, [[84, 92], [216, 92]], 8, "#7a5a32");
      path(c, () => { c.moveTo(112, 210); c.quadraticCurveTo(150, 194, 188, 210); c.quadraticCurveTo(204, 222, 214, 206); c.quadraticCurveTo(150, 236, 86, 206); c.quadraticCurveTo(96, 222, 112, 210); }); fillInk(c, "#5a3b22", 6); },
    mouthW: 16 }); },
  sam(c, ex) { humanHead(c, ex, { skin: SK.brown,
    front: (c) => { E(c, 150, 108, 124, 20, "#3b3f52", 8); path(c, () => { c.moveTo(92, 108); c.quadraticCurveTo(92, 48, 150, 50); c.quadraticCurveTo(208, 48, 208, 108); c.closePath(); }); fillInk(c, "#4a4f66", 8); L(c, [[94, 96], [206, 96]], 10, "#d23b3b"); path(c, () => { c.moveTo(126, 60); c.quadraticCurveTo(150, 72, 174, 60); }); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); },
    extra: (c) => { for (let k = 0; k < 14; k++) E(c, 110 + (k % 7) * 14, 236 + Math.floor(k / 7) * 6, 1.5, 1.5, "rgba(36,23,38,0.55)", 0); } }); },
  pepe(c, ex) { humanHead(c, ex, { skin: SK.light, mouthW: 16,
    front: (c) => { path(c, () => c.roundRect(98, 74, 104, 40, 8)); fillInk(c, "#ffffff", 8); for (const [x, y, r] of [[112, 52, 26], [150, 40, 30], [188, 52, 26]]) E(c, x, y, r, r, "#ffffff", 8); path(c, () => c.roundRect(98, 74, 104, 40, 8)); fillInk(c, "#ffffff", 0); L(c, [[98, 96], [202, 96]], 0);
      path(c, () => { c.moveTo(100, 206); c.quadraticCurveTo(124, 196, 150, 204); c.quadraticCurveTo(176, 196, 200, 206); c.quadraticCurveTo(214, 190, 222, 200); c.quadraticCurveTo(206, 222, 176, 214); c.quadraticCurveTo(160, 210, 150, 214); c.quadraticCurveTo(140, 210, 124, 214); c.quadraticCurveTo(94, 222, 78, 200); c.quadraticCurveTo(86, 190, 100, 206); }); fillInk(c, "#2a1b14", 6); } }); },
  ray(c, ex) {
    humanHead(c, ex, { skin: SK.brown, back: (c) => { E(c, 150, 112, 90, 52, "#1d1512", 8); },
      front: (c) => { path(c, () => { c.moveTo(70, 150); c.quadraticCurveTo(84, 84, 150, 84); c.quadraticCurveTo(216, 84, 230, 150); c.quadraticCurveTo(190, 112, 150, 118); c.quadraticCurveTo(110, 112, 70, 150); }); fillInk(c, "#1d1512", 7); } });
    E(c, 150, 170, 124, 118, "rgba(190,230,255,0.22)", 8); c.save(); c.globalAlpha = 0.6; Q(c, [86, 120], [110, 70], [160, 60], 8, "#ffffff"); c.restore();
    path(c, () => c.roundRect(60, 258, 180, 26, 12)); fillInk(c, "#e8622c", 8);
  },
  mia(c, ex) { humanHead(c, ex, { skin: SK.fair,
    back: (c) => { E(c, 150, 116, 96, 62, "#c4452e", 8); for (const s of [-1, 1]) { E(c, 150 + s * 96, 206, 22, 46, "#c4452e", 8); } },
    front: (c) => { path(c, () => { c.moveTo(62, 156); c.quadraticCurveTo(66, 78, 150, 78); c.quadraticCurveTo(234, 78, 238, 156); c.quadraticCurveTo(200, 110, 150, 112); c.quadraticCurveTo(100, 110, 62, 156); }); fillInk(c, "#d4553a", 8);
      path(c, () => c.roundRect(84, 96, 132, 30, 14)); fillInk(c, "#8a5a34", 7); for (const s of [-1, 1]) { E(c, 150 + s * 34, 111, 22, 16, "#ffd37a", 6); E(c, 150 + s * 34, 111, 13, 9, "#a8d8f0", 0); } } }); },
  bob(c, ex) { humanHead(c, ex, { skin: SK.tan, mouthW: 18,
    front: (c) => { path(c, () => { c.moveTo(78, 110); c.quadraticCurveTo(80, 48, 150, 46); c.quadraticCurveTo(220, 48, 222, 110); c.closePath(); }); fillInk(c, "#f6c43c", 8); path(c, () => c.roundRect(66, 102, 168, 18, 9)); fillInk(c, "#f6c43c", 8); L(c, [[150, 48], [150, 102]], 7, "#d9a42a");
      path(c, () => { c.moveTo(80, 196); c.quadraticCurveTo(94, 270, 150, 272); c.quadraticCurveTo(206, 270, 220, 196); c.quadraticCurveTo(204, 232, 150, 236); c.quadraticCurveTo(96, 232, 80, 196); }); fillInk(c, "#6b3f22", 6); } }); },
};

// ---------- the ten human hosts ----------
const CAST = [
  { key: "nico", name: "1 · Nico", line: "curious kid · yellow raincoat · \"wait... WHY?\"", bg: ["#fff3cf", "#ffe6a6"], chipBg: "#fff8e2",
    body: (c) => body(c, { skin: SK.fair, shirt: "#f6c43c", pants: "#2f6fb5", shoes: "#d23b3b", arm: "wave", decor: (c, cx, t, w, h) => { for (const y of [24, 52, 80]) E(c, cx, t + y, 5, 5, "#2f3f6e", 3); L(c, [[cx - 40, t + 4], [cx - 14, t + 30], [cx + 14, t + 30], [cx + 40, t + 4]], 6, "#d9a42a"); } }) },
  { key: "ada", name: "2 · Dr. Ada", line: "brilliant scientist · goggles · \"science says NO.\"", bg: ["#dff3f2", "#c6e8e6"], chipBg: "#eefaf9",
    body: (c) => body(c, { skin: SK.deep, shirt: "#3ab0a8", pants: "#2f3f6e", shoes: "#241726", arm: "hold", decor: (c, cx, t, w, h) => { poly(c, [[cx - 26, t], [cx, t + 52], [cx - 46, t + 34]], "#2f9a92", 5); poly(c, [[cx + 26, t], [cx, t + 52], [cx + 46, t + 34]], "#2f9a92", 5); L(c, [[cx + 22, t + 60], [cx + 30, t + 86]], 5, "#f6c43c"); }, prop: (c, [x, y]) => { poly(c, [[x - 8, y - 40], [x + 8, y - 40], [x + 8, y - 22], [x + 22, y + 4], [x - 22, y + 4], [x - 8, y - 22]], "rgba(124,252,154,0.7)", 6); } }) },
  { key: "gus", name: "3 · Grandpa Gus", line: "storyteller grandpa · \"back in MY day...\"", bg: ["#f3e9df", "#e8d6c4"], chipBg: "#f9f2ea",
    body: (c) => body(c, { skin: SK.light, shirt: "#8a5a3a", pants: "#4a4f66", shoes: "#3a2a20", arm: "hold", decor: (c, cx, t, w, h) => { for (let k = 0; k < 4; k++) E(c, cx, t + 22 + k * 24, 5, 5, "#e8c45a", 3); L(c, [[cx, t], [cx, t + h]], 4, "#6b4228"); }, prop: (c, [x, y]) => { L(c, [[x, y], [x + 8, y + 118]], 9, "#6b4228"); Q(c, [x, y], [x - 6, y - 26], [x - 26, y - 18], 9, "#6b4228"); } }) },
  { key: "luna", name: "4 · Luna", line: "skeptical teen · headphones · \"no way that's real\"", bg: ["#ece4fa", "#dbcdf3"], chipBg: "#f5f0fd",
    body: (c) => body(c, { skin: SK.olive, shirt: "#7b5ac9", pants: "#2a2440", shoes: "#f4f1ea", arm: "hips", decor: (c, cx, t, w, h) => { path(c, () => c.roundRect(cx - 40, t + h * 0.6, 80, 28, 10)); fillInk(c, "#6a4ab8", 5); c.fillStyle = "#ffd23c"; c.font = "700 22px Fredoka"; c.textAlign = "center"; c.fillText("???", cx, t + 52); } }) },
  { key: "max", name: "5 · Captain Max", line: "explorer · pith helmet · \"adventure time!\"", bg: ["#eef0d9", "#dfe2bb"], chipBg: "#f6f7ea",
    body: (c) => body(c, { skin: SK.tan, shirt: "#c9a46a", pants: "#7a5a32", shoes: "#5a3b22", arm: "wave", decor: (c, cx, t, w, h) => { for (const s of [-1, 1]) { path(c, () => c.roundRect(cx + s * 30 - 16, t + 26, 32, 24, 5)); fillInk(c, "#b38f58", 4); } L(c, [[cx - 54, t + h * 0.72], [cx + 54, t + h * 0.72]], 9, "#5a3b22"); } }) },
  { key: "sam", name: "6 · Detective Sam", line: "noir detective · fedora · \"the clues don't lie\"", bg: ["#e4e6ee", "#cfd3e0"], chipBg: "#f0f2f7",
    body: (c) => body(c, { skin: SK.brown, shirt: "#c49a62", pants: "#3b3f52", shoes: "#241726", arm: "hold", decor: (c, cx, t, w, h) => { poly(c, [[cx - 40, t - 4], [cx - 6, t + 50], [cx - 54, t + 30]], "#b38a52", 5); poly(c, [[cx + 40, t - 4], [cx + 6, t + 50], [cx + 54, t + 30]], "#b38a52", 5); L(c, [[cx - 54, t + h * 0.6], [cx + 54, t + h * 0.6]], 10, "#7a5a32"); }, prop: (c, [x, y]) => { L(c, [[x, y], [x + 20, y - 22]], 8, "#6b4a2a"); E(c, x + 34, y - 36, 19, 19, "rgba(190,230,255,0.6)", 7); } }) },
  { key: "pepe", name: "7 · Chef Pepe", line: "dramatic chef · moustache · \"mamma mia!\"", bg: ["#fde5e1", "#f8cfc8"], chipBg: "#fef2f0",
    body: (c) => body(c, { skin: SK.light, shirt: "#ffffff", pants: "#3b3f52", shoes: "#241726", arm: "wave", decor: (c, cx, t, w, h) => { for (const s of [-1, 1]) for (const y of [26, 54]) E(c, cx + s * 16, t + y, 5, 5, "#d23b3b", 3); poly(c, [[cx - 22, t + 2], [cx, t + 18], [cx + 22, t + 2], [cx + 22, t + 14], [cx, t + 26], [cx - 22, t + 14]], "#d23b3b", 4); path(c, () => c.roundRect(cx - 42, t + 70, 84, 50, 8)); fillInk(c, "#f2f2f4", 5); } }) },
  { key: "ray", name: "8 · Rocket Ray", line: "space kid · bubble helmet · \"to infinity!\"", bg: ["#dfe6fb", "#c7d3f6"], chipBg: "#eef2fd",
    body: (c) => body(c, { skin: SK.brown, shirt: "#f4f1ea", pants: "#f4f1ea", shoes: "#e8622c", arm: "wave", sleeve: "#e8e6e0", decor: (c, cx, t, w, h) => { path(c, () => c.roundRect(cx - 30, t + 24, 60, 40, 8)); fillInk(c, "#3a4a6e", 5); for (const [x, col] of [[-14, "#ff5a3c"], [0, "#7cfc9a"], [14, "#6ab8ff"]]) E(c, cx + x, t + 44, 5, 5, col, 0); L(c, [[cx - 54, t + h * 0.74], [cx + 54, t + h * 0.74]], 9, "#e8622c"); } }) },
  { key: "mia", name: "9 · Mia", line: "time traveller · goggles + pocket watch", bg: ["#f6e6d6", "#ecd2b8"], chipBg: "#fbf2e9",
    body: (c) => body(c, { skin: SK.fair, shirt: "#5a3a6e", pants: "#3b2f2a", shoes: "#6b3f22", arm: "hold", decor: (c, cx, t, w, h) => { for (let k = 0; k < 3; k++) E(c, cx - 22, t + 30 + k * 26, 5, 5, "#e8c45a", 3); L(c, [[cx + 6, t + 50], [cx + 36, t + 70]], 4, "#e8c45a"); }, prop: (c, [x, y]) => { E(c, x + 6, y - 14, 20, 20, "#e8c45a", 6); E(c, x + 6, y - 14, 13, 13, "#fff8e2", 3); L(c, [[x + 6, y - 14], [x + 6, y - 24]], 3); L(c, [[x + 6, y - 14], [x + 13, y - 12]], 3); } }) },
  { key: "bob", name: "10 · Big Bob", line: "everyday builder · hard hat · \"hold my sandwich\"", bg: ["#fff0d6", "#ffe0b0"], chipBg: "#fff7e8",
    body: (c) => body(c, { skin: SK.tan, shirt: "#ff8a1e", pants: "#2f4a7a", shoes: "#5a3b22", arm: "hips", decor: (c, cx, t, w, h) => { for (const y of [40, 74]) L(c, [[cx - 60, t + y], [cx + 60, t + y]], 9, "#e9eef2"); L(c, [[cx, t], [cx, t + h]], 4, "#d9701a"); } }) },
];

