import { Hono } from 'hono';
import { z } from 'zod';
import type { LessonsResponse, MeResponse, MyProfileResponse, OnboardingBody } from '../../../shared/types';
import { HEARD_FROM, REASONS, SELF_LEVELS } from '../../../shared/onboarding';
import { BEAR_FACES, BEAR_FURS } from '../config/cosmetics';
import { ACTIVE_SUBJECTS, GAME } from '../config/game';
import { tierForGrade } from '../domain/level';
import type { AppEnv } from '../env';
import { ApiError, readBody } from '../lib/errors';
import { requireAuth } from '../lib/session';
import { loadLessons } from '../services/lessons';
import { myProfile, rotateProfileCode, setAdminGrade, setAvatar, setBearLook, setOnboarding } from '../services/profiles';
import { loadMe } from '../services/users';

export const meRoutes = new Hono<AppEnv>();

meRoutes.get('/', requireAuth, async (c) => {
  return c.json<MeResponse>({ me: await loadMe(c.env.DB, c.get('userId')) });
});

/** Сурах замын хичээлүүд: хэрэглэгчийн ангийн сурах бичгийн гарчгаас. */
meRoutes.get('/lessons/:subject', requireAuth, async (c) => {
  const subject = z.enum(ACTIVE_SUBJECTS).safeParse(c.req.param('subject'));
  if (!subject.success) throw new ApiError(400, 'BAD_REQUEST', 'Буруу хичээл');
  const user = await c.env.DB.prepare('SELECT grade FROM users WHERE id = ?').bind(c.get('userId')).first<{ grade: number }>();
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Нэвтрэх шаардлагатай');
  return c.json<LessonsResponse>(await loadLessons(c.env, subject.data, user.grade));
});

/** Миний профайл (бусдад ингэж харагдана) ба хуваалцах код. */
meRoutes.get('/profile', requireAuth, async (c) => c.json<MyProfileResponse>(await myProfile(c.env.DB, c.get('userId'))));

/** Кодоо солино: хуучин кодоор профайл олдохоо болино. */
meRoutes.post('/profile/code', requireAuth, async (c) => c.json<MyProfileResponse>(await rotateProfileCode(c.env.DB, c.get('userId'))));

/** Нүүрэн дээр сонгосон дэвсгэр, хувцас (профайл дээр бусдад харагдана). */
meRoutes.put('/look', requireAuth, async (c) => {
  const body = await readBody(c, z.object({ bg: z.string().min(1).max(40), outfit: z.string().min(1).max(400) }));
  return c.json<MeResponse>({ me: await setBearLook(c.env.DB, c.get('userId'), body) });
});

/** Анх орохдоо асуудаг асуултын хариулт (анги нь зөвхөн анх удаа хэрэгжинэ). */
meRoutes.put('/onboarding', requireAuth, async (c) => {
  const body = await readBody(
    c,
    z.object({
      grade: z.number().int().min(GAME.GRADE_MIN).max(GAME.GRADE_MAX),
      subject: z.enum(ACTIVE_SUBJECTS),
      heardFrom: z.enum(HEARD_FROM).optional(),
      reason: z.enum(REASONS).optional(),
      level: z.number().int().refine((v) => (SELF_LEVELS as readonly number[]).includes(v)).optional(),
    }),
  );
  const tier = tierForGrade(body.grade);
  if (!tier) throw new ApiError(400, 'BAD_REQUEST', 'Анги буруу');
  return c.json<MeResponse>({ me: await setOnboarding(c.env.DB, c.get('userId'), body as OnboardingBody, tier) });
});

/** Хөгжүүлэгчийн бүртгэлээр 6–12-р ангийн агуулгыг шалгана. */
meRoutes.put('/grade', requireAuth, async (c) => {
  const { grade } = await readBody(
    c,
    z.object({ grade: z.number().int().min(GAME.GRADE_MIN).max(GAME.GRADE_MAX) }),
  );
  return c.json<MeResponse>({ me: await setAdminGrade(c.env.DB, c.get('userId'), grade) });
});

/** Профайлын нэр (хоч) ба баавгайн үс, царай, цээжний толбо. */
meRoutes.put('/avatar', requireAuth, async (c) => {
  const body = await readBody(
    c,
    z.object({
      // хоч: зай, кирилл зөвшөөрнө; удирдах тэмдэгт (шинэ мөр г.м.) үгүй
      name: z
        .string()
        .trim()
        .min(1)
        .max(GAME.AUTH.USERNAME_MAX)
        .regex(/^[^\p{C}]+$/u),
      fur: z.enum(BEAR_FURS),
      face: z.enum(BEAR_FACES),
      chest: z.boolean(),
    }),
  );
  return c.json<MeResponse>({ me: await setAvatar(c.env.DB, c.get('userId'), body) });
});
