import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../src/llm/prompt';
import { validateDrafts } from '../src/llm/validate';
import { chooseWindow, gradesOfTier, type PageCandidate, refPages, windowRef } from '../src/services/grounding';

const pages = (slug: string, ...seqs: number[]): PageCandidate[] => seqs.map((seq) => ({ slug, seq }));

describe('gradesOfTier', () => {
  it('түвшин → ангиуд', () => {
    expect(gradesOfTier(1)).toEqual([6, 7]);
    expect(gradesOfTier(2)).toEqual([8, 9]);
    expect(gradesOfTier(3)).toEqual([10]);
  });
});

describe('refPages / windowRef', () => {
  it('лавлагааг хуудсуудад задлах, буцааж бичих', () => {
    expect(refPages('math-7:45-47')).toEqual(['math-7:45', 'math-7:46', 'math-7:47']);
    expect(refPages('math-10-2019:3')).toEqual(['math-10-2019:3']);
    expect(refPages('буруу')).toEqual([]);
    expect(windowRef(pages('math-7', 45, 46))).toBe('math-7:45-46');
    expect(windowRef(pages('math-7', 45))).toBe('math-7:45');
  });
});

describe('chooseWindow', () => {
  const candidates = [...pages('math-6', 10, 11, 12, 20), ...pages('math-7', 5, 6)];

  it('хамгийн бага ашиглагдсан хуудаснаас эхэлж дараалсан хуудсыг нэмнэ', () => {
    const usage = new Map([
      ['math-6:10', 3],
      ['math-6:11', 1],
      ['math-6:12', 1],
      ['math-6:20', 2],
      ['math-7:5', 2],
      ['math-7:6', 2],
    ]);
    // 11, 12 хоёулаа 1 удаа ашиглагдсан; rng=0 → эхнийх нь (11), дараа нь 12
    expect(chooseWindow(candidates, usage, new Set(), () => 0)).toEqual(pages('math-6', 11, 12));
  });

  it('дараагийн хуудас нь сонгох боломжгүй (сул текст, өөр ном, авсан) бол ганц хуудас', () => {
    const fresh = new Map<string, number>();
    expect(chooseWindow(candidates, fresh, new Set(), () => 0.99)).toEqual(pages('math-7', 6));
    expect(chooseWindow(candidates, fresh, new Set(['math-6:11']), () => 0)).toEqual(pages('math-6', 10));
    expect(chooseWindow(pages('math-6', 20), fresh, new Set(), () => 0)).toEqual(pages('math-6', 20));
  });

  it('бүгд авагдсан эсвэл ном байхгүй бол null', () => {
    expect(chooseWindow(pages('math-6', 1), new Map(), new Set(['math-6:1']))).toBeNull();
    expect(chooseWindow([], new Map(), new Set())).toBeNull();
  });
});

describe('buildPrompt (сангаас)', () => {
  const excerpt = { ref: 'math-7:45-46', title: 'Математик 7', text: 'Тооны модул гэж тоон шулуун дээрх зай.' };

  it('хэсгийг prompt-д оруулж, сэдвийн жагсаалтын оронд хэрэглэнэ', () => {
    const { user } = buildPrompt(1, 'math', 5, [], excerpt);
    expect(user).toContain('"Математик 7"');
    expect(user).toContain('Тооны модул гэж тоон шулуун дээрх зай.');
    expect(user).toContain('Never mention the textbook');
    expect(user).not.toContain('Topics (');
  });

  it('хэсэггүй бол хөтөлбөрийн сэдвийн жагсаалт', () => {
    const { user } = buildPrompt(1, 'math', 5, []);
    expect(user).toContain('Topics (');
    expect(user).not.toContain('<<<');
  });
});

describe('validateDrafts: эх сурвалж руу заасан асуулт', () => {
  const q = (prompt: string, explanation = 'Модул нь зай тул сөрөг биш.') => ({
    prompt,
    options: ['5', '-5', '0', '10'],
    correctIndex: 0,
    explanation,
  });

  it('сурагч харахгүй зураг, хуудас руу заасныг татгалзана', () => {
    for (const prompt of ['Дээрх зураг дахь гурвалжны өнцгийг ол.', 'Сурах бичгийн 45-р хуудасны бодлогыг бод.', 'Зурагт үзүүлсэн тоог ол.']) {
      expect(validateDrafts({ questions: [q(prompt)] }, []).rejected[0]?.reason).toBe('refers to source');
    }
  });

  it('энгийн бодлогыг хэвээр нь авна', () => {
    expect(validateDrafts({ questions: [q('|−5| хэдтэй тэнцүү вэ?'), q('Бат 120 хуудастай номын 30-ыг уншжээ. Хэдэн хувийг уншсан бэ?')] }, []).drafts).toHaveLength(2);
  });
});
