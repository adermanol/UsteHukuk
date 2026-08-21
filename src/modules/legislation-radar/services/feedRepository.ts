import { supabase, isMockSupabase } from '@/core/database/supabase'
import { LegalFeedSource } from './types'

export interface LegalFeedItemRow {
  id: string;
  source: LegalFeedSource;
  category: string | null;
  title: string;
  url: string;
  published_at: string | null;
  first_seen_at: string;
  excerpt: string | null;
}

export interface LegalFeedRunRow {
  id: string;
  source: LegalFeedSource;
  status: 'ok' | 'error';
  item_count: number;
  error: string | null;
  ran_at: string;
}

export class LegalFeedNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegalFeedNotConfiguredError'
  }
}

export async function fetchLatestFeedItems(limit = 50): Promise<LegalFeedItemRow[]> {
  if (isMockSupabase()) {
    throw new LegalFeedNotConfiguredError('Supabase yapılandırılmadı: mevzuat radarı verisi alınamadı.');
  }
  const { data, error } = await supabase
    .from('legal_feed_items')
    .select('id, source, category, title, url, published_at, first_seen_at, excerpt')
    .order('first_seen_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Radar verisi alınamadı: ${error.message}`);
  return data ?? [];
}

export interface FeedSearchParams {
  /** Kelime/isim/numara — title, excerpt, category üzerinde ILIKE ile aranır. */
  query?: string;
  source?: LegalFeedSource | 'all';
  /** 'YYYY-MM-DD' — published_at bu tarihten itibaren (dahil). */
  dateFrom?: string;
  /** 'YYYY-MM-DD' — published_at bu tarihin sonuna kadar (dahil). */
  dateTo?: string;
}

/**
 * legal_feed_items üzerinde serbest metin (kelime/isim/numara) + kaynak +
 * tarih aralığı filtresi. Hiçbir parametre verilmezse en son kayıtları döner
 * (fetchLatestFeedItems ile aynı davranış), böylece hem arama hem filtreleme
 * için kullanılabilir.
 */
export async function searchFeedItems(params: FeedSearchParams, limit = 50): Promise<LegalFeedItemRow[]> {
  if (isMockSupabase()) {
    throw new LegalFeedNotConfiguredError('Supabase yapılandırılmadı: mevzuat radarı araması yapılamadı.');
  }

  let request = supabase
    .from('legal_feed_items')
    .select('id, source, category, title, url, published_at, first_seen_at, excerpt');

  const term = params.query?.trim();
  if (term) {
    const escaped = term.replace(/[%_]/g, m => `\\${m}`);
    request = request.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%,category.ilike.%${escaped}%`);
  }

  if (params.source && params.source !== 'all') {
    request = request.eq('source', params.source);
  }

  if (params.dateFrom) {
    request = request.gte('published_at', params.dateFrom);
  }

  if (params.dateTo) {
    request = request.lte('published_at', `${params.dateTo}T23:59:59`);
  }

  const { data, error } = await request
    .order('first_seen_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Radar araması başarısız: ${error.message}`);
  return data ?? [];
}

/** Her kaynağın en son tarama sonucu (başarı/hata, öğe sayısı, zaman). */
export async function fetchLatestRunPerSource(): Promise<LegalFeedRunRow[]> {
  if (isMockSupabase()) {
    throw new LegalFeedNotConfiguredError('Supabase yapılandırılmadı: tarama durumu alınamadı.');
  }
  const { data, error } = await supabase
    .from('legal_feed_runs')
    .select('id, source, status, item_count, error, ran_at')
    .order('ran_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(`Tarama durumu alınamadı: ${error.message}`);

  const latestBySource = new Map<string, LegalFeedRunRow>();
  for (const run of data ?? []) {
    if (!latestBySource.has(run.source)) latestBySource.set(run.source, run);
  }
  return Array.from(latestBySource.values());
}
