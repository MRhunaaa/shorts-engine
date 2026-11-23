---
tags: [characters, spec, approved, brand]
status: APPROVED 2026-11-22
source: vault/pages/cast-detail.html
images: out/detail_a.png, out/detail_b.png, out/santa_detail.png
---
# Character Rig v3: official spec ✅

The user's words: "okee sipp ini punya kitaaa skrng!!" (approved 2026-11-22).

## Geometry (canvas 460×700 card, before the 0.88 scale)
| Part | Spec |
|---|---|
| Head | perfect circle, centre (230, 210), r = 92 |
| Body | rounded rectangle 136 × 200 at (162, 296), corner radius 44 |
| Arms | stick, 8 px ink, from shoulders (CX±62, BY+40); poses: `hang` (elbow CX±92, hand CX±94/BY+156) or `hips` |
| Hands | ink dots r = 11 + small white glint |
| Legs | stick 9 px ink (+5 px colour core optional), from BY+BH-8 to y = 640 |
| Shoes | rounded toe, sole line, shine; colour per outfit |
| Shadow | ellipse under feet (96 × 13, 20 % ink) |

## Face
- Pale cream head `#f7f1e8`, radial gradient (white top-left → `#ddd0bf` edge), blue rim light on the right edge.
- Eyes: black ovals 8.5 × 12 at ±31 px, white glint top-left.
- Brows: 9 px, curved (calm) or angled (stern), colour = hair or ink.
- Mouth: simple curve; moustaches/beards replace it.
- Symmetric. Adult. No blush (except Santa/Elf cheeks).

## Shading + texture rules
- Body fill: vertical gradient (×1.12 top → base → ×0.76 bottom) + side light (white left, dark right, blue rim).
- Fabric weave: diagonal 1.2 px lines every 6 px at 7 % ink.
- Head casts a shadow on the chest (ellipse 70 × 26, 22 % ink); hats cast a shadow on the forehead (`hatShadow` px).
- Outline: `#1a1418`, 7 px main, 3-5 px details.

## Detail kit (functions in the page)
`weave` · `fold` (dark + light pair) · `stitch` / `stitchQ` (dashed 4/4) · `button` (4 holes + shine) · `metal` (bevel + engraving + highlight) · `furBand` (scalloped, tufts) · `pocket` (flap + stitching) · `bodyLight` · `moustache` (strands).

## Approved outfits
| Outfit | Key details |
|---|---|
| Cowboy | felt hat (curl brim, pinch dents, stud band, stitching), moustache + straw + stubble, plaid shirt + pearl snaps, leather vest (seams, wear), pocket, star badge, gun belt + bullets + engraved buckle, holster + revolver grip |
| Santa | velvet cone hat + folds, fur brim, round fluffy pom-pom, **classic fluffy moustache with upward-curled tips** + strands, glossy round nose, curly beard, red velvet suit + fur placket/hem, belt + gold buckle + keeper, green mittens |
| Elf | felt hat + texture + jingle bell sparkle, pointy ears, scalloped collar + bells, pointed hem + gold trim, belt, buttons, striped tights, green shoes |
| Chef | pleated toque, curly moustache, double-breasted jacket + cloth buttons + red piping, pens pocket, red neckerchief knot, apron, towel, striped trousers |
| Doctor | head mirror on strap, round glasses + glare, notched-lapel coat over scrubs, ID badge on lanyard, 3 pens, stethoscope with metal chest piece |
| Base | collared shirt, pocket, 4 buttons, hair with strands |

## How to add a new character
New outfit = new `draw(c)` using `legs`, `arms`, `bodyShape(base, details)`, `head({eyes, hatShadow, face, over, behind})` + detail kit. Aim for 8-12 details per outfit (fabric, folds, stitching, fasteners, metal, accessory, prop).

## Next technical step
Port these drawing functions into the video engine's 2D cards (`toon.ts` / `cast.ts`) so they render in the 3D world with lighting, blinks, lip-sync and poses.

## Rejected on the way (for context)
Bean bodies (too plain) → animal-head hosts (dropped) → AI image sheets (user: use code) → chubby/goofy faces → over-simple face styles. See [[Host Casting - 10 characters + 6 looks]], [[Base Character System - one rig many outfits]].
