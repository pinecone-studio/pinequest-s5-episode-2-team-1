import type { Subject, Tier } from '../config/game';
import { TOPICS } from '../config/topics';
import type { Excerpt } from '../services/grounding';
import fixtures from '../../seed/fixtures.json';

const GRADES: Record<Tier, string> = { 1: '6–7-р анги', 2: '8–9-р анги', 3: '10–12-р анги' };

const SUBJECT_NAMES: Record<Subject, string> = { math: 'Математик', mongolian: 'Монгол хэл', physics: 'Физик' };

const SYSTEM = `You write multiple-choice quiz questions for students of Mongolian general secondary schools (ЕБС).

Language: everything the student sees (prompt, options, explanation) must be natural, grammatically correct Mongolian in Cyrillic script.
Use Ө/ө and Ү/ү correctly, follow Mongolian vowel harmony and spelling rules, and use the terminology of Mongolian textbooks.
Never translate English word-for-word. Use Mongolian names (Бат, Сараа, Тэмүүлэн, Номин…) and contexts (₮, км, Улаанбаатар) where natural.

Each question:
- "prompt": one clear, self-contained question (no pictures or diagrams), at most 220 characters, fitting the grade.
- "options": exactly 4 short, distinct choices; exactly one is correct; the others are plausible typical mistakes. No "all of the above"/"none of the above". No letter prefixes like "A)".
- "solution": solve the question step by step BEFORE choosing the answer, and double-check calculations and grammar rules. Students never see this field.
- "correctIndex": 0-based index of the correct option; it must agree with "solution".
- "explanation": 1–2 short sentences for the student explaining why the answer is correct (at most 200 characters).

Never use Russian or English words (e.g. write "цэг", not "точка"); use the Mongolian school terms.
For the Mongolian-language subject: only use grammar terms, idioms (хэлц) and proverbs whose standard meaning you are certain of, never invent them;
every example sentence must be grammatical and meaningful; in spelling questions only the wrong options may contain misspellings.
Before returning, proofread every Mongolian word for spelling and suffix (нөхцөл) errors, and make sure each explanation states the rule correctly.
Only factual, curriculum-based content. No ambiguous questions, opinions, sensitive or political topics, or personal data.`;

export function buildPrompt(
  tier: Tier,
  subject: Subject,
  count: number,
  avoid: string[],
  /** Сурах бичгийн сангаас: байвал асуултыг энэ хэсэгт үндэслэнэ. */
  excerpt: Excerpt | null = null,
): { system: string; user: string } {
  const example = (fixtures as Array<{ tier: number; subject: string; prompt: string; options: string[]; correctIndex: number; explanation: string }>)
    .find((f) => f.tier === tier && f.subject === subject);
  const topics = TOPICS[tier][subject];
  const lines = [
    `Create ${count} different questions.`,
    `Grade: Mongolian ЕБС ${GRADES[tier]} (Түвшин ${tier}).`,
    `Subject: ${SUBJECT_NAMES[subject]}.`,
  ];
  if (excerpt) {
    lines.push(
      `Base every question on this excerpt from the official Mongolian ЕБС textbook "${excerpt.title}". The student never sees it.\n<<<\n${excerpt.text}\n>>>`,
      'Use the concepts, rules, methods and exercise types taught in the excerpt (easy to medium difficulty); every question must be ' +
        'answerable with them alone. Do not copy exercises verbatim: change the numbers, names and contexts. Never mention the ' +
        'textbook, pages, exercise numbers, figures or tables. The excerpt may contain transcription artefacts or missing formulas; skip those parts.',
    );
  } else {
    lines.push(`Topics (spread the questions across different topics, easy to medium difficulty): ${topics.map((t) => t.name).join(', ')}.`);
  }
  lines.push(
    `Set "topic" of each question to the id of the one curriculum topic it practises (pick the closest): ${topics.map((t) => `${t.id} = ${t.name}`).join('; ')}.`,
  );
  if (example) {
    lines.push(
      `Example of the expected style (do not copy it): ${JSON.stringify({
        prompt: example.prompt,
        options: example.options,
        correctIndex: example.correctIndex,
        explanation: example.explanation,
      })}`,
    );
  }
  if (avoid.length) {
    lines.push(`These questions already exist; write different ones:\n- ${avoid.slice(0, 40).join('\n- ')}`);
  }
  lines.push('Return JSON: {"questions": [...]}');
  return { system: SYSTEM, user: lines.join('\n\n') };
}
