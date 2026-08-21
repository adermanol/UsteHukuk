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

const USER_AGENT = 'LawLM-MevzuatRadari/1.0 (+https://lawlm.local; hukuk burosu ic kullanim araci)';

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'tr-TR,tr;q=0.9' },
    // Devlet siteleri bazen önbelleklenmiş eski içerik döndürür; her taramada taze veri iste.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return res.text();
}
