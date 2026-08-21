"use client"

import { useLocale } from './LocaleProvider'
import { LOCALES, LOCALE_LABELS } from './locales'

export function LocaleToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`inline-flex flex-wrap items-center rounded-full border border-border overflow-hidden text-[11px] font-bold tracking-widest ${className}`}>
      {LOCALES.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-3 py-1.5 transition-colors ${locale === l ? 'bg-[var(--primary)] text-black' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
