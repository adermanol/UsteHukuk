import { supabase, isMockSupabase } from '@/core/database/supabase'
import { DeadlineRule, RecessPeriod } from './deadlineEngine'

export type EventType = 'durusma' | 'kesif' | 'ifade' | 'icra_islemi' | 'muvekkil_gorusmesi' | 'cezaevi_gorusmesi' | 'kurum_randevusu' | 'sure' | 'gorev' | 'not';
export type EventStatus = 'planlandi' | 'tamamlandi' | 'ertelendi' | 'iptal';

export interface CaseEventRow {
  id: string;
  created_at: string;
  case_id: string | null;
  client_id: string | null;
  institution_id: string | null;
  owner_id: string | null;
  event_type: EventType;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location_note: string | null;
  status: EventStatus;
  outcome_note: string | null;
  follow_up_event_id: string | null;
  completed_at: string | null;
  deadline_rule_id: string | null;
  trigger_date: string | null;
  computed_due_date: string | null;
  computation: unknown;
  is_manual_override: boolean;
}

export type NewEventFields = Pick<CaseEventRow,
  'case_id' | 'client_id' | 'event_type' | 'title' | 'starts_at' | 'ends_at' | 'all_day' | 'location_note'
> & Partial<Pick<CaseEventRow, 'deadline_rule_id' | 'trigger_date' | 'computed_due_date' | 'computation' | 'is_manual_override'>>;

export class AgendaNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgendaNotConfiguredError'
  }
}

const EVENT_COLUMNS = 'id, created_at, case_id, client_id, institution_id, owner_id, event_type, title, starts_at, ends_at, all_day, location_note, status, outcome_note, follow_up_event_id, completed_at, deadline_rule_id, trigger_date, computed_due_date, computation, is_manual_override';

/** "Bugün" ekranı: bugüne ait ve henüz tamamlanmamış tüm etkinlikler. */
export async function fetchTodayEvents(): Promise<CaseEventRow[]> {
  if (isMockSupabase()) throw new AgendaNotConfiguredError('Supabase yapılandırılmadı: ajanda alınamadı.');
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('case_events')
    .select(EVENT_COLUMNS)
    .gte('starts_at', start.toISOString())
    .lte('starts_at', end.toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw new Error(`Bugünkü ajanda alınamadı: ${error.message}`);
  return data ?? [];
}

export interface CaseEventWithContact extends CaseEventRow {
  clients: { full_name: string; phone: string | null } | null;
  institutions: { name: string; phone: string | null; entrance_note: string | null; parking_note: string | null; procedure_note: string | null; lat: number | null; lng: number | null; address: string | null } | null;
}

/** Bugünkü ekran için tıkla-ara özelliği amacıyla müvekkil telefonu, ve
 * bağlı kurum varsa giriş/otopark/prosedür notları da gömülü olarak gelir
 * (case_events.client_id -> clients, institution_id -> institutions FK). */
export async function fetchTodayEventsWithContact(): Promise<CaseEventWithContact[]> {
  if (isMockSupabase()) throw new AgendaNotConfiguredError('Supabase yapılandırılmadı: ajanda alınamadı.');
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('case_events')
    .select(`${EVENT_COLUMNS}, clients ( full_name, phone ), institutions ( name, phone, entrance_note, parking_note, procedure_note, lat, lng, address )`)
    .gte('starts_at', start.toISOString())
    .lte('starts_at', end.toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw new Error(`Bugünkü ajanda alınamadı: ${error.message}`);
  return (data ?? []) as unknown as CaseEventWithContact[];
}

/** Yaklaşan süreler: event_type='sure', planlı, N gün içinde vadesi dolan. */
export async function fetchUpcomingDeadlines(days = 7): Promise<CaseEventRow[]> {
  if (isMockSupabase()) throw new AgendaNotConfiguredError('Supabase yapılandırılmadı: süreler alınamadı.');
  const until = new Date(); until.setDate(until.getDate() + days);
  const { data, error } = await supabase
    .from('case_events')
    .select(EVENT_COLUMNS)
    .eq('event_type', 'sure')
    .eq('status', 'planlandi')
    .lte('computed_due_date', until.toISOString().slice(0, 10))
    .order('computed_due_date', { ascending: true });
  if (error) throw new Error(`Yaklaşan süreler alınamadı: ${error.message}`);
  return data ?? [];
}

export type EditableEventFields = Pick<CaseEventRow, 'title' | 'starts_at' | 'location_note' | 'computed_due_date' | 'is_manual_override'>;

export async function updateEvent(id: string, fields: Partial<EditableEventFields>): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('case_events').update(fields).eq('id', id);
  if (error) {
    console.error('updateEvent error:', error);
    return { success: false, message: 'Etkinlik güncellenirken bir hata oluştu.' };
  }
  return { success: true, message: 'Etkinlik güncellendi.' };
}

export async function createEvent(fields: NewEventFields): Promise<{ success: boolean; message: string; id?: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı: etkinlik oluşturulamadı.' };
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('case_events')
    .insert({ ...fields, owner_id: userData.user?.id ?? null })
    .select('id')
    .single();
  if (error) {
    console.error('createEvent error:', error);
    return { success: false, message: 'Etkinlik oluşturulurken bir hata oluştu.' };
  }
  return { success: true, message: 'Etkinlik oluşturuldu.', id: data.id };
}

/** Duruşma çıkışı: "Ertelendi" akışı. Yeni tarihli bir takip etkinliği
 * oluşturur ve mevcut etkinliği follow_up_event_id ile ona bağlar, tek işlemde. */
export async function postponeEvent(eventId: string, newDate: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { data: original, error: fetchError } = await supabase.from('case_events').select(EVENT_COLUMNS).eq('id', eventId).single();
  if (fetchError || !original) return { success: false, message: 'Orijinal etkinlik bulunamadı.' };

  const { data: followUp, error: insertError } = await supabase
    .from('case_events')
    .insert({
      case_id: original.case_id, client_id: original.client_id, institution_id: original.institution_id,
      owner_id: original.owner_id, event_type: original.event_type, title: original.title,
      starts_at: newDate, all_day: original.all_day, location_note: original.location_note,
    })
    .select('id')
    .single();
  if (insertError || !followUp) return { success: false, message: 'Takip etkinliği oluşturulamadı.' };

  const { error: updateError } = await supabase
    .from('case_events')
    .update({ status: 'ertelendi', follow_up_event_id: followUp.id, completed_at: new Date().toISOString() })
    .eq('id', eventId);
  if (updateError) return { success: false, message: 'Erteleme kaydedilirken bir hata oluştu.' };

  return { success: true, message: 'Duruşma ertelendi, yeni tarih ajandaya eklendi.' };
}

export async function completeEvent(eventId: string, outcomeNote: string | null): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('case_events').update({ status: 'tamamlandi', outcome_note: outcomeNote, completed_at: new Date().toISOString() }).eq('id', eventId);
  if (error) return { success: false, message: 'Kaydedilirken bir hata oluştu.' };
  return { success: true, message: 'Kaydedildi.' };
}

