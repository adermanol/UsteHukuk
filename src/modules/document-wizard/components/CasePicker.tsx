"use client"

import { useMemo, useState } from 'react'
import { Search, FolderOpen, X } from 'lucide-react'
import type { CaseRow } from '@/modules/case-files'

/** Üretilen belgeyi bir dosyaya (case) bağlayıp kalıcı olarak kaydetmek
 * için arama açılır listesi. Bağımlılıksız, ClientPicker ile aynı desen. */
export function CasePicker({
  cases,
  selected,
  onSelect,
}: {
  cases: CaseRow[];
  selected: CaseRow | null;
  onSelect: (c: CaseRow | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases.slice(0, 8);
    return cases.filter(c =>
      c.title.toLowerCase().includes(q) || (c.office_no ?? '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [cases, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-sm">
        <span className="flex items-center gap-2 min-w-0 text-foreground">
          <FolderOpen size={14} className="text-[var(--primary)] shrink-0" />
          <span className="truncate">{selected.title}{selected.office_no ? ` (${selected.office_no})` : ''}</span>
        </span>
        <button type="button" onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Kaldır">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Dosya adı veya büro no ile ara..."
          className="w-full pl-7 pr-2 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-[var(--primary)]"
        />
      </div>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Eşleşen dosya yok.</p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(c); setQuery(''); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-accent transition-colors"
            >
              <FolderOpen size={12} className="text-muted-foreground shrink-0" />
              <span className="truncate text-foreground">{c.title}{c.office_no ? ` (${c.office_no})` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
