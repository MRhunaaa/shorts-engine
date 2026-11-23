import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/ice/Bridge";
import { BridgeShort as WrightShort, BRIDGE_FRAMES as WRIGHT_FRAMES } from "./videos/wright/Bridge";
import { BridgeShort as DinoShort, BRIDGE_FRAMES as DINO_FRAMES } from "./videos/dino/Bridge";
import { BridgeShort as FlopShort, BRIDGE_FRAMES as FLOP_FRAMES } from "./videos/flop/Bridge";
import { CastSheet, CAST_FRAMES } from "./videos/ward/CastSheet";
import { WardShort, WARD_FRAMES } from "./videos/ward/Ward";
import { Horror1, HORROR1_FRAMES } from "./videos/horror1/Horror1";
import { RigSheet } from "./videos/horror2/RigSheet";
import { Horror2, HORROR2_FRAMES } from "./videos/horror2/Horror2";
import { Horror3, HORROR3_FRAMES } from "./videos/horror3/Horror3";
import { CastSheet as H3CastSheet } from "./videos/horror3/CastSheet";
const Root: React.FC = () => (<>
  <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="FlopShort" component={FlopShort} durationInFrames={FLOP_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="WrightShort" component={WrightShort} durationInFrames={WRIGHT_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="DinoShort" component={DinoShort} durationInFrames={DINO_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="WardShort" component={WardShort} durationInFrames={WARD_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="Horror2" component={Horror2} durationInFrames={HORROR2_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="H2Rig" component={RigSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="Horror3" component={Horror3} durationInFrames={HORROR3_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="H3Cast" component={H3CastSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="Horror1"component={Horror1} durationInFrames={HORROR1_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="WardCast" component={CastSheet} durationInFrames={CAST_FRAMES} fps={30} width={1080} height={1920} />
</>);
registerRoot(Root);
