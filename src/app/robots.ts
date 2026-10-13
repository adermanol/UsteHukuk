import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// SEO/GEO denetimi (2026-10, bkz. GEO_Research/): /robots.txt 404 dönüyordu.
// Dosyanın yokluğu botları ENGELLEMEZ, ama iki şeyi kaçırırız: (1) sitemap'in
// adresini botlara duyurmak, (2) indekslenmemesi gereken yolları kapatmak.
//
// Next.js bu dosyayı otomatik olarak /robots.txt adresinde yayınlar.
export const dynamic = 'force-static';

// Raporun önerdiği liste yalnızca /dashboard'ı kapatıyordu. Buraya
// eklenenler bilinçli: /portal/durum/<token> MÜVEKKİL dosya durumunu
// gösteriyor (girişsiz, token'lı) — arama sonuçlarında görünmesi kabul
// edilemez. /master platform paneli, /ilk-kurulum ve /davet ise kurulum/
// davet akışları; indekslenmelerinin hiçbir faydası yok.
const DISALLOWED = ['/dashboard', '/master', '/portal', '/ilk-kurulum', '/davet', '/login', '/api/', '/business-card'];

// Yapay zekâ yanıt motorlarının tarayıcıları. Ayrıca açıkça izin verilmesinin
// nedeni: bazıları (Google-Extended gibi) genel `User-agent: *` kuralından
// bağımsız değerlendirilir ve varsayılan davranışları sağlayıcıya göre
// değişebilir. Büro bu içeriğin yapay zekâ yanıtlarında kaynak gösterilmesini
// İSTEDİĞİ için hepsine açık erişim verilir.
const AI_CRAWLERS = [
  'GPTBot',            // OpenAI - model eğitimi/tarama
  'OAI-SearchBot',     // OpenAI - ChatGPT arama sonuçları
  'ChatGPT-User',      // OpenAI - kullanıcı isteğiyle anlık erişim
  'ClaudeBot',         // Anthropic
  'Claude-Web',        // Anthropic
  'PerplexityBot',     // Perplexity
  'Google-Extended',   // Google - Gemini / AI Overviews
  'Applebot-Extended', // Apple Intelligence
  'CCBot',             // Common Crawl (birçok modelin veri kaynağı)
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOWED },
      ...AI_CRAWLERS.map(userAgent => ({ userAgent, allow: '/', disallow: DISALLOWED })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
