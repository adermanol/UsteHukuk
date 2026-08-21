"use server"

import { supabase, isMockSupabase } from '@/core/database/supabase'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { KnowledgeBaseNotConfiguredError } from './types'

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export async function listDocuments(limit = 100): Promise<DocumentRow[]> {
  if (isMockSupabase()) {
    throw new KnowledgeBaseNotConfiguredError('Supabase yapılandırılmadı: belgeler alınamadı.');
  }
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, content, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Belgeler alınamadı: ${error.message}`);
  return data ?? [];
}

export async function deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, message: 'Supabase yapılandırılmadı: belge silinemedi.' };
  }
  const { error } = await supabaseAdmin.from('documents').delete().eq('id', id);
  if (error) {
    console.error('deleteDocument error:', error);
    return { success: false, message: 'Belge silinirken bir hata oluştu.' };
  }
  return { success: true, message: 'Belge silindi.' };
}
