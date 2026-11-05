/**
 * Англи хэл 6–12-ын сурах бичгийн module, unit-ийн roadmap (номын «Contents» хуудаснаас).
 * Ном нь хичээлгүй, unit-ээр бүтэцтэй тул unit бүрийг агуулгаар нь 2 хэсэг болгож, «Self-check» хуудсуудыг
 * давтлагын 3 дахь зангилаа болгосон. Template байхгүй: зангилаа бүр номын хуудасны хүрээ (`ref`).
 * Эдгээр номд хэвлэмэл хуудас = сан дахь хуудас (page_offset 0).
 */
import type { MathRoadmapNode, MathRoadmapTopic } from './mathRoadmap';

/** [хичээлийн нэр, эхлэх хуудас] */
type Lesson = readonly [title: string, from: number];

/** Хичээл бүр дараагийн хичээлийн өмнөх хуудас хүртэл; module-ийн сүүлийнх нь `last` хуудас хүртэл. */
const topic = (slug: string, title: string, last: number, lessons: readonly Lesson[]): MathRoadmapTopic => ({
  title,
  nodes: lessons.map(([name, from], i): MathRoadmapNode => {
    const to = i + 1 < lessons.length ? lessons[i + 1][1] - 1 : last;
    return { title: name, templateIds: [], ref: `${slug}:${from}-${to}` };
  }),
});

export const ENGLISH6_ROADMAP: readonly MathRoadmapTopic[] = [
  topic('english-6', 'MODULE 1. ENGLISH TIME', 40, [
    ['Back to English: цагаан толгой, to be', 8],
    ['Back to English: улс, үндэстэн, хэл', 12],
    ['Back to English: давтлага', 16],
    ['My School: өрөө, байршлын угтвар', 19],
    ['My School: хичээл, хуваарь', 23],
    ['My School: давтлага', 27],
    ["Let's Count: тоо, тэгш ба сондгой", 30],
    ["Let's Count: дэс тоо, сар, төрсөн өдөр", 34],
    ["Let's Count: давтлага", 38],
  ]),
  topic('english-6', 'MODULE 2. ME AND MINE', 73, [
    ["That's Mine: мэргэжил, давтамж", 41],
    ["That's Mine: эзэмшлийн төлөөний үг", 45],
    ["That's Mine: давтлага", 49],
    ['Body: биеийн хэсэг', 52],
    ['Body: харьцуулах зэрэг, олон тоо', 56],
    ['Body: давтлага', 60],
    ['Stories: өнгөрсөн цаг', 63],
    ['Stories: and, but, or, дайвар үг', 67],
    ['Stories: давтлага', 71],
  ]),
  topic('english-6', 'MODULE 3. EVERYDAY LIFE', 95, [
    ['Days: гараг, өдөр тутмын үйл', 74],
    ['Days: цаг, so do I, угтвар', 78],
    ['Days: давтлага', 82],
    ["What's Cooking?: some, any, хэмжээ", 85],
    ["What's Cooking?: will, would like, жор", 89],
    ["What's Cooking?: давтлага", 93],
  ]),
  topic('english-6', 'MODULE 4. NATURE PROTECTION', 117, [
    ['Weather and Seasons: цаг агаар, хувцас', 96],
    ['Weather and Seasons: should, усны эргэлт', 100],
    ['Weather and Seasons: давтлага', 104],
    ['English Environment: яст мэлхий ба туулай', 107],
    ['English Environment: жүжиг, урилга', 111],
    ['English Environment: жилийн давтлага', 115],
  ]),
];

export const ENGLISH7_ROADMAP: readonly MathRoadmapTopic[] = [
  topic('english-7', 'MODULE 1. WHAT IT IS LIKE', 51, [
    ['Welcome: мэндчилгээ, Present Simple', 10],
    ['Welcome: гэр бүл, асуух үг, this ба that', 15],
    ['Welcome: давтлага', 20],
    ['Nice Ideas: мэдрэмж, санал, бэлэг', 24],
    ['Nice Ideas: Present Perfect, will, shall', 29],
    ['Nice Ideas: давтлага', 34],
    ['Enjoying Yourself: чөлөөт цаг, төлөвлөгөө', 38],
    ['Enjoying Yourself: урилга, алдартай газрууд', 43],
    ['Enjoying Yourself: давтлага', 48],
  ]),
  topic('english-7', 'MODULE 2. SIGHTS AND SOUNDS', 93, [
    ['Tastes, Sounds and Smells: таван мэдрэхүй', 52],
    ['Tastes, Sounds and Smells: харьцуулах зэрэг, айраг', 57],
    ['Tastes, Sounds and Smells: давтлага', 62],
    ['Colours and Patterns: өнгө, хээ, a, the, some', 66],
    ['Colours and Patterns: will, өнгө холих, хамелеон', 71],
    ['Colours and Patterns: давтлага', 76],
    ['Same or Different: тэмдэг, харьцуулалт', 80],
    ['Same or Different: дэлхийн дээд амжилт', 85],
    ['Same or Different: давтлага', 90],
  ]),
  topic('english-7', 'MODULE 3. ALL ABOUT NATURE', 121, [
    ['Environment: байгаль, бохирдол, should', 94],
    ['Environment: байгаль орчны асуудал, Улаан ном', 99],
    ['Environment: давтлага', 104],
    ['Animal Kingdom: амьтад, байршлын угтвар', 108],
    ['Animal Kingdom: эмгэн хумс ба халим, хорхой шавьж', 113],
    ['Animal Kingdom: давтлага', 118],
  ]),
  topic('english-7', 'MODULE 4. WHAT AND WHEN', 149, [
    ['Long Long Ago: үлэг гүрвэл, өнгөрсөн цаг', 122],
    ['Long Long Ago: could, шинэ бүтээл, үлгэр', 127],
    ['Long Long Ago: давтлага', 132],
    ["It's Time: цаг, тоо, өдрийн хуваарь", 136],
    ["It's Time: have got to, дайвар үгийн зэрэг", 141],
    ["It's Time: давтлага", 146],
  ]),
];

