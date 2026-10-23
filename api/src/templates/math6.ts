// Математик 6-ын тооцооллын хичээлүүдийн загвар (ref = api/seed/lesson-questions.json-ийн bookRef).
// Буруу сонголтууд нь хүүхдийн түгээмэл алдаа (тэмдэг андуурах, ХИЕХ/ХБЕХ солих г.м.). Тооны араас нөхцөл залгахаас
// зайлсхийнэ: "5-аас", "6-гаас" гэх мэт нь тооны дуудлагаас хамаардаг.
import type { Rng, Template } from './index';

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
/** Сурах бичгийн хасах тэмдэг (U+2212). */
const fmt = (n: number) => (n < 0 ? `−${-n}` : String(n));
/** Илэрхийлэл дотор сөрөг тоог хаалтанд. */
const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n));
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0);
const smallestFactor = (n: number) => Array.from({ length: n }, (_, i) => i + 2).find((d) => n % d === 0) ?? n;

/** Зөв хариу эхэнд, дараа нь ялгаатай буруу сонголтууд; дутвал `filler`-ээр нөхнө (нийт 4). */
function four(correct: number, wrong: number[], filler: () => number): string[] {
  const out = [correct];
  for (const w of wrong) if (Number.isFinite(w) && !out.includes(w) && out.length < 4) out.push(w);
  for (let i = 0; out.length < 4 && i < 100; i++) {
    const w = filler();
    if (!out.includes(w)) out.push(w);
  }
  return out.map(fmt);
}

/** Тэг биш бүхэл тоо [lo, hi]. */
const nonzero = (rng: Rng, lo: number, hi: number) => {
  let n = 0;
  while (n === 0) n = int(rng, lo, hi);
  return n;
};

