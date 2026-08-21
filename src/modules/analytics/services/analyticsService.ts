import { supabase, isMockSupabase } from '@/core/database/supabase'

export class AnalyticsNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalyticsNotConfiguredError'
  }
}

export interface AnalyticsKpis {
  income_try: number; expense_try: number; net_try: number;
  receivable_try: number; trust_balance_try: number;
  open_cases: number; new_cases: number;
  hearings_next_7d: number; deadlines_next_7d: number;
  new_applications: number;
}
export interface MonthlyCashflowRow { bucket: string; income_try: number; expense_try: number; net_try: number }
export interface CaseMixRow { area_id: string; label: string; case_count: number; open_count: number; income_try: number }
export interface AgingRow { bucket: string; sort_order: number; total_try: number; entry_count: number }
export interface IntakeFunnelRow { bucket: string; applications: number; converted: number }
export interface HearingLoadRow { week_start: string; hearings: number; deadlines: number }
export interface CaseAgeRow { bucket: string; sort_order: number; case_count: number }
export interface LlmUsageRow { bucket: string; tokens: number; calls: number }
export interface ClientReceivableRow {
  client_id: string; full_name: string; phone: string | null;
  not_due_try: number; d0_30_try: number; d31_60_try: number; d61_90_try: number; d90_plus_try: number;
  total_try: number; oldest_due_date: string | null; open_entry_count: number;
}
export interface CashBalanceRow { cash_account_id: string; name: string; balance_try: number }
export interface BudgetVsActualRow { category_id: string; label: string; budgeted_try: number; actual_try: number }

function guard() {
  if (isMockSupabase()) throw new AnalyticsNotConfiguredError('Supabase yapılandırılmadı: analitik veri çekilemedi.');
}

export async function fetchKpis(from: string, to: string): Promise<AnalyticsKpis> {
  guard();
  const { data, error } = await supabase.rpc('analytics_kpis', { p_from: from, p_to: to });
  if (error) throw new Error(`KPI verisi alınamadı: ${error.message}`);
  return data?.[0] ?? {
    income_try: 0, expense_try: 0, net_try: 0, receivable_try: 0, trust_balance_try: 0,
    open_cases: 0, new_cases: 0, hearings_next_7d: 0, deadlines_next_7d: 0, new_applications: 0,
  };
}

export async function fetchMonthlyCashflow(from: string, to: string): Promise<MonthlyCashflowRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_monthly_cashflow', { p_from: from, p_to: to });
  if (error) throw new Error(`Gelir-gider verisi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchCaseMix(from: string, to: string): Promise<CaseMixRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_case_mix', { p_from: from, p_to: to });
  if (error) throw new Error(`Dava türü dağılımı alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchReceivablesAging(): Promise<AgingRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_receivables_aging');
  if (error) throw new Error(`Alacak yaşlandırma verisi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchIntakeFunnel(from: string, to: string): Promise<IntakeFunnelRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_intake_funnel', { p_from: from, p_to: to });
  if (error) throw new Error(`Dönüşüm hunisi verisi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchHearingLoad(weeks = 8): Promise<HearingLoadRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_hearing_load', { p_weeks: weeks });
  if (error) throw new Error(`Duruşma yoğunluğu verisi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchCaseAge(): Promise<CaseAgeRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_case_age');
  if (error) throw new Error(`Dosya yaşı verisi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchLlmUsage(from: string, to: string): Promise<LlmUsageRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_llm_usage', { p_from: from, p_to: to });
  if (error) throw new Error(`YZ kullanım verisi alınamadı: ${error.message}`);
  return data ?? [];
}

/** Müvekkilden alacaklar — analytics_receivables_aging'in aksine dosya
 * kaydı bazında değil, case_clients üzerinden müvekkil bazında gruplar. */
export async function fetchClientReceivables(): Promise<ClientReceivableRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_client_receivables');
  if (error) throw new Error(`Müvekkilden alacaklar alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchCashBalance(): Promise<CashBalanceRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_cash_balance');
  if (error) throw new Error(`Kasa/banka bakiyesi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchOfficeBudgetVsActual(year: number, month: number): Promise<BudgetVsActualRow[]> {
  guard();
  const { data, error } = await supabase.rpc('analytics_office_budget_vs_actual', { p_year: year, p_month: month });
  if (error) throw new Error(`Bütçe-gerçekleşen verisi alınamadı: ${error.message}`);
  return data ?? [];
}
