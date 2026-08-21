"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Plus, Trash2, X, TrendingUp, TrendingDown, Wallet, Users, Search } from 'lucide-react'
import {
  fetchLedgerEntries, fetchLedgerCategories, createLedgerEntry, markPaid, deleteLedgerEntry,
  LedgerEntryRow, LedgerCategoryRow, LedgerEntryType, PaymentMethod, NewLedgerEntryFields, FinanceNotConfiguredError,
} from '../services/ledgerRepository'
import { fetchCases, CaseRow } from '@/modules/case-files'
import { fetchClientReceivables, ClientReceivableRow } from '@/modules/analytics'
import { OfficeBudgetSection } from './OfficeBudgetSection'
import { fetchCurrentProfile } from '@/modules/team'

const TYPE_LABELS: Record<LedgerEntryType, string> = {
  income: 'Gelir', expense: 'Gider', trust_in: 'Emanet Girişi', trust_out: 'Emanet Çıkışı',
};
const TYPE_COLORS: Record<LedgerEntryType, string> = {
  income: 'text-emerald-400 bg-emerald-500/10',
  expense: 'text-rose-400 bg-rose-500/10',
  trust_in: 'text-blue-400 bg-blue-500/10',
  trust_out: 'text-blue-400 bg-blue-500/10',
};

const PAGE_SIZE = 200;

const inputClass = "w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40";
const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

const EMPTY_FIELDS: NewLedgerEntryFields = {
  entry_type: 'income', category_id: null, case_id: null, description: '', amount: 0, currency: 'TRY', fx_rate: 1,
  entry_date: new Date().toISOString().slice(0, 10), due_date: null, paid_at: new Date().toISOString().slice(0, 10),
  payment_method: null, invoice_no: null, attachment_url: null, is_reimbursable: false,
};

