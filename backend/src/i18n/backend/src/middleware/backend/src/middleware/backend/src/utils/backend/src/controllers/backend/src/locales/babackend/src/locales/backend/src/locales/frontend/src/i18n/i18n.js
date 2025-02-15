import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

const locales = RNLocalize.getLocales();
const defaultLanguage = locales[0] ? locales[0].languageCode : 'en';

const resources = {
  en: { translation: require('./locales/en.json') },
  id: { translation: require('./locales/id.json') },
  ar: { translation: require('./locales/ar.json') }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
