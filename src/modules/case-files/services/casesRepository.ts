import { supabase, isMockSupabase } from '@/core/database/supabase'

export type CaseStatus = 'potansiyel' | 'aktif' | 'istinaf' | 'temyiz' | 'kesinlesti' | 'kapandi' | 'arsiv';
export type CaseJurisdiction = 'hukuk' | 'ceza' | 'icra' | 'idare' | 'is' | 'arabuluculuk' | 'danismanlik';
export type CaseRole = 'davaci' | 'davali' | 'sanik' | 'supheli' | 'musteki' | 'katilan' | 'alacakli' | 'borclu' | 'ucuncu_kisi' | 'danisan';
export type FeeModel = 'maktu' | 'oransal' | 'saatlik' | 'karma' | 'ucretsiz';
export type CaseOutcome = 'kabul' | 'kismen_kabul' | 'ret' | 'feragat' | 'sulh' | 'takipsizlik' | 'beraat' | 'mahkumiyet' | 'dusme' | 'diger';

export interface CaseRow {
  id: string;
  created_at: string;
  updated_at: string;
  office_no: string | null;
  file_no: string | null;
  court_name: string | null;
  institution_id: string | null;
  client_id: string | null;
  owner_id: string | null;
  title: string;
  practice_area_id: string | null;
  jurisdiction: CaseJurisdiction;
  case_role: CaseRole | null;
  status: CaseStatus;
  opened_at: string;
  closed_at: string | null;
  outcome: CaseOutcome | null;
  opposing_party: string | null;
  fee_model: FeeModel | null;
  agreed_fee: number | null;
  fee_currency: string;
  success_fee_pct: number | null;
  is_recess_exempt: boolean;
  source: 'manual' | 'uyap_import';
  notes: string | null;
}

export type EditableCaseFields = Pick<CaseRow,
  'title' | 'office_no' | 'file_no' | 'court_name' | 'client_id' | 'practice_area_id' |
  'jurisdiction' | 'case_role' | 'status' | 'opened_at' | 'closed_at' | 'outcome' |
  'opposing_party' | 'fee_model' | 'agreed_fee' | 'fee_currency' | 'success_fee_pct' |
  'is_recess_exempt' | 'notes'
>;

export class CasesNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CasesNotConfiguredError'
  }
}

/** Bir dosyanın birden fazla müvekkili olabilir (miras paylaşımı, ortaklığın
 * giderilmesi vb.) — bkz. case_clients ara tablosu. cases.client_id yalnızca
 * "birincil müvekkil" olarak kalır; tüm taraflar bu tablodan okunur. */
export interface CaseClientRow {
  case_id: string;
  client_id: string;
  is_primary: boolean;
  role_note: string | null;
  full_name: string;
}

const SELECT_COLUMNS = 'id, created_at, updated_at, office_no, file_no, court_name, institution_id, client_id, owner_id, title, practice_area_id, jurisdiction, case_role, status, opened_at, closed_at, outcome, opposing_party, fee_model, agreed_fee, fee_currency, success_fee_pct, is_recess_exempt, source, notes';

export async function fetchCases(limit = 200, offset = 0): Promise<CaseRow[]> {
  if (isMockSupabase()) {
    throw new CasesNotConfiguredError('Supabase yapılandırılmadı: dosyalar alınamadı.');
  }
  const { data, error } = await supabase
    .from('cases')
    .select(SELECT_COLUMNS)
    .order('opened_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Dosyalar alınamadı: ${error.message}`);
  return data ?? [];
}

/** client_id (birincil müvekkil) her set edildiğinde case_clients'te de
 * is_primary=true olarak yansıtılır — iki tabloyu createCase/updateCase'in
 * tek bir çağrısından tutarlı tutan ince bir senkron. Asla throw etmez;
 * case_clients yazımı başarısız olsa da asıl cases işlemi geçerli sayılır
 * (case_clients yalnızca müvekkil-bazlı raporlama için, dosyanın kendisi
 * için kritik değil). */
async function syncPrimaryCaseClient(caseId: string, clientId: string | null | undefined) {
  if (!clientId) return;
  const { error } = await supabase
    .from('case_clients')
    .upsert({ case_id: caseId, client_id: clientId, is_primary: true }, { onConflict: 'case_id,client_id' });
  if (error) console.error('syncPrimaryCaseClient error:', error);
}

export async function createCase(fields: EditableCaseFields): Promise<{ success: boolean; message: string; id?: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: dosya oluşturulamadı.' };
  }
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('cases')
    .insert({ ...fields, owner_id: userData.user?.id ?? null })
    .select('id')
    .single();
  if (error) {
    console.error('createCase error:', error);
    return { success: false, message: 'Dosya oluşturulurken bir hata oluştu.' };
  }
  await syncPrimaryCaseClient(data.id, fields.client_id);
  return { success: true, message: 'Dosya oluşturuldu.', id: data.id };
}

