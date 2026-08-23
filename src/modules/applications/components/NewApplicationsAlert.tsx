"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'
import { fetchPendingApplicationsCount } from '../services/applicationsRepository'

const SESSION_FLAG = 'ustehukuk_pending_apps_shown';

/** Panele girişte, henüz kontrol edilmemiş ("pending") başvuru varsa bir
 * kerelik bildirim penceresi gösterir. `sessionStorage` kullanılır (localStorage
 * DEĞİL) — böylece aynı oturum içinde sayfa gezinmelerinde tekrar tekrar
 * açılmaz, ama her yeni giriş/sekme açılışında (yeni oturum) tekrar
 * değerlendirilir. Dashboard layout'una monte edilir, tüm panel
 * sayfalarında (hangi sayfaya iniliyorsa) devreye girer. */
export function NewApplicationsAlert() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_FLAG) === '1') return;
    fetchPendingApplicationsCount().then(count => {
      if (count > 0) {
        setPendingCount(count);
        setIsOpen(true);
      }
      sessionStorage.setItem(SESSION_FLAG, '1');
    }).catch(() => {});
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
      <div
        className="relative glass-panel rounded-3xl border border-[var(--primary)]/30 shadow-2xl max-w-sm w-full p-7 text-center animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Kapat"
        >
          <X size={18} />
        </button>
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center">
          <Sparkles size={26} className="text-[var(--primary)]" />
        </div>
        <h3 className="font-serif text-xl text-foreground mb-2">
          {pendingCount === 1 ? '1 Yeni Başvuru' : `${pendingCount} Yeni Başvuru`}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Web sitenizdeki danışma formundan {pendingCount === 1 ? 'henüz incelenmemiş bir başvuru' : 'henüz incelenmemiş başvurular'} var.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Daha Sonra
          </button>
          <Link
            href="/dashboard/applications"
            onClick={() => setIsOpen(false)}
            className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--background)] hover:opacity-90 transition-opacity"
          >
            İncele
          </Link>
        </div>
      </div>
    </div>
  );
}
