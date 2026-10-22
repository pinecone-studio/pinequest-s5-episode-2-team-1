import { type Href, router } from 'expo-router';

/**
 * Өмнөх дэлгэц рүү буцна. Web дээр хуудсыг шууд нээсэн эсвэл дахин ачаалсан бол буцах түүх байхгүй
 * ("GO_BACK was not handled") тул fallback руу шилжинэ.
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
