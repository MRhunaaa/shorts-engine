// Reference-matched transitions + display grade, in ONE convolution pass after tone mapping (own EffectPass):
//  - bubble: glass-bubble lens (centre magnified, edges bent, chromatic fringe, glare ring)  -> burglar ref transition
//  - zoom:   radial zoom-through blur toward the centre                                       -> burglar ref transition
//  - grade:  exposure, contrast, saturation, shadow/highlight tint, vignette (night = blue shadows, warm highlights)
import { Effect, EffectAttribute } from "postprocessing";
import { Uniform, Vector3 } from "three";

const frag = /* glsl */ `
uniform float uBubble, uZoom, uVig, uExpo, uSat, uCon;
uniform vec3 uLift, uGain;
vec3 samp(vec2 p) { return texture2D(inputBuffer, clamp(p, 0.0, 1.0)).rgb; }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = uv - 0.5;
  vec2 ca = vec2(c.x * aspect, c.y);
  float r2 = dot(ca, ca);
  // glass bubble: magnify the centre, push the rim outward
  float k = 1.0 - uBubble * 0.62 + uBubble * 1.25 * r2;
  vec2 q = 0.5 + c * k;
  vec3 col;
  if (uBubble > 0.001 || uZoom > 0.001) {
    vec3 acc = vec3(0.0);
    const int N = 14;
    for (int i = 0; i < N; i++) {
      float t = float(i) / float(N - 1);
      float s = 1.0 - uZoom * 0.22 * t;
      vec2 p = 0.5 + (q - 0.5) * s;
      float ch = uBubble * 0.012 * (0.4 + r2 * 3.0);
      acc += vec3(samp(0.5 + (p - 0.5) * (1.0 + ch)).r, samp(p).g, samp(0.5 + (p - 0.5) * (1.0 - ch)).b);
    }
    col = acc / float(N);
    // glare ring + rim darkening of the bubble
    float rr = sqrt(r2);
    col += uBubble * 0.35 * smoothstep(0.06, 0.0, abs(rr - 0.42 + 0.1 * uBubble)) * vec3(1.0, 0.97, 0.92);
    col *= 1.0 - uBubble * 0.45 * smoothstep(0.35, 0.75, rr);
  } else col = inputColor.rgb;
  // grade (display-referred)
  col *= uExpo;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uCon + 0.5;
  float ll = clamp(dot(col, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
  col += uLift * (1.0 - ll) * (1.0 - ll) + uGain * ll * ll;
  float v = smoothstep(0.32, 0.92, length(vec2(c.x * 1.15, c.y)));
  col *= 1.0 - uVig * v;
  outputColor = vec4(max(col, 0.0), inputColor.a);
}`;

export type GradeSet = { expo: number; sat: number; con: number; lift: [number, number, number]; gain: [number, number, number]; vig: number };
export const GRADE_NIGHT: GradeSet = { expo: 1.12, sat: 1.08, con: 1.08, lift: [-0.012, 0.0, 0.035], gain: [0.03, 0.012, -0.02], vig: 0.55 };
export const GRADE_DAY: GradeSet = { expo: 1.02, sat: 1.1, con: 1.05, lift: [0.0, 0.004, 0.014], gain: [0.025, 0.012, -0.01], vig: 0.32 };

export class LensFX extends Effect {
  constructor() {
    super("LensFX", frag, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["uBubble", new Uniform(0)], ["uZoom", new Uniform(0)], ["uVig", new Uniform(0.5)], ["uExpo", new Uniform(1)],
        ["uSat", new Uniform(1)], ["uCon", new Uniform(1)], ["uLift", new Uniform(new Vector3())], ["uGain", new Uniform(new Vector3())],
      ]),
    });
  }
  set(g: GradeSet, bubble: number, zoom: number, expoMul = 1) {
    const u = this.uniforms;
    u.get("uBubble")!.value = bubble; u.get("uZoom")!.value = zoom; u.get("uVig")!.value = g.vig;
    u.get("uExpo")!.value = g.expo * expoMul; u.get("uSat")!.value = g.sat; u.get("uCon")!.value = g.con;
    (u.get("uLift")!.value as Vector3).set(...g.lift); (u.get("uGain")!.value as Vector3).set(...g.gain);
  }
}
