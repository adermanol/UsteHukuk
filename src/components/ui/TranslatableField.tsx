"use client"

import { useState } from 'react'
import { Translatable, Locale, LOCALES } from '@/lib/i18n/locales'

const LOCALE_TAB_LABELS: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  ar: 'العربية',
  fa: 'فارسی',
  ru: 'Русский',
  fr: 'Français',
  de: 'Deutsch',
};

export function TranslatableField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: Translatable;
  onChange: (next: Translatable) => void;
  multiline?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Locale>('tr');
  const Field = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-2">{label}</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {LOCALES.map(l => (
          <button
            key={l}
            type="button"
            onClick={() => setActiveTab(l)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
              activeTab === l
                ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {LOCALE_TAB_LABELS[l]}
            <span className={`w-1.5 h-1.5 rounded-full ${value[l] ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
          </button>
        ))}
      </div>
      <Field
        dir={activeTab === 'ar' || activeTab === 'fa' ? 'rtl' : 'ltr'}
        className={`w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)] ${multiline ? 'h-24' : ''}`}
        value={value[activeTab]}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [activeTab]: e.target.value })}
      />
    </div>
  )
}
