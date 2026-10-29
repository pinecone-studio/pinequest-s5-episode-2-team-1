import { CLAN_CODE_LENGTH } from '@shared/clan';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** 1284 → "1 284" (Уулын өндөр; pixel фонтод кирилл "м" байхгүй тул нэгжийг тусад нь бичнэ). */
export const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** "482913" → "482 913" (тулааны кодын адил; самбар дээр бичиж өгөхөд амар). */
export const formatClanCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** Уулд нэгдэх холбоос: профайлын холбоосын адил (вэб дээр одоогийн хаяг, утсан дээр EXPO_PUBLIC_WEB_URL). */
export function clanLink(code: string): string | null {
  const base =
    process.env.EXPO_PUBLIC_WEB_URL ?? (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : null);
  return base ? `${base.replace(/\/$/, '')}/uul/${code}` : null;
}

/** QR-д бичих текст: вэб холбоос, эс бөгөөс апп-ын холбоос (утасны энгийн камераар уншуулсан ч апп нээгдэнэ). */
export const clanQrText = (code: string) => clanLink(code) ?? Linking.createURL(`uul/${code}`);

/** QR-аас уншсан текстээс Уулын кодыг гаргана ("…/uul/482913"); таарахгүй бол null. */
export function parseClanLink(text: string): string | null {
  return text.match(new RegExp(`/uul/(\\d{${CLAN_CODE_LENGTH}})(?!\\d)`))?.[1] ?? null;
}
