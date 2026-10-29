// Анх орохдоо асуух асуултын сонголтууд (API ба апп нэг эх). Бичвэр нь mobile/src/i18n/strings.ts-д.

/** KUMA-г хаанаас сонссон */
export const HEARD_FROM = ['friends', 'teacher', 'family', 'social', 'other'] as const;
/** Яагаад хичээллэх гэж байгаа */
export const REASONS = ['grades', 'exam', 'catchup', 'fun', 'compete', 'other'] as const;
/** Сонгосон хичээлдээ өөрийгөө хэр сайн гэж боддог (0 = дөнгөж эхэлж буй … 4 = олимпиадын) */
export const SELF_LEVELS = [0, 1, 2, 3, 4] as const;

export type HeardFrom = (typeof HEARD_FROM)[number];
export type Reason = (typeof REASONS)[number];
export type SelfLevel = (typeof SELF_LEVELS)[number];
