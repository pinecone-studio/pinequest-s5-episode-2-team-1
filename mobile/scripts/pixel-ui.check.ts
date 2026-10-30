// node scripts/pixel-ui.check.ts — боргоцойн дэлгэцийн pixel үсэг ба шатлсан булангийн геометрийг шалгана.
import assert from 'node:assert/strict';
import { GLYPHS, GLYPH_GAP, GLYPH_W, pixelsOf } from '../src/components/pinecones/pixelFont.ts';
import { cornerInsets, stepShape } from '../src/components/pinecones/pixelShape.ts';

for (const [c, glyph] of Object.entries(GLYPHS)) {
  assert.equal(glyph.rows.length, 7, `${c}: 7 мөр`);
  const w = glyph.raw ? glyph.rows[0].length : 5;
  for (const row of [...glyph.rows, glyph.top ?? '.'.repeat(w), glyph.bottom ?? '.'.repeat(w)]) assert.match(row, new RegExp(`^[.#]{${w}}$`), `${c}: ${row}`);
}
// Б ба В ялгаатай байх ёстой (Pixelify-ийн асуудал)
assert.notDeepEqual(GLYPHS.Б.rows, GLYPHS.В.rows);
assert.equal(new Set(Object.values(GLYPHS).map((x) => [x.top, ...x.rows, x.bottom].join())).size, Object.keys(GLYPHS).length, 'давхардсан үсэг');
for (const c of 'АБВГДЕЁЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЩЪЫЬЭЮЯ') assert.ok(GLYPHS[c], `${c} байхгүй`);

const { width, cells } = pixelsOf('БОРГОЦОЙ');
assert.equal(width, 8 * (GLYPH_W + GLYPH_GAP) - GLYPH_GAP + 1);
assert.equal(new Set(cells.map(String)).size, cells.length, 'давхардсан pixel');
assert.ok(cells.some(([, y]) => y === 0), 'Й-ийн дээд тэмдэг');
assert.ok(cells.some(([, y]) => y === 8), 'Ц-ийн сүүл');
// Ш-ийн босоо зураасны завсар bold-ын дараа ч нээлттэй үлдэнэ
const sh = new Set(pixelsOf('Ш').cells.map(String));
assert.ok(!sh.has('1,1') && !sh.has('3,1'), 'Ш бөөн болсон');
// raw М-ийн дараах үсэг М-ийн өргөн (7) + 1 зайгаар эхэлнэ
assert.equal(pixelsOf('МА').width, 7 + 1 + 6);

// булан: дээрээс доош шилжилт буурна, сүүлийн мөр 0
for (const r of [1, 2, 3, 6]) {
  const ins = cornerInsets(r);
  assert.equal(ins.length, r);
  assert.ok(ins.every((v, i) => i === 0 || v <= ins[i - 1]), `r=${r} шат буурахгүй байна`);
  assert.ok(ins[0] > 0, `r=${r} булан дугуйрахгүй`);
}
assert.deepEqual(cornerInsets(3), [3, 1, 1]);
// дүрс босоо чиглэлд бүрэн хучна, тэгш хэмтэй
const rects = stepShape(20, 10, 3);
assert.equal(rects.reduce((n, [, , , h]) => n + h, 0), 10);
assert.deepEqual(rects[0][0], 20 - rects[0][0] - rects[0][2]);
assert.deepEqual(stepShape(0, 5, 2), []);
console.log('pixel ui ok');
