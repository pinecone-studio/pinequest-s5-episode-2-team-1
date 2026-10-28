import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  color: string;
  /** Soft glow colour (top-right and bottom-left). */
  glow?: string;
  /** Colours for the drifting pixel squares; empty = none. */
  pixels?: string[];
  seed?: string;
}

/** Flat brand colour + two soft glows + slow-drifting pixel squares (the app's pixel motif) + fine grain. */
export const Backdrop = ({ color, glow = 'rgba(255,255,255,0.25)', pixels = [], seed = 'bg' }: Props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  return (
    <AbsoluteFill style={{ background: color, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 45% at 85% 12%, ${glow}, transparent 70%), radial-gradient(55% 40% at 10% 92%, ${glow}, transparent 70%)`,
        }}
      />
      {pixels.length
        ? Array.from({ length: 22 }, (_, i) => {
            const r = (k: string) => random(`${seed}-${i}-${k}`);
            const size = (10 + Math.floor(r('s') * 4) * 8) * unit;
            const speed = 0.4 + r('v') * 0.9;
            const x = r('x') * width;
            const y = ((r('y') * (height + 200) - frame * speed * unit * 1.4) % (height + 200) + height + 200) % (height + 200) - 100;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: size,
                  height: size,
                  background: pixels[i % pixels.length],
                  opacity: 0.18 + r('o') * 0.3,
                  transform: `rotate(${Math.floor(r('r') * 2) * 45}deg)`,
                }}
              />
            );
          })
        : null}
      <Grain />
    </AbsoluteFill>
  );
};

const Grain = () => (
  <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
    <svg width="100%" height="100%">
      <filter id="kuma-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#kuma-grain)" />
    </svg>
  </AbsoluteFill>
);

/** Pixel-art sprite from public/sprites, always crisp. */
export const Sprite = ({ name, width, style }: { name: string; width: number; style?: CSSProperties }) => (
  <Img src={staticFile(`sprites/${name}.png`)} style={{ width, height: 'auto', imageRendering: 'pixelated', display: 'block', ...style }} />
);
