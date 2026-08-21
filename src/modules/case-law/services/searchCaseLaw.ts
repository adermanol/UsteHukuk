import { supabase, isMockSupabase } from '@/core/database/supabase'
import { embedQuery } from '@/modules/knowledge-base/services/ragService'

export interface CaseLawResult {
  id: string;
  decisionType: string | null;
  birim: string | null;
  esasNo: string | null;
  kararNo: string | null;
  kararTarihi: string | null;
  content: string;
  sourceUrl: string;
  similarity: number;
}

export class CaseLawNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaseLawNotConfiguredError'
  }
}

/** Kalıcı/senkronize edilmiş içtihat veritabanında anlamsal (semantik) arama.
 * LegalReferencePicker.tsx'teki "Resmî Kaynaklar (Canlı)" grubundan farkı:
 * o her aramada Bedesten'i canlı sorgular, bu ise önceden senkronize edilip
 * embed edilmiş kararlar üzerinde anlam bazlı arama yapar. */
export async function searchCaseLaw(query: string, limit = 8): Promise<CaseLawResult[]> {
  if (isMockSupabase()) {
    throw new CaseLawNotConfiguredError('Supabase yapılandırılmadı: içtihat araması yapılamadı.');
  }
  const trimmed = query.trim();
  if (!trimmed) return [];

  const embedding = await embedQuery(trimmed);
  const { data, error } = await supabase.rpc('match_case_law', {
    query_embedding: embedding,
    match_threshold: 0.6,
    match_count: limit,
  });
  if (error) throw new Error(`İçtihat araması başarısız: ${error.message}`);

  return (data ?? []).map((d: any) => ({
    id: d.id,
    decisionType: d.decision_type,
    birim: d.birim,
    esasNo: d.esas_no,
    kararNo: d.karar_no,
    kararTarihi: d.karar_tarihi,
    content: d.content,
    sourceUrl: d.source_url,
    similarity: d.similarity,
  }));
}

/** Belirli bir aramanın (registry.ts'teki bir anahtar kelimenin) getirdiği
 * kararları listeler (Mevzuat Radarı'ndaki "İçtihat Veritabanı" satırına
 * tıklanınca kullanılır) — semantik değil, doğrudan search_keyword eşleşmesi. */
export async function fetchDecisionsForKeyword(keyword: string, limit = 25): Promise<CaseLawResult[]> {
  if (isMockSupabase()) {
    throw new CaseLawNotConfiguredError('Supabase yapılandırılmadı: içtihat listesi alınamadı.');
  }
  const { data, error } = await supabase
    .from('case_law_decisions')
    .select('id, decision_type, birim, esas_no, karar_no, karar_tarihi, content, source_url')
    .eq('search_keyword', keyword)
    .order('karar_tarihi', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`İçtihat listesi alınamadı: ${error.message}`);

  return (data ?? []).map(d => ({
    id: d.id, decisionType: d.decision_type, birim: d.birim, esasNo: d.esas_no, kararNo: d.karar_no,
    kararTarihi: d.karar_tarihi, content: d.content, sourceUrl: d.source_url, similarity: 1,
  }));
}

export interface CaseLawStatusRow {
  practiceAreaId: string;
  keyword: string;
  count: number;
  lastSyncedAt: string | null;
}

/** İçtihat Radarı panelinde göstermek için: her taranan anahtar kelimenin
 * kaç kararı olduğu ve en son ne zaman senkronize edildiği. */
export async function fetchCaseLawStatus(): Promise<CaseLawStatusRow[]> {
  if (isMockSupabase()) {
    throw new CaseLawNotConfiguredError('Supabase yapılandırılmadı: içtihat durumu alınamadı.');
  }
  const { data, error } = await supabase
    .from('case_law_decisions')
    .select('search_keyword, practice_area_id, synced_at');
  if (error) throw new Error(`İçtihat durumu alınamadı: ${error.message}`);

  const byKeyword = new Map<string, CaseLawStatusRow>();
  for (const row of data ?? []) {
    const key = row.search_keyword;
    const existing = byKeyword.get(key);
    if (existing) {
      existing.count++;
      if (row.synced_at > (existing.lastSyncedAt ?? '')) existing.lastSyncedAt = row.synced_at;
    } else {
      byKeyword.set(key, { practiceAreaId: row.practice_area_id, keyword: key, count: 1, lastSyncedAt: row.synced_at });
    }
  }
  return Array.from(byKeyword.values());
}
