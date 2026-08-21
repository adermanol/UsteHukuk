"use client"

import { useRef, useState, useTransition } from 'react'
import { Upload, X, FileWarning } from 'lucide-react'
import { parseCsvToObjects } from '@/lib/csv'
import { bulkImportInstitutions } from '../services/institutionsRepository'
import type { EditableInstitutionFields, InstitutionKind } from '../services/institutionsRepository'

const VALID_KINDS: InstitutionKind[] = [
  'adliye', 'cezaevi', 'goc_idaresi', 'emniyet', 'jandarma', 'icra_dairesi', 'noter', 'tapu', 'nufus',
  'sgk', 'vergi', 'belediye', 'baro', 'arabuluculuk', 'bilirkisi', 'konsolosluk', 'diger',
];

// Türkçe/İngilizce yaygın başlık varyantlarını EditableInstitutionFields
// anahtarlarına eşler. Eşlenmeyen başlıklar sessizce yok sayılır.
const HEADER_MAP: Record<string, string> = {
  'tür': 'kind', 'tur': 'kind', 'kind': 'kind', 'kurum türü': 'kind', 'kurum turu': 'kind',
  'ad': 'name', 'isim': 'name', 'name': 'name', 'kurum adı': 'name', 'kurum adi': 'name',
  'il': 'city', 'şehir': 'city', 'sehir': 'city', 'city': 'city',
  'ilçe': 'district', 'ilce': 'district', 'district': 'district',
  'adres': 'address', 'address': 'address',
  'telefon': 'phone', 'phone': 'phone', 'tel': 'phone',
  'e-posta': 'email', 'eposta': 'email', 'email': 'email',
  'website': 'website', 'site': 'website', 'web': 'website', 'web sitesi': 'website',
  'çalışma saatleri': 'working_hours', 'calisma saatleri': 'working_hours', 'working_hours': 'working_hours',
  'not': 'notes', 'notlar': 'notes', 'notes': 'notes',
};

const SAMPLE_CSV = 'tur,ad,il,ilce,adres,telefon,website\nadliye,Örnek Adliyesi,İzmir,Konak,"Örnek Mah. No:1",0232 000 00 00,https://example.gov.tr\n';

interface ParsedRow {
  fields: EditableInstitutionFields;
  warning: string | null;
}

export function InstitutionsCsvImport({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = (file: File) => {
    setFileName(file.name);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const objects = parseCsvToObjects(text, HEADER_MAP);
      const parsed: ParsedRow[] = objects
        .filter(o => (o.name ?? '').trim())
        .map(o => {
          const kindRaw = (o.kind ?? '').trim().toLowerCase();
          const kindValid = VALID_KINDS.includes(kindRaw as InstitutionKind);
          return {
            fields: {
              kind: (kindValid ? kindRaw : 'diger') as InstitutionKind,
              name: o.name ?? '',
              city: o.city || null,
              district: o.district || null,
              address: o.address || null,
              lat: null,
              lng: null,
              phone: o.phone || null,
              alt_phone: null,
              email: o.email || null,
              website: o.website || null,
              working_hours: o.working_hours || null,
              entrance_note: null,
              parking_note: null,
              procedure_note: null,
              notes: o.notes || null,
            },
            warning: kindValid ? null : `Tanınmayan tür "${o.kind}" — "Diğer" olarak içe aktarılacak.`,
          };
        });
      setRows(parsed);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = () => {
    if (!rows || rows.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const result = await bulkImportInstitutions(rows.map(r => r.fields));
      setMessage(result.message);
      if (result.success) { onImported(); }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel rounded-2xl border border-border p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-foreground">CSV İçe Aktar</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Kapat"><X size={18} /></button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Sütunlar: tür, ad, il, ilçe, adres, telefon, e-posta, website, çalışma saatleri, not. Tür alanı boş/tanınmayan
          satırlar &quot;Diğer&quot; olarak içe aktarılır — koordinat içe aktarılmaz, gerekirse kurum haritadan tek tek eklenebilir.
        </p>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 border border-dashed border-border rounded-xl px-4 py-8 text-sm text-muted-foreground hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors"
          >
            <Upload size={22} />
            {fileName ? fileName : 'CSV dosyası seçin'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
          />
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`}
            download="kurumlar-ornek.csv"
            className="inline-block mt-2 text-xs text-[var(--primary)] hover:underline"
          >
            Örnek CSV indir
          </a>
        </div>

        {rows && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">{rows.length} satır bulundu — önizleme:</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-muted-foreground">Tür</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground">Ad</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground">İl/İlçe</th>
                    <th className="text-left px-2 py-1.5 text-muted-foreground">Telefon</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5 text-muted-foreground">{r.fields.kind}</td>
                      <td className="px-2 py-1.5 text-foreground">{r.fields.name}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{[r.fields.city, r.fields.district].filter(Boolean).join(' / ')}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.fields.phone ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.some(r => r.warning) && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                <FileWarning size={14} className="mt-0.5 shrink-0" />
                <span>{rows.filter(r => r.warning).length} satırda tanınmayan tür var, &quot;Diğer&quot; olarak içe aktarılacak.</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || rows.length === 0}
                className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? 'İçe Aktarılıyor...' : `${rows.length} Kurumu İçe Aktar`}
              </button>
              {message && <span className="text-xs text-muted-foreground">{message}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
