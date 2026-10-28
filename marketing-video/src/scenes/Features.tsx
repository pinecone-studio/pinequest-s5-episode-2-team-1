import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Sprite } from '../components/Backdrop';
import { POP, sp } from '../components/motion';
import { COPY } from '../config';
import { C, PIXEL } from '../theme';
import { Feature } from './Feature';

// Tap coordinates are in the app's 390×844 CSS px space, read off the captured screenshots.

/** 7–11 s: adventure map → lesson popup → real textbook problem answered correctly. */
export const MapFeature = () => (
  <Feature
    {...COPY.map}
    bg={C.indigo}
    glow="rgba(122,92,245,0.55)"
    pixels={[C.violet, C.lemon]}
    fg={C.white}
    sub="rgba(255,255,255,0.72)"
    pill={{ bg: C.lemon, fg: C.ink }}
    orbit={[-12, 6]}
    screens={[
      { src: 'path', at: 0 },
      { src: 'path-popup', at: 40, mode: 'fade' },
      { src: 'lesson-q', at: 66, mode: 'push' },
      { src: 'lesson-correct', at: 100, mode: 'fade' },
    ]}
    taps={[
      { at: 37, x: 202, y: 212 },
      { at: 63, x: 195, y: 364 },
      { at: 97, x: 107, y: 628 },
    ]}
  />
);

// side: -1 = hangs off the phone's left edge, 1 = right edge; y is a fraction of the phone height
const OUTFITS = [
  { name: 'item_gradcap', w: 234, side: -1, y: 0.14, d: 0 },
  { name: 'item_cowboy_hat', w: 228, side: 1, y: 0.26, d: 3 },
  { name: 'item_headphones', w: 213, side: -1, y: 0.5, d: 6 },
  { name: 'item_glasses', w: 196, side: 1, y: 0.62, d: 9 },
  { name: 'icon_coin', w: 108, side: 1, y: 0.04, d: 12 },
  { name: 'icon_heart', w: 108, side: -1, y: 0.82, d: 15 },
];

/** 11–15 s: the bear companion, then the shop where points buy outfits. */
export const BearFeature = () => (
  <Feature
    {...COPY.bear}
    bg={C.lemon}
    glow="rgba(255,255,255,0.6)"
    pixels={[C.violet, C.lime, C.white]}
    fg={C.ink}
    sub={C.muted}
    pill={{ bg: C.ink, fg: C.lemon }}
    orbit={[12, -6]}
    screens={[
      { src: 'home', at: 0 },
      { src: 'shop-bg', at: 50, mode: 'fade' },
      { src: 'shop-outfit', at: 84, mode: 'fade' },
    ]}
    taps={[
      { at: 47, x: 239, y: 801 },
      { at: 81, x: 284, y: 440 },
    ]}
    decor={(w, h) => <FloatingItems w={w} h={h} />}
  />
);

const FloatingItems = ({ w, h }: { w: number; h: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = w / 580;
  return (
    <>
      {OUTFITS.map((o, i) => {
        const p = sp(frame, fps, 30 + o.d, POP);
        const bob = Math.sin((frame + i * 17) / 14) * 12 * k;
        return (
          <div
            key={o.name}
            style={{
              position: 'absolute',
              // only about a fifth of each item overlaps the phone so the UI stays readable
              left: o.side < 0 ? -o.w * k * 0.8 : w - o.w * k * 0.2,
              top: o.y * h + bob,
              transform: `translateZ(${i % 2 ? 120 : 60}px) scale(${p}) rotate(${(1 - p) * 30 + Math.sin((frame + i * 9) / 20) * 4}deg)`,
              zIndex: 2,
              filter: 'drop-shadow(0 18px 18px rgba(25,21,46,0.25))',
            }}
          >
            <Sprite name={o.name} width={o.w * k} />
          </div>
        );
      })}
    </>
  );
};

/** 15–19 s: a live 1v1 duel — question, first correct answer wins the round, the result. */
export const DuelFeature = () => (
  <Feature
    {...COPY.duel}
    bg={C.lime}
    glow="rgba(255,255,255,0.55)"
    pixels={[C.violet, C.ink, C.white]}
    fg={C.ink}
    sub="#3D4A1A"
    pill={{ bg: C.violet, fg: C.white }}
    orbit={[-12, 8]}
    screens={[
      { src: 'duel-q0', at: 0 },
      { src: 'duel-a0', at: 46, mode: 'fade' },
      { src: 'duel-result', at: 86, mode: 'push' },
    ]}
    taps={[{ at: 43, x: 195, y: 661 }]}
    decor={(w) => <VsBadge w={w} />}
  />
);

const VsBadge = ({ w }: { w: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sp(frame, fps, 18, POP);
  const k = w / 580;
  return (
    <div
      style={{
        position: 'absolute',
        right: -70 * k,
        top: 40 * k,
        zIndex: 2,
        transform: `translateZ(140px) scale(${p}) rotate(${-10 + (1 - p) * -40}deg)`,
        fontFamily: PIXEL,
        fontWeight: 700,
        fontSize: 120 * k,
        lineHeight: 1,
        color: C.lemon,
        background: C.violet,
        border: `${6 * k}px solid ${C.ink}`,
        boxShadow: `0 ${10 * k}px 0 ${C.ink}`,
        borderRadius: 32 * k,
        padding: `${8 * k}px ${26 * k}px ${16 * k}px`,
      }}
    >
      VS
    </div>
  );
};
