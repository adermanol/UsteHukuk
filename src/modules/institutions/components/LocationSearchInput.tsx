"use client"

import { useState, useTransition } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { searchLocation, GeocodeResult } from '../services/geocode'

/** Kurum eklerken elle enlem/boylam girmek yerine ada göre arama —
 * OpenStreetMap Nominatim üzerinden. Seçim yapılınca adres + koordinat
 * otomatik doldurulur, harita anlamlı hale gelir. */
export function LocationSearchInput({ onSelect }: { onSelect: (result: GeocodeResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [showResults, setShowResults] = useState(false);

  let debounceTimer: ReturnType<typeof setTimeout>;

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceTimer);
    if (value.trim().length < 3) { setResults([]); return; }
    debounceTimer = setTimeout(() => {
      startTransition(async () => {
        const found = await searchLocation(value);
        setResults(found);
        setShowResults(true);
      });
    }, 500);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-2.5 py-1.5">
        <MapPin size={14} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Kurum adı veya adres yazıp konum arayın..."
          className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground outline-none"
        />
        {isPending && <Loader2 size={13} className="animate-spin text-muted-foreground shrink-0" />}
      </div>

      {showResults && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 glass-panel rounded-xl border border-border p-1.5 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onSelect(r); setQuery(r.displayName); setShowResults(false); }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"
              >
                {r.displayName}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
