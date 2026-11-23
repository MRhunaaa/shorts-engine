// ---------- 5 face / head STYLE options on the same body ----------
function dotEyes(c, x, y, gap, ex, brow, r = 9) {
  for (const s of [-1, 1]) {
    const cx = x + s * gap;
    if (ex === "smug") L(c, [[cx - 12, y], [cx + 12, y]], 7); else E(c, cx, y, ex === "shock" ? r * 1.2 : r * 0.85, ex === "shock" ? r * 1.4 : r * 1.15, INK, 0);
    const by = y - 26 - (ex === "shock" ? 8 : 0);
    L(c, [[cx - 18, by + (s < 0 ? 4 : -2)], [cx + 18, by + (s < 0 ? -2 : 4)]], 9, brow);
  }
}
function lineMouth(c, x, y, ex, w = 16) { if (ex === "shock") E(c, x, y + 4, 8, 10, "#5a1f2e", 6); else if (ex === "smug") Q(c, [x - w, y + 2], [x, y + 6], [x + w, y - 4], 6); else Q(c, [x - w, y - 2], [x, y + 8], [x + w, y - 2], 6); }
const STYLES = {
  /** A: current: long oval, almond eyes */
  A: (c, ex, o) => baseHead(c, ex, o),
  /** B: clean round head, dot eyes + strong brows, no nose (minimal, international) */
  B: (c, ex, o) => {
    const { skin, hairBack, hairFront, brow = "#3a2a20", face } = o;
    if (hairBack) hairBack(c);
    for (const s of [-1, 1]) E(c, 150 + s * 86, 170, 12, 16, skin, 7);
    const g = c.createLinearGradient(150, 76, 150, 262); g.addColorStop(0, hex(skin, 1.06)); g.addColorStop(1, hex(skin, 0.88));
    E(c, 150, 170, 88, 90, g);
    dotEyes(c, 150, 168, 32, ex, brow);
    if (face) face(c, ex); else lineMouth(c, 150, 214, ex);
    if (hairFront) hairFront(c);
  },
  /** C: rounded-square head with a jaw, line eyes with small pupils (graphic, modern) */
  C: (c, ex, o) => {
    const { skin, hairBack, hairFront, brow = "#3a2a20", face } = o;
    if (hairBack) hairBack(c);
    for (const s of [-1, 1]) E(c, 150 + s * 84, 172, 11, 16, skin, 7);
    const g = c.createLinearGradient(150, 80, 150, 262); g.addColorStop(0, hex(skin, 1.06)); g.addColorStop(1, hex(skin, 0.86));
    path(c, () => c.roundRect(68, 84, 164, 172, [64, 64, 50, 50])); fillInk(c, g);
    for (const s of [-1, 1]) { const cx = 150 + s * 34; if (ex === "smug") L(c, [[cx - 14, 166], [cx + 14, 166]], 7); else { L(c, [[cx - 15, 164], [cx + 15, 164]], 6); E(c, cx, ex === "shock" ? 168 : 170, ex === "shock" ? 7 : 6, ex === "shock" ? 8 : 6, INK, 0); } L(c, [[cx - 18, 140 + (s < 0 ? 4 : 0) - (ex === "shock" ? 8 : 0)], [cx + 18, 140 + (s < 0 ? 0 : 4) - (ex === "shock" ? 8 : 0)]], 9, brow); }
    L(c, [[150, 176], [150, 196]], 5, hex(skin, 0.6));
    if (face) face(c, ex); else lineMouth(c, 150, 220, ex, 18);
    if (hairFront) hairFront(c);
  },
  /** D: tall egg head (vertical), wide-set oval eyes, slim neck: elegant */
  D: (c, ex, o) => {
    const { skin, hairBack, hairFront, brow = "#3a2a20", face } = o;
    if (hairBack) hairBack(c);
    for (const s of [-1, 1]) E(c, 150 + s * 70, 180, 10, 15, skin, 7);
    const g = c.createLinearGradient(150, 60, 150, 270); g.addColorStop(0, hex(skin, 1.06)); g.addColorStop(1, hex(skin, 0.86));
    path(c, () => { c.moveTo(150, 60); c.bezierCurveTo(214, 60, 222, 150, 216, 200); c.bezierCurveTo(208, 252, 180, 268, 150, 268); c.bezierCurveTo(120, 268, 92, 252, 84, 200); c.bezierCurveTo(78, 150, 86, 60, 150, 60); }); fillInk(c, g);
    for (const s of [-1, 1]) { const cx = 150 + s * 30; if (ex === "smug") Q(c, [cx - 12, 176], [cx, 170], [cx + 12, 176], 7); else { E(c, cx, 174, 13, ex === "shock" ? 17 : 14, "#ffffff", 6); E(c, cx, 176, 6, 7, INK, 0); } L(c, [[cx - 16, 150 - (ex === "shock" ? 8 : 0)], [cx + 16, 150 - (ex === "shock" ? 8 : 0)]], 7, brow); }
    Q(c, [145, 204], [150, 210], [155, 204], 5, hex(skin, 0.55));
    if (face) face(c, ex); else lineMouth(c, 150, 230, ex, 14);
    if (hairFront) hairFront(c);
  },
  /** E: smaller head, longer body (1:3 proportions), simple features: most grown-up */
  E: (c, ex, o) => { c.save(); c.translate(150, 262); c.scale(0.76, 0.76); c.translate(-150, -262); STYLES.B(c, ex, o); c.restore(); },
};
const STYLE_INFO = {
  A: ["A · Oval + almond eyes", "current version: calm, realistic-ish"],
  B: ["B · Round + dot eyes", "minimal, clean, international"],
  C: ["C · Rounded square", "graphic, modern, strong jaw"],
  D: ["D · Tall egg + oval eyes", "elegant, expressive whites"],
  E: ["E · Small head, tall body", "most grown-up proportions"],
};
function drawVariant(styleKey, ch, bgI) {
  const cv = document.createElement("canvas"); cv.width = 720; cv.height = 940; const c = P(cv.getContext("2d")); c.scale(2, 2);
  card(c, BG[bgI][0], BG[bgI][1]);
  c.save(); c.translate(0, 26); c.translate(150, 0); c.scale(0.76, 0.76); c.translate(-150, 0); c.translate(-30, 0);
  baseBody(c, { ...ch.body, skin: ch.skin, arm: ch.body.arm === "hips" ? "hips" : "hang", prop: undefined });
  STYLES[styleKey](c, "happy", { skin: ch.skin, brow: ch.brow, ...ch.head });
  c.restore();
  const headFn = (cc, ex) => STYLES[styleKey](cc, ex, { skin: ch.skin, brow: ch.brow, ...ch.head });
  ["happy", "shock", "smug"].forEach((ex, k) => chip(c, 318, 150 + k * 84, 0.34, headFn, ex, "#ffffff"));
  c.fillStyle = "rgba(36,23,38,0.55)"; c.font = "500 11px Fredoka"; c.textAlign = "center"; ["happy", "shocked", "smug"].forEach((t, k) => c.fillText(t, 318, 198 + k * 84));
  label(c, STYLE_INFO[styleKey][0], STYLE_INFO[styleKey][1] + (ch.name === "BASE" ? "" : " · " + ch.name.toLowerCase()));
  return cv;
}
const sheetV = document.getElementById("sheet");
const row = (location.hash || "#base").slice(1);
document.fonts.ready.then(() => ["A", "B", "C", "D", "E"].forEach((k, i) => sheetV.appendChild(drawVariant(k, row === "outfit" ? SYSTEM[7] : SYSTEM[0], row === "outfit" ? 7 : i))));
document.getElementById("ttl").textContent = row === "outfit" ? "5 face styles · in an outfit (Detective)" : "5 face styles · on the BASE body";
</script>
