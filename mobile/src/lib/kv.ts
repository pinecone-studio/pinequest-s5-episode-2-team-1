import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Жижиг JSON утгыг төхөөрөмж дээр хадгална: native дээр SecureStore, web (зөвхөн хөгжүүлэлтэд) дээр localStorage. */
export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const raw = Platform.OS === 'web' ? (globalThis.localStorage?.getItem(key) ?? null) : await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, raw);
    else await SecureStore.setItemAsync(key, raw);
  } catch {
    // хадгалж чадаагүй ч апп үргэлжлэн ажиллана
  }
}
