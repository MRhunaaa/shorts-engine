// Shot index for Horror3 "Kabut Lalijiwo": A = hook, title, summit, fog · B = lost, procession, fast, ravine · C = rescue, doubt, offer, end.
import { TL, Shot } from "./types";
import { SHOTS_A } from "./scenesA";
import { SHOTS_B } from "./scenesB";
import { SHOTS_C } from "./scenesC";
export type { Shot, Light, Cam } from "./types";

export const SHOTS: Shot[] = [...SHOTS_A, ...SHOTS_B, ...SHOTS_C].sort((x, y) => x.a - y.a);
export const TOTAL_S = TL.total;
export const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
