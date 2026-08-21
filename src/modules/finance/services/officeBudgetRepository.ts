import { supabase, isMockSupabase } from '@/core/database/supabase'

export interface RecurringExpenseTemplateRow {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  day_of_month: number;
  is_active: boolean;
  last_generated_month: string | null;
}
export type NewRecurringExpenseFields = Pick<RecurringExpenseTemplateRow, 'category_id' | 'description' | 'amount' | 'day_of_month'>;

export interface CashAccountRow {
  id: string;
  name: string;
  opening_balance: number;
  opening_date: string;
  is_active: boolean;
}
export type NewCashAccountFields = Pick<CashAccountRow, 'name' | 'opening_balance' | 'opening_date'>;

export interface OfficeBudgetRow {
  id: string;
  category_id: string;
  year: number;
  month: number;
  budgeted_try: number;
}

export class OfficeBudgetNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfficeBudgetNotConfiguredError'
  }
}

// --- Tekrarlayan giderler ---

export async function fetchRecurringExpenseTemplates(): Promise<RecurringExpenseTemplateRow[]> {
  if (isMockSupabase()) throw new OfficeBudgetNotConfiguredError('Supabase yapılandırılmadı.');
  const { data, error } = await supabase.from('recurring_expense_templates').select('id, category_id, description, amount, day_of_month, is_active, last_generated_month').order('day_of_month');
  if (error) throw new Error(`Tekrarlayan giderler alınamadı: ${error.message}`);
  return data ?? [];
}

export async function createRecurringExpenseTemplate(fields: NewRecurringExpenseFields): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('recurring_expense_templates').insert(fields);
  if (error) return { success: false, message: 'Şablon oluşturulurken bir hata oluştu (yalnızca yönetici ekleyebilir).' };
  return { success: true, message: 'Tekrarlayan gider eklendi.' };
}

export async function toggleRecurringExpenseTemplate(id: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('recurring_expense_templates').update({ is_active: isActive }).eq('id', id);
  if (error) return { success: false, message: 'Güncellenirken bir hata oluştu.' };
  return { success: true, message: isActive ? 'Etkinleştirildi.' : 'Pasife alındı.' };
}

// --- Kasa/banka hesapları ---

export async function fetchCashAccounts(): Promise<CashAccountRow[]> {
  if (isMockSupabase()) throw new OfficeBudgetNotConfiguredError('Supabase yapılandırılmadı.');
  const { data, error } = await supabase.from('cash_accounts').select('id, name, opening_balance, opening_date, is_active').eq('is_active', true).order('name');
  if (error) throw new Error(`Kasa/banka hesapları alınamadı: ${error.message}`);
  return data ?? [];
}

export async function createCashAccount(fields: NewCashAccountFields): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('cash_accounts').insert(fields);
  if (error) return { success: false, message: 'Hesap oluşturulurken bir hata oluştu (yalnızca yönetici ekleyebilir).' };
  return { success: true, message: 'Kasa/banka hesabı eklendi.' };
}

// --- Aylık bütçe ---

export async function fetchOfficeBudgets(year: number, month: number): Promise<OfficeBudgetRow[]> {
  if (isMockSupabase()) throw new OfficeBudgetNotConfiguredError('Supabase yapılandırılmadı.');
  const { data, error } = await supabase.from('office_budgets').select('id, category_id, year, month, budgeted_try').eq('year', year).eq('month', month);
  if (error) throw new Error(`Bütçe alınamadı: ${error.message}`);
  return data ?? [];
}

export async function setOfficeBudget(categoryId: string, year: number, month: number, budgetedTry: number): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('office_budgets').upsert(
    { category_id: categoryId, year, month, budgeted_try: budgetedTry },
    { onConflict: 'category_id,year,month' }
  );
  if (error) return { success: false, message: 'Bütçe kaydedilirken bir hata oluştu (yalnızca yönetici düzenleyebilir).' };
  return { success: true, message: 'Bütçe kaydedildi.' };
}
