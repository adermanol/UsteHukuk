"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { ClientPicker } from './ClientPicker'
import type { ClientRow } from '@/modules/clients'

export interface PartyValue {
  ad: string;
  tcVergiNo: string;
  adres: string;
}

const EMPTY_PARTY: PartyValue = { ad: '', tcVergiNo: '', adres: '' };

export function PartyFieldGroup({
  label,
  value,
  onChange,
  clients = [],
}: {
  label: string;
  value: PartyValue[];
  onChange: (next: PartyValue[]) => void;
  /** Sisteme kayıtlı müvekkiller — doluysa her taraf satırında "kayıtlı
   * müvekkilden seç" araması gösterilir. clients tablosunda TC kimlik/vergi
   * no veya adres alanı olmadığı için yalnızca ad (ve varsa yabancı kimlik/
   * pasaport no) otomatik doldurulur. */
  clients?: ClientRow[];
}) {
  const parties = value.length > 0 ? value : [EMPTY_PARTY];

  const updateParty = (index: number, patch: Partial<PartyValue>) => {
    const next = parties.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange(next);
  };

  const removeParty = (index: number) => {
    const next = parties.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [EMPTY_PARTY]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-muted-foreground">{label}</label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...parties, EMPTY_PARTY])}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Taraf Ekle
        </Button>
      </div>
      <div className="space-y-3">
        {parties.map((party, index) => (
          <div key={index} className="relative p-4 bg-muted border border-border rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3">
            {parties.length > 1 && (
              <button
                type="button"
                onClick={() => removeParty(index)}
                className="absolute top-2 right-2 text-red-400/70 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {clients.length > 0 && (
              <div className="md:col-span-3">
                <ClientPicker
                  clients={clients}
                  onSelect={c => updateParty(index, {
                    ad: c.full_name,
                    tcVergiNo: c.foreign_id_no || c.passport_no || party.tcVergiNo,
                  })}
                />
              </div>
            )}
            <div>
              <span className="block text-[11px] text-muted-foreground mb-1">Ad Soyad / Unvan</span>
              <Input value={party.ad} onChange={e => updateParty(index, { ad: e.target.value })} />
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground mb-1">TC Kimlik / Vergi No</span>
              <Input value={party.tcVergiNo} onChange={e => updateParty(index, { tcVergiNo: e.target.value })} />
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground mb-1">Adres</span>
              <Input value={party.adres} onChange={e => updateParty(index, { adres: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
