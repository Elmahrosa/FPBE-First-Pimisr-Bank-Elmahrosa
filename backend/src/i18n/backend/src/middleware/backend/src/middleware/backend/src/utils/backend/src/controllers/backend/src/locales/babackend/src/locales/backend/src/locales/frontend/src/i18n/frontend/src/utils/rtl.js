import { I18nManager } from 'react-native';

export function handleRTL(language) {
  const isRTL = ['ar', 'he'].includes(language);
  I18nManager.forceRTL(isRTL);
}
