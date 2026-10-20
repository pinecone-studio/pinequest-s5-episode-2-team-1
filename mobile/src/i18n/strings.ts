// UI-ийн бүх текст энд. Апп-ын нэр: src/constants/app.ts
import type { ErrorCode, Subject } from '@shared/types';

export const subjectNames: Record<Subject, string> = {
  math: 'Математик',
  mongolian: 'Монгол хэл',
  physics: 'Физик',
};

export const subjectIcons: Record<Subject, string> = {
  math: '➗',
  mongolian: '📖',
  physics: '⚛️',
};

export const S = {
  common: {
    loading: 'Ачаалж байна…',
    retry: 'Дахин оролдох',
    back: 'Буцах',
    cancel: 'Болих',
    yes: 'Тийм',
    close: 'Хаах',
  },
  health: {
    checking: 'Сервертэй холбогдож байна…',
    ok: 'Сервертэй холбогдлоо',
    fail: 'Сервертэй холбогдож чадсангүй',
    apiUrl: 'API хаяг',
    questions: (n: number) => `Асуултын санд ${n} асуулт байна`,
  },
};

export const errorMessages: Record<ErrorCode | 'NETWORK' | 'TIMEOUT', string> = {
  BAD_REQUEST: 'Мэдээлэл буруу байна',
  UNAUTHORIZED: 'Дахин нэвтэрнэ үү',
  FORBIDDEN: 'Эрх хүрэхгүй байна',
  NOT_FOUND: 'Олдсонгүй',
  INTERNAL: 'Серверт алдаа гарлаа',
  USERNAME_TAKEN: 'Энэ нэр бүртгэлтэй байна. Өөр нэр сонгоно уу.',
  INVALID_CREDENTIALS: 'Нэр эсвэл нууц үг буруу байна',
  DAILY_LIMIT: 'Өнөөдрийн 10 даалгавраа хийчихлээ. Маргааш уулзъя!',
  NO_QUESTIONS: 'Асуулт бэлдэж байна. Түр хүлээгээд дахин оролдоно уу.',
  TASK_CLOSED: 'Энэ даалгавар дууссан байна',
  ALREADY_ANSWERED: 'Энэ асуултад хариулсан байна',
  INSUFFICIENT_POINTS: 'Оноо хүрэлцэхгүй байна',
  SHIELD_HELD: 'Танд хамгаалалт аль хэдийн байна',
  SHIELD_COOLDOWN: 'Хамгаалалтыг 7 хоногт нэг л удаа авч болно',
  ITEM_LOCKED: 'Таны шат хүрэхгүй байна',
  ALREADY_OWNED: 'Энэ эд зүйл танд байгаа',
  NOT_OWNED: 'Эхлээд худалдаж авна уу',
  STAKE_TOO_LOW: 'Бооцоо хамгийн багадаа 1 оноо байна',
  STAKE_TOO_HIGH: 'Бооцоо таны онооны 20%-иас хэтэрч болохгүй',
  OPPONENT_STAKE_TOO_HIGH: 'Бооцоо өрсөлдөгчийн онооны 20%-иас хэтэрч байна',
  DUEL_EXISTS: 'Танд аль хэдийн нээлттэй тулаан байна',
  DUEL_TAKEN: 'Энэ сорилтыг өөр хүн авчихлаа',
  DUEL_NOT_OPEN: 'Сорилт хаагдсан байна',
  WRONG_TIER: 'Энэ сорилт өөр түвшнийх байна',
  OWN_DUEL: 'Өөрийнхөө сорилтыг хүлээн авах боломжгүй',
  LLM_UNAVAILABLE: 'Асуулт үүсгэх үйлчилгээ тохируулаагүй байна',
  LLM_FAILED: 'Асуулт үүсгэж чадсангүй',
  NETWORK: 'Сервертэй холбогдож чадсангүй. Wi-Fi-гаа шалгана уу.',
  TIMEOUT: 'Сервер хариу өгөхгүй байна. Дахин оролдоно уу.',
};
