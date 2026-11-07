// Багшийн хэсгийн демо өгөгдөл (локал): багш, 7А анги, 6 сурагч даалгавар хийсэн, хүлээлгийн өрөөтэй тэмцээн.
// `npx tsx scripts/demo-teacher.ts --url http://localhost:8787` → багш: bagsh_<suffix> / demo-pass-123, сурагч: dk_<нэр>_<suffix>
import type { QuizActiveResponse, TeacherClassesResponse } from '../../shared/teacher';
import type { AuthResponse } from '../../shared/types';
import { doTask, register, testNet } from './e2e-lib';
import { call } from './lib';

const suffix = Date.now().toString(36).slice(-4);
const KIDS: [string, string, boolean[]][] = [
  ['Тэмүүлэн', 'brown', [true, true]],
  ['Анужин', 'white', [true, false]],
  ['Батбаяр', 'black', [false, false]],
  ['Номин', 'brown', [true, true, false]],
  ['Сарнай', 'white', [false, true]],
  ['Эрдэнэ', 'black', [false]],
];

const body = { username: `bagsh_${suffix}`, password: 'demo-pass-123', teacher: true };
const t = await call<AuthResponse>('POST', '/auth/register', { body, headers: { 'cf-connecting-ip': testNet() } });
await call('PUT', '/me/avatar', { token: t.token, body: { name: 'Сараа', fur: 'brown', face: 'calm', chest: true } });
const { classes } = await call<TeacherClassesResponse>('POST', '/teacher/classes', { token: t.token, body: { name: '7А' } });
await call('POST', '/teacher/classes', { token: t.token, body: { name: '8Б' } });
const code = classes[0].code;
const kids: AuthResponse[] = [];
for (const [name, fur, tasks] of KIDS) {
  const k = await register(`dk_${suffix}`.slice(0, 12) + kids.length, 7);
  await call('PUT', '/me/avatar', { token: k.token, body: { name, fur, face: 'calm', chest: true } });
  await call('POST', `/clans/${code}/join`, { token: k.token });
  for (const ok of tasks) await doTask(k.token, 'math', ok);
  kids.push(k);
}
await call('PUT', '/teacher/subject', { token: t.token, body: { subject: 'math' } });
const { quizId } = await call<QuizActiveResponse>('POST', `/teacher/classes/${code}/quiz`, { token: t.token, body: {} });
for (const k of kids.slice(1)) await call('POST', `/quiz/${quizId}/join`, { token: k.token });
console.log(JSON.stringify({ teacher: body.username, kid: kids[0].me.username, code, quizId }));
