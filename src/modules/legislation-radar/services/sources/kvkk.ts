import * as cheerio from 'cheerio'
import { fetchHtml, ScrapedItem } from '../types'

const BASE_URL = 'https://www.kvkk.gov.tr/Icerik/5419/kurul-kararlari';
const SITE_ORIGIN = 'https://www.kvkk.gov.tr';

// NOT: kvkk.gov.tr'nin tekil karar sayfaları için sabit bir href deseni bu modülün
// yazıldığı sırada canlı DOM üzerinde doğrulanamadı (yalnızca listeleme sayfasının
// kendi URL'i /Icerik/<id>/<slug> biçiminde olduğu biliniyor). Bu yüzden aynı
// desendeki tekil içerik bağlantılarını, gezinme/menü linklerini elemek için
// bir metin uzunluğu eşiğiyle birlikte topluyoruz. Tarama sonuçları legal_feed_runs
// tablosunda 0 öğe / hata olarak görünürse bu dosyanın gerçek sayfa DOM'una göre
// güncellenmesi gerekir.
const ITEM_HREF_PATTERN = /\/Icerik\/\d+\//i;
const NAV_TITLE_MIN_LENGTH = 20;

export async function scrapeKvkk(): Promise<ScrapedItem[]> {
  const html = await fetchHtml(BASE_URL);
  const $ = cheerio.load(html);

  const items: ScrapedItem[] = [];
  const seenUrls = new Set<string>();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!ITEM_HREF_PATTERN.test(href)) return;

    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (title.length < NAV_TITLE_MIN_LENGTH) return; // menü/nav bağlantılarını ele

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, SITE_ORIGIN).toString();
    if (seenUrls.has(absoluteUrl)) return;

    seenUrls.add(absoluteUrl);
    items.push({
      source: 'kvkk',
      category: 'Kurul Kararı',
      title,
      url: absoluteUrl,
      publishedAt: null,
      excerpt: null,
    });
  });

  return items;
}
