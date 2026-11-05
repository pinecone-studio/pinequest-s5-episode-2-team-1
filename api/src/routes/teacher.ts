import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { CLAN_NAME_MAX } from '../../../shared/clan';
import type { QuizActiveResponse, TeacherClassDetailResponse, TeacherClassesResponse } from '../../../shared/teacher';
import { ACTIVE_SUBJECTS } from '../config/game';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { startQuiz } from '../services/quiz';
import { classDetail, createClass, listClasses, removeStudent } from '../services/teacher';

/** Багшийн хэсэг: анги нээх, сурагчдын явц, сул сэдэв, ангийн тэмцээн эхлүүлэх. Зөвхөн багшийн бүртгэлд. */
export const teacherRoutes = new Hono<AppEnv>();

const requireTeacher = createMiddleware<AppEnv>(async (c, next) => {
  const row = await c.env.DB.prepare('SELECT is_teacher FROM users WHERE id = ?').bind(c.get('userId')).first<{ is_teacher: number }>();
  if (row?.is_teacher !== 1) throw new ApiError(403, 'FORBIDDEN', 'Энэ хэсэг зөвхөн багшид');
  await next();
});
teacherRoutes.use('*', requireAuth, requireTeacher);

teacherRoutes.get('/classes', async (c) => c.json<TeacherClassesResponse>(await listClasses(c.env.DB, c.get('userId'))));

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

/** Ангийн тэмцээн (хүлээлгийн өрөө). topic өгвөл зөвхөн тэр сэдвээр (сул сэдвээ давтуулах). */
teacherRoutes.post('/classes/:code/quiz', async (c) => {
  const body = await readBody(c, z.object({ subject: z.enum(ACTIVE_SUBJECTS), topic: z.string().max(64).nullable().default(null) }));
  return c.json<QuizActiveResponse>(await startQuiz(c.env.DB, c.get('userId'), c.req.param('code'), body.subject, body.topic), 201);
});
