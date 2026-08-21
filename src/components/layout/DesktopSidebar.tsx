"use client"

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Search, Settings, IdCard, LogOut, Radar, Cpu, Wrench, ShieldCheck, Bell, Contact, Crown, Newspaper } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'
import { fetchUnreadCount } from '@/modules/notifications'
import { fetchCurrentProfile } from '@/modules/team'
import { resolveNavOrder } from '@/lib/navRegistry'

// Daha az sık kullanılan araçlar tek bir flyout'a toplanır — 88px'lik rayın
// 7 ana hedeften sonra ~900px altı ekranlarda taşmasını önlemek için.
const toolItems = [
  { href: '/dashboard/documents', icon: FileText, label: 'Doküman Otomasyonu' },
  { href: '/dashboard/knowledge', icon: Search, label: 'Bilgi Bankası Arama' },
  { href: '/dashboard/legislation', icon: Radar, label: 'Mevzuat Radarı' },
  { href: '/business-card', icon: IdCard, label: 'Kartvizit Tasarımcısı' },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [flyoutPos, setFlyoutPos] = useState<{ left: number; bottom: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMaster, setIsMaster] = useState(false)
  const [navOrder, setNavOrder] = useState<string[] | null>(null)
  const toolsButtonRef = useRef<HTMLButtonElement>(null)
  const isActive = (href: string) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  const isToolActive = toolItems.some(item => isActive(item.href))
  const navItems = resolveNavOrder(navOrder)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    fetchUnreadCount().then(setUnreadCount)
  }, [pathname])
  useEffect(() => {
    fetchCurrentProfile().then(p => {
      setIsMaster(p?.role === 'master')
      setNavOrder(p?.nav_order ?? null)
    }).catch(() => setIsMaster(false))
  }, [])

  // Flyout, aside'ın kendisi (overflow-y-auto taşıyor — CSS overflow
  // kuralına göre bu, overflow-x:visible'ı da örtük olarak 'auto'ya
  // çevirip yatay taşmayı KIRPAR) içine absolute konumlanmak yerine
  // document.body'ye portallanır ve gerçek ekran koordinatlarıyla `fixed`
  // konumlanır — BottomSheet/MobileNavDrawer'da aynı kırpma sorunundan
  // dolayı zaten kullanılan çözüm.
  const toggleTools = () => {
    if (!toolsOpen && toolsButtonRef.current) {
      const rect = toolsButtonRef.current.getBoundingClientRect();
      setFlyoutPos({ left: rect.right + 8, bottom: window.innerHeight - rect.bottom });
    }
    setToolsOpen(v => !v);
  };

  return (
    <aside className="hidden md:flex flex-col w-[88px] fixed left-0 top-0 bottom-0 bg-[var(--background)]/70 backdrop-blur-3xl border-r border-border z-50 items-center py-8 gap-3 shadow-[4px_0_24px_rgba(0,0,0,0.5)] overflow-y-auto">
      <Link href="/dashboard" title="Üste Hukuk" className="w-12 h-12 mb-4 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-2xl flex items-center justify-center border border-[var(--primary)]/30 shadow-[0_0_20px_rgba(205,163,114,0.15)] relative overflow-hidden group shrink-0">
        <div className="absolute inset-0 bg-[var(--primary)] opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
        <img src="/logo-icon.svg" alt="Üste Hukuk" width={22} height={25} className="relative z-10 h-6 w-auto" />
      </Link>

      <nav className="flex flex-col gap-3 w-full items-center flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={
                active
                  ? "p-3 bg-[var(--primary)]/10 rounded-2xl text-[var(--primary)] border border-[var(--primary)]/20 shadow-inner hover:bg-[var(--primary)]/20 transition-all group"
                  : "p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group"
              }
            >
              <Icon size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
            </Link>
          )
        })}

        <button
          ref={toolsButtonRef}
          onClick={toggleTools}
          title="Araçlar"
          className={
            isToolActive || toolsOpen
              ? "p-3 bg-[var(--primary)]/10 rounded-2xl text-[var(--primary)] border border-[var(--primary)]/20 shadow-inner hover:bg-[var(--primary)]/20 transition-all group"
              : "p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group"
          }
        >
          <Wrench size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        </button>
      </nav>

      <Link href="/dashboard/bildirimler" title="Bildirimler" className="relative p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group shrink-0">
        <Bell size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" aria-label={`${unreadCount} okunmamış bildirim`} />
        )}
      </Link>
      <Link href="/dashboard/musteriler" title="Müvekkiller" className="p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group shrink-0">
        <Contact size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
      </Link>
      <Link href="/dashboard/ekip" title="Ekip" className="p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group shrink-0">
        <ShieldCheck size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
      </Link>
      <Link href="/dashboard/settings" title="Sistem Ayarları (LLM Sağlayıcı)" className="p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group shrink-0">
        <Cpu size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
      </Link>
      <Link href="/dashboard/cms" title="Site Ayarları (CMS)" className="p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group shrink-0">
        <Settings size={24} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-500" />
      </Link>
      <Link href="/dashboard/blog" title="Blog" className="p-3 text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all group shrink-0">
        <Newspaper size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
      </Link>
      {isMaster && (
        <Link href="/master" title="Platform Kontrol Merkezi" className="p-3 text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10 rounded-2xl transition-all group shrink-0">
          <Crown size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        </Link>
      )}
      <form action={logout} className="shrink-0">
        <button type="submit" title="Çıkış Yap" className="p-3 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all group">
          <LogOut size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        </button>
      </form>

      {mounted && toolsOpen && flyoutPos && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setToolsOpen(false)} />
          <div
            className="fixed z-[110] glass-panel rounded-2xl border border-border p-2 w-56 shadow-2xl max-h-[70vh] overflow-y-auto"
            style={{ left: flyoutPos.left, bottom: flyoutPos.bottom }}
          >
            {toolItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setToolsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive(href) ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon size={18} strokeWidth={1.5} /> {label}
              </Link>
            ))}
          </div>
        </>,
        document.body
      )}
    </aside>
  )
}
