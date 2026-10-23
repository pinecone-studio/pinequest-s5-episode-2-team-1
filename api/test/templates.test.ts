import { describe, expect, it } from 'vitest';
import { topicIds } from '../src/config/topics';
import { validateDrafts } from '../src/llm/validate';
import { generate, templatesFor } from '../src/templates';
import { MATH6 } from '../src/templates/math6';

/** Давтагдах санамсаргүй тоо (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const num = (s: string) => Number(s.replace('−', '-'));
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

describe('Математик 6-ын бодлогын загвар', () => {
  for (const t of MATH6) {
    it(`${t.id}: 1000 хувилбар бүгд шалгалтыг давна, хариу нь ганцхан`, () => {
      const rng = seeded(t.id.length * 7919);
      const all = Array.from({ length: 1000 }, () => ({ ...t.make(rng), correctIndex: 0, ...(t.topic ? { topic: t.topic } : {}) }));
      // ижил текст санд нэг л удаа хадгалагдана (storeGenerated): шалгалтад нэг удаа
      const drafts = all.filter((d, i) => all.findIndex((x) => x.prompt === d.prompt) === i);
      // олон янзын хувилбар (квадрат, язгуур нь 2–20-ийн тоогоор хязгаарлагдмал)
      expect(drafts.length).toBeGreaterThan(t.id === 'square-root' ? 30 : 60);
      // Gemini-ийн асуултад тавьдаг ижил шалгалт: 4 ялгаатай сонголт, урт, кирилл, сэдэв.
      const { rejected } = validateDrafts(drafts, topicIds(1, 'math'));
      expect(rejected).toEqual([]);

      for (const d of drafts) {
        const right = num(d.options[0]);
        const p = d.prompt;
        let m: RegExpExecArray | null;
        if ((m = /^ХИЕХ\((\d+), (\d+)\)/.exec(p))) expect(right).toBe(gcd(+m[1], +m[2]));
        else if ((m = /^ХБЕХ\((\d+), (\d+)\)/.exec(p))) expect(right).toBe((+m[1] * +m[2]) / gcd(+m[1], +m[2]));
        else if ((m = /^(\d+)² /.exec(p))) expect(right).toBe(+m[1] * +m[1]);
        else if ((m = /^√(\d+) /.exec(p))) expect(right * right).toBe(+m[1]);
        else if ((m = /хамгийн (их|бага)/.exec(p))) {
          const list = p.split(' тоонуудын')[0].split(', ').map(num);
          expect(right).toBe(m[1] === 'их' ? Math.max(...list) : Math.min(...list));
        } else if ((m = /хуваагдах вэ/.exec(p))) {
          const d6 = Number(/(\d)-[тд] хуваагдах/.exec(p)![1]);
          expect(d.options.map(num).filter((n) => n % d6 === 0)).toEqual([right]);
        } else if (/анхны тоо/.test(p)) {
          const prime = (n: number) => n > 1 && [...Array(n).keys()].slice(2).every((k) => n % k !== 0);
          expect(d.options.map(num).filter(prime)).toEqual([right]);
        } else {
          // (a) ± (b), (a) · (b), (a) : (b)
          const expr = p.replace(' хэдтэй тэнцүү вэ?', '').replaceAll('−', '-').replaceAll('·', '*').replaceAll(':', '/');
          expect(Function(`return ${expr}`)()).toBe(right);
        }
      }
    });
  }

  it('зангилааны хуудасны хүрээнд эхэлдэг загваруудыг олно', () => {
    expect(templatesFor({ slug: 'math-6', from: 10, to: 13 }).map((t) => t.id)).toEqual(['mul-div-integers', 'divisible-by']);
    expect(templatesFor({ slug: 'math-7', from: 5, to: 6 })).toEqual([]);
  });

  it('хоёр загвартай зангилаанд ээлжлэн, 5 ялгаатай бодлого', () => {
    const out = generate(templatesFor({ slug: 'math-6', from: 10, to: 13 }), 5, seeded(1));
    expect(out.map((o) => o.template.id)).toEqual(['mul-div-integers', 'divisible-by', 'mul-div-integers', 'divisible-by', 'mul-div-integers']);
    expect(new Set(out.map((o) => o.draft.prompt)).size).toBe(5);
  });
});
