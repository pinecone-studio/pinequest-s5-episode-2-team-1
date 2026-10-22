// Sprite хэрэгслүүдийн PNG унших/бичих (8-bit RGBA, interlace-гүй) ба APNG (хөдөлгөөнт урьдчилсан харагдац).
// Зөвхөн Node-ийн zlib: нэмэлт сан хэрэггүй, `node scripts/<нэр>.ts`-ээр шууд ажиллана.
import { readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

export interface Img {
  w: number;
  h: number;
  /** RGBA, мөрөөр */
  d: Uint8Array;
}

export const blank = (w: number, h: number): Img => ({ w, h, d: new Uint8Array(w * h * 4) });

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function readPng(path: string | URL): Img {
  const b = readFileSync(path);
  if (!b.subarray(0, 8).equals(SIG)) throw new Error(`${path}: PNG биш`);
  let img = blank(0, 0);
  const idat: Buffer[] = [];
  for (let p = 8; p < b.length; ) {
    const len = b.readUInt32BE(p);
    const type = b.toString('latin1', p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      // shortcut: зөвхөн 8-bit RGBA, interlace-гүй (бүх sprite ийм); өөр төрлийн PNG нэмэгдвэл энд дэмжинэ
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error(`${path}: зөвхөн 8-bit RGBA PNG уншина`);
      img = blank(data.readUInt32BE(0), data.readUInt32BE(4));
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = img.w * 4;
  const d = img.d;
  for (let y = 0; y < img.h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? d[o + x - 4] : 0;
      const up = y > 0 ? d[o + x - stride] : 0;
      const c = x >= 4 && y > 0 ? d[o + x - stride - 4] : 0;
      const v = raw[src + x];
      // Uint8Array 256-аар үлдэгдэл авна: шүүлтүүрийн нэмэх үйлдэл мод 256
      d[o + x] = f === 0 ? v : f === 1 ? v + a : f === 2 ? v + up : f === 3 ? v + ((a + up) >> 1) : v + paeth(a, up, c);
    }
  }
  return img;
}

/** Мөр бүрт 5 шүүлтүүрээс хамгийн жижиг (абсолют нийлбэрээр) гаралттайг сонгоно (libpng-ийн адил). */
function scanlines(img: Img): Buffer {
  const stride = img.w * 4;
  const d = img.d;
  const out = Buffer.alloc((stride + 1) * img.h);
  const filt = (f: number, o: number, x: number, y: number) => {
    const v = d[o + x];
    const a = x >= 4 ? d[o + x - 4] : 0;
    const b = y > 0 ? d[o + x - stride] : 0;
    const c = x >= 4 && y > 0 ? d[o + x - stride - 4] : 0;
    return (f === 0 ? v : f === 1 ? v - a : f === 2 ? v - b : f === 3 ? v - ((a + b) >> 1) : v - paeth(a, b, c)) & 255;
  };
  for (let y = 0; y < img.h; y++) {
    const o = y * stride;
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      let sum = 0;
      for (let x = 0; x < stride && sum < bestSum; x++) {
        const v = filt(f, o, x, y);
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        best = f;
        bestSum = sum;
      }
    }
    const r = y * (stride + 1);
    out[r] = best;
    for (let x = 0; x < stride; x++) out[r + 1 + x] = filt(best, o, x, y);
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([head, td, crc]);
}

function ihdr(w: number, h: number): Buffer {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0);
  b.writeUInt32BE(h, 4);
  b[8] = 8; // bit depth
  b[9] = 6; // RGBA
  return b;
}

const u32 = (...v: number[]) => {
  const b = Buffer.alloc(4 * v.length);
  v.forEach((n, i) => b.writeUInt32BE(n, i * 4));
  return b;
};

export function writePng(path: string | URL, img: Img): void {
  const z = deflateSync(scanlines(img), { level: 9 });
  writeFileSync(path, Buffer.concat([SIG, chunk('IHDR', ihdr(img.w, img.h)), chunk('IDAT', z), chunk('IEND', Buffer.alloc(0))]));
}

/** Хөдөлгөөнт PNG (APNG): `delays[i]` ms, төгсгөлгүй давтана. Browser, macOS Preview-д шууд тоглоно. */
export function writeApng(path: string | URL, frames: Img[], delays: number[]): void {
  const { w, h } = frames[0];
  const parts = [SIG, chunk('IHDR', ihdr(w, h)), chunk('acTL', u32(frames.length, 0))];
  let seq = 0;
  frames.forEach((f, i) => {
    const fc = Buffer.alloc(26);
    fc.writeUInt32BE(seq++, 0);
    fc.writeUInt32BE(w, 4);
    fc.writeUInt32BE(h, 8);
    fc.writeUInt16BE(delays[i], 20);
    fc.writeUInt16BE(1000, 22);
    parts.push(chunk('fcTL', fc));
    const z = deflateSync(scanlines(f), { level: 9 });
    parts.push(i === 0 ? chunk('IDAT', z) : chunk('fdAT', Buffer.concat([u32(seq++), z])));
  });
  parts.push(chunk('IEND', Buffer.alloc(0)));
  writeFileSync(path, Buffer.concat(parts));
}

export const samePixels = (a: Img, b: Img) => a.w === b.w && a.h === b.h && Buffer.compare(a.d, b.d) === 0;
