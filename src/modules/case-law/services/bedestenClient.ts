import * as cheerio from 'cheerio'

/**
 * Adalet Bakanlığı'nın Bedesten arka ucu (emsal-karar) — kimlik doğrulama
 * veya captcha gerektirmeyen, JSON dönen resmî bir arama servisi.
 * Uç noktalar ve yanıt şekilleri bu ortamda canlı olarak doğrulandı
 * (2026-07-28): arama -> {data:{emsalKararList:[...]}}, tam metin ->
 * {data:{content: base64(html)}}. src/modules/legislation-radar/services/
 * liveOfficialSearch.ts'teki canlı (önbelleksiz) arama ile aynı arka ucu
 * kullanır; burası ise sonuçları kalıcı olarak saklayıp embed eden
 * senkronizasyon tarafıdır.
 */

const BASE_URL = 'https://bedesten.adalet.gov.tr'
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'AdaletApplicationName': 'UyapMevzuat',
  'Origin': 'https://mevzuat.adalet.gov.tr',
  'Referer': 'https://mevzuat.adalet.gov.tr/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LawLM-KararSenkron/1.0',
  'Accept': 'application/json, text/plain, */*',
}

export interface BedestenDecisionSummary {
  documentId: string;
  decisionType: string | null;
  birim: string | null;
  esasNo: string | null;
  kararNo: string | null;
  kararTarihi: string | null; // ISO
}

/** Tek bir anahtar kelime için emsal karar araması. pageSize kasıtlı olarak
 * küçük tutulur (bu resmî bir devlet servisi; toplu hasat değil, hedefli
 * tarama yapılır). */
export async function searchDecisions(keyword: string, pageSize = 15): Promise<BedestenDecisionSummary[]> {
  const res = await fetch(`${BASE_URL}/emsal-karar/searchDocuments`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      data: { pageSize, pageNumber: 1, phrase: keyword },
      applicationName: 'UyapMevzuat',
      paging: true,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Bedesten arama hatası: HTTP ${res.status}`);
  const json = await res.json();
  const docs: any[] = json?.data?.emsalKararList ?? [];

  return docs
    .filter(d => d.documentId)
    .map(d => ({
      documentId: String(d.documentId),
      decisionType: d.itemType?.description ?? null,
      birim: d.birimAdi ?? null,
      esasNo: d.esasNo ?? null,
      kararNo: d.kararNo ?? null,
      kararTarihi: d.kararTarihi ?? null,
    }));
}

/** Bir kararın tam metnini getirir (base64 HTML -> düz metin). */
export async function fetchDecisionText(documentId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/emsal-karar/getDocumentContent`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ data: { documentId } }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Bedesten belge hatası: HTTP ${res.status}`);
  const json = await res.json();
  const base64 = json?.data?.content;
  if (!base64) throw new Error('Belge içeriği boş döndü.');

  const html = Buffer.from(base64, 'base64').toString('utf8');
  const $ = cheerio.load(html);
  return $.text().replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function buildSourceUrl(documentId: string): string {
  return `https://emsal.uyap.gov.tr/karar/${documentId}`;
}

/** Devlet servisine art arda hızlı istek atmamak için taramalar arasında
 * kısa bir bekleme — bu, mevzuat.gov.tr PDF importer'ındaki (pdfImporter.ts)
 * ölçülü tarama disipliniyle aynı yaklaşım. */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
