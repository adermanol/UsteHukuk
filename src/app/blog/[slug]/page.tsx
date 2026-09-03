import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCmsData } from '@/lib/cms';
import { fetchPublishedPostBySlug } from '@/modules/blog';
import { getServerLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/dictionary';
import { pick } from '@/lib/i18n/locales';
import { Footer } from '@/components/public/Footer';
import { MobileNavDrawer } from '@/components/public/MobileNavDrawer';
import { PlainTextArticle } from '@/components/public/PlainTextArticle';

const SITE_URL = 'https://ustehukuk.com';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// SEO denetimi (2026-09): kök layout dışında hiçbir sayfa kendi <title>/
// meta description'ını üretmiyordu — tüm blog yazıları (ve site genelinde
// her sayfa) aynı jenerik site başlığını paylaşıyordu, arama motorları
// için ayırt edici bir sinyal yoktu. Blog yazıları için bunu düzeltir:
// yazıya özel başlık/açıklama, canonical URL, Open Graph ve Twitter Card.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const post = await fetchPublishedPostBySlug(slug);
  if (!post) return {};

  const title = pick(post.title, locale);
  const description = pick(post.excerpt, locale);
  const url = `${SITE_URL}/blog/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getCmsData();
  const locale = await getServerLocale();
  const t = getDictionary(locale);

  const post = await fetchPublishedPostBySlug(slug);
  if (!post) notFound();

  const title = pick(post.title, locale);
  const content = pick(post.content, locale);
  const excerpt = pick(post.excerpt, locale);

  // Arama motorları için Article yapılandırılmış verisi (JSON-LD) —
  // zengin snippet (yazar, yayın tarihi vb.) olasılığını artırır.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: data.general.logoText },
    publisher: { '@type': 'Organization', name: data.general.logoText },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${slug}` },
  };

  return (
    <div className="min-h-screen bg-[var(--secondary)] font-sans text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="relative z-10 px-4 py-5 md:px-10 md:py-6 flex items-center justify-between text-xs uppercase tracking-widest font-bold bg-[var(--background)] border-b border-border">
        <Link href="/" className="flex items-center gap-3 md:gap-4">
          <img
            src="/logo-icon.svg"
            alt=""
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link href="/" className="hover:text-[var(--primary)] transition-colors">{t.nav.home}</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[var(--primary)] transition-colors">{t.blog.heading}</Link>
          <span>/</span>
          <span className="text-muted-foreground">{title}</span>
        </div>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={title} className="w-full h-64 md:h-96 object-cover rounded-2xl mb-10" />
        )}

        {post.published_at && (
          <span className="text-xs text-muted-foreground">
            {new Date(post.published_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale)}
          </span>
        )}

        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mt-3 mb-10 leading-tight">
          {title}
        </h1>

        <div className="w-20 h-1 bg-[var(--primary)] mb-10"></div>

        <PlainTextArticle content={content} />

        <div className="mt-16 pt-8 border-t border-border">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            {t.blog.viewAll}
          </Link>
        </div>
      </div>

      <Footer general={data.general} locale={locale} />
    </div>
  );
}
