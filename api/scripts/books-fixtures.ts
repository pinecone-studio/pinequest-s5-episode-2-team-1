// Тест ба e2e-д: жинхэнэ ном шаардахгүйгээр жижиг PNG ба олон хуудастай PDF үүсгэнэ.
import { crc32, deflateSync } from 'node:zlib';
import { PDFDocument, StandardFonts } from 'pdf-lib';

function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 1×1 өнгөт PNG (өнгө өөр бол байт нь өөр). */
export function solidPng(r: number, g: number, b: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0); // өргөн
  header.writeUInt32BE(1, 4); // өндөр
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.from([0, r, g, b]))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** `pages` хуудастай PDF; хуудас бүр дээр "<label> N" гэж бичнэ. */
export async function samplePdf(pages: number, label = 'Page'): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) doc.addPage([200, 280]).drawText(`${label} ${i}`, { x: 40, y: 140, size: 18, font });
  return doc.save();
}
