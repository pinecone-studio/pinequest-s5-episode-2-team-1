// Математик 6-ын тооцооллын хичээлүүдийн загвар (ref = api/seed/lesson-questions.json-ийн bookRef).
// Буруу сонголтууд нь хүүхдийн түгээмэл алдаа (тэмдэг андуурах, ХИЕХ/ХБЕХ солих г.м.). Тооны араас нөхцөл залгахаас
// зайлсхийнэ: "5-аас", "6-гаас" гэх мэт нь тооны дуудлагаас хамаардаг.
// Түвшин (зангилааны шат): 1 Суурь = жижиг тоо, нэг алхам; 2 Дунд = сурах бичгийн дасгал; 3 Ахисан = том тоо эсвэл
// гурван гишүүн.
import type { Level, Rng, Template } from './index';

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
/** Модуль нь [lo, hi]-д байх санамсаргүй тэмдэгтэй тоо. */
const signed = (rng: Rng, lo: number, hi: number) => (rng() < 0.5 ? -1 : 1) * int(rng, lo, hi);
/** Түвшнээр сонгох: [Суурь, Дунд, Ахисан]. */
const atLevel = <T>(level: Level, xs: readonly [T, T, T]): T => xs[level - 1];

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
/** Анхны тоо сонгох бодлогын түвшин бүрийн анхны ба нийлмэл тоо. */
const PRIMES = [range(11, 29), range(23, 97), range(101, 199)].map((xs) => xs.filter(isPrime));
const COMPOSITES = [
  [9, 15, 21, 25, 27, 33, 35],
  [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93],
  [111, 117, 119, 121, 123, 129, 133, 141, 143, 153, 159, 161, 169, 171, 177, 183, 187, 189],
];

export const MATH6: readonly Template[] = [
  {
    ref: 'math-6:5-6',
    id: 'compare-integers',
    topic: 'negative_numbers',
    make(rng, level) {
      const nums = new Set<number>();
      if (level === 1) {
        // нэг сөрөг тоо, бусад нь эерэг
        nums.add(-int(rng, 1, 9));
        while (nums.size < 4) nums.add(int(rng, 0, 15));
      } else if (level === 2) {
        // хамгийн их абсолют утгатай сөрөг тоо: "их" гэж андуурдаг
        nums.add(-int(rng, 20, 40));
        nums.add(-int(rng, 1, 19));
        while (nums.size < 4) nums.add(int(rng, -15, 30));
      } else {
        // бүгд ойролцоо сөрөг тоо
        const base = -int(rng, 20, 60);
        while (nums.size < 4) nums.add(base + int(rng, -9, 9));
      }
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
    make(rng, level) {
      if (level === 3) {
        // гурван гишүүн: зүүнээс баруун тийш
        const [a, b, c] = [nonzero(rng, -50, 50), nonzero(rng, -50, 50), nonzero(rng, -50, 50)];
        const [p1, p2] = [rng() < 0.5, rng() < 0.5];
        const ab = p1 ? a + b : a - b;
        const r = p2 ? ab + c : ab - c;
        const op = (plus: boolean) => (plus ? '+' : '−');
        return {
          prompt: `${par(a)} ${op(p1)} ${par(b)} ${op(p2)} ${par(c)} хэдтэй тэнцүү вэ?`,
          options: four(r, [p2 ? ab - c : ab + c, -r, (p1 ? a - b : a + b) + (p2 ? c : -c)], () => r + nonzero(rng, -10, 10)),
          explanation: `Зүүнээс баруун тийш: ${par(a)} ${op(p1)} ${par(b)} = ${fmt(ab)}, ${par(ab)} ${op(p2)} ${par(c)} = ${fmt(r)}.`,
        };
      }
      const max = atLevel(level, [10, 30, 30]);
      const a = nonzero(rng, -max, max);
      const b = a > 0 ? -int(rng, 1, max) : nonzero(rng, -max, max);
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
    make(rng, level) {
      if (level === 3) {
        // гурван үржигдэхүүн: сөрөг тооны тоо тэмдгийг шийднэ
        const [x, y, z] = [signed(rng, 2, 9), signed(rng, 2, 9), signed(rng, 2, 9)];
        const r = x * y * z;
        return {
          prompt: `${par(x)} · ${par(y)} · ${par(z)} хэдтэй тэнцүү вэ?`,
          options: four(r, [-r, x + y + z, x * y + z], () => r + nonzero(rng, -12, 12)),
          explanation: `Сөрөг үржигдэхүүн тэгш тоотой бол үржвэр эерэг, сондгой бол сөрөг: ${par(x)} · ${par(y)} = ${fmt(x * y)}, ${par(x * y)} · ${par(z)} = ${fmt(r)}.`,
        };
      }
      const max = atLevel(level, [5, 12, 12]);
      const x = nonzero(rng, -max, max);
      const y = x > 0 ? -int(rng, 2, max) : nonzero(rng, -max, max);
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
    make(rng, level) {
      const d = pick(rng, [4, 6, 8] as const);
      // хоёр, гурав, дөрвөн оронтой тоо
      const [lo, hi] = atLevel(level, [[12, 99], [100, 999], [1000, 9999]]);
      // дөрөвт, зургаад, наймд
      const by = `${d}-${d === 4 ? 'т' : 'д'}`;
      const answer = d * int(rng, Math.ceil(lo / d), Math.floor(hi / d));
      // Хуурамч сонголт: 4, 8-д тэгш боловч хуваагдахгүй; 6-д 2-т эсвэл 3-т л хуваагдах.
      const trap = (n: number) => n % d !== 0 && (d === 6 ? n % 2 === 0 || n % 3 === 0 : n % 2 === 0);
      const wrong: number[] = [];
      for (let i = 0; wrong.length < 3 && i < 500; i++) {
        const n = int(rng, lo, hi);
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
    make(rng, level) {
      const [gLo, gHi, mHi, top] = atLevel(level, [[2, 6, 5, 30], [2, 15, 11, 150], [6, 30, 13, 400]]);
      let g = 0;
      let m = 0;
      let n = 0;
      do {
        g = int(rng, gLo, gHi);
        m = int(rng, 2, mHi);
        n = int(rng, 2, mHi);
      } while (m === n || gcd(m, n) !== 1 || g * Math.max(m, n) > top);
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
    make(rng, level) {
      const [lo, hi, top] = atLevel(level, [[2, 10, 60], [2, 20, 200], [6, 40, 600]]);
      let a = 0;
      let b = 0;
      do {
        a = int(rng, lo, hi);
        b = int(rng, lo, hi);
      } while (a === b || a % b === 0 || b % a === 0 || lcm(a, b) > top);
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
    make(rng, level) {
      const p = pick(rng, PRIMES[level - 1]);
      // анхны тоо шиг харагддаг сондгой нийлмэл тоо
      const pool = [...COMPOSITES[level - 1]].sort(() => rng() - 0.5).slice(0, 3);
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
    make(rng, level) {
      const [lo, hi] = atLevel(level, [[2, 10], [11, 20], [21, 30]]);
      const n = int(rng, lo, hi);
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
