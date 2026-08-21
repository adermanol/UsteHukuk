import { supabase, isMockSupabase } from '@/core/database/supabase'

export type LedgerEntryType = 'income' | 'expense' | 'trust_in' | 'trust_out';
export type PaymentMethod = 'nakit' | 'havale' | 'kredi_karti' | 'cek' | 'senet' | 'mahsup';

export interface LedgerEntryRow {
  id: string;
  created_at: string;
  entry_type: LedgerEntryType;
  category_id: string | null;
  case_id: string | null;
  client_id: string | null;
  owner_id: string | null;
  description: string;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_try: number;
  vat_rate: number;
  entry_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  invoice_no: string | null;
  attachment_url: string | null;
  is_reimbursable: boolean;
  notes: string | null;
}

export interface LedgerCategoryRow {
  id: string;
  label: string;
  entry_type: 'income' | 'expense';
  sort_order: number;
}

export type NewLedgerEntryFields = Pick<LedgerEntryRow,
  'entry_type' | 'category_id' | 'case_id' | 'description' | 'amount' | 'currency' | 'fx_rate' |
  'entry_date' | 'due_date' | 'paid_at' | 'payment_method' | 'invoice_no' | 'attachment_url' | 'is_reimbursable'
>;

export class FinanceNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinanceNotConfiguredError'
  }
}

const ENTRY_COLUMNS = 'id, created_at, entry_type, category_id, case_id, client_id, owner_id, description, amount, currency, fx_rate, amount_try, vat_rate, entry_date, due_date, paid_at, payment_method, invoice_no, attachment_url, is_reimbursable, notes';

export async function fetchLedgerCategories(): Promise<LedgerCategoryRow[]> {
  if (isMockSupabase()) throw new FinanceNotConfiguredError('Supabase yapılandırılmadı: kategori listesi alınamadı.');
  const { data, error } = await supabase.from('ledger_categories').select('id, label, entry_type, sort_order').eq('is_active', true).order('sort_order');
  if (error) throw new Error(`Kategori listesi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchLedgerEntries(limit = 200, offset = 0): Promise<LedgerEntryRow[]> {
  if (isMockSupabase()) throw new FinanceNotConfiguredError('Supabase yapılandırılmadı: defter kayıtları alınamadı. Bu özellik yalnızca yönetici ve avukat rolündeki kullanıcılara açıktır.');
  const { data, error } = await supabase
    .from('ledger_entries')
    .select(ENTRY_COLUMNS)
    .order('entry_date', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Defter kayıtları alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchReceivables(): Promise<LedgerEntryRow[]> {
  if (isMockSupabase()) throw new FinanceNotConfiguredError('Supabase yapılandırılmadı.');
  const { data, error } = await supabase
    .from('ledger_entries')
    .select(ENTRY_COLUMNS)
    .eq('entry_type', 'income')
    .is('paid_at', null)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true });
  if (error) throw new Error(`Alacaklar alınamadı: ${error.message}`);
  return data ?? [];
}

export async function createLedgerEntry(fields: NewLedgerEntryFields): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı: kayıt oluşturulamadı.' };
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('ledger_entries').insert({ ...fields, owner_id: userData.user?.id ?? null });
  if (error) {
    console.error('createLedgerEntry error:', error);
    return { success: false, message: 'Kayıt oluşturulurken bir hata oluştu. Bu özellik yalnızca yönetici ve avukat rolündeki kullanıcılara açıktır ve bir dosyaya (case_id) bağlı olmalıdır.' };
  }
  return { success: true, message: 'Kayıt eklendi.' };
}

export async function markPaid(id: string, paidAt: string, paymentMethod: PaymentMethod | null): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('ledger_entries').update({ paid_at: paidAt, payment_method: paymentMethod }).eq('id', id);
  if (error) return { success: false, message: 'Tahsilat kaydedilirken bir hata oluştu.' };
  return { success: true, message: 'Tahsilat kaydedildi.' };
}

export async function deleteLedgerEntry(id: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
  if (error) return { success: false, message: 'Kayıt silinirken bir hata oluştu.' };
  return { success: true, message: 'Kayıt silindi.' };
}
