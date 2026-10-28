import { describe, expect, it } from 'vitest';
import { ADVANCED_MATH_CURRICULUM, type AdvancedMathKind } from '../src/config/mathAdvancedCurriculum';
import { topicIds } from '../src/config/topics';
import { validateDrafts } from '../src/llm/validate';
import { generate, type Level } from '../src/templates';
import { MATH8, MATH9, MATH10 } from '../src/templates/mathAdvanced';

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const number = (text: string) => Number(text.replace('−', '-'));
const signed = (value: number) => String(value).replace('-', '−');
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const fraction = (a: number, b: number) => {
  const d = gcd(a, b);
  return b / d === 1 ? signed(a / d) : `${signed(a / d)}/${b / d}`;
};
const coord = (x: number, y: number) => `(${signed(x)}; ${signed(y)})`;
const pi = (coefficient: number) => `${coefficient === 1 ? '' : signed(coefficient)}π см²`;
const values = (text: string) => [...text.matchAll(/−?\d+(?:\.\d+)?/g)].map((match) => number(match[0]));
const need = (match: RegExpMatchArray | null, kind: string, prompt: string) => {
  expect(match, `${kind}: ${prompt}`).not.toBeNull();
  return match!;
};
const coordinates = (text: string) => [...text.matchAll(/\((−?\d+(?:\.\d+)?); (−?\d+(?:\.\d+)?)\)/g)].map((match) => [number(match[1]), number(match[2])] as const);

