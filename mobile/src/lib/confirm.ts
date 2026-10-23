import { Alert, Platform } from 'react-native';
import { S } from '@/i18n/strings';

export interface ConfirmAsk {
  message: string;
  yesLabel: string;
  resolve(ok: boolean): void;
}

let host: ((ask: ConfirmAsk) => void) | null = null;

/** ConfirmHost (web) бүртгүүлнэ: асуултыг апп доторх цонхоор харуулна. */
export function setConfirmHost(show: ((ask: ConfirmAsk) => void) | null) {
  host = show;
}

/**
 * Тийм/Үгүй асуулт. Web дээр Alert товчлууртай ажилладаггүй. window.confirm-ыг ч зарим browser (апп доторх
 * browser, webview) цонх гаргалгүй шууд false буцаадаг тул апп доторх цонхоор (ConfirmHost) асууна.
 */
export function confirm(message: string, yesLabel: string = S.common.yes): Promise<boolean> {
  if (Platform.OS === 'web') {
    const show = host;
    if (!show) return Promise.resolve(globalThis.confirm?.(message) ?? true);
    return new Promise((resolve) => show({ message, yesLabel, resolve }));
  }
  return new Promise((resolve) => {
    Alert.alert(message, undefined, [
      { text: S.common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: yesLabel, onPress: () => resolve(true) },
    ]);
  });
}
