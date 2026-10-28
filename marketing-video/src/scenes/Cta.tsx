import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Sprite } from '../components/Backdrop';
import { KineticLine, Rise } from '../components/Kinetic';
import { FLOAT, lerp, sp } from '../components/motion';
import { COPY } from '../config';
import { C, UI, useLayout } from '../theme';
import { Wordmark } from './Reveal';

/** 24–30 s: the bear cheers, wordmark, "KUMA-г туршаад үз", the web address; holds to the end. */
export const Cta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { wide } = useLayout();
  const bearIn = sp(frame, fps, 4, FLOAT);
  const hop = Math.abs(Math.sin(Math.max(0, frame - 30) / 9)) * 18 * lerp(frame, [30, 60], [0, 1]);
  // bear_cheer_scarf is 90 px wide native; 4× on vertical, 4× on wide keeps every pixel square
  const bearW = 360;

  const bear = (
    <div style={{ transform: `translateY(${(1 - bearIn) * 600 - hop}px) rotate(${(1 - bearIn) * -12}deg)` }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -26,
          width: bearW * 0.8,
          height: 40,
          marginLeft: -bearW * 0.4,
          borderRadius: '50%',
          background: 'rgba(25,21,46,0.28)',
          transform: `scale(${1 - hop / 60})`,
          filter: 'blur(6px)',
        }}
      />
      <Sprite name="bear_cheer_scarf" width={bearW} />
    </div>
  );

  const words = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: wide ? 'flex-start' : 'center', gap: wide ? 30 : 34 }}>
      <Wordmark size={wide ? 170 : 190} delay={14} />
      <KineticLine text={COPY.cta.headline} size={wide ? 104 : 96} color={C.white} delay={26} style={{ justifyContent: wide ? 'flex-start' : 'center' }} />
      <Rise delay={44}>
        <div
          style={{
            fontFamily: UI,
            fontWeight: 700,
            fontSize: wide ? 40 : 38,
            color: C.ink,
            background: C.white,
            borderRadius: 999,
            padding: '22px 40px',
            border: `4px solid ${C.ink}`,
            boxShadow: `0 8px 0 ${C.ink}`,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: 999, background: C.lime, border: `3px solid ${C.ink}` }} />
          {COPY.cta.url}
        </div>
      </Rise>
      <Rise delay={54}>
        <div style={{ fontFamily: UI, fontWeight: 600, fontSize: wide ? 32 : 32, color: 'rgba(255,255,255,0.78)', textAlign: wide ? 'left' : 'center' }}>{COPY.cta.footer}</div>
      </Rise>
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop color={C.violet} glow="rgba(243,246,108,0.25)" pixels={[C.lemon, C.white, C.indigo]} seed="cta" />
      {wide ? (
        <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 140 }}>
          <div style={{ position: 'relative' }}>{bear}</div>
          {words}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 70 }}>
          <div style={{ position: 'relative' }}>{bear}</div>
          {words}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
