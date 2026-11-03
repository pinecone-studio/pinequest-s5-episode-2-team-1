// Баавгайн хариулт (Gemini Live-ийн ярианы бичлэг) самбар дээр гарахаас өмнө засагдана (mobile/src/app/tutor.tsx).

// Үгийн хил: утасны JS (Hermes) `\p{L}`-ийг дэмжихгүй байж болзошгүй тул үсгийг шууд жагсаана.
const L = 'А-Яа-яЁёӨөҮүA-Za-z';
/**
 * Live-ийн өөрийнх нь яриаг текст болгоход гардаг, байнга давтагддаг алдаанууд ("Төсөөлөөд үз дээ" →
 * "төсөөлөө дөө", "өөрөөр нь" → "өөртөөр нь", "жинлүүр" → "дэнлүүр").
 */
const FIXES: [RegExp, string][] = [
  [new RegExp(`(^|[^${L}])([Тт])өсөөлөө дөө(?=$|[^${L}])`, 'g'), '$1$2өсөөлөөд үз дээ'],
  [new RegExp(`(^|[^${L}])([Үү])з дөө(?=$|[^${L}])`, 'g'), '$1$2з дээ'],
  [new RegExp(`(^|[^${L}])([Өө])өртөөр(?=$|[^${L}])`, 'g'), '$1$2өрөөр'],
  [new RegExp(`(^|[^${L}])дэнлүүр`, 'g'), '$1жинлүүр'],
  [new RegExp(`(^|[^${L}])Дэнлүүр`, 'g'), '$1Жинлүүр'],
];

/** Томьёонд хэлсэн үгийг тэмдэг болгоно: "3x минус 7 тэнцүү 11" → "3x − 7 = 11" (хоёр талд нь тоо, хувьсагч байвал л). */
const MATH_TOKEN = '[0-9A-Za-z²³⁴⁵⁶⁷⁸⁹⁰¹)]';
const MATH_START = '[0-9A-Za-z(−-]';
const OPERATORS: [RegExp, string][] = [
  [new RegExp(`(${MATH_TOKEN}) минус (?=${MATH_START})`, 'g'), '$1 − '],
  [new RegExp(`(${MATH_TOKEN}) тэнцүү (?=${MATH_START})`, 'g'), '$1 = '],
  // кирилл "х" үсгийг үржих тэмдэг болгосон: "−3 х −3" → "−3 · −3"
  [new RegExp(`([0-9)²³⁴⁵⁶⁷⁸⁹]) х (?=[0-9(−-])`, 'g'), '$1 · '],
];

const SUPER: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '−': '⁻' };
const sup = (s: string) => [...s].map((c) => SUPER[c] ?? c).join('');

/** Баавгай заримдаа LaTeX бичдэг: "$2^3 \cdot 2^4 = 2^7$" → "2³ · 2⁴ = 2⁷". */
function fromLatex(text: string): string {
  return text
    .replace(/\\(?:cdot|times)/g, '·')
    .replace(/\\pm/g, '±')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\^\{([0-9+\-−]+)\}/g, (_m, e: string) => sup(e))
    .replace(/\^([0-9])/g, (_m, e: string) => sup(e))
    .replace(/\$/g, '');
}

export function fixTranscript(text: string): string {
  // Монгол бичигт байхгүй украин "є", "і"-г ("дєрєв", "іжил") transcript "ө", "и"-ийн оронд бичдэг.
  const letters = fromLatex(text).replace(/є/g, 'ө').replace(/Є/g, 'Ө').replace(/і/g, 'и').replace(/І/g, 'И');
  const words = FIXES.reduce((t, [re, to]) => t.replace(re, to), letters);
  return OPERATORS.reduce((t, [re, to]) => t.replace(re, to), words);
}
