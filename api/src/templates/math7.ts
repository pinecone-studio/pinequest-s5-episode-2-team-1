// Математик 7-ын тооцооллын эхний хичээлүүдийн загвар. Бүгд зөвхөн math-7 номын хуудаст холбогдоно.
// Түвшин: 1 Суурь = жижиг тоо, нэг алхам; 2 Дунд = сурах бичгийн дасгал; 3 Ахисан = том тоо эсвэл олон алхам.
import type { Level, Rng, Template } from './index';

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const atLevel = <T>(level: Level, xs: readonly [T, T, T]): T => xs[level - 1];
const fmt = (n: number) => (n < 0 ? `−${-n}` : String(n));
const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n));
const signed = (rng: Rng, lo: number, hi: number) => (rng() < 0.5 ? -1 : 1) * int(rng, lo, hi);
const nonzero = (rng: Rng, lo: number, hi: number) => {
  let n = 0;
  while (n === 0) n = int(rng, lo, hi);
  return n;
};
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** Зөв хариу эхэнд, дараа нь ялгаатай буруу сонголтууд (нийт 4). */
function four(correct: number, wrong: number[], filler: () => number): string[] {
  const out = [correct];
  for (const n of wrong) if (Number.isFinite(n) && !out.includes(n) && out.length < 4) out.push(n);
  for (let i = 0; out.length < 4 && i < 100; i++) {
    const n = filler();
    if (Number.isFinite(n) && !out.includes(n)) out.push(n);
  }
  return out.map(fmt);
}

const factorText = (factors: number[]) => factors.join(' · ');
const product = (xs: number[]) => xs.reduce((n, x) => n * x, 1);

