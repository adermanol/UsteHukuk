"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, BookOpen, X, Sparkles } from 'lucide-react'

const DISMISS_KEY = 'ustehukuk_getting_started_dismissed';

/** Panele ilk kez gelen bir çalışanın Doküman Otomasyonu / Bilgi Bankası gibi
 * ana araçları hiç keşfetmeden yalnızca "More" menüsüne güvenmesi riskine
 * karşı (bkz. canlıya alma öncesi QA raporu, "navigasyon keşfedilebilirliği")
 * — tek seferlik, kapatılabilir bir ipucu. Kapatıldıktan sonra bir daha
 * gösterilmez (localStorage), yeni bir "tur" sistemi kurmaz, sadece en kritik
 * iki aracı öne çıkarır. */
export function GettingStartedHint() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="glass-card p-4 flex items-start gap-3 border-[var(--primary)]/20 bg-[var(--primary)]/5">
      <Sparkles size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm text-foreground font-medium">Sisteme yeni mi başladınız?</p>
        <p className="text-sm text-muted-foreground">
          Bu ekranda göremediğiniz araçlar da var — özellikle{' '}
          <Link href="/dashboard/documents" className="text-[var(--primary)] hover:underline inline-flex items-center gap-1">
            <FileText size={13} /> Doküman Otomasyonu
          </Link>
          {' '}(antetli dilekçe/ihtarname üretir) ve{' '}
          <Link href="/dashboard/knowledge" className="text-[var(--primary)] hover:underline inline-flex items-center gap-1">
            <BookOpen size={13} /> Bilgi Bankası
          </Link>
          . Bunlara ve diğer araçlara üst menüdeki &ldquo;Daha Fazla&rdquo; bölümünden ulaşabilirsiniz.
        </p>
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Kapat">
        <X size={16} />
      </button>
    </div>
  );
}
