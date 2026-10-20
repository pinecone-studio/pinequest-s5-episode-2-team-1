import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'surgalt.session';

// Утсан дээр expo-secure-store, web хувилбар (зөвхөн хөгжүүлэлтэд) дээр localStorage.
export async function loadToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // устгах боломжгүй байсан ч session-ыг санах ойгоос цэвэрлэсэн тул асуудалгүй
  }
}
