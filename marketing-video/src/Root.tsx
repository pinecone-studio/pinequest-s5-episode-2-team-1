import { Composition } from 'remotion';
import { FPS, TOTAL_FRAMES } from './config';
import './theme';
import { KumaVideo } from './Video';

export const Root = () => (
  <>
    <Composition id="KumaVertical" component={KumaVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="KumaWide" component={KumaVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
