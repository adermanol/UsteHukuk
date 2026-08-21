import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { LegalFeedSource, ScrapedItem, SourceRunResult } from './types'
import { scrapeResmiGazete } from './sources/resmiGazete'
import { scrapeMevzuatGov } from './sources/mevzuatGov'
import { scrapeKvkk } from './sources/kvkk'
import { scrapeRekabetKurumu } from './sources/rekabetKurumu'

const SOURCES: { source: LegalFeedSource; run: () => Promise<ScrapedItem[]> }[] = [
  { source: 'resmi_gazete', run: scrapeResmiGazete },
  { source: 'mevzuat_gov', run: scrapeMevzuatGov },
  { source: 'kvkk', run: scrapeKvkk },
  { source: 'rekabet_kurumu', run: scrapeRekabetKurumu },
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
 * Tüm kaynakları paralel tarar, sonuçları legal_feed_items'a upsert eder (url bazlı
 * dedupe), her kaynağın çalışma sonucunu legal_feed_runs'a loglar. Bir kaynağın
 * hata vermesi diğerlerini etkilemez. Hiçbir adımda LLM/AI çağrısı yapılmaz.
 */
export async function runLegalRadar(): Promise<SourceRunResult[]> {
  if (!isSupabaseAdminConfigured()) {
    throw new RadarNotConfiguredError(
      'Supabase yapılandırılmadı: SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL eksik.'
    );
  }

  const results = await Promise.all(SOURCES.map(runSource));

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
