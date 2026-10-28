import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Sprite } from '../components/Backdrop';
import { KineticLine } from '../components/Kinetic';
import { FLOAT, lerp, POP, sp } from '../components/motion';
import { Phone } from '../components/Phone';
import { COPY } from '../config';
import { C, UI, useLayout } from '../theme';

const CHIP_BG = [C.violet, C.lemon, C.pink, C.sky];
const CHIP_FG = [C.white, C.ink, C.ink, C.ink];

/** 19–24 s: what KUMA is, in facts only — textbook topics, grades 6–12 math, short daily tasks, boss battles, offline practice. */
export const Value = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { wide } = useLayout();
  const size = wide ? 116 : 108;
  const drift = lerp(frame, [0, 162], [0, 1]);
  const phoneIn = sp(frame, fps, 44, FLOAT);

  return (
    <AbsoluteFill>
      <Backdrop color={C.paper} glow="rgba(122,92,245,0.16)" pixels={[C.violet, C.lemon, C.lime]} seed="value" />
      {/* the real grade picker, tilted and cropped by the frame */}
      <div
        style={{
          position: 'absolute',
          left: wide ? 1380 : 470,
          top: wide ? 580 : 1250,
          perspective: 2400,
          transform: `translateY(${(1 - phoneIn) * 700 - drift * 40}px)`,
        }}
      >
        <div style={{ transform: `rotateZ(${wide ? -8 : -10}deg) rotateY(-18deg) rotateX(10deg)` }}>
          <Phone width={wide ? 440 : 560} screens={[{ src: 'onboarding-grade', at: 0 }]} />
        </div>
      </div>
      <AbsoluteFill
        style={{
          justifyContent: wide ? 'center' : 'flex-start',
          padding: wide ? '0 170px' : '300px 90px 0',
          transform: `translateY(${-drift * 30}px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: wide ? 1120 : undefined }}>
          <KineticLine text={COPY.value.headline[0]} size={size} color={C.ink} delay={4} />
          <KineticLine text={COPY.value.headline[1]} size={size} color={C.violet} delay={12} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: wide ? 26 : 24, marginTop: wide ? 70 : 80, maxWidth: wide ? 1080 : 900, perspective: 1600 }}>
          {COPY.value.chips.map((c, i) => {
            const p = sp(frame, fps, 30 + i * 7, POP);
            return (
              <div
                key={c.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  fontFamily: UI,
                  fontWeight: 700,
                  fontSize: wide ? 44 : 44,
                  letterSpacing: '-0.01em',
                  color: CHIP_FG[i],
                  background: CHIP_BG[i],
                  border: `4px solid ${C.ink}`,
                  boxShadow: `0 8px 0 ${C.ink}`,
                  borderRadius: 999,
                  padding: c.icon ? '16px 36px 16px 22px' : '16px 36px',
                  opacity: lerp(p, [0, 0.3], [0, 1]),
                  transform: `translateY(${(1 - p) * 80}px) rotateX(${(1 - p) * -60}deg) scale(${0.8 + p * 0.2})`,
                  transformOrigin: 'center bottom',
                }}
              >
                {c.icon ? <Sprite name={c.icon} width={60} /> : null}
                {c.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