/** Суурь шатны зөв хариуг generator-ийн explanation ашиглалгүй prompt-оос дахин бодно. */
function solveBase(kind: AdvancedMathKind, title: string, prompt: string, options: readonly string[]): string {
  const m = (regex: RegExp) => need(prompt.match(regex), kind, prompt);
  switch (kind) {
    case 'rational': {
      const [, a, d, b] = m(/^(\d+)\/(\d+) \+ (\d+)\/\d+/);
      return fraction(Number(a) + Number(b), Number(d));
    }
    case 'irrational': {
      const n = values(prompt)[0];
      return `√${n}`;
    }
    case 'rounding': {
      const value = values(prompt)[0];
      const place = prompt.includes('аравт') ? 10 : prompt.includes('зуут') ? 100 : 1000;
      return String(Math.round(value / place) * place);
    }
    case 'arithmetic': {
      const [a, b, c] = values(prompt);
      return signed((a - b) * c);
    }
    case 'power': {
      if (title.includes('Рационал')) {
        const [, base, numerator, denominator] = m(/^(\d+)\^\((\d+)\/(\d+)\)/);
        return signed(Math.round(Number(base) ** (Number(numerator) / Number(denominator))));
      }
      const [, , p, , q] = m(/^(\d+)\^(\d+) · (\d+)\^(\d+)/);
      return signed(Number(p) + Number(q));
    }
    case 'root': {
      const [square, cube] = values(prompt);
      return signed(Math.sqrt(square) + Math.cbrt(cube));
    }
    case 'standard-form': {
      const [, a, p, b, q] = m(/^\((\d+) · 10\^(\d+)\) · \((\d+) · 10\^−(\d+)\)/);
      return signed(Number(p) - Number(q) + (Number(a) * Number(b) >= 10 ? 1 : 0));
    }
    case 'percent': {
      const [base, percent] = values(prompt);
      const change = (base * percent) / 100;
      return signed(prompt.includes('шинэ үнэ') ? base - change : change);
    }
    case 'ratio': {
      const [total, a, b] = values(prompt);
      return signed((total * a) / (a + b));
    }
    case 'scale': {
      const [, scale, map] = values(prompt);
      return signed((map * scale) / 100);
    }
    case 'inverse-proportion': {
      if (title.includes('график')) {
        const k = values(prompt)[0];
        return options.find((option) => {
          const point = coordinates(option)[0];
          return point && point[0] * point[1] === k;
        })!;
      }
      const [workers, days, newWorkers] = values(prompt);
      return signed((workers * days) / newWorkers);
    }
    case 'set-operation':
      return signed(values(prompt).slice(0, 3).reduce((sum, value) => sum + value, 0));
    case 'event-relation':
      return prompt.includes('Зоос')
        ? 'Хамааралгүй үзэгдлүүд'
        : prompt.includes('сондгой')
          ? 'Эсрэг үзэгдлүүд'
          : prompt.includes('2-оос бага')
            ? 'Нийцгүй үзэгдлүүд'
            : 'Нийцтэй үзэгдлүүд';
    case 'probability': {
      const [red, blue] = values(prompt);
      const total = red + blue;
      return prompt.includes('хоёр улаан') ? fraction(red * (red - 1), total * (total - 1)) : fraction(red, total);
    }
    case 'polynomial': {
      const [, a, b, c, x] = m(/^(\d+)x \+ (\d+)x − (\d+).*x = (\d+)/);
      return signed((Number(a) + Number(b)) * Number(x) - Number(c));
    }
    case 'identity': {
      const [a, b] = values(prompt);
      return signed((a + b) ** 2);
    }
    case 'factorization': {
      const [a, product] = values(prompt);
      return `${a}(x + ${product / a})`;
    }
    case 'algebraic-fraction': {
      if (title.includes('үржүүлэх')) {
        const [, , , b] = m(/^\(x\/(\d+)\) · \((\d+)\/\((\d+)x\)\)/);
        return fraction(1, Number(b));
      }
      if (title.includes('нэмэх')) {
        const [, x, a, c] = m(/^x = (\d+) үед (\d+)\/x \+ (\d+)\/x/);
        return fraction(Number(a) + Number(c), Number(x));
      }
      const [, , b] = m(/^\(\(x − (\d+)\) · (\d+)\)/);
      return b;
    }
    case 'equation': {
      if (title.includes('Квадрат')) return signed(values(prompt)[0]);
      const [, a, b, right] = m(/^(\d+)x \+ (\d+) = (\d+)/);
      return signed((Number(right) - Number(b)) / Number(a));
    }
    case 'linear-system': {
      if (title.includes('график')) {
        const equations = [...prompt.matchAll(/y = (−?\d*)x ([+−]) (\d+)/g)].map((match) => {
          const slope = match[1] === '' ? 1 : match[1] === '−' ? -1 : number(match[1]);
          return { slope, intercept: (match[2] === '−' ? -1 : 1) * Number(match[3]) };
        });
        return options.find((option) => {
          const point = coordinates(option)[0];
          return point && equations.every(({ slope, intercept }) => point[1] === slope * point[0] + intercept);
        })!;
      }
      const [, sum, diff] = m(/^x \+ y = (\d+), x − y = (−?\d+)/);
      return signed((Number(sum) + number(diff)) / 2);
    }
    case 'inequality': {
      if (title.includes('Хоёр хувьсагчтай')) {
        const boundary = values(prompt)[0];
        return options.find((option) => {
          const point = coordinates(option)[0];
          return point && point[0] + point[1] < boundary;
        })!;
      }
      const [a, right] = values(prompt);
      return `x < ${right / a}`;
    }
    case 'sequence':
    case 'arithmetic-progression': {
      const [first, second, , index] = values(prompt);
      return signed(first + (index - 1) * (second - first));
    }
    case 'linear-function': {
      if (title.includes('тодорхойлогдох')) {
        const [, sign, absolute] = m(/1\/\(x ([+−]) (\d+)\)/);
        return `x ≠ ${sign === '+' ? '−' : ''}${absolute}`;
      }
      if (title === 'Шулууны тэгшитгэл') {
        const [slope, , intercept] = values(prompt);
        return `y = ${slope}x + ${intercept}`;
      }
      const [, k, b, x] = m(/^y = (\d+)x \+ (\d+).*x = (\d+)/);
      return signed(Number(k) * Number(x) + Number(b));
    }
    case 'slope': {
      if (title.includes('шүргэгч')) return signed(2 * values(prompt)[0]);
      const [a, b] = coordinates(prompt);
      return signed((b[1] - a[1]) / (b[0] - a[0]));
    }
    case 'quadratic-function': {
      const [, coefficient, b, x] = m(/^y = (\d*)x² − (\d+).*x = (\d+)/);
      return signed(Number(coefficient || 1) * Number(x) ** 2 - Number(b));
    }
    case 'inverse-function': {
      const [, a, b, y] = m(/^f\(x\) = (\d+)x \+ (\d+)\. f⁻¹\((\d+)\)/);
      return signed((Number(y) - Number(b)) / Number(a));
    }
    case 'power-function': {
      const [, exponent, x] = m(/^y = x\^(\d+).*x = (\d+)/);
      return signed(Number(x) ** Number(exponent));
    }
    case 'exponential-function': {
      const nums = values(prompt);
      return title.includes('тэгшитгэл') ? signed(nums.at(-1)!) : signed(nums[0] ** nums.at(-1)!);
    }
    case 'polygon-angle':
      return signed((values(prompt)[0] - 2) * 180);
    case 'triangle-lines':
      return signed(values(prompt)[0] / 2);
    case 'pythagoras': {
      const [a, b] = values(prompt);
      return signed(Math.sqrt(a * a + b * b));
    }
    case 'circle': {
      if (title.includes('тэгшитгэл')) return `x² + y² = ${values(prompt)[0] ** 2}`;
      if (title.includes('хөвч')) {
        const [external, full] = values(prompt);
        return signed(Math.sqrt(external * full));
      }
      return signed(prompt.includes('төв өнцөг') ? values(prompt)[0] / 2 : 90);
    }
    case 'construction':
      return title.includes('геометр байр') ? 'AB хэрчмийн дундаж перпендикуляр' : 'Зургаан өнцөгтийн талтай тэнцүү';
    case 'similarity': {
      if (title.includes('Гомотет')) {
        const scale = values(prompt)[0];
        const point = coordinates(prompt)[0];
        return coord(point[0] * scale, point[1] * scale);
      }
      const nums = values(prompt);
      return signed(title.includes('талбайн харьцаа') ? nums[1] ** 2 : nums.at(-1)! * nums[1]);
    }
    case 'transform': {
      const point = coordinates(prompt)[0];
      if (title.includes('Цэгийн хувь')) return coord(-point[0], -point[1]);
      if (title.includes('Тэнхлэгийн')) return coord(point[0], -point[1]);
      if (title.includes('Эргүүлэлт')) return coord(-point[1], point[0]);
      const delta = coordinates(prompt)[1];
      const moved = [point[0] + delta[0], point[1] + delta[1]] as const;
      return title.includes('Дараалсан') ? coord(moved[0], -moved[1]) : coord(...moved);
    }
    case 'vector': {
      const vectors = coordinates(prompt);
      if (title.includes('скаляр')) return signed(vectors[0][0] * vectors[1][0] + vectors[0][1] * vectors[1][1]);
      if (title.includes('Координатын хавтгай')) return coord(vectors[1][0] - vectors[0][0], vectors[1][1] - vectors[0][1]);
      if (title.includes('координатаар')) {
        const multiplier = values(prompt)[0];
        return coord(multiplier * vectors[0][0] + vectors[1][0], multiplier * vectors[0][1] + vectors[1][1]);
      }
      return coord(vectors[0][0] + vectors[1][0], vectors[0][1] + vectors[1][1]);
    }
    case 'coordinate-distance': {
      const points = coordinates(prompt);
      if (title.includes('координатын систем')) {
        const [x, y] = points[0];
        return x > 0 ? (y > 0 ? 'I мөч' : 'IV мөч') : y > 0 ? 'II мөч' : 'III мөч';
      }
      return signed(Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]));
    }
    case 'symmetry':
      return prompt.includes('куб ') ? '9' : prompt.includes('тетраэдр') ? '6' : '3';
    case 'bearing': {
      const [first, turn] = values(prompt);
      return signed((first + turn) % 360);
    }
    case 'measurement': {
      const [meters, centimeters] = values(prompt);
      return signed(meters * 100 + centimeters);
    }
    case 'motion-graph': {
      const [, b, c] = coordinates(prompt);
      return signed((c[1] - b[1]) / (c[0] - b[0]));
    }
    case 'area': {
      const [base, height] = values(prompt);
      return signed((base * height) / 2);
    }
    case 'surface-volume': {
      const [a, b, c] = values(prompt);
      return signed(prompt.includes('эзлэхүүн') ? a * b * c : 2 * (a * b + b * c + a * c));
    }
    case 'cross-section':
      return prompt.includes('суурьтай')
        ? 'Тойрог'
        : prompt.includes('конус')
          ? 'Адил хажуут гурвалжин'
          : prompt.includes('куб')
            ? 'Квадрат'
            : 'Тэгш өнцөгт';
    case 'time-zone': {
      const [, start, difference, duration] = m(/A хотод (\d+):00.*B хот (\d+) цагаар.*Нислэг (\d+) цаг/);
      return signed((Number(start) + Number(difference) + Number(duration)) % 24);
    }
    case 'currency': {
      if (prompt.includes('A валют')) {
        const [, sourceRate, targetRate, amount] = m(/^1 A валют (\d+) төгрөг, 1 B валют (\d+) төгрөг\. (\d+) нэгж A валют/);
        return signed((Number(sourceRate) * Number(amount)) / Number(targetRate));
      }
      const [, rate, amount, fee] = m(/^1 нэгж валют (\d+) төгрөг\. (\d+) нэгж(?:ийг солиод (\d+) төгрөгийн шимтгэл төлбөл| валют)/);
      return signed(Number(rate) * Number(amount) - Number(fee ?? 0));
    }
    case 'data-collection':
      return prompt.includes('температур')
        ? 'Багажаар шууд хэмжих'
        : prompt.includes('сүүлийн')
          ? 'Бүртгэлийн баримт ашиглах'
          : prompt.includes('ургамлын')
            ? 'Хяналттай туршилт хийх'
            : 'Ижил асуулттай асуумж авах';
    case 'grouped-data': {
      const [, list, lower, upper] = m(/^([\d, ]+) өгөгдлийг.*\[(\d+); (\d+)\)/);
      return String(values(list).filter((value) => value >= Number(lower) && value < Number(upper)).length);
    }
    case 'histogram':
      return signed(Math.max(...values(m(/давтамж ([\d, ]+) байв/)[1])));
    case 'stem-leaf': {
      const [, stem, leaves] = m(/диаграммын (\d+) \| ([\d ]+) мөрөн/);
      return `${stem}${Math.max(...values(leaves))}`;
    }
    case 'chart': {
      if (title.includes('сонгон') || title.includes('Статистик'))
        return prompt.includes('хугацааны явц') ? 'Шугаман график' : prompt.includes('эзлэх хувийг') ? 'Дугуй диаграмм' : prompt.includes('интервалаар') ? 'Гистограмм' : 'Баганан диаграмм';
      const data = values(prompt);
      return signed(title.includes('Хуримтлагдсан') ? data.at(-1)! : Math.max(...data) - Math.min(...data));
    }
    case 'mean': {
      const data = values(m(/^([\d−, ]+) өгөгдлийн/)[1]);
      return signed(prompt.includes('далайцыг') ? Math.max(...data) - Math.min(...data) : data.reduce((sum, value) => sum + value, 0) / data.length);
    }
    case 'scatter':
      return prompt.includes('нэг шулуун')
        ? 'Төгс эерэг корреляц'
        : prompt.includes('буурч')
          ? 'Сөрөг корреляц'
          : prompt.includes('ажиглагдахгүй')
            ? 'Корреляцгүй'
            : 'Эерэг корреляц';
    case 'trigonometry': {
      const [a, b, c, numerator] = values(prompt);
      return title.includes('теорем') ? signed(Math.round(Math.hypot(a, b))) : fraction(numerator, c);
    }
    case 'matrix': {
      const nums = values(prompt);
      if (title.includes('Мэдээллийн')) return signed(nums[0] + nums[2]);
      if (title.includes('үржүүлэх үйлдэл')) return signed(nums[0] * nums[4] + nums[1] * nums[5]);
      if (title.includes('Нэгж матриц')) return `[[${nums[0]}, ${nums[1]}], [${nums[2]}, ${nums[3]}]]`;
      return signed(nums[4] * nums[0] + nums[2]);
    }
    case 'determinant': {
      const nums = values(prompt);
      return title.includes('Урвуу') ? `1/${nums[0]}` : signed(nums[0] * nums[3] - nums[1] * nums[2]);
    }
    case 'quartile': {
      const data = values(prompt);
      return signed((data[5] + data[6]) / 2 - (data[1] + data[2]) / 2);
    }
    case 'factorial': {
      const n = values(prompt)[0];
      return signed(Array.from({ length: n }, (_, index) => index + 1).reduce((product, value) => product * value, 1));
    }
    case 'combination': {
      const n = values(prompt)[0];
      return signed((n * (n - 1)) / 2);
    }
    case 'sector': {
      const [radius, angle] = values(prompt);
      return pi((angle * radius * radius) / 360);
    }
  }
}

