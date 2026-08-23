import { supabase, isMockSupabase } from '@/core/database/supabase'

export type ApplicationStatus = 'pending' | 'active' | 'resolved';

export interface ApplicationRow {
  id: string;
  created_at: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  case_type: string | null;
  practice_area_id: string | null;
  details: string | null;
  status: ApplicationStatus;
  preferred_channel: string | null;
  attachment_url: string | null;
  consents: Record<string, boolean | string> | null;
  source: string | null;
}

export class ApplicationsNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApplicationsNotConfiguredError'
  }
}

/** Panel girişinde "henüz kontrol edilmemiş yeni başvuru" bildirimi için —
 * yalnızca sayıyı döner, tüm satırları çekmez. */
export async function fetchPendingApplicationsCount(): Promise<number> {
  if (isMockSupabase()) return 0;
  const { count, error } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

export async function fetchApplications(limit = 100): Promise<ApplicationRow[]> {
  if (isMockSupabase()) {
    throw new ApplicationsNotConfiguredError('Supabase yapılandırılmadı: başvurular alınamadı.');
  }
  const { data, error } = await supabase
    .from('clients')
    .select('id, created_at, full_name, email, phone, case_type, practice_area_id, details, status, preferred_channel, attachment_url, consents, source')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Başvurular alınamadı: ${error.message}`);
  return data ?? [];
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: durum güncellenemedi.' };
  }
  const { error } = await supabase.from('clients').update({ status }).eq('id', id);
  if (error) {
    console.error('updateApplicationStatus error:', error);
    return { success: false, message: 'Durum güncellenirken bir hata oluştu.' };
  }
  return { success: true, message: 'Durum güncellendi.' };
}

export interface EditableApplicationFields {
  full_name: string;
  email: string | null;
  phone: string | null;
  case_type: string | null;
  practice_area_id: string | null;
  details: string | null;
  preferred_channel: string | null;
}

/**
 * Yalnızca başvuru sahibinin kendisiyle ilgili alanlar düzenlenebilir.
 * `consents` (hukuki onay kaydı), `attachment_url`/`source`/`created_at`
 * (başvurunun değişmez kaynak meta verisi) kasıtlı olarak bu fonksiyonun
 * dışında tutulur.
 */
export async function updateApplication(id: string, fields: EditableApplicationFields): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: başvuru güncellenemedi.' };
  }
  const { error } = await supabase.from('clients').update(fields).eq('id', id);
  if (error) {
    console.error('updateApplication error:', error);
    return { success: false, message: 'Başvuru güncellenirken bir hata oluştu.' };
  }
  return { success: true, message: 'Başvuru güncellendi.' };
}

/**
 * RLS "Allow non-stajyer delete for clients" (bkz. 20260808000000) gereği
 * stajyer rolü artık silemez. `.select('id')` olmadan bu durumda PostgREST
 * `error: null` + boş sonuç dönerdi, kod bunu "başarılı" sanardı (bkz. bu
 * projede daha önce tekrarlayan aynı sessiz-başarısızlık deseni).
 */
export async function deleteApplication(id: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: başvuru silinemedi.' };
  }
  const { data, error } = await supabase.from('clients').delete().eq('id', id).select('id');
  if (error) {
    console.error('deleteApplication error:', error);
    return { success: false, message: 'Başvuru silinirken bir hata oluştu.' };
  }
  if (!data || data.length === 0) {
    return { success: false, message: 'Başvuru silinemedi — bu işlem için yetkiniz olmayabilir.' };
  }
  await supabase.rpc('log_audit_event', { p_action: 'client_delete', p_details: { client_id: id } });
  return { success: true, message: 'Başvuru silindi.' };
}
