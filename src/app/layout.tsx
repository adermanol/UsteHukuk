import type { Metadata } from "next";
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
  tr: { title: "LawLM - Hukuk Bürosu YZ", description: "Yapay Zeka Destekli Operasyon Sistemi" },
  en: { title: "LawLM - Law Firm AI", description: "AI-Powered Operations System" },
  ar: { title: "LawLM - نظام الذكاء الاصطناعي لمكتب المحاماة", description: "نظام تشغيل مدعوم بالذكاء الاصطناعي" },
  fa: { title: "LawLM - سیستم هوش مصنوعی دفتر حقوقی", description: "سیستم عملیاتی مبتنی بر هوش مصنوعی" },
  ru: { title: "LawLM - ИИ для юридической фирмы", description: "Операционная система на базе ИИ" },
  fr: { title: "LawLM - IA pour Cabinet d'Avocats", description: "Système d'Exploitation Alimenté par l'IA" },
  de: { title: "LawLM - KI für Anwaltskanzleien", description: "KI-gestütztes Betriebssystem" },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return METADATA_BY_LOCALE[locale];
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const defaultTheme = await getThemeSetting();

  return (
    <html lang={locale} dir={getDirection(locale)} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${notoSansArabic.variable} antialiased`}>
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
