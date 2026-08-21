"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  // document.body'ye portallanır: aksi halde bu bileşen konumlandığı yerin
  // (ör. `position:relative` + z-index'li bir ata) yığın bağlamına hapsolur —
  // `fixed` + yüksek z-index olsa bile o atanın KARDEŞLERİ arasında sıralanır,
  // sayfanın geri kalanına göre değil. Bu, gerçek bir hata olarak keşfedildi
  // (bkz. public site MobileNavDrawer — aynı kökten sorun).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Sheet açıkken arka planın kaymasını engelle.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] flex flex-col glass-panel rounded-t-3xl border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300 pb-safe">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="w-8" />
          <div className="w-10 h-1 rounded-full bg-accent absolute left-1/2 -translate-x-1/2 top-2.5" />
          <h3 className="font-serif text-lg text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="min-w-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors -mr-2"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