export async function deleteEvent(id: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('case_events').delete().eq('id', id);
  if (error) return { success: false, message: 'Silinirken bir hata oluştu.' };
  return { success: true, message: 'Silindi.' };
}

// ---- Süre hesaplayıcının ihtiyaç duyduğu referans veri ----

export interface DeadlineRuleRow {
  id: string; label: string; jurisdiction: string; duration_value: number; duration_unit: string;
  trigger_label: string; legal_basis: string; legal_code_short_name: string | null; legal_article_no: string | null;
  affected_by_recess: boolean; rolls_over_non_working: boolean; is_active: boolean; verified_at: string | null; verified_by: string | null;
}

export async function fetchDeadlineRules(): Promise<DeadlineRuleRow[]> {
  if (isMockSupabase()) throw new AgendaNotConfiguredError('Supabase yapılandırılmadı: kurallar alınamadı.');
  const { data, error } = await supabase.from('deadline_rules').select('*').eq('is_active', true).order('label');
  if (error) throw new Error(`Süre kuralları alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchRecessPeriods(): Promise<RecessPeriod[]> {
  if (isMockSupabase()) throw new AgendaNotConfiguredError('Supabase yapılandırılmadı.');
  const { data, error } = await supabase.from('judicial_recess_periods').select('year, starts_on, ends_on, extension_days');
  if (error) throw new Error(`Adli tatil verisi alınamadı: ${error.message}`);
  return (data ?? []).map(r => ({ year: r.year, startsOn: r.starts_on, endsOn: r.ends_on, extensionDays: r.extension_days }));
}

export async function fetchNonWorkingDays(): Promise<{ days: Set<string>; coveredYears: Set<number> }> {
  if (isMockSupabase()) throw new AgendaNotConfiguredError('Supabase yapılandırılmadı.');
  const { data, error } = await supabase.from('non_working_days').select('day');
  if (error) throw new Error(`Tatil günleri alınamadı: ${error.message}`);
  const days = new Set((data ?? []).map(r => r.day as string));
  const coveredYears = new Set(Array.from(days).map(d => Number(d.slice(0, 4))));
  return { days, coveredYears };
}

export function toEngineRule(row: DeadlineRuleRow): DeadlineRule {
  return {
    id: row.id, label: row.label, durationValue: row.duration_value,
    durationUnit: row.duration_unit as DeadlineRule['durationUnit'],
    legalBasis: row.legal_basis, affectedByRecess: row.affected_by_recess,
    rollsOverNonWorking: row.rolls_over_non_working, verifiedAt: row.verified_at,
  };
}

/** Bugün kuruma bağlı (institution_id dolu) planlı etkinliklerin, saat
 * sırasına göre kurum id listesi — Kurumlar sayfasındaki "Bugünün Rotası"
 * haritada rota çizgisi için kullanılır. */
export async function fetchTodayInstitutionRoute(): Promise<string[]> {
  if (isMockSupabase()) return [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('case_events')
    .select('institution_id, starts_at')
    .not('institution_id', 'is', null)
    .gte('starts_at', start.toISOString())
    .lte('starts_at', end.toISOString())
    .order('starts_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(r => r.institution_id as string);
}

/** Mobil sekme çubuğu ve masaüstü ray'deki rozet için okunmamış hatırlatma
 * sayısı. Supabase yapılandırılmadıysa veya sorgu başarısız olursa 0 döner —
 * bir rozet sayacı asıl sayfa yüklemesini bloklamamalı. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  if (isMockSupabase()) return 0;
  const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function updateDeadlineRule(id: string, fields: Partial<Pick<DeadlineRuleRow, 'verified_at' | 'verified_by' | 'is_active'>>): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('deadline_rules').update(fields).eq('id', id);
  if (error) {
    console.error('updateDeadlineRule error:', error);
    return { success: false, message: 'Kural güncellenirken bir hata oluştu (yalnızca yönetici düzenleyebilir).' };
  }
  return { success: true, message: 'Kural güncellendi.' };
}
