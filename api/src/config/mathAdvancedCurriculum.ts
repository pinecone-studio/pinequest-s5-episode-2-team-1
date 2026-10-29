/**
 * Математик 8–10-ын сурах бичгийн бүлэг, хичээл, DB-ийн яг book_ref хүрээ.
 * Энэ нэг эх өгөгдлөөс roadmap болон бодлогын template хоёул үүснэ.
 */
export type AdvancedMathGrade = 8 | 9 | 10;

export type AdvancedMathKind =
  | 'rational'
  | 'irrational'
  | 'rounding'
  | 'arithmetic'
  | 'power'
  | 'root'
  | 'standard-form'
  | 'percent'
  | 'ratio'
  | 'scale'
  | 'inverse-proportion'
  | 'set-operation'
  | 'event-relation'
  | 'probability'
  | 'polynomial'
  | 'identity'
  | 'factorization'
  | 'algebraic-fraction'
  | 'equation'
  | 'linear-system'
  | 'inequality'
  | 'sequence'
  | 'arithmetic-progression'
  | 'linear-function'
  | 'slope'
  | 'quadratic-function'
  | 'inverse-function'
  | 'power-function'
  | 'exponential-function'
  | 'polygon-angle'
  | 'triangle-lines'
  | 'pythagoras'
  | 'circle'
  | 'construction'
  | 'similarity'
  | 'transform'
  | 'vector'
  | 'coordinate-distance'
  | 'symmetry'
  | 'bearing'
  | 'measurement'
  | 'motion-graph'
  | 'area'
  | 'surface-volume'
  | 'cross-section'
  | 'time-zone'
  | 'currency'
  | 'data-collection'
  | 'grouped-data'
  | 'histogram'
  | 'stem-leaf'
  | 'chart'
  | 'mean'
  | 'scatter'
  | 'trigonometry'
  | 'matrix'
  | 'determinant'
  | 'quartile'
  | 'factorial'
  | 'combination'
  | 'sector';

export interface AdvancedMathLesson {
  title: string;
  /** questions.book_ref-тэй яг адил бүтэн хүрээ. */
  ref: `math-${AdvancedMathGrade}:${number}-${number}`;
  kind: AdvancedMathKind;
}

export interface AdvancedMathChapter {
  title: string;
  lessons: readonly AdvancedMathLesson[];
}

const lesson = (title: string, ref: AdvancedMathLesson['ref'], kind: AdvancedMathKind): AdvancedMathLesson => ({ title, ref, kind });
const chapter = (title: string, lessons: readonly AdvancedMathLesson[]): AdvancedMathChapter => ({ title, lessons });

