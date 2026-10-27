// Ажиллуулах: node scripts/sprite-kit.check.ts (snow-sprites.ts-ийн гаралтыг бэлдсэний дараа).
import assert from 'node:assert/strict';
import { blank, type Img, readPng, samePixels } from './png.ts';
import { at, bbox, crop, cutout, put, shrink, SPRITES, toSheet } from './sprite-kit.ts';

const rgba = (img: Img, x: number, y: number) => [...img.d.slice(at(img, x, y), at(img, x, y) + 4)];

function binaryAlpha(img: Img) {
  let [opaque, transparent] = [0, 0];
  for (let i = 3; i < img.d.length; i += 4) {
    assert(img.d[i] === 0 || img.d[i] === 255, 'Хагас тунгалаг pixel үлдэх ёсгүй');
    if (img.d[i]) opaque++;
    else transparent++;
  }
  assert(opaque > 0, 'Дүрс хоосон байж болохгүй');
  assert(transparent > 0, 'Дэвсгэр жинхэнэ alpha-тай байна');
}

// Бараан хүрээнд хаагдсан цагаан гэрлийг дэвсгэртэй хамт арилгахгүй.
const white = blank(7, 7);
for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) put(white, x, y, [255, 255, 255]);
for (let y = 2; y <= 4; y++)
  for (let x = 2; x <= 4; x++) if (x !== 3 || y !== 3) put(white, x, y, [20, 30, 50]);
put(white, 1, 0, [229, 230, 240]);
const cut = cutout(white);
assert.equal(rgba(cut, 0, 0)[3], 0);
assert.equal(rgba(cut, 1, 0)[3], 0);
assert.deepEqual(rgba(cut, 3, 3), [255, 255, 255, 255]);
assert.deepEqual(rgba(cut, 2, 3), [20, 30, 50, 255]);
assert.equal(rgba(white, 0, 0)[3], 255, 'Эх зураг өөрчлөгдөхгүй');

// Тунгалаг гадна захаар дамжин доторх цагаан дэвсгэрийг мөн олно.
const transparentBorder = crop(white, 0, 0, 7, 7);
for (let y = 0; y < 7; y++)
  for (let x = 0; x < 7; x++) if (x === 0 || y === 0 || x === 6 || y === 6) put(transparentBorder, x, y, [0, 0, 0], 0);
const cutBorder = cutout(transparentBorder);
assert.equal(rgba(cutBorder, 1, 1)[3], 0);
assert.deepEqual(rgba(cutBorder, 3, 3), [255, 255, 255, 255]);

// Нэг нүдний 25%-ийг эзлэх бараан тойм дундаж өнгөнд бүдгэрэхгүй.
const outlined = blank(4, 4);
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) put(outlined, x, y, [180, 220, 245]);
put(outlined, 0, 0, [8, 16, 24]);
const reduced = shrink(outlined, 2);
assert.deepEqual([reduced.w, reduced.h], [2, 2]);
assert.deepEqual(rgba(reduced, 0, 0), [8, 16, 24, 255]);
assert.deepEqual(rgba(reduced, 1, 0), [180, 220, 245, 255]);
const speck = blank(4, 4);
put(speck, 0, 0, [100, 180, 220]);
assert.equal(rgba(shrink(speck, 2, [0, 0, 4, 4]), 0, 0)[3], 0);

// Бага цагираг ба том болор нэг хүрээтэй бол газрын мөр, нүдний хэмжээ өөрчлөгдөхгүй.
const small = blank(12, 12);
const large = blank(12, 12);
for (let y = 2; y < 10; y++)
  for (let x = 2; x < 10; x++) {
    put(large, x, y, [100, 180, 220]);
    if (y >= 8) put(small, x, y, [100, 180, 220]);
  }
const bounds = bbox([small, large]);
const aligned = [small, large].map((img) => shrink(img, 4, bounds));
for (const img of aligned) assert.deepEqual([img.w, img.h], [4, 4]);
assert.equal(bbox([aligned[0]])[1], 3);
assert.equal(bbox([aligned[1]])[1], 0);
assert.equal(bbox([aligned[0]])[3], bbox([aligned[1]])[3]);

// Бодит гаралт: 6 frame, 3 багана; нүд бүр 103×96, хонх 27×30.
const burst = readPng(new URL('fx_santa_ice_burst.png', SPRITES));
assert.deepEqual([burst.w, burst.h], [309, 192]);
const frames = Array.from({ length: 6 }, (_, i) => ({
  name: `burst${i}`,
  duration: 90,
  img: crop(burst, (i % 3) * 103, Math.floor(i / 3) * 96, 103, 96),
}));
for (const { img } of frames) binaryAlpha(img);
assert(samePixels(toSheet(frames, 3), burst), 'Grid sheet-ийн нүдний дараалал хадгалагдана');
const bell = readPng(new URL('item_bell.png', SPRITES));
assert.deepEqual([bell.w, bell.h], [27, 30]);
binaryAlpha(bell);
console.log('Sprite cutout, shrink, shared bounds, burst, bell: OK');
