"use client"

import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { fetchChecklistForKind, ChecklistItemRow, InstitutionRow } from '../services/institutionsRepository'

const PREP_ITEMS = ['Vekaletname aslı / görevlendirme yazısı', 'Baro kimlik kartı', 'Görüş talep formu (doldurulmuş)'];

/** Cezaevi görüşü hazırlık föyü — plandaki tek en fazla fark yaratacak
 * özellik. Avukat kapıya girmeden önce yazdırır veya ekran görüntüsü alır:
 * müvekkil adı + baba adı + koğuş, dosya no, sorulacak sorular, kurum
 * kuralları. Kurum girişinde telefon dolaba gideceği için ekranın kendisi
 * değil, çıktısı/ekran görüntüsü işe yarar. */
export function PrisonVisitSheet({ open, onClose, institution }: { open: boolean; onClose: () => void; institution: InstitutionRow }) {
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [clientName, setClientName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [ward, setWard] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [questions, setQuestions] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchChecklistForKind('cezaevi', institution.id).then(res => setItems(res?.items ?? [])).catch(() => setItems([]));
  }, [open, institution.id]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Cezaevi Görüşü Hazırlık Föyü">
      <div className="space-y-5 print:text-black">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Müvekkil Adı Soyadı</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Baba Adı</label>
            <input value={fatherName} onChange={e => setFatherName(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Koğuş</label>
            <input value={ward} onChange={e => setWard(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Dosya No</label>
            <input value={fileNo} onChange={e => setFileNo(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40" />
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Yanınızda Bulunması Gerekenler</p>
          <ul className="space-y-1">
            {(items.length > 0 ? items.map(i => i.label) : PREP_ITEMS).map(label => (
              <li key={label} className="text-sm text-muted-foreground flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> {label}</li>
            ))}
          </ul>
        </div>

        {institution.procedure_note && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Kurum Kuralları</p>
            <p className="text-sm text-muted-foreground">{institution.procedure_note}</p>
          </div>
        )}

        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Görüşülecek Konular</label>
          <textarea value={questions} onChange={e => setQuestions(e.target.value)} rows={4} className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40 resize-y" />
        </div>

        <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors">
          <Printer size={16} /> Yazdır / Ekran Görüntüsü Al
        </button>
      </div>
    </BottomSheet>
  );
}
