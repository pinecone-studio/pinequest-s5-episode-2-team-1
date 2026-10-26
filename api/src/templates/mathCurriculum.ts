// Математик 6, 7-ын үлдсэн хичээлүүд: нийтлэг бодлого үүсгэгч + номын хуудасны тусдаа mapping.
import type { QuestionDraft } from '../llm/types';
import type { Level, Rng, Template } from './index';

type Draft = Omit<QuestionDraft, 'correctIndex' | 'topic'>;
type Kind =
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
  | 'angle'
  | 'triangle'
  | 'polygon'
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

interface Spec {
  page: number;
  title: string;
  kind: Kind;
  topic?: string;
}

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const atLevel = <T>(level: Level, xs: readonly [T, T, T]): T => xs[level - 1];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const fraction = (a: number, b: number) => {
  const d = gcd(a, b);
  return `${a / d}/${b / d}`;
};
const coord = (x: number, y: number) => `(${x}; ${y})`;
const linear = (a: number, b: number) => `${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;

function four(correct: string, wrong: string[], filler: () => string): string[] {
  const out = [correct];
  for (const value of wrong) if (value && !out.includes(value) && out.length < 4) out.push(value);
  for (let i = 0; out.length < 4 && i < 100; i++) {
    const value = filler();
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

const numeric = (correct: number, wrong: number[], rng: Rng, step = 1) =>
  four(String(correct), wrong.map(String), () => String(correct + int(rng, -9, 9) * step));

function make(kind: Kind, rng: Rng, level: Level): Draft {
  const max = atLevel(level, [12, 40, 100]);
  switch (kind) {
    case 'set': {
      const divisor = int(rng, 2, 6);
      const answer = divisor * int(rng, 2, max);
      return {
        prompt: `A олонлог нь ${divisor}-д хуваагдах натурал тоонуудаас тогтоно. Аль тоо A-д харьяалагдах вэ?`,
        options: numeric(answer, [answer + 1, answer - 1, answer + divisor - 1], rng),
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
      const fmt = (n: number) => (n / scale).toFixed(places);
      return {
        prompt: `${list.map(fmt).join('; ')} тоонуудаас хамгийн ${askMax ? 'их' : 'бага'} тоог сонгоорой.`,
        options: [answer, ...list.filter((n) => n !== answer)].map(fmt),
        explanation: `Орон тус бүрээр жишихэд хамгийн ${askMax ? 'их' : 'бага'} тоо нь ${fmt(answer)}.`,
      };
    }
    case 'round': {
      const place = atLevel(level, [10, 100, 1000]);
      const n = int(rng, place, place * max) + int(rng, 1, place - 1);
      const answer = Math.round(n / place) * place;
      return {
        prompt: `${n} тоог ${place === 10 ? 'аравт' : place === 100 ? 'зуут' : 'мянгат'}-аар тоймлоорой.`,
        options: numeric(answer, [Math.floor(n / place) * place, Math.ceil(n / place) * place, answer + place], rng, place),
        explanation: `Тоймлох орны дараагийн цифрийг харвал ${n} тоо ${answer} болж тоймлогдоно.`,
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
      const fmt = (n: number) => (n / scale).toFixed(places);
      return {
        prompt: `${fmt(add ? a : large)} ${add ? '+' : '−'} ${fmt(add ? b : small)} үйлдлийг гүйцэтгээрэй.`,
        options: four(fmt(answer), [fmt(a + b), fmt(Math.abs(a - b)), fmt(answer + scale)], () => fmt(Math.max(0, answer + int(rng, -5, 5)))),
        explanation: `Таслалуудыг зэрэгцүүлэн бодоход хариу ${fmt(answer)}.`,
      };
    }
    case 'decimal-scale': {
      const scale = level === 1 ? 10 : 100;
      const a = int(rng, scale, max * scale);
      const b = int(rng, 2, 9);
      const answer = a * b;
      const fmt = (n: number) => (n / scale).toFixed(scale === 10 ? 1 : 2);
      return {
        prompt: `${fmt(a)} · ${b} үржвэрийг олоорой.`,
        options: four(fmt(answer), [fmt(a + b), fmt(a * (b + 1)), fmt(a)], () => fmt(answer + int(rng, -5, 5))),
        explanation: `Бүхэл тоогоор үржүүлээд таслалыг хэвээр байрлуулахад ${fmt(answer)} гарна.`,
      };
    }
    case 'decimal-mul': {
      const scale = 10;
      const a = int(rng, 11, max * scale);
      const b = int(rng, 11, max * scale);
      const answer = a * b;
      const fmt = (n: number, denominator = 100) => (n / denominator).toFixed(2);
      return {
        prompt: `${(a / scale).toFixed(1)} · ${(b / scale).toFixed(1)} үржвэрийг олоорой.`,
        options: four(fmt(answer), [fmt(a * b, 10), fmt(a + b, 10), fmt(answer + 10)], () => fmt(answer + int(rng, -20, 20))),
        explanation: `Бүхэл тоонуудыг үржүүлээд таслалаас хойш нийт хоёр орон тавихад ${fmt(answer)}.`,
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
        explanation: `Ерөнхий үржигдэхүүн ${a}-г хаалтаас гаргавал ${a} · (${b} + ${c}) = ${answer}.`,
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
        prompt: `${list.map((n) => `${n}/${denominator}`).join('; ')} бутархайн хамгийн ${askMax ? 'их' : 'бага'}-ыг сонгоорой.`,
        options: [answer, ...list.filter((n) => n !== answer)].map((n) => `${n}/${denominator}`),
        explanation: `Ижил хуваарьтай бутархайн хүртвэр ${askMax ? 'их' : 'бага'} байх тусам бутархай ${askMax ? 'их' : 'бага'} байна.`,
      };
    }
    case 'fraction-add': {
      const denominator = int(rng, 4, max + 4);
      const a = int(rng, 1, denominator - 1);
      const b = int(rng, 1, denominator - 1);
      const add = rng() < 0.5 || a < b;
      const numerator = add ? a + b : a - b;
      const answer = fraction(numerator, denominator);
      return {
        prompt: `${a}/${denominator} ${add ? '+' : '−'} ${b}/${denominator} хэдтэй тэнцүү вэ?`,
        options: four(answer, [`${numerator}/${denominator * 2}`, fraction(a + b, denominator), fraction(Math.abs(a - b) || 1, denominator)], () => fraction(int(rng, 1, denominator * 2), denominator)),
        explanation: `Хуваарь ижил тул хүртвэрийг ${add ? 'нэмнэ' : 'хасна'}: ${numerator}/${denominator} = ${answer}.`,
      };
    }
    case 'fraction-mul':
    case 'fraction-div': {
      const a = int(rng, 1, max);
      const b = int(rng, 2, max + 2);
      const c = int(rng, 1, max);
      const d = int(rng, 2, max + 2);
      const divide = kind === 'fraction-div';
      const numerator = divide ? a * d : a * c;
      const denominator = divide ? b * c : b * d;
      const answer = fraction(numerator, denominator);
      return {
        prompt: `${a}/${b} ${divide ? ':' : '·'} ${c}/${d} хэдтэй тэнцүү вэ?`,
        options: four(answer, [fraction(a * c, b * d), fraction(a + c, b + d), fraction(a * d, b * c)], () => fraction(int(rng, 1, max * 2), int(rng, 2, max * 2 + 1))),
        explanation: divide
          ? `Хоёр дахь бутархайг урвуулж үржүүлэхэд ${numerator}/${denominator} = ${answer}.`
          : `Хүртвэрүүд болон хуваариудыг тус тус үржүүлбэл ${numerator}/${denominator} = ${answer}.`,
      };
    }
    case 'convert': {
      const percent = pick(rng, [10, 20, 25, 40, 50, 60, 75, 80, 90]);
      const d = gcd(percent, 100);
      const answer = `${percent}%`;
      return {
        prompt: `${percent / d}/${100 / d} энгийн бутархайг процентоор илэрхийлээрэй.`,
        options: four(answer, [`${100 - percent}%`, `${percent / 10}%`, `${percent + 10}%`], () => `${int(rng, 1, 99)}%`),
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
        prompt: kind === 'percent'
          ? `${base} тооны ${percent}% хэд вэ?`
          : `${base} хэмжээг ${percent}%-аар ${increase ? 'өсгөв' : 'бууруулав'}. Шинэ хэмжээ хэд вэ?`,
        options: numeric(answer, [part, base + part, base - part], rng),
        explanation: `${base}-ын ${percent}% = ${part}${kind === 'percent-change' ? ` тул шинэ хэмжээ ${answer}` : ''}.`,
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
        explanation: `Харьцааг ${k}-аар өргөтгөсөн тул x = ${b} · ${k} = ${answer}.`,
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
        explanation: `x-ийн оронд ${x}-ийг орлуулбал y = ${k} · ${x} = ${answer}.`,
      };
    }
    case 'speed': {
      const speed = int(rng, 3, max) * 5;
      const time = int(rng, 2, 8);
      const answer = speed * time;
      return {
        prompt: `Тээврийн хэрэгсэл цагт ${speed} км хурдтай ${time} цаг явав. Замыг олоорой.`,
        options: numeric(answer, [speed + time, speed / time, answer + speed], rng),
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
      const wanted = kind === 'opposite-probability' ? total - favorable : favorable;
      const answer = fraction(wanted, total);
      return {
        prompt: `${total} тэнцүү боломжийн ${favorable} нь A үзэгдэл байв. ${kind === 'opposite-probability' ? 'A-гийн эсрэг' : 'A'} үзэгдлийн магадлалыг олоорой.`,
        options: four(answer, [fraction(favorable, total), fraction(total - favorable, total), fraction(1, total)], () => fraction(int(rng, 1, total - 1), total)),
        explanation: `Тааламжтай ${wanted} боломжийг нийт ${total} боломжид хуваавал ${answer}.`,
      };
    }
    case 'expression':
    case 'function':
    case 'line': {
      const a = int(rng, 2, max);
      const b = int(rng, -max, max);
      const x = int(rng, -max, max);
      const answer = a * x + b;
      return {
        prompt: `y = ${linear(a, b)} үед x = ${x} бол y-ийг олоорой.`,
        options: numeric(answer, [a + x + b, a * x - b, answer + a], rng),
        explanation: `x = ${x}-ийг орлуулбал y = ${a} · (${x}) ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${answer}.`,
      };
    }
    case 'simplify': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, -max, max);
      const answer = linear(a + b, c);
      return {
        prompt: `${a}x + ${b}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} илэрхийллийг хялбарчлаарай.`,
        options: four(answer, [linear(a * b, c), linear(a + b + c, 0), linear(a, b + c)], () => linear(int(rng, 1, max * 2), int(rng, -max, max))),
        explanation: `Ижил гишүүдийн коэффициентийг нэмбэл (${a} + ${b})x = ${a + b}x тул ${answer}.`,
      };
    }
    case 'factor': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const answer = `${a}(x + ${b})`;
      return {
        prompt: `${a}x + ${a * b} илэрхийллээс ерөнхий үржигдэхүүн гаргаарай.`,
        options: four(answer, [`${a}(x + ${a * b})`, `${b}(x + ${a})`, `${a}x(x + ${b})`], () => `${int(rng, 2, max)}(x + ${int(rng, 2, max)})`),
        explanation: `Хоёр гишүүний ерөнхий үржигдэхүүн ${a} тул ${a}x + ${a * b} = ${answer}.`,
      };
    }
    case 'equation': {
      const a = int(rng, 2, max);
      const x = int(rng, 1, max);
      const b = int(rng, -max, max);
      const c = a * x + b;
      return {
        prompt: `${linear(a, b)} = ${c} тэгшитгэлийг бодоорой.`,
        options: numeric(x, [x + 1, x - 1, c - b], rng),
        explanation: `Тогтмол гишүүнийг шилжүүлээд ${a}x = ${c - b}; иймээс x = ${x}.`,
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
      const n = int(rng, 1, 6);
      const answer = `${a * b}x^${m + n}`;
      return {
        prompt: `${a}x^${m} · ${b}x^${n} үржвэрийг хялбарчлаарай.`,
        options: four(answer, [`${a + b}x^${m + n}`, `${a * b}x^${m * n}`, `${a * b}x^${Math.abs(m - n)}`], () => `${int(rng, 2, max * 2)}x^${int(rng, 1, 12)}`),
        explanation: `Коэффициентүүдийг үржүүлж, ижил суурийн илтгэгчийг нэмэхэд ${answer}.`,
      };
    }
    case 'sequence': {
      const first = int(rng, 1, max);
      const difference = int(rng, 2, max);
      const n = int(rng, 5, 12);
      const answer = first + (n - 1) * difference;
      return {
        prompt: `${first}, ${first + difference}, ${first + 2 * difference}, … дарааллын ${n}-р гишүүнийг олоорой.`,
        options: numeric(answer, [first + n * difference, n * difference, answer - difference], rng),
        explanation: `aₙ = a₁ + (n − 1)d тул ${first} + (${n} − 1) · ${difference} = ${answer}.`,
      };
    }
    case 'coordinate': {
      const x = (rng() < 0.5 ? -1 : 1) * int(rng, 1, max);
      const y = (rng() < 0.5 ? -1 : 1) * int(rng, 1, max);
      const answer = x > 0 ? (y > 0 ? 'I мөч' : 'IV мөч') : y > 0 ? 'II мөч' : 'III мөч';
      return {
        prompt: `A${coord(x, y)} цэг координатын хавтгайн аль мөчид орших вэ?`,
        options: [answer, ...['I мөч', 'II мөч', 'III мөч', 'IV мөч'].filter((x) => x !== answer)],
        explanation: `x ${x > 0 ? 'эерэг' : 'сөрөг'}, y ${y > 0 ? 'эерэг' : 'сөрөг'} тул ${answer}-д оршино.`,
      };
    }
    case 'segments': {
      const n = int(rng, 3, Math.min(12, max));
      const answer = (n * (n - 1)) / 2;
      return {
        prompt: `Нэг шулуун дээр ${n} цэг тэмдэглэв. Хоёр цэгээр тогтох хэдэн хэрчим байх вэ?`,
        options: numeric(answer, [n, n * 2, answer - 1], rng),
        explanation: `Хос цэгийн тоо C(${n}, 2) = ${n} · ${n - 1} : 2 = ${answer}.`,
      };
    }
    case 'angle': {
      const angle = int(rng, 2, 16) * 10;
      const equal = rng() < 0.5;
      const answer = equal ? angle : 180 - angle;
      return {
        prompt: `Нэг өнцөг ${angle}°. Түүнтэй ${equal ? 'босоо буюу солбисон' : 'хамар'} өнцгийн хэмжээг олоорой.`,
        options: numeric(answer, [angle, 180 - angle, 360 - angle], rng, 10),
        explanation: equal ? `Босоо болон солбисон өнцгүүд тэнцүү тул ${answer}°.` : `Хамар өнцгүүдийн нийлбэр 180° тул ${answer}°.`,
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
      const n = int(rng, 4, atLevel(level, [9, 12, 15]));
      const answer = (n - 2) * 180;
      return {
        prompt: `Гүдгэр ${n} өнцөгтийн дотоод өнцгүүдийн нийлбэр хэд вэ?`,
        options: numeric(answer, [n * 180, (n - 1) * 180, 360], rng, 180),
        explanation: `Томьёогоор (n − 2) · 180° = (${n} − 2) · 180° = ${answer}°.`,
      };
    }
    case 'triangle-inequality': {
      const a = int(rng, 3, max);
      const b = int(rng, 3, max);
      const answer = a + b - 1;
      return {
        prompt: `Гурвалжны хоёр тал ${a} см, ${b} см. Аль урт гурав дахь тал байж болох вэ?`,
        options: numeric(answer, [a + b, a + b + 1, Math.abs(a - b)], rng),
        explanation: `Гурав дахь тал нь |${a} − ${b}|-аас их, ${a + b}-аас бага байх ёстой; ${answer} тохирно.`,
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
        options: numeric(answer, [180 - answer, a + b + c, 360 - a - b], rng, 10),
        explanation: `Дөрвөн өнцөгтийн өнцгүүдийн нийлбэр 360° тул хариу ${answer}°.`,
      };
    }
    case 'exterior-angle': {
      const interior = int(rng, 4, 14) * 10;
      const answer = 180 - interior;
      return {
        prompt: `Гурвалжны нэг дотоод өнцөг ${interior}° бол түүнтэй хамар гадаад өнцгийг олоорой.`,
        options: numeric(answer, [interior, 360 - interior, 90 - interior], rng, 10),
        explanation: `Дотоод ба түүнтэй хамар гадаад өнцгийн нийлбэр 180° тул ${answer}°.`,
      };
    }
    case 'circle': {
      const r = int(rng, 2, max);
      const area = rng() < 0.5;
      const coefficient = area ? r * r : 2 * r;
      const answer = `${coefficient}π`;
      return {
        prompt: `Радиус нь ${r} см тойргийн ${area ? 'дугуйн талбайг' : 'тойргийн уртыг'} π-тэй хэлбэрээр олоорой.`,
        options: four(answer, [`${r}π`, `${2 * r * r}π`, `${r + r}π`], () => `${int(rng, 2, max * max)}π`),
        explanation: area ? `Талбайн томьёогоор S = πr² = π · ${r}² = ${answer}.` : `Уртын томьёогоор C = 2πr = 2π · ${r} = ${answer}.`,
      };
    }
    case 'solid': {
      const n = int(rng, 3, atLevel(level, [5, 8, 12]));
      const ask = pick(rng, ['faces', 'edges', 'vertices'] as const);
      const answer = ask === 'faces' ? n + 2 : ask === 'edges' ? 3 * n : 2 * n;
      return {
        prompt: `Суурь нь ${n} өнцөгт призм хэдэн ${ask === 'faces' ? 'талстай' : ask === 'edges' ? 'ирмэгтэй' : 'оройтой'} вэ?`,
        options: numeric(answer, [n, 2 * n, 3 * n, n + 2], rng),
        explanation: `n өнцөгт призм ${n + 2} тал, ${3 * n} ирмэг, ${2 * n} оройтой.`,
      };
    }
    case 'triangle-congruence': {
      const side = int(rng, 2, max);
      const other = int(rng, 2, max);
      return {
        prompt: `△ABC ≅ △DEF бөгөөд AB = ${side} см, BC = ${other} см. DE хэдэн см вэ?`,
        options: numeric(side, [other, side + other, Math.abs(side - other)], rng),
        explanation: `Тэнцүү гурвалжны харгалзах талууд тэнцүү. AB талд DE харгалзах тул DE = ${side} см.`,
      };
    }
    case 'translate': {
      const x = int(rng, -max, max);
      const y = int(rng, -max, max);
      const dx = int(rng, 1, max);
      const dy = int(rng, 1, max);
      const answer = coord(x + dx, y + dy);
      return {
        prompt: `A${coord(x, y)} цэгийг (${dx}; ${dy}) вектороор параллел зөөв. Шинэ координатыг олоорой.`,
        options: four(answer, [coord(x - dx, y - dy), coord(x + dx, y - dy), coord(x - dx, y + dy)], () => coord(int(rng, -max * 2, max * 2), int(rng, -max * 2, max * 2))),
        explanation: `Хоёр координатад векторын утгыг нэмнэ: ${answer}.`,
      };
    }
    case 'reflect':
    case 'central':
    case 'rotate': {
      const x = int(rng, 1, max);
      const y = int(rng, 1, max);
      const overX = rng() < 0.5;
      const answer = kind === 'central' ? coord(-x, -y) : kind === 'rotate' ? coord(-y, x) : overX ? coord(x, -y) : coord(-x, y);
      return {
        prompt: `A${coord(x, y)} цэгийг ${kind === 'central' ? 'координатын эхээр төвийн тэгш хэмээр' : kind === 'rotate' ? 'эхийг тойруулан 90°-аар цагийн зүүний эсрэг' : `${overX ? 'x' : 'y'} тэнхлэгээр тольдон`} хувиргав. Дүрийн координатыг олоорой.`,
        options: four(answer, [coord(-x, y), coord(x, -y), coord(-y, x), coord(y, -x)], () => coord(int(rng, -max, max), int(rng, -max, max))),
        explanation: `Хувиргалтын координатын дүрмийг хэрэглэвэл шинэ цэг ${answer}.`,
      };
    }
    case 'midpoint': {
      const x = int(rng, -max, max);
      const y = int(rng, -max, max);
      const dx = int(rng, 1, max);
      const dy = int(rng, 1, max);
      const answer = coord(x + dx, y + dy);
      return {
        prompt: `A${coord(x, y)}, B${coord(x + 2 * dx, y + 2 * dy)} хэрчмийн дундаж цэгийг олоорой.`,
        options: four(answer, [coord(x + 2 * dx, y + dy), coord(x + dx, y + 2 * dy), coord(dx, dy)], () => coord(int(rng, -max, max * 2), int(rng, -max, max * 2))),
        explanation: `Координат тус бүрийн дунджийг авахад ${answer}.`,
      };
    }
    case 'symmetry-order': {
      const n = int(rng, 3, atLevel(level, [8, 12, 16]));
      return {
        prompt: `Зөв ${n} өнцөгтийн эргүүлэлтийн тэгш хэмийн эрэмбэ хэд вэ?`,
        options: numeric(n, [n - 1, n + 1, 2 * n], rng),
        explanation: `Зөв ${n} өнцөгт нэг бүтэн эргэлтэд өөртэйгөө ${n} удаа давхцана.`,
      };
    }
    case 'time': {
      const hour = int(rng, 13, 23);
      const answer = `${hour - 12}:00`;
      return {
        prompt: `24 цагийн системийн ${hour}:00 цагийг 12 цагийн системээр илэрхийлээрэй.`,
        options: four(answer, [`${hour}:00`, `${hour - 11}:00`, `${24 - hour}:00`], () => `${int(rng, 1, 12)}:00`),
        explanation: `${hour}-оос 12-ыг хасвал оройн ${answer}.`,
      };
    }
    case 'unit':
    case 'traditional-unit':
    case 'area-unit':
    case 'volume-unit': {
      const value = int(rng, 2, max);
      const factor = kind === 'area-unit' ? 10_000 : kind === 'volume-unit' ? 1000 : kind === 'traditional-unit' ? 160 : 100;
      const answer = value * factor;
      const statement = kind === 'area-unit' ? '1 м² = 10000 см²' : kind === 'volume-unit' ? '1 л = 1000 см³' : kind === 'traditional-unit' ? '1 алд = 160 см гэж үзье' : '1 м = 100 см';
      return {
        prompt: `${statement}. ${value} нэгжийг жижиг нэгжээр илэрхийлээрэй.`,
        options: numeric(answer, [value + factor, value * 10, answer / 10], rng, factor),
        explanation: `${value} · ${factor} = ${answer} жижиг нэгж.`,
      };
    }
    case 'rectangle': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const area = rng() < 0.5;
      const answer = area ? a * b : 2 * (a + b);
      return {
        prompt: `Урт нь ${a} см, өргөн нь ${b} см тэгш өнцөгтийн ${area ? 'талбай' : 'периметр'}-г олоорой.`,
        options: numeric(answer, [a + b, a * b, 2 * a + b], rng),
        explanation: area ? `S = a · b = ${a} · ${b} = ${answer} см².` : `P = 2(a + b) = ${answer} см.`,
      };
    }
    case 'box-surface':
    case 'prism-surface': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, 2, max);
      const answer = 2 * (a * b + b * c + a * c);
      return {
        prompt: `Ирмэгүүд нь ${a} см, ${b} см, ${c} см тэгш өнцөгт призмийн гадаргуугийн талбайг олоорой.`,
        options: numeric(answer, [a * b * c, a * b + b * c + a * c, 2 * (a + b + c)], rng),
        explanation: `S = 2(ab + bc + ac) = ${answer} см².`,
      };
    }
    case 'box-volume': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, 2, max);
      const answer = a * b * c;
      return {
        prompt: `Ирмэгүүд нь ${a} см, ${b} см, ${c} см параллелепипедийн эзлэхүүнийг олоорой.`,
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
        prompt: `Суурь нь ${base} см, өндөр нь ${height} см ${parallelogram ? 'параллелограмм' : 'гурвалжин'}ы талбайг олоорой.`,
        options: numeric(answer, [base * height, (base + height) * 2, answer + height], rng),
        explanation: parallelogram ? `S = ah = ${answer} см².` : `S = ah : 2 = ${answer} см².`,
      };
    }
    case 'trapezoid-area': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const h = int(rng, 2, max) * 2;
      const answer = ((a + b) * h) / 2;
      return {
        prompt: `Сууриуд нь ${a} см, ${b} см, өндөр нь ${h} см трапецын талбайг олоорой.`,
        options: numeric(answer, [(a + b) * h, a * b * h, (a * h) / 2], rng),
        explanation: `S = (a + b)h : 2 = (${a} + ${b}) · ${h} : 2 = ${answer} см².`,
      };
    }
    case 'pyramid-surface': {
      const a = int(rng, 2, max);
      const h = int(rng, 2, max) * 2;
      const answer = a * a + 2 * a * h;
      return {
        prompt: `Суурийн тал ${a} см, хажуу талсын өндөр ${h} см зөв дөрвөн өнцөгт пирамидын гадаргуугийн талбайг олоорой.`,
        options: numeric(answer, [a * a + a * h, 4 * a * h, a * a * h], rng),
        explanation: `Суурь ${a * a} см², дөрвөн гурвалжин нийлээд ${2 * a * h} см² тул нийт ${answer} см².`,
      };
    }
    case 'composite-solid': {
      const a = int(rng, 2, max);
      const b = int(rng, 2, max);
      const c = int(rng, 2, max);
      const d = int(rng, 2, max);
      const answer = a * b * c + a * b * d;
      return {
        prompt: `Ижил ${a} см × ${b} см суурьтай, өндөр нь ${c} см ба ${d} см хоёр хайрцгийг нийлүүлэв. Нийт эзлэхүүнийг олоорой.`,
        options: numeric(answer, [a * b * (c - d), a * b * c, (a + b) * (c + d)], rng),
        explanation: `Эзлэхүүнүүдийг нэмбэл ${a * b * c} + ${a * b * d} = ${answer} см³.`,
      };
    }
    case 'data-type': {
      const continuous = rng() < 0.5;
      const subject = pick(rng, continuous ? ['сурагчийн өндөр', 'усны температур', 'гүйсэн хугацаа'] : ['номын тоо', 'сурагчдын тоо', 'онооны тоо']);
      const answer = continuous ? 'Тасралтгүй өгөгдөл' : 'Дискрет өгөгдөл';
      return {
        prompt: `${subject} ямар төрлийн өгөгдөл вэ?`,
        options: four(answer, ['Дискрет өгөгдөл', 'Тасралтгүй өгөгдөл', 'Чанарын өгөгдөл'], () => `Ангилал ${int(rng, 1, 9)}`),
        explanation: continuous ? `Хэмжилт завсрын дурын утга авч болох тул тасралтгүй өгөгдөл.` : `Тоолж бүхэл утгаар бүртгэдэг тул дискрет өгөгдөл.`,
      };
    }
    case 'data-source': {
      const direct = rng() < 0.5;
      const answer = direct ? 'Анхдагч эх үүсвэр' : 'Хоёрдогч эх үүсвэр';
      const source = direct ? `өөрийн ангийн ${int(rng, 10, 40)} сурагчаас авсан судалгаа` : `${2000 + int(rng, 10, 26)} оны нийтлэгдсэн статистикийн тайлан`;
      return {
        prompt: `${source} ямар эх үүсвэр вэ?`,
        options: four(answer, ['Анхдагч эх үүсвэр', 'Хоёрдогч эх үүсвэр', 'Туршилтын алдаа'], () => `Эх үүсвэр ${int(rng, 1, 9)}`),
        explanation: direct ? `Мэдээллийг судлаач өөрөө цуглуулсан тул анхдагч эх үүсвэр.` : `Өмнө нь нийтэлсэн мэдээлэл ашигласан тул хоёрдогч эх үүсвэр.`,
      };
    }
    case 'table':
    case 'chart':
    case 'conclusion': {
      const values = [int(rng, 1, max), int(rng, 1, max), int(rng, 1, max), int(rng, 1, max)];
      const labels = ['А', 'Б', 'В', 'Г'];
      const largest = Math.max(...values);
      const answer = kind === 'table' ? values.reduce((a, b) => a + b, 0) : largest;
      return {
        prompt: `${labels.map((x, i) => `${x}:${values[i]}`).join(', ')} өгөгдлөөс ${kind === 'table' ? 'нийлбэр' : 'хамгийн их утга'}-ийг олоорой.`,
        options: numeric(answer, [...values, values.reduce((a, b) => a + b, 0)], rng),
        explanation: kind === 'table' ? `Бүх утгыг нэмбэл ${answer}.` : `Утгуудыг жишихэд хамгийн их нь ${answer}.`,
      };
    }
    case 'grouped-data':
    case 'mode': {
      const mode = int(rng, 2, max);
      const others = [mode - 1, mode + 1, mode + 2];
      const data = [mode, mode, mode, ...others].sort(() => rng() - 0.5);
      return {
        prompt: `${data.join(', ')} өгөгдлийн ${kind === 'mode' ? 'моод' : 'хамгийн олон давтагдсан утга'}-ыг олоорой.`,
        options: numeric(mode, others, rng),
        explanation: `${mode} утга гурван удаа буюу хамгийн олон давтагдсан.`,
      };
    }
    case 'mean': {
      const center = int(rng, 3, max);
      const d = int(rng, 1, Math.max(2, Math.floor(max / 2)));
      const data = [center - d, center, center, center + d];
      const askRange = rng() < 0.5;
      const answer = askRange ? 2 * d : center;
      return {
        prompt: `${data.join(', ')} өгөгдлийн ${askRange ? 'далайц' : 'арифметик дундаж'}-ыг олоорой.`,
        options: numeric(answer, [center, 2 * d, center + d], rng),
        explanation: askRange ? `Далайц = их утга − бага утга = ${answer}.` : `Нийлбэрийг 4-т хуваахад дундаж ${answer}.`,
      };
    }
    case 'relative-frequency': {
      const total = int(rng, 10, max + 20);
      const success = int(rng, 1, total - 1);
      const answer = fraction(success, total);
      return {
        prompt: `${total} удаагийн туршилтад үйл явдал ${success} удаа тохиолдов. Харьцангуй давтамжийг олоорой.`,
        options: four(answer, [fraction(total - success, total), fraction(success, total + 1), fraction(1, total)], () => fraction(int(rng, 1, total - 1), total)),
        explanation: `Харьцангуй давтамж = ${success}/${total} = ${answer}.`,
      };
    }
  }
}

function templates(grade: 6 | 7, specs: readonly Spec[]): readonly Template[] {
  return specs.map(({ page, title, kind, topic }) => ({
    ref: `math-${grade}:${page}`,
    id: `math${grade}-page-${page}`,
    ...(topic ? { topic } : {}),
    make(rng: Rng, level: Level) {
      const draft = make(kind, rng, level);
      return { ...draft, prompt: `Математик ${grade} · ${title}. ${draft.prompt}` };
    },
  }));
}

export const MATH6_MORE = templates(6, [
  { page: 20, title: 'Хэллэг', kind: 'expression', topic: 'expressions' },
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
  { page: 97, title: 'Параллел, перпендикуляр шулуун', kind: 'angle', topic: 'angles' },
  { page: 98, title: 'Өнцөг', kind: 'angle', topic: 'angles' },
  { page: 101, title: 'Хамар ба босоо өнцөг', kind: 'angle', topic: 'angles' },
  { page: 103, title: 'Гурвалжныг өгсөн тал, өнцгөөр зурах', kind: 'triangle-inequality', topic: 'triangles' },
  { page: 104, title: 'Гурвалжны дотоод өнцгүүдийн нийлбэр', kind: 'triangle', topic: 'triangles' },
  { page: 106, title: 'Олон өнцөгтийн дотоод өнцгүүдийн нийлбэр', kind: 'polygon', topic: 'angles' },
  { page: 108, title: 'Гурвалжны тэнцэтгэл биш', kind: 'triangle-inequality', topic: 'triangles' },
  { page: 109, title: 'Олон өнцөгт', kind: 'polygon', topic: 'angles' },
  { page: 111, title: 'Дөрвөн өнцөгт', kind: 'quadrilateral', topic: 'angles' },
  { page: 114, title: 'Тойрог ба дугуй', kind: 'circle', topic: 'circle' },
  { page: 116, title: 'Биетүүд', kind: 'solid' },
  { page: 120, title: 'Параллел зөөлт', kind: 'translate' },
  { page: 121, title: 'Тэнхлэгийн тэгш хэм', kind: 'reflect' },
  { page: 124, title: 'Төвийн тэгш хэм', kind: 'central' },
  { page: 126, title: 'Тэнцүү дүрс', kind: 'triangle-congruence', topic: 'triangles' },
  { page: 129, title: '12 ба 24 цагийн систем', kind: 'time' },
  { page: 130, title: 'Урт, хүнд, багтаамжийн нэгж', kind: 'unit' },
  { page: 131, title: 'Аналоги болон дижитал хэмжих нэгж', kind: 'unit' },
  { page: 133, title: 'Талбайн нэгж', kind: 'area-unit', topic: 'rectangle_area' },
  { page: 134, title: 'Тэгш өнцөгтийн периметр ба талбай', kind: 'rectangle', topic: 'rectangle_area' },
  { page: 138, title: 'Хэмжигдэхүүн хоорондын хамаарал', kind: 'relation', topic: 'ratio_proportion' },
  { page: 140, title: 'Параллелепипедийн гадаргуугийн талбай', kind: 'box-surface', topic: 'rectangle_area' },
  { page: 142, title: 'Параллелепипедийн эзлэхүүн', kind: 'box-volume', topic: 'rectangle_area' },
  { page: 147, title: 'Өгөгдөл цуглуулах, бүртгэх', kind: 'data-source', topic: 'mean' },
  { page: 148, title: 'Өгөгдлийг дүрслэх', kind: 'chart', topic: 'mean' },
  { page: 153, title: 'Дунджууд ба далайц', kind: 'mean', topic: 'mean' },
  { page: 156, title: 'Хүснэгт, диаграмм, график унших', kind: 'conclusion', topic: 'mean' },
] as const);

export const MATH7_MORE = templates(7, [
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
  { page: 92, title: 'Солбисон өнцөг', kind: 'angle', topic: 'angles' },
  { page: 94, title: 'Гурвалжны дотоод өнцгүүдийн нийлбэр', kind: 'triangle', topic: 'triangles' },
  { page: 96, title: 'Дөрвөн өнцөгтийн дотоод өнцгүүдийн нийлбэр', kind: 'quadrilateral', topic: 'angles' },
  { page: 98, title: 'Гурвалжны гадаад өнцөг', kind: 'exterior-angle', topic: 'triangles' },
  { page: 101, title: 'Дөрвөн өнцөгтийн шинж', kind: 'quadrilateral', topic: 'angles' },
  { page: 104, title: 'Гурвалжны тэнцүүгийн шинжүүд', kind: 'triangle-congruence', topic: 'triangles' },
  { page: 108, title: 'Байгуулалт хийх', kind: 'triangle-inequality', topic: 'triangles' },
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
] as const);
