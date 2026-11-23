---
tags: [characters, 3d, rig, spec]
status: in use since video 5 (2026-11-22)
code: src/videos/ward/rig.ts
qa: out/ward/cast_sheet.jpg (WardCast composition: front, 3/4, side, back + face close-ups)
---
# Character Rig 3D: the approved v3 rig as real meshes

Same proportions as [[Character Rig v3 - Official Spec]], now real 3D geometry rendered in three.js with lights, shadows and ink outlines. No 2D cards and no assets.

## Geometry (metres; 1 card px = 1.7/522 m)
| Part | Mesh | Size |
|---|---|---|
| Head | sphere 64×48 | r 0.300, centre y 1.40 |
| Body | RoundedBoxGeometry | 0.443 × 0.651 × 0.34, radius 0.10, centre y 0.795 |
| Arms | 2-bone IK, open cylinders + ball joints | upper 0.26, lower 0.27, r 0.013 (ink) |
| Hands | sphere | r 0.036, ink + white glint |
| Legs | 2-bone IK | 0.25 + 0.25, r 0.0195 trousers / 0.015 ink |
| Shoes | rounded box | 0.095 × 0.06 × 0.16, glossy |

## Face (everything placed ON the sphere surface with `onHead(u, v)` in card px)
- Eyes: flattened black ellipsoids (8.5 × 12 px) at ±31 px + emissive glint. Blink = scale y. Look = slide on the surface.
- Brows: capsules (9 px thick, 26 px long), expression = height + rotation: calm, angry, sad, raised, worry, smug. **The sign is checked: worry/sad = inner ends UP.**
- Mouths: tapered tubes for smile, frown, flat and grin; an ellipsoid with a tongue for o and open (talk = scale).
- **Moustaches = one curve + its exact mirror**, starting 3 px past the centre line so the halves overlap. Styles: handlebar (curled tips), walrus, pencil.
- Hair: sphere shells (bald-sides horseshoe, full, bun with a centre parting), side whiskers / mutton chops (tapered tubes), full beard (lower sphere shell).
- Glasses: round (bridge + temples) or monocle (+ cord).
- Mob cap: gathered shell + ruffled frill + ribbon, both seated on the cap rim.

## Outfit kit (1840s)
Frock coat body, extruded notched lapels (mirrored), waistcoat panel with 5 buttons, shirt V, collar points, bow or stock cravat, pocket square, gold watch chain + watch, coat buttons (4-hole), waist seam, knee-length frock skirt + 2 swinging back tails with buttons. For women: long dress cone with folds, hem band, apron (front panel + bib + straps), shawl, lace collar, pintucks.

## Pose API (`Character.pose`)
`x, z, yaw, y, walk (phase), stride, lean, tilt, headYaw/Pitch/Roll, brows, mouth, mouthOpen, eyes [x,y], blink, eyeScale, armL/armR (named or body-space target), squash, seat, noLegs, germs (0..1)`.
Named arms: hang, hips, point, up, scrub (animated), head, front, shrug, fold (crossed), out, chin, wave (animated).
Automatic: breathing, random blinks, coat-tail and skirt swing, arm swing while walking.

## Rendering look
MeshStandard (roughness 0.6-0.9) for soft gradient shading + ink pass outlines (4.2 px near → 2.6 px far) + bloom on emissive flames + Neutral tone map + LensFX grade (night: blue shadows, warm highlights, vignette 0.55).

---
Back to [[00 HOME - Channel HQ]]
