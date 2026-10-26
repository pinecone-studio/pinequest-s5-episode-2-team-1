import { describe, expect, it } from 'vitest';
import { topicIds } from '../src/config/topics';
import { validateDrafts } from '../src/llm/validate';
import { generate, type Level, templatesFor } from '../src/templates';
import { MATH7 } from '../src/templates/math7';

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
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

function expressionValue(prompt: string): number {
  const expression = prompt
    .slice(prompt.indexOf(':') + 1)
    .replace('= ?', '')
    .trim()
    .replaceAll('−', '-')
    .replaceAll('·', '*')
    .replaceAll(':', '/');
  return Function(`return ${expression}`)() as number;
}

function expectCorrect(id: string, prompt: string, option: string) {
  const answer = num(option);
  let match: RegExpExecArray | null;
  if (id === 'math7-absolute-value') {
    const values = [...prompt.matchAll(/\|([−\d]+)\|/g)].map((m) => Math.abs(num(m[1])));
    const subtract = /\| [−] \|/.test(prompt);
    expect(answer).toBe(values.length === 1 ? values[0] : subtract ? values[0] - values[1] : values[0] + values[1]);
  } else if (id === 'math7-add-sub-integers' || id === 'math7-mul-div-integers' || id === 'math7-powers-of-ten') {
    expect(answer).toBe(expressionValue(prompt.replace(/10\^(\d+)/, '10**$1')));
  } else if (id === 'math7-cube-root') {
    match = /([\d]+)³/.exec(prompt);
    if (match) expect(answer).toBe(Number(match[1]) ** 3);
    else {
      match = /∛([\d]+)/.exec(prompt);
      expect(answer ** 3).toBe(Number(match![1]));
    }
  } else if (id === 'math7-prime-factorization') {
    const target = Number(/^([\d]+)/.exec(prompt)![1]);
    expect(option.split(' · ').map(Number).reduce((n, x) => n * x, 1)).toBe(target);
  } else if (id === 'math7-gcd-lcm') {
    match = /^(\d+) ба (\d+) тооны (ХИЕХ|ХБЕХ)/.exec(prompt);
    const [a, b] = [Number(match![1]), Number(match![2])];
    expect(answer).toBe(match![3] === 'ХИЕХ' ? gcd(a, b) : (a * b) / gcd(a, b));
  } else if (id === 'math7-compare-decimals') {
    const values = prompt.split(' тоонуудаас')[0].split('; ').map(Number);
    expect(answer).toBe(prompt.includes('хамгийн их') ? Math.max(...values) : Math.min(...values));
  }
}

describe('Математик 7-ын бодлогын загвар', () => {
  for (const template of MATH7) {
    it.each([1, 2, 3] as Level[])(`${template.id}, түвшин %i: хувилбарууд зөв бөгөөд 5 ялгаатай бодлого үүсгэнэ`, (level) => {
      const rng = seeded(template.id.length * 7919 + level);
      const all = Array.from({ length: 500 }, () => ({
        ...template.make(rng, level),
        correctIndex: 0,
        ...(template.topic ? { topic: template.topic } : {}),
      }));
      const drafts = all.filter((draft, i) => all.findIndex((x) => x.prompt === draft.prompt) === i);
      expect(drafts.length).toBeGreaterThan(8);
      expect(validateDrafts(drafts, topicIds(1, 'math')).rejected).toEqual([]);
      for (const draft of drafts) expectCorrect(template.id, draft.prompt, draft.options[0]);

      const generated = generate([template], 5, level, seeded(level * 101));
      expect(generated).toHaveLength(5);
      expect(new Set(generated.map((x) => x.draft.prompt)).size).toBe(5);
    });
  }

  it('зөвхөн math-7 хичээлийн хуудсуудад таарна', () => {
    expect(MATH7).toHaveLength(8);
    expect(MATH7.every((template) => template.ref.startsWith('math-7:'))).toBe(true);
    expect(templatesFor({ slug: 'math-7', from: 14, to: 18 }).map((template) => template.id)).toEqual([
      'math7-gcd-lcm',
      'math7-powers-of-ten',
      'math7-compare-decimals',
    ]);
    expect(templatesFor({ slug: 'math-6', from: 5, to: 6 }).map((template) => template.id)).toEqual(['compare-integers']);
  });
});
