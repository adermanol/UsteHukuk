"use client"

import { createContext, useCallback, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Locale, Direction, getDirection } from './locales'
import { Dictionary, getDictionary } from './dictionary'
import { setLocale as setLocaleAction } from './actions'

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  dir: Direction;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocaleAction(next).then(() => router.refresh());
  }, [router]);

  return (
    <LocaleContext.Provider value={{ locale, dict: getDictionary(locale), dir: getDirection(locale), setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale() must be used within a LocaleProvider');
  return ctx;
}
