import { interpolate, spring, type SpringConfig } from 'remotion';

/** Snappy with a small overshoot: headlines, chips, UI pops. */
export const POP: Partial<SpringConfig> = { damping: 14, stiffness: 160, mass: 0.9 };
/** Smooth, no overshoot: camera moves, large surfaces. */
export const GLIDE: Partial<SpringConfig> = { damping: 200, stiffness: 90, mass: 1 };
/** Soft settle with a hint of bounce: the phone entering. */
export const FLOAT: Partial<SpringConfig> = { damping: 22, stiffness: 70, mass: 1.1 };

export const sp = (frame: number, fps: number, delay = 0, config: Partial<SpringConfig> = POP, durationInFrames?: number) =>
  spring({ frame: frame - delay, fps, config, durationInFrames });

/** Clamped linear map, the common case. */
export const lerp = (v: number, input: [number, number], output: [number, number]) =>
  interpolate(v, input, output, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
