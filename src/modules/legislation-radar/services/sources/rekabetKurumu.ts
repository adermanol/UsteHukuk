import * as cheerio from 'cheerio'
import { fetchHtml, ScrapedItem } from '../types'

const BASE_URL = 'https://www.rekabet.gov.tr/tr/SonkurulKararlari';
const SITE_ORIGIN = 'https://www.rekabet.gov.tr';

// NOT: rekabet.gov.tr'nin tekil karar sayfaları için sabit href deseni bu modülün
// yazıldığı sırada canlı DOM üzerinde doğrulanamadı. "Karar" geçen path'leri ve
// yeterince uzun link metinlerini toplayan genel bir sezgisel yaklaşım kullanılıyor.
// Tarama sonuçları legal_feed_runs tablosunda 0 öğe / hata olarak görünürse bu
// dosyanın gerçek sayfa DOM'una göre güncellenmesi gerekir.
const ITEM_HREF_PATTERN = /karar/i;
const NAV_TITLE_MIN_LENGTH = 20;

export async function scrapeRekabetKurumu(): Promise<ScrapedItem[]> {
  const html = await fetchHtml(BASE_URL);
  const $ = cheerio.load(html);

  const items: ScrapedItem[] = [];
  const seenUrls = new Set<string>();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!ITEM_HREF_PATTERN.test(href)) return;

    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (title.length < NAV_TITLE_MIN_LENGTH) return;

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, SITE_ORIGIN).toString();
    if (seenUrls.has(absoluteUrl)) return;

    seenUrls.add(absoluteUrl);
    items.push({
      source: 'rekabet_kurumu',
      category: 'Kurul Kararı',
      title,
      url: absoluteUrl,
      publishedAt: null,
      excerpt: null,
    });
  });

  return items;
}
