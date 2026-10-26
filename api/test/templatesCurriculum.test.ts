import { describe, expect, it } from 'vitest';
import type { Level } from '../src/templates';
import { MATH6_MORE, MATH6_SPECS, MATH7_MORE, MATH7_SPECS, type Kind } from '../src/templates/mathCurriculum';

// Бодлогын текстийг дахин задлан бие даан бодож, эхний сонголт (зөв хариу)-той жишинэ.

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "−12" → −12, "3,25" → 3.25 */
const num = (s: string) => Number(s.replace('−', '-').replace(',', '.'));
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const frac = (a: number, b: number) => {
  const d = gcd(a, b);
  return b / d === 1 ? String(a / d).replace('-', '−') : `${a / d}/${b / d}`.replace('-', '−');
};
/** Сонголтын тоон утга (бүхэл, аравтын, энгийн бутархай); тоо биш бол null. */
const value = (s: string) => {
  const f = s.match(/^(−?\d+)\/(\d+)$/);
  if (f) return num(f[1]) / Number(f[2]);
  return /^−?\d+(,\d+)?$/.test(s) ? num(s) : null;
};
/** "−3x + 5" → [−3, 5] */
function linear(s: string): [number, number] {
  const m = s.match(/^(−?\d*)x(?: ([+−]) (\d+))?$/);
  if (!m) throw new Error(`linear: ${s}`);
  const a = m[1] === '' ? 1 : m[1] === '−' ? -1 : num(m[1]);
  return [a, m[2] ? (m[2] === '−' ? -1 : 1) * Number(m[3]) : 0];
}
const ints = (s: string) => [...s.matchAll(/−?\d+/g)].map((m) => num(m[0]));
const point = (s: string) => {
  const m = s.match(/\((−?\d+); (−?\d+)\)/);
  if (!m) throw new Error(`point: ${s}`);
  return [num(m[1]), num(m[2])];
};
const coord = (x: number, y: number) => `(${String(x).replace('-', '−')}; ${String(y).replace('-', '−')})`;
const need = (m: RegExpMatchArray | null, kind: string, body: string) => {
  if (!m) throw new Error(`${kind}: танихгүй бодлого: ${body}`);
  return m;
};

const CONTINUOUS = ['Сурагчийн өндөр', 'Усны температур', 'Гүйлтийн хугацаа', 'Ачааны жин'];

