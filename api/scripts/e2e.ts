// Ажиллаж буй dev сервер дээр демо сценарийн гол урсгалыг автоматаар шалгана.
//   npm run e2e                 # даалгавар, оноо, streak, хамгаалалт, өдрийн хязгаар, тулаан
//   npm run e2e -- --only tasks # зөвхөн нэг хэсэг (tasks | duel)
import type { AnswerResponse, AuthResponse, Me, MeResponse, TaskDto, TaskResult } from '../../shared/types';
import { ADMIN_TOKEN, arg, call, HttpError } from './lib';
import { runDuelScenario } from './e2e-duel';

let failures = 0;
export function check(cond: boolean, label: string, extra?: unknown) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}`, extra === undefined ? '' : JSON.stringify(extra));
  }
}

export async function expectError(p: Promise<unknown>, code: string, label: string) {
  try {
    await p;
    check(false, label, 'алдаа гараагүй');
  } catch (e) {
    check(e instanceof HttpError && e.code === code, label, e instanceof HttpError ? e.code : String(e));
  }
}

const suffix = Date.now().toString(36).slice(-5);
export async function register(name: string, grade: number): Promise<AuthResponse> {
  return call<AuthResponse>('POST', '/auth/register', { body: { username: `${name}_${suffix}`, password: 'e2e-pass-123', grade } });
}

export async function me(token: string): Promise<Me> {
  return (await call<MeResponse>('GET', '/me', { token })).me;
}

async function correctIndex(questionId: number): Promise<number> {
  return (await call<{ correctIndex: number }>('GET', `/admin/questions/${questionId}`, { admin: true })).correctIndex;
}

/** Даалгавар эхлүүлж бүх асуултад хариулна (allCorrect: бүгд зөв / бүгд буруу). */
async function doTask(token: string, subject: string, allCorrect: boolean) {
  const task = await call<TaskDto>('POST', '/tasks', { token, body: { subject } });
  let last: AnswerResponse | null = null;
  const answers: AnswerResponse[] = [];
  for (const q of task.questions.filter((x) => !x.answered)) {
    const ci = await correctIndex(q.id);
    last = await call<AnswerResponse>('POST', `/tasks/${task.id}/answer`, {
      token,
      body: { questionId: q.id, choice: allCorrect ? ci : (ci + 1) % 4 },
    });
    answers.push(last);
  }
  return { task, answers, result: last?.result as TaskResult };
}

async function setStreak(userId: number, body: { streak: number; lastDay: string | null; shieldHeld?: number; shieldBoughtDay?: string | null }) {
  await call('POST', `/admin/debug/users/${userId}/streak`, { admin: true, body });
}

function shiftDay(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

async function tasksScenario() {
  console.log('\n— Бүртгэл ба даалгавар');
  const a = await register('e2e_a', 7);
  const b = await register('e2e_b', 6);
  check(a.me.tier === 1 && b.me.tier === 1, '7-р анги ба 6-р анги хоёулаа Түвшин 1');
  check(a.me.points === 50 && a.me.streak === 0, 'Шинэ хэрэглэгч 50 оноотой, streak 0');

  const t = await call<TaskDto>('POST', '/tasks', { token: a.token, body: { subject: 'math' } });
  const raw = JSON.stringify(t);
  check(t.questions.length === 5 && t.questions.every((q) => q.options.length === 4), '5 асуулт, тус бүр 4 сонголт');
  check(!/correct_?index/i.test(raw) && !raw.includes('explanation'), 'Хариулахаас өмнө зөв хариулт/тайлбар илгээгдэхгүй');
  const again = await call<TaskDto>('POST', '/tasks', { token: a.token, body: { subject: 'math' } });
  check(again.id === t.id, 'Дуусаагүй даалгаврыг дахин нээхэд үргэлжилнэ');

  const first = await doTask(a.token, 'math', true);
  check(first.answers.every((x) => x.correct && x.explanation.length > 0), 'Асуулт бүрт зөв/буруу ба тайлбар ирнэ');
  check(first.result?.streak === 1 && first.result.multiplier === 1, 'Эхний даалгаврын дараа streak 1, ×1.0', first.result);
  check(first.result?.pointsGained === 50 && first.result.me.points === 100, '5 зөв → +50 оноо (50 → 100)', first.result?.me.points);
  check(first.result?.xpGained === 50 && first.result.me.xp === 50, '+50 XP');
  await expectError(
    call('POST', `/tasks/${first.task.id}/answer`, { token: a.token, body: { questionId: first.task.questions[0].id, choice: 0 } }),
    'TASK_CLOSED',
    'Дууссан даалгаварт дахин хариулахгүй',
  );

  const second = await doTask(a.token, 'physics', true);
  check(second.result?.streak === 1, 'Нэг өдөрт хоёр дахь даалгавар streak-ийг нэмэхгүй');
  check(second.result?.me.level === 2, '100 XP → 2-р шат', second.result?.me.xp);

  const bTask = await doTask(b.token, 'mongolian', false);
  check(bTask.result?.pointsGained === 0 && bTask.result.me.points === 50 && bTask.result.streak === 1, 'Бүгд буруу: оноо нэмэгдэхгүй ч streak 1');

  console.log('\n— Streak хамгаалалт');
  const shieldMe = (await call<MeResponse>('POST', '/shield/buy', { token: b.token })).me;
  check(shieldMe.points === 0 && shieldMe.shield.held, 'Хамгаалалт 50 оноогоор авна');
  await expectError(call('POST', '/shield/buy', { token: b.token }), 'SHIELD_HELD', 'Хоёр дахь хамгаалалт авахгүй');

  const today = a.me.today;
  await setStreak(a.me.id, { streak: 4, lastDay: shiftDay(today, -2), shieldHeld: 1, shieldBoughtDay: shiftDay(today, -5) });
  const covered = await me(a.token);
  check(covered.streak === 4 && !covered.shield.held && covered.shield.usedDay === shiftDay(today, -1), 'Яг 1 өдөр алгасахад хамгаалалт автоматаар зарцуулагдана', covered);
  check(covered.shield.blockedBy === 'SHIELD_COOLDOWN', '7 хоног болоогүй тул дахин авах боломжгүй');
  const withShield = await doTask(a.token, 'mongolian', true);
  check(withShield.result?.streak === 5 && withShield.result.multiplier === 1.4, 'Хамгаалагдсан streak үргэлжилж 5 болно (×1.4)', withShield.result);
  check(withShield.result?.pointsGained === 70, '5 зөв × 14 = 70 оноо', withShield.result?.pointsGained);

  await setStreak(a.me.id, { streak: 6, lastDay: shiftDay(today, -3), shieldHeld: 1 });
  const broken = await me(a.token);
  check(broken.streak === 0 && broken.shield.held, '2 өдөр алгасвал streak 0, хамгаалалт үлдэнэ', broken);
  await setStreak(a.me.id, { streak: 5, lastDay: today });

  console.log('\n— Өдрийн хязгаар');
  const subjects = ['math', 'mongolian', 'physics'];
  let started = (await me(a.token)).todayTasks;
  while (started < 10) {
    await doTask(a.token, subjects[started % 3], false);
    started++;
  }
  const limitMe = await me(a.token);
  check(limitMe.todayTasks === 10, 'Өнөөдөр 10/10', limitMe.todayTasks);
  await expectError(call('POST', '/tasks', { token: a.token, body: { subject: 'math' } }), 'DAILY_LIMIT', '11 дэх даалгаврыг эхлүүлэх боломжгүй');

  console.log('\n— "Асуулт буруу байна"');
  const fresh = await register('e2e_flag', 8);
  const ft = await call<TaskDto>('POST', '/tasks', { token: fresh.token, body: { subject: 'math' } });
  const flagged = await call<{ ok: boolean; finished: boolean }>('POST', `/questions/${ft.questions[0].id}/flag`, {
    token: fresh.token,
    body: { taskId: ft.id },
  });
  const ftAfter = await call<TaskDto>('POST', '/tasks', { token: fresh.token, body: { subject: 'math' } });
  check(flagged.ok && ftAfter.answeredCount === 1, 'Flag дарсан асуулт алгасагдана');
  await call('POST', `/admin/questions/${ft.questions[0].id}/unflag`, { admin: true });

  return { a, b };
}

async function audit() {
  const r = await call<{ mismatches: unknown[] }>('GET', '/admin/audit', { admin: true });
  check(r.mismatches.length === 0, 'Бүх хэрэглэгчийн оноо = point_ledger-ийн нийлбэр', r.mismatches);
}

async function main() {
  if (!ADMIN_TOKEN) throw new Error('ADMIN_TOKEN олдсонгүй (api/.dev.vars)');
  const only = arg('only');
  if (!only || only === 'tasks') await tasksScenario();
  if (!only || only === 'duel') await runDuelScenario();
  console.log('\n— Ledger');
  await audit();
  console.log(failures === 0 ? '\nБҮГД АМЖИЛТТАЙ ✅' : `\n${failures} шалгалт амжилтгүй ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
