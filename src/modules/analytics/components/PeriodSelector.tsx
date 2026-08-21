"use client"

import { useState } from 'react'

export interface Period { from: string; to: string; label: string }

function iso(d: Date): string { return d.toISOString().slice(0, 10); }

function computePreset(key: string): Period {
  const now = new Date();
  const startOfMonth = (offsetMonths = 0) => new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const endOfMonth = (offsetMonths = 0) => new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);

  switch (key) {
    case 'this_month':
      return { from: iso(startOfMonth()), to: iso(endOfMonth()), label: 'Bu Ay' };
    case 'last_3_months':
      return { from: iso(startOfMonth(-2)), to: iso(endOfMonth()), label: 'Son 3 Ay' };
    case 'this_year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(new Date(now.getFullYear(), 11, 31)), label: 'Bu Yıl' };
    case 'last_year':
      return { from: iso(new Date(now.getFullYear() - 1, 0, 1)), to: iso(new Date(now.getFullYear() - 1, 11, 31)), label: 'Geçen Yıl' };
    default:
      return { from: iso(startOfMonth()), to: iso(endOfMonth()), label: 'Bu Ay' };
  }
}

const PRESETS = [
  { key: 'this_month', label: 'Bu Ay' },
  { key: 'last_3_months', label: 'Son 3 Ay' },
  { key: 'this_year', label: 'Bu Yıl' },
  { key: 'last_year', label: 'Geçen Yıl' },
] as const;

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [preset, setPreset] = useState('this_month');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map(p => (
        <button
          key={p.key}
          onClick={() => { setPreset(p.key); onChange(computePreset(p.key)); }}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            preset === p.key ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="date"
          value={value.from}
          onChange={e => { setPreset('custom'); onChange({ ...value, from: e.target.value, label: 'Özel' }); }}
          className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground outline-none focus:border-[var(--primary)]/40"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <input
          type="date"
          value={value.to}
          onChange={e => { setPreset('custom'); onChange({ ...value, to: e.target.value, label: 'Özel' }); }}
          className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground outline-none focus:border-[var(--primary)]/40"
        />
      </div>
    </div>
  );
}

export function defaultPeriod(): Period {
  return computePreset('this_month');
}
