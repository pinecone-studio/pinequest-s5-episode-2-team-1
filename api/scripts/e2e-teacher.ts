// Багш: бүртгэл, анги нээх, сурагч нэгдэх, сул сэдэв, ангийн тэмцээн (Kahoot маягийн). `npm run e2e -- --only teacher`
import type { QuizActiveResponse, QuizView, TeacherClassDetailResponse, TeacherClassesResponse } from '../../shared/teacher';
import type { AuthResponse, MyClanResponse } from '../../shared/types';
import { runAssignmentChecks } from './e2e-assignments';
import { check, doTask, expectError, me, register, testNet } from './e2e-lib';
import { call } from './lib';

const suffix = Date.now().toString(36).slice(-5);

export async function runTeacherScenario() {
  console.log('\n— Багшийн бүртгэл, анги');
  const body = { username: `tch_${suffix}`, password: 'e2e-pass-123', teacher: true };
  const t = await call<AuthResponse>('POST', '/auth/register', { body, headers: { 'cf-connecting-ip': testNet() } });
  check(t.me.teacher && t.me.onboarded !== false, 'Багшийн бүртгэл (асуулгагүй)', t.me);
  const kid = await register('tk_a', 7);
  const kid2 = await register('tk_b', 7);
  check(!kid.me.teacher, 'Энгийн бүртгэл багш биш');
  await expectError(call('GET', '/teacher/classes', { token: kid.token }), 'FORBIDDEN', 'Сурагч багшийн хэсэгт орохгүй');

  const { classes } = await call<TeacherClassesResponse>('POST', '/teacher/classes', { token: t.token, body: { name: '7А' } });
  const cls = classes[0];
  check(classes.length === 1 && cls.name === '7А' && cls.students === 0, 'Анги нээгдэнэ (багш гишүүн биш)', classes);
  await call('POST', '/teacher/classes', { token: t.token, body: { name: '7Б' } });
  check((await call<TeacherClassesResponse>('GET', '/teacher/classes', { token: t.token })).classes.length === 2, 'Багш олон анги нээнэ');

  console.log('\n— Сурагч нэгдэх, сул сэдэв');
  for (const k of [kid, kid2]) await call('PUT', '/me/avatar', { token: k.token, body: { name: 'Сурагч', fur: 'brown', face: 'calm', chest: true } });
  await call<MyClanResponse>('POST', `/clans/${cls.code}/join`, { token: kid.token });
  await call<MyClanResponse>('POST', `/clans/${cls.code}/join`, { token: kid2.token });
  await doTask(kid.token, 'math', false);
  await doTask(kid2.token, 'math', true);
  const detail = await call<TeacherClassDetailResponse>('GET', `/teacher/classes/${cls.code}`, { token: t.token });
  check(detail.students.length === 2, 'Багш 2 сурагчаа харна', detail.students.length);
  check(detail.students[0].percent === 0 && detail.students[1].percent === 100, 'Их алддаг сурагч эхэндээ', detail.students.map((s) => s.percent));
  check(detail.weakTopics.every((w, i, a) => i === 0 || a[i - 1].percent <= w.percent), 'Сул сэдэв муу нь эхэндээ', detail.weakTopics);
  await expectError(call('GET', `/teacher/classes/${cls.code}`, { token: kid.token }), 'FORBIDDEN', 'Сурагч ангийн тайланг харахгүй');

  console.log('\n— Ангийн тэмцээн');
  check((await call<QuizActiveResponse>('GET', '/quiz/active', { token: kid.token })).quizId === null, 'Эхэндээ тэмцээнгүй');
  const { quizId } = await call<QuizActiveResponse>('POST', `/teacher/classes/${cls.code}/quiz`, { token: t.token, body: { subject: 'math' } });
  check((await call<QuizActiveResponse>('GET', '/quiz/active', { token: kid.token })).quizId === quizId, 'Сурагч тэмцээнээ олно');
  const outsider = await register('tk_c', 7);
  await expectError(call('POST', `/quiz/${quizId}/join`, { token: outsider.token }), 'FORBIDDEN', 'Өөр ангийн хүүхэд нэгдэхгүй');
  let v = await call<QuizView>('POST', `/quiz/${quizId}/join`, { token: kid.token });
  await call<QuizView>('POST', `/quiz/${quizId}/join`, { token: kid2.token });
  check(v.phase === 'lobby' && v.joined && !v.isHost, 'Хүлээлгийн өрөөнд нэгдэнэ');
  await expectError(call('POST', `/quiz/${quizId}/next`, { token: kid.token }), 'FORBIDDEN', 'Сурагч тэмцээнийг удирдахгүй');

  v = await call<QuizView>('POST', `/quiz/${quizId}/next`, { token: t.token });
  check(v.phase === 'question' && v.q === 0 && v.question !== null && v.correctIndex === null && v.players === 2, 'Багш 1-р асуултыг гаргана', v);
  // зөв хариуг мэдэхгүй тул хоёр өөр хариулт өгнө: хоёрын нэг нь л зөв байж болно
  const a1 = await call<QuizView>('POST', `/quiz/${quizId}/answer`, { token: kid.token, body: { q: 0, choice: 0 } });
  check(a1.phase === 'question' && a1.mine?.correct === null && a1.counts === null && a1.board.every((b) => b.score === 0), 'Асуулт явж байхад зөв эсэх, оноо нууц', a1);
  await call<QuizView>('POST', `/quiz/${quizId}/answer`, { token: kid.token, body: { q: 0, choice: 1 } });
  const a2 = await call<QuizView>('POST', `/quiz/${quizId}/answer`, { token: kid2.token, body: { q: 0, choice: 1 } });
  check(a2.phase === 'reveal' && a2.correctIndex !== null, 'Бүгд хариулбал шууд зөв хариу гарна', a2.phase);
  const k1 = await call<QuizView>('GET', `/quiz/${quizId}`, { token: kid.token });
  check(k1.mine?.choice === 0, 'Эхний хариулт л тоологдоно', k1.mine);
  check(k1.counts?.[0] === 1 && k1.counts?.[1] === 1 && k1.counts.length === 4, 'Хариулт бүрийг хэдэн хүн сонгосныг харуулна', k1.counts);
  check(k1.board.filter((b) => b.score > 0).length === (k1.correctIndex! <= 1 ? 1 : 0) && k1.board[0].score >= k1.board[1].score, 'Leaderboard оноогоор эрэмбэлэгдэнэ', k1.board);
  await expectError(call('POST', `/quiz/${quizId}/answer`, { token: kid.token, body: { q: 0, choice: 2 } }), 'TASK_CLOSED', 'Хариу гарсны дараа хариулахгүй');

  for (let i = 1; i < v.total; i++) {
    v = await call<QuizView>('POST', `/quiz/${quizId}/next`, { token: t.token });
    check(v.phase === 'question' && v.q === i, `${i + 1}-р асуулт`, v.phase);
    v = await call<QuizView>('POST', `/quiz/${quizId}/next`, { token: t.token });
  }
  v = await call<QuizView>('POST', `/quiz/${quizId}/next`, { token: t.token });
  check(v.phase === 'finished' && v.question === null, 'Тэмцээн дуусна', v.phase);
  check((await call<QuizActiveResponse>('GET', '/quiz/active', { token: kid.token })).quizId === null, 'Дууссан тэмцээн сурагчдад харагдахгүй');

  await runAssignmentChecks(t, kid, kid2, outsider, cls.code);

  console.log('\n— Сүүлчийн сурагч гарсан ч анги үлдэнэ');
  await call('POST', '/clans/mine/leave', { token: kid.token });
  await call('POST', '/clans/mine/leave', { token: kid2.token });
  const after = await call<TeacherClassDetailResponse>('GET', `/teacher/classes/${cls.code}`, { token: t.token });
  check(after.students.length === 0, 'Багшийн анги устахгүй');
  check((await me(kid.token)).teacher === false, '/me teacher=false');
}
