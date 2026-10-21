import type { Subject, Tier } from '../config/game';
import type { Excerpt } from '../services/grounding';
import fixtures from '../../seed/fixtures.json';

const GRADES: Record<Tier, string> = { 1: '6–7-р анги', 2: '8–9-р анги', 3: '10-р анги' };

const SUBJECT_NAMES: Record<Subject, string> = { math: 'Математик', mongolian: 'Монгол хэл', physics: 'Физик' };

/** ЕБС-ийн хөтөлбөрийн сэдвүүд (асуултыг аль болох тараах зорилгоор). */
const TOPICS: Record<Tier, Record<Subject, string>> = {
  1: {
    math:
      'натурал ба бүхэл тоо, сөрөг тоо, хуваагдах чанар (ХИЕХ, ХБЕХ), энгийн ба аравтын бутархай, хувь, харьцаа ба пропорц, ' +
      'энгийн илэрхийлэл, нэг үл мэдэгдэгчтэй шугаман тэгшитгэл, өнцөг, гурвалжин, тэгш өнцөгтийн периметр ба талбай, тойрог, арифметик дундаж',
    mongolian:
      'зөв бичих дүрэм (эгшиг зохицох ёс, урт ба хос эгшиг), үгийн аймаг (нэр үг, тэмдэг нэр, тооны нэр, төлөөний үг, үйл үг), ' +
      'тийн ялгал, олон тооны нөхцөл, ойролцоо ба эсрэг утгатай үг, хэлц үг, өгүүлбэрийн төрөл, цэг тэмдэг',
    physics:
      'физик хэмжигдэхүүн ба SI нэгж, хэмжилт, зам-хурд-хугацаа, масс ба нягт, хүч ба хүндийн хүч, үрэлт, энгийн механизм (хөшүүрэг), ' +
      'бодисын төлөв ба шилжилт (хайлах, уурших, хөлдөх), дулаан ба температур, гэрлийн шулуун тархалт ба сүүдэр, дуу',
  },
  2: {
    math:
      'зэрэг ба квадрат язгуур, олон гишүүнт, үржигдэхүүнд задлах, товчилсон үржүүлгийн томьёо, шугаман функц ба график, ' +
      'шугаман тэгшитгэлийн систем, квадрат тэгшитгэл, тэнцэтгэл биш, Пифагорын теорем, ижил төстэй гурвалжин, энгийн магадлал, статистик',
    mongolian:
      'нийлмэл өгүүлбэр ба холбоос, өгүүлбэрийн гишүүн (өгүүлэгдэхүүн, өгүүлэхүүн, тодотгол, нөхөх гишүүн, байц), ' +
      'дагавар ба нөхцөл залгах дүрэм, хэлц үг ба зүйр цэцэн үг, уран дүрслэх хэрэглүүр (зүйрлэл, адилтгал, хэтрүүлэл), уран зохиолын төрөл зүйл',
    physics:
      'Ньютоны хуулиуд, ажил, чадал, энерги, даралт (хатуу, шингэн, агаар), Архимедын хүч, дулааны тоо хэмжээ, хайлах ба буцлах, ' +
      'цахилгаан гүйдэл, хүчдэл, эсэргүүцэл, Омын хууль, цуваа ба зэрэгцээ холболт, соронзон орон, гэрлийн ойлт ба хугарал, линз',
  },
  3: {
    math:
      'квадрат функц, илтгэгч ба логарифм, тригонометрийн функц ба үндсэн адилтгал, арифметик ба геометр прогресс, вектор, ' +
      'комбинаторик (сэлгэмэл, хэсэглэл), магадлал, Виетийн теорем, тэгшитгэл ба тэнцэтгэл бишийн систем',
    mongolian:
      'найруулга зүй (албан бичиг, ярианы, уран зохиолын найруулга), үгийн утга зүй (олон утгатай, ижил нэртэй үг), хэлц хэллэг, ' +
      'хэлний соёл ба зөв хэрэглээ, эх зохиох ба хураангуйлах, цэг тэмдгийн хэрэглээ, уран зохиолын шинжилгээ',
    physics:
      'жигд ба жигд хувьсах хөдөлгөөн, Ньютоны хуулиуд, импульс ба түүний хадгалагдах хууль, механик энерги ба хадгалагдах хууль, ' +
      'тойргийн хөдөлгөөн, бүх ертөнцийн таталцлын хууль, молекул кинетик онол, хийн хуулиуд, термодинамикийн нэгдүгээр хууль',
  },
};

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
    lines.push(`Topics (spread the questions across different topics, easy to medium difficulty): ${TOPICS[tier][subject]}.`);
  }
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
