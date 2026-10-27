// Математик 6, 7-ын үлдсэн хичээлүүд: нийтлэг бодлого үүсгэгч + номын хуудасны тусдаа mapping.
import type { QuestionDraft } from '../llm/types';
import type { Level, Rng, Template } from './index';

type Draft = Omit<QuestionDraft, 'correctIndex' | 'topic'>;
export type Kind =
  | 'statement'
  | 'set'
  | 'decimal-compare'
  | 'round'
  | 'decimal-add'
  | 'decimal-scale'
  | 'decimal-mul'
  | 'mental'
  | 'fraction-compare'
  | 'fraction-add'
  | 'fraction-mul'
  | 'fraction-div'
  | 'convert'
  | 'percent'
  | 'percent-change'
  | 'ratio'
  | 'proportion'
  | 'direct'
  | 'speed'
  | 'work'
  | 'counting'
  | 'probability'
  | 'opposite-probability'
  | 'expression'
  | 'simplify'
  | 'factor'
  | 'equation'
  | 'power-law'
  | 'monomial'
  | 'sequence'
  | 'function'
  | 'coordinate'
  | 'line'
  | 'segments'
  | 'parallel-perp'
  | 'angle-type'
  | 'vertical-adjacent'
  | 'alternate'
  | 'construct'
  | 'triangle'
  | 'polygon'
  | 'diagonals'
  | 'triangle-inequality'
  | 'quadrilateral'
  | 'exterior-angle'
  | 'circle'
  | 'solid'
  | 'triangle-congruence'
  | 'translate'
  | 'reflect'
  | 'central'
  | 'rotate'
  | 'midpoint'
  | 'symmetry-order'
  | 'time'
  | 'analog-digital'
  | 'unit'
  | 'traditional-unit'
  | 'area-unit'
  | 'volume-unit'
  | 'rectangle'
  | 'relation'
  | 'box-surface'
  | 'box-volume'
  | 'triangle-area'
  | 'trapezoid-area'
  | 'prism-surface'
  | 'pyramid-surface'
  | 'composite-solid'
  | 'data-type'
  | 'data-source'
  | 'table'
  | 'grouped-data'
  | 'mode'
  | 'chart'
  | 'mean'
  | 'conclusion'
  | 'relative-frequency';

