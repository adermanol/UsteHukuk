"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Menu, X, MapPin, Phone, Mail } from 'lucide-react'
import { LocaleToggle } from '@/lib/i18n/LocaleToggle'
import { Dictionary } from '@/lib/i18n/dictionary'
import { CmsData } from '@/lib/cms'
import { useLocale } from '@/lib/i18n/LocaleProvider'

interface MobileNavDrawerProps {
  nav: Dictionary['nav'];
  dashboardCta: string;
  general: CmsData['general'];
}

const NAV_LINKS = (nav: Dictionary['nav']) => [
  { href: '#', label: nav.home },
  { href: '#practice-areas', label: nav.practiceAreas },
  { href: '#team', label: nav.team },
  { href: '#danisma', label: nav.contact },
];

export function MobileNavDrawer({ nav, dashboardCta, general }: MobileNavDrawerProps) {
  const { dir } = useLocale();
  const [open, setOpen] = useState(false)
  // document.body'ye portallanır — bu buton `<nav className="relative z-10">`
  // içinde render ediliyor; o atanın z-index'li yığın bağlamına hapsolmadan
  // (fixed + yüksek z-index bile bu tuzağa düşer) sayfanın geri kalanının
  // üzerinde görünmesi için portal şart.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="min-w-11 min-h-11 flex items-center justify-center"
        aria-label="Menüyü aç"
      >
        <Menu size={24} />
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <div
            dir={dir}
            className={`absolute top-0 bottom-0 end-0 w-[85vw] max-w-sm bg-background border-s border-border shadow-2xl flex flex-col animate-in duration-300 ${
              dir === 'rtl' ? 'slide-in-from-left' : 'slide-in-from-right'
            }`}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <span className="font-serif text-xl text-foreground">{general.logoText}</span>
              <button
                onClick={() => setOpen(false)}
                className="min-w-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Menüyü kapat"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex flex-col p-5 gap-1 text-sm uppercase tracking-widest font-bold">
              {NAV_LINKS(nav).map(link => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="min-h-11 flex items-center text-muted-foreground hover:text-[var(--primary)] border-b border-border py-3 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="p-5 flex flex-col gap-3 text-sm text-muted-foreground border-t border-border">
              <a href={`tel:${general.phone}`} className="flex items-center gap-3 hover:text-[var(--primary)] transition-colors">
                <Phone size={15} className="shrink-0" /> {general.phone}
              </a>
              <a href={`mailto:${general.email}`} className="flex items-center gap-3 hover:text-[var(--primary)] transition-colors break-all">
                <Mail size={15} className="shrink-0" /> {general.email}
              </a>
              <span className="flex items-start gap-3">
                <MapPin size={15} className="shrink-0 mt-0.5" /> {general.address}
              </span>
            </div>

            <div className="p-5 mt-auto flex flex-col gap-4 border-t border-border">
              <LocaleToggle className="self-start" />
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="min-h-11 flex items-center justify-center border border-border px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
              >
                {dashboardCta} →
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
