import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Playfair_Display, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { getServerLocale } from "@/lib/i18n/server";
import { getDirection, Locale } from "@/lib/i18n/locales";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { CookieBanner } from "@/components/public/CookieBanner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getThemeSetting } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// latin-ext: Fransızca/Almanca aksan ve özel karakterler (é, ü, ß, ç, vb.) için.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

// Arapça ve Farsça (Fars alfabesi Arap yazısını temel alır) için ortak yazı tipi.
const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
});

const METADATA_BY_LOCALE: Record<Locale, { title: string; description: string }> = {
  tr: { title: "Üste Hukuk Bürosu", description: "Yapay Zeka Destekli Operasyon Sistemi" },
  en: { title: "Üste Hukuk Bürosu", description: "AI-Powered Operations System" },
  ar: { title: "Üste Hukuk Bürosu", description: "نظام تشغيل مدعوم بالذكاء الاصطناعي" },
  fa: { title: "Üste Hukuk Bürosu", description: "سیستم عملیاتی مبتنی بر هوش مصنوعی" },
  ru: { title: "Üste Hukuk Bürosu", description: "Операционная система на базе ИИ" },
  fr: { title: "Üste Hukuk Bürosu", description: "Système d'Exploitation Alimenté par l'IA" },
  de: { title: "Üste Hukuk Bürosu", description: "KI-gestütztes Betriebssystem" },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return METADATA_BY_LOCALE[locale];
}

// Canlıya alma teşhisi (2026-08-21): bu ortamda `NEXT_PUBLIC_` önekli
// değişkenler tarayıcı paketine build-anında güvenilir şekilde
// gömülmüyor (bkz. supabase.ts'deki uzun not) — ama sunucu tarafında
// (bu dosya bir Server Component) önek'siz `SUPABASE_URL`/`SUPABASE_ANON_KEY`
// güvenilir şekilde okunabiliyor. O halde çözülmüş değeri, tarayıcı
// paketi hiç yüklenmeden ÖNCE çalışan bir satır içi <script> ile
// `window.__SUPABASE_ENV__`'e yazıp `supabase.ts`'nin oradan okumasını
// sağlıyoruz — build-anındaki gömme mekanizmasına bağımlı kalmadan.
// Anon anahtar bir sır DEĞİLDİR (RLS ile korunur), tarayıcıya açıkça
// gönderilmesi amaçlanmıştır.
function resolvePublicSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const defaultTheme = await getThemeSetting();
  const supabaseEnv = resolvePublicSupabaseEnv();

  return (
    <html lang={locale} dir={getDirection(locale)} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${notoSansArabic.variable} antialiased`}>
        {/* `beforeInteractive`: Next.js'in KENDİ garantisiyle bu, sayfadaki
            başka HERHANGİ bir script'ten (async chunk'lar dahil) önce
            çalışır — normal bir <head><script> ekleme denemesi bunu
            garanti ETMEZ (Next.js kendi framework script'lerini kafanın
            başına, bizim eklediğimiz özel <head> içeriğinden önce
            enjekte ediyor; ilk denemede tam olarak bu yüzden bir yarış
            durumu oluşup window.__SUPABASE_ENV__ çok geç set ediliyordu). */}
        <Script
          id="__supabase_env__"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_ENV__=${JSON.stringify(supabaseEnv).replace(/</g, '\\u003c')};`,
          }}
        />
        <ThemeProvider defaultTheme={defaultTheme}>
          <LocaleProvider initialLocale={locale}>
            {children}
            <CookieBanner />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
