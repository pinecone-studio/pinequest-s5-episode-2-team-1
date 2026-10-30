/** Модон лангууны нэг pixel (dp) — tile-ууд 3× томруулагддагтай ижил. */
export const P = 3;

/** Мөр бүрийн дотогш шилжилт (pixel): тойргийн нумыг шатлан дөхүүлнэ (r=2 → 2,1; r=3 → 3,1,1). */
export function cornerInsets(r: number): number[] {
  return Array.from({ length: r }, (_, y) => r - Math.floor(Math.sqrt(r * r - (r - y) ** 2)));
}

/** Шатлсан булантай дүрсийг [x, y, w, h] rect-үүд болгоно (pixel). Ижил шилжилттэй мөрүүдийг нэгтгэнэ. */
export function stepShape(w: number, h: number, r: number, ox = 0, oy = 0): [number, number, number, number][] {
  if (w <= 0 || h <= 0) return [];
  const ins = cornerInsets(Math.min(r, Math.floor(w / 2), Math.floor(h / 2)));
  const at = (y: number) => ins[y] ?? ins[h - 1 - y] ?? 0;
  const rects: [number, number, number, number][] = [];
  for (let y = 0; y < h; ) {
    const i = at(y);
    let n = 1;
    while (y + n < h && at(y + n) === i) n++;
    rects.push([ox + i, oy + y, w - 2 * i, n]);
    y += n;
  }
  return rects;
}
