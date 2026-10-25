import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** Профайлын кодын орон (api GAME.PROFILE.CODE_LENGTH). */
export const PROFILE_CODE_LENGTH = 8;

/** "48219137" → "4821 9137" (уншиж, хэлж өгөхөд амар; тулааны "482 913" кодоос ялгагдана). */
export const formatProfileCode = (code: string) => `${code.slice(0, 4)} ${code.slice(4)}`;

/**
 * Профайлын холбоос: вэб дээр одоогийн хаяг, утсан дээр EXPO_PUBLIC_WEB_URL (mobile/.env). Тохируулаагүй бол null:
 * Expo Go-ийн хаяг найзын утсан дээр нээгдэхгүй тул зөвхөн кодоо илгээнэ.
 */
export function profileLink(code: string): string | null {
  const base =
    process.env.EXPO_PUBLIC_WEB_URL ?? (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : null);
  return base ? `${base.replace(/\/$/, '')}/u/${code}` : null;
}

/**
 * QR-д бичих текст: вэб холбоос, эс бөгөөс апп-ын холбоос (Expo Go-д `exp://…/--/u/<код>`, build-д `surgalt://u/<код>`),
 * тэгвэл утасны энгийн камераар уншуулсан ч апп нээгдэнэ. Апп доторх уншигч аль алийг нь уншина.
 */
export const profileQrText = (code: string) => profileLink(code) ?? Linking.createURL(`u/${code}`);

/** QR-аас уншсан эсвэл бичсэн текстээс профайлын кодыг гаргана: "…/u/48219137", "4821 9137"; таарахгүй бол null. */
export function parseProfileCode(text: string): string | null {
  const link = text.match(new RegExp(`/u/(\\d{${PROFILE_CODE_LENGTH}})(?!\\d)`));
  if (link) return link[1];
  const digits = text.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${PROFILE_CODE_LENGTH}}$`).test(digits) ? digits : null;
}
