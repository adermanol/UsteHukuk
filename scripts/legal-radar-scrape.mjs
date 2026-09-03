#!/usr/bin/env node
// Mevzuat Radarı — harici kaynak toplayıcı (GitHub Actions'ta çalışır)
//
// Neden bu script var: resmi_gazete/mevzuat_gov/rekabet_kurumu Vercel'in
// sunucu IP aralıklarından geldiğinde WAF tarafından engelleniyor (HTTP 418 /
// anında "fetch failed"; User-Agent değişikliğinin etkisi olmadı — tespit IP
// seviyesinde). Bu script aynı taramayı GitHub Actions runner'ından (farklı
// IP aralığı) yapar ve sonucu /api/cron/legal-radar-external route'una POST
// eder. Parse mantığı src/modules/legislation-radar/services/sources/
// {resmiGazete,mevzuatGov,rekabetKurumu}.ts dosyalarının bire bir portudur —
// oradaki seçici/desen değişirse burası da güncellenmeli (ve tersi).
//
// Kullanım (yerel test): RADAR_INGEST_URL=... CRON_SECRET=... node scripts/legal-radar-scrape.mjs

import * as cheerio from 'cheerio';
import https from 'node:https';

const RADAR_INGEST_URL = process.env.RADAR_INGEST_URL;
const CRON_SECRET = process.env.CRON_SECRET;

if (!RADAR_INGEST_URL || !CRON_SECRET) {
  console.error('RADAR_INGEST_URL ve CRON_SECRET env değişkenleri zorunlu.');
  process.exit(1);
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const REQUEST_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};
const REQUEST_TIMEOUT_MS = 15_000;

// resmigazete.gov.tr ve mevzuat.gov.tr, Ubuntu'nun varsayılan CA güven
// deposunda bulunmayan bir kök sertifika (muhtemelen TÜBİTAK Kamu SM)
// kullanıyor — GitHub Actions'ta doğrulandı (radar-ip-test.yml, 2026-09-03):
// normal istek TLS hatasıyla (curl exit 60) başarısız oluyor, -k ile 200
// dönüyor; rekabet.gov.tr sertifika doğrulamalı haliyle de çalışıyor. Bu
// yalnızca herkese açık, oturumsuz mevzuat metinlerini OKUMAK için, ve
// yalnızca bu iki bilinen .gov.tr domaini için sertifika doğrulamasını
// atlıyoruz (node:https ile, ek bağımlılık gerekmeden) — kimlik bilgisi/
// hassas veri göndermiyoruz.
function fetchViaHttps(url, { insecure = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: REQUEST_HEADERS, rejectUnauthorized: !insecure, timeout: REQUEST_TIMEOUT_MS },
      res => {
        if (!res.statusCode || res.statusCode >= 400) {
          res.resume();
          reject(new Error(`${url} -> HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve(body));
      }
    );
    req.on('timeout', () => req.destroy(new Error(`${url} -> zaman aşımı (${REQUEST_TIMEOUT_MS}ms)`)));
    req.on('error', reject);
  });
}

async function fetchHtml(url, { insecure = false } = {}) {
  return fetchViaHttps(url, { insecure });
}

// --- resmi_gazete (port: sources/resmiGazete.ts) ---
const RESMI_GAZETE_BASE = 'https://www.resmigazete.gov.tr/';
const RESMI_GAZETE_HREF_PATTERN =
  /\/(eskiler|ilanlar\/eskiilanlar)\/(\d{4})\/(\d{2})\/(\d{8})-\d+\.(pdf|htm)$/i;

function parseResmiGazetePublishedAt(href) {
  const match = href.match(/(\d{4})(\d{2})(\d{2})-\d+\.(pdf|htm)$/i);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toISOString();
}

async function scrapeResmiGazete() {
  const html = await fetchHtml(RESMI_GAZETE_BASE, { insecure: true });
  const $ = cheerio.load(html);

  const items = [];
  const seenUrls = new Set();
  let currentH2 = '';
  let currentH3 = '';

  $('h2, h3, a').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
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
    if (!RESMI_GAZETE_HREF_PATTERN.test(href)) return;

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, RESMI_GAZETE_BASE).toString();
    if (seenUrls.has(absoluteUrl)) return;

    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (!title) return;

    seenUrls.add(absoluteUrl);
    items.push({
      source: 'resmi_gazete',
      category: currentH3 || currentH2 || null,
      title,
      url: absoluteUrl,
      publishedAt: parseResmiGazetePublishedAt(href),
      excerpt: null,
    });
  });

  return items;
}

// --- mevzuat_gov (port: sources/mevzuatGov.ts) ---
const MEVZUAT_GOV_BASE = 'https://mevzuat.gov.tr/';
const MEVZUAT_GOV_HREF_PATTERN = /mevzuat\?MevzuatNo=\d+/i;

async function scrapeMevzuatGov() {
  const html = await fetchHtml(MEVZUAT_GOV_BASE, { insecure: true });
  const $ = cheerio.load(html);

  const items = [];
  const seenUrls = new Set();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!MEVZUAT_GOV_HREF_PATTERN.test(href)) return;

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, MEVZUAT_GOV_BASE).toString();
    if (seenUrls.has(absoluteUrl)) return;

    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (!title) return;

    seenUrls.add(absoluteUrl);
    items.push({
      source: 'mevzuat_gov',
      category: null,
      title,
      url: absoluteUrl,
      publishedAt: null,
      excerpt: null,
    });
  });

  return items;
}

// --- rekabet_kurumu (port: sources/rekabetKurumu.ts) ---
const REKABET_BASE = 'https://www.rekabet.gov.tr/tr/SonkurulKararlari';
const REKABET_ORIGIN = 'https://www.rekabet.gov.tr';
const REKABET_HREF_PATTERN = /karar/i;
const REKABET_NAV_TITLE_MIN_LENGTH = 20;

async function scrapeRekabetKurumu() {
  const html = await fetchHtml(REKABET_BASE);
  const $ = cheerio.load(html);

  const items = [];
  const seenUrls = new Set();

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!REKABET_HREF_PATTERN.test(href)) return;

    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (title.length < REKABET_NAV_TITLE_MIN_LENGTH) return;

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, REKABET_ORIGIN).toString();
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

const SOURCES = [
  { source: 'resmi_gazete', run: scrapeResmiGazete },
  { source: 'mevzuat_gov', run: scrapeMevzuatGov },
  { source: 'rekabet_kurumu', run: scrapeRekabetKurumu },
];

async function runSource(entry) {
  const startedAt = Date.now();
  try {
    const items = await entry.run();
    console.log(`[${entry.source}] ${items.length} öğe (${Date.now() - startedAt}ms)`);
    return { source: entry.source, status: 'ok', items, durationMs: Date.now() - startedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${entry.source}] HATA: ${message}`);
    return { source: entry.source, status: 'error', items: [], error: message, durationMs: Date.now() - startedAt };
  }
}

async function main() {
  const results = await Promise.all(SOURCES.map(runSource));

  const res = await fetch(RADAR_INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ results }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Ingest başarısız: HTTP ${res.status} ${body}`);
    process.exit(1);
  }

  console.log(`Ingest tamam: ${body}`);
}

main().catch(err => {
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
