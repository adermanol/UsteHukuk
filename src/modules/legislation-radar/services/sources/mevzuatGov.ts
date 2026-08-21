import * as cheerio from 'cheerio'
import { fetchHtml, ScrapedItem } from '../types'

const BASE_URL = 'https://mevzuat.gov.tr/'

// Tekil mevzuat sayfalarının href deseni doğrulandı: mevzuat?MevzuatNo=...&MevzuatTur=...&MevzuatTertip=...
const ITEM_HREF_PATTERN = /mevzuat\?MevzuatNo=\d+/i;

export async function scrapeMevzuatGov(): Promise<ScrapedItem[]> {
  const html = await fetchHtml(BASE_URL);
  const $ = cheerio.load(html);

  const items: ScrapedItem[] = [];
  const seenUrls = new Set<string>();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!ITEM_HREF_PATTERN.test(href)) return;

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).toString();
    if (seenUrls.has(absoluteUrl)) return;

    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (!title) return;

    seenUrls.add(absoluteUrl);
    items.push({
      source: 'mevzuat_gov',
      category: null,
      title,
      url: absoluteUrl,
      publishedAt: null, // Anasayfa "bugün güncellenenler" listesi tarih göstermiyor; ilk görülme zamanı esas alınır.
      excerpt: null,
    });
  });

  return items;
}
