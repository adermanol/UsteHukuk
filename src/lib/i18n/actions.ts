"use server"

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { Locale, LOCALE_COOKIE } from './locales'

export async function setLocale(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/');
}
