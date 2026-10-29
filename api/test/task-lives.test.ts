import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { answerTask } from '../src/services/tasks';

type Value = string | number | null;
const now = Date.UTC(2026, 9, 29);

function setup() {
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

  sql.exec("INSERT INTO users (username, password_hash, grade, tier, lives, created_at) VALUES ('learner', 'x', 6, 1, 3, 0)");
  sql.exec("INSERT INTO tasks (id, user_id, subject, day, created_at) VALUES (1, 1, 'math', '2026-10-29', 0)");
  const question = sql.prepare(
    "INSERT INTO questions (id, tier, subject, prompt, options, correct_index, explanation, prompt_key, source, created_at) VALUES (?, 1, 'math', ?, '[\"a\",\"b\",\"c\",\"d\"]', 0, '', ?, 'test', 0)",
  );
  const taskQuestion = sql.prepare('INSERT INTO task_questions (task_id, position, question_id) VALUES (1, ?, ?)');
  for (let i = 0; i < 5; i++) {
    question.run(i + 1, `q${i + 1}`, `q${i + 1}`);
    taskQuestion.run(i, i + 1);
  }

  const answer = (choice: number) => answerTask(db, {} as Parameters<typeof answerTask>[1], 1, 1, 1, choice, now);
  const lives = () => sql.prepare('SELECT lives, lives_at FROM users WHERE id = 1').get();
  return { answer, lives };
}

describe('буруу хариултын амь', () => {
  it('буруу хариултад яг нэг амь хасаж, давхар хүсэлтээр дахин хасахгүй', async () => {
    const s = setup();
    expect((await s.answer(1)).correct).toBe(false);
    expect(s.lives()).toEqual({ lives: 2, lives_at: now });

    await expect(s.answer(1)).rejects.toMatchObject({ code: 'ALREADY_ANSWERED' });
    expect(s.lives()).toEqual({ lives: 2, lives_at: now });
  });

  it('зөв хариултад амь хасахгүй', async () => {
    const s = setup();
    expect((await s.answer(0)).correct).toBe(true);
    expect(s.lives()).toEqual({ lives: 3, lives_at: null });
  });
});
