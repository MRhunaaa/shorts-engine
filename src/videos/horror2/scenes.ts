// Shot index for Horror2 "Gelas Kelima": shots live in scenesA.ts (hook..return) and scenesB.ts (count..end); times from timeline.json.
import { TL, Shot } from "./types";
import { SHOTS_A } from "./scenesA";
import { SHOTS_B } from "./scenesB";
export type { Shot, Light, Cam } from "./types";

export const SHOTS: Shot[] = [...SHOTS_A, ...SHOTS_B].sort((x, y) => x.a - y.a);
export const TOTAL_S = TL.total;
export const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
