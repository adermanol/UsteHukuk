import * as cheerio from 'cheerio'
import { fetchHtml, ScrapedItem } from '../types'

const BASE_URL = 'https://www.resmigazete.gov.tr/'

// Resmi Gazete'de mevzuat/karar/ilan bağlantıları her zaman tarih kodlu dosya adı
// taşır: /eskiler/YYYY/MM/YYYYMMDD-N.(pdf|htm) veya /ilanlar/eskiilanlar/YYYY/MM/...
// Bu desen, CSS class isimlerinden çok daha kararlı olduğu için (site tasarımı
// değişse de dosya adlandırması değişmez) kategori eşlemesi yerine bunu temel alıyoruz.
const ITEM_HREF_PATTERN = /\/(eskiler|ilanlar\/eskiilanlar)\/(\d{4})\/(\d{2})\/(\d{8})-\d+\.(pdf|htm)$/i

function parsePublishedAt(href: string): string | null {
  const match = href.match(/(\d{4})(\d{2})(\d{2})-\d+\.(pdf|htm)$/i);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toISOString();
}

export async function scrapeResmiGazete(): Promise<ScrapedItem[]> {
  const html = await fetchHtml(BASE_URL);
  const $ = cheerio.load(html);

  const items: ScrapedItem[] = [];
  const seenUrls = new Set<string>();
  let currentH2 = '';
  let currentH3 = '';

  $('h2, h3, a').each((_, el) => {
    const tag = (el as any).tagName?.toLowerCase();
    if (tag === 'h2') {
      currentH2 = $(el).text().trim();
      currentH3 = '';
      return;
    }
    if (tag === 'h3') {
      currentH3 = $(el).text().trim();
      return;
    }

    const href = $(el).attr('href') || '';
    if (!ITEM_HREF_PATTERN.test(href)) return;

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).toString();
    if (seenUrls.has(absoluteUrl)) return;

    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (!title) return;

    seenUrls.add(absoluteUrl);
    items.push({
      source: 'resmi_gazete',
      category: currentH3 || currentH2 || null,
      title,
      url: absoluteUrl,
      publishedAt: parsePublishedAt(href),
      excerpt: null,
    });
  });

  return items;
}
