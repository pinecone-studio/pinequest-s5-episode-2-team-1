// Баавгайн яриаг (Gemini Live-ийн output transcript) апп ба API хоёулаа засна: самбар дээр (mobile) ба TTS-д (api).

// Үгийн хил: утасны JS (Hermes) `\p{L}`-ийг дэмжихгүй байж болзошгүй тул үсгийг шууд жагсаана.
const L = 'А-Яа-яЁёӨөҮүA-Za-z';
/**
 * Live-ийн өөрийнх нь яриаг текст болгоход гардаг, байнга давтагддаг алдаанууд. TTS үүнийг үгчлэн уншдаг тул
 * "Төсөөлөөд үз дээ" нь "төсөөлөө дөө" гэж сонсогддог байсан.
 */
const FIXES: [RegExp, string][] = [
  [new RegExp(`(^|[^${L}])([Тт])өсөөлөө дөө(?=$|[^${L}])`, 'g'), '$1$2өсөөлөөд үз дээ'],
  [new RegExp(`(^|[^${L}])([Үү])з дөө(?=$|[^${L}])`, 'g'), '$1$2з дээ'],
];

export function fixTranscript(text: string): string {
  return FIXES.reduce((t, [re, to]) => t.replace(re, to), text);
}
