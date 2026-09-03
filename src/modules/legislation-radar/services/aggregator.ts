import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { LegalFeedSource, ScrapedItem, SourceRunResult } from './types'
import { scrapeKvkk } from './sources/kvkk'

// Canlıya alma hatası (2026-09-03): resmi_gazete/mevzuat_gov/rekabet_kurumu
// Vercel'in sunucu IP aralıklarından geldiğinde bu üç devlet sitesinin WAF'ı
// tarafından engelleniyor (HTTP 418 / anında "fetch failed"), User-Agent
// değişikliğinin hiçbir etkisi olmadı — tespit IP seviyesinde. Bu üç kaynak
// artık burada TARANMIYOR; bunun yerine GitHub Actions'ta çalışan bağımsız
// bir script (scripts/legal-radar-scrape.mjs) tarafından taranıp
// /api/cron/legal-radar-external route'una POST ediliyor (bkz. DEPLOYMENT.md
// "Mevzuat Radarı — harici kaynak toplayıcı" bölümü). KVKK bu engele takılmadığı
// için burada, Vercel üzerinde taranmaya devam ediyor. sources/resmiGazete.ts,
// mevzuatGov.ts, rekabetKurumu.ts silinmedi — scripts/legal-radar-scrape.mjs
// bunların bire bir portu, referans olarak burada duruyorlar.
const SOURCES: { source: LegalFeedSource; run: () => Promise<ScrapedItem[]> }[] = [
  { source: 'kvkk', run: scrapeKvkk },
];

export class RadarNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RadarNotConfiguredError'
  }
}

async function runSource(entry: (typeof SOURCES)[number]): Promise<SourceRunResult> {
  const startedAt = Date.now();
  try {
    const items = await entry.run();
    return { source: entry.source, status: 'ok', items, durationMs: Date.now() - startedAt };
  } catch (err) {
    return {
      source: entry.source,
      status: 'error',
      items: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startedAt,
    };
  }
}

/**
 * Tarama sonuçlarını legal_feed_items'a upsert eder (url bazlı dedupe), her
 * kaynağın çalışma sonucunu legal_feed_runs'a loglar. Hem Vercel içi taramanın
 * (runLegalRadar) hem de harici GitHub Actions taramasının
 * (/api/cron/legal-radar-external) ortak kalıcılık katmanı — upsert/loglama
 * mantığı tek yerde kalsın diye buradan çıkarılmadı, iki çağıran da bunu kullanır.
 */
export async function persistFeedResults(results: SourceRunResult[]): Promise<SourceRunResult[]> {
  if (!isSupabaseAdminConfigured()) {
    throw new RadarNotConfiguredError(
      'Supabase yapılandırılmadı: SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL eksik.'
    );
  }

  for (const result of results) {
    if (result.items.length > 0) {
      const rows = result.items.map(item => ({
        source: item.source,
        category: item.category,
        title: item.title,
        url: item.url,
        published_at: item.publishedAt,
        excerpt: item.excerpt,
      }));
      const { error } = await supabaseAdmin
        .from('legal_feed_items')
        .upsert(rows, { onConflict: 'source,url', ignoreDuplicates: true });
      if (error) {
        result.status = 'error';
        result.error = `DB upsert hatası: ${error.message}`;
      }
    }

    await supabaseAdmin.from('legal_feed_runs').insert({
      source: result.source,
      status: result.status,
      item_count: result.items.length,
      error: result.error ?? null,
      duration_ms: result.durationMs,
    });
  }

  return results;
}

/**
 * KVKK'yı Vercel üzerinde tarar (WAF engeline takılmayan tek kaynak), sonuçları
 * kalıcılaştırır. Diğer 3 kaynak için bkz. yukarıdaki not.
 */
export async function runLegalRadar(): Promise<SourceRunResult[]> {
  if (!isSupabaseAdminConfigured()) {
    throw new RadarNotConfiguredError(
      'Supabase yapılandırılmadı: SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL eksik.'
    );
  }

  const results = await Promise.all(SOURCES.map(runSource));
  return persistFeedResults(results);
}
