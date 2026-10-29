/** Recolour exposed bear fur on a PixelLab costume without tinting its clothing. */
import type { Img } from './png.ts';
import { CL, FUR, hsl, L, lerp, MUZZLE, type Fur } from './fur.ts';

const WHITE = 225;

/** The saturated orange hat band ends just above the exposed forehead. */
interface Cell { w: number; h: number }

function hatBandBottom(img: Img, x0: number, y0: number, cell: Cell): number {
  let bottom = -1;
  for (let y = 0; y < Math.floor(cell.h * 0.3); y++)
    for (let x = 0; x < cell.w; x++) {
      const i = ((y0 + y) * img.w + x0 + x) * 4;
      if (!img.d[i + 3]) continue;
      const [h, s, l] = hsl([img.d[i], img.d[i + 1], img.d[i + 2]]);
      if (h >= 15 && h <= 50 && s > 0.8 && l < 0.65) bottom = y;
    }
  return bottom;
}

function nextToEye(img: Img, x: number, y: number, x0: number, y0: number, cell: Cell): boolean {
  for (let yy = Math.max(y0, y - 3); yy <= Math.min(y0 + cell.h - 1, y + 3); yy++)
    for (let xx = Math.max(x0, x - 3); xx <= Math.min(x0 + cell.w - 1, x + 3); xx++) {
      const i = (yy * img.w + xx) * 4;
      if (img.d[i + 3] && Math.min(img.d[i], img.d[i + 1], img.d[i + 2]) > WHITE) return true;
    }
  return false;
}

/**
 * PixelLab's witch pilot sprites use warm brown fur and cream muzzle/inner ears.
 * The thresholds also cover small shade shifts in generated motion frames. Purple,
 * crimson, saturated orange and gold remain exact. Dark outlines and eye irises
 * remain exact so every fur colour keeps the character's expression and silhouette.
 */
/**
 * `hat`: the witch's hat band sits above the forehead; costumes without a hat recolour the whole head.
 * `cream`: recolour the muzzle cream too; the mummy's bandages are that same cream, so it keeps it.
 */
export function recolorCostumeFur(src: Img, fur: Exclude<Fur, 'brown'>, cell: Cell = src, hat = true, cream = true): Img {
  if (src.w % cell.w || src.h % cell.h) throw new Error('Costume sheet must contain whole frames');
  const out: Img = { w: src.w, h: src.h, d: src.d.slice() };
  const cols = src.w / cell.w;
  const hats = Array.from({ length: cols * (src.h / cell.h) }, (_, n) =>
    hat ? hatBandBottom(src, (n % cols) * cell.w, Math.floor(n / cols) * cell.h, cell) : -2);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      const x0 = Math.floor(x / cell.w) * cell.w;
      const y0 = Math.floor(y / cell.h) * cell.h;
      const hatBottom = hats[Math.floor(x / cell.w) + cols * Math.floor(y / cell.h)];
      if (!src.d[i + 3] || y - y0 <= hatBottom + 1) continue;
      const [h, s, l] = hsl([src.d[i], src.d[i + 1], src.d[i + 2]]);
      const isCream = h >= 20 && h <= 36 && s >= 0.7 && l >= 0.69 && l <= 0.96;
      // the fur's dark brown outline too (leather and metal outlines are grey, not brown)
      const brown = h >= 6 && h <= 29 && ((s >= 0.25 && s <= 1 && l >= 0.13 && l < 0.69) || (s >= 0.45 && l >= 0.05 && l < 0.13));
      if ((!isCream && !brown) || (isCream && !cream) || (brown && l < 0.4 && nextToEye(src, x, y, x0, y0, cell))) continue;
      const target = isCream ? lerp(CL, MUZZLE[fur]!, l) : lerp(L, FUR[fur], l);
      out.d.set(target, i);
    }
  return out;
}
