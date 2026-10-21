import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it } from 'vitest';
import { samplePdf, solidPng } from './books-fixtures';
import { inferBookMeta, listSourceFiles, loadBookMeta, naturalCompare, type PageFile, readPages } from './books-lib';

const root = mkdtempSync(join(tmpdir(), 'books-lib-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function bookDir(name: string, files: Record<string, Uint8Array | string>): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (const [file, data] of Object.entries(files)) writeFileSync(join(dir, file), data);
  return dir;
}

async function collect(dir: string): Promise<PageFile[]> {
  const pages: PageFile[] = [];
  for await (const p of readPages(dir, listSourceFiles(dir).files)) pages.push(p);
  return pages;
}

describe('naturalCompare', () => {
  it('файлын нэр дэх тоог тоогоор нь эрэмбэлнэ', () => {
    expect(['10.jpg', '2.jpg', '1.jpg', 'scan-10.pdf', 'scan-2.pdf', 'Хуудас 3.png'].sort(naturalCompare)).toEqual([
      '1.jpg',
      '2.jpg',
      '10.jpg',
      'scan-2.pdf',
      'scan-10.pdf',
      'Хуудас 3.png',
    ]);
  });
});

describe('inferBookMeta', () => {
  const pdf = [{ name: 'a.pdf', mime: 'application/pdf' as const }];
  const img = [{ name: '1.jpg', mime: 'image/jpeg' as const }];

  it('хавтасны нэрээс хичээл, анги, гарчиг; PDF бол scan', () => {
    expect(inferBookMeta('mongolian-7', pdf)).toEqual({
      subject: 'mongolian',
      grade: 7,
      title: 'Монгол хэл 7',
      year: null,
      publisher: null,
      source: 'scan',
      pageOffset: 0,
    });
  });

  it('зураг л байвал web, нэрэнд он байвал year', () => {
    expect(inferBookMeta('math-10-2019', img)).toMatchObject({ subject: 'math', grade: 10, year: 2019, source: 'web' });
  });

  it('мэдэгдэхгүй хичээл, ангигүй, буруу анги → null', () => {
    expect(inferBookMeta('history-7', pdf)).toBeNull();
    expect(inferBookMeta('mongolian', pdf)).toBeNull();
    expect(inferBookMeta('physics-13', pdf)).toBeNull();
  });
});

describe('listSourceFiles', () => {
  it('book.json, далд файл алгасаж, дэд хавтас ба дэмжигдэхгүй төрлийг мэдээлнэ', () => {
    const dir = bookDir('physics-8', { 'book.json': '{}', '.DS_Store': 'x', '2.PNG': solidPng(1, 1, 1), '1.jpeg': 'jpg', 'scan.heic': 'x', 'notes.txt': 'x' });
    mkdirSync(join(dir, 'extra'));
    mkdirSync(join(dir, 'text')); // books:import-ийн текстийн кэш: алгасна, мэдээлэхгүй
    const { files, skipped } = listSourceFiles(dir);
    expect(files).toEqual([
      { name: '1.jpeg', mime: 'image/jpeg' },
      { name: '2.PNG', mime: 'image/png' },
    ]);
    expect(skipped).toEqual(['extra/', 'notes.txt', 'scan.heic']);
  });
});

describe('readPages', () => {
  it('зураг = 1 хуудас, PDF-ийн хуудас бүр = тусдаа PDF, файлын нэрийн дарааллаар', async () => {
    const dir = bookDir('math-7', {
      '10-back.png': solidPng(0, 0, 255),
      '01-cover.png': solidPng(255, 0, 0),
      '02-body.pdf': await samplePdf(3),
    });
    const pages = await collect(dir);
    expect(pages.map((p) => [p.seq, p.origin, p.mime])).toEqual([
      [1, '01-cover.png', 'image/png'],
      [2, '02-body.pdf#1', 'application/pdf'],
      [3, '02-body.pdf#2', 'application/pdf'],
      [4, '02-body.pdf#3', 'application/pdf'],
      [5, '10-back.png', 'image/png'],
    ]);
    for (const p of pages.filter((x) => x.mime === 'application/pdf')) {
      expect((await PDFDocument.load(p.data)).getPageCount()).toBe(1);
    }
    expect(new Set(pages.map((p) => p.sha256)).size).toBe(5);
  });

  it('дахин уншихад ижил байт (sha256) гарна — books:import өөрчлөгдөөгүй хуудсыг дахин илгээхгүй', async () => {
    const dir = bookDir('math-8', { 'scan.pdf': await samplePdf(2) });
    const first = (await collect(dir)).map((p) => p.sha256);
    const second = (await collect(dir)).map((p) => p.sha256);
    expect(second).toEqual(first);
  });

  it('PDF биш .pdf файлд ойлгомжтой алдаа', async () => {
    const dir = bookDir('math-9', { 'broken.pdf': 'not a pdf' });
    await expect(collect(dir)).rejects.toThrow(/broken\.pdf: PDF уншиж чадсангүй/);
  });
});

describe('loadBookMeta', () => {
  it('book.json байхгүй бол хавтасны нэрээс үүсгэж бичнэ (dry үед бичихгүй)', () => {
    const dir = bookDir('mongolian-6', { '1.png': solidPng(9, 9, 9) });
    const { files } = listSourceFiles(dir);
    expect(loadBookMeta(dir, files, false)).toMatchObject({ created: true, meta: { title: 'Монгол хэл 6', source: 'web' } });
    expect(existsSync(join(dir, 'book.json'))).toBe(false);
    loadBookMeta(dir, files);
    expect(JSON.parse(readFileSync(join(dir, 'book.json'), 'utf8'))).toMatchObject({ subject: 'mongolian', grade: 6 });
    expect(loadBookMeta(dir, files).created).toBe(false);
  });

  it('гараар бичсэн book.json (BOM-той ч) уншиж, анхдагч утгыг нөхнө', () => {
    const json = '﻿{"subject":"physics","grade":9,"title":"Физик 9","source":"scan"}';
    const dir = bookDir('fizik-9', { 'book.json': json, '1.png': solidPng(1, 2, 3) });
    expect(loadBookMeta(dir, listSourceFiles(dir).files).meta).toEqual({
      subject: 'physics',
      grade: 9,
      title: 'Физик 9',
      year: null,
      publisher: null,
      source: 'scan',
      pageOffset: 0,
    });
  });

  it('буруу book.json ба таамаглах боломжгүй нэрэнд ойлгомжтой алдаа', () => {
    const bad = bookDir('math-11', { 'book.json': '{"subject":"Math","grade":15,"title":"","source":"scan"}', '1.png': solidPng(1, 1, 1) });
    expect(() => loadBookMeta(bad, listSourceFiles(bad).files)).toThrow(/math-11\/book\.json: subject: .*grade/);
    const unknown = bookDir('history-7', { '1.png': solidPng(1, 1, 1) });
    expect(() => loadBookMeta(unknown, listSourceFiles(unknown).files)).toThrow(/таамаглаж чадсангүй/);
  });
});
