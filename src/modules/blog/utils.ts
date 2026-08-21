import { LOCALES, type Translatable } from '@/lib/i18n/locales'

export function emptyTranslatable(): Translatable {
  return Object.fromEntries(LOCALES.map(l => [l, ''])) as Translatable;
}
