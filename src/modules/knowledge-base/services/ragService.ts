"use server"

import { embed } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { supabase, isMockSupabase } from '@/core/database/supabase'
import { callLLM } from '@/core/llm-gateway'
import { getLlmSettings } from '@/lib/llmSettings'
import { SearchResult, KnowledgeBaseNotConfiguredError } from './types'

/**
 * Arama vektörü, /dashboard/settings'te seçilen aktif sağlayıcıya göre üretilir
 * (sohbet çağrılarıyla aynı seçim — callLLM'deki resolveProvider mantığıyla
 * tutarlı). LM Studio seçiliyse veya OPENAI_API_KEY tanımlı değilse yerel
 * embedding modeline (nomic-embed-text) düşülür; documents.embedding sütunu
 * bu modelin 768 boyutuna göre kurulur (bkz. 20260725000000_lmstudio_embeddings.sql).
 * Sağlayıcı değiştirildiğinde önceki embedding'ler farklı vektör uzayında kalır —
 * yeniden indexlenmeleri gerekir.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const { activeProvider } = await getLlmSettings()
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const useLmStudio = activeProvider === 'lmstudio' || (!activeProvider && !hasOpenAI)

  if (useLmStudio) {
    const lmStudio = createOpenAI({
      baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
      apiKey: 'lm-studio', // LM Studio anahtarı doğrulamaz, SDK boş olmayan bir değer bekler.
      // Not: `compatibility: 'compatible'` seçeneği kurulu @ai-sdk/openai@4.0.15'te
      // artık yok (paket bu oturumdan önce güncellenmiş) — embedding() zaten
      // doğrudan /v1/embeddings'i hedefliyor, seçenek gereksizdi.
    })
    try {
      const { embedding } = await embed({
        model: lmStudio.embedding(process.env.LM_STUDIO_EMBEDDING_MODEL || 'text-embedding-nomic-embed-text-v2-moe'),
        value: query,
      })
      return embedding
    } catch (err) {
      console.error('LM Studio embedding error:', err)
      throw new Error("LM Studio'dan embedding alınamadı. Yerel sunucunun çalıştığından ve embedding modelinin yüklü olduğundan emin olun.")
    }
  }

  if (!hasOpenAI) {
    throw new KnowledgeBaseNotConfiguredError(
      'Arama vektörü üretilemedi: OPENAI_API_KEY tanımlı değil.'
    )
  }
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: query,
  })
  return embedding
}

export const searchKnowledgeBase = async (query: string): Promise<SearchResult[]> => {
  if (isMockSupabase()) {
    throw new KnowledgeBaseNotConfiguredError(
      'Bilgi bankası yapılandırılmadı: Supabase bağlantısı eksik.'
    )
  }

  const queryEmbedding = await embedQuery(query)

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5
  });

  if (error) throw error;

  return (data ?? []).map((d: any) => ({
    id: d.id,
    title: d.title,
    snippet: d.content.substring(0, 200) + "...",
    relevance: d.similarity
  }));
}

export const generateAnswerFromRAG = async (query: string, results: SearchResult[]) => {
  const context = results.map(r => `[${r.title}]: ${r.snippet}`).join('\n')
  return await callLLM({
    prompt: query,
    system: "Sen bir hukuk bilgi bankası asistanısın. Lütfen YALNIZCA aşağıdaki BAĞLAM'a dayanarak cevap ver ve hangi kaynaktan (başlıktan) alıntı yaptığını köşeli parantez içinde belirt.",
    context,
    moduleName: 'rag-search'
  })
}
