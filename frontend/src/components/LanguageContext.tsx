import { createContext } from 'react';
import { translations, Translations } from './translations';

export type Language = 'en' | 'ar';

export const isRTL = (lang: Language): boolean => lang === 'ar';

export interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Translations) => string;
  isRTL: (lang: Language) => boolean;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => { },
  t: (key: keyof Translations) => translations.en[key] || key,
  isRTL,
});