export const MATH8_CURRICULUM: readonly AdvancedMathChapter[] = [
  chapter('I БҮЛЭГ. ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР', [
    lesson('Рационал тоо', 'math-8:6-7', 'rational'),
    lesson('Тоог тоймлох', 'math-8:8-10', 'rounding'),
    lesson('Рационал тооны үйлдэл', 'math-8:11-13', 'arithmetic'),
    lesson('Натурал илтгэгчтэй зэрэг', 'math-8:14-14', 'power'),
    lesson('Рационал тоог зэрэгт дэвшүүлэх, рационал тооноос язгуур гаргах', 'math-8:15-16', 'root'),
    lesson('10-ын бүхэл илтгэгчтэй зэрэг', 'math-8:17-20', 'standard-form'),
  ]),
  chapter('II БҮЛЭГ. ПРОЦЕНТ, ХАРЬЦАА, ПРОПОРЦ', [
    lesson('Процент', 'math-8:21-24', 'percent'),
    lesson('Масштаб', 'math-8:25-26', 'scale'),
    lesson('Урвуу пропорционал хамаарал', 'math-8:27-32', 'inverse-proportion'),
  ]),
  chapter('III БҮЛЭГ. МАГАДЛАЛ', [
    lesson('Олонлог, түүн дээрх үйлдэл', 'math-8:33-34', 'set-operation'),
    lesson('Нийцтэй ба нийцгүй үзэгдлүүд', 'math-8:35-36', 'event-relation'),
    lesson('Үзэгдлийн магадлал', 'math-8:37-44', 'probability'),
  ]),
  chapter('IV БҮЛЭГ. ИЛЭРХИЙЛЭЛ, ТЭГШИТГЭЛ, ТЭНЦЭТГЭЛ БИШ', [
    lesson('Нэг ба олон гишүүнт', 'math-8:45-49', 'polynomial'),
    lesson('Квадратуудын ялгавар, нийлбэр ба ялгаврын квадрат', 'math-8:50-51', 'identity'),
    lesson('Олон гишүүнтийг үржигдэхүүн болгон задлах', 'math-8:52-55', 'factorization'),
    lesson('Алгебрын бутархай', 'math-8:56-57', 'algebraic-fraction'),
    lesson('Рационал тэгшитгэл', 'math-8:58-61', 'equation'),
    lesson('Хоёр хувьсагчтай шугаман тэгшитгэлийн систем', 'math-8:62-65', 'linear-system'),
    lesson('Нэг хувьсагчтай шугаман тэнцэтгэл биш', 'math-8:66-74', 'inequality'),
  ]),
  chapter('V БҮЛЭГ. ДАРААЛАЛ, ФУНКЦ', [
    lesson('Дараалал', 'math-8:75-76', 'sequence'),
    lesson('Арифметик прогресс', 'math-8:77-80', 'arithmetic-progression'),
    lesson('Шугаман функц, түүний график', 'math-8:81-82', 'linear-function'),
    lesson('Шугаман тэгшитгэлийн график, шулууны налалт', 'math-8:83-85', 'slope'),
    lesson('Шугаман тэгшитгэлийн системийг графикийн аргаар бодох', 'math-8:86-87', 'linear-system'),
    lesson('Урвуу пропорционал хамаарлын график', 'math-8:88-89', 'inverse-proportion'),
    lesson('y = ax² функц, түүний график', 'math-8:90-95', 'quadratic-function'),
  ]),
  chapter('VI БҮЛЭГ. ӨНЦӨГ, ДҮРС, БАЙГУУЛАЛТ', [
    lesson('Гүдгэр олон өнцөгтийн дотоод ба гадаад өнцөг', 'math-8:96-98', 'polygon-angle'),
    lesson('Гурвалжны дундаж шугам, өндөр, медиан, биссектрис байгуулах', 'math-8:99-100', 'triangle-lines'),
    lesson('Пифагорын теорем', 'math-8:101-104', 'pythagoras'),
    lesson('Тойрог ба шулууны харилцан байршил', 'math-8:105-106', 'circle'),
    lesson('Төв өнцөг, тойрогт багтсан өнцөг', 'math-8:107-110', 'circle'),
    lesson('Олон өнцөгт байгуулах', 'math-8:111-114', 'construction'),
    lesson('Төсөөтэй дүрсүүд', 'math-8:115-119', 'similarity'),
  ]),
  chapter('VII БҮЛЭГ. БАЙРШИЛ, ХӨДӨЛГӨӨН, ХУВИРГАЛТ', [
    lesson('Гомотет', 'math-8:120-123', 'similarity'),
    lesson('Төсөөтэй гурвалжнууд', 'math-8:124-129', 'similarity'),
    lesson('Хөдөлгөөн ба хувиргалт', 'math-8:130-134', 'transform'),
    lesson('Координатын хавтгай дахь хоёр цэгийн хоорондох зай', 'math-8:135-136', 'coordinate-distance'),
    lesson('Биетийн тэгш хэмийн хавтгай', 'math-8:137-141', 'symmetry'),
    lesson('Хойд зүгтэй үүсгэх өнцөг', 'math-8:142-148', 'bearing'),
  ]),
  chapter('VIII БҮЛЭГ. ХЭМЖИГДЭХҮҮН', [
    lesson('Урт, талбай', 'math-8:149-151', 'measurement'),
    lesson('Зам-хугацааны график', 'math-8:152-157', 'motion-graph'),
    lesson('Тойргийн урт, дугуйн талбай', 'math-8:158-159', 'area'),
    lesson('Биетийн гадаргуугийн талбай, эзлэхүүн', 'math-8:160-164', 'surface-volume'),
    lesson('Төсөөтэй дүрсүүдийн талбайн харьцаа', 'math-8:165-169', 'similarity'),
  ]),
  chapter('IX БҮЛЭГ. СТАТИСТИК', [
    lesson('Өгөгдөл цуглуулах', 'math-8:170-174', 'data-collection'),
    lesson('Өгөгдлийг бүлэглэх', 'math-8:175-177', 'grouped-data'),
    lesson('Гистограмм', 'math-8:178-179', 'histogram'),
    lesson('Иш-навчийн диаграмм', 'math-8:180-181', 'stem-leaf'),
    lesson('Өгөгдлийг график, диаграмм сонгон дүрслэх', 'math-8:182-183', 'chart'),
    lesson('Дунджууд ба далайц', 'math-8:184-187', 'mean'),
    lesson('Хүснэгт, диаграммыг тайлбарлах', 'math-8:188-200', 'chart'),
  ]),
];

