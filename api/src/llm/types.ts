/** Хадгалах бүтэц: { prompt, options[4], correctIndex, explanation } */
export interface QuestionDraft {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** config/topics.ts-ийн id; загвар буруу/хоосон өгвөл байхгүй. */
  topic?: string;
  /** Зангилааны шатны хүнд: 1 Суурь, 2 Дунд, 3 Ахисан (questions.difficulty). */
  difficulty?: 1 | 2 | 3;
}

export type LlmProvider = 'gemini' | 'workers-ai';

export class LlmError extends Error {
  constructor(
    readonly provider: LlmProvider,
    readonly status: number,
    message: string,
  ) {
    super(`${provider} ${status}: ${message}`);
  }
}

/**
 * Загварт өгөх JSON schema. `solution` (бодолт) нь `correctIndex`-ээс өмнө байгаа тул
 * загвар эхлээд бодоод дараа нь хариугаа сонгоно (Gemini schema-ийн түлхүүрийн дарааллаар гаргадаг).
 */
export const QUESTIONS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Хөтөлбөрийн сэдвийн id (жагсаалтаас)' },
          prompt: { type: 'string', description: 'Асуулт (монгол кирилл)' },
          options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          solution: { type: 'string', description: 'Алхам алхмаар бодолт, хариугаа сонгохоос өмнө' },
          correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string', description: 'Сурагчид харуулах 1–2 өгүүлбэр тайлбар' },
        },
        required: ['topic', 'prompt', 'options', 'solution', 'correctIndex', 'explanation'],
      },
    },
  },
  required: ['questions'],
} as const;
