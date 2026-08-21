import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, Locale, isLocale } from './locales'

/** Server Component'lerde (page.tsx, layout.tsx, Footer.tsx) kullanılır. */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
