import type { CmsData } from '@/lib/cms'
import { SITE_URL, abs } from '@/lib/site'
import { Locale, LOCALES, pick } from '@/lib/i18n/locales'

// SEO/GEO denetimi (2026-10, bkz. GEO_Research/): sitede hiç yapısal veri
// (JSON-LD) yoktu. Yapay zekâ yanıt motorları ve arama motorları bir varlığın
// KİM olduğunu, nerede olduğunu ve ne yaptığını en güvenilir biçimde buradan
// okur — serbest metinden çıkarım yapmak zorunda kalmazlar.
//
// Tüm değerler CMS'ten (app_settings.cms_data) okunur, bu dosyaya elle
// yazılmaz: büro panelden telefonu/adresi değiştirdiğinde yapısal veri de
// kendiliğinden güncellenir, iki yerde birbirinden sapan bilgi oluşmaz.

/** JSON-LD'yi script etiketine gömerken XSS'e kapalı hale getirir.
 * `</script>` dizisi JSON içinde geçerli bir değer olabilir ve etiketi erken
 * kapatarak keyfi HTML enjekte edilmesine yol açabilirdi (CMS içeriği
 * yöneticiden gelir ama yine de kullanıcı girdisidir). */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}

/** CMS'teki serbest adres metninden ("Akdeniz Cad., 1347 Sok., …, Alsancak/İzmir")
 * sokak kısmını ayırır. Son parça ilçe/şehir olarak kabul edilir; beklenen
 * biçimde değilse adres tek parça olarak verilir — uydurma bir ayrıştırma
 * yapılmaz. */
function splitAddress(address: string): { streetAddress: string; addressLocality: string } {
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  if (parts.length > 1 && /\//.test(last)) {
    return { streetAddress: parts.slice(0, -1).join(', '), addressLocality: last };
  }
  return { streetAddress: address, addressLocality: 'İzmir' };
}

/** Yalnızca gerçekten dolu ve etkin sosyal profiller. Boş ya da "#" değerler
 * schema'ya YAZILMAZ — var olmayan profili bildirmek kimlik sinyalini
 * güçlendirmez, bozar. */
function socialLinks(general: CmsData['general']): string[] {
  const socials = general.socials ?? ({} as CmsData['general']['socials']);
  return Object.values(socials)
    .filter((s): s is { url: string; enabled: boolean } => Boolean(s?.enabled && s.url))
    .map(s => s.url.trim())
    .filter(url => url && url !== '#' && /^https?:\/\//i.test(url));
}

/**
 * Ana sayfa: büro (LegalService) + kurucu avukat (Person).
 * `@id` değerleri sabittir; diğer sayfalardaki yapısal veriler bu kimliklere
 * referans vererek aynı varlığı tarif eder (parçalı değil, tek bir büro).
 */
export function OrganizationJsonLd({ data, locale }: { data: CmsData; locale: Locale }) {
  const { general, team } = data;
  const { streetAddress, addressLocality } = splitAddress(general.address);
  const sameAs = socialLinks(general);

  // Ekipteki ilk "yıldızlı" üye kurucu kabul edilir; yoksa ilk üye.
  const founder = team?.find(m => m.isStarred) ?? team?.[0];

  const organization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    '@id': `${SITE_URL}/#organization`,
    name: general.logoText,
    url: SITE_URL,
    logo: abs('/logo-icon.svg'),
    image: abs('/lady-justice.png'),
    description: pick(general.footerTagline, locale),
    telephone: general.phone,
    email: general.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality,
      addressRegion: 'İzmir',
      addressCountry: 'TR',
    },
    areaServed: [
      { '@type': 'City', name: 'İzmir' },
      { '@type': 'Country', name: 'Türkiye' },
    ],
    knowsLanguage: LOCALES,
    // Büronun hizmet verdiği hukuk alanları — CMS'teki uzmanlık alanlarından
    // türetilir, böylece yeni alan eklendiğinde burada da görünür.
    knowsAbout: (data.practiceAreas ?? []).map(area => pick(area.title, locale)).filter(Boolean),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: pick({ tr: 'Hukuki Hizmetler' } as never, locale) || 'Hukuki Hizmetler',
      itemListElement: (data.practiceAreas ?? []).map(area => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: pick(area.title, locale),
          url: abs(`/uzmanlik/${area.id}`),
        },
      })),
    },
  };

  if (sameAs.length > 0) organization.sameAs = sameAs;

  if (founder) {
    organization.founder = {
      '@type': 'Person',
      '@id': `${SITE_URL}/#founder`,
      name: founder.name,
      jobTitle: pick(founder.title, locale),
      worksFor: { '@id': `${SITE_URL}/#organization` },
    };
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: general.logoText,
    inLanguage: locale,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={website} />
    </>
  );
}

/** Blog yazısı: Article + yazar + yayın/güncelleme tarihi. */
export function ArticleJsonLd({
  title, description, slug, publishedAt, updatedAt, imageUrl, authorName, locale,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string | null;
  updatedAt: string | null;
  imageUrl: string | null;
  authorName: string;
  locale: Locale;
}) {
  const url = abs(`/blog/${slug}`);
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        inLanguage: locale,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        url,
        datePublished: publishedAt ?? undefined,
        dateModified: updatedAt ?? publishedAt ?? undefined,
        image: imageUrl ? [imageUrl] : undefined,
        author: { '@type': 'Person', name: authorName },
        publisher: { '@id': `${SITE_URL}/#organization` },
      }}
    />
  );
}

/** Uzmanlık alanı sayfası: Service + o alanın SSS'i (FAQPage). */
export function ServiceJsonLd({
  name, description, slug, faqs, locale,
}: {
  name: string;
  description: string;
  slug: string;
  faqs: { question: string; answer: string }[];
  locale: Locale;
}) {
  const url = abs(`/uzmanlik/${slug}`);
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    inLanguage: locale,
    serviceType: name,
    url,
    provider: { '@id': `${SITE_URL}/#organization` },
    areaServed: [
      { '@type': 'City', name: 'İzmir' },
      { '@type': 'Country', name: 'Türkiye' },
    ],
  };

  const faqPage = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  } : null;

  return (
    <>
      <JsonLd data={service} />
      {faqPage && <JsonLd data={faqPage} />}
    </>
  );
}
