// All on-screen copy and scene timing live here. Edit this file first.
// Every claim below maps to a real feature in the KUMA app (see README.md, "Copy sources").

export const FPS = 30;

/** Length of each cross-scene transition, in frames. */
export const TRANSITION = 14;

/**
 * Nominal scene lengths in frames (30 fps). They sum to the total video length (900 = 30 s).
 * Scene boundaries land exactly on these cuts; transitions are centred on each boundary.
 */
export const SCENES = {
  hook: 90, // 0–3 s
  reveal: 120, // 3–7 s
  map: 120, // 7–11 s
  bear: 120, // 11–15 s
  duel: 120, // 15–19 s
  value: 150, // 19–24 s
  cta: 180, // 24–30 s
} as const;

export type SceneKey = keyof typeof SCENES;
export const SCENE_ORDER: SceneKey[] = ['hook', 'reveal', 'map', 'bear', 'duel', 'value', 'cta'];
export const TOTAL_FRAMES = SCENE_ORDER.reduce((n, k) => n + SCENES[k], 0);

/** Sequence length for a scene once the transition overlap is added back (half on each internal edge). */
export const sequenceLength = (key: SceneKey) => {
  const i = SCENE_ORDER.indexOf(key);
  const edges = (i > 0 ? 1 : 0) + (i < SCENE_ORDER.length - 1 ? 1 : 0);
  return SCENES[key] + (edges * TRANSITION) / 2;
};

/** Local frame offset: scenes after the first start TRANSITION/2 frames before their nominal cut. */
export const LEAD = TRANSITION / 2;

/** Global frame where each scene's nominal cut lands. */
export const sceneStart = (key: SceneKey) => SCENE_ORDER.slice(0, SCENE_ORDER.indexOf(key)).reduce((n, k) => n + SCENES[k], 0);

/**
 * Voice-over (Mongolian). One line per beat; `scripts/voice.mjs` turns all lines into speech with one Gemini TTS
 * request and saves one clip per line in public/voice/. Text is written for the ear: numbers in words, "Кума" for KUMA.
 * `at` = frames after the scene's cut where the line starts; each clip must end before the next line starts.
 */
export const VOICE = [
  { scene: 'hook', at: 0, text: 'Хичээл давтах уйтгартай юу?' },
  { scene: 'hook', at: 54, text: 'Тоглоом болгоё!' },
  { scene: 'reveal', at: 10, text: 'Энэ бол Кума. Баавгайтайгаа хамт өдөр бүр сур.' },
  { scene: 'map', at: 8, text: 'Сурах бичгийн сэдэв бүр адал явдлын газрын зураг дээр.' },
  { scene: 'bear', at: 8, text: 'Даалгавар хийж оноо цуглуулаад, баавгайгаа хувцасла.' },
  { scene: 'duel', at: 8, text: 'Найзтайгаа хичээлээрээ өрсөлд!' },
  { scene: 'value', at: 10, text: 'Зургаагаас арван хоёрдугаар ангийн математик, тоглоом шиг.' },
  { scene: 'cta', at: 24, text: 'Кумаг одоо туршаад үз!' },
] as const satisfies readonly { scene: SceneKey; at: number; text: string }[];

/** Voice settings for scripts/voice.mjs (same voice as the in-app tutor bear, GAME.TUTOR.VOICE). */
export const VOICE_STYLE = {
  model: 'gemini-3.8-flash-lite-tts',
  voice: 'Achird',
  notes: 'Warm, bright and upbeat, like a friendly older brother presenting an app to kids. Natural native Mongolian intonation. Clear, medium-fast pace.',
};

export const COPY = {
  hook: {
    line1: 'Хичээлээ давтах',
    line2: 'уйтгартай юу?',
    struck: 'уйтгартай',
    line3: 'Тоглоом болгоё.',
  },
  reveal: {
    wordmark: 'KUMA',
    // The app's own welcome-screen tagline (mobile/src/i18n/strings.ts → welcome.tagline).
    tagline: ['Өдөр бүр шинийг сурч,', 'баавгайтайгаа хамт өсөөрэй.'],
    chip: '6–12-р ангийн математик',
  },
  map: {
    index: '01',
    label: 'Сурах зам',
    headline: ['Хичээл бүр', 'адал явдал.'],
    caption: 'Сэдэв бүр газрын зураг дээр. Суурь, Дунд, Ахисан шаттай.',
  },
  bear: {
    index: '02',
    label: 'Баавгай найз',
    headline: ['Баавгай чинь', 'хамт өснө.'],
    caption: 'Даалгавар хийж оноо цуглуул, баавгайгаа хувцасла.',
  },
  duel: {
    index: '03',
    label: 'Тулаан',
    headline: ['Найзтайгаа', '1v1 өрсөлд.'],
    caption: 'Ангийнхантайгаа хичээлээрээ найрсаг уралд.',
  },
  value: {
    headline: ['Сурах бичиг дээрх сэдвүүд.', 'Тоглоом шиг.'],
    chips: [
      { text: '6–12-р ангийн математик', icon: 'icon_star' },
      { text: '5 асуулттай богино даалгавар', icon: 'icon_flame' },
      { text: 'Boss тулаан', icon: 'icon_heart' },
      { text: 'Офлайн дасгал', icon: 'icon_coin' },
    ],
  },
  cta: {
    wordmark: 'KUMA',
    headline: 'KUMA-г туршаад үз',
    url: 'surgalt.pinequest-team1.workers.dev',
    footer: '6–12-р анги · Математик',
  },
} as const;
