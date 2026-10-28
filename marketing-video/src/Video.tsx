import { springTiming, type TransitionPresentation, TransitionSeries } from '@remotion/transitions';
import { iris } from '@remotion/transitions/iris';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import type { ComponentType } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { SCENE_ORDER, type SceneKey, sequenceLength, TRANSITION } from './config';
import { Cta } from './scenes/Cta';
import { BearFeature, DuelFeature, MapFeature } from './scenes/Features';
import { Hook } from './scenes/Hook';
import { Reveal } from './scenes/Reveal';
import { Value } from './scenes/Value';
import { useLayout } from './theme';
import voice from './voice-manifest.json';

const SCENE_COMPONENTS: Record<SceneKey, ComponentType> = {
  hook: Hook,
  reveal: Reveal,
  map: MapFeature,
  bear: BearFeature,
  duel: DuelFeature,
  value: Value,
  cta: Cta,
};

const timing = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION, durationRestThreshold: 0.001 });

export const KumaVideo = () => {
  const { width, height, wide } = useLayout();
  // transition into each scene (index = incoming scene)
  const presentations: (TransitionPresentation<any> | null)[] = [
    null,
    iris({ width, height }),
    slide({ direction: wide ? 'from-right' : 'from-bottom' }),
    slide({ direction: 'from-right' }),
    slide({ direction: 'from-right' }),
    wipe({ direction: wide ? 'from-left' : 'from-top' }),
    iris({ width, height }),
  ];

  return (
    <AbsoluteFill style={{ background: '#19152E' }}>
      <TransitionSeries>
        {SCENE_ORDER.flatMap((key, i) => {
          const Scene = SCENE_COMPONENTS[key];
          const items = [];
          const p = presentations[i];
          if (p) items.push(<TransitionSeries.Transition key={`t-${key}`} presentation={p} timing={timing} />);
          items.push(
            <TransitionSeries.Sequence key={key} durationInFrames={sequenceLength(key)}>
              <Scene />
            </TransitionSeries.Sequence>,
          );
          return items;
        })}
      </TransitionSeries>
      {/* voice-over clips from scripts/voice.mjs, placed on the global timeline */}
      {voice.map((v) => (
        <Sequence key={v.file} from={v.from} durationInFrames={v.frames} layout="none">
          <Audio src={staticFile(v.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

