import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { getCmsData } from '@/lib/cms'
import { fetchPublishedPosts } from '@/modules/blog'

// SEO/GEO denetimi (2026-10, bkz. GEO_Research/): /sitemap.xml 404 dönüyordu.
// Sitemap'in yokluğu sayfaları indekslenemez yapmaz ama keşiflerini
// yavaşlatır — özellikle ana sayfadan bağlantısı zayıf olan blog yazıları ve
// hukuki metin sayfaları için.
//
// Liste ELLE YAZILMAZ: blog yazıları veritabanından, hukuki metinler ve
// uzmanlık alanları CMS'ten okunur. Yeni bir yazı yayınlandığında veya CMS'e
// yeni bir uzmanlık alanı eklendiğinde sitemap kendiliğinden günceldir.
//
// `force-dynamic`: içerik veritabanından geldiği için build anında
// dondurulmamalı (bu projede daha önce build-anında donan sayfalar nedeniyle
// yaşanan sorunlar için bkz. DEPLOYMENT.md).
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Veri kaynaklarının herhangi biri hata verirse sitemap TAMAMEN
  // kaybolmamalı — elde ne varsa onunla yayınlanır.
  const [posts, cms] = await Promise.all([
    fetchPublishedPosts().catch(() => []),
    getCmsData().catch(() => null),
  ]);

  const blogEntries: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at ?? post.published_at ?? now),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const practiceEntries: MetadataRoute.Sitemap = (cms?.practiceAreas ?? []).map(area => ({
    url: `${SITE_URL}/uzmanlik/${area.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  const legalEntries: MetadataRoute.Sitemap = (cms?.legalPages ?? [])
    .filter(page => page.isActive)
    .map(page => ({
      url: `${SITE_URL}/hukuki/${page.slug}`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    }));

  return [...staticEntries, ...practiceEntries, ...blogEntries, ...legalEntries];
}
