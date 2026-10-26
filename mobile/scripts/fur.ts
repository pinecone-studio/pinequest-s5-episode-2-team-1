/**
 * Баавгайн үсний өнгө (бор/хар/цагаан): ramp-ууд ба өнгө солих. Профайлын хөрөг (avatar-sprites.ts) ба баавгайтай бүх
 * sprite-ийн хар, цагаан хувилбар (build-sprites.ts) үүнийг ашиглана. Pixel бүрийн гэрэлтэлтээр (HSL L) ramp руу буулгах
 * тул сүүдэр, гэрэл, хялгас хэвээр үлдэнэ.
 */
import type { Img } from './png.ts';
import { at, type RGB, ramp } from './sprite-kit.ts';

export const FURS = ['brown', 'black', 'white'] as const;
export type Fur = (typeof FURS)[number];

// үсний ramp: эх борын гэрэлтэлтийн цэгүүд (L) дээр өнгө тус бүрийн тохирох өнгө, хооронд нь шугаман
export const L = [0.13, 0.27, 0.36, 0.49, 0.56, 0.69];
export const FUR: Record<Fur, RGB[]> = {
  brown: ramp('#2a140a', '#5b3026', '#8b492d', '#b66b45', '#ce7d50', '#e9a978'),
  black: ramp('#141117', '#211d26', '#2e2934', '#3f3946', '#4f4857', '#6a6273'),
  white: ramp('#5e566a', '#9a92a6', '#bcb5c7', '#d9d4e0', '#e7e3ec', '#f5f2f7'),
};
// хошуу, чихний дотор (цөцгий): хар баавгай шаргал хошуутай, цагаан нь бараг цагаан
export const CL = [0.7, 0.85];
export const MUZZLE: Record<Fur, RGB[] | null> = {
  brown: null,
  black: ramp('#a8805f', '#d6b38e'),
  white: ramp('#eadfd2', '#fffaf2'),
};

export const lerp = (xs: number[], cs: readonly RGB[], v: number): RGB => {
  if (v <= xs[0]) return cs[0];
  for (let i = 1; i < xs.length; i++)
    if (v <= xs[i]) {
      const t = (v - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return cs[i].map((c, k) => Math.round(cs[i - 1][k] + (c - cs[i - 1][k]) * t)) as unknown as RGB;
    }
  return cs[cs.length - 1];
};

export function hsl([r, g, b]: RGB): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}


/** Нүдний гэрэл (цагаан) ойрхон байна уу: ханасан бор нь нүдний солонго уу, чихний дотор уу гэдгийг ялгана */
function nearWhite(img: Img, x0: number, y0: number, r: number): boolean {
  for (let y = Math.max(0, y0 - r); y <= Math.min(img.h - 1, y0 + r); y++)
    for (let x = Math.max(0, x0 - r); x <= Math.min(img.w - 1, x0 + r); x++) {
      const i = at(img, x, y);
      if (img.d[i + 3] && Math.min(img.d[i], img.d[i + 1], img.d[i + 2]) > 225) return true;
    }
  return false;
}

/**
 * Баавгайтай ямар ч sprite-ийн үсийг өнгө солих (байрлалаас үл хамаарна: animation-ы frame бүрт). Хошуу, гэдэс (цөцгий)
 * нь тухайн өнгөний хошууны ramp руу; нүд, хацрын ягаан, ам/хэл, ороолт, зөгийн бал зэрэг ханасан өнгийг хөндөхгүй.
 */
export function recolorFur(src: Img, fur: Exclude<Fur, 'brown'>): Img {
  const img: Img = { w: src.w, h: src.h, d: src.d.slice() };
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = at(img, x, y);
      if (!img.d[i + 3]) continue;
      const c = [img.d[i], img.d[i + 1], img.d[i + 2]] as const;
      const [h, s, l] = hsl(c);
      let out: RGB | null = null;
      if (l < 0.13) out = FUR[fur][0];
      else if (h > 42 || s < 0.2) out = null; // цагаан гэрэл, нил ягаан, ногоон ороолт
      else if (h < 15 && s > 0.85 && l > 0.6) out = null; // хацрын ягаан
      else if (s > 0.85 && l <= 0.7) out = null; // зөгийн бал, тод улбар шар
      else if (h < 5 && s > 0.45 && l > 0.3) out = null; // ам, хэл
      else if (s > 0.58 && l < 0.5 && nearWhite(src, x, y, 4)) out = null; // нүдний солонго
      else out = l > 0.7 ? lerp(CL, MUZZLE[fur] as RGB[], l) : lerp(L, FUR[fur], l);
      if (out) img.d.set(out, i);
    }
  return img;
}
