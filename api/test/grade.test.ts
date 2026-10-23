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

const pick = (db: DatabaseSync, userId: number, lesson: Parameters<typeof pickArgs>[3]) =>
  (db.prepare(pickSql(lesson !== null)).all(...(pickArgs(userId, 1, 'math', lesson, 100) as (string | number)[])) as { id: number }[]).map(
    ({ id }) => (db.prepare('SELECT book_ref FROM questions WHERE id = ?').get(id) as { book_ref: string | null }).book_ref,
  );

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

  it('6-р анги Математик 7-ийн асуулт хэзээ ч авахгүй; номгүй асуулт нийтлэг', () => {
    const six = pick(db, 1, null);
    expect(six.sort()).toEqual(['math-6:5-6', 'math-6:7-8', null, null].sort());
    expect(pick(db, 2, null).every((r) => r === null || r.startsWith('math-7:'))).toBe(true);
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

  it('анги нь тодорхойгүй номын асуулт хэнд ч гарахгүй', () => {
    db.prepare("UPDATE questions SET grade = NULL WHERE book_ref = 'math-6:7-8'").run();
    expect(pick(db, 1, null)).not.toContain('math-6:7-8');
    expect(pick(db, 2, null)).not.toContain('math-6:7-8');
  });
});
