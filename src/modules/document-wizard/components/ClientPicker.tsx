"use client"

import { useMemo, useState } from 'react'
import { Search, User } from 'lucide-react'
import type { ClientRow } from '@/modules/clients'

/** Bir tarafı, sisteme kayıtlı bir müvekkilden doldurmak için küçük,
 * bağımlılıksız bir arama açılır listesi. `clients` tablosunda TC kimlik/
 * vergi no veya adres alanı YOK — yalnızca ad (ve varsa yabancı kimlik/
 * pasaport no) otomatik doldurulur, adres her zaman manuel girilir. */
export function ClientPicker({ clients, onSelect }: { clients: ClientRow[]; onSelect: (client: ClientRow) => void }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients.filter(c => c.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [clients, query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Kayıtlı müvekkilden seç..."
          className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-[var(--primary)]"
        />
      </div>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Eşleşen müvekkil yok.</p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(c); setQuery(''); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-accent transition-colors"
            >
              <User size={12} className="text-muted-foreground shrink-0" />
              <span className="truncate text-foreground">{c.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