function formatMoney(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function LedgerPanel() {
  const router = useRouter();
  const [items, setItems] = useState<LedgerEntryRow[] | null>(null);
  const [categories, setCategories] = useState<LedgerCategoryRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clientReceivables, setClientReceivables] = useState<ClientReceivableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [fields, setFields] = useState<NewLedgerEntryFields>({ ...EMPTY_FIELDS });

  const load = async () => {
    setError(null);
    setIsForbidden(false);
    try {
      // Stajyer rolü finans defterini göremez (RLS). Sorguyu göndermeden önce
      // rolü kontrol edip net bir "yetkiniz yok" mesajı gösteriyoruz — aksi
      // halde RLS'in filtrelediği boş/başarısız sorgu jenerik bir hata gibi
      // görünüp yeni bir çalışana sistem arızası izlenimi verirdi.
      const profile = await fetchCurrentProfile();
      if (profile?.role === 'stajyer') {
        setIsForbidden(true);
        setItems([]);
        return;
      }
      const [entries, cats, caseRows] = await Promise.all([fetchLedgerEntries(PAGE_SIZE), fetchLedgerCategories(), fetchCases(200)]);
      setItems(entries);
      setHasMore(entries.length === PAGE_SIZE);
      setCategories(cats);
      setCases(caseRows);
    } catch (err) {
      if (err instanceof FinanceNotConfiguredError) setError(err.message);
      else { console.error('Defter yüklenemedi:', err); setError('Defter yüklenirken beklenmeyen bir hata oluştu.'); }
      setItems([]);
    }
    // Müvekkilden alacaklar ayrı, sessizce başarısız olabilir — ana defter akışını bloklamaz.
    fetchClientReceivables().then(setClientReceivables).catch(() => setClientReceivables([]));
  };

  const loadMore = async () => {
    if (!items || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const more = await fetchLedgerEntries(PAGE_SIZE, items.length);
      setItems(prev => [...(prev ?? []), ...more]);
      setHasMore(more.length === PAGE_SIZE);
    } catch (err) {
      console.error('Ek defter kayıtları yüklenemedi:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => { load(); }, []);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | 'all'>('all');

  const filteredItems = useMemo(() => {
    if (!items) return items;
    const q = query.trim().toLowerCase();
    return items.filter(item =>
      (typeFilter === 'all' || item.entry_type === typeFilter) &&
      (!q || item.description.toLowerCase().includes(q) || (item.invoice_no ?? '').toLowerCase().includes(q))
    );
  }, [items, query, typeFilter]);

  const totals = useMemo(() => {
    if (!items) return { income: 0, expense: 0, net: 0, receivable: 0 };
    const income = items.filter(i => i.entry_type === 'income').reduce((s, i) => s + i.amount_try, 0);
    const expense = items.filter(i => i.entry_type === 'expense').reduce((s, i) => s + i.amount_try, 0);
    const receivable = items.filter(i => i.entry_type === 'income' && !i.paid_at).reduce((s, i) => s + i.amount_try, 0);
    return { income, expense, net: income - expense, receivable };
  }, [items]);

  const availableCategories = categories.filter(c => c.entry_type === (fields.entry_type === 'expense' ? 'expense' : 'income'));

  const startCreate = () => { setIsCreating(true); setFields({ ...EMPTY_FIELDS }); };
  const cancelCreate = () => { setIsCreating(false); };

  const saveNew = () => {
    if (!fields.description.trim() || fields.amount <= 0) return;
    setStatusMessage(null);
    startTransition(async () => {
      const result = await createLedgerEntry(fields);
      setStatusMessage(result.message);
      if (result.success) { cancelCreate(); load(); }
    });
  };

  const handleMarkPaid = (id: string) => {
    startTransition(async () => {
      const result = await markPaid(id, new Date().toISOString().slice(0, 10), null);
      setStatusMessage(result.message);
      if (result.success) load();
    });
  };

  const handleDelete = async (item: LedgerEntryRow) => {
    if (!window.confirm(`"${item.description}" kaydını silmek istediğinize emin misiniz?`)) return;
    const result = await deleteLedgerEntry(item.id);
    if (result.success) setItems(prev => prev?.filter(i => i.id !== item.id) ?? prev);
    else setStatusMessage(result.message);
  };

  if (isForbidden) {
    return (
      <div className="glass-card p-8 text-center border-border">
        <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Bu Bölüme Erişiminiz Yok</h3>
        <p className="text-sm text-muted-foreground">Finans defteri yalnızca yönetici ve avukat rolündeki kullanıcılara açıktır. Erişime ihtiyacınız varsa büro yöneticinizle iletişime geçin.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Finans Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <TrendingUp className="text-emerald-400" size={20} />
          <div><p className={labelClass}>Gelir</p><p className="text-lg font-serif text-foreground">{formatMoney(totals.income)}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <TrendingDown className="text-rose-400" size={20} />
          <div><p className={labelClass}>Gider</p><p className="text-lg font-serif text-foreground">{formatMoney(totals.expense)}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Wallet className="text-[var(--primary)]" size={20} />
          <div><p className={labelClass}>Net Kâr</p><p className={`text-lg font-serif ${totals.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(totals.net)}</p></div>
        </div>
      </div>

      {totals.receivable > 0 && (
        <div className="text-sm text-amber-400 bg-amber-500/10 rounded-xl px-4 py-2.5">
          Tahsil edilmemiş alacak: {formatMoney(totals.receivable)}
        </div>
      )}

      {clientReceivables.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <h3 className="font-serif text-lg text-foreground flex items-center gap-2"><Users size={16} className="text-[var(--primary)]" /> Müvekkilden Alacaklar</h3>
          <div className="space-y-1.5">
            {clientReceivables.map(r => (
              <button
                key={r.client_id}
                onClick={() => router.push(`/dashboard/musteriler?client=${r.client_id}`)}
                className="w-full flex items-center gap-3 flex-wrap text-left bg-muted hover:bg-muted border border-border hover:border-[var(--primary)]/20 rounded-xl p-2.5 transition-colors"
              >
                <span className="flex-1 min-w-[140px] text-sm text-muted-foreground">{r.full_name}</span>
                <span className="text-xs text-muted-foreground">{r.open_entry_count} kayıt</span>
                {r.oldest_due_date && <span className="text-xs text-muted-foreground">En eski vade: {new Date(r.oldest_due_date).toLocaleDateString('tr-TR')}</span>}
                <span className={`text-sm font-mono ${r.d90_plus_try > 0 ? 'text-rose-400' : 'text-amber-400'}`}>{formatMoney(r.total_try)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={startCreate} className="flex items-center justify-center gap-2 text-sm font-medium px-3 py-2.5 rounded-xl border border-dashed border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors w-full sm:w-auto">
        <Plus size={16} /> Yeni Kayıt
      </button>

      {isCreating && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-foreground">Yeni Defter Kaydı</h3>
            <button onClick={cancelCreate} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tür</label>
              <select value={fields.entry_type} onChange={e => setFields(f => ({ ...f, entry_type: e.target.value as LedgerEntryType, category_id: null }))} className={inputClass}>
                {(Object.keys(TYPE_LABELS) as LedgerEntryType[]).map(t => <option key={t} value={t} className="bg-[var(--background)]">{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Kategori</label>
              <select value={fields.category_id ?? ''} onChange={e => setFields(f => ({ ...f, category_id: e.target.value || null }))} className={inputClass}>
                <option value="" className="bg-[var(--background)]">Seçilmedi</option>
                {availableCategories.map(c => <option key={c.id} value={c.id} className="bg-[var(--background)]">{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Açıklama</label>
            <input value={fields.description} onChange={e => setFields(f => ({ ...f, description: e.target.value }))} className={inputClass} placeholder="Örn. Yılmaz dosyası vekâlet ücreti" />
          </div>
          <div>
            <label className={labelClass}>Dosya</label>
            <select value={fields.case_id ?? ''} onChange={e => setFields(f => ({ ...f, case_id: e.target.value || null }))} className={inputClass}>
              <option value="" className="bg-[var(--background)]">Dosyaya bağlı değil (yalnızca yönetici ekleyebilir)</option>
              {cases.map(c => <option key={c.id} value={c.id} className="bg-[var(--background)]">{c.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tutar (TRY)</label>
              <input type="number" value={fields.amount || ''} onChange={e => setFields(f => ({ ...f, amount: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Kayıt Tarihi</label>
              <input type="date" value={fields.entry_date} onChange={e => setFields(f => ({ ...f, entry_date: e.target.value }))} className={inputClass} />
            </div>
          </div>
          {fields.entry_type === 'income' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Vade (boş = peşin/tahsil edildi)</label>
                <input type="date" value={fields.due_date ?? ''} onChange={e => setFields(f => ({ ...f, due_date: e.target.value || null, paid_at: e.target.value ? null : f.paid_at }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tahsil Tarihi</label>
                <input type="date" value={fields.paid_at ?? ''} onChange={e => setFields(f => ({ ...f, paid_at: e.target.value || null }))} className={inputClass} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={saveNew} disabled={isPending || !fields.description.trim() || fields.amount <= 0} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">Kaydet</button>
            <button onClick={cancelCreate} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors">İptal</button>
            {statusMessage && <span className="text-xs text-muted-foreground">{statusMessage}</span>}
          </div>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Açıklama veya fatura no ile ara..."
              className="w-full pl-8 pr-2 py-2 text-sm bg-muted border border-border rounded-lg text-muted-foreground outline-none focus:border-[var(--primary)]/40"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as LedgerEntryType | 'all')}
            className="bg-muted border border-border rounded-lg px-2 py-2 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
          >
            <option value="all" className="bg-[var(--background)]">Tüm Türler</option>
            {(Object.keys(TYPE_LABELS) as LedgerEntryType[]).map(t => <option key={t} value={t} className="bg-[var(--background)]">{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-2">
        {items === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {items !== null && items.length === 0 && <p className="text-sm text-muted-foreground">Henüz defter kaydı yok.</p>}
        {items !== null && items.length > 0 && filteredItems?.length === 0 && (
          <p className="text-sm text-muted-foreground">Aramayla eşleşen kayıt yok.</p>
        )}
        {filteredItems?.map(item => (
          <div key={item.id} className="glass-card p-3 flex items-center gap-3 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[item.entry_type]}`}>{TYPE_LABELS[item.entry_type]}</span>
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.entry_date).toLocaleDateString('tr-TR')}{item.due_date && !item.paid_at ? ` · Vade: ${new Date(item.due_date).toLocaleDateString('tr-TR')}` : ''}</p>
            </div>
            <span className={`text-sm font-mono shrink-0 ${item.entry_type === 'income' || item.entry_type === 'trust_in' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(item.amount_try)}</span>
            {item.entry_type === 'income' && !item.paid_at && (
              <button onClick={() => handleMarkPaid(item.id)} className="text-[10px] font-medium px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0">Tahsil Edildi</button>
            )}
            <button onClick={() => handleDelete(item)} className="p-1 text-muted-foreground hover:text-rose-400 transition-colors shrink-0" aria-label="Sil"><Trash2 size={14} /></button>
          </div>
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

      <OfficeBudgetSection expenseCategories={categories.filter(c => c.entry_type === 'expense')} />
    </div>
  );
}
