import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { CASE_LAW_SEARCH_REGISTRY } from '../registry'
import { searchDecisions, fetchDecisionText, buildSourceUrl, delay } from './bedestenClient'
import { embedQuery } from '@/modules/knowledge-base/services/ragService'

export class CaseLawNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaseLawNotConfiguredError'
  }
}

export interface CaseLawSyncResult {
  keyword: string;
  practiceAreaId: string;
  found: number;
  imported: number;
  status: 'ok' | 'error';
  error?: string;
}

/** Kayıttaki her anahtar kelime için arama yapar; yalnızca DAHA ÖNCE
 * kaydedilmemiş kararların tam metnini çeker, embed eder ve saklar —
 * her senkronda aynı kararları tekrar çekmez. Devlet servisine ölçülü
 * davranmak için aramalar ve belge çekimleri arasında kısa gecikme vardır. */
export async function syncAllCaseLaw(): Promise<CaseLawSyncResult[]> {
  if (!isSupabaseAdminConfigured()) {
    throw new CaseLawNotConfiguredError('Supabase yapılandırılmadı: SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL eksik.');
  }

  const results: CaseLawSyncResult[] = [];
  const startedAt = Date.now();
  let totalImported = 0;

  for (const entry of CASE_LAW_SEARCH_REGISTRY) {
    try {
      const summaries = await searchDecisions(entry.keyword);
      let imported = 0;

      for (const summary of summaries) {
        const { data: existing } = await supabaseAdmin
          .from('case_law_decisions')
          .select('id')
          .eq('id', summary.documentId)
          .maybeSingle();
        if (existing) continue;

        await delay(400);
        const content = await fetchDecisionText(summary.documentId);
        const embedding = await embedQuery(content.slice(0, 6000));

        const { error: insertError } = await supabaseAdmin.from('case_law_decisions').insert({
          id: summary.documentId,
          decision_type: summary.decisionType,
          birim: summary.birim,
          esas_no: summary.esasNo,
          karar_no: summary.kararNo,
          karar_tarihi: summary.kararTarihi,
          search_keyword: entry.keyword,
          practice_area_id: entry.practiceAreaId,
          content,
          embedding,
          source_url: buildSourceUrl(summary.documentId),
        });
        if (insertError) {
          console.error(`case-law insert hatası (${summary.documentId}):`, insertError.message);
          continue;
        }
        imported++;
        totalImported++;
      }

      results.push({ keyword: entry.keyword, practiceAreaId: entry.practiceAreaId, found: summaries.length, imported, status: 'ok' });
      await delay(600);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ keyword: entry.keyword, practiceAreaId: entry.practiceAreaId, found: 0, imported: 0, status: 'error', error: message });
    }
  }

  await supabaseAdmin.from('legal_feed_runs').insert({
    source: 'case_law',
    status: results.every(r => r.status === 'ok') ? 'ok' : 'error',
    item_count: totalImported,
    error: results.filter(r => r.status === 'error').map(r => `${r.keyword}: ${r.error}`).join('; ') || null,
    duration_ms: Date.now() - startedAt,
  });

  return results;
}
