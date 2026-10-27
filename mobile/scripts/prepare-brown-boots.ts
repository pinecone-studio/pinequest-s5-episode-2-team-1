/** PixelLab-ийн жишээ зургаас хоёр түрийтэй гутлыг тунгалаг давхарга болгоно. */
import { blank, readPng, writePng } from './png.ts';

const src = readPng(new URL('../../docs/design/pixel-bear/pixellab/brown-boots-reference.png', import.meta.url));
const out = blank(82, 140);
for (let y = 116; y < 140; y++) for (let x = 10; x < 76; x++) {
  if (y < 124) {
    const spread = Math.floor((y - 116) / 2);
    const left = x >= 18 - spread && x <= 37 + spread;
    const right = x >= 49 - spread && x <= 68 + spread;
    if (!left && !right) continue;
  }
  const sourceY = 103 + Math.round((y - 116) * 34 / 23);
  const i = (sourceY * src.w + x) * 4;
  const [r, g, b] = src.d.subarray(i, i + 3);
  // Шатрын хээтэй цагаан дэвсгэрийг арилгаж, хүрэн арьс болон бараан хүрээг үлдээнэ.
  if (!(r > g * 1.12 && g > b * 1.13)) continue;
  const px = x - 2, py = y;
  if (px < 0 || py < 0 || px >= out.w || py >= out.h) continue;
  out.d.set(src.d.subarray(i, i + 4), (py * out.w + px) * 4);
}
writePng(new URL('../../docs/design/pixel-bear/sprites/item_brown_boots.png', import.meta.url), out);
