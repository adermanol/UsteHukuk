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
import { SITE_URL } from "@/lib/site";

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

// SEO/GEO denetimi (2026-10, bkz. GEO_Research/): buradaki açıklama 7 dilin
// hepsinde "Yapay Zeka Destekli Operasyon Sistemi" idi — yönetim panelinin
// şablonundan kalmış bir metin. Arama motorları ve yapay zekâ yanıt motorları
// bir sayfanın NE olduğunu ilk olarak başlık ve açıklamadan anlar; bu metin
// büroyu bir hukuk bürosu değil bir YAZILIM ÜRÜNÜ olarak tanımlıyor ve
// markanın yanlış kategoride anılmasına yol açıyordu. Her dil için o dilde
// yazılmış, büronun ne yaptığını ve nerede olduğunu söyleyen metinlerle
// değiştirildi. Açıklamalar 50-165 karakter aralığında tutulur (arama
// sonucunda kırpılmadan görünen uzunluk).
const METADATA_BY_LOCALE: Record<Locale, { title: string; description: string }> = {
  tr: {
    title: "Üste Hukuk Bürosu | İzmir Alsancak Avukat — Şirketler, Bilişim ve Yapay Zekâ Hukuku",
    description: "İzmir Alsancak'ta Av. Deniz Üste tarafından kurulan hukuk bürosu. Şirketler, sözleşmeler, bilişim, yapay zekâ, KVKK, göç ve uluslararası hukuk alanlarında danışmanlık ve dava takibi.",
  },
  en: {
    title: "Üste Law Office | Attorney in Izmir, Türkiye — Corporate, IT and AI Law",
    description: "Law office founded by Attorney Deniz Üste in Alsancak, Izmir. Legal counsel and litigation in corporate, contract, IT, artificial intelligence, data protection, immigration and international law.",
  },
  ar: {
    title: "مكتب أوستة للمحاماة | محامٍ في إزمير، تركيا — قانون الشركات وتقنية المعلومات والذكاء الاصطناعي",
    description: "مكتب محاماة أسسه المحامي دنيز أوستة في ألسانجاك بإزمير. استشارات قانونية وتمثيل قضائي في قانون الشركات والعقود وتقنية المعلومات والذكاء الاصطناعي وحماية البيانات والهجرة والقانون الدولي.",
  },
  fa: {
    title: "دفتر حقوقی اوسته | وکیل در ازمیر، ترکیه — حقوق شرکت‌ها، فناوری اطلاعات و هوش مصنوعی",
    description: "دفتر حقوقی تأسیس‌شده توسط وکیل دنیز اوسته در السانجاک ازمیر. مشاوره حقوقی و پیگیری دعاوی در حوزه شرکت‌ها، قراردادها، فناوری اطلاعات، هوش مصنوعی، حفاظت از داده‌ها، مهاجرت و حقوق بین‌الملل.",
  },
  ru: {
    title: "Юридическое бюро Üste | Адвокат в Измире, Турция — корпоративное, IT и ИИ право",
    description: "Юридическое бюро, основанное адвокатом Денизом Üste в Алсанджаке, Измир. Консультации и ведение дел в области корпоративного, договорного, IT, ИИ, защиты данных, миграционного и международного права.",
  },
  fr: {
    title: "Cabinet d'avocats Üste | Avocat à Izmir, Turquie — Droit des sociétés, informatique et IA",
    description: "Cabinet fondé par Me Deniz Üste à Alsancak, Izmir. Conseil juridique et contentieux en droit des sociétés, des contrats, informatique, intelligence artificielle, protection des données, immigration et droit international.",
  },
  de: {
    title: "Kanzlei Üste | Rechtsanwalt in Izmir, Türkei — Gesellschafts-, IT- und KI-Recht",
    description: "Von Rechtsanwalt Deniz Üste in Alsancak, Izmir gegründete Kanzlei. Rechtsberatung und Prozessführung in Gesellschafts-, Vertrags-, IT-, KI-, Datenschutz-, Migrations- und internationalem Recht.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const { title, description } = METADATA_BY_LOCALE[locale];

  return {
    // metadataBase: göreli og:image/canonical yollarının mutlak URL'ye
    // çevrilmesi için gerekli; yoksa Next.js build sırasında uyarı verir ve
    // paylaşım kartı görseli çözümlenemez.
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: 'Üste Hukuk Bürosu',
      title,
      description,
      url: '/',
      locale,
    },
    twitter: { card: 'summary_large_image', title, description },
    // Panel, müvekkil portalı ve kurulum akışları robots.ts ile de
    // engellenir; burada ek bir güvenlik katmanı olarak genel site için
    // indekslemeye açık olduğumuz açıkça belirtilir.
    robots: { index: true, follow: true },
    // Google Search Console site sahipliği doğrulaması. Sayfaya görünür
    // hiçbir şey eklemez; yalnızca <head> içine bir meta etiketi koyar.
    // Google doğrulamayı sürdürmek için bu etiketin kalıcı olmasını ister —
    // doğrulama tamamlandıktan sonra da SİLİNMEMELİDİR.
    // Not: Search Console iki biçim verir. DNS TXT kaydı biçimi
    // "google-site-verification=<token>" şeklindedir; meta etiketinde ise
    // yalnızca <token> yazılır. Next.js bu değeri olduğu gibi content'e
    // koyduğu için önek BURADA bulunmamalıdır.
    verification: {
      google: '11OnBJo3IdCJpJIKz2QuGKX2zI-HpWUculMAX_k5u9o',
    },
  };
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
