import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';
import { GLIDE, lerp, sp } from './motion';

/** Screenshots are 390×844 CSS px captured at 3× (scripts/capture.mjs). Tap coordinates use that 390×844 space. */
export const SCREEN_W = 390;
export const SCREEN_H = 844;

export interface Screen {
  /** File in public/screens without extension. */
  src: string;
  /** Local frame the screen becomes current. */
  at: number;
  /** 'push' slides in like a navigation push; 'fade' crossfades (tab switch, in-place state change). */
  mode?: 'push' | 'fade';
}

export interface Tap {
  at: number;
  x: number;
  y: number;
}

interface Props {
  width: number;
  screens: Screen[];
  taps?: Tap[];
}

const SWITCH = 12;

/** A phone with real app screenshots, screen-to-screen transitions and a touch indicator. */
export const Phone = ({ width, screens, taps = [] }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bezel = width * 0.032;
  const screenW = width - bezel * 2;
  const scale = screenW / SCREEN_W;
  const screenH = SCREEN_H * scale;
  const height = screenH + bezel * 2;
  const radius = width * 0.14;

  const cur = Math.max(0, screens.findLastIndex((s) => s.at <= frame));

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: C.ink,
        padding: bezel,
        position: 'relative',
        boxShadow: `0 ${width * 0.09}px ${width * 0.2}px rgba(25,21,46,0.38), 0 ${width * 0.02}px ${width * 0.04}px rgba(25,21,46,0.25), inset 0 0 0 ${width * 0.004}px rgba(255,255,255,0.18)`,
      }}
    >
      <div style={{ position: 'relative', width: screenW, height: screenH, borderRadius: radius - bezel, overflow: 'hidden', background: C.paper }}>
        {screens.map((s, i) => {
          if (i < cur - 1 || i > cur) return null;
          const incoming = i === cur && i > 0 ? sp(frame, fps, s.at, GLIDE, SWITCH + 6) : 1;
          // the screen being replaced reacts to the incoming one
          const next = screens[i + 1];
          const leaving = i === cur - 1 && next ? sp(frame, fps, next.at, GLIDE, SWITCH + 6) : 0;
          const push = (i === cur ? s.mode : next?.mode) === 'push';
          let transform = 'none';
          let opacity = 1;
          if (i === cur && i > 0) {
            if (push) transform = `translateX(${(1 - incoming) * 100}%)`;
            else opacity = incoming;
          }
          if (i === cur - 1 && push) transform = `translateX(${-leaving * 28}%)`;
          return (
            <Img
              key={s.src + i}
              src={staticFile(`screens/${s.src}.png`)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                transform,
                opacity,
                filter: i === cur - 1 && push ? `brightness(${1 - leaving * 0.25})` : undefined,
                boxShadow: i === cur && push ? '-20px 0 40px rgba(0,0,0,0.18)' : undefined,
              }}
            />
          );
        })}
        <TouchIndicator taps={taps} scale={scale} />
        {/* glass sheen */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.05) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

/** iOS screen-recording style touch: a soft disc that glides between taps, presses, and ripples. */
const TouchIndicator = ({ taps, scale }: { taps: Tap[]; scale: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!taps.length) return null;
  const first = taps[0];
  const last = taps[taps.length - 1];
  const appear = sp(frame, fps, first.at - 22, GLIDE, 14);
  const vanish = sp(frame, fps, last.at + 12, GLIDE, 12);
  const visible = appear * (1 - vanish);
  if (visible <= 0.001) return null;

  // position: glide from the previous tap (or an offset start) to the next one, arriving 3 frames before the press
  let x = first.x + 70;
  let y = first.y + 120;
  let prev = { x, y };
  for (const t of taps) {
    const p = sp(frame, fps, t.at - 16, GLIDE, 13);
    x = prev.x + (t.x - prev.x) * p;
    y = prev.y + (t.y - prev.y) * p;
    prev = { x: t.x, y: t.y };
    if (frame < t.at) break;
  }

  const size = 46 * scale;
  let press = 0;
  let ripple: { p: number } | null = null;
  for (const t of taps) {
    const d = frame - t.at;
    if (d >= -2 && d < 10) press = Math.max(press, d < 3 ? lerp(d, [-2, 2], [0, 1]) : lerp(d, [3, 9], [1, 0]));
    if (d >= 0 && d < 18) ripple = { p: d / 18 };
  }

  return (
    <div style={{ position: 'absolute', left: x * scale, top: y * scale, width: 0, height: 0, opacity: visible, pointerEvents: 'none' }}>
      {ripple ? (
        <div
          style={{
            position: 'absolute',
            left: -size * (0.5 + ripple.p * 0.9),
            top: -size * (0.5 + ripple.p * 0.9),
            width: size * (1 + ripple.p * 1.8),
            height: size * (1 + ripple.p * 1.8),
            borderRadius: '50%',
            border: `${3 * scale}px solid rgba(255,255,255,${0.85 * (1 - ripple.p)})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: -size / 2,
          top: -size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.55)',
          border: `${2 * scale}px solid rgba(255,255,255,0.95)`,
          boxShadow: `0 ${4 * scale}px ${14 * scale}px rgba(25,21,46,0.35)`,
          transform: `scale(${1 - press * 0.22})`,
        }}
      />
    </div>
  );
};
