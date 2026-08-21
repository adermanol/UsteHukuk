"use client"

import { useEffect, useState } from 'react'
import { Loader2, FileCheck2, UploadCloud } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { createLedgerEntry, fetchLedgerCategories, LedgerCategoryRow } from '../services/ledgerRepository'
import { fetchCases, CaseRow } from '@/modules/case-files'

const inputClass = "w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40";
const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

/** Sahada en yüksek kullanım sıklığına sahip özellik: veznede harç makbuzunu
 * kamerayla çek, tutar+kategori+dosya seç, üç dokunuşta bitir. Kimsenin
 * doldurmadığı bir defter boş grafik üretir — bu, defteri gerçek kılan şey. */
export function QuickExpenseSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const [categories, setCategories] = useState<LedgerCategoryRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [caseId, setCaseId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [cats, caseRows] = await Promise.all([fetchLedgerCategories(), fetchCases(200)]);
        setCategories(cats.filter(c => c.entry_type === 'expense'));
        setCases(caseRows);
      } catch (err) {
        console.error('QuickExpenseSheet veri yüklenemedi:', err);
      }
    })();
  }, [open]);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'staff-private');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Yükleme başarısız');
      setAttachmentUrl(json.url);
    } catch (err) {
      console.error(err);
      setMessage('Makbuz yüklenemedi. Yine de tutar/kategori girip kaydedebilirsiniz.');
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setCaseId(''); setCategoryId(''); setAmount(''); setDescription(''); setAttachmentUrl(null); setMessage(null);
  };

  const handleSave = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0 || !caseId) {
      setMessage('Tutar ve dosya seçimi zorunludur.');
      return;
    }
    setIsSaving(true);
    const result = await createLedgerEntry({
      entry_type: 'expense',
      category_id: categoryId || null,
      case_id: caseId,
      description: description.trim() || (categories.find(c => c.id === categoryId)?.label ?? 'Masraf'),
      amount: amountNum,
      currency: 'TRY',
      fx_rate: 1,
      entry_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      paid_at: new Date().toISOString().slice(0, 10),
      payment_method: null,
      invoice_no: null,
      attachment_url: attachmentUrl,
      is_reimbursable: false,
    });
    setIsSaving(false);
    setMessage(result.message);
    if (result.success) {
      reset();
      onSaved?.();
      onClose();
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Masraf Ekle">
      <div className="space-y-3">
        <label className="flex items-center gap-3 border border-dashed border-border hover:border-[var(--primary)]/40 rounded-lg px-4 py-3 cursor-pointer bg-muted transition-colors">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {isUploading ? <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" /> : attachmentUrl ? <FileCheck2 className="w-5 h-5 text-emerald-400" /> : <UploadCloud className="w-5 h-5 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{attachmentUrl ? 'Makbuz eklendi' : 'Makbuzu Fotoğrafla'}</span>
        </label>

        <div>
          <label className={labelClass}>Dosya</label>
          <select value={caseId} onChange={e => setCaseId(e.target.value)} className={inputClass}>
            <option value="" className="bg-[var(--background)]">Seçiniz</option>
            {cases.map(c => <option key={c.id} value={c.id} className="bg-[var(--background)]">{c.title}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kategori</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass}>
              <option value="" className="bg-[var(--background)]">Seçilmedi</option>
              {categories.map(c => <option key={c.id} value={c.id} className="bg-[var(--background)]">{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tutar (TRY)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Açıklama (opsiyonel)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className={inputClass} placeholder="Örn. Duruşma harcı" />
        </div>
        <button onClick={handleSave} disabled={isSaving} className="w-full text-sm font-medium py-2.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">
          Kaydet
        </button>
        {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
      </div>
    </BottomSheet>
  );
}