export const MATH9_CURRICULUM: readonly AdvancedMathChapter[] = [
  chapter('I БҮЛЭГ. ТООН ОЛОНЛОГ, ЗЭРЭГ, ЯЗГУУР', [
    lesson('Иррационал тоо', 'math-9:7-11', 'irrational'),
    lesson('Квадрат язгуур агуулсан илэрхийлэл', 'math-9:12-13', 'root'),
    lesson('Тооны стандарт хэлбэр', 'math-9:14-16', 'standard-form'),
    lesson('Тоог тоймлох', 'math-9:17-23', 'rounding'),
  ]),
  chapter('II БҮЛЭГ. ПРОЦЕНТ, ХАРЬЦАА, ПРОПОРЦ', [
    lesson('Процент', 'math-9:24-28', 'percent'),
    lesson('Харьцаа, пропорц', 'math-9:29-32', 'ratio'),
  ]),
  chapter('III БҮЛЭГ. МАГАДЛАЛ', [
    lesson('Нийлмэл үзэгдлийн магадлал', 'math-9:33-43', 'probability'),
  ]),
  chapter('IV БҮЛЭГ. ИЛЭРХИЙЛЭЛ, ТЭГШИТГЭЛ, ТЭНЦЭТГЭЛ БИШ', [
    lesson('Алгебрын илэрхийлэл', 'math-9:44-48', 'polynomial'),
    lesson('Алгебрын бутархай илэрхийлэл', 'math-9:49-50', 'algebraic-fraction'),
    lesson('Шугаман тэгшитгэлийн систем', 'math-9:51-53', 'linear-system'),
    lesson('Шугаман тэнцэтгэл биш ба түүний систем', 'math-9:54-56', 'inequality'),
    lesson('Квадрат тэгшитгэл', 'math-9:57-59', 'equation'),
    lesson('Рационал тэгшитгэл', 'math-9:60-70', 'equation'),
  ]),
  chapter('V БҮЛЭГ. ДАРААЛАЛ, ФУНКЦ', [
    lesson('Дараалал', 'math-9:71-74', 'sequence'),
    lesson('Шугаман тэгшитгэлийн систем бодох графикийн арга', 'math-9:75-76', 'linear-system'),
    lesson('Квадрат функцийн график', 'math-9:77-78', 'quadratic-function'),
    lesson('Шугаман функцийн урвуу функц', 'math-9:79-85', 'inverse-function'),
  ]),
  chapter('VI БҮЛЭГ. ДҮРС, ӨНЦӨГ, БАЙГУУЛАЛТ', [
    lesson('Гурвалжны медиан, биссектрисийн чанар', 'math-9:86-88', 'triangle-lines'),
    lesson('Тригонометр харьцаа', 'math-9:89-94', 'trigonometry'),
    lesson('Тойргийн чанарууд', 'math-9:95-106', 'circle'),
  ]),
  chapter('VII БҮЛЭГ. БАЙРШИЛ, ХӨДӨЛГӨӨН, ХУВИРГАЛТ', [
    lesson('Хувиргалт', 'math-9:107-109', 'transform'),
    lesson('Дараалсан хувиргалт', 'math-9:110-113', 'transform'),
    lesson('Вектор', 'math-9:114-121', 'vector'),
    lesson('Хойд зүгтэй үүсгэх өнцөг, хэрэглээ', 'math-9:122-127', 'bearing'),
  ]),
  chapter('VIII БҮЛЭГ. ХЭМЖИГДЭХҮҮН', [
    lesson('Хэмжигдэхүүний бодлого', 'math-9:128-131', 'measurement'),
    lesson('Дэлхийн цагийн бүс', 'math-9:132-134', 'time-zone'),
    lesson('Хурд-хугацааны график', 'math-9:135-136', 'motion-graph'),
    lesson('Валют шилжүүлэх', 'math-9:137-138', 'currency'),
    lesson('Дүрсийн талбай', 'math-9:139-147', 'area'),
    lesson('Гадаргуугийн талбай, эзлэхүүн', 'math-9:148-152', 'surface-volume'),
    lesson('Биетийн хавтгай огтлол', 'math-9:153-166', 'cross-section'),
  ]),
  chapter('IX БҮЛЭГ. ӨГӨГДӨЛТЭЙ АЖИЛЛАХ', [
    lesson('Өгөгдөл цуглуулах', 'math-9:167-168', 'data-collection'),
    lesson('Статистик диаграммууд', 'math-9:169-173', 'chart'),
    lesson('Цэгэн диаграмм', 'math-9:174-176', 'scatter'),
    lesson('Дунджууд ба далайц', 'math-9:177-195', 'mean'),
  ]),
];

