"use server"

import { ScrapedItem, LegalFeedSource } from './types'

/**
 * Adalet Bakanlığı'nın mevzuat.adalet.gov.tr / UYAP portallarının kullandığı
 * "Bedesten" arka ucu — kimlik doğrulama veya captcha gerektirmeyen, JSON
 * dönen bir arama servisi. Gerçek yanıt şekli bu ortamda CANLI olarak
 * doğrulandı (2026-07-28): mevzuat -> {data:{mevzuatList:[...]}}, içtihat ->
 * {data:{emsalKararList:[...]}}. Önceki sürüm ağ erişimi olmadan yazıldığı
 * için birkaç olası alan adını "tahmin eden" savunmacı bir parser
 * kullanıyordu (documents/data/results/items/list) — gerçek alan adları
 * (mevzuatList/emsalKararList) bu listede olmadığından iki kaynak da sessizce
 * boş dönüyordu. Artık gerçek alan adları doğrudan okunuyor.
 */

const BEDESTEN_BASE = 'https://bedesten.adalet.gov.tr'
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'AdaletApplicationName': 'UyapMevzuat',
  'Origin': 'https://mevzuat.adalet.gov.tr',
  'Referer': 'https://mevzuat.adalet.gov.tr/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LawLM-MevzuatRadari/1.0',
  'Accept': 'application/json, text/plain, */*',
}

export interface LiveSearchResult {
  source: LegalFeedSource;
  status: 'ok' | 'error';
  items: ScrapedItem[];
  error?: string;
}

async function searchMevzuat(query: string): Promise<LiveSearchResult> {
  try {
    const res = await fetch(`${BEDESTEN_BASE}/mevzuat/searchDocuments`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        data: {
          pageSize: 10,
          pageNumber: 1,
          phrase: query,
          sortFields: ['RESMI_GAZETE_TARIHI'],
          sortDirection: 'desc',
        },
        applicationName: 'UyapMevzuat',
        paging: true,
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const docs: any[] = json?.data?.mevzuatList ?? [];

    const items: ScrapedItem[] = docs.map((d: any) => ({
      source: 'bedesten_mevzuat' as LegalFeedSource,
      category: d.mevzuatTur ? String(d.mevzuatTur) : null,
      title: d.mevzuatAdi || d.title || 'İsimsiz mevzuat',
      url: d.url || (d.mevzuatId ? `https://mevzuat.adalet.gov.tr/ictihat/${d.mevzuatId}` : BEDESTEN_BASE),
      publishedAt: d.resmiGazeteTarihi ? String(d.resmiGazeteTarihi) : null,
      excerpt: d.resmiGazeteSayisi ? `RG Sayı: ${d.resmiGazeteSayisi}` : null,
    }));

    return { source: 'bedesten_mevzuat', status: 'ok', items };
  } catch (err) {
    return {
      source: 'bedesten_mevzuat',
      status: 'error',
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function searchIctihat(query: string): Promise<LiveSearchResult> {
  try {
    const res = await fetch(`${BEDESTEN_BASE}/emsal-karar/searchDocuments`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        data: {
          pageSize: 10,
          pageNumber: 1,
          phrase: query,
        },
        applicationName: 'UyapMevzuat',
        paging: true,
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const docs: any[] = json?.data?.emsalKararList ?? [];

    const items: ScrapedItem[] = docs.map((d: any) => {
      const documentId = d.documentId;
      const daire = d.birimAdi || d.itemType?.description || 'Karar';
      return {
        source: 'bedesten_ictihat' as LegalFeedSource,
        category: daire,
        title: `${daire} — E: ${d.esasNo ?? '—'}, K: ${d.kararNo ?? '—'}`,
        url: documentId ? `https://emsal.uyap.gov.tr/karar/${documentId}` : BEDESTEN_BASE,
        publishedAt: d.kararTarihi || null,
        excerpt: d.kararTarihiStr ? `Karar Tarihi: ${d.kararTarihiStr}` : null,
      };
    });

    return { source: 'bedesten_ictihat', status: 'ok', items };
  } catch (err) {
    return {
      source: 'bedesten_ictihat',
      status: 'error',
      items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Resmi kaynakları (mevzuat + içtihat) canlı, önbelleğe almadan sorgular. */
export async function searchOfficialSources(query: string): Promise<LiveSearchResult[]> {
  const term = query.trim();
  if (!term) return [];
  const [mevzuat, ictihat] = await Promise.all([searchMevzuat(term), searchIctihat(term)]);
  return [mevzuat, ictihat];
}