export const ENGLISH8_ROADMAP: readonly MathRoadmapTopic[] = [
  topic('english-8', 'MODULE 1. ME AND OTHERS', 49, [
    ['Family and Friends: гэр бүл, look like, карт', 10],
    ['Family and Friends: найзууд, question tag', 15],
    ['Family and Friends: давтлага', 20],
    ['Routines: өдөр тутмын дэглэм', 24],
    ['Routines: сургуулийн дэглэм, гэрийн ажил', 28],
    ['Routines: давтлага', 32],
    ['All in a Week: долоо хоног, make, some ба any', 36],
    ['All in a Week: ТВ нэвтрүүлэг, асуулт', 41],
    ['All in a Week: давтлага', 46],
  ]),
  topic('english-8', 'MODULE 2. GETTING HERE', 90, [
    ['Day and Night: Дэлхий, нар, гэрэл', 50],
    ['Day and Night: Past Continuous, шар шувуу', 55],
    ['Day and Night: давтлага', 60],
    ['Around Town: орон байр, тэмдэг, Present Perfect', 64],
    ['Around Town: тээвэр, will таамаглал', 68],
    ['Around Town: давтлага', 74],
    ['Going Places: тээвэр, чиглэл, харьцуулалт', 78],
    ['Going Places: be going to, аялал', 83],
    ['Going Places: давтлага', 87],
  ]),
  topic('english-8', 'MODULE 3. DIFFERENT TIMES', 122, [
    ['Landmarks and Museums: дурсгалт газар, who ба which', 91],
    ['Landmarks and Museums: викингүүд, might, made of', 96],
    ['Landmarks and Museums: давтлага', 101],
    ['Saving the Earth: байгаль орчин, much ба many', 105],
    ['Saving the Earth: may, shall, Present Perfect', 111],
    ['Saving the Earth: давтлага', 118],
  ]),
  topic('english-8', 'MODULE 4. STUFF', 150, [
    ['What are Things Made of?: материал, шинж', 123],
    ['What are Things Made of?: хамгаалах хувцас', 128],
    ['What are Things Made of?: давтлага', 133],
    ['Food Around the World: амтлагч, Do ба Did you', 137],
    ['Food Around the World: дэлхийн хоол, Have you ever', 142],
    ['Food Around the World: давтлага', 147],
  ]),
];

export const ENGLISH9_ROADMAP: readonly MathRoadmapTopic[] = [
  topic('english-9', 'MODULE 1. MY WORLD', 49, [
    ['All About Me: хобби, хамаатан, нэр', 8],
    ['All About Me: гадаад төрх, Present Perfect', 12],
    ['All About Me: давтлага', 15],
    ['At School: сургууль, харьцуулалт, тэмдэг', 20],
    ['At School: эелдэг хүсэлт, used to', 25],
    ['At School: давтлага', 29],
    ['Sports and Fitness: спорт, play, do, go', 34],
    ['Sports and Fitness: дасгал, шууд бус яриа', 40],
    ['Sports and Fitness: давтлага', 46],
  ]),
  topic('english-9', 'MODULE 2. PAST AND PRESENT', 97, [
    ['Clothes: хувцас, made of, тэмдэг нэрийн дараалал', 50],
    ['Clothes: моодны түүх, used to', 55],
    ['Clothes: давтлага', 60],
    ['Time and Special Days: хуанли, цаг, хурим', 64],
    ['Time and Special Days: яармаг, Past Continuous', 70],
    ['Time and Special Days: давтлага', 76],
    ['Inventions: шинэ бүтээл, идэвхгүй хэв', 82],
    ['Inventions: утасны яриа, дайвар үг', 87],
    ['Inventions: давтлага', 92],
  ]),
  topic('english-9', 'MODULE 3. DIFFERENT PEOPLE', 125, [
    ["Survivor's Tales: амьд үлдэх, гамшиг", 98],
    ["Survivor's Tales: гамшиг, шууд бус яриа", 103],
    ["Survivor's Tales: давтлага", 107],
    ['People and Jobs: мэргэжил, зан чанар', 112],
    ['People and Jobs: харьцангуй өгүүлбэр, if, unless', 117],
    ['People and Jobs: давтлага', 121],
  ]),
  topic('english-9', 'MODULE 4. MAKING DECISIONS', 153, [
    ['Calculating: тоо, бутархай, хувь', 126],
    ['Calculating: оньсого, палиндром', 130],
    ['Calculating: давтлага', 134],
    ['Making Plans: will ба going to', 140],
    ['Making Plans: тохиролцоо, хуваарь', 145],
    ['Making Plans: давтлага', 149],
  ]),
];

