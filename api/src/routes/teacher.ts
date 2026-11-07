import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { CLAN_NAME_MAX } from '../../../shared/clan';
import type { QuizActiveResponse, TeacherClassDetailResponse, TeacherClassesResponse } from '../../../shared/teacher';
import { ACTIVE_SUBJECTS } from '../config/game';
import { TEACHER } from '../config/teacher';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { createAssignment } from '../services/assignments';
import { classDetail, removeStudent } from '../services/classDetail';
import { startQuiz } from '../services/quiz';
import { createClass, listClasses, setTeacherSubject } from '../services/teacher';

/** Багшийн хэсэг: анги нээх, сурагчдын явц, сул сэдэв, ангийн тэмцээн эхлүүлэх. Зөвхөн багшийн бүртгэлд. */
export const teacherRoutes = new Hono<AppEnv>();

const requireTeacher = createMiddleware<AppEnv>(async (c, next) => {
  const row = await c.env.DB.prepare('SELECT is_teacher FROM users WHERE id = ?').bind(c.get('userId')).first<{ is_teacher: number }>();
  if (row?.is_teacher !== 1) throw new ApiError(403, 'FORBIDDEN', 'Энэ хэсэг зөвхөн багшид');
  await next();
});
teacherRoutes.use('*', requireAuth, requireTeacher);

teacherRoutes.get('/classes', async (c) => c.json<TeacherClassesResponse>(await listClasses(c.env.DB, c.get('userId'))));

/** Заадаг хичээл: бүртгүүлсний дараах эхний алхам (дараа нь сольж болно). */
teacherRoutes.put('/subject', async (c) => {
  const body = await readBody(c, z.object({ subject: z.enum(ACTIVE_SUBJECTS) }));
  return c.json<TeacherClassesResponse>(await setTeacherSubject(c.env.DB, c.get('userId'), body.subject));
});

teacherRoutes.post('/classes', async (c) => {
  const body = await readBody(c, z.object({ name: z.string().max(CLAN_NAME_MAX + 16) }));
  return c.json<TeacherClassesResponse>(await createClass(c.env.DB, c.get('userId'), body.name), 201);
});

teacherRoutes.get('/classes/:code', async (c) =>
  c.json<TeacherClassDetailResponse>(await classDetail(c.env.DB, c.get('userId'), c.req.param('code'))),
);

teacherRoutes.delete('/classes/:code/students/:student', async (c) =>
  c.json<TeacherClassDetailResponse>(await removeStudent(c.env.DB, c.get('userId'), c.req.param('code'), c.req.param('student'))),
);

/** Ангийн тэмцээн (хүлээлгийн өрөө): багшийн хичээлээр. topic өгвөл зөвхөн тэр сэдвээр (сул сэдвээ давтуулах). */
teacherRoutes.post('/classes/:code/quiz', async (c) => {
  const body = await readBody(c, z.object({ topic: z.string().max(64).nullable().default(null) }));
  return c.json<QuizActiveResponse>(await startQuiz(c.env.DB, c.get('userId'), c.req.param('code'), body.topic), 201);
});

/** Даалгавар өгөх: багшийн хичээлээр, topic өгвөл тэр сэдвээр; days = хэдэн хоногийн дотор хийх. */
teacherRoutes.post('/classes/:code/assignments', async (c) => {
  const days = TEACHER.ASSIGNMENT.DAYS;
  const body = await readBody(
    c,
    z.object({ topic: z.string().max(64).nullable().default(null), days: z.number().int().refine((d) => (days as readonly number[]).includes(d)) }),
  );
  return c.json(await createAssignment(c.env.DB, c.get('userId'), c.req.param('code'), body.topic, body.days), 201);
});
