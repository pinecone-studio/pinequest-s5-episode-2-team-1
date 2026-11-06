// Багшийн хичээл, даалгавар, дарааллын эрэмбэ. runTeacherScenario дотроос (`npm run e2e -- --only teacher`).
import type { AssignmentsResponse, AssignmentView } from '../../shared/assignment';
import type { TeacherClassDetailResponse } from '../../shared/teacher';
import type { AuthResponse } from '../../shared/types';
import { check, expectError } from './e2e-lib';
import { call } from './lib';

/** `kid` бүх асуултаа хийнэ, `kid2` хийхгүй; хоёулаа өмнө нь өдрийн даалгавар хийсэн (дараалал 1). */
export async function runAssignmentChecks(t: AuthResponse, kid: AuthResponse, kid2: AuthResponse, outsider: AuthResponse, code: string) {
  console.log('\n— Багшийн хичээл, даалгавар');
  const tok = { token: t.token };
  await expectError(call('POST', `/teacher/classes/${code}/assignments`, { ...tok, body: { days: 2 } }), 'BAD_REQUEST', 'Зөвхөн 1, 3, 7 хоног');

  const { id } = await call<{ id: number }>('POST', `/teacher/classes/${code}/assignments`, { ...tok, body: { topic: null, days: 3 } });
  const mine = (await call<AssignmentsResponse>('GET', '/assignments', { token: kid.token })).assignments;
  check(mine.length === 1 && mine[0].id === id && mine[0].answered === 0 && mine[0].total === 5, 'Сурагч даалгавраа харна', mine);
  check((await call<AssignmentsResponse>('GET', '/assignments', { token: outsider.token })).assignments.length === 0, 'Өөр ангийн хүүхэд харахгүй');
  await expectError(call('GET', `/assignments/${id}`, { token: outsider.token }), 'FORBIDDEN', 'Өөр ангийн даалгаврыг нээхгүй');

  let v = await call<AssignmentView>('GET', `/assignments/${id}`, { token: kid.token });
  check(v.open && v.questions.length === 5 && v.answers.length === 0, 'Даалгавар нээгдэнэ (зөв хариу нууц)', v);
  v = await call<AssignmentView>('POST', `/assignments/${id}/answer`, { token: kid.token, body: { position: 0, choice: 0 } });
  check(v.answers.length === 1 && typeof v.answers[0].correctIndex === 'number', 'Хариулсны дараа зөв хариу гарна', v.answers);
  await expectError(call('POST', `/assignments/${id}/answer`, { token: kid.token, body: { position: 0, choice: 1 } }), 'TASK_CLOSED', 'Нэг асуултад нэг л удаа');
  await expectError(call('POST', `/assignments/${id}/answer`, { token: kid.token, body: { position: 3, choice: 1 } }), 'TASK_CLOSED', 'Дарааллаар нь хариулна');
  for (let p = 1; p < 5; p++) v = await call<AssignmentView>('POST', `/assignments/${id}/answer`, { token: kid.token, body: { position: p, choice: 0 } });
  const left = (await call<AssignmentsResponse>('GET', '/assignments', { token: kid.token })).assignments[0];
  check(left.answered === 5 && left.correct === v.answers.filter((a) => a.correct).length, 'Дууссан даалгаврын дүн', left);

  const d = await call<TeacherClassDetailResponse>('GET', `/teacher/classes/${code}`, tok);
  const a = d.assignments[0];
  check(d.subject === 'math' && a.id === id && a.open && a.done === 1 && a.students === 2 && a.missing.length === 1, 'Багш хэн хийсэн, хэн хийгээгүйг харна', a);
  check(a.percent === Math.round((100 * left.correct) / 5), 'Даалгаврын зөв хувь', a.percent);
  check(d.students.every((s) => s.streak === 1), 'Сурагчдын дараалал харагдана', d.students.map((s) => s.streak));
  check(
    d.weakTopics.every((w) => w.subject === 'math' && w.students >= 1 && w.struggling <= w.students),
    'Сул сэдэв багшийн хичээлээр, хэдэн сурагч алдаж байгаатай',
    d.weakTopics,
  );
  check(d.students.reduce((n, s) => n + s.answered, 0) >= 10 + 5, 'Тэмцээн, даалгаврын хариулт тайланд нийлнэ', d.students.map((s) => s.answered));
}
