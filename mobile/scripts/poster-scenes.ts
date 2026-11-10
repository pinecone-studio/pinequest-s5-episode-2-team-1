// Эвентийн poster-ийн pixel үзэгдлүүд (poster-sprites.ts ашиглана): poster-paint.ts-ийн хэрэгслээр кодоор зурна (AI биш).
// Тэнгэрийн Bayer градиент, гэрлийн эх үүсвэр, алс/ойрын сүүдэр дүрс, урд талын шал.
import { blank, type Img } from './png.ts';
import { hex, put } from './sprite-kit.ts';
import { blocks, bolt, cloud, disc, each, floor, FLOOR, H, orb, pagoda, ridge, rnd, sky, sparkle, stars, tower, W, wave, windows } from './poster-paint.ts';

export { FLOOR, get, H, mix, W } from './poster-paint.ts';

const P = (...c: string[]) => c.map(hex);

export const SCENES: Record<string, () => Img> = {
  /** Нууц ажиллагаа: сартай шөнийн хотын дээвэр, алсад пагод */
  agents() {
    const img = blank(W, H);
    sky(img, P('#0E0830', '#1A0F4A', '#2A1C7A', '#4A37B8', '#6B4EE6'));
    stars(img, 140, 170, P('#D9D2F2', '#FFFFFF', '#8E78F2'), 11);
    orb(img, 318, 92, 30, hex('#FFF4C9'), hex('#E6D294'), hex('#8E78F2'), 22);
    [[306, 84, 4], [326, 104, 3], [314, 106, 2]].forEach(([x, y, r]) => disc(img, x, y, r, hex('#E9D9A2')));
    const far = blocks(5, 26, 92);
    ridge(img, (x) => far[x], hex('#2A1C72'));
    windows(img, far, hex('#FFD36E'), 0.16);
    pagoda(img, 92, FLOOR - 40, 4, 34, hex('#1F145C'), hex('#140C3A'), hex('#FFB547'));
    pagoda(img, 238, FLOOR - 52, 3, 28, hex('#1F145C'), hex('#140C3A'), hex('#FFB547'));
    const near = blocks(41, 6, 34);
    ridge(img, (x) => near[x], hex('#160D45'), hex('#3B2A9E'));
    floor(img, hex('#1A1150'), hex('#5A44D0'), hex('#120A33'), 'tile');
    return img;
  },
  /** Баатрууд: нар жаргах хадан уулс, аянга, үүл */
  heroes() {
    const img = blank(W, H);
    sky(img, P('#FFE7C9', '#FFD2A6', '#F7A97E', '#EE8A5A', '#D9673C'));
    orb(img, 318, 96, 28, hex('#FFF8DE'), hex('#FFE7A8'), hex('#FFE0B0'), 70, 14);
    cloud(img, 120, 70, 46, hex('#FFF4E4'), hex('#F6C7A2'));
    cloud(img, 250, 46, 30, hex('#FFF4E4'), hex('#F6C7A2'));
    bolt(img, [[104, 82], [94, 120], [110, 124], [96, 172]], hex('#FFFDF0'), hex('#FFE08A'));
    ridge(img, (x) => 170 + wave(x, 1.3, 0.021) * 34, hex('#C9805A'), hex('#E8A27A'));
    ridge(img, (x) => 214 + wave(x, 4.1, 0.033) * 26, hex('#8A4A2E'), hex('#B4673F'));
    floor(img, hex('#6B2A12'), hex('#B4673F'), hex('#4E1D0B'), 'rock');
    return img;
  },
  /** Шидтэний академи: шилтгээний цамхагууд, хөвөх лаа, шидэт гялбаа */
  wizards() {
    const img = blank(W, H);
    sky(img, P('#F6FFD8', '#E6FB9C', '#D4F55E', '#A9D86A', '#6FAE72'));
    orb(img, 318, 96, 22, hex('#FFFFFF'), hex('#F3F66C'), hex('#FFFFFF'), 26);
    const [wall, roof, light] = [hex('#3F6B3A'), hex('#2F4A12'), hex('#FFE38A')];
    tower(img, 200, FLOOR - 70, 280, hex('#4E7E46'), roof, light, false);
    tower(img, 200, 120, 40, wall, roof, light, true);
    tower(img, 116, 150, 30, wall, roof, light, true);
    tower(img, 284, 146, 30, wall, roof, light, true);
    tower(img, 52, 186, 22, wall, roof, light, false);
    tower(img, 352, 182, 22, wall, roof, light, false);
    for (let i = 0; i < 26; i++) sparkle(img, Math.floor(rnd(i + 3) * W), 10 + Math.floor(rnd(i + 60) * 150), i % 4 ? 1 : 2, hex(i % 3 ? '#FFFFFF' : '#7A5CF5'));
    for (let i = 0; i < 9; i++) {
      const [x, y] = [24 + Math.floor(rnd(i + 200) * 352), 40 + Math.floor(rnd(i + 300) * 70)];
      each(x, y, x + 2, y + 6, (cx, cy) => put(img, cx, cy, hex('#FFF1D0')));
      [put(img, x, y - 1, hex('#FFD36E')), put(img, x + 1, y - 2, hex('#FF9F45'))];
    }
    floor(img, hex('#2F4A12'), hex('#7FB24F'), hex('#1F330B'), 'stone');
    return img;
  },
};
