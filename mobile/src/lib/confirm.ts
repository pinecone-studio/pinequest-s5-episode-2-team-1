import { Alert, Platform } from 'react-native';
import { S } from '@/i18n/strings';

/** Тийм/Үгүй асуулт. Web дээр Alert товчлууртай ажилладаггүй тул window.confirm. */
export function confirm(message: string, yesLabel: string = S.common.yes): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(message) ?? true);
  return new Promise((resolve) => {
    Alert.alert(message, undefined, [
      { text: S.common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: yesLabel, onPress: () => resolve(true) },
    ]);
  });
}
