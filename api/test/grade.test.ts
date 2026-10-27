import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { pickArgs, pickSql } from '../src/services/pool';

// Жинхэнэ migration-уудтай SQLite (D1) дээр даалгаврын асуулт сонгох SQL: номын асуулт зөвхөн өөрийн ангийнх.
const dir = new URL('../migrations/', import.meta.url);
const migrations = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

function setup() {
  const db = new DatabaseSync(':memory:');
  const apply = (files: string[]) => files.forEach((f) => db.exec(readFileSync(new URL(f, dir), 'utf8')));
  const before = migrations.filter((f) => f < '0012');
  apply(before);
  const user = db.prepare("INSERT INTO users (username, password_hash, grade, tier, created_at) VALUES (?, 'x', ?, 1, 0)");
  user.run('six', 6);
  user.run('seven', 7);
  const q = db.prepare(
    "INSERT INTO questions (tier, subject, prompt, options, correct_index, explanation, prompt_key, source, book_ref, created_at) VALUES (1, 'math', ?, '[]', 0, '', ?, 't', ?, 0)",
  );
  const refs = ['math-6:5-6', 'math-6:7-8', 'math-7:5-6', 'math-7:7', 'math-7:30-31', null, null];
  refs.forEach((ref, i) => q.run(`q${i}`, `q${i}`, ref));
  // Шинэ migration (grade нөхөх) одоо байгаа асуулттай санд
  apply(migrations.filter((f) => !before.includes(f)));
  return db;
}

// pickQuestions-тэй ижил хоёр алхам: хичээлийнх эхэлж, дутууг ангийн сангаас.
function pick(db: DatabaseSync, userId: number, lesson: Parameters<typeof pickArgs>[3], limit = 5) {
  const run = (range: typeof lesson, n: number, exclude: number[]) =>
    db.prepare(pickSql(range !== null, exclude.length > 0)).all(...(pickArgs(userId, 1, 'math', range, n, exclude) as (string | number)[])) as { id: number }[];
  const own = lesson ? run(lesson, limit, []) : [];
  const ids = own.length >= limit ? own : [...own, ...run(null, limit - own.length, own.map((r) => r.id))];
  return ids.map(({ id }) => (db.prepare('SELECT book_ref FROM questions WHERE id = ?').get(id) as { book_ref: string | null }).book_ref);
}

