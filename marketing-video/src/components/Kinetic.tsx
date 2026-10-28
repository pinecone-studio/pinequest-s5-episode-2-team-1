import type { CSSProperties, ReactNode } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { UI } from '../theme';
import { lerp, POP, sp } from './motion';

interface Props {
  text: string;
  /** Frame the first word starts. */
  delay?: number;
  /** Frames between words. */
  stagger?: number;
  /** Frame the line starts leaving (words lift out); omit to stay. */
  exitAt?: number;
  size: number;
  color?: string;
  weight?: number;
  style?: CSSProperties;
  /** Render a word differently (e.g. highlight); receives the word and its index. */
  renderWord?: (word: string, i: number) => ReactNode;
}

/** Word-by-word masked rise: each word slides up from behind its own clip line with a spring. */
export const KineticLine = ({ text, delay = 0, stagger = 4, exitAt, size, color = 'inherit', weight = 800, style, renderWord }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');
  return (
    <div
      style={{
        fontFamily: UI,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: '-0.035em',
        color,
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: size * 0.26,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = sp(frame, fps, delay + i * stagger, POP);
        const out = exitAt === undefined ? 0 : sp(frame, fps, exitAt + i * 2, { damping: 200, stiffness: 140 });
        const y = (1 - p) * 110 - out * 110;
        const rot = (1 - p) * 7;
        return (
          // padding keeps descenders and the overshoot inside the clip box
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', padding: `${size * 0.08}px 0.04em ${size * 0.12}px`, margin: `-${size * 0.08}px 0 -${size * 0.12}px` }}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${y}%) rotate(${rot}deg)`,
                transformOrigin: 'left bottom',
                opacity: lerp(p, [0, 0.25], [0, 1]),
              }}
            >
              {renderWord ? renderWord(w, i) : w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Fades + lifts a block in (captions, small labels). */
export const Rise = ({ delay = 0, children, style, distance = 40 }: { delay?: number; children: ReactNode; style?: CSSProperties; distance?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sp(frame, fps, delay, { damping: 200, stiffness: 110 });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, ...style }}>{children}</div>;
};
