import { Platform } from 'react-native';

/**
 * Browser дээр апп нээгдэхэд микрофоны зөвшөөрлийг асууна: баавгайтай ярилцах үед (useBearTalk.web.ts) дахин
 * асуухгүй, шууд ярьж эхэлнэ. Аль хэдийн зөвшөөрсөн эсвэл хориглосон бол юу ч хийхгүй; асуухын тулд нээсэн
 * урсгалыг тэр дор нь хааж, mic-ийн заагч асаалттай үлдэхгүй. Native дээр expo-audio ярилцах үедээ асууна.
 */
export async function askMicOnWeb(): Promise<void> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const perm = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    if (perm && perm.state !== 'prompt') return;
  } catch {
    // Permissions API-д microphone байхгүй browser: шууд асууна
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // татгалзсан эсвэл микрофонгүй: баавгайтай ярих үед дахин оролдож, алдааг тэнд харуулна
  }
}
