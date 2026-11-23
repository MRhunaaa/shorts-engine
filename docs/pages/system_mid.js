// ---------- OUR BASE CHARACTER SYSTEM: one rig, swappable outfits ----------
// Base: warm egg head, glossy bead eyes (2 glints), hair-coloured brows, button nose, pear torso, long thin legs,
// round skin-coloured hands. Outfit layers: torso garment, hat, hair, facial hair, accessory, prop.
const SKN = ["#ffe0c8", "#f2c6a0", "#d9a77c", "#b07a52", "#8a5a3a", "#f6d2b4", "#c99067", "#e8b48a", "#9a6442", "#ffd9c0"];
function beadEyes(c, x, y, gap, ex, brow) {
  for (const s of [-1, 1]) {
    const cx = x + s * gap;
    if (ex === "smug") { Q(c, [cx - 13, y + 2], [cx, y - 8], [cx + 13, y + 2], 8); }
    else { const ry = ex === "shock" ? 17 : 14; E(c, cx, y, ex === "shock" ? 12 : 10, ry, INK, 0); E(c, cx - 3, y - ry * 0.4, 4, 5, "#ffffff", 0); E(c, cx + 4, y + ry * 0.35, 2, 2, "#ffffff", 0); }
    const by = y - 26 - (ex === "shock" ? 8 : 0);
    if (ex === "smug") L(c, [[cx - 16, by + (s < 0 ? 4 : -6)], [cx + 16, by + (s < 0 ? -2 : 2)]], 9, brow);
    else Q(c, [cx - 16, by + 4], [cx, by - 6], [cx + 16, by + 4], 9, brow);
  }
}
function baseHead(c, ex, o) {
  const { skin, hairBack, hairFront, brow = "#3a2a20", face } = o;
  if (hairBack) hairBack(c);
  for (const s of [-1, 1]) E(c, 150 + s * 88, 168, 14, 18, skin, 7);
  const g = c.createLinearGradient(70, 80, 220, 260); g.addColorStop(0, hex(skin, 1.07)); g.addColorStop(0.6, skin); g.addColorStop(1, hex(skin, 0.86));
  path(c, () => { c.moveTo(150, 74); c.bezierCurveTo(236, 74, 246, 176, 228, 214); c.bezierCurveTo(210, 258, 90, 258, 72, 214); c.bezierCurveTo(54, 176, 64, 74, 150, 74); });
  fillInk(c, g);
  c.save(); c.globalAlpha = 0.28; E(c, 110, 122, 26, 15, "#ffffff", 0, -0.45); c.restore();
  E(c, 100, 200, 16, 9, "rgba(255,100,110,0.24)", 0); E(c, 200, 200, 16, 9, "rgba(255,100,110,0.24)", 0);
  beadEyes(c, 150, 166, 36, ex, brow);
  E(c, 150, 192, 7, 6, hex(skin, 0.82), 4);
  if (face) face(c, ex); else mouth(c, 150, 216, ex, 18);
  if (hairFront) hairFront(c);
}
/** pear torso + long thin legs + thin arms with round skin hands */
function baseBody(c, o) {
  const { cx = 180, top = 236, skin, shirt = "#f4f1ea", pants = "#3b3f52", shoes = INK, arm = "hang", garment, prop, belt } = o;
  const h = 112;
  for (const s of [-1, 1]) { L(c, [[cx + s * 18, top + h - 8], [cx + s * 22, top + h + 92]], 12); L(c, [[cx + s * 18, top + h - 8], [cx + s * 22, top + h + 92]], 5, pants); path(c, () => { c.moveTo(cx + s * 14, top + h + 90); c.quadraticCurveTo(cx + s * 16, top + h + 108, cx + s * 34, top + h + 106); c.quadraticCurveTo(cx + s * 50, top + h + 104, cx + s * 44, top + h + 92); c.closePath(); }); fillInk(c, shoes, 6); }
  const sh = (s) => [cx + s * 40, top + 24];
  const hang = (s) => [sh(s), [cx + s * 66, top + 66], [cx + s * 62, top + 108]];
  const P2 = { hang, wave: (s) => (s > 0 ? [sh(s), [cx + 82, top + 2], [cx + 74, top - 52]] : hang(s)), hold: (s) => (s > 0 ? [sh(s), [cx + 74, top + 60], [cx + 40, top + 74]] : hang(s)), hips: (s) => [sh(s), [cx + s * 82, top + 50], [cx + s * 46, top + 84]] };
  const A = P2[arm] || hang;
  for (const s of [-1, 1]) { const p = A(s); L(c, p, 12); L(c, p, 5, hex(o.sleeve || shirt, 0.92)); E(c, p[2][0], p[2][1], 11, 11, skin, 5); }
  // pear torso
  path(c, () => { c.moveTo(cx, top); c.bezierCurveTo(cx + 46, top, cx + 50, top + 40, cx + 62, top + 80); c.bezierCurveTo(cx + 72, top + 116, cx - 72, top + 116, cx - 62, top + 80); c.bezierCurveTo(cx - 50, top + 40, cx - 46, top, cx, top); });
  const g = c.createLinearGradient(cx - 60, top, cx + 50, top + h); g.addColorStop(0, hex(shirt, 1.1)); g.addColorStop(0.6, shirt); g.addColorStop(1, hex(shirt, 0.82));
  c.save(); c.fillStyle = g; c.fill(); c.clip(); c.globalAlpha = 0.18; E(c, cx - 26, top + 40, 14, 30, "#ffffff", 0, -0.3); c.globalAlpha = 1; if (garment) garment(c, cx, top, h); if (belt) { L(c, [[cx - 80, top + 92], [cx + 80, top + 92]], 12, belt); path(c, () => c.roundRect(cx - 12, top + 84, 24, 16, 4)); fillInk(c, "#e8c45a", 4); } c.restore();
  c.lineWidth = OW; c.strokeStyle = INK; c.stroke();
  if (prop) prop(c, A(1)[2]);
}
const HAIR = {
  short: (col) => (c) => { path(c, () => { c.moveTo(66, 150); c.quadraticCurveTo(76, 68, 150, 68); c.quadraticCurveTo(224, 68, 234, 150); c.quadraticCurveTo(206, 100, 150, 104); c.quadraticCurveTo(94, 100, 66, 150); }); fillInk(c, col, 8); },
  bun: (col) => (c) => { E(c, 150, 60, 30, 26, col, 8); path(c, () => { c.moveTo(66, 152); c.quadraticCurveTo(70, 70, 150, 70); c.quadraticCurveTo(230, 70, 234, 152); c.quadraticCurveTo(200, 100, 150, 104); c.quadraticCurveTo(100, 100, 66, 152); }); fillInk(c, col, 8); },
  long: (col) => (c) => { path(c, () => { c.moveTo(60, 240); c.quadraticCurveTo(46, 70, 150, 66); c.quadraticCurveTo(254, 70, 240, 240); c.quadraticCurveTo(220, 150, 150, 110); c.quadraticCurveTo(80, 150, 60, 240); }); fillInk(c, col, 8); },
};
const HAT = {
  cowboy: (col) => (c) => { path(c, () => { c.moveTo(30, 118); c.quadraticCurveTo(150, 84, 270, 118); c.quadraticCurveTo(150, 136, 30, 118); }); fillInk(c, col, 8); path(c, () => { c.moveTo(92, 110); c.quadraticCurveTo(90, 52, 120, 50); c.quadraticCurveTo(150, 62, 180, 50); c.quadraticCurveTo(210, 52, 208, 110); c.closePath(); }); fillInk(c, hex(col, 1.05), 8); L(c, [[94, 100], [206, 100]], 8, "#5a3b22"); },
  chef: () => (c) => { for (const [x, y, r] of [[116, 62, 22], [150, 54, 26], [184, 62, 22]]) E(c, x, y, r, r, "#ffffff", 8); path(c, () => c.roundRect(98, 70, 104, 36, 8)); fillInk(c, "#ffffff", 8); },
  crown: () => (c) => { poly(c, [[96, 106], [96, 60], [122, 82], [150, 48], [178, 82], [204, 60], [204, 106]], "#f6c43c", 8); for (const [x, col] of [[122, "#e8322c"], [150, "#2f7fd0"], [178, "#29a35a"]]) E(c, x, 94, 7, 7, col, 4); },
  helmet: (col) => (c) => { path(c, () => { c.moveTo(70, 118); c.quadraticCurveTo(72, 46, 150, 44); c.quadraticCurveTo(228, 46, 230, 118); c.closePath(); }); fillInk(c, col, 8); path(c, () => c.roundRect(60, 110, 180, 16, 8)); fillInk(c, col, 8); },
  pirate: () => (c) => { path(c, () => { c.moveTo(56, 116); c.quadraticCurveTo(150, 20, 244, 116); c.quadraticCurveTo(150, 92, 56, 116); }); fillInk(c, "#241f26", 8); poly(c, [[142, 70], [158, 70], [150, 84]], "#ffffff", 4); },
  cap: (col) => (c) => { path(c, () => { c.moveTo(74, 116); c.quadraticCurveTo(76, 56, 150, 54); c.quadraticCurveTo(224, 56, 226, 116); c.closePath(); }); fillInk(c, col, 8); path(c, () => { c.moveTo(150, 112); c.quadraticCurveTo(220, 104, 262, 120); c.quadraticCurveTo(220, 128, 150, 122); c.closePath(); }); fillInk(c, hex(col, 0.85), 7); },
};
const STACH = (col) => (c, ex) => { path(c, () => { c.moveTo(150, 206); c.quadraticCurveTo(124, 194, 108, 210); c.quadraticCurveTo(122, 222, 150, 212); c.quadraticCurveTo(178, 222, 192, 210); c.quadraticCurveTo(176, 194, 150, 206); }); fillInk(c, col, 6); if (ex === "shock") E(c, 150, 230, 9, 11, "#5a1f2e", 6); };

