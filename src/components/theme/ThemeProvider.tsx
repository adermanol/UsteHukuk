"use client"

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeSetting } from '@/lib/theme'

/** next-themes ince sarmalayıcısı — `attribute="class"` ile <html>'e
 * .dark ekler/kaldırır (globals.css'teki :root/.dark token'larıyla eşleşir).
 * `defaultTheme`, sunucuda app_settings'ten okunan büro geneli tercih;
 * kullanıcı tarayıcıda değiştirirse localStorage'a yazılır, sunucu
 * varsayılanını etkilemez. */
export function ThemeProvider({ children, defaultTheme }: { children: React.ReactNode; defaultTheme: ThemeSetting }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
      {children}
    </NextThemesProvider>
  )
}
