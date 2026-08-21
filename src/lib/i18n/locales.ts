export type Locale = 'tr' | 'en' | 'ar' | 'fa' | 'ru' | 'fr' | 'de';

export const DEFAULT_LOCALE: Locale = 'tr';
// Dil seçici butonunda görünme sırası — Arapça yazılı diller (ar/fa) sonda.
export const LOCALES: Locale[] = ['tr', 'en', 'ru', 'fr', 'de', 'ar', 'fa'];
export const RTL_LOCALES: Locale[] = ['ar', 'fa'];
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: 'TR',
  en: 'EN',
  ar: 'ع',
  fa: 'فا',
  ru: 'RU',
  fr: 'FR',
  de: 'DE',
};

export type Translatable = Record<Locale, string>;

export function pick(field: Translatable | undefined | null, locale: Locale): string {
  if (!field) return '';
  if (field[locale]) return field[locale];
  if (field[DEFAULT_LOCALE]) return field[DEFAULT_LOCALE];
  const firstNonEmpty = LOCALES.map(l => field[l]).find(v => v);
  return firstNonEmpty ?? '';
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value);
}

export type Direction = 'ltr' | 'rtl';

export function getDirection(locale: Locale): Direction {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}
