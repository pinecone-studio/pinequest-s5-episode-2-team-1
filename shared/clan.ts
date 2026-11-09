// Анги (ангийн баг, clans): ангийнхан нэг ангид нэгдэж, хамтдаа цуглуулсан XP-ээрээ бусад ангитай уралдана. API ба апп нэг эх.

/** Нэг ангид хамгийн ихдээ ийм олон сурагч (нэг анги). */
export const CLAN_MAX_MEMBERS = 40;
/** Урилгын код: тулааны кодын адил 6 оронтой тоо (самбар дээр бичиж өгөхөд амар). */
export const CLAN_CODE_LENGTH = 6;
/** Нэрийн эхний хэсэг ("Төгсбилэгийн"), " анги" нь үргэлж ард нь нэмэгдэнэ. */
export const CLAN_NAME_MAX = 24;

/** Анги үүсгэхдээ сонгох pixel icon (sprite clan_icon_<key>_48x48). Эхнийх нь анхдагч. */
export const CLAN_ICONS = ['bear', 'wolf', 'eagle', 'horse', 'leopard', 'dragon', 'owl', 'fox', 'rocket', 'bolt', 'crown', 'flame'] as const;
export type ClanIcon = (typeof CLAN_ICONS)[number];
/** DB-ийн утгыг (NULL, хуучин, танихгүй) icon болгоно. */
export const clanIcon = (key: string | null | undefined): ClanIcon => (CLAN_ICONS as readonly string[]).includes(key ?? '') ? (key as ClanIcon) : CLAN_ICONS[0];

/** "Батын" → "Батын анги". Хуучин нэрэнд "анги", "ангийн" бичсэн бол давхардуулахгүй ("6А ангийн" → "6А анги"). */
export const clanTitle = (name: string) => `${name.replace(/\s*анги(йн)?$/i, '') || name} анги`;

/** " анги"-г (хуучин нэрэнд " Уул") нэрэнд нь давхар бичсэн бол хасна ("6А анги" → "6А"), зайг цэгцэлнэ. */
export function normalizeClanName(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*(уул|анги)$/i, '')
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
 * залгана. Санал болгох нэр тул нарийн дүрмийн онцгой тохиолдлыг ангийн эзэн өөрөө засна.
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

/** Ангийн анхдагч нэр үүсгэгчийн нэрээс: "Төгсбилэг" → "Төгсбилэгийн". */
export const defaultClanName = (founder: string) => normalizeClanName(genitive(founder)) || 'Баавгайн';
