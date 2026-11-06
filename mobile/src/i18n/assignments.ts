// Багшийн даалгаврын текст (багш ба сурагч хоёулаа).

const DAY_MS = 86_400_000;

/** `from`-оос `to` хүртэл хэдэн өдөр (UB өдрийн YYYY-MM-DD мөрүүд). */
export const daysUntil = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

export const A = {
  // багш
  title: 'Даалгавар өгөх',
  sub: 'Сурагчид өөрсдийн цагаар хийнэ. Хэн хийсэн, хэн хийгээгүй нь доор харагдана.',
  topic: 'Сэдэв',
  mixed: 'Холимог',
  due: 'Хугацаа',
  days: (n: number) => (n === 1 ? 'Маргааш' : `${n} хоног`),
  give: 'Даалгавар өгөх',
  list: 'Өгсөн даалгаврууд',
  empty: 'Одоохондоо даалгавар өгөөгүй байна.',
  done: (n: number, of: number) => `${n}/${of} хийсэн`,
  missing: (names: string[]) => `Хийгээгүй: ${names.join(', ')}`,
  allDone: 'Бүгд хийсэн!',
  dueLabel: (left: number) => (left < 0 ? 'Хугацаа дууссан' : left === 0 ? 'Өнөөдөр дуусна' : left === 1 ? 'Маргааш хүртэл' : `${left} хоног үлдсэн`),
  // сурагч
  banner: 'Багшийн даалгавар',
  questions: (n: number) => `${n} асуулт`,
  start: 'Эхлэх',
  continue: 'Үргэлжлүүлэх',
  open: 'Харах',
  progress: (n: number, of: number) => `${n}/${of}`,
  next: 'Дараах',
  result: (ok: number, of: number) => `${ok}/${of} зөв`,
  finished: 'Даалгавар дууслаа!',
  finishedSub: 'Дүнг чинь багш харна.',
  closed: 'Хугацаа дууссан тул хариулах боломжгүй.',
  right: 'Зөв!',
  wrong: 'Буруу.',
  back: 'Анги руу буцах',
} as const;