export async function updateCase(id: string, fields: Partial<EditableCaseFields>): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: dosya güncellenemedi.' };
  }
  const { error } = await supabase.from('cases').update(fields).eq('id', id);
  if (error) {
    console.error('updateCase error:', error);
    return { success: false, message: 'Dosya güncellenirken bir hata oluştu.' };
  }
  if ('client_id' in fields) await syncPrimaryCaseClient(id, fields.client_id);
  return { success: true, message: 'Dosya güncellendi.' };
}

/** Bir dosyanın tüm taraflarını (tek veya çok müvekkilli) döner. */
export async function fetchCaseClients(caseId: string): Promise<CaseClientRow[]> {
  if (isMockSupabase()) return [];
  const { data, error } = await supabase
    .from('case_clients')
    .select('case_id, client_id, is_primary, role_note, clients(full_name)')
    .eq('case_id', caseId)
    .order('is_primary', { ascending: false });
  if (error) { console.error('fetchCaseClients error:', error); return []; }
  return (data ?? []).map((row) => {
    const r = row as unknown as { case_id: string; client_id: string; is_primary: boolean; role_note: string | null; clients: { full_name: string } | { full_name: string }[] | null };
    const clientRow = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    return { case_id: r.case_id, client_id: r.client_id, is_primary: r.is_primary, role_note: r.role_note, full_name: clientRow?.full_name ?? 'İsimsiz müvekkil' };
  });
}

/** Dosyaya ek müvekkil (ek taraf) ekler — miras paylaşımı, ortaklığın
 * giderilmesi gibi çok taraflı dosyalar için. */
export async function addCaseClient(caseId: string, clientId: string, roleNote: string | null = null): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('case_clients').insert({ case_id: caseId, client_id: clientId, is_primary: false, role_note: roleNote });
  if (error) {
    console.error('addCaseClient error:', error);
    return { success: false, message: error.code === '23505' ? 'Bu müvekkil zaten dosyada.' : 'Müvekkil eklenirken bir hata oluştu.' };
  }
  return { success: true, message: 'Müvekkil dosyaya eklendi.' };
}

/** Dosyadan bir tarafı çıkarır. Bu, o (dosya, müvekkil) çiftine ait durum
 * linkini de kendiliğinden geçersiz kılar (bkz. client-portal modülü). */
export async function removeCaseClient(caseId: string, clientId: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('case_clients').delete().eq('case_id', caseId).eq('client_id', clientId);
  if (error) {
    console.error('removeCaseClient error:', error);
    return { success: false, message: 'Müvekkil çıkarılırken bir hata oluştu.' };
  }
  return { success: true, message: 'Müvekkil dosyadan çıkarıldı.' };
}

export async function deleteCase(id: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: dosya silinemedi.' };
  }
  const { error } = await supabase.from('cases').delete().eq('id', id);
  if (error) {
    console.error('deleteCase error:', error);
    return { success: false, message: 'Dosya silinirken bir hata oluştu.' };
  }
  return { success: true, message: 'Dosya silindi.' };
}

/** Bir başvuruyu (client) dosyaya dönüştürür: client'ın alanlarından yeni
 * bir case oluşturur ve client_id ile bağlar. Başvuru huninin analitikteki
 * dönüşüm oranı grafiği bu bağlantıyı sayar. */
export async function convertApplicationToCase(clientId: string, title: string, practiceAreaId: string | null): Promise<{ success: boolean; message: string; id?: string }> {
  return createCase({
    title,
    office_no: null,
    file_no: null,
    court_name: null,
    client_id: clientId,
    practice_area_id: practiceAreaId,
    jurisdiction: 'hukuk',
    case_role: null,
    status: 'aktif',
    opened_at: new Date().toISOString().slice(0, 10),
    closed_at: null,
    outcome: null,
    opposing_party: null,
    fee_model: null,
    agreed_fee: null,
    fee_currency: 'TRY',
    success_fee_pct: null,
    is_recess_exempt: false,
    notes: null,
  });
}
