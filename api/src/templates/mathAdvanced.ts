// Математик 8–10: номын хичээл бүрийн deterministic template.
import { ADVANCED_MATH_CURRICULUM, advancedMathTemplateId, type AdvancedMathKind, type AdvancedMathLesson } from '../config/mathAdvancedCurriculum';
import type { QuestionDraft } from '../llm/types';
import type { Level, Rng, Template } from './index';

type Draft = Omit<QuestionDraft, 'correctIndex' | 'topic'>;

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, values: readonly T[]): T => values[Math.floor(rng() * values.length)];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const factorial = (n: number): number => (n < 2 ? 1 : n * factorial(n - 1));
const signed = (value: number): string => String(value).replace('-', '−');
const nonZeroInt = (rng: Rng, lo: number, hi: number): number => {
  const value = int(rng, lo, hi - 1);
  return value >= 0 ? value + 1 : value;
};
const term = (coefficient: number, variable: string): string => `${coefficient === 1 ? '' : coefficient === -1 ? '−' : signed(coefficient)}${variable}`;
const piTerm = (coefficient: number): string => `${coefficient === 1 ? '' : signed(coefficient)}π`;
const coord = (x: number, y: number): string => `(${signed(x)}; ${signed(y)})`;
const fraction = (a: number, b: number): string => {
  const d = gcd(a, b);
  const numerator = a / d;
  const denominator = b / d;
  return denominator === 1 ? signed(numerator) : `${signed(numerator)}/${denominator}`;
};

function four(correct: string, wrong: readonly string[]): string[] {
  const result = [correct];
  for (const option of wrong) if (option && !result.includes(option) && result.length < 4) result.push(option);
  if (result.length !== 4) throw new Error(`Дөрвөн утгатай сонголт үүссэнгүй: ${[correct, ...wrong].join(' | ')}`);
  return result;
}

function numericOptions(correct: number, wrong: readonly number[], _rng: Rng, step = 1): string[] {
  const okay = (value: number) => Number.isFinite(value) && value !== correct;
  const candidates = [...wrong, correct - step, correct + 2 * step, correct * 2, -correct, correct + 3 * step, correct - 2 * step];
  return four(signed(correct), candidates.filter(okay).map(signed));
}

function numericDraft(prompt: string, answer: number, wrong: readonly number[], explanation: string, rng: Rng, step = 1): Draft {
  return { prompt, options: numericOptions(answer, wrong, rng, step), explanation };
}

function choiceDraft(prompt: string, answer: string, wrong: readonly string[], explanation: string, _rng: Rng): Draft {
  return {
    prompt,
    options: four(answer, wrong),
    explanation,
  };
}

/** Түвшний агуулгыг тухайн сэдвийн generator шийднэ; энд зөвхөн тоон сонголт байгуулна. */
function stagedNumber(stem: string, base: number, explanation: string, rng: Rng, level: Level, step = 1): Draft {
  const spread = step * level;
  return numericDraft(stem, base, [base - spread, base + 2 * spread, base * 2], explanation, rng, spread);
}