export const MATH6: readonly Template[] = [
  {
    ref: 'math-6:5-6',
    id: 'compare-integers',
    topic: 'negative_numbers',
    make(rng) {
      const nums = new Set<number>();
      // хамгийн их абсолют утгатай сөрөг тоо: "их" гэж андуурдаг
      nums.add(-int(rng, 20, 40));
      nums.add(-int(rng, 1, 19));
      while (nums.size < 4) nums.add(int(rng, -15, 30));
      const list = [...nums].sort(() => rng() - 0.5);
      const max = Math.max(...list);
      const min = Math.min(...list);
      const askMax = rng() < 0.5;
      const answer = askMax ? max : min;
      return {
        prompt: `${list.map(fmt).join(', ')} тоонуудын аль нь хамгийн ${askMax ? 'их' : 'бага'} вэ?`,
        options: [answer, ...list.filter((n) => n !== answer)].map(fmt),
        explanation: askMax
          ? `Тоон шулуун дээр хамгийн баруун талд байгаа тоо хамгийн их: ${fmt(max)}. Сөрөг тоо бүр тэгээс бага.`
          : `Тоон шулуун дээр хамгийн зүүн талд байгаа тоо хамгийн бага: ${fmt(min)}. Сөрөг тооны модуль их байх тусам тоо бага.`,
      };
    },
  },
  {
    ref: 'math-6:7-9',
    id: 'add-sub-integers',
    topic: 'negative_numbers',
    make(rng) {
      const a = nonzero(rng, -30, 30);
      const b = a > 0 ? -int(rng, 1, 30) : nonzero(rng, -30, 30);
      const plus = rng() < 0.5;
      const r = plus ? a + b : a - b;
      return {
        prompt: `${par(a)} ${plus ? '+' : '−'} ${par(b)} хэдтэй тэнцүү вэ?`,
        options: four(r, plus ? [a - b, -r, Math.abs(a) + Math.abs(b)] : [a + b, -r, b - a], () => r + nonzero(rng, -10, 10)),
        explanation: plus
          ? `Сөрөг тоо нэмэх нь түүний модулийг хасахтай адил. Хариу: ${fmt(r)}.`
          : `Тоо хасах нь түүний эсрэг тоог нэмэхтэй адил: ${par(a)} + ${par(-b)} = ${fmt(r)}.`,
      };
    },
  },
  {
    ref: 'math-6:10-11',
    id: 'mul-div-integers',
    topic: 'negative_numbers',
    make(rng) {
      const x = nonzero(rng, -12, 12);
      const y = x > 0 ? -int(rng, 2, 12) : nonzero(rng, -12, 12);
      const mul = rng() < 0.5;
      const r = mul ? x * y : x;
      return {
        prompt: mul ? `${par(x)} · ${par(y)} хэдтэй тэнцүү вэ?` : `${par(x * y)} : ${par(y)} хэдтэй тэнцүү вэ?`,
        options: four(r, mul ? [-r, x + y, -(x + y)] : [-r, x * y + y, y], () => r + nonzero(rng, -6, 6)),
        explanation: `Ижил тэмдэгтэй хоёр тооны үржвэр, ногдвор эерэг, эсрэг тэмдэгтэй хоёр тоонх сөрөг. Хариу: ${fmt(r)}.`,
      };
    },
  },
  {
    ref: 'math-6:12-13',
    id: 'divisible-by',
    topic: 'divisibility',
    make(rng) {
      const d = pick(rng, [4, 6, 8] as const);
      // дөрөвт, зургаад, наймд
      const by = `${d}-${d === 4 ? 'т' : 'д'}`;
      const answer = d * int(rng, Math.ceil(100 / d), Math.floor(999 / d));
      // Хуурамч сонголт: 4, 8-д тэгш боловч хуваагдахгүй; 6-д 2-т эсвэл 3-т л хуваагдах.
      const trap = (n: number) => n % d !== 0 && (d === 6 ? n % 2 === 0 || n % 3 === 0 : n % 2 === 0);
      const wrong: number[] = [];
      for (let i = 0; wrong.length < 3 && i < 500; i++) {
        const n = int(rng, 100, 999);
        if (trap(n) && !wrong.includes(n)) wrong.push(n);
      }
      const digits = String(answer)
        .split('')
        .reduce((s, c) => s + Number(c), 0);
      const explanation =
        d === 6
          ? `2-т ба 3-т зэрэг хуваагдах тоо 6-д хуваагдана: ${answer} тэгш, цифрүүдийн нийлбэр ${digits} нь 3-т хуваагдана.`
          : d === 4
            ? `Сүүлийн хоёр цифрээс бүтсэн тоо 4-т хуваагдвал тоо өөрөө 4-т хуваагдана: ${answer} = 4 · ${answer / 4}.`
            : `Сүүлийн гурван цифрээс бүтсэн тоо 8-д хуваагдвал тоо өөрөө 8-д хуваагдана: ${answer} = 8 · ${answer / 8}.`;
      // Тоонуудыг асуултад бичнэ: ижил текстийн асуулт санд нэг л удаа хадгалагдана.
      const shown = [answer, ...wrong].sort(() => rng() - 0.5);
      return {
        prompt: `${shown.join(', ')} тоонуудын аль нь ${by} хуваагдах вэ?`,
        options: [answer, ...wrong].map(fmt),
        explanation,
      };
    },
  },
  {
    ref: 'math-6:14',
    id: 'gcd',
    topic: 'divisibility',
    make(rng) {
      let g = 0;
      let m = 0;
      let n = 0;
      do {
        g = int(rng, 2, 15);
        m = int(rng, 2, 11);
        n = int(rng, 2, 11);
      } while (m === n || gcd(m, n) !== 1 || g * Math.max(m, n) > 150);
      const [a, b] = [g * m, g * n];
      const part = g / smallestFactor(g);
      return {
        prompt: `ХИЕХ(${a}, ${b}) хэд вэ?`,
        options: four(g, [lcm(a, b), Math.min(a, b), part > 1 ? part : 1], () => g + nonzero(rng, -3, 6)),
        explanation: `${a} = ${g} · ${m}, ${b} = ${g} · ${n}. ${m} ба ${n} нь нэгээс өөр ерөнхий хуваагчгүй тул ХИЕХ = ${g}.`,
      };
    },
  },
  {
    ref: 'math-6:15-16',
    id: 'lcm',
    topic: 'divisibility',
    make(rng) {
      let a = 0;
      let b = 0;
      do {
        a = int(rng, 2, 20);
        b = int(rng, 2, 20);
      } while (a === b || a % b === 0 || b % a === 0 || lcm(a, b) > 200);
      const g = gcd(a, b);
      const l = lcm(a, b);
      return {
        prompt: `ХБЕХ(${a}, ${b}) хэд вэ?`,
        options: four(l, [a * b, g, a + b, l * 2], () => l + nonzero(rng, -5, 5)),
        explanation: `ХБЕХ = ${a} · ${b} : ХИЕХ = ${a * b} : ${g} = ${l}.`,
      };
    },
  },
  {
    ref: 'math-6:17',
    id: 'prime',
    topic: 'divisibility',
    make(rng) {
      const p = pick(rng, [23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97].filter(isPrime));
      // анхны тоо шиг харагддаг сондгой нийлмэл тоо
      const pool = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93].sort(() => rng() - 0.5).slice(0, 3);
      const shown = [p, ...pool].sort(() => rng() - 0.5);
      return {
        prompt: `${shown.join(', ')} тоонуудын аль нь анхны тоо вэ?`,
        options: [p, ...pool].map(fmt),
        explanation: `${p} нь зөвхөн нэг ба өөртөө л хуваагдана. Бусад нь нийлмэл: ${pool.map((c) => `${c} = ${smallestFactor(c)} · ${c / smallestFactor(c)}`).join(', ')}.`,
      };
    },
  },
  {
    ref: 'math-6:18-19',
    id: 'square-root',
    make(rng) {
      const n = int(rng, 2, 20);
      if (rng() < 0.5) {
        return {
          prompt: `${n}² хэдтэй тэнцүү вэ?`,
          options: four(n * n, [2 * n, (n + 1) ** 2, n * n + n], () => n * n + nonzero(rng, -9, 9)),
          explanation: `Тооны квадрат нь тоог өөрөөр нь үржүүлсэн үржвэр: ${n}² = ${n} · ${n} = ${n * n}.`,
        };
      }
      return {
        prompt: `√${n * n} хэдтэй тэнцүү вэ?`,
        options: four(n, [n * n, n + 1, n - 1, 2 * n], () => n + nonzero(rng, -4, 4)),
        explanation: `${n} · ${n} = ${n * n} тул √${n * n} = ${n}.`,
      };
    },
  },
];
