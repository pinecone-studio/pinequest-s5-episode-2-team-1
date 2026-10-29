// Уул (ангийн баг): ангийнхан нэг Ууланд нэгдэж, хамтдаа цуглуулсан XP-ээрээ Уулаа өндөрсгөнө. API ба апп нэг эх.

/** Нэг Ууланд хамгийн ихдээ ийм олон сурагч (нэг анги). */
export const CLAN_MAX_MEMBERS = 40;
/** Урилгын код: тулааны кодын адил 6 оронтой тоо (самбар дээр бичиж өгөхөд амар). */
export const CLAN_CODE_LENGTH = 6;
/** Нэрийн эхний хэсэг ("Төгсбилэгийн"), " Уул" нь үргэлж ард нь нэмэгдэнэ. */
export const CLAN_NAME_MAX = 24;
/** Уулын өндөр: гишүүдийн XP-ийн нийлбэр / энэ (= нэг зөв хариулт 1 метр). */
export const XP_PER_METER = 10;

export const clanTitle = (name: string) => `${name} Уул`;

/** "Уул"-ыг нэрэнд нь давхар бичсэн бол хасна ("6А ангийн Уул" → "6А ангийн"), зайг цэгцэлнэ. */
export function normalizeClanName(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*уул$/i, '')
    .trim()
    .slice(0, CLAN_NAME_MAX)
    .trim();
}

const BACK = /[аоуяёАОУЯЁ]/;
const VOWEL = /[аэиоуөүыяеёюАЭИОУӨҮЫЯЕЁЮ]/;
/** Эдгээрийн дараа эр, эм үгээс үл хамааран "-ийн" (Батзоригийн, Нямдоржийн). */
const SOFT_TAIL = /[гжчшщкь]$/i;

/**
 * Нэрийн харьяалахын тийн ялгал: "Төгсбилэг" → "Төгсбилэгийн", "Болд" → "Болдын", "Дулмаа" → "Дулмаагийн",
 * "Сарнай" → "Сарнайн", "Бат-Эрдэнэ" → "Бат-Эрдэнийн". Зөвхөн сүүлийн үгийг хувиргана; кирилл биш бол "-ийн"
 * залгана. Санал болгох нэр тул нарийн дүрмийн онцгой тохиолдлыг Уулын эзэн өөрөө засна.
 */
export function genitive(name: string): string {
  const trimmed = name.trim();
  const match = trimmed.match(/^(.*?)([^\s-]+)$/);
  if (!match) return trimmed;
  const [, head, word] = match;
  if (!/[а-яёөү]/i.test(word)) return `${trimmed}-ийн`;
  // Нийлмэл нэр сүүлийн хэсгээ дагана (Бат+сүрэн → эм, Энх+сайхан → эр): "и"-ээс бусад сүүлийн эгшгээр.
  const back = BACK.test(word.match(/[аоуяёэөүеюАОУЯЁЭӨҮЕЮ](?=[^аоуяёэөүеюАОУЯЁЭӨҮЕЮ]*$)/)?.[0] ?? '');
  const last = word.slice(-1);
  const prev = word.slice(-2, -1);
  let out: string;
  if (VOWEL.test(last) && VOWEL.test(prev)) out = `${word}гийн`;
  else if (last === 'й' || last === 'Й') out = `${word}н`;
  else if (last === 'н' || last === 'Н') out = back ? `${word}ы` : `${word}гийн`;
  else if (/[ьъ]$/i.test(word)) out = `${word.slice(0, -1)}${last.toLowerCase() === 'ь' ? 'ийн' : 'ын'}`;
  else if (SOFT_TAIL.test(word)) out = `${word}ийн`;
  else if (/[аэоө]$/i.test(word)) {
    // Богино эгшгийг хасна: Солонго → Солонгын, Эрдэнэ → Эрдэнийн
    const stem = word.slice(0, -1);
    out = /[жчшщ]$/i.test(stem) ? `${stem}ийн` : `${stem}${back ? 'ын' : 'ийн'}`;
  } else if (VOWEL.test(last)) out = `${word}гийн`;
  else out = `${word}${back ? 'ын' : 'ийн'}`;
  return head + out;
}

/** Уулын анхдагч нэр үүсгэгчийн нэрээс: "Төгсбилэг" → "Төгсбилэгийн". */
export const defaultClanName = (founder: string) => normalizeClanName(genitive(founder)) || 'Баавгайн';

export interface Peak {
  name: string;
  /** метр */
  height: number;
}

/** Уулын өндрийг харьцуулах оргилууд (намаас өндөр рүү). */
export const PEAKS: readonly Peak[] = [
  { name: 'Чингис хааны морьт хөшөө', height: 40 },
  { name: 'Эйфелийн цамхаг', height: 330 },
  { name: 'Бурж Халифа', height: 828 },
  { name: 'Богд хан уулын Цэцээгүн', height: 2256 },
  { name: 'Хүйтэн оргил', height: 4374 },
  { name: 'Эверест', height: 8849 },
];

/** Давсан хамгийн өндөр оргил ба дараагийнх (бүгдийг давсан бол next = null). */
export function peakProgress(height: number): { passed: Peak | null; next: Peak | null } {
  const next = PEAKS.find((p) => p.height > height) ?? null;
  const passed = [...PEAKS].reverse().find((p) => p.height <= height) ?? null;
  return { passed, next };
}
