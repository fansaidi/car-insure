import en from './en.js';
import ms from './ms.js';

export const LANGUAGES = [
  { code: 'en', short: 'EN', name: 'English' },
  { code: 'ms', short: 'BM', name: 'Bahasa Melayu' },
];
export const useTranslations = (lang) => (lang === 'ms' ? ms : en);

/* Fill {placeholders} in a string. */
export const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);
