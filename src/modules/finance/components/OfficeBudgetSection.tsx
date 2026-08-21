"use client"

import { useEffect, useState, useTransition } from 'react'
import { Repeat, Landmark, PieChart, Plus, ChevronDown } from 'lucide-react'
import {
  fetchRecurringExpenseTemplates, createRecurringExpenseTemplate, toggleRecurringExpenseTemplate,
  createCashAccount, fetchOfficeBudgets, setOfficeBudget,
  RecurringExpenseTemplateRow, OfficeBudgetRow,
} from '../services/officeBudgetRepository'
import { LedgerCategoryRow } from '../services/ledgerRepository'
import { fetchCashBalance, fetchOfficeBudgetVsActual, CashBalanceRow, BudgetVsActualRow } from '@/modules/analytics'

const inputClass = "w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40";
const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

function formatMoney(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

/** Ofis bütçe/gider yönetimi güçlendirmesi — tam muhasebe değil, büro
 * geneli giderlerin tekrarlayan şablonları, kasa/banka bakiyesi ve aylık
 * bütçe-gerçekleşen karşılaştırması. LedgerPanel'in altında katlanabilir
 * bir bölüm olarak yer alır. */
export function OfficeBudgetSection({ expenseCategories }: { expenseCategories: LedgerCategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<RecurringExpenseTemplateRow[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalanceRow[]>([]);
  const [budgetRows, setBudgetRows] = useState<BudgetVsActualRow[]>([]);
  const [budgets, setBudgets] = useState<OfficeBudgetRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth() + 1;

  const [newTemplate, setNewTemplate] = useState({ category_id: '', description: '', amount: 0, day_of_month: 1 });
  const [newAccount, setNewAccount] = useState({ name: '', opening_balance: 0, opening_date: now.toISOString().slice(0, 10) });

  const load = () => {
    fetchRecurringExpenseTemplates().then(setTemplates).catch(() => setTemplates([]));
    fetchCashBalance().then(setCashBalances).catch(() => setCashBalances([]));
    fetchOfficeBudgetVsActual(year, month).then(setBudgetRows).catch(() => setBudgetRows([]));
    fetchOfficeBudgets(year, month).then(setBudgets).catch(() => setBudgets([]));
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  const handleAddTemplate = () => {
    if (!newTemplate.category_id || !newTemplate.description.trim() || newTemplate.amount <= 0) return;
    setMessage(null);
    startTransition(async () => {
      const res = await createRecurringExpenseTemplate(newTemplate);
      setMessage(res.message);
      if (res.success) { setNewTemplate({ category_id: '', description: '', amount: 0, day_of_month: 1 }); load(); }
    });
  };

  const handleToggleTemplate = (id: string, isActive: boolean) => {
    startTransition(async () => { await toggleRecurringExpenseTemplate(id, isActive); load(); });
  };

  const handleAddAccount = () => {
    if (!newAccount.name.trim()) return;
    setMessage(null);
    startTransition(async () => {
      const res = await createCashAccount(newAccount);
      setMessage(res.message);
      if (res.success) { setNewAccount({ name: '', opening_balance: 0, opening_date: now.toISOString().slice(0, 10) }); load(); }
    });
  };

  const handleBudgetChange = (categoryId: string, value: number) => {
    startTransition(async () => { await setOfficeBudget(categoryId, year, month, value); load(); });
  };

  const budgetedByCategory = new Map(budgets.map(b => [b.category_id, b.budgeted_try]));

  return (
    <div className="glass-card">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between p-4">
        <h3 className="font-serif text-lg text-foreground flex items-center gap-2"><PieChart size={16} className="text-[var(--primary)]" /> Ofis Bütçesi ve Tekrarlayan Giderler</h3>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">Bu bölüm büro içi bütçe/gider yönetimidir — resmi muhasebe defterinin veya mali müşavir hizmetinin yerini almaz.</p>

          <div className="space-y-2">
            <p className={labelClass}><Repeat size={11} className="inline mr-1" /> Tekrarlayan Giderler</p>
            {templates.length === 0 && <p className="text-xs text-muted-foreground">Henüz tekrarlayan gider tanımlanmamış.</p>}
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-2 flex-wrap bg-muted border border-border rounded-lg p-2 text-sm">
                <span className="flex-1 min-w-[120px] text-muted-foreground">{t.description}</span>
                <span className="text-muted-foreground text-xs">Her ayın {t.day_of_month}.</span>
                <span className="font-mono text-muted-foreground">{formatMoney(t.amount)}</span>
                <button onClick={() => handleToggleTemplate(t.id, !t.is_active)} disabled={isPending} className={`text-[10px] px-2 py-1 rounded-full border ${t.is_active ? 'border-emerald-500/30 text-emerald-400' : 'border-gray-500/30 text-muted-foreground'}`}>
                  {t.is_active ? 'Aktif' : 'Pasif'}
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <select value={newTemplate.category_id} onChange={e => setNewTemplate(f => ({ ...f, category_id: e.target.value }))} className={`${inputClass} flex-1 min-w-[100px]`}>
                <option value="" className="bg-[var(--background)]">Kategori</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id} className="bg-[var(--background)]">{c.label}</option>)}
              </select>
              <input value={newTemplate.description} onChange={e => setNewTemplate(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama" className={`${inputClass} flex-1 min-w-[100px]`} />
              <input type="number" value={newTemplate.amount || ''} onChange={e => setNewTemplate(f => ({ ...f, amount: Number(e.target.value) }))} placeholder="Tutar" className={`${inputClass} w-24`} />
              <input type="number" min={1} max={28} value={newTemplate.day_of_month} onChange={e => setNewTemplate(f => ({ ...f, day_of_month: Number(e.target.value) }))} placeholder="Gün" className={`${inputClass} w-16`} />
              <button onClick={handleAddTemplate} disabled={isPending} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors"><Plus size={13} /> Ekle</button>
            </div>
          </div>

          <div className="space-y-2">
            <p className={labelClass}><Landmark size={11} className="inline mr-1" /> Kasa / Banka Bakiyesi</p>
            {cashBalances.length === 0 && <p className="text-xs text-muted-foreground">Henüz kasa/banka hesabı tanımlanmamış.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cashBalances.map(c => (
                <div key={c.cash_account_id} className="bg-muted border border-border rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground">{c.name}</p>
                  <p className="text-sm font-mono text-muted-foreground">{formatMoney(c.balance_try)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <input value={newAccount.name} onChange={e => setNewAccount(f => ({ ...f, name: e.target.value }))} placeholder="Hesap adı (ör. Kasa)" className={`${inputClass} flex-1 min-w-[100px]`} />
              <input type="number" value={newAccount.opening_balance || ''} onChange={e => setNewAccount(f => ({ ...f, opening_balance: Number(e.target.value) }))} placeholder="Açılış bakiyesi" className={`${inputClass} w-32`} />
              <button onClick={handleAddAccount} disabled={isPending} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors"><Plus size={13} /> Ekle</button>
            </div>
          </div>

          <div className="space-y-2">
            <p className={labelClass}>Bu Ay Bütçe vs Gerçekleşen</p>
            {budgetRows.length === 0 && <p className="text-xs text-muted-foreground">Bu ay için bütçe veya gider kaydı yok.</p>}
            {budgetRows.map(r => (
              <div key={r.category_id} className="flex items-center gap-3 flex-wrap bg-muted border border-border rounded-lg p-2 text-sm">
                <span className="flex-1 min-w-[100px] text-muted-foreground">{r.label}</span>
                <input
                  type="number"
                  defaultValue={budgetedByCategory.get(r.category_id) ?? 0}
                  onBlur={e => handleBudgetChange(r.category_id, Number(e.target.value))}
                  className={`${inputClass} w-28`}
                  placeholder="Bütçe"
                />
                <span className={`font-mono ${r.actual_try > r.budgeted_try && r.budgeted_try > 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>{formatMoney(r.actual_try)} gerçekleşen</span>
              </div>
            ))}
          </div>

          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
}
