import { supabaseAdmin } from '@/core/database/supabase-admin'
import type { CaseStatus } from '@/modules/case-files'

export const CLIENT_STATUS_LABELS: Record<CaseStatus, string> = {
  potansiyel: 'Değerlendiriliyor',
  aktif: 'Devam Ediyor',
  istinaf: 'İstinaf Aşamasında',
  temyiz: 'Temyiz Aşamasında',
  kesinlesti: 'Kesinleşti',
  kapandi: 'Sonuçlandı',
  arsiv: 'Arşivlendi',
};

// Müvekkile gösterilecek etkinlik türleri — randevu niteliğindekiler. 'sure'
// (iç süre takibi) ve 'not'/'gorev' (personel içi hatırlatma) kasıtlı hariç.
const CLIENT_VISIBLE_EVENT_TYPES = ['durusma', 'kesif', 'ifade', 'icra_islemi', 'muvekkil_gorusmesi', 'cezaevi_gorusmesi', 'kurum_randevusu'];

export interface PortalCaseView {
  title: string;
  status: CaseStatus;
  statusLabel: string;
  courtName: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface PortalEventView {
  id: string;
  title: string;
  startsAt: string;
  locationNote: string | null;
  status: string;
}

/** Yalnızca durum-linki ile erişilen /portal/durum/[token] sayfası içindir.
 * supabaseAdmin kullanır (bu rotada Supabase oturumu yok) ve KASITLI OLARAK
 * hiçbir ücret alanı (agreed_fee, fee_model, success_fee_pct) sorgulamaz. */
export async function fetchPortalCaseView(caseId: string): Promise<PortalCaseView | null> {
  const { data, error } = await supabaseAdmin
    .from('cases')
    .select('title, status, court_name, opened_at, closed_at')
    .eq('id', caseId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    title: data.title, status: data.status, statusLabel: CLIENT_STATUS_LABELS[data.status as CaseStatus] ?? data.status,
    courtName: data.court_name, openedAt: data.opened_at, closedAt: data.closed_at,
  };
}

export async function fetchPortalEvents(caseId: string): Promise<PortalEventView[]> {
  const { data, error } = await supabaseAdmin
    .from('case_events')
    .select('id, title, starts_at, location_note, status, event_type')
    .eq('case_id', caseId)
    .in('event_type', CLIENT_VISIBLE_EVENT_TYPES)
    .neq('status', 'iptal')
    .order('starts_at', { ascending: true });
  if (error || !data) return [];
  return data.map(e => ({ id: e.id, title: e.title, startsAt: e.starts_at, locationNote: e.location_note, status: e.status }));
}
