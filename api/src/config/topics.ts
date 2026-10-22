import type { Subject, Tier } from './game';

// ЕБС-ийн хөтөлбөрийн сэдвүүд (түвшин, хичээл тус бүрд). `id` нь questions.topic-д хадгалагдана:
// өөрчилбөл seed/questions.json болон DB дахь хуучин утгыг хамт шинэчилнэ.
export interface Topic {
  id: string;
  name: string;
}

export const TOPICS: Record<Tier, Record<Subject, readonly Topic[]>> = {
  1: {
    math: [
      { id: 'natural_integers', name: 'Натурал ба бүхэл тоо' },
      { id: 'negative_numbers', name: 'Сөрөг тоо' },
      { id: 'divisibility', name: 'Хуваагдах чанар (ХИЕХ, ХБЕХ)' },
      { id: 'fractions_decimals', name: 'Энгийн ба аравтын бутархай' },
      { id: 'percent', name: 'Хувь' },
      { id: 'ratio_proportion', name: 'Харьцаа ба пропорц' },
      { id: 'expressions', name: 'Энгийн илэрхийлэл' },
      { id: 'linear_equations', name: 'Нэг үл мэдэгдэгчтэй шугаман тэгшитгэл' },
      { id: 'angles', name: 'Өнцөг' },
      { id: 'triangles', name: 'Гурвалжин' },
      { id: 'rectangle_area', name: 'Тэгш өнцөгтийн периметр ба талбай' },
      { id: 'circle', name: 'Тойрог' },
      { id: 'mean', name: 'Арифметик дундаж' },
    ],
    mongolian: [
      { id: 'spelling', name: 'Зөв бичих дүрэм (эгшиг зохицох ёс, урт ба хос эгшиг)' },
      { id: 'parts_of_speech', name: 'Үгийн аймаг (нэр үг, тэмдэг нэр, тооны нэр, төлөөний үг, үйл үг)' },
      { id: 'cases', name: 'Тийн ялгал' },
      { id: 'plural', name: 'Олон тооны нөхцөл' },
      { id: 'synonyms_antonyms', name: 'Ойролцоо ба эсрэг утгатай үг' },
      { id: 'idioms', name: 'Хэлц үг' },
      { id: 'sentence_types', name: 'Өгүүлбэрийн төрөл' },
      { id: 'punctuation', name: 'Цэг тэмдэг' },
    ],
    physics: [
      { id: 'quantities_si', name: 'Физик хэмжигдэхүүн ба SI нэгж' },
      { id: 'measurement', name: 'Хэмжилт' },
      { id: 'speed', name: 'Зам, хурд, хугацаа' },
      { id: 'mass_density', name: 'Масс ба нягт' },
      { id: 'force_gravity', name: 'Хүч ба хүндийн хүч' },
      { id: 'friction', name: 'Үрэлт' },
      { id: 'simple_machines', name: 'Энгийн механизм (хөшүүрэг)' },
      { id: 'states_of_matter', name: 'Бодисын төлөв ба шилжилт (хайлах, уурших, хөлдөх)' },
      { id: 'heat_temperature', name: 'Дулаан ба температур' },
      { id: 'light_shadow', name: 'Гэрлийн шулуун тархалт ба сүүдэр' },
      { id: 'sound', name: 'Дуу' },
    ],
  },
  2: {
    math: [
      { id: 'powers_roots', name: 'Зэрэг ба квадрат язгуур' },
      { id: 'polynomials', name: 'Олон гишүүнт' },
      { id: 'factoring', name: 'Үржигдэхүүнд задлах' },
      { id: 'special_products', name: 'Товчилсон үржүүлгийн томьёо' },
      { id: 'linear_functions', name: 'Шугаман функц ба график' },
      { id: 'linear_systems', name: 'Шугаман тэгшитгэлийн систем' },
      { id: 'quadratic_equations', name: 'Квадрат тэгшитгэл' },
      { id: 'inequalities', name: 'Тэнцэтгэл биш' },
      { id: 'pythagoras', name: 'Пифагорын теорем' },
      { id: 'similar_triangles', name: 'Ижил төстэй гурвалжин' },
      { id: 'probability', name: 'Энгийн магадлал' },
      { id: 'statistics', name: 'Статистик' },
    ],
    mongolian: [
      { id: 'compound_sentences', name: 'Нийлмэл өгүүлбэр ба холбоос' },
      { id: 'sentence_parts', name: 'Өгүүлбэрийн гишүүн (өгүүлэгдэхүүн, өгүүлэхүүн, тодотгол, нөхөх гишүүн, байц)' },
      { id: 'suffixes', name: 'Дагавар ба нөхцөл залгах дүрэм' },
      { id: 'idioms_proverbs', name: 'Хэлц үг ба зүйр цэцэн үг' },
      { id: 'figures_of_speech', name: 'Уран дүрслэх хэрэглүүр (зүйрлэл, адилтгал, хэтрүүлэл)' },
      { id: 'literary_genres', name: 'Уран зохиолын төрөл зүйл' },
    ],
    physics: [
      { id: 'newton_laws', name: 'Ньютоны хуулиуд' },
      { id: 'work_power_energy', name: 'Ажил, чадал, энерги' },
      { id: 'pressure', name: 'Даралт (хатуу, шингэн, агаар)' },
      { id: 'archimedes', name: 'Архимедын хүч' },
      { id: 'heat_quantity', name: 'Дулааны тоо хэмжээ' },
      { id: 'melting_boiling', name: 'Хайлах ба буцлах' },
      { id: 'ohms_law', name: 'Цахилгаан гүйдэл, хүчдэл, эсэргүүцэл, Омын хууль' },
      { id: 'circuits', name: 'Цуваа ба зэрэгцээ холболт' },
      { id: 'magnetism', name: 'Соронзон орон' },
      { id: 'reflection_refraction', name: 'Гэрлийн ойлт ба хугарал' },
      { id: 'lenses', name: 'Линз' },
    ],
  },
  3: {
    math: [
      { id: 'quadratic_functions', name: 'Квадрат функц' },
      { id: 'exponents_logarithms', name: 'Илтгэгч ба логарифм' },
      { id: 'trigonometry', name: 'Тригонометрийн функц ба үндсэн адилтгал' },
      { id: 'progressions', name: 'Арифметик ба геометр прогресс' },
      { id: 'vectors', name: 'Вектор' },
      { id: 'combinatorics', name: 'Комбинаторик (сэлгэмэл, хэсэглэл)' },
      { id: 'probability', name: 'Магадлал' },
      { id: 'vieta', name: 'Виетийн теорем' },
      { id: 'systems', name: 'Тэгшитгэл ба тэнцэтгэл бишийн систем' },
    ],
    mongolian: [
      { id: 'styles', name: 'Найруулга зүй (албан бичиг, ярианы, уран зохиолын найруулга)' },
      { id: 'semantics', name: 'Үгийн утга зүй (олон утгатай, ижил нэртэй үг)' },
      { id: 'idioms', name: 'Хэлц хэллэг' },
      { id: 'language_culture', name: 'Хэлний соёл ба зөв хэрэглээ' },
      { id: 'composition', name: 'Эх зохиох ба хураангуйлах' },
      { id: 'punctuation', name: 'Цэг тэмдгийн хэрэглээ' },
      { id: 'literary_analysis', name: 'Уран зохиолын шинжилгээ' },
    ],
    physics: [
      { id: 'kinematics', name: 'Жигд ба жигд хувьсах хөдөлгөөн' },
      { id: 'newton_laws', name: 'Ньютоны хуулиуд' },
      { id: 'momentum', name: 'Импульс ба түүний хадгалагдах хууль' },
      { id: 'mechanical_energy', name: 'Механик энерги ба хадгалагдах хууль' },
      { id: 'circular_motion', name: 'Тойргийн хөдөлгөөн' },
      { id: 'gravitation', name: 'Бүх ертөнцийн таталцлын хууль' },
      { id: 'molecular_kinetic', name: 'Молекул кинетик онол' },
      { id: 'gas_laws', name: 'Хийн хуулиуд' },
      { id: 'thermodynamics', name: 'Термодинамикийн нэгдүгээр хууль' },
    ],
  },
};

export const topicIds = (tier: Tier, subject: Subject) => TOPICS[tier][subject].map((t) => t.id);