export const ENGLISH10_ROADMAP: readonly MathRoadmapTopic[] = [
  topic('english-10', 'MODULE 1. SCHOOL DAYS', 55, [
    ['Welcome Back to English: зуны амралт, look like', 8],
    ['Welcome Back to English: all, both, half, хэллэг үйл үг', 14],
    ['Welcome Back to English: давтлага', 20],
    ['Learning Languages: хэл, улс, all ба both', 24],
    ['Learning Languages: so that, such as, since', 30],
    ['Learning Languages: давтлага', 36],
    ['Ways of Learning: суралцах хэв маяг, say ба tell', 40],
    ['Ways of Learning: шууд бус яриа, нөхцөлт өгүүлбэр', 47],
    ['Ways of Learning: давтлага', 53],
  ]),
  topic('english-10', 'MODULE 2. HUMAN DOINGS', 103, [
    ['Personal Identity: ургийн мод, question tag', 56],
    ['Personal Identity: зан чанар, Present Perfect', 61],
    ['Personal Identity: давтлага', 68],
    ['Clothing Now and Then: дээл, made of, идэвхгүй хэв', 72],
    ['Clothing Now and Then: дэлгүүр, хэллэг үйл үг', 79],
    ['Clothing Now and Then: давтлага', 84],
    ['On the Move: тээвэр, хэллэг үйл үг', 88],
    ['On the Move: идэвхгүй хэв, Монголын тээвэр', 94],
    ['On the Move: давтлага', 100],
  ]),
  topic('english-10', 'MODULE 3. FROM PLACE TO PLACE', 135, [
    ['Celebrations and Places: баяр, as ... as', 104],
    ['Celebrations and Places: шинэ жил, Halloween', 110],
    ['Celebrations and Places: давтлага', 116],
    ['Climate and Environment: цаг агаар, идиом', 120],
    ['Climate and Environment: байгаль орчин, must, should', 126],
    ['Climate and Environment: давтлага', 132],
  ]),
  topic('english-10', 'MODULE 4. CITIZENSHIP', 167, [
    ['Good Citizen: иргэн, someone ба anyone', 136],
    ['Good Citizen: баатар, нөхцөлт өгүүлбэр', 142],
    ['Good Citizen: давтлага', 148],
    ['Helping Hands: сайн дурын ажил, модаль үйл үг', 152],
    ['Helping Hands: second conditional', 158],
    ['Helping Hands: давтлага', 164],
  ]),
];

export const ENGLISH11_ROADMAP: readonly MathRoadmapTopic[] = [
  topic('english-11', 'MODULE 1. HUMAN VOICES', 55, [
    ['Welcome to Learning: gerund нийлүүлэгч, аажим өөрчлөлт', 9],
    ['Welcome to Learning: although, so that, in order to', 15],
    ['Welcome to Learning: давтлага', 20],
    ['People and Their Jobs: мэргэжил, will ба shall', 25],
    ['People and Their Jobs: gerund ба infinitive, wish', 30],
    ['People and Their Jobs: давтлага', 36],
    ['Life Stories: намтар, Past Perfect', 40],
    ['Life Stories: амьдралын түүх', 46],
    ['Life Stories: давтлага', 52],
  ]),
  topic('english-11', 'MODULE 2. LIVING WITH NATURE', 103, [
    ['Buildings and Design: барилга, идэвхгүй хэв', 56],
    ['Buildings and Design: загвар, архитектур', 63],
    ['Buildings and Design: давтлага', 68],
    ['Natural Disasters: гамшиг, Present Perfect', 72],
    ['Natural Disasters: subject ба object асуулт', 78],
    ['Natural Disasters: давтлага', 84],
    ['Habitat Interaction: амьдрах орчин, амьтад', 88],
    ['Habitat Interaction: байгаль хамгаалал', 94],
    ['Habitat Interaction: давтлага', 100],
  ]),
  topic('english-11', 'MODULE 3. FREE TIME', 135, [
    ['Sports and Entertainment: спорт, signal words', 104],
    ['Sports and Entertainment: зугаа цэнгэл', 110],
    ['Sports and Entertainment: давтлага', 116],
    ['Possessions and Personal Space: хийсвэр ба нийлмэл нэр үг', 120],
    ['Possessions and Personal Space: хувийн орон зай, adjective + preposition', 126],
    ['Possessions and Personal Space: давтлага', 132],
  ]),
  topic('english-11', 'MODULE 4. DISCOVERING LAND AND SEA', 166, [
    ['Great Expeditions: Васко да Гама, past perfect passive', 136],
    ['Great Expeditions: Торгоны зам, шууд бус яриа', 142],
    ['Great Expeditions: давтлага', 148],
    ['Wonders of Mongolia: байгалийн бүс, идэвхгүй хэв', 152],
    ['Wonders of Mongolia: бунхан, үлэг гүрвэл, харьцуулалт', 158],
    ['Wonders of Mongolia: давтлага', 164],
  ]),
];

