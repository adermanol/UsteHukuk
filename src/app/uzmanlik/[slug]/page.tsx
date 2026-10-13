import { getCmsData } from '@/lib/cms';
import { getServerLocale } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/dictionary';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/public/Footer';
import { MobileNavDrawer } from '@/components/public/MobileNavDrawer';
import { ServiceJsonLd } from '@/components/public/StructuredData';
import { SITE_URL } from '@/lib/site';
import { fetchPublishedPosts } from '@/modules/blog';

// SEO/GEO denetimi (2026-10, bkz. GEO_Research/): 10 uzmanlık alanının
// tamamı ana sayfada açılır bölümler halindeydi; hiçbirinin alıntılanabilir
// ayrı URL'si yoktu. Yapay zekâ yanıt motorları belirli bir soruya ("İzmir'de
// KVKK uyum avukatı") yanıt verirken o konuya ODAKLANAN tek bir sayfayı
// kaynak göstermeyi tercih eder.
//
// İçerik SIFIRDAN YAZILMADI: CMS'teki (app_settings.cms_data) uzmanlık alanı
// başlıkları, açıklamaları ve hizmet maddeleri zaten 7 dilde dolu ve kanun
// numaraları içeriyor. Bu sayfa onları okur — yani CMS'e yeni bir alan
// eklendiğinde sayfası, sitemap kaydı ve yapısal verisi kendiliğinden oluşur.
//
// Tasarım bilinçli olarak /hukuki/[slug] sayfasıyla birebir aynı: sitenin
// mevcut görünümü değiştirilmeden yeni sayfa eklenmesi istendi.

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

async function findArea(slug: string) {
  const data = await getCmsData();
  const area = data.practiceAreas?.find(a => a.id === slug);
  return { data, area };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const { area } = await findArea(slug);
  if (!area) return {};

  const title = pick(area.title, locale);
  const description = pick(area.description, locale);
  const url = `${SITE_URL}/uzmanlik/${slug}`;

  return {
    title: `${title} | Üste Hukuk Bürosu — İzmir`,
    // Açıklama arama sonucunda kırpılmadan görünsün diye 165 karakterle sınırlı.
    description: description.length > 165 ? `${description.slice(0, 162)}...` : description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PracticeAreaPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = getDictionary(locale);
  const { data, area } = await findArea(slug);
  if (!area) notFound();

  const title = pick(area.title, locale);
  const description = pick(area.description, locale);
  const services = (area.services ?? []).map(s => pick(s, locale)).filter(Boolean);
  const faqs = (area.faq ?? [])
    .map(item => ({ question: pick(item.question, locale), answer: pick(item.answer, locale) }))
    .filter(item => item.question && item.answer);

  // Konuyla ilgili blog yazıları: başlık/özet eşleşmesine bakan basit bir
  // ilişkilendirme. Eşleşme bulunamazsa bölüm hiç gösterilmez — sahte
  // "ilgili içerik" üretilmez.
  const allPosts = await fetchPublishedPosts().catch(() => []);
  const areaKeywords = title.toLowerCase().split(/[\s,]+/).filter(w => w.length > 4);
  const relatedPosts = allPosts
    .filter(post => {
      const haystack = `${pick(post.title, locale)} ${pick(post.excerpt, locale)}`.toLowerCase();
      return areaKeywords.some(keyword => haystack.includes(keyword));
    })
    .slice(0, 3);

  const otherAreas = (data.practiceAreas ?? []).filter(a => a.id !== slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-[var(--secondary)] font-sans text-foreground">
      <ServiceJsonLd name={title} description={description} slug={slug} faqs={faqs} locale={locale} />

      {/* Navigation — /hukuki/[slug] ile aynı yapı */}
      <nav className="relative z-10 px-4 py-5 md:px-10 md:py-6 flex items-center justify-between text-xs uppercase tracking-widest font-bold bg-[var(--background)] border-b border-border">
        <Link href="/" className="flex items-center gap-3 md:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- mevcut sayfalarla aynı desen (SVG logo, optimizasyon gerekmez) */}
          <img
            src="/logo-icon.svg"
            alt={`${data.general.logoText} logosu`}
            width={45}
            height={52}
            className="h-9 md:h-13 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
          />
          <span className="font-serif text-xl md:text-2xl normal-case tracking-normal">{data.general.logoText}</span>
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          <Link href="/" className="hover:text-[var(--primary)] transition-colors">{t.nav.home}</Link>
          <Link href="/#practice-areas" className="hover:text-[var(--primary)] transition-colors">{t.nav.practiceAreas}</Link>
          <Link href="/#team" className="hover:text-[var(--primary)] transition-colors">{t.nav.team}</Link>
          <Link href="/#danisma" className="hover:text-[var(--primary)] transition-colors">{t.nav.contact}</Link>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/dashboard" className="hidden sm:block border border-border px-4 py-2.5 md:px-6 md:py-3 hover:bg-white hover:text-black transition-all font-bold">
            {t.dashboardCta} →
          </Link>
          <MobileNavDrawer nav={t.nav} dashboardCta={t.dashboardCta} general={data.general} />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-5 md:px-10 py-12 md:py-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link href="/" className="hover:text-[var(--primary)] transition-colors">{t.nav.home}</Link>
          <span>/</span>
          <Link href="/#practice-areas" className="hover:text-[var(--primary)] transition-colors">{t.nav.practiceAreas}</Link>
          <span>/</span>
          <span className="text-muted-foreground">{title}</span>
        </div>

        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-10 leading-tight">
          {title}
        </h1>

        <div className="w-20 h-1 bg-[var(--primary)] mb-10"></div>

        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12">
          {description}
        </p>

        {services.length > 0 && (
          <section className="mb-14">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">{t.practiceArea.servicesHeading}</h2>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index} className="flex gap-3 text-muted-foreground leading-relaxed">
                  <span className="text-[var(--primary)] shrink-0 mt-1">—</span>
                  <span>{service}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faqs.length > 0 && (
          <section className="mb-14">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">{t.practiceArea.faqHeading}</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="border-l-2 border-[var(--primary)]/40 pl-5">
                  <h3 className="text-foreground font-semibold mb-2 leading-snug">{faq.question}</h3>
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {relatedPosts.length > 0 && (
          <section className="mb-14">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6">{t.practiceArea.relatedHeading}</h2>
            <ul className="space-y-3">
              {relatedPosts.map(post => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="text-muted-foreground hover:text-[var(--primary)] transition-colors">
                    {pick(post.title, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* İletişim çağrısı — ana sayfadaki danışma formuna yönlendirir */}
        <section className="border border-border bg-[var(--background)] p-6 md:p-8">
          <h2 className="font-serif text-2xl text-foreground mb-3">{t.practiceArea.ctaHeading}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t.practiceArea.ctaText}</p>
          <Link
            href="/#danisma"
            className="inline-block bg-[var(--primary)] text-[var(--background)] px-6 py-3 text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"
          >
            {t.practiceArea.ctaButton}
          </Link>
        </section>

        {otherAreas.length > 0 && (
          <section className="mt-14 pt-8 border-t border-border">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-5">{t.practiceArea.otherAreasHeading}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {otherAreas.map(other => (
                <Link
                  key={other.id}
                  href={`/uzmanlik/${other.id}`}
                  className="text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors"
                >
                  {pick(other.title, locale)}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer general={data.general} locale={locale} />
    </div>
  );
}
