import { PLANS, type Plan } from '../../../shared/plan';
import { GAME } from '../config/game';

// Хэрэглэгчийн одоогийн багц: хугацаа нь дууссан төлбөртэй багц free болно. Admin, шүүгч бүх боломжтой тул max.

export interface PlanRow {
  plan: string;
  plan_until: number | null;
  is_admin: number;
  is_judge: number;
}

export function effectivePlan(u: PlanRow, now: number): Plan {
  if (u.is_admin === 1 || u.is_judge === 1) return 'max';
  const plan = (PLANS as readonly string[]).includes(u.plan) ? (u.plan as Plan) : 'free';
  if (plan !== 'free' && u.plan_until !== null && u.plan_until <= now) return 'free';
  return plan;
}

/** Баавгайтай өдөрт хэдэн ярилцлага (бодлого) нээх. */
export const tutorDailyLimit = (plan: Plan): number => GAME.TUTOR.DAILY_SESSIONS[plan];
