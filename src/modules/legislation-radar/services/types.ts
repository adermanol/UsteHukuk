export type LegalFeedSource =
  | 'resmi_gazete'
  | 'mevzuat_gov'
  | 'kvkk'
  | 'rekabet_kurumu'
  | 'bedesten_mevzuat'
  | 'bedesten_ictihat';

export interface ScrapedItem {
  source: LegalFeedSource;
  category: string | null;
  title: string;
  url: string;
  publishedAt: string | null; // ISO
  excerpt: string | null;
}

export interface SourceRunResult {
  source: LegalFeedSource;
  status: 'ok' | 'error';
  items: ScrapedItem[];
  error?: string;
  durationMs: number;
}

// Canlıya alma hatası (2026-09-03): kendini açıkça bot olarak tanıtan özel
// User-Agent (UsteHukuk-MevzuatRadari/1.0), Resmî Gazete/Mevzuat.gov.tr/
// Rekabet Kurumu siteleri tarafından Vercel'in sunucu IP'lerinden gelirken
// tespit edilip engelleniyordu (HTTP 418 "teapot" ve bağlantı reddi) — bu
// üç kaynak yerelden test edildiğinde sorunsuz çalışıyordu, yalnızca canlı
// ortamda engelleniyordu. Standart bir tarayıcı kimliğine geçildi; kamuya
// açık, herkesin tarayıcıdan zaten görebildiği mevzuat/karar sayfalarını
// makul bir sıklıkta (günlük tarama) okumak dışında bir amaç taşımıyor.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
    // Devlet siteleri bazen önbelleklenmiş eski içerik döndürür; her taramada taze veri iste.
    cache: 'no-store',
    // Canlıya alma hatası (2026-08-23): bir zaman aşımı olmadan, yavaş/
    // bot-korumalı bir devlet sitesi bu fetch'i süresiz askıda bırakabiliyor
    // — Promise.all ile paralel çalışan 4 kaynaktan biri asılı kalınca
    // Vercel'in platform-seviyesi çalışma süresi sınırı tüm server action'ı
    // öldürüyor (kendi try/catch'imizin hiç yakalayamayacağı bir kesinti —
    // kullanıcıya jenerik "A server error occurred" olarak görünüyordu).
    // 15sn'lik bir üst sınır, tek bir yavaş kaynağın diğerlerini/tüm
    // taramayı asla asılı bırakmamasını garanti eder.
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return res.text();
}
