"use server"

import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { embedQuery } from './ragService'
import { KnowledgeBaseNotConfiguredError } from './types'

export interface IndexDocumentResult {
  success: boolean;
  message: string;
}

/**
 * Bilgi bankasına (documents tablosu) yeni bir metin ekler ve embedding'ini
 * üretir. RLS documents tablosunda insert izni vermediği için servis-rolü
 * istemcisi (supabaseAdmin) kullanılır — legislation-radar/aggregator.ts'teki
 * yazma deseniyle aynı.
 */
export async function indexDocument(title: string, content: string): Promise<IndexDocumentResult> {
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedTitle || !trimmedContent) {
    return { success: false, message: 'Başlık ve içerik boş olamaz.' };
  }

  if (!isSupabaseAdminConfigured()) {
    return { success: false, message: 'Supabase yapılandırılmadı: içerik arşive eklenemedi.' };
  }

  try {
    const embedding = await embedQuery(trimmedContent);

    const { error } = await supabaseAdmin.from('documents').insert({
      title: trimmedTitle,
      content: trimmedContent,
      embedding,
    });

    if (error) throw error;

    return { success: true, message: 'İçerik bilgi bankasına eklendi.' };
  } catch (err) {
    if (err instanceof KnowledgeBaseNotConfiguredError) {
      return { success: false, message: err.message };
    }
    console.error('indexDocument error:', err);
    return { success: false, message: 'İçerik eklenirken beklenmeyen bir hata oluştu.' };
  }
}
