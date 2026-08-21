import { supabase, isMockSupabase } from '@/core/database/supabase'

export type InstitutionKind = 'adliye' | 'cezaevi' | 'goc_idaresi' | 'emniyet' | 'jandarma' | 'icra_dairesi' |
  'noter' | 'tapu' | 'nufus' | 'sgk' | 'vergi' | 'belediye' | 'baro' | 'arabuluculuk' | 'bilirkisi' | 'konsolosluk' | 'diger';

export interface InstitutionRow {
  id: string;
  kind: InstitutionKind;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  website: string | null;
  working_hours: string | null;
  entrance_note: string | null;
  parking_note: string | null;
  procedure_note: string | null;
  is_favorite: boolean;
  notes: string | null;
  verified_at: string | null;
}

export type EditableInstitutionFields = Pick<InstitutionRow,
  'kind' | 'name' | 'city' | 'district' | 'address' | 'lat' | 'lng' | 'phone' | 'alt_phone' | 'email' | 'website' |
  'working_hours' | 'entrance_note' | 'parking_note' | 'procedure_note' | 'notes'
>;

export interface InstitutionContactRow {
  id: string;
  institution_id: string;
  unit: string | null;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  internal_ext: string | null;
  email: string | null;
}

export interface ChecklistItemRow { id: string; label: string; hint: string | null; is_required: boolean }
export interface ChecklistRow { id: string; title: string; description: string | null }

export class InstitutionsNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InstitutionsNotConfiguredError'
  }
}

const COLUMNS = 'id, kind, name, city, district, address, lat, lng, phone, alt_phone, email, website, working_hours, entrance_note, parking_note, procedure_note, is_favorite, notes, verified_at';

export async function fetchInstitutions(kind?: InstitutionKind): Promise<InstitutionRow[]> {
  if (isMockSupabase()) throw new InstitutionsNotConfiguredError('Supabase yapılandırılmadı: kurum rehberi alınamadı.');
  let query = supabase.from('institutions').select(COLUMNS).order('is_favorite', { ascending: false }).order('name');
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) throw new Error(`Kurum rehberi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function createInstitution(fields: EditableInstitutionFields): Promise<{ success: boolean; message: string; id?: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı: kurum oluşturulamadı.' };
  const { data, error } = await supabase.from('institutions').insert(fields).select('id').single();
  if (error) {
    console.error('createInstitution error:', error);
    return { success: false, message: 'Kurum oluşturulurken bir hata oluştu.' };
  }
  return { success: true, message: 'Kurum eklendi.', id: data.id };
}

/** CSV toplu içe aktarma. Tek tek `createInstitution` çağırmak yerine tek
 * bir `.insert([...])` kullanılır — yüzlerce satırlık bir dosyada N ayrı
 * ağ isteği yerine tek istek. Başarısız olursa hiçbir satır eklenmez
 * (Supabase/PostgREST tek bir insert'i atomik uygular). */
export async function bulkImportInstitutions(rows: EditableInstitutionFields[]): Promise<{ success: boolean; message: string; count?: number }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı: kurumlar içe aktarılamadı.' };
  if (rows.length === 0) return { success: false, message: 'İçe aktarılacak satır yok.' };
  const { data, error } = await supabase.from('institutions').insert(rows).select('id');
  if (error) {
    console.error('bulkImportInstitutions error:', error);
    return { success: false, message: `İçe aktarma başarısız: ${error.message}` };
  }
  return { success: true, message: `${data?.length ?? rows.length} kurum içe aktarıldı.`, count: data?.length ?? rows.length };
}

export async function updateInstitution(id: string, fields: Partial<EditableInstitutionFields>): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('institutions').update(fields).eq('id', id);
  if (error) return { success: false, message: 'Kurum güncellenirken bir hata oluştu.' };
  return { success: true, message: 'Kurum güncellendi.' };
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('institutions').update({ is_favorite: isFavorite }).eq('id', id);
  if (error) return { success: false, message: 'Favori durumu güncellenirken bir hata oluştu.' };
  return { success: true, message: isFavorite ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.' };
}

export async function deleteInstitution(id: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('institutions').delete().eq('id', id);
  if (error) return { success: false, message: 'Kurum silinirken bir hata oluştu.' };
  return { success: true, message: 'Kurum silindi.' };
}

export async function fetchInstitutionContacts(institutionId: string): Promise<InstitutionContactRow[]> {
  if (isMockSupabase()) throw new InstitutionsNotConfiguredError('Supabase yapılandırılmadı.');
  const { data, error } = await supabase.from('institution_contacts').select('*').eq('institution_id', institutionId).order('sort_order');
  if (error) throw new Error(`Kurum iletişim listesi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function addInstitutionContact(institutionId: string, fields: Omit<InstitutionContactRow, 'id' | 'institution_id'>): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('institution_contacts').insert({ ...fields, institution_id: institutionId });
  if (error) return { success: false, message: 'Kişi eklenirken bir hata oluştu.' };
  return { success: true, message: 'Kişi eklendi.' };
}

/** Bir kurum türü için genel kontrol listesini (ör. tüm cezaevleri için
 * "Cezaevi Görüşü Hazırlık Listesi") getirir. Kuruma özel liste varsa o
 * öncelenir; yoksa tür bazlı genel liste kullanılır. */
export async function fetchChecklistForKind(kind: InstitutionKind, institutionId?: string): Promise<{ checklist: ChecklistRow; items: ChecklistItemRow[] } | null> {
  if (isMockSupabase()) throw new InstitutionsNotConfiguredError('Supabase yapılandırılmadı.');
  let checklist = null;
  if (institutionId) {
    const { data } = await supabase.from('procedure_checklists').select('id, title, description').eq('institution_id', institutionId).eq('is_active', true).limit(1).maybeSingle();
    checklist = data;
  }
  if (!checklist) {
    const { data } = await supabase.from('procedure_checklists').select('id, title, description').eq('institution_kind', kind).is('institution_id', null).eq('is_active', true).limit(1).maybeSingle();
    checklist = data;
  }
  if (!checklist) return null;
  const { data: items, error } = await supabase.from('procedure_checklist_items').select('id, label, hint, is_required').eq('checklist_id', checklist.id).order('sort_order');
  if (error) throw new Error(`Kontrol listesi maddeleri alınamadı: ${error.message}`);
  return { checklist, items: items ?? [] };
}

/** Haversine formülü — iki koordinat arası kuş uçuşu mesafe (km). Harici bir
 * yol tarifi API'si gerekmez; "yakındakiler" listesi için yeterli hassasiyet. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function saveProcedureRun(checklistId: string, checkedItemIds: string[], caseId: string | null, notes: string | null): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('procedure_runs').insert({
    checklist_id: checklistId, case_id: caseId, checked_item_ids: checkedItemIds,
    owner_id: userData.user?.id ?? null, completed_at: new Date().toISOString(), notes,
  });
  if (error) {
    console.error('saveProcedureRun error:', error);
    return { success: false, message: 'Kayıt oluşturulurken bir hata oluştu.' };
  }
  return { success: true, message: 'Kontrol listesi kaydedildi.' };
}
