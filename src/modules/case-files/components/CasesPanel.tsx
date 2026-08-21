"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertTriangle, Plus, Pencil, Trash2, X, FolderOpen, UserPlus, FileDown, FileText as FileTextIcon } from 'lucide-react'
import {
  fetchCases,
  createCase,
  updateCase,
  deleteCase,
  fetchCaseClients,
  addCaseClient,
  removeCaseClient,
  CaseRow,
  CaseStatus,
  CaseJurisdiction,
  EditableCaseFields,
  CaseClientRow,
  CasesNotConfiguredError,
} from '../services/casesRepository'
import { fetchCaseDocuments, getCaseDocumentDownloadUrl, deleteCaseDocument, CaseDocumentRow } from '../services/caseDocumentsRepository'
import { PRACTICE_AREA_TAXONOMY, labelFor } from '@/modules/practice-areas'
import { fetchClients, ClientRow } from '@/modules/clients/services/clientsRepository'
import { CaseStatusLinks } from '@/modules/client-portal'
import { getTemplate } from '@/modules/document-wizard/templates/registry'

const STATUS_LABELS: Record<CaseStatus, string> = {
  potansiyel: 'Potansiyel', aktif: 'Aktif', istinaf: 'İstinaf', temyiz: 'Temyiz',
  kesinlesti: 'Kesinleşti', kapandi: 'Kapandı', arsiv: 'Arşiv',
};
const STATUS_COLORS: Record<CaseStatus, string> = {
  potansiyel: 'text-muted-foreground bg-gray-500/10',
  aktif: 'text-emerald-400 bg-emerald-500/10',
  istinaf: 'text-blue-400 bg-blue-500/10',
  temyiz: 'text-blue-400 bg-blue-500/10',
  kesinlesti: 'text-[var(--primary)] bg-[var(--primary)]/10',
  kapandi: 'text-muted-foreground bg-gray-500/10',
  arsiv: 'text-muted-foreground bg-gray-600/10',
};
const JURISDICTION_LABELS: Record<CaseJurisdiction, string> = {
  hukuk: 'Hukuk', ceza: 'Ceza', icra: 'İcra', idare: 'İdare', is: 'İş', arabuluculuk: 'Arabuluculuk', danismanlik: 'Danışmanlık',
};

const EMPTY_FIELDS: EditableCaseFields = {
  title: '', office_no: null, file_no: null, court_name: null, client_id: null,
  practice_area_id: null, jurisdiction: 'hukuk', case_role: null, status: 'aktif',
  opened_at: new Date().toISOString().slice(0, 10), closed_at: null, outcome: null,
  opposing_party: null, fee_model: null, agreed_fee: null, fee_currency: 'TRY',
  success_fee_pct: null, is_recess_exempt: false, notes: null,
};

const inputClass = "w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40";
const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

