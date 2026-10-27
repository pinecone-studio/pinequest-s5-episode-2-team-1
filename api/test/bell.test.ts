import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { GAME } from '../src/config/game';
import { useBell } from '../src/services/bag';
import { completeTask } from '../src/services/tasks';

type Value = string | number | null;
const now = Date.UTC(2026, 9, 27);

// Жинхэнэ migration ба SQL-ийг Node SQLite дээр D1-ийн атомик batch-тай ажиллуулна.
function setup(bells = 1) {
  const sql = new DatabaseSync(':memory:');
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
  sql.exec("INSERT INTO users (username, password_hash, grade, tier, lives, lives_at, created_at) VALUES ('bell', 'x', 6, 1, 1, 1, 0)");
  sql.prepare("UPDATE users SET lives_at = ? WHERE id = 1").run(now);
  sql.prepare("INSERT INTO inventory (user_id, item, qty) VALUES (1, 'bell', ?)").run(bells);
  sql.exec("INSERT INTO subject_progress (user_id, subject, nodes, bosses_beaten) VALUES (1, 'math', 27, 10)");
  sql.exec("INSERT INTO questions (tier, subject, prompt, options, correct_index, explanation, prompt_key, source, created_at) VALUES (1, 'math', 'q', '[]', 0, '', 'q', 'test', 0)");
  const task = (id = 1, correct = 3, gate = 10) => {
    sql.prepare("INSERT INTO tasks (id, user_id, subject, day, boss, path_lessons, created_at) VALUES (?, 1, 'math', '2026-10-27', ?, 24, 0)").run(id, gate);
    for (let position = 0; position < 5; position++) {
      sql.prepare('INSERT INTO task_questions (task_id, position, question_id, correct) VALUES (?, ?, 1, ?)').run(id, position, Number(position < correct));
    }
  };
  const inventory = () => sql.prepare("SELECT qty FROM inventory WHERE user_id = 1 AND item = 'bell'").get() as { qty: number };
  const lives = () => sql.prepare('SELECT lives, lives_at FROM users WHERE id = 1').get();
  const complete = (id = 1) => completeTask(db, {} as Parameters<typeof completeTask>[1], 1, id, now);
  return { sql, db, task, inventory, lives, complete };
}

describe('Мөсөн хонх ашиглах', () => {
  it('нэг хонхоор бүх амийг дүүргэж нөхөгдөлтийн тоолуурыг арилгана', async () => {
    const s = setup(2);
    const { me } = await useBell(s.db, 1, now);
    expect(s.inventory()).toEqual({ qty: 1 });
    expect(s.lives()).toEqual({ lives: GAME.LIVES.MAX, lives_at: null });
    expect(me.lives).toBe(GAME.LIVES.MAX);
    expect(me.bag.bell).toBe(1);
    expect(me.nextLifeAt).toBeNull();
  });

  it('аяндаа дүүрсэн аминд хонх зарцуулахгүй', async () => {
    const s = setup();
    s.sql.prepare('UPDATE users SET lives = 4, lives_at = ? WHERE id = 1').run(now - GAME.LIVES.REGEN_MS);
    await expect(useBell(s.db, 1, now)).rejects.toMatchObject({ code: 'LIVES_FULL' });
    expect(s.inventory()).toEqual({ qty: 1 });
  });

  it('хонх байхгүй бол амь нэмэхгүй', async () => {
    const s = setup(0);
    await expect(useBell(s.db, 1, now)).rejects.toMatchObject({ code: 'NO_ITEM' });
    expect(s.lives()).toEqual({ lives: 1, lives_at: now });
    expect(s.inventory()).toEqual({ qty: 0 });
  });
});

describe('Хар Цасан өвгөний шагнал', () => {
  it('анх ялахад нэг хонх нэмж, давхар дуусгах хүсэлтээр дахин олгохгүй', async () => {
    const s = setup(2);
    s.task();
    const results = await Promise.allSettled([s.complete(), s.complete()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { code: 'TASK_CLOSED' } });
    expect(s.inventory()).toEqual({ qty: 3 });
    await expect(s.complete()).rejects.toMatchObject({ code: 'TASK_CLOSED' });
    expect(s.inventory()).toEqual({ qty: 3 });
  });

  it('ялагдсан тулаанд хонх олгохгүй', async () => {
    const s = setup(0);
    s.task(1, 2);
    expect((await s.complete()).gateBeaten).toBe(false);
    expect(s.inventory()).toEqual({ qty: 0 });
  });

  it('өөр өдрийн хоёр тулаан зэрэг дууссан ч хаалганы шагналыг нэг удаа олгоно', async () => {
    const s = setup(0);
    s.task(1);
    s.task(2);
    s.sql.exec("UPDATE tasks SET day = '2026-10-26' WHERE id = 1");
    const results = await Promise.all([s.complete(1), s.complete(2)]);
    expect(results.map((r) => r.gateBeaten).sort()).toEqual([false, true]);
    expect(s.inventory()).toEqual({ qty: 1 });
    expect(s.sql.prepare('SELECT bosses_beaten FROM subject_progress').get()).toEqual({ bosses_beaten: 11 });
  });

  it('давсан хаалганы өөр даалгаварт дахин хонх олгохгүй', async () => {
    const s = setup(0);
    s.task();
    await s.complete();
    s.task(2);
    expect((await s.complete(2)).gateBeaten).toBe(false);
    expect(s.inventory()).toEqual({ qty: 1 });
  });

  it('өөр хаалганд ялсан ч хонх олгохгүй', async () => {
    const s = setup(0);
    s.sql.exec('UPDATE subject_progress SET bosses_beaten = 9');
    s.task(1, 3, 9);
    expect((await s.complete()).gateBeaten).toBe(true);
    expect(s.inventory()).toEqual({ qty: 0 });
  });
});
