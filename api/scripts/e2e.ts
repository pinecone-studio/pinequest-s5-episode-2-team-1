// Ажиллаж буй dev сервер дээр демо сценарийн гол урсгалыг автоматаар шалгана.
//   npm run e2e                 # даалгавар, оноо, streak, хамгаалалт, өдрийн хязгаар, тулаан
//   npm run e2e -- --only tasks # зөвхөн нэг хэсэг (tasks | recovery | shop | duel | books)
import type { AnswerResponse, MeResponse, RecoveryAnswerResponse, RecoveryDto, ShopResponse, TaskDto } from '../../shared/types';
import { runBooksScenario } from './e2e-books';
import { runDuelScenario } from './e2e-duel';
import { check, correctIndex, doTask, expectError, failureCount, me, register } from './e2e-lib';
import { ADMIN_TOKEN, arg, call } from './lib';

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
  check(first.answers.every((x) => x.correct && (x.explanation ?? '').length > 0), 'Зөв хариулт бүрт тайлбар ирнэ');
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
  // Өөр хүнд гарсан, энэ хэрэглэгчийн хараагүй асуулт.
  const other = await call<TaskDto>('POST', '/tasks', { token: (await register('e2e_flag2', 8)).token, body: { subject: 'physics' } });
  await expectError(call('POST', `/questions/${other.questions[0].id}/flag`, { token: fresh.token, body: {} }), 'NOT_FOUND', 'Хараагүй асуултыг flag хийхгүй');

  return { a, b };
}

async function recoveryScenario() {
  console.log('\n— Нөхөх салаа зам');
  const u = await register('e2e_rec', 7);
  const t = await call<TaskDto>('POST', '/tasks', { token: u.token, body: { subject: 'physics' } });
  const answers: AnswerResponse[] = [];
  for (const [i, q] of t.questions.entries()) {
    const ci = await correctIndex(q.id);
    answers.push(await call<AnswerResponse>('POST', `/tasks/${t.id}/answer`, { token: u.token, body: { questionId: q.id, choice: i < 2 ? (ci + 1) % 4 : ci } }));
  }
  // 1 дэх алдаанд салаа зам хараахан баталгаагүй тул зөв хариуг хэлнэ; 2 дахиас салаа зам заавал нээгдэх тул хэлэхгүй
  check(!answers[0].correct && answers[0].correctIndex !== undefined && !!answers[0].explanation, 'Ганц алдаанд зөв хариу, тайлбар ирнэ');
  check(!answers[1].correct && answers[1].correctIndex === undefined && answers[1].explanation === undefined, '2 дахь алдаанаас зөв хариу, тайлбар ирэхгүй');
  check(answers.slice(0, 4).every((a) => !a.recovery) && answers[4].recovery === true, '5 асуулт дууссаны дараа л салаа зам нээгдэнэ');
  check(answers[4].result?.xpGained === 30, 'Анхны шагнал хэвээр (3 зөв → 30 XP)', answers[4].result?.xpGained);
  await expectError(call('POST', '/tasks', { token: u.token, body: { subject: 'physics' } }), 'RECOVERY_REQUIRED', 'Салаа зам дуустал тэр хичээлийн шинэ даалгавар эхлэхгүй');
  const other = await call<TaskDto>('POST', '/tasks', { token: u.token, body: { subject: 'math' } });
  check(other.questions.length === 5, 'Өөр хичээлийн даалгавар эхэлнэ');

  let r = await call<RecoveryDto>('GET', '/recovery/physics', { token: u.token });
  const raw = JSON.stringify(r);
  check(!!r.question && !/correct_?index/i.test(raw) && !raw.includes('explanation'), 'Салаа замын асуултад зөв хариу, тайлбар явахгүй');
  const before = await me(u.token);
  const original = new Set(t.questions.map((q) => q.id));
  const ids: number[] = [];
  let wrongOk = true;
  let rightOk = true;
  let swapped = false;
  while (r.question) {
    const id = r.question.id;
    const ci = await correctIndex(id);
    const bad = await call<RecoveryAnswerResponse>('POST', '/recovery/physics/answer', { token: u.token, body: { questionId: id, choice: (ci + 1) % 4 } });
    wrongOk &&= !bad.correct && bad.explanation === undefined && bad.correctIndex === undefined && bad.recovery.answered === ids.length;
    if (!swapped) {
      // эхний асуултад 2 дахь удаа буруу: зөв хариу, тайлбар ирж, асуулт ижил сэдвийн өөр асуултаар солигдоно (байвал)
      swapped = true;
      const bad2 = await call<RecoveryAnswerResponse>('POST', '/recovery/physics/answer', { token: u.token, body: { questionId: id, choice: (ci + 1) % 4 } });
      const replaced = bad2.recovery.question?.id !== id;
      check(
        !bad2.correct && bad2.correctIndex === ci && !!bad2.explanation && bad2.recovery.answered === 0 && bad2.recovery.total === r.total,
        `2 дахь буруугаас зөв хариу, тайлбар ирнэ (${replaced ? 'асуулт солигдсон' : 'тэр сэдэвт өөр асуулт алга, хэвээр'})`,
      );
      r = bad2.recovery;
      continue;
    }
    const body = { questionId: id, choice: ci };
    const ok = await call<RecoveryAnswerResponse>('POST', '/recovery/physics/answer', { token: u.token, body });
    rightOk &&= ok.correct && !!ok.explanation && ok.recovery.answered === ids.length + 1;
    if (ids.length === 0) await expectError(call('POST', '/recovery/physics/answer', { token: u.token, body }), 'ALREADY_ANSWERED', 'Давхар дарсан хариулт тоологдохгүй');
    ids.push(id);
    r = ok.recovery;
  }
  check(wrongOk, 'Буруу бол тайлбаргүй, ахиц нэмэгдэхгүй');
  check(rightOk, 'Зөв бол тайлбар ирж, ахиц нэмэгдэнэ');
  check(r.cleared && new Set(ids).size === ids.length, `Бүх асуултыг зөв хариулахад салаа зам хаагдана (${ids.filter((id) => !original.has(id)).length} шинэ, ${ids.filter((id) => original.has(id)).length} давтсан)`);
  const after = await me(u.token);
  check(after.xp === before.xp && after.points === before.points, 'Салаа зам XP, оноо өөрчлөхгүй');
  await expectError(call('GET', '/recovery/physics', { token: u.token }), 'NOT_FOUND', 'Дууссаны дараа хүлээгдэж буй салаа зам алга');
  const next = await call<TaskDto>('POST', '/tasks', { token: u.token, body: { subject: 'physics' } });
  check(next.id !== t.id, 'Салаа зам дууссаны дараа тэр хичээлийн даалгавар дахин эхэлнэ');
}