export const MATH10_CURRICULUM: readonly AdvancedMathChapter[] = [
  chapter('I БҮЛЭГ. ОЛОНЛОГ', [
    lesson('Олонлог', 'math-10:5-8', 'set-operation'),
  ]),
  chapter('II БҮЛЭГ. ТООН БА ҮСЭГТ ИЛЭРХИЙЛЭЛ', [
    lesson('Бүхэл тоон илтгэгчтэй зэрэг, түүний чанар', 'math-10:9-11', 'power'),
    lesson('n зэргийн язгуур ба n зэргийн арифметик язгуур, түүний чанар', 'math-10:12-14', 'root'),
    lesson('Рационал тоон илтгэгчтэй зэрэг', 'math-10:15-17', 'power'),
    lesson('Стандарт хэлбэрээр бичсэн тооны үйлдэл', 'math-10:18-18', 'standard-form'),
    lesson('Бодит тооны үйлдлийн чанар', 'math-10:19-20', 'arithmetic'),
  ]),
  chapter('III БҮЛЭГ. АЛГЕБРЫН ИЛЭРХИЙЛЭЛ', [
    lesson('Рационал тоон илтгэгчтэй зэрэг бүхий алгебрын илэрхийлэл', 'math-10:21-22', 'power'),
    lesson('Алгебрын илэрхийллийг үржигдэхүүн болгон задлах', 'math-10:23-25', 'factorization'),
    lesson('Алгебрын бутархайн үржүүлэх, хуваах үйлдэл', 'math-10:26-26', 'algebraic-fraction'),
    lesson('Алгебрын бутархайн нэмэх, хасах үйлдэл', 'math-10:27-32', 'algebraic-fraction'),
  ]),
  chapter('IV БҮЛЭГ. КООРДИНАТЫН АРГА', [
    lesson('Тэгш өнцөгт координатын систем, цэгийн координат', 'math-10:33-36', 'coordinate-distance'),
    lesson('Шулууны налалт', 'math-10:37-37', 'slope'),
    lesson('Шулууны тэгшитгэл', 'math-10:38-40', 'linear-function'),
    lesson('Координатын эх дээр төвтэй, r радиустай тойргийн тэгшитгэл', 'math-10:41-42', 'circle'),
  ]),
  chapter('V БҮЛЭГ. ФУНКЦ БА ГРАФИК', [
    lesson('Функц, функцийн тодорхойлогдох муж ба дүр', 'math-10:43-45', 'linear-function'),
    lesson('Квадрат функц', 'math-10:46-57', 'quadratic-function'),
    lesson('Урвуу пропорционал функцийн график', 'math-10:58-59', 'inverse-proportion'),
    lesson('Зэрэгт функцийн график', 'math-10:60-63', 'power-function'),
    lesson('Илтгэгч функцийн график', 'math-10:64-64', 'exponential-function'),
    lesson('Муруйн шүргэгч, шүргэгчийн налалт', 'math-10:65-66', 'slope'),
  ]),
  chapter('VI БҮЛЭГ. ТЭГШИТГЭЛ, ТЭНЦЭТГЭЛ БИШ', [
    lesson('Нэг хувьсагчтай шугаман тэнцэтгэл биш ба тэдгээрийн систем', 'math-10:67-70', 'inequality'),
    lesson('Квадрат тэгшитгэл', 'math-10:71-73', 'equation'),
    lesson('Квадрат тэгшитгэлд шилждэг тэгшитгэл', 'math-10:74-75', 'equation'),
    lesson('Хоёр хувьсагчтай шугаман тэнцэтгэл биш, тэдгээрийн систем', 'math-10:76-81', 'inequality'),
    lesson('Илтгэгч тэгшитгэл', 'math-10:82-86', 'exponential-function'),
  ]),
  chapter('VII БҮЛЭГ. ТОЙРОГ БА ОЛОН ӨНЦӨГТ', [
    lesson('Тойрогт багтсан өнцөг', 'math-10:87-89', 'circle'),
    lesson('Тойрогт багтсан ба тойрог багтаасан олон өнцөгт', 'math-10:90-94', 'circle'),
    lesson('Тойргийн хөвч, шүргэгч, огтлогчийн чанар', 'math-10:95-99', 'circle'),
    lesson('Цэгийн геометр байр', 'math-10:100-102', 'construction'),
  ]),
  chapter('VIII БҮЛЭГ. ТРИГОНОМЕТР ХАРЬЦАА', [
    lesson('0°–180° хоорондох өнцгийн тригонометр харьцаа', 'math-10:103-105', 'trigonometry'),
    lesson('Косинус, синусын теорем', 'math-10:106-111', 'trigonometry'),
    lesson('Гурвалжны талбай', 'math-10:112-115', 'area'),
  ]),
  chapter('IX БҮЛЭГ. ХАВТГАЙ ДЭЭРХ ВЕКТОР', [
    lesson('Вектор, түүн дээр хийх үйлдэл', 'math-10:116-123', 'vector'),
    lesson('Координатын хавтгай дээрх вектор', 'math-10:124-125', 'vector'),
    lesson('Векторын үйлдлийг координатаар илэрхийлэх', 'math-10:126-127', 'vector'),
    lesson('Хоёр векторын скаляр үржвэр, хоёр векторын хоорондох өнцөг', 'math-10:128-131', 'vector'),
  ]),
  chapter('X БҮЛЭГ. МАТРИЦ', [
    lesson('Мэдээллийн матриц', 'math-10:132-133', 'matrix'),
    lesson('Матрицыг нэмэх ба матрицыг тоогоор үржүүлэх үйлдэл', 'math-10:134-138', 'matrix'),
    lesson('Матрицын үржүүлэх үйлдэл', 'math-10:139-142', 'matrix'),
    lesson('Нэгж матриц', 'math-10:143-144', 'matrix'),
    lesson('Матрицын тодорхойлогч', 'math-10:145-146', 'determinant'),
    lesson('Урвуу матриц', 'math-10:147-152', 'determinant'),
  ]),
  chapter('XI БҮЛЭГ. ГЕОМЕТРИЙН ХУВИРГАЛТ', [
    lesson('Координатын хавтгай дахь хувиргалт', 'math-10:153-155', 'transform'),
    lesson('Цэгийн хувь дахь тэгш хэм', 'math-10:156-156', 'transform'),
    lesson('Тэнхлэгийн тэгш хэм', 'math-10:157-159', 'transform'),
    lesson('Эргүүлэлт', 'math-10:160-160', 'transform'),
    lesson('Параллел зөөлт', 'math-10:161-161', 'transform'),
    lesson('Гомотет', 'math-10:162-165', 'similarity'),
  ]),
  chapter('XII БҮЛЭГ. ӨГӨГДЛИЙН ШИНЖИЛГЭЭ', [
    lesson('Бүлэглэсэн өгөгдлийн дунджууд', 'math-10:166-167', 'mean'),
    lesson('Гистограмм', 'math-10:168-169', 'histogram'),
    lesson('Квартил, квартил хоорондын далайц', 'math-10:170-171', 'quartile'),
    lesson('Хуримтлагдсан давтамжийн график, хэрэглээ', 'math-10:172-174', 'chart'),
    lesson('Цэгэн диаграмм, хандлагын шулуун, корреляц', 'math-10:175-179', 'scatter'),
  ]),
  chapter('XIII БҮЛЭГ. КОМБИНАТОРИК', [
    lesson('Факториал', 'math-10:180-180', 'factorial'),
    lesson('Сэлгэмэл ба хэсэглэл', 'math-10:181-184', 'combination'),
  ]),
  chapter('XIV БҮЛЭГ. МАГАДЛАЛ', [
    lesson('Нийцтэй ба нийцгүй үзэгдлүүд', 'math-10:185-187', 'event-relation'),
    lesson('Нийлмэл үзэгдлийн магадлал', 'math-10:188-192', 'probability'),
  ]),
  chapter('XV БҮЛЭГ. ХЭМЖИГДЭХҮҮН', [
    lesson('Тойргийн нумын урт, дугуйн сектор, сегментийн талбай', 'math-10:193-195', 'sector'),
    lesson('Биетийн гадаргуугийн талбай ба эзлэхүүн', 'math-10:196-202', 'surface-volume'),
    lesson('Пирамид, цилиндр, призм, бөмбөрцөг, конусын хавтгай огтлол', 'math-10:203-211', 'cross-section'),
  ]),
];

export const ADVANCED_MATH_CURRICULUM: Readonly<Record<AdvancedMathGrade, readonly AdvancedMathChapter[]>> = {
  8: MATH8_CURRICULUM,
  9: MATH9_CURRICULUM,
  10: MATH10_CURRICULUM,
};

export const advancedMathLessons = (grade: AdvancedMathGrade): readonly AdvancedMathLesson[] =>
  ADVANCED_MATH_CURRICULUM[grade].flatMap((group) => group.lessons);

export const advancedMathTemplateId = (ref: AdvancedMathLesson['ref']): string => {
  const match = /^math-(\d+):(\d+)/.exec(ref);
  if (!match) throw new Error(`Буруу математикийн book_ref: ${ref}`);
  return `math${match[1]}-page-${match[2]}`;
};
