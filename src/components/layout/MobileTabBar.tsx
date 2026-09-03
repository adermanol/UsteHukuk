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

// Tasarım güncellemesi (2026-09-03): etiketli/72px'lik çubuk kullanıcı
// isteğiyle "yüzen pil" (floating pill) tasarımına geçirildi — ikon-only,
// ekran kenarlarından boşluklu, tam genişlik değil. Etiketler kaldırılınca
// aktif sekmeyi belli etmek için ikonun altında sabit yükseklikte bir slot'a
// oturan küçük bir nokta göstergesi eklendi (yalnızca aktifken görünür,
// ama slot her zaman ayrılır ki ikon aktif/pasif arası geçişte zıplamasın).
const tabClass = (active: boolean) =>
  `min-w-11 min-h-11 flex flex-col items-center justify-center gap-1 rounded-full transition-colors ${
    active ? 'text-[var(--primary)]' : 'text-muted-foreground hover:text-[var(--primary)]'
  }`;

function ActiveDot({ active }: { active: boolean }) {
  return <span className={`w-1 h-1 rounded-full transition-opacity ${active ? 'opacity-100 bg-[var(--primary)]' : 'opacity-0'}`} />;
}

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
  const primary = orderedRegistry.slice(0, 4);
  const primaryLeft = primary.slice(0, 2);
  const primaryRight = primary.slice(2, 4);
  const moreItems = [...orderedRegistry.slice(4), ...STATIC_MORE_ITEMS];
  const isMoreActive = moreItems.some(item => isActive(item.href))

  return (
    <>
      {/* 6 eşit genişlikte hücre: 2 sol sekme + Hızlı Ekle + 2 sağ sekme +
          Daha Fazla. Kullanıcı geri bildirimiyle (2026-09-03) "Hızlı Ekle"
          artık pilin üstünden taşan büyük bir FAB değil, diğer sekmelerle
          AYNI boyutta, grid akışının İÇİNDE sıradan bir ikon — düzensiz
          duran taşma/farklı boyut sorunu böylece ortadan kalktı. Hücre
          sayısı gerçek çocuk sayısıyla (6) birebir eşleşmeli, aksi halde
          taşıp iki satıra çıkar. */}
      <div
        className="md:hidden print:hidden fixed left-3 right-3 h-14 bg-[var(--background)]/85 backdrop-blur-2xl border border-border rounded-full z-50 shadow-[0_10px_35px_rgba(0,0,0,0.4)]"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-6 items-center h-full px-1">
          {primaryLeft.map(({ id, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={id} href={href} className={`${tabClass(active)} relative mx-auto`} aria-label={id}>
                <Icon size={20} />
                {id === 'ajanda' && unreadCount > 0 && (
                  <span className="absolute top-0 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
                )}
                <ActiveDot active={active} />
              </Link>
            );
          })}
          <button
            onClick={() => setQuickAddOpen(true)}
            className={`${tabClass(false)} relative mx-auto text-[var(--primary)]`}
            aria-label="Hızlı ekle"
          >
            <Plus size={20} />
          </button>
          {primaryRight.map(({ id, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={id} href={href} className={`${tabClass(active)} relative mx-auto`} aria-label={id}>
                <Icon size={20} />
                {id === 'ajanda' && unreadCount > 0 && (
                  <span className="absolute top-0 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
                )}
                <ActiveDot active={active} />
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`${tabClass(isMoreActive)} relative mx-auto`}
            aria-label="Daha fazla"
          >
            <MoreHorizontal size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
            )}
            <ActiveDot active={isMoreActive} />
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