async function shopScenario() {
  console.log('\n— Дэлгүүр ба avatar');
  const u = await register('shop_u', 7);
  const shop = await call<ShopResponse>('GET', '/shop', { token: u.token });
  check(shop.items.length >= 15 && shop.items.length <= 20, `Дэлгүүрт ${shop.items.length} эд зүйл`);
  check(shop.items.some((i) => i.locked) && shop.items.some((i) => i.minLevel > 1), 'Зарим эд зүйл тодорхой шатнаас нээгдэнэ');
  const tee = shop.items.find((i) => i.id === 'top_tshirt_red')!;
  const bought = await call<ShopResponse>('POST', `/shop/${tee.id}/buy`, { token: u.token });
  check(bought.me.points === 50 - tee.price, `Улаан футболк авахад ${tee.price} оноо хасагдана`, bought.me.points);
  check(bought.me.equipped.top === tee.id && bought.me.avatar.top?.color === tee.style.color, 'Авмагц өмсөгдөж avatar өөрчлөгдөнө');
  await expectError(call('POST', `/shop/${tee.id}/buy`, { token: u.token }), 'ALREADY_OWNED', 'Нэг эд зүйлийг дахин авахгүй');
  await expectError(call('POST', '/shop/acc_crown/buy', { token: u.token }), 'ITEM_LOCKED', 'Шат хүрэхгүй бол түгжээтэй');
  await call('POST', '/shop/hair_long_brown/buy', { token: u.token });
  await expectError(call('POST', '/shop/acc_cap_red/buy', { token: u.token }), 'INSUFFICIENT_POINTS', 'Оноо хүрэлцэхгүй бол авахгүй');
  const back = await call<MeResponse>('POST', '/avatar/equip', { token: u.token, body: { slot: 'top', itemId: 'top_tshirt_blue' } });
  check(back.me.equipped.top === 'top_tshirt_blue' && back.me.equipped.hair === 'hair_long_brown', 'Үнэгүй цамцаа буцааж өмсөнө, үс хэвээр');
  await expectError(
    call('POST', '/avatar/equip', { token: u.token, body: { slot: 'accessory', itemId: 'acc_glasses' } }),
    'NOT_OWNED',
    'Аваагүй эд зүйлийг өмсөхгүй',
  );
}

async function audit() {
  const r = await call<{ mismatches: unknown[] }>('GET', '/admin/audit', { admin: true });
  check(r.mismatches.length === 0, 'Бүх хэрэглэгчийн оноо = point_ledger-ийн нийлбэр', r.mismatches);
}

async function main() {
  if (!ADMIN_TOKEN) throw new Error('ADMIN_TOKEN олдсонгүй (api/.dev.vars)');
  const only = arg('only');
  if (!only || only === 'tasks') await tasksScenario();
  if (!only || only === 'recovery') await recoveryScenario();
  if (!only || only === 'shop') await shopScenario();
  if (!only || only === 'duel') await runDuelScenario();
  if (!only || only === 'books') await runBooksScenario();
  console.log('\n— Ledger');
  await audit();
  const failures = failureCount();
  console.log(failures === 0 ? '\nБҮГД АМЖИЛТТАЙ ✅' : `\n${failures} шалгалт амжилтгүй ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
