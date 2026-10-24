import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Офлайн горимд харуулах серверийн сүүлийн хариу (профайл, дэлгүүр). SecureStore-ийн утга ~2 KB-аас хэтэрч болохгүй
 * тул native дээр файлд, web (зөвхөн хөгжүүлэлтэд) дээр localStorage-д бичнэ. Token энд биш, SecureStore-д.
 */
export const cacheKeys = {
  me: 'me',
  shop: (userId: number) => `shop.${userId}`,
  cosmetics: (userId: number) => `cosmetics.${userId}`,
};

const file = (key: string) => new File(Paths.document, `pq-cache-${key}.json`);
const webKey = (key: string) => `pq.cache.${key}`;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(webKey(key));
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const f = file(key);
    return f.exists ? (JSON.parse(await f.text()) as T) : null;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown): void {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(webKey(key), raw);
    else file(key).write(raw);
  } catch {
    // хадгалж чадаагүй бол офлайн үед л хоосон харагдана
  }
}

export function cacheRemove(key: string): void {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(webKey(key));
      return;
    }
    const f = file(key);
    if (f.exists) f.delete();
  } catch {
    // дараагийн нэвтрэлт дарж бичнэ
  }
}
