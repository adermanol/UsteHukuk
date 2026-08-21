"use client"

import { useEffect, useState, useTransition } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { updateThemeSetting, ThemeSetting } from '@/lib/theme'

const OPTIONS: { id: ThemeSetting; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Açık', icon: <Sun size={20} /> },
  { id: 'dark', label: 'Koyu', icon: <Moon size={20} /> },
  { id: 'system', label: 'Sistem', icon: <Monitor size={20} /> },
];

/** İki katmanlı tema kontrolü: `setTheme` (next-themes) yalnızca bu
 * tarayıcıda, anında değiştirir (localStorage). "Büro geneli varsayılan
 * yap" ise app_settings'e yazar — yeni bir cihazdan/tarayıcıdan giren
 * herkesin göreceği ilk temayı belirler. */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  const handleSetOfficeDefault = () => {
    if (!theme) return;
    setMessage(null);
    startTransition(async () => {
      const result = await updateThemeSetting(theme as ThemeSetting);
      setMessage(result.message);
    });
  };

  if (!mounted) return <p className="text-sm text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {OPTIONS.map(o => {
          const isActive = theme === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setTheme(o.id)}
              className={`text-left p-4 rounded-2xl border transition-all relative ${
                isActive ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10' : 'border-border bg-muted/40 hover:border-[var(--primary)]/30'
              }`}
            >
              {isActive && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">{o.icon}</div>
              <span className="font-serif text-lg text-foreground">{o.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSetOfficeDefault}
          disabled={isPending}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
        >
          Büro Geneli Varsayılan Yap
        </button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}
