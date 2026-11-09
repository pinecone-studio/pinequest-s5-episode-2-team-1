// Анги tab: миний анги, ижил ангийн бусад ангитай энэ 7 хоногийн уралдаан (strings.ts дүүрсэн тул тусад нь).

const HOUR_MS = 3_600_000;

export const L = {
  title: 'Анги',
  sub: 'Ангиараа XP цуглуулж, бусад ангитай уралд.',
  /** 7 хоног дуусах хүртэл: "6 өдөр үлдлээ", сүүлийн өдөр цагаар */
  timeLeft: (ms: number) => {
    const h = Math.max(0, Math.floor(ms / HOUR_MS));
    if (h >= 24) return `${Math.floor(h / 24)} өдөр үлдлээ`;
    return h > 0 ? `${h} цаг үлдлээ` : 'Удахгүй дуусна';
  },
  tierName: (name: string) => `${name} лиг`,
  tierStart: (name: string) => `Анги бүр ${name} лигээс эхэлнэ`,
  tierNext: (next: string) => `7 хоногт 1-р байр эзэлбэл ${next} лиг рүү дэвшинэ`,
  tierTop: 'Хамгийн дээд лигт байна! 1-р байраа хамгаал.',
  promoted: (name: string) => `Баяр хүргэе! Өнгөрсөн 7 хоногт түрүүлж ${name} лигт дэвшлээ`,
  ladderA11y: (name: string, n: number) => `${name} лиг, 6 лигийн ${n}-р шат`,
  members: (n: number) => `${n} гишүүн`,
  place: 'байр',
  weekXp: (n: number) => `+${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} XP`,
  weekLabel: 'энэ 7 хоногт',
  mineTag: 'Чиний',
  statusLead: (gap: number) => (gap > 0 ? `Тэргүүлж байна! 2-р байраас ${gap} XP илүү` : 'Тэргүүлж байна, гэхдээ 2-р байртай тэнцүү'),
  statusChase: (rank: number, need: number) => `${rank}-р байрыг давахад ${need} XP дутуу`,
  statusAlone: 'Одоохондоо ганцаараа. Бусад анги нэгдэхэд уралдаан эхэлнэ.',
  doTasks: 'Даалгавар хийж XP авах',
  seeRace: 'Уралдааныг харах',
  rulesTitle: 'Яаж уралдах вэ?',
  gotIt: 'Ойлголоо',
  rules: [
    { title: 'Даалгавар хий', body: 'Ангийн хүүхэд бүр' },
    { title: '1 зөв = +10 XP', body: 'Ангийн XP-д нэмэгдэнэ' },
    { title: 'Түрүүлээд дэвш', body: '1-р байр дараагийн лигт' },
  ],
  noClanTitle: 'Ангиа үүсгээрэй',
  noClanBody: 'Анги үүсгээд ангийнхнаа кодоор урь. Ангийнхан чинь аль хэдийн үүсгэсэн бол кодоор нь нэгд.',
  toClan: 'Анги үүсгэх',
  toJoin: 'Кодоор нэгдэх',
  standings: (grade: number) => `${grade}-р ангиудын уралдаан`,
  standingsAny: 'Ангиудын уралдаан',
  noStandings: 'Одоохондоо анги алга. Анхных нь болоорой!',
  noStandingsOther: 'Энэ ангид одоохондоо анги алга.',
  gradeRow: (g: number) => `${g}-р анги`,
  gradeSheet: 'Аль ангийн уралдааныг харах вэ?',
  gradePick: (g: number) => `${g}-р ангиудын уралдаан, өөр анги сонгох`,
  myGrade: 'Миний анги',
  gradeA11y: (g: number, mine: boolean) => `${g}-р ангиудын уралдаан${mine ? ', миний анги' : ''}`,
  rowA11y: (rank: number, name: string, m: number, mine: boolean) => `${rank}-р байр, ${name} анги, энэ 7 хоногт ${m} XP${mine ? ', миний анги' : ''}`,
  close: 'Хаах',
  loadError: 'Ангийн мэдээллийг ачаалж чадсангүй.',
  retry: 'Дахин оролдох',
};