const SYSTEM = [
  { name: "BASE", line: "the shared rig · every host starts here", skin: SKN[1], brow: "#3a2a20", head: { hairFront: HAIR.short("#3a2a20") }, body: { shirt: "#f4f1ea", pants: "#3b3f52" } },
  { name: "Sheriff", line: "cowboy hat · vest · badge", skin: SKN[2], brow: "#2a1b14", head: { hairFront: HAT.cowboy("#d9b77c"), face: STACH("#2a1b14") }, body: { shirt: "#3ab0a0", pants: "#5a4632", shoes: "#5a3b22", belt: "#5a3b22", arm: "hips", garment: (c, cx, t) => { for (const s of [-1, 1]) poly(c, [[cx + s * 10, t], [cx + s * 70, t + 20], [cx + s * 70, t + 110], [cx + s * 24, t + 110]], "#8a5a34", 5); poly(c, [[cx - 40, t + 40], [cx - 30, t + 30], [cx - 20, t + 40], [cx - 24, t + 54], [cx - 36, t + 54]], "#e8c45a", 4); } } },
  { name: "Scientist", line: "lab coat · goggles", skin: SKN[4], brow: "#1d1512", head: { hairBack: HAIR.bun("#1d1512"), face: (c, ex) => mouth(c, 150, 216, ex, 16), hairFront: (c) => { path(c, () => c.roundRect(84, 112, 132, 26, 12)); fillInk(c, "rgba(140,220,240,0.75)", 7); } }, body: { shirt: "#ffffff", pants: "#2f3f6e", arm: "hold", garment: (c, cx, t) => { L(c, [[cx, t + 10], [cx, t + 112]], 4, "#c9ccd6"); for (const s of [-1, 1]) poly(c, [[cx + s * 6, t], [cx + s * 30, t + 46], [cx + s * 44, t + 16]], "#e8e9ee", 4); }, prop: (c, [x, y]) => poly(c, [[x - 8, y - 40], [x + 8, y - 40], [x + 8, y - 22], [x + 22, y + 4], [x - 22, y + 4], [x - 8, y - 22]], "rgba(124,252,154,0.75)", 6) } },
  { name: "Chef", line: "chef hat · moustache", skin: SKN[5], brow: "#4a2a20", head: { hairFront: HAT.chef(), face: STACH("#2a1b14") }, body: { shirt: "#ffffff", pants: "#3b3f52", arm: "wave", garment: (c, cx, t) => { for (const s of [-1, 1]) for (const y of [30, 58]) E(c, cx + s * 14, t + y, 5, 5, "#d23b3b", 3); poly(c, [[cx - 20, t + 4], [cx, t + 18], [cx + 20, t + 4], [cx + 20, t + 16], [cx, t + 26], [cx - 20, t + 16]], "#d23b3b", 4); } } },
  { name: "King", line: "crown · royal robe", skin: SKN[9], brow: "#7a5a32", head: { hairFront: HAT.crown(), face: (c, ex) => { mouth(c, 150, 216, ex, 16); path(c, () => { c.moveTo(110, 220); c.quadraticCurveTo(150, 290, 190, 220); c.quadraticCurveTo(150, 246, 110, 220); }); fillInk(c, "#c9a46a", 6); } }, body: { shirt: "#7a2a5a", pants: "#3b2f4a", shoes: "#e8c45a", arm: "hold", garment: (c, cx, t) => { L(c, [[cx - 70, t + 6], [cx + 70, t + 6]], 22, "#ffffff"); for (let k = 0; k < 6; k++) E(c, cx - 50 + k * 20, t + 6, 3, 4, INK, 0); }, prop: (c, [x, y]) => { L(c, [[x, y + 20], [x + 6, y - 70]], 7, "#e8c45a"); E(c, x + 7, y - 76, 11, 11, "#e8322c", 5); } } },
  { name: "Astronaut", line: "bubble helmet · suit", skin: SKN[3], brow: "#1d1512", head: { hairFront: (c) => { HAIR.short("#1d1512")(c); E(c, 150, 166, 122, 116, "rgba(190,230,255,0.22)", 8); c.save(); c.globalAlpha = 0.6; Q(c, [88, 116], [110, 70], [160, 58], 8, "#ffffff"); c.restore(); } }, body: { shirt: "#f4f1ea", pants: "#f4f1ea", shoes: "#e8622c", arm: "wave", garment: (c, cx, t) => { path(c, () => c.roundRect(cx - 28, t + 32, 56, 36, 8)); fillInk(c, "#3a4a6e", 5); for (const [x, col] of [[-12, "#ff5a3c"], [0, "#7cfc9a"], [12, "#6ab8ff"]]) E(c, cx + x, t + 50, 5, 5, col, 0); } } },
  { name: "Pirate", line: "tricorn · eye patch · stripes", skin: SKN[6], brow: "#2a1b14", head: { hairFront: (c) => { HAT.pirate()(c); L(c, [[84, 134], [212, 196]], 6); E(c, 186, 166, 18, 16, INK, 0); }, face: (c, ex) => { mouth(c, 150, 216, ex, 18); for (let k = 0; k < 16; k++) E(c, 116 + (k % 8) * 10, 236 + Math.floor(k / 8) * 7, 1.6, 1.6, "rgba(36,23,38,0.6)", 0); } }, body: { shirt: "#f4f1ea", pants: "#2f3f6e", shoes: "#241726", belt: "#5a3b22", arm: "hips", garment: (c, cx, t) => { for (let y = 14; y < 112; y += 18) L(c, [[cx - 80, t + y], [cx + 80, t + y]], 8, "#d23b3b"); } } },
  { name: "Detective", line: "fedora · trench coat · magnifier", skin: SKN[8], brow: "#1d1512", head: { hairFront: (c) => { E(c, 150, 104, 120, 18, "#3b3f52", 8); path(c, () => { c.moveTo(94, 104); c.quadraticCurveTo(94, 50, 150, 52); c.quadraticCurveTo(206, 50, 206, 104); c.closePath(); }); fillInk(c, "#4a4f66", 8); L(c, [[96, 92], [204, 92]], 9, "#d23b3b"); } }, body: { shirt: "#c49a62", pants: "#3b3f52", belt: "#7a5a32", arm: "hold", garment: (c, cx, t) => { for (const s of [-1, 1]) poly(c, [[cx + s * 36, t - 2], [cx + s * 6, t + 46], [cx + s * 50, t + 28]], "#b38a52", 5); }, prop: (c, [x, y]) => { L(c, [[x, y], [x + 20, y - 22]], 7, "#6b4a2a"); E(c, x + 33, y - 35, 18, 18, "rgba(190,230,255,0.6)", 6); } } },
  { name: "Farmer", line: "straw hat · overalls", skin: SKN[0], brow: "#b07a3a", head: { hairBack: HAIR.long("#d9963a"), hairFront: HAT.cowboy("#f2d27a") }, body: { shirt: "#e85a4a", pants: "#3f6fb5", arm: "wave", garment: (c, cx, t) => { path(c, () => c.roundRect(cx - 38, t + 46, 76, 70, 10)); fillInk(c, "#3f6fb5", 5); for (const s of [-1, 1]) L(c, [[cx + s * 30, t + 50], [cx + s * 22, t]], 8, "#3f6fb5"); for (let k = 0; k < 4; k++) L(c, [[cx - 80, t + 10 + k * 10], [cx + 80, t + 10 + k * 10]], 2, "rgba(255,255,255,0.35)"); } } },
  { name: "Office Guy", line: "shirt · tie · the everyman", skin: SKN[7], brow: "#3a2a20", head: { hairFront: HAIR.short("#5a3b22") }, body: { shirt: "#e9eef6", pants: "#3b3f52", arm: "hang", garment: (c, cx, t) => { poly(c, [[cx - 8, t + 4], [cx + 8, t + 4], [cx + 12, t + 70], [cx, t + 84], [cx - 12, t + 70]], "#2f6fb5", 4); for (const s of [-1, 1]) poly(c, [[cx + s * 4, t], [cx + s * 26, t + 20], [cx + s * 30, t + 4]], "#ffffff", 4); } } },
];
const BG = [["#f1ede6", "#e4ddd2"], ["#f6e8d2", "#ecd4b0"], ["#e2f1f4", "#cbe5ec"], ["#fde5e1", "#f8cfc8"], ["#efe2f4", "#dfcbe8"], ["#dfe6fb", "#c7d3f6"], ["#e4eef8", "#ccdcef"], ["#e6e6ee", "#d0d2de"], ["#f3f2d8", "#e6e3b8"], ["#eaf0f6", "#d4dfec"]];
function drawSys(ch, i) {
  const cv = document.createElement("canvas"); cv.width = 720; cv.height = 940; const c = P(cv.getContext("2d")); c.scale(2, 2);
  card(c, BG[i][0], BG[i][1]);
  c.save(); c.translate(0, 40); c.translate(150, 0); c.scale(0.86, 0.86); c.translate(-150, 0); c.translate(-30, 0);
  baseBody(c, { ...ch.body, skin: ch.skin });
  baseHead(c, "happy", { skin: ch.skin, brow: ch.brow, ...ch.head });
  c.restore();
  const headFn = (cc, ex) => baseHead(cc, ex, { skin: ch.skin, brow: ch.brow, ...ch.head });
  ["happy", "shock", "smug"].forEach((ex, k) => chip(c, 318, 150 + k * 84, 0.34, headFn, ex, "#ffffff"));
  c.fillStyle = "rgba(36,23,38,0.55)"; c.font = "500 11px Fredoka"; c.textAlign = "center"; ["happy", "shocked", "smug"].forEach((t, k) => c.fillText(t, 318, 198 + k * 84));
  label(c, (i === 0 ? "" : i + " · ") + ch.name, ch.line);
  return cv;
}
const sheet2 = document.getElementById("sheet");
const which2 = (location.hash || "#all").slice(1);
document.fonts.ready.then(() => SYSTEM.forEach((ch, i) => { if (which2 === "a" && i > 4) return; if (which2 === "b" && i < 5) return; sheet2.appendChild(drawSys(ch, i)); }));
document.getElementById("ttl").textContent = which2 === "b" ? "Our base system · same rig, different outfits (2/2)" : "Our base system · same rig, different outfits (1/2)";
</script>
