// Screen-space directional motion blur: the whole frame is smeared along the camera's per-frame image motion
// (computed in Bridge.tsx from the camera at f-1 vs f). Used for whip pans and fast camera bursts, like the reference.
import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

const frag = /* glsl */ `
uniform vec2 uDir;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (length(uDir) < 0.0015) { outputColor = inputColor; return; }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 24; i++) {
    float t = float(i) / 23.0 - 0.5;
    acc += texture2D(inputBuffer, clamp(uv + uDir * t, 0.0, 1.0));
  }
  outputColor = acc / 24.0;
}`;

export class MotionBlur extends Effect {
  constructor() {
    super("MotionBlur", frag, { uniforms: new Map([["uDir", new Uniform(new Vector2())]]) });
  }
  setDir(x: number, y: number) { (this.uniforms.get("uDir")!.value as Vector2).set(x, y); }
}