/** Бодлогын текстээс зөв хариуг гаргана; эсвэл сонголтуудыг шалгаад string буцаана. */
function solve(kind: Kind, body: string, options: string[]): string {
  const m = (re: RegExp) => need(body.match(re), kind, body);
  switch (kind) {
    case 'statement': {
      const truth = (s: string) => {
        const [x, y, z] = ints(s);
        if (s.includes('·')) return x * y === z;
        if (s.includes(':')) return x / y === z;
        return x < y;
      };
      expect(options.slice(1).some(truth), body).toBe(false);
      return truth(options[0]) ? options[0] : 'худал';
    }
    case 'set': {
      const d = Number(m(/^A олонлог нь (\d)-[тд] хуваагдах/)[1]);
      expect(options.slice(1).every((o) => Number(o) % d !== 0), body).toBe(true);
      return Number(options[0]) % d === 0 ? options[0] : 'хуваагдахгүй';
    }
    case 'decimal-compare':
    case 'fraction-compare': {
      const list = m(/^(.+) (?:тоонуудаас|бутархайнуудаас)/)[1].split('; ');
      const vals = list.map((s) => value(s)!);
      const best = body.includes('хамгийн их') ? Math.max(...vals) : Math.min(...vals);
      return list[vals.indexOf(best)];
    }
    case 'round': {
      const [, v, place] = m(/^(\d+) тоог (аравт|зуут|мянгат) хүртэл/);
      const p = { аравт: 10, зуут: 100, мянгат: 1000 }[place]!;
      return String(Math.round(Number(v) / p) * p);
    }
    case 'decimal-add': {
      const [, a, op, b] = m(/^([\d,]+) ([+−]) ([\d,]+) үйлдлийг/);
      const places = a.split(',')[1].length;
      const r = op === '+' ? num(a) + num(b) : num(a) - num(b);
      return r.toFixed(places).replace('.', ',');
    }
    case 'decimal-scale':
    case 'decimal-mul': {
      const [, a, b] = m(/^([\d,]+) · ([\d,]+) үржвэрийг/);
      const places = (a.split(',')[1] ?? '').length + (b.split(',')[1] ?? '').length;
      return (num(a) * num(b)).toFixed(places).replace('.', ',');
    }
    case 'mental': {
      const [a, b, , c] = ints(m(/^(.+) илэрхийллийг/)[1]);
      return String(a * b + a * c);
    }
    case 'fraction-add':
    case 'fraction-mul':
    case 'fraction-div': {
      const [, a, b, op, c, d] = m(/^(\d+)\/(\d+) ([+−·:]) (\d+)\/(\d+)/).map(Number) as unknown as [string, number, number, string, number, number];
      const o = body.match(/^\d+\/\d+ ([+−·:])/)![1];
      if (o === '+') return frac(a * d + c * b, b * d);
      if (o === '−') return frac(a * d - c * b, b * d);
      if (o === '·') return frac(a * c, b * d);
      return frac(a * d, b * c);
    }
    case 'convert': {
      const [, a, b] = m(/^(\d+)\/(\d+) энгийн бутархайг/);
      return `${(Number(a) / Number(b)) * 100}%`;
    }
    case 'percent': {
      const [, base, p] = m(/^(\d+) тооны (\d+)% хэд/);
      return String((Number(base) * Number(p)) / 100);
    }
    case 'percent-change': {
      const [, base, p, dir] = m(/^(\d+) хэмжээг (\d+) хувиар (өсгөв|бууруулав)/);
      const change = (Number(base) * Number(p)) / 100;
      return String(Number(base) + (dir === 'өсгөв' ? change : -change));
    }
    case 'ratio': {
      const [total, a, b] = ints(m(/^(\d+) ширхэг зүйлийг (\d+):(\d+)/)[0]);
      return String((total * a) / (a + b));
    }
    case 'proportion': {
      const [, a, b, c] = m(/^(\d+)\/(\d+) = (\d+)\/x/).map(Number);
      return String((b * c) / a);
    }
    case 'direct':
    case 'relation': {
      const [, k, x] = m(/y = (\d+)x\. x = (\d+) үед/).map(Number);
      return String(k * x);
    }
    case 'speed': {
      const [, v, t] = m(/цагт (\d+) км хурдтай (\d+) цаг/).map(Number);
      return String(v * t);
    }
    case 'work': {
      const [, r, t] = m(/цагт (\d+) эд анги хийдэг бол (\d+) цагт/).map(Number);
      return String(r * t);
    }
    case 'counting': {
      const [, a, b] = m(/^(\d+) цамц, (\d+) өмд/).map(Number);
      return String(a * b);
    }
    case 'probability':
    case 'opposite-probability': {
      const [, total, fav, which] = m(/^(\d+) тэнцүү боломжит үр дүнгийн (\d+) нь A үзэгдэлд тохирно\. (A үзэгдлийн эсрэг|A) үзэгдлийн магадлал/);
      return frac(which === 'A' ? Number(fav) : Number(total) - Number(fav), Number(total));
    }
    case 'expression':
    case 'function': {
      const [, x1, e1, e2, x2] = m(/^(?:x = (−?\d+) үед (.+) илэрхийллийн|y = (.+) функцийн x = (−?\d+) үеийн)/);
      const [a, b] = linear(e1 ?? e2);
      return String(a * num(x1 ?? x2) + b).replace('-', '−');
    }
    case 'line': {
      const [, k, b] = m(/коэффициент нь (−?\d+), y тэнхлэгийг \(0; (−?\d+)\)/);
      expect(linear(options[0].replace('y = ', '')), body).toEqual([num(k), num(b)]);
      return options[0];
    }
    case 'simplify': {
      const [, a, b, op, c] = m(/^(\d+)x \+ (\d+)x ([+−]) (\d+) илэрхийллийг/);
      expect(linear(options[0]), body).toEqual([Number(a) + Number(b), (op === '−' ? -1 : 1) * Number(c)]);
      return options[0];
    }
    case 'factor': {
      const [, a, c] = m(/^(\d+)x \+ (\d+) илэрхийллээс/).map(Number);
      return `${a}(x + ${c / a})`;
    }
    case 'equation': {
      const [, left, right] = m(/^(.+) = (−?\d+) тэгшитгэлийг/);
      const [a, b] = linear(left);
      return String((num(right) - b) / a);
    }
    case 'power-law': {
      const [, a, b] = m(/^\d+\^(\d+) · \d+\^(\d+) = /).map(Number);
      return String(a + b);
    }
    case 'monomial': {
      const [, a, p, b, q] = m(/^(\d+)x(?:\^(\d+))? · (\d+)x(?:\^(\d+))? үржвэрийг/);
      const e = Number(p ?? 1) + Number(q ?? 1);
      return `${Number(a) * Number(b)}${e === 1 ? 'x' : `x^${e}`}`;
    }
    case 'sequence': {
      const [, a, b, c, k] = m(/^(\d+), (\d+), (\d+), … дарааллын (\d+)-р/).map(Number);
      expect(c - b, body).toBe(b - a);
      return String(a + (k - 1) * (b - a));
    }
    case 'coordinate': {
      const [x, y] = point(body);
      return x > 0 ? (y > 0 ? 'I мөч' : 'IV мөч') : y > 0 ? 'II мөч' : 'III мөч';
    }
    case 'segments': {
      const k = Number(m(/дээр (\d+) цэг тэмдэглэв/)[1]);
      return String((k * (k - 1)) / 2);
    }
    case 'parallel-perp': {
      const [, rel, x, y] = m(/^Нэг хавтгай дээр (.+) бол (\w) ба (\w) шулуун/);
      // чиглэл: 0 эсвэл 1 (перпендикуляр бол солигдоно)
      const pairs = rel.split(' ба ').map((r) => r.split(' ') as [string, string, string]);
      const dir: Record<string, number> = { [pairs[0][0]]: 0 };
      for (let i = 0; i < 3; i++)
        for (const [u, op, v] of pairs) {
          const flip = op === '⊥' ? 1 : 0;
          if (u in dir) dir[v] = dir[u] ^ flip;
          else if (v in dir) dir[u] = dir[v] ^ flip;
        }
      return dir[x] === dir[y] ? 'Параллел' : 'Перпендикуляр';
    }
    case 'angle-type': {
      const a = Number(m(/^(\d+)° хэмжээтэй/)[1]);
      return a < 90 ? 'Хурц өнцөг' : a === 90 ? 'Тэгш өнцөг' : a < 180 ? 'Мохоо өнцөг' : 'Дэлгэмэл өнцөг';
    }
    case 'vertical-adjacent': {
      const [, a, t] = m(/нэг өнцөг (\d+)°\. Түүний (босоо|хамар)/);
      return String(t === 'босоо' ? Number(a) : 180 - Number(a));
    }
    case 'alternate': {
      const [, a, t] = m(/нэг өнцөг (\d+)°\. Түүнтэй (солбисон|харгалзах|дотоод нэг талын) өнцгийг/);
      return String(t === 'дотоод нэг талын' ? 180 - Number(a) : Number(a));
    }
    case 'construct': {
      const [, c, b, a] = m(/^AB = (\d+) см, AC = (\d+) см, BC = (\d+) см/);
      expect(Number(a) + Number(b), body).toBeGreaterThan(Number(c));
      return `AB = ${c} см хэрчим зурна. A төвтэй ${b} см, B төвтэй ${a} см радиустай нумуудын огтлолцлыг C гэж тэмдэглэнэ.`;
    }
    case 'triangle': {
      const [, a, b] = m(/хоёр өнцөг (\d+)° ба (\d+)°/).map(Number);
      return String(180 - a - b);
    }
    case 'polygon': {
      const k = Number(m(/^Гүдгэр (\d+) өнцөгтийн дотоод/)[1]);
      return String((k - 2) * 180);
    }
    case 'diagonals': {
      const k = Number(m(/^Гүдгэр (\d+) өнцөгт хэдэн диагональ/)[1]);
      return String((k * (k - 3)) / 2);
    }
    case 'triangle-inequality': {
      const [, a, b] = m(/хоёр тал (\d+) см, (\d+) см/).map(Number);
      const ok = (o: string) => Number(o) > Math.abs(a - b) && Number(o) < a + b;
      expect(options.slice(1).some(ok), body).toBe(false);
      return ok(options[0]) ? options[0] : 'болохгүй';
    }
    case 'quadrilateral': {
      const [, a, b, c] = m(/гурван өнцөг (\d+)°, (\d+)°, (\d+)°/).map(Number);
      return String(360 - a - b - c);
    }
    case 'exterior-angle':
      return String(180 - Number(m(/нэг дотоод өнцөг (\d+)°/)[1]));
    case 'circle': {
      const [, r, what] = m(/^Радиус нь (\d+) см (дугуйн талбайг|тойргийн уртыг)/);
      return `${what === 'дугуйн талбайг' ? Number(r) ** 2 : 2 * Number(r)}π`;
    }
    case 'solid': {
      const [, k, what] = m(/^Суурь нь (\d+) өнцөгт призм хэдэн (талстай|ирмэгтэй|оройтой)/);
      return String({ талстай: Number(k) + 2, ирмэгтэй: 3 * Number(k), оройтой: 2 * Number(k) }[what]);
    }
    case 'triangle-congruence':
      return m(/AB = (\d+) см/)[1];
    case 'translate': {
      const [, x, y, dx, dy] = m(/A\((−?\d+); (−?\d+)\) цэгийг \((\d+); (\d+)\) вектор/).map((s) => num(s));
      return coord(x + dx, y + dy);
    }
    case 'reflect':
    case 'central':
    case 'rotate': {
      const [x, y] = point(body);
      if (body.includes('координатын эхийн хувьд')) return coord(-x, -y);
      if (body.includes('эргүүлэн')) return coord(-y, x);
      return body.includes('x тэнхлэгийн') ? coord(x, -y) : coord(-x, y);
    }
    case 'midpoint': {
      const [, x1, y1, x2, y2] = m(/A\((−?\d+); (−?\d+)\), B\((−?\d+); (−?\d+)\)/).map((s) => num(s));
      return coord((x1 + x2) / 2, (y1 + y2) / 2);
    }
    case 'symmetry-order':
      return m(/^Зөв (\d+) өнцөгтийн/)[1];
    case 'time': {
      const [, h, min] = m(/системийн (\d+):(\d+)-ийг/);
      return `${Number(h) - 12}:${min}`;
    }
    case 'analog-digital': {
      const [, step, h] = m(/минутын зүү (\d+) тоон дээр, цагийн зүү (\d+) ба/).map(Number);
      return `${h}:${String(step * 5).padStart(2, '0')}`;
    }
    case 'unit':
    case 'traditional-unit':
    case 'area-unit':
    case 'volume-unit': {
      const [, v, unit] = m(/(\d+) (м²|л|алд|м) хэдэн/);
      return String(Number(v) * { 'м²': 10_000, л: 1000, алд: 160, м: 100 }[unit]!);
    }
    case 'rectangle': {
      const [, a, b, what] = m(/^Урт нь (\d+) см, өргөн нь (\d+) см тэгш өнцөгтийн (талбайг|периметрийг)/);
      return String(what === 'талбайг' ? Number(a) * Number(b) : 2 * (Number(a) + Number(b)));
    }
    case 'box-surface':
    case 'prism-surface':
    case 'box-volume': {
      const [, a, b, c] = m(/^Ирмэгүүд нь (\d+) см, (\d+) см, (\d+) см/).map(Number);
      return String(body.includes('эзлэхүүнийг') ? a * b * c : 2 * (a * b + b * c + a * c));
    }
    case 'triangle-area': {
      const [, a, h, what] = m(/^Суурь нь (\d+) см, өндөр нь (\d+) см (параллелограммын|гурвалжны)/);
      return String((Number(a) * Number(h)) / (what === 'гурвалжны' ? 2 : 1));
    }
    case 'trapezoid-area': {
      const [, a, b, h] = m(/талууд нь (\d+) см, (\d+) см, өндөр нь (\d+) см/).map(Number);
      return String(((a + b) * h) / 2);
    }
    case 'pyramid-surface': {
      const [, a, h] = m(/тал нь (\d+) см, хажуу талсын өндөр нь (\d+) см/).map(Number);
      return String(a * a + 4 * ((a * h) / 2));
    }
    case 'composite-solid': {
      const [, a, b, c, d] = m(/^(\d+) см × (\d+) см .*өндөр нь (\d+) см ба (\d+) см/).map(Number);
      return String(a * b * (c + d));
    }
    case 'data-type':
      return CONTINUOUS.some((s) => body.startsWith(s)) ? 'Тасралтгүй өгөгдөл' : 'Дискрет өгөгдөл';
    case 'data-source':
      return body.includes('сурагчаас авсан') ? 'Анхдагч эх үүсвэр' : 'Хоёрдогч эх үүсвэр';
    case 'table':
    case 'chart':
    case 'conclusion': {
      const vals = ints(m(/^(.+) өгөгдлийн/)[1]);
      if (kind === 'table') return String(vals.reduce((a, b) => a + b, 0));
      if (kind === 'chart') return String(Math.max(...vals));
      return String(Math.max(...vals) - Math.min(...vals));
    }
    case 'grouped-data':
    case 'mode': {
      const vals = ints(m(/^(.+) өгөгдлийн/)[1]);
      const count = (v: number) => vals.filter((x) => x === v).length;
      return String(vals.reduce((best, v) => (count(v) > count(best) ? v : best)));
    }
    case 'mean': {
      const vals = ints(m(/^(.+) өгөгдлийн/)[1]);
      return String(body.includes('далайцыг') ? Math.max(...vals) - Math.min(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    case 'relative-frequency': {
      const [, total, k] = m(/^(\d+) удаагийн туршилтад үзэгдэл (\d+) удаа/).map(Number);
      return frac(k, total);
    }
  }
}

describe('Математик 6, 7-ын хичээлийн бодлогын хариу', () => {
  const cases = [
    [6, MATH6_SPECS, MATH6_MORE],
    [7, MATH7_SPECS, MATH7_MORE],
  ] as const;
  for (const [grade, specs, templates] of cases)
    for (const [i, spec] of specs.entries()) {
      it(`Математик ${grade} х.${spec.page} ${spec.title} (${spec.kind})`, () => {
        const prefix = `Математик ${grade} · ${spec.title}. `;
        for (const level of [1, 2, 3] as Level[])
          for (let seed = 1; seed <= 300; seed++) {
            const draft = templates[i].make(seeded(seed * 7 + level), level);
            expect(draft.prompt.startsWith(prefix)).toBe(true);
            const body = draft.prompt.slice(prefix.length);
            const text = [body, ...draft.options, draft.explanation].join(' | ');
            // дүрэм: том үсгээр эхэлнэ, мэдэгдсэн буруу залгавар, ASCII хасах, дүүргэгч сонголтгүй
            expect(body, body).not.toMatch(/^[а-яөү]/);
            expect(text, text).not.toMatch(/(?:утга|далайц|моод|периметр|зуут)-(?:ийг|ыг|г|аар)/i);
            expect(text, text).not.toMatch(/(^|[\s(;:=|])-\d/);
            expect(text, text).not.toMatch(/−\d+°|\d\.\d|Эх үүсвэр \d|Ангилал \d|\b1\/1\b|8 нэгжийг|undefined|NaN/);
            expect(draft.options).toHaveLength(4);
            expect(new Set(draft.options).size, text).toBe(4);
            const values = draft.options.map(value);
            if (values.every((v) => v !== null)) expect(new Set(values).size, text).toBe(4);
            expect(solve(spec.kind, body, draft.options), text).toBe(draft.options[0]);
          }
      });
    }
});
