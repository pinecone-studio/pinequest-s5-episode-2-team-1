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