describe('Математик 8–10-ын хичээлийн бодлогын template', () => {
  const grades = [
    [8, MATH8],
    [9, MATH9],
    [10, MATH10],
  ] as const;

  const lessonFor = (grade: 8 | 9 | 10, ref: string) => {
    const lesson = ADVANCED_MATH_CURRICULUM[grade].flatMap((group) => group.lessons).find((item) => item.ref === ref);
    expect(lesson, `${grade}: ${ref}`).toBeDefined();
    return lesson!;
  };

  const draftFor = (grade: 8 | 9 | 10, ref: string, seed = 1) => {
    const templates = grade === 8 ? MATH8 : grade === 9 ? MATH9 : MATH10;
    const template = templates.find((item) => item.ref === ref);
    expect(template, `${grade}: ${ref}`).toBeDefined();
    return template!.make(seeded(grade * 100_000 + seed), 1);
  };

  it.each(grades)('%i-р ангийн бүх template 3 түвшинд хүчинтэй, ялгаатай бодлого үүсгэнэ', (grade, templates) => {
    for (const template of templates) {
      for (const level of [1, 2, 3] as Level[]) {
        const generated = generate([template], 5, level, seeded(grade * 10_000 + template.id.length * 101 + level));
        expect(generated, `${template.id}, түвшин ${level}`).toHaveLength(5);
        expect(new Set(generated.map((item) => item.draft.prompt)).size, `${template.id}, түвшин ${level}`).toBe(5);
        expect(validateDrafts(generated.map((item) => item.draft), topicIds(1, 'math')).rejected, `${template.id}, түвшин ${level}`).toEqual([]);
      }
    }
  });

  it('Бүх шатны үндсэн хариуг prompt-оос бие даан бодож шалгана', () => {
    for (const [grade, templates] of grades) {
      for (const template of templates) {
        const lesson = lessonFor(grade, template.ref!);
        for (const level of [1, 2, 3] as Level[]) {
          for (let seed = 1; seed <= 100; seed++) {
            const draft = template.make(seeded(grade * 1_000_000 + seed * 97 + template.id.length + level), level);
            const independentlySolved = solveBase(lesson.kind, lesson.title, draft.prompt, draft.options);
            expect(draft.options[0], `${template.id}, түвшин ${level}, seed ${seed}: ${draft.prompt}`).toBe(independentlySolved);
          }
        }
      }
    }
  });

  it('зөв хариу, монгол бичлэг, дүүргэгч сонголтыг бүх template дээр шалгана', () => {
    for (const [grade, templates] of grades) {
      for (const template of templates) {
        const lesson = lessonFor(grade, template.ref!);
        for (const level of [1, 2, 3] as Level[]) {
          for (let seed = 1; seed <= 100; seed++) {
            const draft = template.make(seeded(grade * 100_000 + seed * 17 + level), level);
            const text = [draft.prompt, ...draft.options, draft.explanation].join(' | ');
            expect(draft.options, text).toHaveLength(4);
            expect(new Set(draft.options).size, text).toBe(4);
            expect(draft.prompt, text).not.toMatch(/^[а-яөү]/);
            expect(text, text).not.toMatch(/(?:утга|далайц|моод|периметр|зуут)-(?:ийг|ыг|г|аар)/i);
            expect(text, text).not.toMatch(/(^|[\s(;:=|])-[\d]/);
            expect(text, text).not.toMatch(/\d,\d|Эх үүсвэр \d|Ангилал \d|\b1\/1\b|undefined|NaN/);
            expect(text, text).not.toMatch(/\b1x(?:²)?|(^|\D)1π|\b0 төгрөгийн шимтгэл|дугаартай тэгш өнцөгт параллелепипед|язгуур бүхэл тоо биш/);
            expect(draft.prompt, text).not.toMatch(/Олсон хариуг|Хариун дээр .* нэмээд|урвуу үйлдлээр олоорой/);

            const exponent = draft.prompt.match(/\^\((\d+)\/(\d+)\)/);
            if (exponent) expect(gcd(Number(exponent[1]), Number(exponent[2])), text).toBe(1);

            if (draft.options.every((option) => /^−?\d+(?:\.\d+)?$/.test(option))) {
              const correct = number(draft.options[0]);
              expect(draft.options.slice(1).some((option) => Math.abs(number(option) - correct) > 1), text).toBe(true);
            }
            if (lesson.kind === 'factorization') expect(draft.options.every((option) => option.includes('x')), text).toBe(true);
            if (lesson.kind === 'vector' && draft.prompt.includes('координат'))
              expect(draft.options.every((option) => /^\(−?\d+; −?\d+\)$/.test(option)), text).toBe(true);
            if (lesson.kind === 'sector') expect(draft.options.every((option) => option.includes('π')), text).toBe(true);
          }
        }
      }
    }
  });

  it('ангиллын бодлогуудын зөв хариу seed бүрт тогтмол биш', () => {
    const variableKinds = new Set<AdvancedMathKind>(['event-relation', 'symmetry', 'cross-section', 'data-collection', 'grouped-data', 'chart', 'scatter']);
    for (const [grade, templates] of grades) {
      for (const template of templates) {
        const lesson = lessonFor(grade, template.ref!);
        if (!variableKinds.has(lesson.kind)) continue;
        const answers = new Set(Array.from({ length: 100 }, (_, seed) => template.make(seeded(grade * 10_000 + seed * 41 + template.id.length), 1).options[0]));
        expect(answers.size, `${template.id}: ${[...answers].join(' | ')}`).toBeGreaterThan(1);
      }
    }
  });

  it('валютын түвшин бүр сэдэв дотроо гүнзгийрнэ', () => {
    const template = MATH9.find((item) => item.ref === 'math-9:137-138')!;
    expect(template.make(seeded(1), 1).prompt).toMatch(/^1 нэгж валют/);
    expect(template.make(seeded(1), 2).prompt).toContain('шимтгэл');
    expect(template.make(seeded(1), 3).prompt).toMatch(/^1 A валют .*1 B валют/);
  });

  it('график, төсөө ба векторын ойролцоо хичээлүүд тусдаа бодлогын төрөлтэй', () => {
    for (const [grade, ref] of [[8, 'math-8:86-87'], [9, 'math-9:75-76']] as const) {
      const prompt = draftFor(grade, ref).prompt;
      expect(prompt).toContain('график');
      expect(prompt).toContain('огтлолцлын цэг');
    }
    for (const [grade, ref] of [[8, 'math-8:88-89'], [10, 'math-10:58-59']] as const) {
      const prompt = draftFor(grade, ref).prompt;
      expect(prompt).toContain('график');
      expect(prompt).toContain('y =');
    }
    expect(draftFor(8, 'math-8:152-157').prompt).toMatch(/график A\(0; 0\), B\(.+\), C\(.+\)/);

    expect(draftFor(8, 'math-8:115-119').prompt).toContain('периметр');
    expect(draftFor(8, 'math-8:120-123').prompt).toContain('гомотетоор');
    expect(draftFor(8, 'math-8:124-129').prompt).toContain('хоёр гурвалжны');

    expect(draftFor(10, 'math-10:116-123').prompt).toContain('a + b вектор');
    expect(draftFor(10, 'math-10:124-125').prompt).toContain('AB вектор');
    expect(draftFor(10, 'math-10:126-127').prompt).toMatch(/^\d+a \+ b векторыг/);
    expect(draftFor(10, 'math-10:128-131').prompt).toContain('скаляр үржвэр');
  });

  it('өмнө зөрөх эрсдэлтэй хичээлүүд өөрийн төрлийн үүсгэгчтэй', () => {
    const kind = (grade: 8 | 9 | 10, title: string) =>
      ADVANCED_MATH_CURRICULUM[grade].flatMap((group) => group.lessons).find((item) => item.title === title)?.kind;
    expect(kind(8, 'Пифагорын теорем')).toBe('pythagoras');
    expect(kind(8, 'Масштаб')).toBe('scale');
    expect(kind(8, 'Иш-навчийн диаграмм')).toBe('stem-leaf');
    expect(kind(9, 'Тригонометр харьцаа')).toBe('trigonometry');
    expect(kind(9, 'Валют шилжүүлэх')).toBe('currency');
    expect(kind(10, 'Матрицын тодорхойлогч')).toBe('determinant');
    expect(kind(10, 'Факториал')).toBe('factorial');
    expect(kind(10, 'Тойргийн нумын урт, дугуйн сектор, сегментийн талбай')).toBe('sector');
  });
});