export const MATH7: readonly Template[] = [
  {
    ref: 'math-7:5-6',
    id: 'math7-absolute-value',
    topic: 'negative_numbers',
    make(rng, level) {
      const [lo, hi] = atLevel(level, [[1, 12], [10, 50], [20, 100]]);
      const a = signed(rng, lo, hi);
      if (level < 3) {
        const answer = Math.abs(a);
        return {
          prompt: `Тооны модулийг олоорой: |${fmt(a)}| = ?`,
          options: four(answer, [-answer, answer + 1, Math.max(0, answer - 1)], () => answer + nonzero(rng, -5, 5)),
          explanation: `Тооны модуль нь тооллын эхээс зайг илэрхийлдэг тул |${fmt(a)}| = ${answer}.`,
        };
      }
      const b = signed(rng, 10, 60);
      const plus = rng() < 0.5;
      const answer = plus ? Math.abs(a) + Math.abs(b) : Math.abs(a) - Math.abs(b);
      return {
        prompt: `Модультай илэрхийллийг бодоорой: |${fmt(a)}| ${plus ? '+' : '−'} |${fmt(b)}| = ?`,
        options: four(answer, [plus ? Math.abs(a) - Math.abs(b) : Math.abs(a) + Math.abs(b), -answer, a + b], () => answer + nonzero(rng, -10, 10)),
        explanation: `|${fmt(a)}| = ${Math.abs(a)}, |${fmt(b)}| = ${Math.abs(b)} тул хариу ${fmt(answer)}.`,
      };
    },
  },
  {
    ref: 'math-7:7-8',
    id: 'math7-add-sub-integers',
    topic: 'negative_numbers',
    make(rng, level) {
      const max = atLevel(level, [12, 40, 80]);
      const a = nonzero(rng, -max, max);
      const b = nonzero(rng, -max, max);
      const plus = rng() < 0.5;
      let expression = `${par(a)} ${plus ? '+' : '−'} ${par(b)}`;
      let answer = plus ? a + b : a - b;
      let explanation = `Бодолт: ${expression} = ${fmt(answer)}.`;
      if (level === 3) {
        const c = nonzero(rng, -max, max);
        const plus2 = rng() < 0.5;
        expression += ` ${plus2 ? '+' : '−'} ${par(c)}`;
        const first = answer;
        answer = plus2 ? answer + c : answer - c;
        explanation = `Эхлээд ${par(a)} ${plus ? '+' : '−'} ${par(b)} = ${fmt(first)}, дараа нь ${par(first)} ${plus2 ? '+' : '−'} ${par(c)} = ${fmt(answer)}.`;
      }
      return {
        prompt: `Бүхэл тоон илэрхийллийн утгыг олоорой: ${expression} = ?`,
        options: four(answer, [-answer, a + b, a - b], () => answer + nonzero(rng, -12, 12)),
        explanation,
      };
    },
  },
  {
    ref: 'math-7:9-10',
    id: 'math7-mul-div-integers',
    topic: 'negative_numbers',
    make(rng, level) {
      const max = atLevel(level, [6, 12, 15]);
      const a = signed(rng, 2, max);
      const b = signed(rng, 2, max);
      if (level === 3) {
        const c = signed(rng, 2, 9);
        const answer = a * b * c;
        return {
          prompt: `Бүхэл тоонуудын үржвэрийг олоорой: ${par(a)} · ${par(b)} · ${par(c)} = ?`,
          options: four(answer, [-answer, a * b + c, a + b + c], () => answer + nonzero(rng, -15, 15)),
          explanation: `Сөрөг үржигдэхүүний тоо сондгой бол хариу сөрөг, тэгш бол эерэг. Үржвэр ${fmt(answer)}.`,
        };
      }
      const multiply = rng() < 0.5;
      const answer = multiply ? a * b : a;
      return {
        prompt: multiply
          ? `Бүхэл тоонуудыг үржүүлээрэй: ${par(a)} · ${par(b)} = ?`
          : `Бүхэл тоонуудыг хуваагаарай: ${par(a * b)} : ${par(b)} = ?`,
        options: four(answer, [-answer, a + b, b], () => answer + nonzero(rng, -8, 8)),
        explanation: `Ижил тэмдэгтэй тоонуудын үржвэр, ногдвор эерэг; эсрэг тэмдэгтэй бол сөрөг. Хариу ${fmt(answer)}.`,
      };
    },
  },
  {
    ref: 'math-7:11-12',
    id: 'math7-cube-root',
    topic: 'natural_integers',
    make(rng, level) {
      const [lo, hi] = atLevel(level, [[2, 8], [4, 15], [10, 25]]);
      const n = int(rng, lo, hi);
      if (rng() < 0.5) {
        return {
          prompt: `Тооны куб зэргийг олоорой: ${n}³ = ?`,
          options: four(n ** 3, [n * 3, n ** 2, (n + 1) ** 3], () => n ** 3 + nonzero(rng, -20, 20)),
          explanation: `Куб зэрэг: ${n}³ = ${n} · ${n} · ${n} = ${n ** 3}.`,
        };
      }
      return {
        prompt: `Куб язгуурыг олоорой: ∛${n ** 3} = ?`,
        options: four(n, [n ** 2, n ** 3, n + 1], () => n + nonzero(rng, -5, 5)),
        explanation: `Куб язгуур: ${n} · ${n} · ${n} = ${n ** 3} тул ∛${n ** 3} = ${n}.`,
      };
    },
  },
  {
    ref: 'math-7:13',
    id: 'math7-prime-factorization',
    topic: 'divisibility',
    make(rng, level) {
      const primes = atLevel(level, [[2, 3, 5, 7], [2, 3, 5, 7, 11], [2, 3, 5, 7, 11, 13]]);
      const count = atLevel(level, [int(rng, 2, 3), int(rng, 3, 4), int(rng, 4, 5)]);
      const factors = Array.from({ length: count }, () => pick(rng, primes)).sort((a, b) => a - b);
      const nextPrime = (p: number) => primes[(primes.indexOf(p) + 1) % primes.length];
      const changed = [...factors];
      changed[0] = nextPrime(changed[0]);
      changed.sort((a, b) => a - b);
      const options = [factorText(factors), factorText(changed), factorText(factors.slice(0, -1)), factorText([...factors, factors[0]].sort((a, b) => a - b))];
      return {
        prompt: `${product(factors)} тоог анхны тоон үржигдэхүүнд зөв задалсан хариуг сонгоорой.`,
        options,
        explanation: `${factorText(factors)} = ${product(factors)} бөгөөд үржигдэхүүн бүр анхны тоо.`,
      };
    },
  },
  {
    ref: 'math-7:14-16',
    id: 'math7-gcd-lcm',
    topic: 'divisibility',
    make(rng, level) {
      const [gMax, factorMax] = atLevel(level, [[6, 7], [15, 12], [30, 18]]);
      let g = 0;
      let m = 0;
      let n = 0;
      do {
        g = int(rng, 2, gMax);
        m = int(rng, 2, factorMax);
        n = int(rng, 2, factorMax);
      } while (m === n || gcd(m, n) !== 1);
      const [a, b] = [g * m, g * n];
      const askGcd = rng() < 0.5;
      const answer = askGcd ? gcd(a, b) : lcm(a, b);
      return {
        prompt: `${a} ба ${b} тооны ${askGcd ? 'ХИЕХ' : 'ХБЕХ'}-ийг олоорой.`,
        options: four(answer, [askGcd ? lcm(a, b) : gcd(a, b), a * b, Math.min(a, b)], () => answer + nonzero(rng, -8, 12)),
        explanation: askGcd
          ? `${a} = ${g} · ${m}, ${b} = ${g} · ${n} бөгөөд ${m}, ${n} харилцан анхны тул ХИЕХ = ${g}.`
          : `ХБЕХ = ${a} · ${b} : ХИЕХ(${a}, ${b}) = ${a * b} : ${g} = ${lcm(a, b)}.`,
      };
    },
  },
  {
    ref: 'math-7:17',
    id: 'math7-powers-of-ten',
    topic: 'natural_integers',
    make(rng, level) {
      const [lo, hi] = atLevel(level, [[1, 2], [2, 4], [4, 6]]);
      const exponent = int(rng, lo, hi);
      const coefficient = int(rng, 1, 9);
      const power = 10 ** exponent;
      const answer = coefficient * power;
      return {
        prompt: `10-ын зэргийг ашиглан бодоорой: ${coefficient} · 10^${exponent} = ?`,
        options: four(answer, [coefficient * 10 ** Math.max(0, exponent - 1), coefficient + power, coefficient * 10 ** (exponent + 1)], () => answer + nonzero(rng, -9, 9) * 10 ** Math.max(0, exponent - 1)),
        explanation: `10^${exponent} = ${power} тул ${coefficient} · ${power} = ${answer}.`,
      };
    },
  },
  {
    ref: 'math-7:18',
    id: 'math7-compare-decimals',
    topic: 'fractions_decimals',
    make(rng, level) {
      const places = atLevel(level, [1, 2, 3]);
      const scale = 10 ** places;
      const values = new Set<number>();
      while (values.size < 4) values.add(int(rng, scale, 99 * scale));
      const list = [...values].sort(() => rng() - 0.5);
      const askMax = rng() < 0.5;
      const answer = askMax ? Math.max(...list) : Math.min(...list);
      const decimal = (n: number) => (n / scale).toFixed(places).replace('.', ',');
      return {
        prompt: `${list.map(decimal).join('; ')} тоонуудаас хамгийн ${askMax ? 'их' : 'бага'} аравтын бутархайг сонгоорой.`,
        options: [answer, ...list.filter((n) => n !== answer)].map(decimal),
        explanation: `Бүх тоог таслалаас хойш ${places} оронтойгоор жишихэд хамгийн ${askMax ? 'их' : 'бага'} нь ${decimal(answer)}.`,
      };
    },
  },
];
