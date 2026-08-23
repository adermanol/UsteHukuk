import type { NextConfig } from "next";

// Yüklenen dosyalar (CMS görselleri, danışma formu ekleri) artık Supabase
// Storage'da barınıyor (bkz. src/app/api/upload/route.ts) — next/image bu
// domain'i remotePatterns'te tanımadan optimize/render edemez. Her büronun
// kendi Supabase projesi olduğu için (beyaz etiket modeli) hostname env'den
// türetilir, hardcode edilmez.
//
// Canlıya alma teşhisi (2026-08-21): bu projenin Vercel build ortamında
// `NEXT_PUBLIC_SUPABASE_URL` build-anında güvenilir şekilde görünmüyor
// (bkz. src/core/database/supabase.ts'deki uzun not — aynı platform
// davranışı burada da geçerli, next.config.ts de build-anında çalışır).
// Önek'siz `SUPABASE_URL` önce denenir.
const resolvedSupabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = resolvedSupabaseUrl
  ? new URL(resolvedSupabaseUrl).hostname
  : undefined;

// Güvenlik denetimi (2026-08-11): next.config.ts'de hiç HTTP güvenlik
// başlığı yoktu. CSP hariç diğerleri doğrudan ENFORCE modunda eklendi —
// bunların gerçek kullanılan hiçbir özelliği (harita, görsel yükleme,
// sohbet) kırma riski yok. CSP ise kasıtlı olarak Content-Security-Policy-
// **Report-Only** olarak eklendi: bu ortamda gerçek bir tarayıcıda görsel
// doğrulama yapılamıyor, ilk seferde yanlış bir direktif haritayı/görsel
// yüklemeyi/sohbeti sessizce kırabilir. Report-Only hiçbir şeyi ENGELLEMEZ,
// yalnızca ihlalleri tarayıcı konsoluna yazar — birkaç gün gerçek kullanım
// sonrası konsolda ihlal görülmezse `Content-Security-Policy-Report-Only`
// başlığı `Content-Security-Policy` olarak değiştirilip enforce edilmelidir.
const supabaseOrigin = resolvedSupabaseUrl
  ? new URL(resolvedSupabaseUrl).origin
  : "https://*.supabase.co";

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://i.pravatar.cc https://*.tile.openstreetmap.org ${supabaseOrigin}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin}`,
  `frame-src 'self' https://www.google.com`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // pdf-parse (pdfjs-dist üzerinden) çalışma zamanında dinamik olarak
  // pdf.worker.mjs'i import ediyor; Next.js'in Server Components paketleyicisi
  // bu yolu yeniden yazınca dosya .next çıktısında bulunamıyor ("Setting up
  // fake worker failed"). Bu paketi paketlemeden native require ile
  // kullanmak (legal-codes senkronizasyonu, src/modules/legal-codes/) bu
  // sorunu ortadan kaldırır.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      ...(supabaseHostname
        ? [{ protocol: 'https' as const, hostname: supabaseHostname }]
        : []),
    ],
  },
};

export default nextConfig;