function make(kind: AdvancedMathKind, title: string, rng: Rng, level: Level): Draft {
  const size = level === 1 ? 8 : level === 2 ? 14 : 20;
  switch (kind) {
    case 'rational': {
      const d = int(rng, 3, size);
      const a = int(rng, 1, d - 1);
      const b = int(rng, 1, d - 1);
      const answer = fraction(a + b, d);
      return choiceDraft(
        `${a}/${d} + ${b}/${d} рационал тоонуудын нийлбэрийг олоорой.`,
        answer,
        [fraction(a + b + 1, d), fraction(Math.max(1, a + b - 1), d), fraction(a + b, d + 1), fraction(a + b, 2 * d), fraction(a * b, d * d)],
        `Ижил хуваарьтай тул хүртвэрүүдийг нэмнэ: (${a} + ${b})/${d} = ${answer}.`,
        rng,
      );
    }
    case 'irrational': {
      const root = int(rng, 3, size);
      const nonSquare = root * root + int(rng, 1, root);
      const answer = `√${nonSquare}`;
      return choiceDraft(
        `n = ${nonSquare} үед дараах тоонуудаас аль нь иррационал тоо вэ?`,
        answer,
        [`${root}/${root + 1}`, signed(root * root), `0.${int(rng, 1, 9)}`],
        `${nonSquare} нь бүтэн квадрат биш тул √${nonSquare} төгсгөлгүй, үелэхгүй аравтын бутархай буюу иррационал тоо.`,
        rng,
      );
    }
    case 'rounding': {
      const place = level === 1 ? 10 : level === 2 ? 100 : 1000;
      const value = int(rng, place + 1, place * size) + int(rng, 1, place - 1);
      const answer = Math.round(value / place) * place;
      return stagedNumber(
        `${value} тоог ${place === 10 ? 'аравт' : place === 100 ? 'зуут' : 'мянгат'} хүртэл тоймлоорой.`,
        answer,
        `Дараагийн орны цифрийг харвал ${value} тоо ${answer} болж тоймлогдоно.`,
        rng,
        level,
        place,
      );
    }
    case 'arithmetic': {
      const a = int(rng, 4, size);
      const b = int(rng, 2, a - 1);
      const c = int(rng, 2, 6);
      const answer = (a - b) * c;
      return stagedNumber(`(${a} − ${b}) · ${c} илэрхийллийн утгыг олоорой.`, answer, `Эхлээд хаалтан доторхыг бодно: (${a} − ${b}) · ${c} = ${answer}.`, rng, level);
    }
    case 'power': {
      if (title.includes('Рационал')) {
        const root = int(rng, 2, 5);
        const denominator = pick(rng, [2, 3] as const);
        const numerator = pick(rng, denominator === 2 ? ([1, 3, 5] as const) : ([1, 2, 4, 5] as const));
        const base = root ** denominator;
        const answer = root ** numerator;
        return stagedNumber(
          `${base}^(${numerator}/${denominator}) утгыг олоорой.`,
          answer,
          `${base} = ${root}^${denominator} тул ${base}^(${numerator}/${denominator}) = ${root}^${numerator} = ${answer}.`,
          rng,
          level,
        );
      }
      const base = int(rng, 2, 7);
      const p = int(rng, 2, size);
      const q = int(rng, 1, size);
      const answer = p + q;
      const sign = '·';
      return stagedNumber(
        `${base}^${p} ${sign} ${base}^${q} = ${base}^n бол n-ийг олоорой.`,
        answer,
        sign === '·' ? `Ижил суурьтай зэргүүдийг үржүүлэхэд илтгэгчийг нэмнэ: n = ${p} + ${q} = ${answer}.` : `Ижил суурьтай зэргүүдийг хуваахад илтгэгчийг хасна: n = ${p} − ${q} = ${signed(answer)}.`,
        rng,
        level,
      );
    }
    case 'root': {
      const a = int(rng, 2, size);
      const b = int(rng, 2, Math.min(size, 10));
      const answer = a + b;
      return stagedNumber(`√${a * a} + ∛${b * b * b} илэрхийллийн утгыг олоорой.`, answer, `√${a * a} = ${a}, ∛${b * b * b} = ${b} тул нийлбэр нь ${answer}.`, rng, level);
    }
    case 'standard-form': {
      const a = int(rng, 2, 9);
      const b = int(rng, 2, 9);
      const p = int(rng, 2, size);
      const q = int(rng, 1, p);
      const coefficient = a * b;
      const carry = coefficient >= 10 ? 1 : 0;
      const answer = p - q + carry;
      return stagedNumber(
        `(${a} · 10^${p}) · (${b} · 10^−${q}) үржвэрийг стандарт хэлбэрт бичихэд 10-ын илтгэгч хэд болох вэ?`,
        answer,
        `${a} · ${b} = ${coefficient}, 10-ын илтгэгч ${p} − ${q}${carry ? ' бөгөөд коэффициентийг нэг орон шилжүүлнэ' : ''}; эцсийн илтгэгч ${answer}.`,
        rng,
        level,
      );
    }
    case 'percent': {
      const percent = pick(rng, [10, 20, 25, 40, 50] as const);
      const base = int(rng, 3, size) * 20;
      const discount = (base * percent) / 100;
      const answer = level === 1 ? discount : base - discount;
      const stem = level === 1 ? `${base} тооны ${percent}%-ийг олоорой.` : `${base} төгрөгийн үнийг ${percent}%-аар бууруулбал шинэ үнэ хэд болох вэ?`;
      const explanation = level === 1 ? `Тооцоолбол ${base} · ${percent} : 100 = ${answer}.` : `Хямдрал ${discount}, шинэ үнэ ${base} − ${discount} = ${answer}.`;
      return stagedNumber(stem, answer, explanation, rng, level);
    }
    case 'ratio': {
      const a = int(rng, 2, 7);
      const b = int(rng, 2, 7);
      const unit = int(rng, 2, size);
      const total = (a + b) * unit;
      const answer = a * unit;
      return stagedNumber(`${total} ширхэг зүйлийг ${a}:${b} харьцаагаар хуваахад эхний хэсэг хэд болох вэ?`, answer, `Нэг хэсэг ${total} : ${a + b} = ${unit}, эхний хэсэг ${a} · ${unit} = ${answer}.`, rng, level);
    }
    case 'scale': {
      const scale = pick(rng, [100, 200, 500, 1000] as const);
      const map = int(rng, 2, size);
      const answer = (map * scale) / 100;
      return stagedNumber(`1:${scale} масштабтай төлөвлөгөөнд хэмжсэн ${map} см урт бодит байдалд хэдэн метр вэ?`, answer, `Хэмжээг хөрвүүлбэл ${map} · ${scale} = ${map * scale} см = ${answer} м.`, rng, level);
    }
    case 'inverse-proportion': {
      if (title.includes('график')) {
        const x = int(rng, 2, size);
        const y = int(rng, 2, size);
        const k = x * y;
        const answer = coord(x, y);
        return choiceDraft(
          `y = ${k}/x урвуу пропорционал хамаарлын график дээр орших цэгийг сонгоорой.`,
          answer,
          [coord(x, y + 1), coord(x + 1, y), coord(-x, y)],
          `${x} · ${y} = ${k} тул ${answer} цэг y = ${k}/x график дээр оршино.`,
          rng,
        );
      }
      const workers = int(rng, 2, 8);
      const days = int(rng, 2, size) * 2;
      const newWorkers = workers * 2;
      const answer = days / 2;
      return stagedNumber(`${workers} ажилчин ажлыг ${days} өдөрт хийдэг. Ижил бүтээмжтэй ${newWorkers} ажилчин хэдэн өдөрт хийх вэ?`, answer, `Ажилчны тоо 2 дахин өсөхөд хугацаа 2 дахин багасна: ${days} : 2 = ${answer}.`, rng, level);
    }
    case 'set-operation': {
      const onlyA = int(rng, 2, size);
      const onlyB = int(rng, 2, size);
      const both = int(rng, 1, size);
      const answer = onlyA + onlyB + both;
      return stagedNumber(`A олонлогт зөвхөн ${onlyA}, B олонлогт зөвхөн ${onlyB}, огтлолцолд ${both} элемент байна. A ∪ B хэдэн элементтэй вэ?`, answer, `Нэгдэлд гурван хэсгийг нэг удаа тоолно: ${onlyA} + ${onlyB} + ${both} = ${answer}.`, rng, level);
    }
    case 'event-relation': {
      const sides = pick(rng, [6, 8, 10, 12] as const);
      const scenario = pick(rng, [
        {
          prompt: `${sides} талт шоог нэг орхиход “тэгш тоо буух” ба “2-оос их тоо буух” үзэгдлүүд ямар хамааралтай вэ?`,
          answer: 'Нийцтэй үзэгдлүүд',
          explanation: '4, 6 зэрэг үр дүн хоёр үзэгдэлд зэрэг хамаарах тул нийцтэй.',
        },
        {
          prompt: `${sides} талт шоог нэг орхиход “2-оос бага тоо буух” ба “4-өөс их тоо буух” үзэгдлүүд ямар хамааралтай вэ?`,
          answer: 'Нийцгүй үзэгдлүүд',
          explanation: 'Нэг үр дүн 2-оос бага бөгөөд 4-өөс их байж чадахгүй тул нийцгүй.',
        },
        {
          prompt: `${sides} талт шоог нэг орхиход “тэгш тоо буух” ба “сондгой тоо буух” үзэгдлүүд ямар хамааралтай вэ?`,
          answer: 'Эсрэг үзэгдлүүд',
          explanation: 'Хоёр үзэгдэл зэрэг биелэхгүй бөгөөд бүх боломжит үр дүнг хамардаг тул эсрэг.',
        },
        {
          prompt: `Зоос болон ${sides} талт шоог зэрэг орхиход “сүлд буух” ба “шоонд тэгш тоо буух” үзэгдлүүд ямар хамааралтай вэ?`,
          answer: 'Хамааралгүй үзэгдлүүд',
          explanation: 'Зоосны үр дүн шооны үр дүнгийн магадлалд нөлөөлөхгүй тул хамааралгүй.',
        },
      ] as const);
      return choiceDraft(
        scenario.prompt,
        scenario.answer,
        ['Нийцтэй үзэгдлүүд', 'Нийцгүй үзэгдлүүд', 'Эсрэг үзэгдлүүд', 'Хамааралгүй үзэгдлүүд'].filter((item) => item !== scenario.answer),
        scenario.explanation,
        rng,
      );
    }
    case 'probability': {
      const red = int(rng, 2, size);
      const blue = int(rng, 2, size);
      const total = red + blue;
      const compound = title.includes('Нийлмэл') || level === 3;
      const answer = compound ? fraction(red * (red - 1), total * (total - 1)) : fraction(red, total);
      return choiceDraft(
        `Уутанд ${red} улаан, ${blue} цэнхэр бөмбөг байна. ${compound ? 'Буцааж хийхгүйгээр дараалан хоёр улаан' : 'Нэг улаан'} бөмбөг авах магадлалыг олоорой.`,
        answer,
        [fraction(blue, total), fraction(red, total + 1), compound ? fraction(red * red, total * total) : fraction(1, total), fraction(red + 1, total), fraction(red, total - 1)],
        compound ? `Магадлал ${red}/${total} · ${red - 1}/${total - 1} = ${answer}.` : `Тааламжтай ${red} үр дүнг нийт ${total}-д хуваавал ${answer}.`,
        rng,
      );
    }
    case 'polynomial': {
      const a = int(rng, 2, size);
      const b = int(rng, 2, size);
      const c = int(rng, 1, size);
      const x = int(rng, 2, 6);
      const answer = (a + b) * x - c;
      return stagedNumber(`${a}x + ${b}x − ${c} илэрхийллийн x = ${x} үеийн утгыг олоорой.`, answer, `Ижил гишүүдийг нэгтгээд (${a + b}) · ${x} − ${c} = ${signed(answer)}.`, rng, level);
    }
    case 'identity': {
      const a = int(rng, 2, size);
      const b = int(rng, 2, size);
      const answer = (a + b) ** 2;
      return stagedNumber(`(${a} + ${b})²-ыг нийлбэрийн квадратын томьёогоор бодоорой.`, answer, `Томьёогоор ${a}² + 2 · ${a} · ${b} + ${b}² = ${answer}.`, rng, level);
    }
    case 'factorization': {
      const a = int(rng, 2, size);
      const drawn = int(rng, 2, size);
      const b = drawn === a ? (drawn === size ? 2 : drawn + 1) : drawn;
      const answer = `${a}(x + ${b})`;
      return choiceDraft(
        `${a}x + ${a * b} илэрхийллийг үржигдэхүүн болгон задлаарай.`,
        answer,
        [`${a}(x + ${a * b})`, `${b}(x + ${a})`, `${a}x(x + ${b})`],
        `Ерөнхий үржигдэхүүн ${a}-г хаалтаас гаргавал ${answer}.`,
        rng,
      );
    }
    case 'algebraic-fraction': {
      const x = int(rng, 3, size);
      const a = int(rng, 1, x - 1);
      const b = int(rng, 2, size);
      if (title.includes('үржүүлэх')) {
        const answer = fraction(1, b);
        return choiceDraft(
          `(x/${a}) · (${a}/(${b}x)) алгебрын бутархайн үржвэрийг хялбарчлаарай.`,
          answer,
          [`x/${b}`, `${a}/${b}`, `${b}`, `${b}/x`, `${a}x/${b}`],
          `x, ${a} үржигдэхүүнүүд хураагдаж, хариу ${answer} болно.`,
          rng,
        );
      }
      if (title.includes('нэмэх')) {
        const c = int(rng, 1, size);
        const answer = fraction(a + c, x);
        return choiceDraft(
          `x = ${x} үед ${a}/x + ${c}/x илэрхийллийн утгыг олоорой.`,
          answer,
          [fraction(a + c, 2 * x), fraction(a * c, x), fraction(Math.abs(a - c) || 1, x), fraction(a + c + 1, x), fraction(a + c, x + 1)],
          `Ижил хуваарьтай тул хүртвэрүүдийг нэмнэ: (${a} + ${c})/${x} = ${answer}.`,
          rng,
        );
      }
      const answer = b;
      return stagedNumber(`((x − ${a}) · ${b})/(x − ${a}) илэрхийллийн x = ${x} үеийн утгыг олоорой.`, answer, `x − ${a} ≠ 0 тул ижил үржигдэхүүнийг хураахад ${b}.`, rng, level);
    }
    case 'equation': {
      const x = int(rng, 2, size);
      if (title.includes('Квадрат')) {
        const other = int(rng, 1, size);
        const answer = x + other;
        return stagedNumber(`x² − ${answer}x + ${x * other} = 0 тэгшитгэлийн язгууруудын нийлбэрийг олоорой.`, answer, `Үржигдэхүүнд задлавал (x − ${x})(x − ${other}) = 0, нийлбэр нь ${answer}.`, rng, level);
      }
      const a = int(rng, 2, size);
      const b = int(rng, 1, size);
      const right = a * x + b;
      return stagedNumber(`${a}x + ${b} = ${right} тэгшитгэлийг бодоорой.`, x, `${a}x = ${right - b}, тэгэхээр x = ${x}.`, rng, level);
    }
    case 'linear-system': {
      const x = int(rng, 1, size);
      const y = int(rng, 1, size);
      if (title.includes('график')) {
        const firstSlope = int(rng, 1, 4);
        const secondSlope = -int(rng, 1, 4);
        const firstIntercept = y - firstSlope * x;
        const secondIntercept = y - secondSlope * x;
        const firstSign = firstIntercept < 0 ? `− ${Math.abs(firstIntercept)}` : `+ ${firstIntercept}`;
        const secondSign = secondIntercept < 0 ? `− ${Math.abs(secondIntercept)}` : `+ ${secondIntercept}`;
        const answer = coord(x, y);
        return choiceDraft(
          `y = ${term(firstSlope, 'x')} ${firstSign} ба y = ${term(secondSlope, 'x')} ${secondSign} шулууны графикуудын огтлолцлын цэгийг сонгоорой.`,
          answer,
          [coord(y, x), coord(x + 1, y), coord(x, y + 1), coord(x - 1, y), coord(x, y - 1)],
          `Хоёр тэгшитгэлд x = ${x}-ийг орлуулахад y = ${y} тул огтлолцлын цэг ${answer}.`,
          rng,
        );
      }
      const sum = x + y;
      const diff = x - y;
      return stagedNumber(`x + y = ${sum}, x − y = ${signed(diff)} системийн x-ийг олоорой.`, x, `Тэгшитгэлүүдийг нэмбэл 2x = ${2 * x}, иймд x = ${x}.`, rng, level);
    }
    case 'inequality': {
      const a = int(rng, 2, size);
      const boundary = int(rng, 1, size);
      const right = a * boundary;
      if (title.includes('Хоёр хувьсагчтай')) {
        const answer = coord(boundary - 1, 0);
        return choiceDraft(
          `x + y < ${boundary} хагас хавтгайд орших цэгийг сонгоорой.`,
          answer,
          [coord(boundary, 0), coord(boundary, 1), coord(boundary + 1, 0)],
          `${boundary - 1} + 0 = ${boundary - 1} < ${boundary} тул ${answer} цэг шийдийн мужид орно.`,
          rng,
        );
      }
      const answer = `x < ${boundary}`;
      return choiceDraft(
        `${a}x < ${right} тэнцэтгэл бишийн шийдийг сонгоорой.`,
        answer,
        [`x > ${boundary}`, `x ≤ ${boundary}`, `x < ${right}`],
        `Эерэг ${a} тоонд хуваахад тэмдэг өөрчлөгдөхгүй: x < ${boundary}.`,
        rng,
      );
    }
    case 'sequence':
    case 'arithmetic-progression': {
      const first = int(rng, 1, size);
      const d = int(rng, 2, size);
      const index = int(rng, 5, 12);
      const answer = first + (index - 1) * d;
      return stagedNumber(`${first}, ${first + d}, ${first + 2 * d}, … арифметик дарааллын ${index}-р гишүүнийг олоорой.`, answer, `aₙ = a₁ + (n − 1)d тул ${first} + (${index} − 1) · ${d} = ${answer}.`, rng, level);
    }
    case 'linear-function': {
      const k = int(rng, 2, size);
      const b = int(rng, 1, size);
      const x = int(rng, 1, size);
      if (title.includes('тодорхойлогдох')) {
        const excluded = int(rng, -size, size);
        const answer = `x ≠ ${signed(excluded)}`;
        return choiceDraft(
          `f(x) = 1/(x ${excluded < 0 ? '+' : '−'} ${Math.abs(excluded)}) функцийн тодорхойлогдох мужийн нөхцөлийг сонгоорой.`,
          answer,
          [`x = ${signed(excluded)}`, `x > ${signed(excluded)}`, `x < ${signed(excluded)}`],
          `Хуваарь тэг байж болохгүй тул x ${excluded < 0 ? '+' : '−'} ${Math.abs(excluded)} ≠ 0, өөрөөр хэлбэл ${answer}.`,
          rng,
        );
      }
      if (title === 'Шулууны тэгшитгэл') {
        const answer = `y = ${k}x + ${b}`;
        return choiceDraft(
          `Налалт нь ${k}, y тэнхлэгийг (0; ${b}) цэгт огтолдог шулууны тэгшитгэлийг сонгоорой.`,
          answer,
          [`y = ${term(b, 'x')} + ${k}`, `y = ${k}x − ${b}`, `x = ${k}y + ${b}`, `y = ${k + 1}x + ${b}`],
          `Шулууны y = kx + b хэлбэрт налалт k = ${k}, эхлэл b = ${b} тул ${answer}.`,
          rng,
        );
      }
      const answer = k * x + b;
      return stagedNumber(`y = ${k}x + ${b} функцийн x = ${x} үеийн y-г олоорой.`, answer, `x-ийн оронд ${x}-ийг тавивал y = ${k} · ${x} + ${b} = ${answer}.`, rng, level);
    }
    case 'slope': {
      if (title.includes('шүргэгч')) {
        const x = int(rng, 1, size);
        const answer = 2 * x;
        return stagedNumber(`y = x² муруйн x = ${x} цэг дээрх шүргэгчийн налалтыг олоорой.`, answer, `y = x² функцийн тухайн цэгийн налалт 2x тул 2 · ${x} = ${answer}.`, rng, level);
      }
      const x1 = int(rng, 0, size);
      const dx = int(rng, 1, 6);
      const y1 = int(rng, 0, size);
      const slope = int(rng, 1, 7);
      const x2 = x1 + dx;
      const y2 = y1 + slope * dx;
      return stagedNumber(`A${coord(x1, y1)}, B${coord(x2, y2)} цэгүүдийг дайрсан шулууны налалтыг олоорой.`, slope, `Налалтын томьёогоор k = (${y2} − ${y1})/(${x2} − ${x1}) = ${slope}.`, rng, level);
    }
    case 'quadratic-function': {
      const a = int(rng, 1, 5);
      const x = int(rng, 2, size);
      const b = int(rng, 1, size);
      const answer = a * x * x - b;
      return stagedNumber(`y = ${term(a, 'x²')} − ${b} функцийн x = ${x} үеийн утгыг олоорой.`, answer, `Орлуулбал y = ${a} · ${x}² − ${b} = ${signed(answer)}.`, rng, level);
    }
    case 'inverse-function': {
      const a = int(rng, 2, size);
      const b = int(rng, 1, size);
      const y = a * int(rng, 2, size) + b;
      const answer = (y - b) / a;
      return stagedNumber(`f(x) = ${a}x + ${b}. f⁻¹(${y}) утгыг олоорой.`, answer, `${y} = ${a}x + ${b} тэгшитгэлийг урвуу бодоход x = (${y} − ${b}) : ${a} = ${answer}.`, rng, level);
    }
    case 'power-function': {
      const exponent = int(rng, 2, level === 3 ? 5 : 4);
      const x = int(rng, 2, level === 3 ? 5 : 4);
      const answer = x ** exponent;
      return stagedNumber(`y = x^${exponent} зэрэгт функцийн x = ${x} үеийн утгыг олоорой.`, answer, `Орлуулбал y = ${x}^${exponent} = ${answer}.`, rng, level);
    }
    case 'exponential-function': {
      const base = int(rng, 2, 5);
      const exponent = int(rng, 2, level === 3 ? 6 : 4);
      if (title.includes('тэгшитгэл')) {
        return stagedNumber(`${base}^x = ${base}^${exponent} илтгэгч тэгшитгэлийг бодоорой.`, exponent, `Сууриуд ижил тул илтгэгчүүд тэнцүү: x = ${exponent}.`, rng, level);
      }
      const answer = base ** exponent;
      return stagedNumber(`y = ${base}^x илтгэгч функцийн x = ${exponent} үеийн утгыг олоорой.`, answer, `Орлуулбал y = ${base}^${exponent} = ${answer}.`, rng, level);
    }
    case 'polygon-angle': {
      const sides = int(rng, 4, level === 3 ? 16 : 10);
      const answer = (sides - 2) * 180;
      return stagedNumber(`Гүдгэр ${sides} өнцөгтийн дотоод өнцгүүдийн нийлбэрийг олоорой.`, answer, `Томьёогоор (n − 2) · 180° = (${sides} − 2) · 180° = ${answer}°.`, rng, level, 180);
    }
    case 'triangle-lines': {
      const side = int(rng, 3, size) * 2;
      const answer = side / 2;
      if (title.includes('чанар')) {
        return stagedNumber(`Тэгш өнцөгт гурвалжны гипотенуз ${side} см. Тэгш өнцгийн оройгоос гипотенузад татсан медианы уртыг олоорой.`, answer, `Тэгш өнцөгт гурвалжинд гипотенузад татсан медиан гипотенузын хагастай тэнцүү: ${side} : 2 = ${answer} см.`, rng, level);
      }
      return stagedNumber(`Гурвалжны нэг тал ${side} см. Түүнтэй параллел дундаж шугамын уртыг олоорой.`, answer, `Гурвалжны дундаж шугам харгалзах талын хагастай тэнцүү: ${side} : 2 = ${answer} см.`, rng, level);
    }
    case 'pythagoras': {
      const triple = pick(rng, [[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const);
      const factor = int(rng, 1, level === 3 ? 5 : 3);
      const [a, b, c] = triple.map((value) => value * factor);
      return stagedNumber(`Катетууд нь ${a} см, ${b} см тэгш өнцөгт гурвалжны гипотенузыг олоорой.`, c, `c = √(${a}² + ${b}²) = ${c} см.`, rng, level);
    }
    case 'circle': {
      if (title.includes('тэгшитгэл')) {
        const radius = int(rng, 2, size);
        return choiceDraft(`Координатын эх дээр төвтэй, радиус нь ${radius} тойргийн тэгшитгэлийг сонгоорой.`, `x² + y² = ${radius * radius}`, [`x + y = ${radius}`, `x² + y² = ${radius}`, `x² − y² = ${radius * radius}`], `Төв нь координатын эх дээр байх тойргийн тэгшитгэл x² + y² = r² тул r² = ${radius * radius}.`, rng);
      }
      if (title.includes('хөвч')) {
        const external = int(rng, 2, size);
        const factor = int(rng, 2, 4);
        const full = external * factor * factor;
        const tangent = external * factor;
        return stagedNumber(`Тойргийн гаднах нэг цэгээс татсан огтлогчийн гаднах хэсэг ${external} см, бүтэн урт ${full} см. Тэр цэгээс татсан шүргэгчийн уртыг олоорой.`, tangent, `Шүргэгчийн квадрат = гаднах хэсэг · бүтэн огтлогч тул √(${external} · ${full}) = ${tangent} см.`, rng, level);
      }
      const angle = int(rng, 2, 8) * 10;
      const inscribed = title.includes('багтсан') || title.includes('Төв өнцөг');
      const answer = inscribed ? angle / 2 : 90;
      const radius = int(rng, 2, size);
      const prompt = inscribed ? `Нэг нумд тулсан төв өнцөг ${angle}° бол түүнд тулсан тойрогт багтсан өнцгийг олоорой.` : `Радиус нь ${radius} см тойргийн шүргэгч ба шүргэлтийн цэгт татсан радиусын хоорондох өнцгийг олоорой.`;
      return stagedNumber(prompt, answer, inscribed ? `Багтсан өнцөг төв өнцгийн хагастай тэнцүү: ${angle}° : 2 = ${answer}°.` : 'Шүргэгч нь шүргэлтийн цэгт татсан радиуст перпендикуляр тул 90°.', rng, level, 5);
    }
    case 'construction':
      if (title.includes('геометр байр'))
        return choiceDraft(
          `A, B хоёр цэгээс ижил зайд орших бүх цэгийн геометр байрыг сонгоорой. AB = ${int(rng, 3, size)} см.`,
          'AB хэрчмийн дундаж перпендикуляр',
          ['AB шулуун', 'A төвтэй тойрог', 'AB хэрчим'],
          'Хэрчмийн дундаж перпендикулярын цэг бүр хоёр төгсгөлөөс ижил зайд оршино.',
          rng,
        );
      return choiceDraft(
        `Талын урт нь ${int(rng, 4, size)} см зөв зургаан өнцөгтийг тойрогт байгуулахад гортигийн радиусыг юутай тэнцүү авах вэ?`,
        'Зургаан өнцөгтийн талтай тэнцүү',
        ['Талын хагас', 'Талын хоёр дахин урт', 'Тойргийн диаметртэй тэнцүү'],
        'Тойрогт багтсан зөв зургаан өнцөгтийн тал нь тухайн тойргийн радиустай тэнцүү.',
        rng,
      );
    case 'similarity': {
      const scale = int(rng, 2, 6);
      const side = int(rng, 2, size);
      const areaQuestion = title.includes('талбайн харьцаа');
      if (title.includes('Гомотет')) {
        const x = nonZeroInt(rng, -size, size);
        const y = nonZeroInt(rng, -size, size);
        const answer = coord(x * scale, y * scale);
        return choiceDraft(`Төв нь координатын эх, коэффициент нь ${scale} байх гомотетоор A${coord(x, y)} цэгийг хувиргав. Дүрийн координатыг олоорой.`, answer, [coord(x + scale, y + scale), coord(x * scale, y), coord(x, y * scale)], `Координат бүрийг ${scale}-аар үржүүлбэл ${answer}.`, rng);
      }
      if (title.includes('гурвалж')) {
        const small = int(rng, 2, size);
        const answer = small * scale;
        return stagedNumber(`Төсөөтэй хоёр гурвалжны харгалзах талуудын харьцаа 1:${scale}. Бага гурвалжны тал ${small} см бол их гурвалжны харгалзах талыг олоорой.`, answer, `${small} · ${scale} = ${answer} см.`, rng, level);
      }
      const answer = areaQuestion ? scale * scale : side * scale;
      const stem = areaQuestion ? `Төсөөтэй хоёр дүрсний уртын харьцаа 1:${scale} бол талбайн харьцааны их гишүүнийг олоорой.` : `Төсөөтэй хоёр дүрсний периметрийн харьцаа 1:${scale}. Бага дүрсний периметр ${side} см бол их дүрсний периметрийг олоорой.`;
      return stagedNumber(stem, answer, areaQuestion ? `Талбайн харьцаа уртын харьцааны квадрат тул 1:${scale * scale}.` : `${side} · ${scale} = ${answer} см.`, rng, level);
    }
    case 'transform': {
      const x = nonZeroInt(rng, -size, size);
      const y = nonZeroInt(rng, -size, size);
      const dx = int(rng, 1, size);
      const dy = int(rng, 1, size);
      if (title.includes('Цэгийн хувь')) {
        const answer = coord(-x, -y);
        return choiceDraft(`A${coord(x, y)} цэгийг координатын эхийн хувьд тэгш хэмээр хувиргав. Дүрийн координатыг олоорой.`, answer, [coord(x, -y), coord(-x, y), coord(y, x), coord(-y, -x), coord(x, y)], `Хоёр координатын тэмдгийг сольбол ${answer}.`, rng);
      }
      if (title.includes('Тэнхлэгийн')) {
        const answer = coord(x, -y);
        return choiceDraft(`A${coord(x, y)} цэгийг x тэнхлэгийн хувьд тэгш хэмээр хувиргав. Дүрийн координатыг олоорой.`, answer, [coord(-x, y), coord(-x, -y), coord(y, x), coord(-y, x), coord(x, y)], `x координат хэвээр, y-ийн тэмдэг солигдоно: ${answer}.`, rng);
      }
      if (title.includes('Эргүүлэлт')) {
        const answer = coord(-y, x);
        return choiceDraft(`A${coord(x, y)} цэгийг координатын эхийг тойруулан цагийн зүүний эсрэг 90° эргүүлэв. Дүрийн координатыг олоорой.`, answer, [coord(y, -x), coord(-x, -y), coord(y, x), coord(x, -y), coord(x, y)], `(x; y) → (−y; x) дүрмээр ${answer}.`, rng);
      }
      if (title.includes('Дараалсан')) {
        const answer = coord(x + dx, -(y + dy));
        return choiceDraft(
          `A${coord(x, y)} цэгийг (${dx}; ${dy}) вектороор зөөгөөд x тэнхлэгээр тольдов. Эцсийн координатыг олоорой.`,
          answer,
          [coord(x + dx, y + dy), coord(-(x + dx), y + dy), coord(x - dx, -(y - dy)), coord(-(x + dx), -(y + dy)), coord(x + dx + 1, -(y + dy)), coord(x + dx, -(y + dy) + 1), coord(x - dx, y - dy)],
          `Зөөлтөөр ${coord(x + dx, y + dy)}, дараа нь x тэнхлэгийн тэгш хэмээр ${answer}.`,
          rng,
        );
      }
      const answer = coord(x + dx, y + dy);
      return choiceDraft(`A${coord(x, y)} цэгийг (${dx}; ${dy}) вектороор параллел зөөв. Дүрийн координатыг олоорой.`, answer, [coord(x - dx, y - dy), coord(x + dx, y - dy), coord(x - dx, y + dy)], `Координат бүрд векторын харгалзах координатыг нэмнэ: ${answer}.`, rng);
    }
    case 'vector': {
      const ax = nonZeroInt(rng, -size, size);
      const ay = nonZeroInt(rng, -size, size);
      const bx = nonZeroInt(rng, -size, size);
      const by = nonZeroInt(rng, -size, size);
      if (title.includes('скаляр')) {
        const answer = ax * bx + ay * by;
        return stagedNumber(`a = ${coord(ax, ay)}, b = ${coord(bx, by)} векторуудын скаляр үржвэрийг олоорой.`, answer, `Томьёогоор a · b = ${signed(ax)} · ${signed(bx)} + ${signed(ay)} · ${signed(by)} = ${signed(answer)}.`, rng, level);
      }
      if (title.includes('Координатын хавтгай')) {
        const answer = coord(bx - ax, by - ay);
        return choiceDraft(`A${coord(ax, ay)}, B${coord(bx, by)} бол AB векторын координатыг олоорой.`, answer, [coord(ax - bx, ay - by), coord(ax + bx, ay + by), coord(bx - ax, ay - by), coord(bx - ax + 1, by - ay), coord(bx - ax, by - ay + 1)], `Векторын координат AB = (${signed(bx)} − ${signed(ax)}; ${signed(by)} − ${signed(ay)}) = ${answer}.`, rng);
      }
      if (title.includes('координатаар')) {
        const multiplier = int(rng, 2, 4);
        const answer = coord(multiplier * ax + bx, multiplier * ay + by);
        return choiceDraft(`${multiplier}a + b векторыг координатаар илэрхийлээрэй. a = ${coord(ax, ay)}, b = ${coord(bx, by)}.`, answer, [coord(multiplier * ax - bx, multiplier * ay - by), coord(ax + multiplier * bx, ay + multiplier * by), coord(multiplier * ax + bx, multiplier * ay - by), coord(multiplier * ax + bx + 1, multiplier * ay + by), coord(multiplier * ax + bx, multiplier * ay + by + 1)], `Координат бүрээр ${multiplier}a + b = ${answer}.`, rng);
      }
      const answer = coord(ax + bx, ay + by);
      return choiceDraft(`a = ${coord(ax, ay)}, b = ${coord(bx, by)} бол a + b векторын координатыг олоорой.`, answer, [coord(ax - bx, ay - by), coord(ax + bx, ay - by), coord(ax - bx, ay + by), coord(ax + bx + 1, ay + by), coord(ax + bx, ay + by + 1)], `Харгалзах координатуудыг нэмбэл ${answer}.`, rng);
    }
    case 'coordinate-distance': {
      if (title.includes('координатын систем')) {
        const x = (rng() < 0.5 ? -1 : 1) * int(rng, 1, size);
        const y = (rng() < 0.5 ? -1 : 1) * int(rng, 1, size);
        const answer = x > 0 ? (y > 0 ? 'I мөч' : 'IV мөч') : y > 0 ? 'II мөч' : 'III мөч';
        return choiceDraft(`A${coord(x, y)} цэг координатын хавтгайн аль мөчид орших вэ?`, answer, ['I мөч', 'II мөч', 'III мөч', 'IV мөч'].filter((item) => item !== answer), `x нь ${x > 0 ? 'эерэг' : 'сөрөг'}, y нь ${y > 0 ? 'эерэг' : 'сөрөг'} тул ${answer}.`, rng);
      }
      const triple = pick(rng, [[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const);
      const x = int(rng, -size, size);
      const y = int(rng, -size, size);
      const answer = triple[2];
      return stagedNumber(`A${coord(x, y)}, B${coord(x + triple[0], y + triple[1])} цэгүүдийн хоорондох зайг олоорой.`, answer, `Зайн томьёогоор AB = √(${triple[0]}² + ${triple[1]}²) = ${answer}.`, rng, level);
    }
    case 'symmetry': {
      const edge = int(rng, 2, size);
      const scenario = pick(rng, [
        {
          prompt: `Ирмэгүүд нь ${edge} см, ${edge + 1} см, ${edge + 3} см бөгөөд харилцан ялгаатай тэгш өнцөгт параллелепипед хэдэн тэгш хэмийн хавтгайтай вэ?`,
          answer: '3',
          explanation: 'Хос эсрэг талсын дундах, талсуудтай параллел гурван тэгш хэмийн хавтгай байна.',
        },
        {
          prompt: `Ирмэгийн урт нь ${edge} см куб хэдэн тэгш хэмийн хавтгайтай вэ?`,
          answer: '9',
          explanation: 'Куб талсуудтай параллел 3, эсрэг ирмэгүүдийг дайрсан 6 буюу нийт 9 тэгш хэмийн хавтгайтай.',
        },
        {
          prompt: `Ирмэгийн урт нь ${edge} см зөв тетраэдр хэдэн тэгш хэмийн хавтгайтай вэ?`,
          answer: '6',
          explanation: 'Зөв тетраэдрийн ирмэг тус бүрийн дундаж перпендикуляр огтлолоор нийт 6 тэгш хэмийн хавтгай үүснэ.',
        },
      ] as const);
      return choiceDraft(
        scenario.prompt,
        scenario.answer,
        ['1', '3', '6', '9'].filter((item) => item !== scenario.answer),
        scenario.explanation,
        rng,
      );
    }
    case 'bearing': {
      const first = int(rng, 1, 11) * 10;
      const turn = int(rng, 1, 11) * 10;
      const answer = (first + turn) % 360;
      return stagedNumber(`Чиглэл хойд зүгээс цагийн зүүний дагуу ${first}°. Тэндээс баруун тийш ${turn}° эргэв. Шинэ чиглэлийн өнцгийг олоорой.`, answer, `${first}° + ${turn}° = ${first + turn}°, 360°-аас хэтэрвэл бүтэн эргэлтийг хасна. Хариу ${answer}°.`, rng, level, 10);
    }
    case 'measurement': {
      const meters = int(rng, 2, size);
      const centimeters = int(rng, 1, 9) * 10;
      const answer = meters * 100 + centimeters;
      return stagedNumber(`${meters} м ${centimeters} см уртыг сантиметрээр илэрхийлээрэй.`, answer, `${meters} м = ${meters * 100} см, дээр нь ${centimeters} см-ийг нэмбэл ${answer} см.`, rng, level, 10);
    }
    case 'motion-graph': {
      const speed1 = int(rng, 2, size) * 5;
      const time1 = int(rng, 1, 4);
      const speed2 = int(rng, 2, size) * 5;
      const time2 = int(rng, 1, 4);
      const firstDistance = speed1 * time1;
      const totalTime = time1 + time2;
      const totalDistance = firstDistance + speed2 * time2;
      return stagedNumber(`Зам-хугацааны график A(0; 0), B(${time1}; ${firstDistance}), C(${totalTime}; ${totalDistance}) цэгүүдээр өгөгдөв. B–C хэсгийн хурдыг олоорой.`, speed2, `B–C хэсгийн хурд = (${totalDistance} − ${firstDistance}) : (${totalTime} − ${time1}) = ${speed2} км/ц.`, rng, level, 5);
    }
    case 'area': {
      const base = int(rng, 2, size) * 2;
      const height = int(rng, 2, size);
      const answer = (base * height) / 2;
      return stagedNumber(`Суурь нь ${base} см, өндөр нь ${height} см гурвалжны талбайг олоорой.`, answer, `S = ah/2 = ${base} · ${height} : 2 = ${answer} см².`, rng, level);
    }
    case 'surface-volume': {
      const a = int(rng, 2, size);
      const b = int(rng, 2, size);
      const c = int(rng, 2, size);
      const volume = title.includes('эзлэхүүн') || level === 3;
      const answer = volume ? a * b * c : 2 * (a * b + b * c + a * c);
      return stagedNumber(`Ирмэгүүд нь ${a} см, ${b} см, ${c} см тэгш өнцөгт параллелепипедийн ${volume ? 'эзлэхүүнийг' : 'бүтэн гадаргуугийн талбайг'} олоорой.`, answer, volume ? `V = abc = ${a} · ${b} · ${c} = ${answer} см³.` : `S = 2(ab + bc + ac) = ${answer} см².`, rng, level);
    }
    case 'cross-section': {
      const measure = int(rng, 3, size);
      const scenario = pick(rng, [
        {
          prompt: `Өндөр нь ${measure} см цилиндрийг тэнхлэгийг нь дайрсан хавтгайгаар огтлоход ямар дүрс үүсэх вэ?`,
          answer: 'Тэгш өнцөгт',
          explanation: 'Тэнхлэгийн дагуух огтлолын хоёр тал нь өндөр, нөгөө хоёр тал нь суурийн диаметр тул тэгш өнцөгт үүснэ.',
        },
        {
          prompt: `Радиус нь ${measure} см цилиндрийг суурьтай нь параллел хавтгайгаар огтлоход ямар дүрс үүсэх вэ?`,
          answer: 'Тойрог',
          explanation: 'Цилиндрийн суурьтай параллел огтлол нь суурьтайгаа ижил хэлбэрийн тойрог байна.',
        },
        {
          prompt: `Өндөр нь ${measure} см конусыг тэнхлэгийг нь дайрсан хавтгайгаар огтлоход ямар дүрс үүсэх вэ?`,
          answer: 'Адил хажуут гурвалжин',
          explanation: 'Конусын орой болон суурийн диаметрыг дайрсан огтлол адил хажуут гурвалжин үүсгэнэ.',
        },
        {
          prompt: `Ирмэгийн урт нь ${measure} см кубыг нэг талтай нь параллел хавтгайгаар огтлоход ямар дүрс үүсэх вэ?`,
          answer: 'Квадрат',
          explanation: 'Кубын талстай параллел огтлол тухайн талстай тэнцүү квадрат байна.',
        },
      ] as const);
      return choiceDraft(
        scenario.prompt,
        scenario.answer,
        ['Тэгш өнцөгт', 'Тойрог', 'Адил хажуут гурвалжин', 'Квадрат'].filter((item) => item !== scenario.answer),
        scenario.explanation,
        rng,
      );
    }
    case 'time-zone': {
      const start = int(rng, 0, 18);
      const difference = int(rng, 2, 8);
      const duration = int(rng, 1, 5);
      const answer = (start + difference + duration) % 24;
      return stagedNumber(`A хотод ${String(start).padStart(2, '0')}:00 үед B хот ${difference} цагаар түрүүлж явна. Нислэг ${duration} цаг үргэлжилбэл B хотын цагаар хэдэн цагт очих вэ?`, answer, `${start} + ${difference} + ${duration} = ${start + difference + duration}; 24 цагаар шилжүүлбэл ${String(answer).padStart(2, '0')}:00.`, rng, level);
    }
    case 'currency': {
      const sourceUnit = int(rng, 2, size);
      const rate = sourceUnit * 100;
      if (level === 3) {
        const drawnTargetUnit = int(rng, 2, size);
        const targetUnit = drawnTargetUnit === sourceUnit ? (drawnTargetUnit === size ? 2 : drawnTargetUnit + 1) : drawnTargetUnit;
        const targetRate = targetUnit * 100;
        const factor = int(rng, 2, 10);
        const amount = targetUnit * factor;
        const answer = sourceUnit * factor;
        return stagedNumber(
          `1 A валют ${rate} төгрөг, 1 B валют ${targetRate} төгрөг. ${amount} нэгж A валют хэдэн нэгж B валюттай тэнцэх вэ?`,
          answer,
          `${amount} · ${rate} = ${amount * rate} төгрөг, дараа нь ${amount * rate} : ${targetRate} = ${answer} нэгж B валют.`,
          rng,
          level,
        );
      }
      const amount = int(rng, 2, size) * 10;
      const fee = level === 2 ? int(rng, 1, 5) * 100 : 0;
      const answer = rate * amount - fee;
      const stem = fee === 0 ? `1 нэгж валют ${rate} төгрөг. ${amount} нэгж валют хэдэн төгрөгтэй тэнцэх вэ?` : `1 нэгж валют ${rate} төгрөг. ${amount} нэгжийг солиод ${fee} төгрөгийн шимтгэл төлбөл хэдэн төгрөг үлдэх вэ?`;
      return stagedNumber(stem, answer, fee === 0 ? `${rate} · ${amount} = ${answer} төгрөг.` : `${rate} · ${amount} − ${fee} = ${answer} төгрөг.`, rng, level, 100);
    }
    case 'data-collection': {
      const count = int(rng, 20, 80);
      const scenario = pick(rng, [
        {
          prompt: `${count} сурагчийн сургуульдаа ирэхэд зарцуулдаг хугацааг судлахад аль арга хамгийн тохиромжтой вэ?`,
          answer: 'Ижил асуулттай асуумж авах',
          explanation: 'Сурагч бүрээс ижил асуултаар асуухад харьцуулж болох анхдагч өгөгдөл цугларна.',
        },
        {
          prompt: `Ангийн температурыг ${count} минутын турш тогтмол зайтай бүртгэхэд аль арга хамгийн тохиромжтой вэ?`,
          answer: 'Багажаар шууд хэмжих',
          explanation: 'Температурыг тогтсон хугацаанд багажаар хэмжиж бүртгэх нь бодит утгыг өгнө.',
        },
        {
          prompt: `Сургуулийн сүүлийн ${Math.max(3, Math.floor(count / 10))} жилийн сурагчдын тоог судлахад аль арга хамгийн тохиромжтой вэ?`,
          answer: 'Бүртгэлийн баримт ашиглах',
          explanation: 'Өнгөрсөн жилүүдийн сурагчдын тоо сургуулийн албан бүртгэлд хадгалагдсан байдаг.',
        },
        {
          prompt: `${count} ургамлын өсөлтөд бордооны нөлөөг судлахад аль арга хамгийн тохиромжтой вэ?`,
          answer: 'Хяналттай туршилт хийх',
          explanation: 'Бусад нөхцөлийг ижил байлгаж бордоог өөрчлөх хяналттай туршилт шалтгааны нөлөөг харуулна.',
        },
      ] as const);
      return choiceDraft(
        scenario.prompt,
        scenario.answer,
        ['Ижил асуулттай асуумж авах', 'Багажаар шууд хэмжих', 'Бүртгэлийн баримт ашиглах', 'Хяналттай туршилт хийх'].filter((item) => item !== scenario.answer),
        scenario.explanation,
        rng,
      );
    }
    case 'grouped-data': {
      const lower = int(rng, 1, size);
      const width = int(rng, 3, 8);
      const frequency = int(rng, 1, 5);
      const inside = Array.from({ length: frequency }, (_, index) => lower + (index % width));
      const values = [lower - 1, ...inside, lower + width, lower + width + 2];
      const answer = values.filter((value) => value >= lower && value < lower + width).length;
      return stagedNumber(`${values.join(', ')} өгөгдлийг бүлэглэхэд [${lower}; ${lower + width}) завсрын давтамжийг олоорой.`, answer, `${lower} ≤ x < ${lower + width} нөхцөлийг хангах ${answer} өгөгдөл байна.`, rng, level);
    }
    case 'histogram': {
      const frequencies = [int(rng, 2, size), int(rng, 2, size), int(rng, 2, size), int(rng, 2, size)];
      const answer = Math.max(...frequencies);
      return stagedNumber(`Дөрвөн интервалын давтамж ${frequencies.join(', ')} байв. Гистограммын хамгийн өндөр баганын давтамжийг олоорой.`, answer, `Давтамжуудыг жишихэд хамгийн их нь ${answer}.`, rng, level);
    }
    case 'stem-leaf': {
      const stem = int(rng, 1, size);
      const leaves = [int(rng, 0, 2), int(rng, 3, 5), int(rng, 6, 9)].sort((a, b) => a - b);
      const answer = stem * 10 + leaves[leaves.length - 1];
      return stagedNumber(`Иш-навчийн диаграммын ${stem} | ${leaves.join(' ')} мөрөн дэх хамгийн их утгыг олоорой.`, answer, `Иш нь аравтын орон, навч нь нэгжийн орон тул хамгийн их утга ${answer}.`, rng, level);
    }
    case 'chart': {
      if (title.includes('сонгон') || title.includes('Статистик')) {
        const count = int(rng, 4, 12);
        const scenario = pick(rng, [
          { prompt: `${count} төрлийн ангиллын давтамжийг хооронд нь харьцуулахад аль дүрслэл хамгийн тохиромжтой вэ?`, answer: 'Баганан диаграмм', explanation: 'Ангилал тус бүрийн давтамжийг харьцуулахад баганан диаграмм тохиромжтой.' },
          { prompt: `${count} сарын борлуулалтын хугацааны явц дахь өөрчлөлтийг дүрслэхэд аль дүрслэл хамгийн тохиромжтой вэ?`, answer: 'Шугаман график', explanation: 'Хугацааны явц дахь өөрчлөлтийг шугаман график тодорхой харуулна.' },
          { prompt: `Нийт төсвийн ${count} ангилал тус бүрийн эзлэх хувийг дүрслэхэд аль дүрслэл хамгийн тохиромжтой вэ?`, answer: 'Дугуй диаграмм', explanation: 'Нийт доторх хэсэг бүрийн эзлэх хувийг дугуй диаграмм тохиромжтой харуулна.' },
          { prompt: `${count * 5} сурагчийн өндрийг интервалаар бүлэглэсэн тархалтыг дүрслэхэд аль дүрслэл хамгийн тохиромжтой вэ?`, answer: 'Гистограмм', explanation: 'Тасралтгүй өгөгдлийн бүлэглэсэн тархалтыг гистограммаар дүрсэлнэ.' },
        ] as const);
        return choiceDraft(
          scenario.prompt,
          scenario.answer,
          ['Баганан диаграмм', 'Шугаман график', 'Дугуй диаграмм', 'Гистограмм'].filter((item) => item !== scenario.answer),
          scenario.explanation,
          rng,
        );
      }
      if (title.includes('Хуримтлагдсан')) {
        const frequencies = [int(rng, 2, size), int(rng, 2, size), int(rng, 2, size), int(rng, 2, size)];
        const answer = frequencies.reduce((sum, value) => sum + value, 0);
        const cumulative = frequencies.map((_, index) => frequencies.slice(0, index + 1).reduce((sum, value) => sum + value, 0));
        return stagedNumber(`Хуримтлагдсан давтамжийн дараалал ${cumulative.join(', ')} бол нийт давтамжийг олоорой.`, answer, `Сүүлийн хуримтлагдсан давтамж нийт ажиглалтын тоо тул ${answer}.`, rng, level);
      }
      const values = [int(rng, 2, size), int(rng, 2, size), int(rng, 2, size), int(rng, 2, size)];
      const answer = Math.max(...values) - Math.min(...values);
      return stagedNumber(`Диаграммын дөрвөн утга ${values.join(', ')}. Хамгийн их ба хамгийн бага утгын зөрүүг олоорой.`, answer, `Зөрүү нь ${Math.max(...values)} − ${Math.min(...values)} = ${answer}.`, rng, level);
    }
    case 'mean': {
      const center = int(rng, 3, size);
      const d = int(rng, 1, center - 1);
      const values = [center - d, center, center, center + d];
      const answer = title.includes('далайц') && rng() < 0.5 ? 2 * d : center;
      const asksRange = answer === 2 * d && answer !== center;
      return stagedNumber(`${values.map(signed).join(', ')} өгөгдлийн ${asksRange ? 'далайцыг' : 'арифметик дунджийг'} олоорой.`, answer, asksRange ? `Далайц = ${center + d} − ${center - d} = ${answer}.` : `Нийлбэр ${center * 4}-ийг 4-т хуваавал ${answer}.`, rng, level);
    }
    case 'scatter': {
      const count = int(rng, 12, 40);
      const scenario = pick(rng, [
        { pattern: 'x өсөхөд y ерөнхийдөө өсөж', answer: 'Эерэг корреляц', explanation: 'Хоёр хэмжигдэхүүн хамт өсөх ерөнхий хандлага нь эерэг корреляц.' },
        { pattern: 'x өсөхөд y ерөнхийдөө буурч', answer: 'Сөрөг корреляц', explanation: 'Нэг хэмжигдэхүүн өсөхөд нөгөө нь буурах ерөнхий хандлага нь сөрөг корреляц.' },
        { pattern: 'x ба y-ийн хооронд тодорхой өсөх, буурах хандлага ажиглагдахгүй', answer: 'Корреляцгүй', explanation: 'Цэгүүдэд ерөнхий өсөх эсвэл буурах хандлага байхгүй тул корреляцгүй.' },
        { pattern: 'бүх цэг зүүн доороос баруун дээш чиглэсэн нэг шулуун дээр байрлаж', answer: 'Төгс эерэг корреляц', explanation: 'Бүх цэг өсөх чиглэлийн нэг шулуун дээр байгаа тул төгс эерэг корреляц.' },
      ] as const);
      return choiceDraft(
        `${count} цэгтэй цэгэн диаграммд ${scenario.pattern} байв. Ямар хамаарал ажиглагдах вэ?`,
        scenario.answer,
        ['Эерэг корреляц', 'Сөрөг корреляц', 'Корреляцгүй', 'Төгс эерэг корреляц'].filter((item) => item !== scenario.answer),
        scenario.explanation,
        rng,
      );
    }
    case 'trigonometry': {
      const triple = pick(rng, [[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const);
      const factor = int(rng, 1, size);
      const sides = triple.map((value) => value * factor);
      if (title.includes('теорем'))
        return stagedNumber(`Хоёр тал нь ${sides[0]} см, ${sides[1]} см бөгөөд завсрын өнцөг 90° гурвалжны гурав дахь талыг косинусын теоремоор олоорой.`, sides[2], `c² = ${sides[0]}² + ${sides[1]}² − 2 · ${sides[0]} · ${sides[1]} · cos 90° тул c = ${sides[2]} см.`, rng, level);
      const numerator = title.includes('Косинус') ? sides[1] : sides[0];
      const answer = fraction(numerator, sides[2]);
      return choiceDraft(`Тэгш өнцөгт гурвалжны катетууд ${sides[0]} см, ${sides[1]} см, гипотенуз ${sides[2]} см. Өгсөн өнцгийн ${title.includes('Косинус') ? 'косинус' : 'синус'} нь ${numerator} см талын харьцаа бол утгыг олоорой.`, answer, [fraction(sides[2], numerator), fraction(sides[1], sides[0]), fraction(1, sides[2])], `${title.includes('Косинус') ? 'Косинус' : 'Синус'} = харгалзах катет : гипотенуз = ${answer}.`, rng);
    }
    case 'matrix': {
      const a = int(rng, 1, size);
      const b = int(rng, 1, size);
      const c = int(rng, 1, size);
      const d = int(rng, 1, size);
      const k = int(rng, 2, 5);
      if (title.includes('Мэдээллийн'))
        return stagedNumber(`Хоёр ангийн хөвгүүдийн тоо ${a}, ${b}, охидын тоо ${c}, ${d}. [[${a}, ${c}], [${b}, ${d}]] мэдээллийн матрицын эхний ангийн нийт сурагчийг олоорой.`, a + c, `Эхний мөрийн утгуудыг нэмбэл ${a} + ${c} = ${a + c}.`, rng, level);
      if (title.includes('үржүүлэх үйлдэл')) {
        const e = int(rng, 1, size);
        const f = int(rng, 1, size);
        const answer = a * e + b * f;
        return stagedNumber(`A = [[${a}, ${b}], [${c}, ${d}]], B матрицын эхний багана (${e}; ${f}) бол AB үржвэрийн зүүн дээд элементийг олоорой.`, answer, `Эхний мөр ба эхний баганын скаляр үржвэр ${a} · ${e} + ${b} · ${f} = ${answer}.`, rng, level);
      }
      if (title.includes('Нэгж матриц'))
        return choiceDraft(`A = [[${a}, ${b}], [${c}, ${d}]] бол A · I үржвэрийг сонгоорой.`, `[[${a}, ${b}], [${c}, ${d}]]`, [`[[1, 0], [0, 1]]`, `[[${a + 1}, ${b}], [${c}, ${d + 1}]]`, `[[${a}, ${c}], [${b}, ${d}]]`, `[[${a}, ${b + 1}], [${c}, ${d}]]`, `[[${a}, ${b}], [${c + 1}, ${d}]]`], 'Матрицыг тохирох эрэмбийн нэгж матрицаар үржүүлэхэд матриц өөрөө хэвээр үлдэнэ.', rng);
      const answer = a * k + c;
      return stagedNumber(`A матрицын эхний багана (${a}; ${b}), B матрицын эхний багана (${c}; ${d}). k = ${k} үед kA + B матрицын зүүн дээд элементийг олоорой.`, answer, `Зүүн дээд элемент ${k} · ${a} + ${c} = ${answer}.`, rng, level);
    }
    case 'determinant': {
      const a = int(rng, 2, size);
      const b = int(rng, 1, size);
      const c = int(rng, 1, size);
      const d = int(rng, 2, size);
      if (title.includes('Урвуу'))
        return choiceDraft(
          `A = [[${a}, 0], [0, ${d}]] диагональ матрицын урвуу матрицын зүүн дээд элементийг олоорой.`,
          `1/${a}`,
          [`${a}`, `1/${d}`, `${d}`, `−1/${a}`, `1/${a + 1}`],
          `Диагональ матрицын урвуугийн диагональ элементүүд урвуу тоо болдог тул зүүн дээд элемент 1/${a}.`,
          rng,
        );
      const answer = a * d - b * c;
      return stagedNumber(`[[${a}, ${b}], [${c}, ${d}]] матрицын тодорхойлогчийг олоорой.`, answer, `Тодорхойлогч ad − bc = ${a} · ${d} − ${b} · ${c} = ${signed(answer)}.`, rng, level);
    }
    case 'quartile': {
      const start = int(rng, 1, size);
      const d = int(rng, 1, 5);
      const values = Array.from({ length: 8 }, (_, index) => start + index * d);
      const q1 = (values[1] + values[2]) / 2;
      const q3 = (values[5] + values[6]) / 2;
      const answer = q3 - q1;
      return stagedNumber(`${values.join(', ')} эрэмбэлсэн өгөгдлийн квартил хоорондын далайцыг олоорой.`, answer, `Q₁ = ${signed(q1)}, Q₃ = ${signed(q3)} тул Q₃ − Q₁ = ${signed(answer)}.`, rng, level);
    }
    case 'factorial': {
      const value = int(rng, 3, level === 3 ? 9 : 7);
      const answer = factorial(value);
      return stagedNumber(`${value}! утгыг олоорой.`, answer, `Задлавал ${value}! = ${Array.from({ length: value }, (_, index) => value - index).join(' · ')} = ${answer}.`, rng, level);
    }
    case 'combination': {
      const n = int(rng, 5, level === 3 ? 12 : 9);
      const answer = (n * (n - 1)) / 2;
      return stagedNumber(`${n} сурагчаас 2 сурагчтай багийг хэдэн аргаар сонгох вэ?`, answer, `Хэсэглэлийн томьёогоор C(${n}, 2) = ${n} · ${n - 1} : 2 = ${answer}.`, rng, level);
    }
    case 'sector': {
      const radius = int(rng, 3, size);
      const angle = pick(rng, [60, 90, 120, 180] as const);
      const coefficient = (angle * radius * radius) / 360;
      const answer = `${piTerm(coefficient)} см²`;
      return choiceDraft(`${radius} см радиустай дугуйн ${angle}° секторын талбайг олоорой.`, answer, [`${piTerm(radius * radius)} см²`, `${piTerm((angle * radius) / 180)} см²`, `${piTerm((angle * radius) / 360)} см²`], `S = ${angle}/360 · π · ${radius}² = ${answer}.`, rng);
    }
  }
}

function templates(grade: 8 | 9 | 10): readonly Template[] {
  return ADVANCED_MATH_CURRICULUM[grade].flatMap((group) =>
    group.lessons.map((item: AdvancedMathLesson) => ({
      ref: item.ref,
      id: advancedMathTemplateId(item.ref),
      preferStored: true,
      make(rng: Rng, level: Level) {
        return make(item.kind, item.title, rng, level);
      },
    })),
  );
}

export const MATH8 = templates(8);
export const MATH9 = templates(9);
export const MATH10 = templates(10);
