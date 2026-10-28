import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Rise } from '../components/Kinetic';
import { FLOAT, GLIDE, lerp, POP, sp } from '../components/motion';
import { Phone } from '../components/Phone';
import { COPY } from '../config';
import { C, PIXEL, UI, useLayout } from '../theme';

/** 3–7 s: wordmark drops in letter by letter, the app's own tagline, the real home screen rises in 3D. */
export const Reveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { wide } = useLayout();

  const phoneIn = sp(frame, fps, 22, FLOAT);
  const drift = lerp(frame, [0, 132], [0, 1]);
  const phoneW = wide ? 470 : 640;

  const brand = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: wide ? 'flex-start' : 'center', gap: wide ? 34 : 30 }}>
      <Wordmark size={wide ? 230 : 250} delay={6} />
      <div style={{ fontFamily: UI, fontWeight: 700, fontSize: wide ? 58 : 54, lineHeight: 1.12, letterSpacing: '-0.02em', color: C.white, textAlign: wide ? 'left' : 'center' }}>
        {COPY.reveal.tagline.map((l, i) => (
          <Rise key={l} delay={22 + i * 5}>
            {l}
          </Rise>
        ))}
      </div>
      <Rise delay={36}>
        <div
          style={{
            fontFamily: UI,
            fontWeight: 700,
            fontSize: wide ? 34 : 34,
            color: C.ink,
            background: C.lemon,
            borderRadius: 999,
            padding: '14px 30px',
            border: `3px solid ${C.ink}`,
            boxShadow: `0 6px 0 ${C.ink}`,
          }}
        >
          {COPY.reveal.chip}
        </div>
      </Rise>
    </div>
  );

  const phone = (
    <div style={{ perspective: 2600 }}>
      <div
        style={{
          transform: `translateY(${(1 - phoneIn) * (wide ? 900 : 1100)}px) rotateX(${(1 - phoneIn) * 32 + 6 - drift * 4}deg) rotateY(${lerp(drift, [0, 1], [-10, 6])}deg) rotateZ(${(1 - phoneIn) * -6}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <Phone width={phoneW} screens={[{ src: 'home', at: 0 }]} />
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop color={C.violet} glow="rgba(243,246,108,0.22)" pixels={[C.lemon, C.white, C.indigo]} seed="reveal" />
      {wide ? (
        <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '0 170px 0 150px' }}>
          {brand}
          <div style={{ transform: `translateY(${120 - drift * 30}px)` }}>{phone}</div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ alignItems: 'center' }}>
          <div style={{ marginTop: 190 }}>{brand}</div>
          <div style={{ position: 'absolute', top: 880 - drift * 40 }}>{phone}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** "KUMA" in Pixelify Sans, lemon with an ink hard shadow, each letter dropping in on a spring. */
export const Wordmark = ({ size, delay = 0, color = C.lemon }: { size: number; delay?: number; color?: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', fontFamily: PIXEL, fontWeight: 700, fontSize: size, lineHeight: 0.9, color, letterSpacing: '0.02em' }}>
      {COPY.reveal.wordmark.split('').map((ch, i) => {
        const p = sp(frame, fps, delay + i * 4, POP);
        const settle = sp(frame, fps, delay + i * 4, GLIDE);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${(1 - p) * -size * 0.9}px) scale(${0.6 + settle * 0.4})`,
              opacity: lerp(p, [0, 0.2], [0, 1]),
              textShadow: `0 ${size * 0.05}px 0 ${C.ink}`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};
