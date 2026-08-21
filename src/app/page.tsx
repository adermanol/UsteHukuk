import Image from 'next/image';
import Link from 'next/link';
import { getCmsData } from '@/lib/cms';
import { PracticeAreasTabs } from '@/components/public/PracticeAreasTabs';
import { TeamSection } from '@/components/public/TeamSection';
import { WhatsAppWidget } from '@/components/public/WhatsAppWidget';
import { Footer } from '@/components/public/Footer';
import { ConsultationRequestForm } from '@/components/public/ConsultationRequestForm';
import { MobileNavDrawer } from '@/components/public/MobileNavDrawer';
import { ParticleTextHover } from '@/components/ui/ParticleTextHover';
import { getServerLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/dictionary';
import { pick } from '@/lib/i18n/locales';
import { LocaleToggle } from '@/lib/i18n/LocaleToggle';
import { fetchPublishedPosts, BlogSection } from '@/modules/blog';

export default async function PublicLandingPage() {
  const data = await getCmsData();
  const locale = await getServerLocale();
  const t = getDictionary(locale);
  const recentPosts = await fetchPublishedPosts(3);

  const heroTitle = pick(data.hero.title, locale);
  const heroSubtitle = pick(data.hero.subtitle, locale);
  const whyTitle = pick(data.whyChooseUs.title, locale);
  const whySubtitle = pick(data.whyChooseUs.subtitle, locale);
  const whyParagraph1 = pick(data.whyChooseUs.paragraph1, locale);
  const whyParagraph2 = pick(data.whyChooseUs.paragraph2, locale);

  const consultationTitle = pick(data.consultation.title, locale);
  const consultationIntro = pick(data.consultation.intro, locale);
  const consultationSecurityNote = pick(data.consultation.securityNote, locale);

  // Online danışmanlık bilgilendirme sayfasını CMS'den çek
  const bilgilendirmePage = data.legalPages.find(p => p.slug === 'online-danismanlik-bilgilendirme' && p.isActive);

  return (
    <div className="min-h-screen bg-[var(--secondary)] font-sans text-foreground overflow-x-hidden">

      {/* Top Bar — adres/telefon/e-posta dar ekranda taşmaması için lg altında gizlenir;
          bu bilgiler MobileNavDrawer içinde ve Footer'da zaten mevcut. */}
      <div className="hidden lg:flex bg-[var(--background)] text-muted-foreground text-xs py-3 px-8 justify-between items-center border-b border-border">
        <div className="flex gap-8">
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {t.topbar.address} {data.general.address}
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            {t.topbar.phone} {data.general.phone}
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            {t.topbar.email} {data.general.email}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <LocaleToggle />
          {data.general.socials?.facebook?.enabled && (
            <Link href={data.general.socials.facebook.url} className="hover:text-[var(--primary)] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </Link>
          )}
          {data.general.socials?.twitter?.enabled && (
            <Link href={data.general.socials.twitter.url} className="hover:text-[var(--primary)] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </Link>
          )}
          {data.general.socials?.linkedin?.enabled && (
            <Link href={data.general.socials.linkedin.url} className="hover:text-[var(--primary)] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </Link>
          )}
          {data.general.socials?.instagram?.enabled && (
            <Link href={data.general.socials.instagram.url} className="hover:text-[var(--primary)] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </Link>
          )}
        </div>
      </div>

      {/* Main Hero Section */}
      <div className="relative h-[85vh] min-h-[560px] sm:min-h-[640px] md:min-h-[700px] w-full bg-black text-white">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-70">
          <Image
            src="/lady-justice.png"
            alt="Lady Justice"
            fill
            className="object-cover object-[70%_30%]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 px-4 py-5 md:px-10 md:py-8 flex items-center justify-between text-xs uppercase tracking-widest font-bold text-white">
          <div className="flex items-center gap-3 md:gap-4">
            <img
              src="/logo-icon.svg"
              alt=""
              width={55}
              height={64}
              className="h-11 md:h-16 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
            />
            <span className="font-serif text-xl md:text-4xl normal-case tracking-normal">{data.general.logoText}</span>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            <Link href="#" className="text-[var(--primary)] border-b-2 border-[var(--primary)] pb-1">{t.nav.home}</Link>
            <Link href="#practice-areas" className="hover:text-[var(--primary)] transition-colors">{t.nav.practiceAreas}</Link>
            <Link href="#team" className="hover:text-[var(--primary)] transition-colors">{t.nav.team}</Link>
            <Link href="#danisma" className="hover:text-[var(--primary)] transition-colors">{t.nav.contact}</Link>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/dashboard" className="hidden sm:block border border-white/30 px-4 py-2.5 md:px-8 md:py-4 hover:bg-white hover:text-black transition-all font-bold">
              {t.dashboardCta} →
            </Link>
            <MobileNavDrawer nav={t.nav} dashboardCta={t.dashboardCta} general={data.general} />
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto h-[calc(100%-120px)] flex flex-col justify-center px-5 sm:px-8 md:px-10">
          <div className="flex items-center gap-4 text-[var(--primary)] uppercase tracking-[0.3em] text-sm font-bold mb-6">
            <span className="w-12 h-px bg-[var(--primary)]"></span>
            <ParticleTextHover
              colorHex="var(--primary)"
              text={heroSubtitle.toUpperCase()}
              font="bold 14px system-ui, sans-serif"
            >
              {heroSubtitle}
            </ParticleTextHover>
          </div>

          <ParticleTextHover
            colorHex="#ffffff"
            text={heroTitle}
            font="500 88px 'Playfair Display', serif"
          >
            <h1 className="font-serif text-4xl sm:text-5xl md:text-[5.5rem] leading-[1.15] md:leading-[1.1] mb-8 md:mb-16 max-w-3xl drop-shadow-xl font-medium">
              {heroTitle}
            </h1>
          </ParticleTextHover>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-[#303336] text-white py-16 px-5 md:py-24 md:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 items-center">
          <div>
            <h3 className="text-[var(--primary)] uppercase tracking-[0.2em] text-xs font-bold mb-4">{whyTitle}</h3>
            <h2 className="font-serif text-4xl md:text-5xl leading-tight">
              {whySubtitle}
            </h2>
          </div>
          <div className="text-white/60 text-sm leading-[1.8] flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="flex-1">
              <p>
                <span className="float-left rtl:float-none text-6xl font-serif text-white mr-4 rtl:mr-0 mt-1 leading-none">{whyParagraph1.charAt(0)}</span>
                {whyParagraph1.substring(1)}
              </p>
            </div>
            <div className="flex-1 pt-2">
              <p>
                {whyParagraph2}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="practice-areas">
        <PracticeAreasTabs areas={data.practiceAreas} />
      </div>

      <div id="team">
        <TeamSection team={data.team} />
      </div>

      <div id="blog">
        <BlogSection posts={recentPosts} />
      </div>

      {/* Online Consultation Section */}
      <div id="danisma" className="bg-[#303336] text-white py-16 px-5 md:py-24 md:px-10 scroll-mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">{consultationTitle}</h2>
            <p className="text-white/60 max-w-2xl mx-auto leading-relaxed">{consultationIntro}</p>
          </div>

          {data.consultation.steps.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {data.consultation.steps.map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] font-serif text-xl">
                    {i + 1}
                  </div>
                  <h3 className="font-serif text-xl text-white mb-2">{pick(step.title, locale)}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{pick(step.description, locale)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            <ConsultationRequestForm />
          </div>

          {consultationSecurityNote && (
            <p className="max-w-2xl mx-auto text-center text-xs text-white/60 mt-8 leading-relaxed">
              {consultationSecurityNote}
            </p>
          )}

          {/* Online Danışmanlık Bilgilendirme & Ödeme */}
          <div className="max-w-2xl mx-auto mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {bilgilendirmePage && (
              <Link
                href="/hukuki/online-danismanlik-bilgilendirme"
                className="text-sm text-white/60 hover:text-[var(--primary)] transition-colors underline underline-offset-4 decoration-gray-600 hover:decoration-[var(--primary)]"
              >
                {locale === 'tr' ? 'Online Danışmanlık Hakkında Bilgilendirme' : 'About Online Consultation'}
              </Link>
            )}
            {data.general.paymentUrl && (
              <a
                href={data.general.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/80 text-black font-bold px-8 py-3.5 rounded-lg hover:shadow-lg hover:shadow-[var(--primary)]/20 transition-all text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                {locale === 'tr' ? 'Online Ödeme Yap' : 'Make Online Payment'}
              </a>
            )}
          </div>
        </div>
      </div>

      <WhatsAppWidget phoneNumber={data.general.whatsapp} />

      <Footer general={data.general} locale={locale} />
    </div>
  );
}