describe('асуулт зөвхөн өөрийн ангийн номоос', () => {
  const db = setup();

  it('migration одоо байгаа асуултын ангийг book_ref-ээс нөхнө', () => {
    expect(db.prepare('SELECT book_ref, grade FROM questions ORDER BY id').all()).toEqual([
      { book_ref: 'math-6:5-6', grade: 6 },
      { book_ref: 'math-6:7-8', grade: 6 },
      { book_ref: 'math-7:5-6', grade: 7 },
      { book_ref: 'math-7:7', grade: 7 },
      { book_ref: 'math-7:30-31', grade: 7 },
      { book_ref: null, grade: null },
      { book_ref: null, grade: null },
    ]);
  });

  it('migration 0025 book_ref-ийн эхний хуудсыг book_page-д нөхнө', () => {
    expect(db.prepare('SELECT book_ref, book_page FROM questions WHERE book_ref IS NOT NULL ORDER BY id').all()).toEqual([
      { book_ref: 'math-6:5-6', book_page: 5 },
      { book_ref: 'math-6:7-8', book_page: 7 },
      { book_ref: 'math-7:5-6', book_page: 5 },
      { book_ref: 'math-7:7', book_page: 7 },
      { book_ref: 'math-7:30-31', book_page: 30 },
    ]);
  });

  it('хичээлийн асуулт индексээр (бүх санг уншихгүй)', () => {
    const plan = db.prepare(`EXPLAIN QUERY PLAN ${pickSql(true)}`).all(...(pickArgs(2, 1, 'math', { slug: 'math-7', from: 5, to: 6 }, 5) as (string | number)[]));
    expect(JSON.stringify(plan)).toContain('idx_questions_page');
    // ангийн бүх асуулт (boss): бусад ангийнхыг уншихгүй
    const own = db.prepare(`EXPLAIN QUERY PLAN ${pickSql(false)}`).all(...(pickArgs(2, 1, 'math', null, 5) as (string | number)[]));
    expect(JSON.stringify(own)).not.toContain('idx_questions_pool');
  });

  it('Суурь шатны сонголт template-ээр үүссэн асуултыг оруулахгүй', () => {
    db.prepare("UPDATE questions SET source = 'template:test' WHERE book_ref = 'math-7:5-6'").run();
    const all = db.prepare(pickSql(true)).all(...(pickArgs(2, 1, 'math', { slug: 'math-7', from: 5, to: 6 }, 5) as (string | number)[]));
    const curated = db.prepare(pickSql(true, false, true)).all(...(pickArgs(2, 1, 'math', { slug: 'math-7', from: 5, to: 6 }, 5) as (string | number)[]));
    expect(all).toHaveLength(1);
    expect(curated).toHaveLength(0);
    db.prepare("UPDATE questions SET source = 't' WHERE book_ref = 'math-7:5-6'").run();
  });

  it('6-р анги Математик 7-ийн асуулт хэзээ ч авахгүй; номгүй асуулт нийтлэг', () => {
    const six = pick(db, 1, null, 100);
    expect(six.sort()).toEqual(['math-6:5-6', 'math-6:7-8', null, null].sort());
    expect(pick(db, 2, null, 100).every((r) => r === null || r.startsWith('math-7:'))).toBe(true);
  });

  it('хичээлийн хуудсынх түрүүлнэ, дутууг өөрийн ангийн асуултаар нөхнө', () => {
    const seven = pick(db, 2, { slug: 'math-7', from: 5, to: 6 });
    expect(seven.slice(0, 1)).toEqual(['math-7:5-6']);
    expect(seven).toHaveLength(5);
    expect(seven.some((r) => r?.startsWith('math-6:'))).toBe(false);
  });

  it('хичээлийнхийг бүгдийг харсан ч өөр сэдвийн хараагүй асуултаас түрүүлнэ', () => {
    db.prepare("INSERT INTO seen_questions (user_id, question_id, seen_at) SELECT 2, id, 1 FROM questions WHERE book_ref = 'math-7:5-6'").run();
    const seven = pick(db, 2, { slug: 'math-7', from: 5, to: 7 });
    expect(seven.slice(0, 2).sort()).toEqual(['math-7:5-6', 'math-7:7']);
    expect(seven[0]).toBe('math-7:7'); // хичээлийн дотор хараагүй нь эхэнд
    expect(seven).toHaveLength(5);
  });

  it('зангилааны шатны хүндтэй бодлого түрүүлнэ (харсан ч); хүндгүй нь дунд', () => {
    const q = db.prepare(
      "INSERT INTO questions (tier, subject, prompt, options, correct_index, explanation, prompt_key, source, book_ref, book_page, grade, difficulty, created_at) VALUES (1, 'math', ?, '[]', 0, '', ?, 't', 'math-7:40-41', 40, 7, ?, 0)",
    );
    [1, 1, 2, 3, 3, null].forEach((d, i) => q.run(`d${i}`, `d${i}`, d));
    const level = (l: number | null) =>
      db
        .prepare(pickSql(true))
        .all(...(pickArgs(2, 1, 'math', { slug: 'math-7', from: 40, to: 41 }, 6, [], l) as (string | number | null)[]))
        .map((r) => (db.prepare('SELECT difficulty FROM questions WHERE id = ?').get((r as { id: number }).id) as { difficulty: number | null }).difficulty);
    expect(level(1).slice(0, 2)).toEqual([1, 1]);
    expect(level(3).slice(0, 2)).toEqual([3, 3]);
    // Дунд шат: 2 ба хүндгүй (дунд гэж тооцно) эхэнд
    expect(level(2).slice(0, 2).sort()).toEqual([2, null].sort());
    // Ахисан шатны хүнд бодлогыг бүгдийг харсан ч хараагүй хялбараас түрүүлнэ
    db.prepare("INSERT INTO seen_questions (user_id, question_id, seen_at) SELECT 2, id, 1 FROM questions WHERE book_ref = 'math-7:40-41' AND difficulty = 3").run();
    expect(level(3).slice(0, 2)).toEqual([3, 3]);
    // Шатгүй (null) бол хүндээр ялгахгүй: бүх 6 гарна
    expect(level(null)).toHaveLength(6);
  });

  it('migration 0029 хүндийг 1–3-аар хязгаарлана', () => {
    expect(() =>
      db
        .prepare("INSERT INTO questions (tier, subject, prompt, options, correct_index, explanation, prompt_key, source, difficulty, created_at) VALUES (1, 'math', 'x', '[]', 0, '', 'bad', 't', 4, 0)")
        .run(),
    ).toThrow();
  });

  it('анги нь тодорхойгүй номын асуулт хэнд ч гарахгүй', () => {
    db.prepare("UPDATE questions SET grade = NULL WHERE book_ref = 'math-6:7-8'").run();
    expect(pick(db, 1, null, 100)).not.toContain('math-6:7-8');
    expect(pick(db, 2, null, 100)).not.toContain('math-6:7-8');
  });
});