export interface Spec {
  page: number;
  title: string;
  kind: Kind;
  topic?: string;
}

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const atLevel = <T>(level: Level, xs: readonly [T, T, T]): T => xs[level - 1];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** Сурах бичгийн хасах тэмдэг (U+2212). */
const n = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** Аравтын бутархай сурах бичиг шиг цэгтэй: 16.81 (seed-ийн бодлоготой ижил). */
const dec = (v: number, places: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(places)}`;
/** Хураасан энгийн бутархай; хуваарь 1 бол бүхэл тоо. */
const fraction = (a: number, b: number) => {
  const d = gcd(a, b);
  return b / d === 1 ? n(a / d) : `${n(a / d)}/${b / d}`;
};
const coord = (x: number, y: number) => `(${n(x)}; ${n(y)})`;
/** ax ± b; a = 1 бол x, b = 0 бол зөвхөн ax. */
const linear = (a: number, b: number) => `${a === 1 ? '' : n(a)}x${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}`}`;
/** Өгүүлбэрийн эхний үсгийг томоор. */
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function four(correct: string, wrong: string[], filler: () => string): string[] {
  const out = [correct];
  for (const value of wrong) if (value && !out.includes(value) && out.length < 4) out.push(value);
  for (let i = 0; out.length < 4 && i < 200; i++) {
    const value = filler();
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

/** Тоон хариу: эерэг хариуд сөрөг, тэг буруу сонголт оруулахгүй. */
const numeric = (correct: number, wrong: number[], rng: Rng, step = 1) => {
  const ok = (v: number) => Number.isFinite(v) && Number.isInteger(v) && v !== correct && (correct <= 0 || v > 0);
  return four(n(correct), wrong.filter(ok).map(n), () => {
    const v = correct + int(rng, -9, 9) * step;
    return ok(v) ? n(v) : '';
  });
};

/** n-д хуваагдах: 2, 3, 4-т; 5, 6-д. */
const divisibleBy = (d: number) => `${d}-${d <= 4 ? 'т' : 'д'}`;

function make(kind: Kind, rng: Rng, level: Level): Draft {
  const max = atLevel(level, [12, 40, 100]);
  switch (kind) {
    case 'statement': {
      // Хэллэг: дөрвөн тоон хэллэгээс нэг нь үнэн.
      const a = int(rng, 2, max);
      // "5 ба 5 тооны" гэх мэт ижил хоёр тоо гаргахгүй
      const drawn = int(rng, 2, 9);
      const b = drawn === a ? (drawn === 9 ? 2 : drawn + 1) : drawn;
      const product = a * b;
      const right = `${a} · ${b} = ${product}`;
      const wrongs = [`${a} · ${b} = ${product + b}`, `${product} : ${b} = ${a + 1}`, `${a + b} < ${a}`];
      return {
        prompt: `${a} ба ${b} тооны тухай дараах хэллэгүүдээс аль нь үнэн бэ?`,
        options: [right, ...wrongs],
        explanation: `${a} · ${b} = ${product} тул энэ хэллэг үнэн, бусад нь худал.`,
      };
    }
    case 'set': {
      const divisor = int(rng, 2, 6);
      const answer = divisor * int(rng, 2, max);
      // буруу сонголт бүр divisor-т хуваагдахгүй
      const notMultiple = (v: number) => v > 0 && v % divisor !== 0;
      return {
        prompt: `A олонлог нь ${divisibleBy(divisor)} хуваагдах натурал тоонуудаас тогтоно. Аль тоо A олонлогт харьяалагдах вэ?`,
        options: four(String(answer), [answer + 1, answer - 1, answer + divisor + 1].filter(notMultiple).map(String), () => {
          const v = answer + int(rng, -9, 9);
          return notMultiple(v) ? String(v) : '';
        }),
        explanation: `${answer} = ${divisor} · ${answer / divisor} тул ${answer} тоо A олонлогт харьяалагдана.`,
      };
    }
    case 'decimal-compare': {
      const places = atLevel(level, [1, 2, 3]);
      const scale = 10 ** places;
      const values = new Set<number>();
      while (values.size < 4) values.add(int(rng, scale, max * scale));
      const list = [...values].sort(() => rng() - 0.5);
      const askMax = rng() < 0.5;
      const answer = askMax ? Math.max(...list) : Math.min(...list);
      const fmt = (v: number) => dec(v / scale, places);
      return {
        prompt: `${list.map(fmt).join('; ')} тоонуудаас хамгийн ${askMax ? 'их' : 'бага'} тоог сонгоорой.`,
        options: [answer, ...list.filter((v) => v !== answer)].map(fmt),
        explanation: `Орон тус бүрээр жишихэд хамгийн ${askMax ? 'их' : 'бага'} тоо нь ${fmt(answer)}.`,
      };
    }
    case 'round': {
      const place = atLevel(level, [10, 100, 1000]);
      const value = int(rng, place, place * max) + int(rng, 1, place - 1);
      const answer = Math.round(value / place) * place;
      return {
        prompt: `${value} тоог ${place === 10 ? 'аравт' : place === 100 ? 'зуут' : 'мянгат'} хүртэл тоймлоорой.`,
        options: numeric(answer, [Math.floor(value / place) * place, Math.ceil(value / place) * place, answer + place], rng, place),
        explanation: `Тоймлох орны дараагийн цифрийг харвал ${value} тоо ${answer} болж тоймлогдоно.`,
      };
    }
    case 'decimal-add': {
      const places = level === 1 ? 1 : 2;
      const scale = 10 ** places;
      const a = int(rng, scale, max * scale);
      const b = int(rng, scale, max * scale);
      const add = rng() < 0.5;
      const [large, small] = a >= b ? [a, b] : [b, a];
      const answer = add ? a + b : large - small;
      const fmt = (v: number) => dec(v / scale, places);
      return {
        prompt: `${fmt(add ? a : large)} ${add ? '+' : '−'} ${fmt(add ? b : small)} үйлдлийг гүйцэтгээрэй.`,
        options: four(fmt(answer), [fmt(a + b), fmt(Math.abs(a - b)), fmt(answer + scale)], () => fmt(Math.max(1, answer + int(rng, -5, 5)))),
        explanation: `Таслалуудыг зэрэгцүүлэн бодоход хариу ${fmt(answer)}.`,
      };
    }
    case 'decimal-scale': {
      const scale = level === 1 ? 10 : 100;
      const places = scale === 10 ? 1 : 2;
      const a = int(rng, scale + 1, max * scale);
      const b = int(rng, 2, 9);
      const answer = a * b;
      const fmt = (v: number) => dec(v / scale, places);
      return {
        prompt: `${fmt(a)} · ${b} үржвэрийг олоорой.`,
        options: four(fmt(answer), [fmt(a * (b + 1)), fmt(a * b * 10), fmt(a + b * scale)], () => fmt(Math.max(1, answer + int(rng, -5, 5)))),
        explanation: `Бүхэл тоогоор үржүүлээд таслалаас хойш ${places} орон тавихад ${fmt(answer)} гарна.`,
      };
    }
    case 'decimal-mul': {
      const a = int(rng, 11, max * 10);
      const b = int(rng, 11, max * 10);
      const answer = a * b;
      return {
        prompt: `${dec(a / 10, 1)} · ${dec(b / 10, 1)} үржвэрийг олоорой.`,
        options: four(dec(answer / 100, 2), [dec(answer / 10, 2), dec((a + b) / 10, 2), dec((answer + 10) / 100, 2)], () =>
          dec(Math.max(1, answer + int(rng, -20, 20)) / 100, 2),
        ),
        explanation: `Бүхэл тоонуудыг үржүүлээд таслалаас хойш нийт хоёр орон тавихад ${dec(answer / 100, 2)}.`,
      };
    }
    case 'mental': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, 2, max);
      const answer = a * (b + c);
      return {
        prompt: `${a} · ${b} + ${a} · ${c} илэрхийллийг хялбар аргаар бодоорой.`,
        options: numeric(answer, [a * b + c, a + b * c, (a + b) * c], rng),
        explanation: `Ерөнхий үржигдэхүүнийг хаалтаас гаргавал ${a} · (${b} + ${c}) = ${a} · ${b + c} = ${answer}.`,
      };
    }
    case 'fraction-compare': {
      const denominator = int(rng, 5, max + 5);
      const numerators = new Set<number>();
      while (numerators.size < 4) numerators.add(int(rng, 1, denominator - 1));
      const list = [...numerators].sort(() => rng() - 0.5);
      const askMax = rng() < 0.5;
      const answer = askMax ? Math.max(...list) : Math.min(...list);
      return {
        prompt: `${list.map((v) => `${v}/${denominator}`).join('; ')} бутархайнуудаас хамгийн ${askMax ? 'их' : 'бага'} бутархайг сонгоорой.`,
        options: [answer, ...list.filter((v) => v !== answer)].map((v) => `${v}/${denominator}`),
        explanation: `Ижил хуваарьтай бутархайн хүртвэр ${askMax ? 'их' : 'бага'} байх тусам бутархай ${askMax ? 'их' : 'бага'} байна.`,
      };
    }
    case 'fraction-add': {
      const denominator = int(rng, 4, max + 4);
      const a = int(rng, 1, denominator - 1);
      const b = int(rng, 1, denominator - 1);
      const add = rng() < 0.5 || a <= b;
      const numerator = add ? a + b : a - b;
      const answer = fraction(numerator, denominator);
      return {
        prompt: `${a}/${denominator} ${add ? '+' : '−'} ${b}/${denominator} хэдтэй тэнцүү вэ?`,
        options: four(answer, [fraction(numerator, denominator * 2), fraction(add ? Math.abs(a - b) || 1 : a + b, denominator), fraction(numerator + 1, denominator)], () =>
          fraction(int(rng, 1, denominator * 2), denominator),
        ),
        explanation: `Хуваарь ижил тул хүртвэрийг ${add ? 'нэмнэ' : 'хасна'}: ${numerator}/${denominator} = ${answer}.`,
      };
    }
    case 'fraction-mul':
    case 'fraction-div': {
      // хураагаагүй, бүхэл биш бутархай (37/37 гэх мэт гарахгүй)
      const part = () => {
        let a = 0;
        let b = 0;
        do {
          a = int(rng, 1, max);
          b = int(rng, 2, max + 2);
        } while (a % b === 0 || gcd(a, b) !== 1);
        return [a, b] as const;
      };
      const [a, b] = part();
      const [c, d] = part();
      const divide = kind === 'fraction-div';
      const numerator = divide ? a * d : a * c;
      const denominator = divide ? b * c : b * d;
      const answer = fraction(numerator, denominator);
      return {
        prompt: `${a}/${b} ${divide ? ':' : '·'} ${c}/${d} хэдтэй тэнцүү вэ?`,
        options: four(answer, [fraction(divide ? a * c : a * d, divide ? b * d : b * c), fraction(a + c, b + d), fraction(divide ? b * c : b * d, divide ? a * d : a * c)], () =>
          fraction(int(rng, 1, max * 2), int(rng, 2, max * 2 + 1)),
        ),
        explanation: divide
          ? `Хоёр дахь бутархайг урвуулж үржүүлэхэд ${numerator}/${denominator} = ${answer}.`
          : `Хүртвэрүүд болон хуваариудыг тус тус үржүүлбэл ${numerator}/${denominator} = ${answer}.`,
      };
    }
    case 'convert': {
      const percent = pick(rng, [10, 20, 25, 40, 50, 60, 75, 80, 90]);
      const d = gcd(percent, 100);
      return {
        prompt: `${percent / d}/${100 / d} энгийн бутархайг процентоор илэрхийлээрэй.`,
        options: four(`${percent}%`, [`${100 - percent}%`, `${percent / 5}%`, `${percent + 10}%`], () => `${int(rng, 1, 99)}%`),
        explanation: `${percent / d}/${100 / d} = ${percent}/100 тул ${percent}%.`,
      };
    }
    case 'percent':
    case 'percent-change': {
      const percent = pick(rng, [10, 20, 25, 40, 50, 75]);
      const base = int(rng, 2, max) * 20;
      const part = (base * percent) / 100;
      const increase = kind === 'percent-change' && rng() < 0.5;
      const decrease = kind === 'percent-change' && !increase;
      const answer = increase ? base + part : decrease ? base - part : part;
      return {
        prompt:
          kind === 'percent'
            ? `${base} тооны ${percent}% хэд вэ?`
            : `${base} хэмжээг ${percent} хувиар ${increase ? 'өсгөв' : 'бууруулав'}. Шинэ хэмжээ хэд вэ?`,
        options: numeric(answer, [part, base + part, base - part, base], rng),
        explanation: `${base} тооны ${percent}% нь ${part}${kind === 'percent-change' ? ` тул шинэ хэмжээ ${answer}` : ''}.`,
      };
    }
    case 'ratio': {
      const a = int(rng, 1, 8);
      const b = int(rng, 1, 8);
      const unit = int(rng, 2, max);
      const total = (a + b) * unit;
      const answer = a * unit;
      return {
        prompt: `${total} ширхэг зүйлийг ${a}:${b} харьцаагаар хуваав. Эхний хэсэг хэд вэ?`,
        options: numeric(answer, [b * unit, unit, total - unit], rng),
        explanation: `Нийт ${a + b} хэсэг тул нэг хэсэг ${unit}, эхний хэсэг ${a} · ${unit} = ${answer}.`,
      };
    }
    case 'proportion': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const k = int(rng, 2, 9);
      const answer = b * k;
      return {
        prompt: `${a}/${b} = ${a * k}/x пропорцын x-ийг олоорой.`,
        options: numeric(answer, [a * k, b + k, a + b], rng),
        explanation: `Хүртвэр ${k} дахин өссөн тул хуваарь ч ${k} дахин өснө: x = ${b} · ${k} = ${answer}.`,
      };
    }
    case 'direct':
    case 'relation': {
      const k = int(rng, 2, max);
      const x = int(rng, 2, max);
      const answer = k * x;
      return {
        prompt: `y нь x-ээс шууд хамаарах ба y = ${k}x. x = ${x} үед y хэд вэ?`,
        options: numeric(answer, [k + x, answer + k, x], rng),
        explanation: `x-ийн оронд ${x} тавьбал y = ${k} · ${x} = ${answer}.`,
      };
    }
    case 'speed': {
      const speed = int(rng, 3, max) * 5;
      const time = int(rng, 2, 8);
      const answer = speed * time;
      return {
        prompt: `Тээврийн хэрэгсэл цагт ${speed} км хурдтай ${time} цаг явав. Хэдэн км зам туулсан бэ?`,
        options: numeric(answer, [speed + time, answer - speed, answer + speed], rng),
        explanation: `Зам = хурд · хугацаа = ${speed} · ${time} = ${answer} км.`,
      };
    }
    case 'work': {
      const rate = int(rng, 2, max);
      const time = int(rng, 2, 8);
      const answer = rate * time;
      return {
        prompt: `Нэг машин цагт ${rate} эд анги хийдэг бол ${time} цагт хэдийг хийх вэ?`,
        options: numeric(answer, [rate + time, answer + rate, rate], rng),
        explanation: `Ажлын хэмжээ = бүтээмж · хугацаа = ${rate} · ${time} = ${answer}.`,
      };
    }
    case 'counting': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const answer = a * b;
      return {
        prompt: `${a} цамц, ${b} өмднөөс нэг нэгийг сонгоход хэдэн хослол гарах вэ?`,
        options: numeric(answer, [a + b, answer - 1, a * b * 2], rng),
        explanation: `Үржвэрийн зарчмаар ${a} · ${b} = ${answer} хослол.`,
      };
    }
    case 'probability':
    case 'opposite-probability': {
      const total = int(rng, 6, max + 6);
      const favorable = int(rng, 1, total - 1);
      const opposite = kind === 'opposite-probability';
      const wanted = opposite ? total - favorable : favorable;
      const answer = fraction(wanted, total);
      return {
        prompt: `${total} тэнцүү боломжит үр дүнгийн ${favorable} нь A үзэгдэлд тохирно. ${opposite ? 'A үзэгдлийн эсрэг' : 'A'} үзэгдлийн магадлалыг олоорой.`,
        options: four(answer, [fraction(opposite ? favorable : total - favorable, total), fraction(wanted, total + 1), fraction(1, total)], () =>
          fraction(int(rng, 1, total - 1), total),
        ),
        explanation: `Тохирох ${wanted} үр дүнг нийт ${total}-д хуваавал ${answer}.`,
      };
    }
    case 'expression':
    case 'function': {
      const a = int(rng, 2, max);
      const b = int(rng, -max, max);
      const x = int(rng, -max, max);
      const answer = a * x + b;
      return {
        prompt:
          kind === 'function'
            ? `y = ${linear(a, b)} функцийн x = ${n(x)} үеийн утгыг олоорой.`
            : `x = ${n(x)} үед ${linear(a, b)} илэрхийллийн утгыг олоорой.`,
        options: numeric(answer, [a + x + b, a * x - b, answer + a], rng),
        explanation: `x-ийн оронд ${n(x)} тавьбал ${kind === 'function' ? 'y = ' : ''}${a} · (${n(x)})${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}`} = ${n(answer)}.`,
      };
    }
    case 'line': {
      // Шулууны тэгшитгэл бичих: өнцгийн коэффициент ба y тэнхлэгийг огтлох цэгээс
      const k = (rng() < 0.5 ? -1 : 1) * int(rng, 2, Math.min(max, 20));
      const b = (rng() < 0.5 ? -1 : 1) * int(rng, 1, Math.min(max, 20));
      const answer = `y = ${linear(k, b)}`;
      return {
        prompt: `Өнцгийн коэффициент нь ${n(k)}, y тэнхлэгийг (0; ${n(b)}) цэгт огтолдог шулууны тэгшитгэлийг сонгоорой.`,
        options: four(answer, [`y = ${linear(b, k)}`, `y = ${linear(k, -b)}`, `y = ${linear(-k, b)}`], () => {
          const slope = (rng() < 0.5 ? -1 : 1) * int(rng, 2, Math.min(max, 20));
          const intercept = (rng() < 0.5 ? -1 : 1) * int(rng, 1, Math.min(max, 20));
          return `y = ${linear(slope, intercept)}`;
        }),
        explanation: `y = kx + b хэлбэрт k = ${n(k)}, b = ${n(b)} гэж орлуулна.`,
      };
    }
    case 'simplify': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, -max, max) || 1;
      const answer = linear(a + b, c);
      return {
        prompt: `${a}x + ${b}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} илэрхийллийг хялбарчлаарай.`,
        options: four(answer, [linear(a * b, c), linear(a + b + c, 0), linear(a, b + c)], () => linear(int(rng, 2, max * 2), int(rng, -max, max) || 1)),
        explanation: `Төсөөтэй гишүүдийг нэгтгэвэл ${a}x + ${b}x = ${a + b}x тул ${answer}.`,
      };
    }
    case 'factor': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const answer = `${a}(x + ${b})`;
      return {
        prompt: `${a}x + ${a * b} илэрхийллээс ерөнхий үржигдэхүүнийг хаалтын өмнө гаргаарай.`,
        options: four(answer, [`${a}(x + ${a * b})`, `${b}(x + ${a})`, `${a}x(x + ${b})`], () => `${int(rng, 2, max)}(x + ${int(rng, 2, max)})`),
        explanation: `Хоёр гишүүний ерөнхий үржигдэхүүн ${a} тул ${a}x + ${a * b} = ${answer}.`,
      };
    }
    case 'equation': {
      const a = int(rng, 2, max);
      const x = int(rng, 1, max);
      const b = int(rng, -max, max) || 1;
      const c = a * x + b;
      return {
        prompt: `${linear(a, b)} = ${n(c)} тэгшитгэлийг бодоорой.`,
        options: numeric(x, [x + 1, x - 1, c - b], rng),
        explanation: `Тогтмол гишүүнийг шилжүүлбэл ${a}x = ${n(c - b)}, иймд x = ${x}.`,
      };
    }
    case 'power-law': {
      const base = int(rng, 2, 9);
      const a = int(rng, 1, max / 2 + 1);
      const b = int(rng, 1, max / 2 + 1);
      const answer = a + b;
      return {
        prompt: `${base}^${a} · ${base}^${b} = ${base}^n бол n хэд вэ?`,
        options: numeric(answer, [a * b, Math.abs(a - b), answer + 1], rng),
        explanation: `Ижил суурьтай зэргүүдийг үржүүлэхэд илтгэгчийг нэмнэ: n = ${a} + ${b} = ${answer}.`,
      };
    }
    case 'monomial': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const m = int(rng, 1, 6);
      const k = int(rng, 1, 6);
      const pow = (e: number) => (e === 1 ? 'x' : `x^${e}`);
      const answer = `${a * b}${pow(m + k)}`;
      return {
        prompt: `${a}${pow(m)} · ${b}${pow(k)} үржвэрийг хялбарчлаарай.`,
        options: four(answer, [`${a + b}${pow(m + k)}`, `${a * b}${pow(m * k)}`, `${a * b}${pow(m + k + 1)}`], () => `${int(rng, 2, max * 2)}${pow(int(rng, 1, 12))}`),
        explanation: `Коэффициентүүдийг үржүүлж, ижил суурийн илтгэгчийг нэмэхэд ${answer}.`,
      };
    }
    case 'sequence': {
      const first = int(rng, 1, max);
      const difference = int(rng, 2, max);
      const k = int(rng, 5, 12);
      const answer = first + (k - 1) * difference;
      return {
        prompt: `${first}, ${first + difference}, ${first + 2 * difference}, … дарааллын ${k}-р гишүүнийг олоорой.`,
        options: numeric(answer, [first + k * difference, k * difference, answer - difference], rng),
        explanation: `aₙ = a₁ + (n − 1)d тул ${first} + (${k} − 1) · ${difference} = ${answer}.`,
      };
    }
    case 'coordinate': {
      const x = (rng() < 0.5 ? -1 : 1) * int(rng, 1, max);
      const y = (rng() < 0.5 ? -1 : 1) * int(rng, 1, max);
      const answer = x > 0 ? (y > 0 ? 'I мөч' : 'IV мөч') : y > 0 ? 'II мөч' : 'III мөч';
      return {
        prompt: `A${coord(x, y)} цэг координатын хавтгайн аль мөчид орших вэ?`,
        options: [answer, ...['I мөч', 'II мөч', 'III мөч', 'IV мөч'].filter((q) => q !== answer)],
        explanation: `x ${x > 0 ? 'эерэг' : 'сөрөг'}, y ${y > 0 ? 'эерэг' : 'сөрөг'} тул цэг ${answer}д оршино.`,
      };
    }
    case 'segments': {
      const k = int(rng, 3, Math.min(12, max));
      const answer = (k * (k - 1)) / 2;
      return {
        prompt: `Нэг шулуун дээр ${k} цэг тэмдэглэв. Эдгээр цэгүүдээр төгсгөлтэй хэдэн хэрчим байх вэ?`,
        options: numeric(answer, [k, k * 2, answer - 1, k * (k - 1)], rng),
        explanation: `Хос цэг бүр нэг хэрчим үүсгэнэ: ${k} · ${k - 1} : 2 = ${answer}.`,
      };
    }
    case 'parallel-perp': {
      const [p, q, r] = [...'abcmnkl'].sort(() => rng() - 0.5);
      const variant = int(rng, 0, 2);
      const [condition, x, y, answer] =
        variant === 0
          ? [`${p} ∥ ${q} ба ${q} ∥ ${r}`, p, r, 'Параллел']
          : variant === 1
            ? [`${p} ⊥ ${r} ба ${q} ⊥ ${r}`, p, q, 'Параллел']
            : [`${p} ∥ ${q} ба ${r} ⊥ ${p}`, r, q, 'Перпендикуляр'];
      return {
        prompt: `Нэг хавтгай дээр ${condition} бол ${x} ба ${y} шулуун хоорондоо ямар байрлалтай вэ?`,
        options: [answer, ...['Параллел', 'Перпендикуляр', 'Перпендикуляр бусаар огтлолцоно', 'Үргэлж давхцана'].filter((o) => o !== answer)].slice(0, 4),
        explanation:
          variant === 2
            ? `${r} шулуун ${p}-д перпендикуляр бөгөөд ${p} ∥ ${q} тул ${q}-д ч перпендикуляр.`
            : `${variant === 0 ? 'Нэг шулуунтай параллел' : 'Нэг шулуунд перпендикуляр'} хоёр шулуун хоорондоо параллел.`,
      };
    }
    case 'angle-type': {
      const angle = pick(rng, [90, 180, int(rng, 1, 17) * 5, int(rng, 19, 35) * 5]);
      const answer = angle < 90 ? 'Хурц өнцөг' : angle === 90 ? 'Тэгш өнцөг' : angle < 180 ? 'Мохоо өнцөг' : 'Дэлгэмэл өнцөг';
      return {
        prompt: `${angle}° хэмжээтэй өнцөг ямар төрлийн өнцөг вэ?`,
        options: [answer, ...['Хурц өнцөг', 'Тэгш өнцөг', 'Мохоо өнцөг', 'Дэлгэмэл өнцөг'].filter((o) => o !== answer)],
        explanation: `90°-аас бага бол хурц, 90° бол тэгш, 90°–180° хооронд бол мохоо, 180° бол дэлгэмэл өнцөг.`,
      };
    }
    case 'vertical-adjacent': {
      const angle = int(rng, 2, 16) * 10;
      const vertical = rng() < 0.5;
      const answer = vertical ? angle : 180 - angle;
      return {
        prompt: `Хоёр шулуун огтлолцоход үүссэн нэг өнцөг ${angle}°. Түүний ${vertical ? 'босоо' : 'хамар'} өнцгийг олоорой.`,
        options: numeric(answer, [vertical ? 180 - angle : angle, 360 - angle, 90], rng, 10),
        explanation: vertical ? `Босоо өнцгүүд тэнцүү тул ${answer}°.` : `Хамар өнцгүүдийн нийлбэр 180° тул 180° − ${angle}° = ${answer}°.`,
      };
    }
    case 'alternate': {
      const angle = int(rng, 4, 32) * 5;
      const type = pick(rng, ['солбисон', 'харгалзах', 'дотоод нэг талын'] as const);
      const answer = type === 'дотоод нэг талын' ? 180 - angle : angle;
      return {
        prompt: `a ∥ b шулуунуудыг c шулуун огтлоход үүссэн нэг өнцөг ${angle}°. Түүнтэй ${type} өнцгийг олоорой.`,
        options: numeric(answer, [type === 'дотоод нэг талын' ? angle : 180 - angle, 360 - angle, 90], rng, 5),
        explanation:
          type === 'дотоод нэг талын'
            ? `Параллел шулуунуудын дотоод нэг талын өнцгүүдийн нийлбэр 180° тул ${answer}°.`
            : `Параллел шулуунуудын ${type} өнцгүүд тэнцүү тул ${answer}°.`,
      };
    }
    case 'construct': {
      const a = int(rng, 3, max);
      let b = int(rng, 3, max);
      if (b === a) b += 1;
      const c = Math.max(Math.abs(a - b) + 1, Math.min(a + b - 1, int(rng, 3, max)));
      const answer = `AB = ${c} см хэрчим зурна. A төвтэй ${b} см, B төвтэй ${a} см радиустай нумуудын огтлолцлыг C гэж тэмдэглэнэ.`;
      return {
        prompt: `AB = ${c} см, AC = ${b} см, BC = ${a} см гурвалжныг шугам, гортигоор байгуулах зөв дарааллыг сонгоорой.`,
        options: [
          answer,
          `AB = ${c} см хэрчим зурна. A төвтэй ${a} см, B төвтэй ${b} см радиустай нумуудын огтлолцлыг C гэж тэмдэглэнэ.`,
          `AB = ${a + b} см хэрчим зурж, дундаж цэгийг C гэж тэмдэглэнэ.`,
          `AB = ${c} см хэрчим зурж, A ба B цэгээс ижил ${c} см радиустай нум татна.`,
        ],
        explanation: `AB талыг ${c} см зурна. AC = ${b} см, BC = ${a} см байх ёстой тул харгалзах радиустай хоёр нумын огтлолцол нь C орой болно.`,
      };
    }
    case 'triangle': {
      const a = int(rng, 3, 8) * 10;
      const b = int(rng, 3, 8) * 10;
      const answer = 180 - a - b;
      if (answer <= 0) return make(kind, rng, level);
      return {
        prompt: `Гурвалжны хоёр өнцөг ${a}° ба ${b}° бол гурав дахь өнцгийг олоорой.`,
        options: numeric(answer, [180 - a, 180 - b, a + b], rng, 10),
        explanation: `Гурвалжны өнцгүүдийн нийлбэр 180° тул 180° − ${a}° − ${b}° = ${answer}°.`,
      };
    }
    case 'polygon': {
      const k = int(rng, 4, atLevel(level, [9, 12, 15]));
      const answer = (k - 2) * 180;
      return {
        prompt: `Гүдгэр ${k} өнцөгтийн дотоод өнцгүүдийн нийлбэр хэд вэ?`,
        options: numeric(answer, [k * 180, (k - 1) * 180, 360], rng, 180),
        explanation: `(n − 2) · 180° томьёогоор (${k} − 2) · 180° = ${answer}°.`,
      };
    }
    case 'diagonals': {
      const k = int(rng, 4, atLevel(level, [8, 12, 16]));
      const answer = (k * (k - 3)) / 2;
      return {
        prompt: `Гүдгэр ${k} өнцөгт хэдэн диагональтай вэ?`,
        options: numeric(answer, [k * (k - 3), k - 3, (k * (k - 1)) / 2], rng),
        explanation: `Орой бүрээс ${k} − 3 диагональ гарна, давхар тоологдох тул ${k} · ${k - 3} : 2 = ${answer}.`,
      };
    }
    case 'triangle-inequality': {
      const a = int(rng, 3, max);
      const b = int(rng, 3, max);
      const answer = a + b - 1;
      return {
        prompt: `Гурвалжны хоёр тал ${a} см, ${b} см. Аль урт нь гурав дахь тал байж болох вэ?`,
        // буруу сонголт бүр (|a − b|; a + b) завсраас гадуур
        options: four(String(answer), [a + b, a + b + 1, Math.abs(a - b)].filter((v) => v > 0).map(String), () => {
          const v = rng() < 0.5 ? Math.abs(a - b) - int(rng, 0, 4) : a + b + int(rng, 0, 9);
          return v > 0 ? String(v) : '';
        }),
        explanation: `Гурав дахь тал ${Math.abs(a - b)} см-ээс урт, ${a + b} см-ээс богино байна; ${answer} см тохирно.`,
      };
    }
    case 'quadrilateral': {
      const a = int(rng, 5, 12) * 10;
      const b = int(rng, 5, 12) * 10;
      const c = int(rng, 5, 12) * 10;
      const answer = 360 - a - b - c;
      if (answer <= 0 || answer >= 180) return make(kind, rng, level);
      return {
        prompt: `Дөрвөн өнцөгтийн гурван өнцөг ${a}°, ${b}°, ${c}°. Дөрөв дэх өнцгийг олоорой.`,
        options: numeric(answer, [180 - answer, 180 - a, 360 - a - b], rng, 10),
        explanation: `Дөрвөн өнцөгтийн өнцгүүдийн нийлбэр 360° тул 360° − ${a}° − ${b}° − ${c}° = ${answer}°.`,
      };
    }
    case 'exterior-angle': {
      const interior = int(rng, 4, 14) * 10;
      const answer = 180 - interior;
      return {
        prompt: `Гурвалжны нэг дотоод өнцөг ${interior}° бол түүнтэй хамар гадаад өнцгийг олоорой.`,
        options: numeric(answer, [interior, 360 - interior, 180 + interior], rng, 10),
        explanation: `Дотоод өнцөг ба түүнтэй хамар гадаад өнцгийн нийлбэр 180° тул ${answer}°.`,
      };
    }
    case 'circle': {
      const r = int(rng, 2, max);
      const area = rng() < 0.5;
      const coefficient = area ? r * r : 2 * r;
      const answer = `${coefficient}π`;
      return {
        prompt: `Радиус нь ${r} см ${area ? 'дугуйн талбайг' : 'тойргийн уртыг'} π ашиглан илэрхийлээрэй.`,
        options: four(answer, [`${r}π`, area ? `${2 * r}π` : `${r * r}π`, `${2 * r * r}π`], () => `${int(rng, 2, max * max)}π`),
        explanation: area ? `S = πr² = π · ${r}² = ${answer} см².` : `C = 2πr = 2π · ${r} = ${answer} см.`,
      };
    }
    case 'solid': {
      const k = int(rng, 3, atLevel(level, [5, 8, 12]));
      const ask = pick(rng, ['faces', 'edges', 'vertices'] as const);
      const answer = ask === 'faces' ? k + 2 : ask === 'edges' ? 3 * k : 2 * k;
      return {
        prompt: `Суурь нь ${k} өнцөгт призм хэдэн ${ask === 'faces' ? 'талстай' : ask === 'edges' ? 'ирмэгтэй' : 'оройтой'} вэ?`,
        options: numeric(answer, [k, 2 * k, 3 * k, k + 2], rng),
        explanation: `${k} өнцөгт призм ${k + 2} талс, ${3 * k} ирмэг, ${2 * k} оройтой.`,
      };
    }
    case 'triangle-congruence': {
      const side = int(rng, 2, max);
      let other = int(rng, 2, max);
      if (other === side) other += 1;
      return {
        prompt: `△ABC ≅ △DEF бөгөөд AB = ${side} см, BC = ${other} см. DE хэдэн см вэ?`,
        options: numeric(side, [other, side + other, Math.abs(side - other)], rng),
        explanation: `Тэнцүү гурвалжны харгалзах талууд тэнцүү. AB талд DE тал харгалзах тул DE = ${side} см.`,
      };
    }
    case 'translate': {
      const x = int(rng, -max, max);
      const y = int(rng, -max, max);
      const dx = int(rng, 1, max);
      const dy = int(rng, 1, max);
      const answer = coord(x + dx, y + dy);
      return {
        prompt: `A${coord(x, y)} цэгийг (${dx}; ${dy}) вектороор параллел зөөв. Шинэ цэгийн координатыг олоорой.`,
        options: four(answer, [coord(x - dx, y - dy), coord(x + dx, y - dy), coord(x - dx, y + dy)], () => coord(int(rng, -max * 2, max * 2), int(rng, -max * 2, max * 2))),
        explanation: `Координат бүрт векторын харгалзах утгыг нэмнэ: ${answer}.`,
      };
    }
    case 'reflect':
    case 'central':
    case 'rotate': {
      const x = int(rng, 1, max);
      let y = int(rng, 1, max);
      if (y === x) y += 1;
      const overX = rng() < 0.5;
      const answer = kind === 'central' ? coord(-x, -y) : kind === 'rotate' ? coord(-y, x) : overX ? coord(x, -y) : coord(-x, y);
      return {
        prompt: `A${coord(x, y)} цэгийг ${kind === 'central' ? 'координатын эхийн хувьд төвийн тэгш хэмээр' : kind === 'rotate' ? 'координатын эхийг тойруулан цагийн зүүний эсрэг 90°-аар эргүүлэн' : `${overX ? 'x' : 'y'} тэнхлэгийн хувьд тэгш хэмээр`} хувиргав. Дүрийн координатыг олоорой.`,
        options: four(answer, [coord(-x, y), coord(x, -y), coord(-x, -y), coord(-y, x), coord(y, -x)], () => coord(int(rng, -max, max), int(rng, -max, max))),
        explanation:
          kind === 'central'
            ? `Төвийн тэгш хэмд хоёр координатын тэмдэг солигдоно: ${answer}.`
            : kind === 'rotate'
              ? `(x; y) цэг 90°-аар эргэхэд (−y; x) болно: ${answer}.`
              : `${overX ? 'x' : 'y'} тэнхлэгийн хувьд тэгш хэмд ${overX ? 'y' : 'x'} координатын тэмдэг солигдоно: ${answer}.`,
      };
    }
    case 'midpoint': {
      const x = int(rng, -max, max);
      const y = int(rng, -max, max);
      const dx = int(rng, 1, max);
      const dy = int(rng, 1, max);
      const answer = coord(x + dx, y + dy);
      return {
        prompt: `A${coord(x, y)}, B${coord(x + 2 * dx, y + 2 * dy)} хэрчмийн дундаж цэгийн координатыг олоорой.`,
        options: four(answer, [coord(x + 2 * dx, y + dy), coord(x + dx, y + 2 * dy), coord(dx, dy)], () => coord(int(rng, -max, max * 2), int(rng, -max, max * 2))),
        explanation: `Координат бүрийн дунджийг авахад ${answer}.`,
      };
    }
    case 'symmetry-order': {
      const k = int(rng, 3, atLevel(level, [8, 12, 16]));
      return {
        prompt: `Зөв ${k} өнцөгтийн эргүүлэлтийн тэгш хэмийн эрэмбэ хэд вэ?`,
        options: numeric(k, [k - 1, k + 1, 2 * k], rng),
        explanation: `Зөв ${k} өнцөгт нэг бүтэн эргэлтэд өөртэйгөө ${k} удаа давхцана.`,
      };
    }
    case 'time': {
      const hour = int(rng, 13, 23);
      const minute = pick(rng, ['00', '15', '30', '45']);
      const answer = `${hour - 12}:${minute}`;
      return {
        prompt: `24 цагийн системийн ${hour}:${minute}-ийг 12 цагийн системээр бичээрэй.`,
        options: four(answer, [`${hour}:${minute}`, `${hour - 10}:${minute}`, `${24 - hour}:${minute}`], () => `${int(rng, 1, 12)}:${minute}`),
        explanation: `${hour} − 12 = ${hour - 12} тул оройн ${answer}.`,
      };
    }
    case 'analog-digital': {
      const hour = int(rng, 1, 11);
      const step = int(rng, 1, 11);
      const minute = String(step * 5).padStart(2, '0');
      return {
        prompt: `Аналог цагны минутын зүү ${step} тоон дээр, цагийн зүү ${hour} ба ${hour + 1} тооны хооронд байна. Дижитал цаг юу заах вэ?`,
        options: four(`${hour}:${minute}`, [`${hour}:${String(step).padStart(2, '0')}`, `${hour + 1}:${minute}`, `${step}:${String(hour * 5).padStart(2, '0')}`], () => `${int(rng, 1, 12)}:${minute}`),
        explanation: `Минутын зүүний тоо бүр 5 минут: ${step} · 5 = ${step * 5} минут, цагийн зүү ${hour}-ийг давсан тул ${hour}:${minute}.`,
      };
    }
    case 'unit':
    case 'traditional-unit':
    case 'area-unit':
    case 'volume-unit': {
      const value = int(rng, 2, max);
      const [factor, from, to, note] =
        kind === 'area-unit'
          ? [10_000, 'м²', 'см²', '']
          : kind === 'volume-unit'
            ? [1000, 'л', 'см³', '']
            : kind === 'traditional-unit'
              ? [160, 'алд', 'см', '1 алд нь 160 см гэж үзвэл ']
              : [100, 'м', 'см', ''];
      const answer = value * factor;
      return {
        prompt: `${note}${value} ${from} хэдэн ${to} вэ?`,
        options: numeric(answer, [value + factor, value * 10, answer / 10], rng, factor),
        explanation: `1 ${from} = ${factor} ${to} тул ${value} · ${factor} = ${answer} ${to}.`,
      };
    }
    case 'rectangle': {
      const a = int(rng, 2, max);
      let b = int(rng, 2, max);
      if (b === a) b += 1;
      const area = rng() < 0.5;
      const answer = area ? a * b : 2 * (a + b);
      return {
        prompt: `Урт нь ${a} см, өргөн нь ${b} см тэгш өнцөгтийн ${area ? 'талбайг' : 'периметрийг'} олоорой.`,
        options: numeric(answer, [a + b, area ? 2 * (a + b) : a * b, 2 * a + b], rng),
        explanation: area ? `S = a · b = ${a} · ${b} = ${answer} см².` : `P = 2(a + b) = 2 · ${a + b} = ${answer} см.`,
      };
    }
    case 'box-surface':
    case 'prism-surface': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, 2, max);
      const answer = 2 * (a * b + b * c + a * c);
      return {
        prompt: `Ирмэгүүд нь ${a} см, ${b} см, ${c} см тэгш өнцөгт параллелепипедийн гадаргуугийн талбайг олоорой.`,
        options: numeric(answer, [a * b * c, a * b + b * c + a * c, 2 * (a + b + c)], rng),
        explanation: `S = 2(ab + bc + ac) = 2 · ${a * b + b * c + a * c} = ${answer} см².`,
      };
    }
    case 'box-volume': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, 2, max);
      const answer = a * b * c;
      return {
        prompt: `Ирмэгүүд нь ${a} см, ${b} см, ${c} см тэгш өнцөгт параллелепипедийн эзлэхүүнийг олоорой.`,
        options: numeric(answer, [2 * (a * b + b * c + a * c), a + b + c, a * b], rng),
        explanation: `V = abc = ${a} · ${b} · ${c} = ${answer} см³.`,
      };
    }
    case 'triangle-area': {
      const base = int(rng, 2, max) * 2;
      const height = int(rng, 2, max);
      const parallelogram = rng() < 0.5;
      const answer = parallelogram ? base * height : (base * height) / 2;
      return {
        prompt: `Суурь нь ${base} см, өндөр нь ${height} см ${parallelogram ? 'параллелограммын' : 'гурвалжны'} талбайг олоорой.`,
        options: numeric(answer, [parallelogram ? (base * height) / 2 : base * height, (base + height) * 2, answer + height], rng),
        explanation: parallelogram ? `S = ah = ${base} · ${height} = ${answer} см².` : `S = ah : 2 = ${base} · ${height} : 2 = ${answer} см².`,
      };
    }
    case 'trapezoid-area': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const h = int(rng, 2, max) * 2;
      const answer = ((a + b) * h) / 2;
      return {
        prompt: `Суурийн талууд нь ${a} см, ${b} см, өндөр нь ${h} см трапецын талбайг олоорой.`,
        options: numeric(answer, [(a + b) * h, a * b * h, (a * h) / 2], rng),
        explanation: `S = (a + b)h : 2 = (${a} + ${b}) · ${h} : 2 = ${answer} см².`,
      };
    }
    case 'pyramid-surface': {
      const a = int(rng, 2, max);
      const h = int(rng, 2, max) * 2;
      const answer = a * a + 2 * a * h;
      return {
        prompt: `Суурийн тал нь ${a} см, хажуу талсын өндөр нь ${h} см зөв дөрвөн өнцөгт пирамидын бүтэн гадаргуугийн талбайг олоорой.`,
        options: numeric(answer, [a * a + a * h, 4 * a * h, a * a * h], rng),
        explanation: `Суурь ${a * a} см², дөрвөн гурвалжин талс нийлээд 4 · ${a} · ${h} : 2 = ${2 * a * h} см² тул ${answer} см².`,
      };
    }
    case 'composite-solid': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, 2, max);
      let d = int(rng, 2, max);
      if (d === c) d += 1;
      const answer = a * b * c + a * b * d;
      return {
        prompt: `${a} см × ${b} см ижил суурьтай, өндөр нь ${c} см ба ${d} см хоёр хайрцгийг нийлүүлэв. Нийлмэл биетийн эзлэхүүнийг олоорой.`,
        options: numeric(answer, [a * b * Math.abs(c - d), a * b * c, (a + b) * (c + d)], rng),
        explanation: `Эзлэхүүнүүдийг нэмбэл ${a * b * c} + ${a * b * d} = ${answer} см³.`,
      };
    }
    case 'data-type': {
      const continuous = rng() < 0.5;
      const subject = pick(rng, continuous ? ['сурагчийн өндөр', 'усны температур', 'гүйлтийн хугацаа', 'ачааны жин'] : ['ангийн сурагчдын тоо', 'тавиур дээрх номын тоо', 'гэр бүлийн гишүүдийн тоо', 'шидэлтээр авсан онооны тоо']);
      const answer = continuous ? 'Тасралтгүй өгөгдөл' : 'Дискрет өгөгдөл';
      return {
        prompt: `${cap(subject)} ямар төрлийн өгөгдөл вэ?`,
        options: [answer, ...['Тасралтгүй өгөгдөл', 'Дискрет өгөгдөл', 'Чанарын өгөгдөл', 'Хоёрдогч өгөгдөл'].filter((o) => o !== answer)].slice(0, 4),
        explanation: continuous ? 'Хэмжилт нь завсрын дурын утга авч болох тул тасралтгүй өгөгдөл.' : 'Тоолж бүхэл утгаар бүртгэдэг тул дискрет өгөгдөл.',
      };
    }
    case 'data-source': {
      const direct = rng() < 0.5;
      const answer = direct ? 'Анхдагч эх үүсвэр' : 'Хоёрдогч эх үүсвэр';
      const source = direct ? `өөрийн ангийн ${int(rng, 10, 40)} сурагчаас авсан судалгаа` : `${2000 + int(rng, 10, 26)} онд нийтлэгдсэн статистикийн тайлан`;
      return {
        prompt: `${cap(source)} ямар эх үүсвэр вэ?`,
        options: [answer, ...['Анхдагч эх үүсвэр', 'Хоёрдогч эх үүсвэр', 'Таамаглал', 'Туршилтын алдаа'].filter((o) => o !== answer)].slice(0, 4),
        explanation: direct ? 'Мэдээллийг судлаач өөрөө цуглуулсан тул анхдагч эх үүсвэр.' : 'Өмнө нь нийтлэгдсэн мэдээллийг ашигласан тул хоёрдогч эх үүсвэр.',
      };
    }
    case 'table':
    case 'chart':
    case 'conclusion': {
      const values = new Set<number>();
      while (values.size < 4) values.add(int(rng, 1, max));
      const list = [...values];
      const labels = ['А', 'Б', 'В', 'Г'];
      const sum = list.reduce((a, b) => a + b, 0);
      const spread = Math.max(...list) - Math.min(...list);
      const answer = kind === 'table' ? sum : kind === 'chart' ? Math.max(...list) : spread;
      const what = kind === 'table' ? 'нийлбэрийг' : kind === 'chart' ? 'хамгийн их утгыг' : 'хамгийн их ба хамгийн бага утгын зөрүүг';
      return {
        prompt: `${labels.map((x, i) => `${x}: ${list[i]}`).join(', ')} өгөгдлийн ${what} олоорой.`,
        options: numeric(answer, kind === 'conclusion' ? [Math.max(...list), Math.min(...list), sum] : [...list, sum], rng),
        explanation:
          kind === 'table'
            ? `Бүх утгыг нэмбэл ${answer}.`
            : kind === 'chart'
              ? `Утгуудыг жишихэд хамгийн их нь ${answer}.`
              : `Зөрүүг олбол ${Math.max(...list)} − ${Math.min(...list)} = ${answer}.`,
      };
    }
    case 'grouped-data':
    case 'mode': {
      const mode = int(rng, 2, max);
      const others = [mode - 1, mode + 1, mode + 2];
      const data = [mode, mode, mode, ...others].sort(() => rng() - 0.5);
      return {
        prompt: `${data.join(', ')} өгөгдлийн ${kind === 'mode' ? 'моодыг' : 'хамгийн олон давтагдсан утгыг'} олоорой.`,
        options: numeric(mode, others, rng),
        explanation: `${mode} утга гурван удаа давтагдсан нь хамгийн олон.`,
      };
    }
    case 'mean': {
      const center = int(rng, 3, max);
      const d = int(rng, 1, Math.max(2, Math.floor(max / 2)));
      const data = [center - d, center, center, center + d].filter((v) => v > 0);
      if (data.length < 4) return make(kind, rng, level);
      const askRange = rng() < 0.5;
      const answer = askRange ? 2 * d : center;
      return {
        prompt: `${data.join(', ')} өгөгдлийн ${askRange ? 'далайцыг' : 'арифметик дунджийг'} олоорой.`,
        options: numeric(answer, askRange ? [center, center + d, d] : [2 * d, center + d, center * 4], rng),
        explanation: askRange ? `Далайц = хамгийн их утга − хамгийн бага утга = ${center + d} − ${center - d} = ${answer}.` : `Нийлбэр ${center * 4}-ийг 4-т хуваахад ${answer}.`,
      };
    }
    case 'relative-frequency': {
      const total = int(rng, 10, max + 20);
      const success = int(rng, 1, total - 1);
      const answer = fraction(success, total);
      return {
        prompt: `${total} удаагийн туршилтад үзэгдэл ${success} удаа илэрсэн. Харьцангуй давтамжийг олоорой.`,
        options: four(answer, [fraction(total - success, total), fraction(success, total + 1), fraction(1, total)], () => fraction(int(rng, 1, total - 1), total)),
        explanation: `Харьцангуй давтамж = ${success}/${total} = ${answer}.`,
      };
    }
  }
}

function templates(grade: 6 | 7, specs: readonly Spec[]): readonly Template[] {
  return specs.map(({ page, kind, topic }) => ({
    ref: `math-${grade}:${page}`,
    id: `math${grade}-page-${page}`,
    preferStored: true,
    ...(topic ? { topic } : {}),
    make(rng: Rng, level: Level) {
      return make(kind, rng, level);
    },
  }));
}

export const MATH6_SPECS: readonly Spec[] = [
  { page: 20, title: 'Хэллэг', kind: 'statement', topic: 'expressions' },
  { page: 21, title: 'Олонлог', kind: 'set', topic: 'natural_integers' },
  { page: 23, title: 'Тоог жиших, эрэмбэлэх', kind: 'decimal-compare', topic: 'fractions_decimals' },
  { page: 25, title: 'Тоог тоймлох', kind: 'round', topic: 'natural_integers' },
  { page: 30, title: 'Аравтын бутархайн нэмэх, хасах үйлдэл', kind: 'decimal-add', topic: 'fractions_decimals' },
  { page: 32, title: 'Аравтын бутархайг бүхэл тоогоор үржүүлэх, бүхэл тоонд хуваах', kind: 'decimal-scale', topic: 'fractions_decimals' },
  { page: 36, title: 'Аравтын бутархайн үржүүлэх, хуваах үйлдэл', kind: 'decimal-mul', topic: 'fractions_decimals' },
  { page: 39, title: 'Хялбар аргаар тооцоолох', kind: 'mental', topic: 'expressions' },
  { page: 40, title: 'Энгийн бутархайг хураах, жиших', kind: 'fraction-compare', topic: 'fractions_decimals' },
  { page: 43, title: 'Энгийн бутархайн нэмэх, хасах үйлдэл', kind: 'fraction-add', topic: 'fractions_decimals' },
  { page: 46, title: 'Энгийн бутархайн үржүүлэх үйлдэл', kind: 'fraction-mul', topic: 'fractions_decimals' },
  { page: 49, title: 'Энгийн бутархайн хуваах үйлдэл', kind: 'fraction-div', topic: 'fractions_decimals' },
  { page: 51, title: 'Процент', kind: 'percent', topic: 'percent' },
  { page: 55, title: 'Тоог өгсөн харьцаагаар хуваах', kind: 'ratio', topic: 'ratio_proportion' },
  { page: 57, title: 'Пропорцын үндсэн чанар', kind: 'proportion', topic: 'ratio_proportion' },
  { page: 59, title: 'Шууд пропорционал хамаарал', kind: 'direct', topic: 'ratio_proportion' },
  { page: 61, title: 'Үржвэр ба нийлбэрийн зарчим', kind: 'counting' },
  { page: 64, title: 'Үзэгдлийн магадлал', kind: 'probability' },
  { page: 70, title: 'Алгебрын илэрхийлэл зохиох, утгыг олох', kind: 'expression', topic: 'expressions' },
  { page: 72, title: 'Алгебрын илэрхийллийг хялбарчлах', kind: 'simplify', topic: 'expressions' },
  { page: 74, title: 'Гишүүнчлэн үржүүлэх, ерөнхий үржигдэхүүн гаргах', kind: 'factor', topic: 'expressions' },
  { page: 77, title: 'Шугаман тэгшитгэл', kind: 'equation', topic: 'linear_equations' },
  { page: 83, title: 'Дүрсэн дараалал', kind: 'sequence', topic: 'expressions' },
  { page: 85, title: 'Тоон дараалал', kind: 'sequence', topic: 'expressions' },
  { page: 87, title: 'Функц', kind: 'function', topic: 'expressions' },
  { page: 88, title: 'Координатын хавтгай', kind: 'coordinate' },
  { page: 90, title: 'Шулууны тэгшитгэл бичих', kind: 'line', topic: 'linear_equations' },
  { page: 95, title: 'Цэг, шулуун, хэрчим, цацраг', kind: 'segments', topic: 'angles' },
  { page: 97, title: 'Параллел, перпендикуляр шулуун', kind: 'parallel-perp', topic: 'angles' },
  { page: 98, title: 'Өнцөг', kind: 'angle-type', topic: 'angles' },
  { page: 101, title: 'Хамар ба босоо өнцөг', kind: 'vertical-adjacent', topic: 'angles' },
  { page: 103, title: 'Гурвалжныг өгсөн тал, өнцгөөр зурах', kind: 'construct', topic: 'triangles' },
  { page: 104, title: 'Гурвалжны дотоод өнцгүүдийн нийлбэр', kind: 'triangle', topic: 'triangles' },
  { page: 106, title: 'Олон өнцөгтийн дотоод өнцгүүдийн нийлбэр', kind: 'polygon', topic: 'angles' },
  { page: 108, title: 'Гурвалжны тэнцэтгэл биш', kind: 'triangle-inequality', topic: 'triangles' },
  { page: 109, title: 'Олон өнцөгт', kind: 'diagonals', topic: 'angles' },
  { page: 111, title: 'Дөрвөн өнцөгт', kind: 'quadrilateral', topic: 'angles' },
  { page: 114, title: 'Тойрог ба дугуй', kind: 'circle', topic: 'circle' },
  { page: 116, title: 'Биетүүд', kind: 'solid' },
  { page: 120, title: 'Параллел зөөлт', kind: 'translate' },
  { page: 121, title: 'Тэнхлэгийн тэгш хэм', kind: 'reflect' },
  { page: 124, title: 'Төвийн тэгш хэм', kind: 'central' },
  { page: 126, title: 'Тэнцүү дүрс', kind: 'triangle-congruence', topic: 'triangles' },
  { page: 129, title: '12 ба 24 цагийн систем', kind: 'time' },
  { page: 130, title: 'Урт, хүнд, багтаамжийн нэгж', kind: 'unit' },
  { page: 131, title: 'Аналоги болон дижитал хэмжих нэгж', kind: 'analog-digital' },
  { page: 133, title: 'Талбайн нэгж', kind: 'area-unit', topic: 'rectangle_area' },
  { page: 134, title: 'Тэгш өнцөгтийн периметр ба талбай', kind: 'rectangle', topic: 'rectangle_area' },
  { page: 138, title: 'Хэмжигдэхүүн хоорондын хамаарал', kind: 'relation', topic: 'ratio_proportion' },
  { page: 140, title: 'Параллелепипедийн гадаргуугийн талбай', kind: 'box-surface', topic: 'rectangle_area' },
  { page: 142, title: 'Параллелепипедийн эзлэхүүн', kind: 'box-volume', topic: 'rectangle_area' },
  { page: 147, title: 'Өгөгдөл цуглуулах, бүртгэх', kind: 'data-source', topic: 'mean' },
  { page: 148, title: 'Өгөгдлийг дүрслэх', kind: 'chart', topic: 'mean' },
  { page: 153, title: 'Дунджууд ба далайц', kind: 'mean', topic: 'mean' },
  { page: 156, title: 'Хүснэгт, диаграмм, график унших', kind: 'conclusion', topic: 'mean' },
];
export const MATH6_MORE = templates(6, MATH6_SPECS);

export const MATH7_SPECS: readonly Spec[] = [
  { page: 19, title: 'Тоог тоймлох', kind: 'round', topic: 'natural_integers' },
  { page: 22, title: 'Хялбар аргаар тооцоолох', kind: 'mental', topic: 'expressions' },
  { page: 23, title: 'Энгийн бутархайг хураах, жиших', kind: 'fraction-compare', topic: 'fractions_decimals' },
  { page: 25, title: 'Энгийн бутархайн нэмэх, хасах үйлдэл', kind: 'fraction-add', topic: 'fractions_decimals' },
  { page: 28, title: 'Энгийн бутархайн үржүүлэх, хуваах үйлдэл', kind: 'fraction-mul', topic: 'fractions_decimals' },
  { page: 32, title: 'Бутархай ба процентыг харилцан шилжүүлэх', kind: 'convert', topic: 'percent' },
  { page: 34, title: 'Хөдөлгөөний бодлого', kind: 'speed', topic: 'ratio_proportion' },
  { page: 37, title: 'Ажлын болон хэсгийн бодлого', kind: 'work', topic: 'ratio_proportion' },
  { page: 39, title: 'Процентын бодлого', kind: 'percent', topic: 'percent' },
  { page: 41, title: 'Өсөлт, бууралтын процент', kind: 'percent-change', topic: 'percent' },
  { page: 46, title: 'Харьцаа, пропорц', kind: 'proportion', topic: 'ratio_proportion' },
  { page: 50, title: 'Шууд пропорционал хамаарал', kind: 'direct', topic: 'ratio_proportion' },
  { page: 51, title: 'Эсрэг үзэгдлийн магадлал', kind: 'opposite-probability' },
  { page: 59, title: 'Алгебрын илэрхийлэл зохиох, хялбарчлах', kind: 'simplify', topic: 'expressions' },
  { page: 61, title: 'Натурал илтгэгчтэй зэргийн чанар', kind: 'power-law', topic: 'expressions' },
  { page: 63, title: 'Нэг гишүүнтүүдийг үржүүлэх, хуваах', kind: 'monomial', topic: 'expressions' },
  { page: 67, title: 'Нэг гишүүнтийг хаалтаас гаргах', kind: 'factor', topic: 'expressions' },
  { page: 69, title: 'Тэгшитгэл', kind: 'equation', topic: 'linear_equations' },
  { page: 74, title: 'Дарааллын зүй тогтлыг олох', kind: 'sequence', topic: 'expressions' },
  { page: 76, title: 'Арифметик прогресс', kind: 'sequence', topic: 'expressions' },
  { page: 79, title: 'Шулууны тэгшитгэл', kind: 'line', topic: 'linear_equations' },
  { page: 83, title: 'Шугаман функцийн график', kind: 'function', topic: 'linear_equations' },
  { page: 92, title: 'Солбисон өнцөг', kind: 'alternate', topic: 'angles' },
  { page: 94, title: 'Гурвалжны дотоод өнцгүүдийн нийлбэр', kind: 'triangle', topic: 'triangles' },
  { page: 96, title: 'Дөрвөн өнцөгтийн дотоод өнцгүүдийн нийлбэр', kind: 'quadrilateral', topic: 'angles' },
  { page: 98, title: 'Гурвалжны гадаад өнцөг', kind: 'exterior-angle', topic: 'triangles' },
  { page: 101, title: 'Дөрвөн өнцөгтийн шинж', kind: 'quadrilateral', topic: 'angles' },
  { page: 104, title: 'Гурвалжны тэнцүүгийн шинжүүд', kind: 'triangle-congruence', topic: 'triangles' },
  { page: 108, title: 'Байгуулалт хийх', kind: 'construct', topic: 'triangles' },
  { page: 120, title: 'Хэрчмийн дундаж цэгийн координат', kind: 'midpoint' },
  { page: 122, title: 'Эргүүлэлтээр хувиргах', kind: 'rotate' },
  { page: 123, title: 'Эргүүлэлтийн тэгш хэмийн эрэмбэ', kind: 'symmetry-order' },
  { page: 124, title: 'Параллел зөөлтөөр дараалан хувиргах', kind: 'translate' },
  { page: 126, title: 'Эргүүлэлтээр дараалан хувиргах', kind: 'rotate' },
  { page: 129, title: 'Монголын уламжлалт нэгж', kind: 'traditional-unit' },
  { page: 132, title: 'Талбайн нэгж', kind: 'area-unit', topic: 'rectangle_area' },
  { page: 133, title: 'Эзлэхүүний нэгж', kind: 'volume-unit', topic: 'rectangle_area' },
  { page: 135, title: 'Гурвалжин ба параллелограммын талбай', kind: 'triangle-area', topic: 'rectangle_area' },
  { page: 139, title: 'Трапецын талбай', kind: 'trapezoid-area', topic: 'rectangle_area' },
  { page: 141, title: 'Тойргийн урт, дугуйн талбай', kind: 'circle', topic: 'circle' },
  { page: 144, title: 'Призмийн гадаргуугийн талбай', kind: 'prism-surface', topic: 'rectangle_area' },
  { page: 147, title: 'Пирамидын гадаргуугийн талбай', kind: 'pyramid-surface', topic: 'rectangle_area' },
  { page: 149, title: 'Параллелепипедийн гадаргуу, эзлэхүүн', kind: 'box-volume', topic: 'rectangle_area' },
  { page: 151, title: 'Нийлмэл биетийн гадаргуу, эзлэхүүн', kind: 'composite-solid', topic: 'rectangle_area' },
  { page: 156, title: 'Дискрет ба тасралтгүй өгөгдөл', kind: 'data-type', topic: 'mean' },
  { page: 157, title: 'Өгөгдлийн эх үүсвэр', kind: 'data-source', topic: 'mean' },
  { page: 159, title: 'Хүснэгт', kind: 'table', topic: 'mean' },
  { page: 161, title: 'Өгөгдлийг бүлэглэх, баганан диаграмм', kind: 'grouped-data', topic: 'mean' },
  { page: 162, title: 'Моод бүлэг', kind: 'mode', topic: 'mean' },
  { page: 164, title: 'Өгөгдлийг график, диаграммаар дүрслэх', kind: 'chart', topic: 'mean' },
  { page: 168, title: 'Дунджуудыг тооцоолох', kind: 'mean', topic: 'mean' },
  { page: 173, title: 'Өгөгдөл ба диаграммыг уншиж дүгнэх', kind: 'conclusion', topic: 'mean' },
  { page: 180, title: 'Туршилт, харьцангуй давтамж', kind: 'relative-frequency' },
];
export const MATH7_MORE = templates(7, MATH7_SPECS);
