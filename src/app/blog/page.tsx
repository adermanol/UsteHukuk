import Image from 'next/image';
import Link from 'next/link';
import { getCmsData } from '@/lib/cms';
import { fetchPublishedPosts } from '@/modules/blog';
import { getServerLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/dictionary';
import { pick } from '@/lib/i18n/locales';
import { Footer } from '@/components/public/Footer';
import { MobileNavDrawer } from '@/components/public/MobileNavDrawer';

export default async function BlogIndexPage() {
  const data = await getCmsData();
  const locale = await getServerLocale();
  const t = getDictionary(locale);
  const posts = await fetchPublishedPosts();

  return (
    <div className="min-h-screen bg-[var(--secondary)] font-sans text-foreground">
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

      <div className="max-w-6xl mx-auto px-5 md:px-10 py-12 md:py-20">
        <div className="text-center mb-16">
          <h3 className="text-[var(--primary)] uppercase tracking-[0.2em] text-xs font-bold mb-4">{t.blog.eyebrow}</h3>
          <h1 className="font-serif text-3xl md:text-5xl text-foreground">{t.blog.heading}</h1>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground">{t.blog.empty}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-[var(--background)] hover:border-[var(--primary)]/30 transition-colors"
              >
                <div className="relative h-48 w-full bg-muted overflow-hidden">
                  {post.cover_image_url ? (
                    <Image
                      src={post.cover_image_url}
                      alt={pick(post.title, locale)}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/15 to-transparent" />
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  {post.published_at && (
                    <span className="text-xs text-muted-foreground mb-2">
                      {new Date(post.published_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale)}
                    </span>
                  )}
                  <h2 className="font-serif text-xl text-foreground mb-2 leading-snug">{pick(post.title, locale)}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">{pick(post.excerpt, locale)}</p>
                  <span className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--primary)] group-hover:text-foreground transition-colors">
                    {t.blog.readMore} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer general={data.general} locale={locale} />
    </div>
  );
}
