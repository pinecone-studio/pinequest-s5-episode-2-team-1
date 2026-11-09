import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { PAID_POINTS_MULT, PLUS_OUTFITS } from '../../shared/plan';
import { GAME } from '../src/config/game';
import { confirmPayment, type PaymentRow } from '../src/services/payments';
import { openPlusBox } from '../src/services/plusBox';
import { buyCosmetic } from '../src/services/shop';
import { getUserRow, livesUnlimited, pointsMult } from '../src/services/users';

type Value = string | number | null;
const now = Date.UTC(2026, 10, 9);
const DAY = 24 * 60 * 60_000;

function setup() {
  const sql = new DatabaseSync(':memory:');
  const dir = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(file, dir), 'utf8'));
  function prepare(query: string) {
    const statement = sql.prepare(query);
    let args: Value[] = [];
    const execute = () => ({ meta: { changes: Number((statement.run(...args) as { changes: number | bigint }).changes) } });
    return {
      bind(...values: Value[]) {
        args = values;
        return this;
      },
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
        const results = statements.map((s) => s.execute());
        sql.exec('COMMIT');
        return results;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;
  // 1 = Үнэгүй, 2 = Plus (идэвхтэй), 3 = Plus (хугацаа дууссан)
  sql.exec(`INSERT INTO users (username, password_hash, grade, tier, points, created_at, plan, plan_until) VALUES
    ('free', 'x', 7, 1, 5000, 0, 'free', NULL),
    ('plus', 'x', 7, 1, 5000, 0, 'plus', ${now + 10 * DAY}),
    ('expired', 'x', 7, 1, 5000, 0, 'plus', ${now - DAY})`);
  const row = (id: number) => sql.prepare('SELECT points, plus_boxes, plan, plan_until FROM users WHERE id = ?').get(id) as { points: number; plus_boxes: number; plan: string; plan_until: number | null };
  return { db, sql, row };
}

describe('Plus perks', () => {
  it('gives unlimited lives and more pinecones only to an active Plus', async () => {
    const { db } = setup();
    const [free, plus, expired] = await Promise.all([1, 2, 3].map((id) => getUserRow(db, id)));
    expect([free, plus, expired].map((u) => livesUnlimited(u, now))).toEqual([false, true, false]);
    expect([free, plus, expired].map((u) => pointsMult(u, now))).toEqual([1, PAID_POINTS_MULT, 1]);
  });

  it('sells Plus outfits only to Plus members', async () => {
    const { db, sql } = setup();
    await expect(buyCosmetic(db, 1, 'outfit_thunder_god', now)).rejects.toMatchObject({ code: 'PLUS_ONLY' });
    await expect(buyCosmetic(db, 3, 'outfit_thunder_god', now)).rejects.toMatchObject({ code: 'PLUS_ONLY' });
    const res = await buyCosmetic(db, 2, 'outfit_thunder_god', now);
    expect(res.items.find((i) => i.id === 'outfit_thunder_god')).toMatchObject({ owned: true, plusOnly: true });
    // энгийн хувцас Үнэгүйд хэвээр
    await buyCosmetic(db, 1, 'outfit_wrestler', now);
    expect(sql.prepare("SELECT COUNT(*) AS n FROM user_cosmetics WHERE user_id = 1 AND cosmetic_id = 'outfit_wrestler'").get()).toEqual({ n: 1 });
  });

  it('adds one gift box per Plus payment', async () => {
    const { db, sql, row } = setup();
    sql.exec(`INSERT INTO payments (id, user_id, plan, amount, days, provider, invoice_id, status, created_at) VALUES (1, 1, 'plus', 15000, 30, 'wire', 'pi_1', 'pending', ${now})`);
    const p = { id: 1, user_id: 1, plan: 'plus', amount: 15000, days: 30, provider: 'wire', invoice_id: 'pi_1', status: 'pending' } as PaymentRow;
    await confirmPayment(db, p, now);
    await confirmPayment(db, p, now);
    expect(row(1)).toMatchObject({ plan: 'plus', plus_boxes: 1 });
  });

  it('opens a box into a Plus outfit the kid does not own yet', async () => {
    const { db, sql, row } = setup();
    await expect(openPlusBox(db, 2, now)).rejects.toMatchObject({ code: 'NO_PLUS_BOX' });
    sql.exec('UPDATE users SET plus_boxes = 2 WHERE id = 2');
    const owned = PLUS_OUTFITS.slice(1).map((k) => `('2', 'outfit_${k}', 0)`).join(',');
    sql.exec(`INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_at) VALUES ${owned}`);
    const first = await openPlusBox(db, 2, now, () => 0.99);
    expect(first).toMatchObject({ outfit: PLUS_OUTFITS[0], coins: 0 });
    expect(row(2).plus_boxes).toBe(1);
    // бүгдийг эзэмшсэн: оронд нь боргоцой, ledger-тэй
    const second = await openPlusBox(db, 2, now);
    expect(second).toMatchObject({ outfit: null, coins: GAME.PLUS_BOX_COINS });
    expect(row(2)).toMatchObject({ plus_boxes: 0, points: 5000 + GAME.PLUS_BOX_COINS });
    expect(sql.prepare("SELECT delta FROM point_ledger WHERE user_id = 2 AND reason = 'plus_box'").get()).toEqual({ delta: GAME.PLUS_BOX_COINS });
    await expect(openPlusBox(db, 2, now)).rejects.toMatchObject({ code: 'NO_PLUS_BOX' });
  });

  it('gives one box to kids with an active Plus when the migration runs', () => {
    const sql = new DatabaseSync(':memory:');
    const dir = new URL('../migrations/', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files.filter((f) => f < '0044')) sql.exec(readFileSync(new URL(file, dir), 'utf8'));
    const later = Date.now() + 10 * DAY;
    sql.exec(`INSERT INTO users (username, password_hash, grade, tier, created_at, plan, plan_until) VALUES
      ('free', 'x', 7, 1, 0, 'free', NULL), ('plus', 'x', 7, 1, 0, 'plus', ${later}), ('old', 'x', 7, 1, 0, 'plus', 1000)`);
    sql.exec(readFileSync(new URL('0044_plus_box.sql', dir), 'utf8'));
    expect(sql.prepare('SELECT username, plus_boxes FROM users ORDER BY id').all()).toEqual([
      { username: 'free', plus_boxes: 0 },
      { username: 'plus', plus_boxes: 1 },
      { username: 'old', plus_boxes: 0 },
    ]);
  });
});
