import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { LEGAL_CODE_REGISTRY } from '../registry'
import { importLegalCode, ImportResult } from './pdfImporter'

export class LegalCodesNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegalCodesNotConfiguredError'
  }
}

/**
 * Registry'deki tüm kanunları sırayla (paralel değil — mevzuat.gov.tr'ye
 * nazik davranmak için) senkronize eder. Sonuç, legislation-radar'ın
 * legal_feed_runs tablosuna 'legal_codes' kaynağıyla tek bir özet satır
 * olarak yazılır — RadarPanel'deki mevcut çalışma-durumu göstergesi bunu
 * otomatik olarak listeler.
 */
export async function syncAllLegalCodes(): Promise<ImportResult[]> {
  if (!isSupabaseAdminConfigured()) {
    throw new LegalCodesNotConfiguredError(
      'Supabase yapılandırılmadı: SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL eksik.'
    );
  }

  const startedAt = Date.now();
  const results: ImportResult[] = [];
  for (const entry of LEGAL_CODE_REGISTRY) {
    results.push(await importLegalCode(entry));
  }

  const failed = results.filter(r => r.status === 'error');
  const totalArticles = results.reduce((acc, r) => acc + r.articleCount, 0);

  await supabaseAdmin.from('legal_feed_runs').insert({
    source: 'legal_codes',
    status: failed.length === 0 ? 'ok' : 'error',
    item_count: totalArticles,
    error: failed.length > 0 ? `${failed.length}/${results.length} kanun senkronize edilemedi: ${failed.map(f => f.mevzuatNo).join(', ')}` : null,
    duration_ms: Date.now() - startedAt,
  });

  return results;
}
