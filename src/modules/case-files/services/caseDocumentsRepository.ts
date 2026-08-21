"use server"

import { createServerSupabaseClient } from '@/core/database/supabase-server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'

export interface CaseDocumentRow {
  id: string;
  case_id: string;
  doc_type: string;
  format: 'docx' | 'pdf';
  file_name: string;
  created_at: string;
}

const DOWNLOAD_URL_TTL_SECONDS = 60 * 10; // yalnızca anlık indirme için, uzun ömürlü saklanmaz

/** RLS "Allow read for case_documents" gereği yalnızca o dosyaya erişimi
 * olan (sahip/yönetici) kullanıcı görür — servis-rolü değil, oturum taşıyan
 * istemci kullanılır ki güvenlik sınırı gerçekten uygulansın. */
export async function fetchCaseDocuments(caseId: string): Promise<CaseDocumentRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('case_documents')
    .select('id, case_id, doc_type, format, file_name, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchCaseDocuments error:', error);
    return [];
  }
  return data ?? [];
}

/**
 * İndirme bağlantısı isteğe bağlı üretilir (kaydedilmiş uzun ömürlü bir
 * imzalı URL yerine) — önce RLS'e tabi oturum istemcisiyle belgenin bu
 * kullanıcıya GERÇEKTEN görünür olduğu doğrulanır, ancak storage imzalama
 * işleminin kendisi yalnızca servis-rolüyle yapılabildiği için ikinci adım
 * supabaseAdmin kullanır — güvenlik sınırı ilk adımdaki RLS kontrolüyle
 * korunur, admin yalnızca mekanik imzalama için kullanılır.
 */
export async function getCaseDocumentDownloadUrl(documentId: string): Promise<{ url: string | null; fileName: string | null; error?: string }> {
  if (!isSupabaseAdminConfigured()) return { url: null, fileName: null, error: 'Depolama yapılandırılmadı.' };

  const supabase = await createServerSupabaseClient();
  const { data: doc, error } = await supabase
    .from('case_documents')
    .select('storage_path, file_name')
    .eq('id', documentId)
    .maybeSingle();
  if (error || !doc) {
    return { url: null, fileName: null, error: 'Belge bulunamadı veya erişim yetkiniz yok.' };
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('private-documents')
    .createSignedUrl(doc.storage_path, DOWNLOAD_URL_TTL_SECONDS);
  if (signError || !signed) {
    console.error('getCaseDocumentDownloadUrl sign error:', signError);
    return { url: null, fileName: null, error: 'İndirme bağlantısı üretilemedi.' };
  }
  return { url: signed.signedUrl, fileName: doc.file_name };
}

export async function deleteCaseDocument(documentId: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createServerSupabaseClient();
  // Önce storage yolunu al (silme öncesi) — RLS SELECT ile aynı erişim sınırı.
  const { data: doc } = await supabase.from('case_documents').select('storage_path').eq('id', documentId).maybeSingle();
  const { data, error } = await supabase.from('case_documents').delete().eq('id', documentId).select('id');
  if (error) {
    console.error('deleteCaseDocument error:', error);
    return { success: false, message: 'Belge silinirken bir hata oluştu.' };
  }
  if (!data || data.length === 0) {
    return { success: false, message: 'Belge silinemedi — yetkiniz olmayabilir.' };
  }
  if (doc?.storage_path && isSupabaseAdminConfigured()) {
    await supabaseAdmin.storage.from('private-documents').remove([doc.storage_path]).catch(() => {});
  }
  return { success: true, message: 'Belge silindi.' };
}