function CaseFormFields({ fields, onChange, clients }: { fields: EditableCaseFields; onChange: (f: EditableCaseFields) => void; clients: ClientRow[] }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Dosya Başlığı</label>
        <input value={fields.title} onChange={e => onChange({ ...fields, title: e.target.value })} className={inputClass} placeholder="Örn. Yılmaz / Örnek A.Ş. Alacak Davası" />
      </div>
      <div>
        <label className={labelClass}>Birincil Müvekkil</label>
        <select value={fields.client_id ?? ''} onChange={e => onChange({ ...fields, client_id: e.target.value || null })} className={inputClass}>
          <option value="" className="bg-[var(--background)]">Seçilmedi</option>
          {clients.map(c => <option key={c.id} value={c.id} className="bg-[var(--background)]">{c.full_name}</option>)}
        </select>
        <p className="text-[11px] text-muted-foreground mt-1">Çok taraflı dosyalarda ek müvekkilleri dosya oluşturulduktan sonra detay ekranından ekleyebilirsiniz.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Büro Dosya No</label>
          <input value={fields.office_no ?? ''} onChange={e => onChange({ ...fields, office_no: e.target.value || null })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Esas No (UYAP)</label>
          <input value={fields.file_no ?? ''} onChange={e => onChange({ ...fields, file_no: e.target.value || null })} className={inputClass} placeholder="2026/1234" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Mahkeme / Kurum</label>
        <input value={fields.court_name ?? ''} onChange={e => onChange({ ...fields, court_name: e.target.value || null })} className={inputClass} placeholder="İzmir 3. Asliye Hukuk Mahkemesi" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Hukuki Alan</label>
          <select value={fields.practice_area_id ?? ''} onChange={e => onChange({ ...fields, practice_area_id: e.target.value || null })} className={inputClass}>
            <option value="" className="bg-[var(--background)]">Seçilmedi</option>
            {PRACTICE_AREA_TAXONOMY.map(a => <option key={a.id} value={a.id} className="bg-[var(--background)]">{a.labelTr}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Yargı Kolu</label>
          <select value={fields.jurisdiction} onChange={e => onChange({ ...fields, jurisdiction: e.target.value as CaseJurisdiction })} className={inputClass}>
            {(Object.keys(JURISDICTION_LABELS) as CaseJurisdiction[]).map(j => <option key={j} value={j} className="bg-[var(--background)]">{JURISDICTION_LABELS[j]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Durum</label>
          <select value={fields.status} onChange={e => onChange({ ...fields, status: e.target.value as CaseStatus })} className={inputClass}>
            {(Object.keys(STATUS_LABELS) as CaseStatus[]).map(s => <option key={s} value={s} className="bg-[var(--background)]">{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Açılış Tarihi</label>
          <input type="date" value={fields.opened_at} onChange={e => onChange({ ...fields, opened_at: e.target.value })} className={inputClass} />
        </div>
      </div>
      {(fields.status === 'kapandi' || fields.status === 'kesinlesti' || fields.status === 'arsiv') && (
        <div>
          <label className={labelClass}>Kapanış Tarihi</label>
          <input type="date" value={fields.closed_at ?? ''} onChange={e => onChange({ ...fields, closed_at: e.target.value || null })} className={inputClass} />
        </div>
      )}
      <div>
        <label className={labelClass}>Karşı Taraf</label>
        <input value={fields.opposing_party ?? ''} onChange={e => onChange({ ...fields, opposing_party: e.target.value || null })} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Ücret Modeli</label>
          <select value={fields.fee_model ?? ''} onChange={e => onChange({ ...fields, fee_model: (e.target.value || null) as EditableCaseFields['fee_model'] })} className={inputClass}>
            <option value="" className="bg-[var(--background)]">Seçilmedi</option>
            <option value="maktu" className="bg-[var(--background)]">Maktu</option>
            <option value="oransal" className="bg-[var(--background)]">Oransal</option>
            <option value="saatlik" className="bg-[var(--background)]">Saatlik</option>
            <option value="karma" className="bg-[var(--background)]">Karma</option>
            <option value="ucretsiz" className="bg-[var(--background)]">Ücretsiz</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Anlaşılan Ücret (TRY)</label>
          <input type="number" value={fields.agreed_fee ?? ''} onChange={e => onChange({ ...fields, agreed_fee: e.target.value ? Number(e.target.value) : null })} className={inputClass} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
        <input type="checkbox" checked={fields.is_recess_exempt} onChange={e => onChange({ ...fields, is_recess_exempt: e.target.checked })} className="accent-[var(--primary)]" />
        Bu dosya adli tatilden istisnadır (HMK m.103)
      </label>
      <div>
        <label className={labelClass}>Notlar</label>
        <textarea value={fields.notes ?? ''} onChange={e => onChange({ ...fields, notes: e.target.value || null })} rows={3} className={`${inputClass} resize-y`} />
      </div>
    </div>
  );
}

/** Bir dosyanın tüm taraflarını (tek veya çok müvekkilli) listeler; her
 * taraf için durum linki kontrolü ve "çıkar" butonu, altında ek müvekkil
 * ekleme formu. `caseId` değiştiğinde kendi verisini tazeler. */
function CasePartiesSection({ caseId, clients }: { caseId: string; clients: ClientRow[] }) {
  const [parties, setParties] = useState<CaseClientRow[] | null>(null);
  const [addingClientId, setAddingClientId] = useState('');
  const [roleNote, setRoleNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const load = () => { fetchCaseClients(caseId).then(setParties); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  const availableClients = useMemo(
    () => clients.filter(c => !parties?.some(p => p.client_id === c.id)),
    [clients, parties]
  );

  const handleAdd = () => {
    if (!addingClientId) return;
    setMessage(null);
    startTransition(async () => {
      const res = await addCaseClient(caseId, addingClientId, roleNote.trim() || null);
      setMessage(res.message);
      if (res.success) { setAddingClientId(''); setRoleNote(''); load(); }
    });
  };

  const handleRemove = (clientId: string) => {
    if (!window.confirm('Bu müvekkili dosyadan çıkarmak istediğinize emin misiniz? Buna bağlı durum linki de geçersiz olur.')) return;
    startTransition(async () => {
      const res = await removeCaseClient(caseId, clientId);
      setMessage(res.message);
      if (res.success) load();
    });
  };

  return (
    <div className="space-y-3">
      <p className={labelClass}>Taraflar (Müvekkiller)</p>
      {parties === null && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
      {parties?.map(p => (
        <div key={p.client_id} className="bg-muted border border-border rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {p.full_name}
              {p.is_primary && <span className="ml-2 text-[10px] text-[var(--primary)]">Birincil</span>}
              {p.role_note && <span className="ml-2 text-[10px] text-muted-foreground">{p.role_note}</span>}
            </p>
            {!p.is_primary && (
              <button onClick={() => handleRemove(p.client_id)} disabled={isPending} className="text-muted-foreground hover:text-rose-400 transition-colors" aria-label="Dosyadan çıkar"><Trash2 size={14} /></button>
            )}
          </div>
          <CaseStatusLinks caseId={caseId} clientId={p.client_id} clientName={p.full_name} />
        </div>
      ))}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <select value={addingClientId} onChange={e => setAddingClientId(e.target.value)} className={`${inputClass} flex-1 min-w-[140px]`}>
          <option value="" className="bg-[var(--background)]">Ek müvekkil seç...</option>
          {availableClients.map(c => <option key={c.id} value={c.id} className="bg-[var(--background)]">{c.full_name}</option>)}
        </select>
        <input value={roleNote} onChange={e => setRoleNote(e.target.value)} placeholder="Rol notu (ops.)" className={`${inputClass} flex-1 min-w-[100px]`} />
        <button onClick={handleAdd} disabled={isPending || !addingClientId} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">
          <UserPlus size={13} /> Ekle
        </button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

/** Doküman otomasyon sihirbazından bu dosyaya kaydedilmiş belgeler (bkz.
 * src/app/api/generate-doc/route.ts, "caseId" gönderildiğinde). İndirme
 * bağlantısı her tıklamada yeniden üretilir (kısa ömürlü imzalı URL) — uzun
 * ömürlü bir bağlantı saklanmaz. */
function CaseDocumentsSection({ caseId }: { caseId: string }) {
  const [documents, setDocuments] = useState<CaseDocumentRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => { fetchCaseDocuments(caseId).then(setDocuments); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  const handleDownload = async (doc: CaseDocumentRow) => {
    setBusyId(doc.id);
    setMessage(null);
    const result = await getCaseDocumentDownloadUrl(doc.id);
    setBusyId(null);
    if (!result.url) { setMessage(result.error || 'İndirme bağlantısı üretilemedi.'); return; }
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (doc: CaseDocumentRow) => {
    if (!window.confirm(`"${doc.file_name}" belgesini silmek istediğinize emin misiniz?`)) return;
    setBusyId(doc.id);
    const result = await deleteCaseDocument(doc.id);
    setBusyId(null);
    setMessage(result.message);
    if (result.success) load();
  };

  return (
    <div className="space-y-3">
      <p className={labelClass}>Belgeler</p>
      {documents === null && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
      {documents?.length === 0 && <p className="text-xs text-muted-foreground">Bu dosyaya henüz kaydedilmiş bir belge yok — Doküman Otomasyonu'ndan üretirken bu dosyayı seçerek kaydedebilirsiniz.</p>}
      {documents?.map(doc => (
        <div key={doc.id} className="flex items-center justify-between gap-3 bg-muted border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileTextIcon size={14} className="text-[var(--primary)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{getTemplate(doc.doc_type)?.label ?? doc.doc_type}</p>
              <p className="text-[11px] text-muted-foreground">{doc.format.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => handleDownload(doc)} disabled={busyId === doc.id} className="p-1.5 text-muted-foreground hover:text-[var(--primary)] transition-colors disabled:opacity-50" aria-label="İndir"><FileDown size={15} /></button>
            <button onClick={() => handleDelete(doc)} disabled={busyId === doc.id} className="p-1.5 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-50" aria-label="Sil"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

const CASES_PAGE_SIZE = 200;

export function CasesPanel() {
  const [items, setItems] = useState<CaseRow[] | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editFields, setEditFields] = useState<EditableCaseFields | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const rows = await fetchCases(CASES_PAGE_SIZE);
      setItems(rows);
      setHasMore(rows.length === CASES_PAGE_SIZE);
    } catch (err) {
      if (err instanceof CasesNotConfiguredError) setError(err.message);
      else { console.error('Dosyalar yüklenemedi:', err); setError('Dosyalar yüklenirken beklenmeyen bir hata oluştu.'); }
      setItems([]);
    }
  };

  const loadMore = async () => {
    if (!items || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const more = await fetchCases(CASES_PAGE_SIZE, items.length);
      setItems(prev => [...(prev ?? []), ...more]);
      setHasMore(more.length === CASES_PAGE_SIZE);
    } catch (err) {
      console.error('Ek dosyalar yüklenemedi:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    load();
    fetchClients(500).then(setClients).catch(() => setClients([]));
  }, []);

  const selected = useMemo(() => items?.find(i => i.id === selectedId) ?? null, [items, selectedId]);

  useEffect(() => { setIsEditing(false); setEditFields(null); }, [selectedId]);

  // `selectedId` KASITLI OLARAK burada temizlenmiyor — detay görünümü zaten
  // `selected && !isCreating` koşuluyla gizleniyor (satır ~351). Önceden
  // `setSelectedId(null)` da çağrılıyordu; bu, `selectedId` değişince
  // `editFields`'i sıfırlayan aşağıdaki effect'i (satır ~249) tetikleyip az
  // önce set edilen `EMPTY_FIELDS`'i hemen `null`'a çeviriyordu — "Yeni
  // Dosya" formu açılır açılmaz eski dosya paneliyle çakışıp titriyordu.
  const startCreate = () => { setIsCreating(true); setEditFields({ ...EMPTY_FIELDS }); };
  const startEdit = () => { if (!selected) return; setEditFields({ ...selected }); setIsEditing(true); };
  const cancelForm = () => { setIsEditing(false); setIsCreating(false); setEditFields(null); };

  const saveNew = () => {
    if (!editFields || !editFields.title.trim()) return;
    setStatusMessage(null);
    startTransition(async () => {
      const result = await createCase(editFields);
      setStatusMessage(result.message);
      if (result.success) { cancelForm(); load(); }
    });
  };

  const saveEdit = () => {
    if (!selected || !editFields) return;
    setStatusMessage(null);
    startTransition(async () => {
      const result = await updateCase(selected.id, editFields);
      setStatusMessage(result.message);
      if (result.success) {
        setItems(prev => prev?.map(i => (i.id === selected.id ? { ...i, ...editFields } : i)) ?? prev);
        cancelForm();
      }
    });
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`"${selected.title}" adlı dosyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setIsDeleting(true);
    const result = await deleteCase(selected.id);
    setIsDeleting(false);
    if (result.success) { setItems(prev => prev?.filter(i => i.id !== selected.id) ?? prev); setSelectedId(null); }
    else setStatusMessage(result.message);
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Dosyalar Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 space-y-2">
        <button
          onClick={startCreate}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium px-3 py-2.5 rounded-xl border border-dashed border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
        >
          <Plus size={16} /> Yeni Dosya
        </button>
        <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-2">
          {items === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
          {items !== null && items.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">Henüz dosya yok.</p>
              <button onClick={startCreate} className="text-sm font-medium text-[var(--primary)] hover:underline">
                İlk dosyanızı ekleyin →
              </button>
            </div>
          )}
          {items?.map(item => (
            <button
              key={item.id}
              onClick={() => { setSelectedId(item.id); setIsCreating(false); }}
              className={`w-full text-left bg-muted hover:bg-muted border rounded-xl p-3 transition-colors ${
                selectedId === item.id ? 'border-[var(--primary)]/40' : 'border-border hover:border-[var(--primary)]/20'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                {item.file_no && <span className="text-[10px] text-muted-foreground">{item.file_no}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{labelFor(item.practice_area_id)}{item.court_name ? ` · ${item.court_name}` : ''}</p>
            </button>
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full text-sm font-medium px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-[var(--primary)]/30 transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
            </button>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {!selected && !isCreating && (
          <div className="glass-card p-8 text-center h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Detayları görmek için soldan bir dosya seçin veya yeni dosya ekleyin.</p>
          </div>
        )}

        {isCreating && editFields && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-foreground flex items-center gap-2"><FolderOpen size={18} className="text-[var(--primary)]" /> Yeni Dosya</h3>
              <button onClick={cancelForm} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Kapat"><X size={16} /></button>
            </div>
            <CaseFormFields fields={editFields} onChange={setEditFields} clients={clients} />
            <div className="flex items-center gap-2">
              <button onClick={saveNew} disabled={isPending || !editFields.title.trim()} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">Oluştur</button>
              <button onClick={cancelForm} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors">İptal</button>
              {statusMessage && <span className="text-xs text-muted-foreground">{statusMessage}</span>}
            </div>
          </div>
        )}

        {selected && !isCreating && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-xl text-foreground">{selected.title}</h3>
              <div className="flex items-center gap-1 shrink-0">
                {!isEditing && (
                  <>
                    <button onClick={startEdit} className="p-1.5 text-muted-foreground hover:text-[var(--primary)] transition-colors" aria-label="Düzenle"><Pencil size={15} /></button>
                    <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-40" aria-label="Sil"><Trash2 size={15} /></button>
                  </>
                )}
                <button onClick={() => setSelectedId(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors lg:hidden" aria-label="Kapat"><X size={16} /></button>
              </div>
            </div>

            {isEditing && editFields ? (
              <>
                <CaseFormFields fields={editFields} onChange={setEditFields} clients={clients} />
                <div className="flex items-center gap-2">
                  <button onClick={saveEdit} disabled={isPending || !editFields.title.trim()} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">Kaydet</button>
                  <button onClick={cancelForm} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors">İptal</button>
                  {statusMessage && <span className="text-xs text-muted-foreground">{statusMessage}</span>}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><p className={labelClass}>Durum</p><p className="text-muted-foreground">{STATUS_LABELS[selected.status]}</p></div>
                <div><p className={labelClass}>Hukuki Alan</p><p className="text-muted-foreground">{labelFor(selected.practice_area_id)}</p></div>
                <div><p className={labelClass}>Mahkeme</p><p className="text-muted-foreground">{selected.court_name || '—'}</p></div>
                <div><p className={labelClass}>Esas No</p><p className="text-muted-foreground">{selected.file_no || '—'}</p></div>
                <div><p className={labelClass}>Karşı Taraf</p><p className="text-muted-foreground">{selected.opposing_party || '—'}</p></div>
                <div><p className={labelClass}>Açılış</p><p className="text-muted-foreground">{new Date(selected.opened_at).toLocaleDateString('tr-TR')}</p></div>
                {selected.agreed_fee != null && (
                  <div><p className={labelClass}>Anlaşılan Ücret</p><p className="text-muted-foreground">₺{selected.agreed_fee.toLocaleString('tr-TR')}</p></div>
                )}
                {selected.is_recess_exempt && (
                  <div className="col-span-2"><span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-amber-400 bg-amber-500/10">Adli tatilden istisna (HMK m.103)</span></div>
                )}
                {selected.notes && (
                  <div className="col-span-2"><p className={labelClass}>Notlar</p><p className="text-muted-foreground whitespace-pre-wrap">{selected.notes}</p></div>
                )}
              </div>
            )}

            {!isEditing && <CasePartiesSection caseId={selected.id} clients={clients} />}
            {!isEditing && <CaseDocumentsSection caseId={selected.id} />}
          </div>
        )}
      </div>
    </div>
  );
}
