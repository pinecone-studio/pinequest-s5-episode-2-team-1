import type { ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { KineticLine, Rise } from '../components/Kinetic';
import { FLOAT, lerp, sp } from '../components/motion';
import { Phone, type Screen, type Tap } from '../components/Phone';
import { PIXEL, UI, useLayout } from '../theme';

export interface FeatureProps {
  index: string;
  label: string;
  headline: readonly string[];
  caption: string;
  bg: string;
  glow: string;
  pixels: string[];
  /** Headline colour */
  fg: string;
  /** Caption colour */
  sub: string;
  /** Label pill colours */
  pill: { bg: string; fg: string };
  screens: Screen[];
  taps: Tap[];
  /** Phone rotateY at start → end of the scene (slow camera orbit). */
  orbit?: [number, number];
  /** Extra layers drawn around the phone (same coordinate box as the phone). */
  decor?: (phoneW: number, phoneH: number) => ReactNode;
}

/** One feature beat: numbered label, kinetic two-line headline, caption, and the real UI on a phone with taps. */
export const Feature = (p: FeatureProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { wide } = useLayout();
  const phoneW = wide ? 430 : 580;
  const phoneH = (phoneW - phoneW * 0.064) * (844 / 390) + phoneW * 0.064;
  const enter = sp(frame, fps, 4, FLOAT);
  const t = lerp(frame, [0, durationInFrames], [0, 1]);
  const [o0, o1] = p.orbit ?? [-14, 8];
  const headSize = wide ? 104 : 108;

  const text = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: wide ? 26 : 22, alignItems: 'flex-start', width: wide ? 760 : 900 }}>
      <Rise delay={2} distance={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: p.pill.bg, color: p.pill.fg, borderRadius: 999, padding: '10px 26px 10px 14px' }}>
          <span style={{ fontFamily: PIXEL, fontWeight: 700, fontSize: 30, background: p.pill.fg, color: p.pill.bg, borderRadius: 999, padding: '2px 14px' }}>{p.index}</span>
          <span style={{ fontFamily: UI, fontWeight: 700, fontSize: 30, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.label}</span>
        </div>
      </Rise>
      <div>
        {p.headline.map((line, i) => (
          <KineticLine key={line} text={line} size={headSize} color={p.fg} delay={6 + i * 6} />
        ))}
      </div>
      <Rise delay={20}>
        <div style={{ fontFamily: UI, fontWeight: 500, fontSize: wide ? 40 : 40, lineHeight: 1.3, color: p.sub, maxWidth: wide ? 700 : 860 }}>{p.caption}</div>
      </Rise>
    </div>
  );

  const phone = (
    <div style={{ perspective: 2400 }}>
      <div
        style={{
          position: 'relative',
          transform: `translateY(${(1 - enter) * 700}px) rotateY(${lerp(t, [0, 1], [o0, o1]) + (1 - enter) * -20}deg) rotateX(${(1 - enter) * 18 + 3}deg) scale(${1 + t * 0.03})`,
          transformStyle: 'preserve-3d',
        }}
      >
        {p.decor?.(phoneW, phoneH)}
        <Phone width={phoneW} screens={p.screens} taps={p.taps} />
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop color={p.bg} glow={p.glow} pixels={p.pixels} seed={p.index} />
      {wide ? (
        <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '0 190px 0 150px' }}>
          {text}
          {phone}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ alignItems: 'center' }}>
          <div style={{ marginTop: 130 }}>{text}</div>
          <div style={{ position: 'absolute', top: 640 }}>{phone}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
