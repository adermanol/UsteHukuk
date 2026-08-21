"use client"

import { useEffect, useState } from 'react'
import { MoreHorizontal, FileText, Search, Radar, IdCard, Cpu, Settings, Plus, Bell, Contact, Newspaper } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { QuickAddSheet } from './QuickAddSheet'
import { fetchUnreadNotificationCount } from '@/modules/agenda'
import { fetchCurrentProfile } from '@/modules/team'
import { resolveNavOrder, MOBILE_DEFAULT_ORDER } from '@/lib/navRegistry'

// NAV_REGISTRY'de olmayan, sıralamaya dahil edilmeyen sabit araçlar — bunlar
// her zaman "Daha Fazla" sayfasında, kayıtlı sıralamanın ALTINDA sabit kalır.
const STATIC_MORE_ITEMS = [
  { href: '/dashboard/bildirimler', icon: Bell, label: 'Bildirimler' },
  { href: '/dashboard/musteriler', icon: Contact, label: 'Müvekkiller' },
  { href: '/dashboard/documents', icon: FileText, label: 'Doküman Otomasyonu' },
  { href: '/dashboard/knowledge', icon: Search, label: 'Bilgi Bankası' },
  { href: '/dashboard/legislation', icon: Radar, label: 'Mevzuat Radarı' },
  { href: '/business-card', icon: IdCard, label: 'Kartvizit Tasarımcısı' },
  { href: '/dashboard/settings', icon: Cpu, label: 'Sistem Ayarları' },
  { href: '/dashboard/cms', icon: Settings, label: 'Site Ayarları (CMS)' },
  { href: '/dashboard/blog', icon: Newspaper, label: 'Blog' },
] as const;

// Kayıt genelinde daha resmi olan bazı etiketler, mobil ana sekmede daha
// kısa/günlük-kullanım diliyle gösterilir (ör. "Ajanda" yerine "Bugün").
const MOBILE_LABEL_OVERRIDES: Record<string, string> = { ajanda: 'Bugün' };

const tabClass = (active: boolean) =>
  `min-w-11 min-h-11 p-2 flex flex-col items-center justify-center gap-1 rounded-xl ${
    active ? 'text-[var(--primary)]' : 'text-muted-foreground hover:text-[var(--primary)] transition-colors'
  }`;

export function MobileTabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [navOrder, setNavOrder] = useState<string[] | null>(null)
  const isActive = (href: string) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  useEffect(() => {
    fetchUnreadNotificationCount().then(setUnreadCount)
  }, [pathname])

  useEffect(() => {
    fetchCurrentProfile().then(p => setNavOrder(p?.nav_order ?? null)).catch(() => setNavOrder(null))
  }, [])

  // Kayıtlı sıra yoksa mobile-özel varsayılan (ajanda/dosyalar/kurumlar/
  // finans önce) kullanılır — masaüstü rayının "Panel önce" varsayılanı
  // burada anlamsız olurdu. Kullanıcı ayarlardan sırayı özelleştirdiğinde
  // (navOrder dolu) TEK bir sıra hem masaüstünü hem mobili besler.
  const orderedRegistry = resolveNavOrder(navOrder && navOrder.length > 0 ? navOrder : MOBILE_DEFAULT_ORDER);
  const primary = orderedRegistry.slice(0, 4).map(item => ({ ...item, label: MOBILE_LABEL_OVERRIDES[item.id] ?? item.label }));
  const primaryLeft = primary.slice(0, 2);
  const primaryRight = primary.slice(2, 4);
  const moreItems = [...orderedRegistry.slice(4), ...STATIC_MORE_ITEMS];
  const isMoreActive = moreItems.some(item => isActive(item.href))

  return (
    <>
      <div className="md:hidden print:hidden fixed bottom-0 left-0 right-0 min-h-[72px] bg-[var(--background)]/80 backdrop-blur-2xl border-t border-border z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* 5 gerçek sekme eşit genişlikte bir grid'e yerleştirilir; FAB bu
            grid akışının TAMAMEN dışında, mutlak konumla tam ortaya
            (left-1/2 -translate-x-1/2) sabitlenir. Önceki flex+justify-around
            deseni, "Daha Fazla" gibi geniş etiketli öğeler yüzünden FAB'ı
            gerçek merkezden kaydırıyordu — artık etiket genişliğinden
            bağımsız, her zaman tam orta. */}
        <div className="grid grid-cols-5 items-center h-full">
          {primaryLeft.map(({ id, href, icon: Icon, label }) => (
            <Link key={id} href={href} className={`${tabClass(isActive(href))} relative mx-auto`}>
              <Icon size={20} />
              {id === 'ajanda' && unreadCount > 0 && (
                <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          {/* FAB'ın altında boş bir grid hücresi — dokunma alanı çakışmasın diye */}
          <div />
          {primaryRight.map(({ id, href, icon: Icon, label }) => (
            <Link key={id} href={href} className={`${tabClass(isActive(href))} relative mx-auto`}>
              <Icon size={20} />
              {id === 'ajanda' && unreadCount > 0 && (
                <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={`${tabClass(isMoreActive)} relative mx-auto`}
            aria-label="Daha fazla"
          >
            <MoreHorizontal size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
            )}
            <span className="text-[10px] font-medium">Daha Fazla</span>
          </button>
        </div>

        {/* Merkez FAB — "Hızlı Ekle" menüsünü açar (masraf, süre hesabı,
            duruşma, not, sohbet). Grid akışının dışında, her zaman tam
            ortada; etiket genişlikleri konumunu etkilemez. */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <button
            className="w-14 h-14 bg-[var(--primary)] text-[var(--background)] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(205,163,114,0.4)] border border-border hover:scale-105 transition-transform"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Hızlı ekle"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Diğer Bölümler">
        <div className="grid grid-cols-2 gap-3">
          {moreItems.map(({ href, icon: Icon, label }, i) => (
            <Link
              key={href + i}
              href={href}
              onClick={() => setMoreOpen(false)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-colors ${
                isActive(href)
                  ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'border-border bg-muted text-muted-foreground hover:border-[var(--primary)]/30'
              }`}
            >
              {href === '/dashboard/bildirimler' && unreadCount > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
              )}
              <Icon size={22} />
              <span className="text-xs font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </BottomSheet>

      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </>
  )
}
