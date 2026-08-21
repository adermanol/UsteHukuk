"use client"

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** CMS editörü gibi çok uzun formlarda her bölümü ayrı bir kart olarak
 * açılır/kapanır yapar — varsayılan kapalı, kullanıcı yalnızca
 * düzenlemek istediği bölümü açar, sürekli kaydırmak zorunda kalmaz. */
export function CollapsibleSection({
  title,
  icon,
  headerActions,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-[var(--background)] rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-8">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 text-xl font-bold text-[var(--primary)] flex-1 text-left min-w-0"
        >
          <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
          {icon}
          <span className="truncate">{title}</span>
        </button>
        {headerActions && <div onClick={e => e.stopPropagation()}>{headerActions}</div>}
      </div>
      {open && <div className="px-8 pb-8">{children}</div>}
    </section>
  );
}

/** Tekrarlanan alt öğeler (uzmanlık alanı, ekip üyesi, hukuki metin vb.)
 * için daha hafif bir açılır/kapanır kart — yalnızca bir özet başlık
 * gösterir, içerik varsayılan kapalı gelir. */
export function CollapsibleItem({
  summary,
  defaultOpen = false,
  headerActions,
  children,
}: {
  summary: React.ReactNode;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-muted rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 gap-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 flex-1 text-left min-w-0 text-sm font-medium text-foreground"
        >
          <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
          <span className="truncate">{summary}</span>
        </button>
        {headerActions && <div onClick={e => e.stopPropagation()} className="shrink-0">{headerActions}</div>}
      </div>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}
