import { supabase, isMockSupabase } from '@/core/database/supabase'

export class LegalCodesNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegalCodesNotConfiguredError'
  }
}

export interface LegalCodeArticleResult {
  id: string;
  articleNo: string;
  heading: string | null;
  content: string;
  codeName: string;
  codeShortName: string;
}

export interface TrackedCodeStatus {
  id: string;
  mevzuatNo: number;
  name: string;
  shortName: string;
  articleCount: number;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}

interface ArticleRow {
  id: string;
  article_no: string;
  heading: string | null;
  content: string;
  legal_codes: { name: string; short_name: string } | { name: string; short_name: string }[] | null;
}

function codeInfo(row: ArticleRow): { name: string; shortName: string } {
  const rel = Array.isArray(row.legal_codes) ? row.legal_codes[0] : row.legal_codes;
  return { name: rel?.name ?? '', shortName: rel?.short_name ?? '' };
}

/**
 * "299", "md. 299", "madde 299" gibi bir kalıp varsa madde numarasına tam
 * eşleşme aranır (izlenen tüm kanunlarda); aksi halde içerik/başlık üzerinde
 * ILIKE ile serbest metin araması yapılır.
 */
export async function searchArticles(query: string, limit = 15): Promise<LegalCodeArticleResult[]> {
  if (isMockSupabase()) {
    throw new LegalCodesNotConfiguredError('Supabase yapılandırılmadı: kanun maddesi araması yapılamadı.');
  }
  const term = query.trim();
  if (!term) return [];

  const articleNoMatch = term.match(/(?:md\.?|madde)\s*(\d+(?:\/[a-zçğıöşü])?)/i) ?? term.match(/^(\d+(?:\/[a-zçğıöşü])?)$/i);

  let request = supabase
    .from('legal_code_articles')
    .select('id, article_no, heading, content, legal_codes(name, short_name)')
    .limit(limit);

  if (articleNoMatch) {
    request = request.eq('article_no', articleNoMatch[1]);
  } else {
    const escaped = term.replace(/[%_]/g, m => `\\${m}`);
    request = request.or(`content.ilike.%${escaped}%,heading.ilike.%${escaped}%`);
  }

  const { data, error } = await request;
  if (error) throw new Error(`Kanun maddesi araması başarısız: ${error.message}`);

  return ((data ?? []) as unknown as ArticleRow[]).map(row => {
    const { name, shortName } = codeInfo(row);
    return {
      id: row.id,
      articleNo: row.article_no,
      heading: row.heading,
      content: row.content,
      codeName: name,
      codeShortName: shortName,
    };
  });
}

/** Belirli bir kanunun maddelerini listeler (Mevzuat Radarı'ndaki "Kanun
 * Metinleri" satırına tıklanınca kullanılır). query boşsa madde numarasına
 * göre ilk `limit` madde döner; doluysa o kanun içinde arama yapar. */
export async function fetchArticlesForCode(codeId: string, query = '', limit = 25): Promise<LegalCodeArticleResult[]> {
  if (isMockSupabase()) {
    throw new LegalCodesNotConfiguredError('Supabase yapılandırılmadı: kanun maddeleri alınamadı.');
  }
  let request = supabase
    .from('legal_code_articles')
    .select('id, article_no, heading, content, legal_codes(name, short_name)')
    .eq('legal_code_id', codeId)
    .limit(limit);

  const term = query.trim();
  if (term) {
    const escaped = term.replace(/[%_]/g, m => `\\${m}`);
    request = request.or(`content.ilike.%${escaped}%,heading.ilike.%${escaped}%,article_no.eq.${escaped}`);
  } else {
    request = request.order('article_no', { ascending: true });
  }

  const { data, error } = await request;
  if (error) throw new Error(`Kanun maddeleri alınamadı: ${error.message}`);

  return ((data ?? []) as unknown as ArticleRow[]).map(row => {
    const { name, shortName } = codeInfo(row);
    return { id: row.id, articleNo: row.article_no, heading: row.heading, content: row.content, codeName: name, codeShortName: shortName };
  });
}

export async function fetchTrackedCodes(): Promise<TrackedCodeStatus[]> {
  if (isMockSupabase()) {
    throw new LegalCodesNotConfiguredError('Supabase yapılandırılmadı: kanun listesi alınamadı.');
  }
  const { data, error } = await supabase
    .from('legal_codes')
    .select('id, mevzuat_no, name, short_name, article_count, last_synced_at, last_sync_status, last_sync_error')
    .order('name', { ascending: true });
  if (error) throw new Error(`Kanun listesi alınamadı: ${error.message}`);

  return (data ?? []).map(row => ({
    id: row.id,
    mevzuatNo: row.mevzuat_no,
    name: row.name,
    shortName: row.short_name,
    articleCount: row.article_count,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
  }));
}