export const ENGLISH12_ROADMAP: readonly MathRoadmapTopic[] = [
  topic('english-12', 'MODULE 1. STUDY AND WORK', 62, [
    ['Teens Today: чөлөөт цаг, Present Simple идэвхгүй хэв', 9],
    ['Teens Today: өнөөгийн өсвөр үе, сэтгэл хөдлөлийн оюун', 16],
    ['Teens Today: давтлага', 22],
    ['Learning for the Future: сурах ур чадвар, зөвлөгөөний модаль', 27],
    ['Learning for the Future: насан туршийн боловсрол, илтгэл', 34],
    ['Learning for the Future: давтлага', 40],
    ['Jobs and Society: хиймэл оюун, Future идэвхгүй хэв', 45],
    ['Jobs and Society: Малала, subject ба object асуулт', 52],
    ['Jobs and Society: давтлага', 58],
  ]),
  topic('english-12', 'MODULE 2. CULTURES AND TRADITIONS', 116, [
    ['Roots of Mongolian Identity: Алунгоо эх, өнгөний бэлгэдэл', 63],
    ['Roots of Mongolian Identity: хөгжим, нүүдэлчид, where ба when', 70],
    ['Roots of Mongolian Identity: давтлага', 76],
    ['Cultures from around the World: инуит, маасай, gerund', 81],
    ['Cultures from around the World: Дисней, ёс заншил, gerund ба infinitive', 88],
    ['Cultures from around the World: давтлага', 94],
    ['Language in Mind: дэлхийн хэлнүүд, монгол бичиг', 99],
    ['Language in Mind: уран зохиол, өнгөрсөн цагууд', 106],
    ['Language in Mind: давтлага', 112],
  ]),
  topic('english-12', 'MODULE 3. MOTHER NATURE AND WELLNESS', 152, [
    ['Nature Conservation: цөлжилт, 3R, зорилгын infinitive', 117],
    ['Nature Conservation: эко сургууль, because', 124],
    ['Nature Conservation: давтлага', 130],
    ['Healthy Lifestyle: өглөөний цай, тоолох ба тоолохгүй нэр үг', 135],
    ['Healthy Lifestyle: тархи, утасны донтолт, нөхцөлт өгүүлбэр', 142],
    ['Healthy Lifestyle: давтлага', 148],
  ]),
  topic('english-12', 'MODULE 4. GATEWAY TO SUCCESS', 188, [
    ['Technology Today: дрон, цахим аюулгүй байдал, 2 ба 3-р нөхцөл', 153],
    ['Technology Today: интернэт, онлайн сургалт, шууд бус яриа', 160],
    ['Technology Today: давтлага', 166],
    ['Sport and Entertainment: олимп, харьцуулах дайвар үг', 171],
    ['Sport and Entertainment: баримтат кино, -ed ба -ing', 178],
    ['Sport and Entertainment: давтлага', 184],
  ]),
];

const ROADMAPS: Record<number, readonly MathRoadmapTopic[]> = {
  6: ENGLISH6_ROADMAP,
  7: ENGLISH7_ROADMAP,
  8: ENGLISH8_ROADMAP,
  9: ENGLISH9_ROADMAP,
  10: ENGLISH10_ROADMAP,
  11: ENGLISH11_ROADMAP,
  12: ENGLISH12_ROADMAP,
};

export const englishRoadmapNodes = (grade: number): readonly (MathRoadmapNode & { chapter: string })[] =>
  (ROADMAPS[grade] ?? []).flatMap((group) => group.nodes.map((item) => ({ ...item, chapter: group.title })));
