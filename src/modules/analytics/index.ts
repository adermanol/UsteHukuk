export { AnalyticsDashboard } from './components/AnalyticsDashboard'
export { PeriodSelector, defaultPeriod } from './components/PeriodSelector'
export type { Period } from './components/PeriodSelector'
export {
  fetchKpis, fetchMonthlyCashflow, fetchCaseMix, fetchReceivablesAging, fetchIntakeFunnel,
  fetchHearingLoad, fetchCaseAge, fetchLlmUsage, fetchClientReceivables, fetchCashBalance, fetchOfficeBudgetVsActual,
  AnalyticsNotConfiguredError,
} from './services/analyticsService'
export type {
  AnalyticsKpis, MonthlyCashflowRow, CaseMixRow, AgingRow, IntakeFunnelRow, HearingLoadRow, CaseAgeRow, LlmUsageRow,
  ClientReceivableRow, CashBalanceRow, BudgetVsActualRow,
} from './services/analyticsService'
