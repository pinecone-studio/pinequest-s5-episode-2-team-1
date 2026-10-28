import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { setAdminGrade } from '../src/services/profiles';

type Value = string | number | null;

function setup(admin: number) {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys = ON');
  const dir = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(file, dir), 'utf8'));
  function prepare(query: string) {
    const statement = sql.prepare(query);
    let args: Value[] = [];
    const execute = () => ({ meta: { changes: Number((statement.run(...args) as { changes: number | bigint }).changes) } });
    return {
      bind(...values: Value[]) { args = values; return this; },
      first: async () => statement.get(...args) ?? null,
      all: async () => ({ results: statement.all(...args) }),
      run: async () => execute(),
      execute,
    };
  }
  const db = {
    prepare,
    batch: async (statements: ReturnType<typeof prepare>[]) => {
      sql.exec('BEGIN');
      try {
        const results = statements.map((statement) => statement.execute());
        sql.exec('COMMIT');
        return results;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;
  sql.prepare("INSERT INTO users (username, password_hash, grade, tier, is_admin, created_at) VALUES ('shinee', 'x', 7, 1, ?, 0)").run(admin);
  sql.exec("INSERT INTO tasks (id, user_id, subject, day, status, created_at) VALUES (1, 1, 'math', '2026-10-27', 'completed', 0)");
  sql.exec("INSERT INTO tasks (id, user_id, subject, day, status, created_at) VALUES (2, 1, 'math', '2026-10-27', 'in_progress', 0)");
  sql.exec("INSERT INTO recoveries (task_id, user_id, subject, questions, created_at) VALUES (1, 1, 'math', '[]', 0)");
  return { sql, db };
}

describe('Admin анги солих', () => {
  it('анги, түвшнийг сольж түр даалгаврыг цэвэрлэнэ', async () => {
    const { sql, db } = setup(1);
    const me = await setAdminGrade(db, 1, 12);
    expect({ grade: me.grade, tier: me.tier }).toEqual({ grade: 12, tier: 3 });
    expect(sql.prepare('SELECT id FROM tasks ORDER BY id').all()).toEqual([{ id: 1 }]);
    expect(sql.prepare('SELECT task_id FROM recoveries').all()).toEqual([]);
  });

  it('энгийн хэрэглэгчийн ангийг солихгүй', async () => {
    const { sql, db } = setup(0);
    await expect(setAdminGrade(db, 1, 8)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(sql.prepare('SELECT grade, tier FROM users WHERE id = 1').get()).toEqual({ grade: 7, tier: 1 });
  });
});
