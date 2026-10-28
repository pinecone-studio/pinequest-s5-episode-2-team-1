import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Sprite } from '../components/Backdrop';
import { KineticLine } from '../components/Kinetic';
import { GLIDE, lerp, POP, sp } from '../components/motion';
import { COPY } from '../config';
import { C, useLayout } from '../theme';

const BEAT2 = 52;

/** 0–3 s: name the real problem (revision feels boring), strike it, flip to the promise. */
export const Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { wide, width } = useLayout();
  const size = wide ? 150 : 132;
  const strike = sp(frame, fps, 26, GLIDE, 12);
  const push = lerp(frame, [0, 96], [1, 1.08]);
  const icons = ['icon_star', 'icon_coin', 'icon_heart', 'icon_flame'];
  const spots = wide
    ? [[-560, -230], [560, -200], [-520, 230], [540, 250]]
    : [[-330, -330], [320, -300], [-300, 330], [330, 300]];

  return (
    <AbsoluteFill>
      <Backdrop color={C.ink} glow="rgba(122,92,245,0.35)" pixels={[C.violet, C.lemon]} seed="hook" />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${push})` }}>
        {frame < BEAT2 + 12 ? (
          <div style={{ position: 'absolute', width: width * 0.86, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <KineticLine text={COPY.hook.line1} size={size} color={C.white} delay={2} exitAt={BEAT2 - 4} style={{ justifyContent: 'center' }} />
            <KineticLine
              text={COPY.hook.line2}
              size={size}
              color={C.pink}
              delay={9}
              exitAt={BEAT2 - 2}
              style={{ justifyContent: 'center' }}
              renderWord={(w) =>
                w === COPY.hook.struck ? (
                  <span style={{ position: 'relative' }}>
                    {w}
                    <span
                      style={{
                        position: 'absolute',
                        left: '-3%',
                        right: '-3%',
                        top: '52%',
                        height: size * 0.09,
                        background: C.lemon,
                        transform: `scaleX(${strike})`,
                        transformOrigin: 'left center',
                      }}
                    />
                  </span>
                ) : (
                  w
                )
              }
            />
          </div>
        ) : null}
        {frame >= BEAT2 - 4 ? (
          <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KineticLine text={COPY.hook.line3} size={size * 1.12} color={C.lemon} delay={BEAT2} stagger={5} style={{ justifyContent: 'center' }} />
            {icons.map((name, i) => {
              const p = sp(frame, fps, BEAT2 + 8 + i * 3, POP);
              const bob = Math.sin((frame + i * 20) / 9) * 8;
              return (
                <div
                  key={name}
                  style={{
                    position: 'absolute',
                    transform: `translate(${spots[i][0]}px, ${spots[i][1] + bob}px) scale(${p}) rotate(${(1 - p) * -40}deg)`,
                  }}
                >
                  <Sprite name={name} width={108} />
                </div>
              );
            })}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
