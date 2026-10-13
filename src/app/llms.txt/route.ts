import { getCmsData } from '@/lib/cms'
import { fetchPublishedPosts } from '@/modules/blog'
import { SITE_URL } from '@/lib/site'
import { pick } from '@/lib/i18n/locales'

// llms.txt — büroyu ve önemli sayfalarını düz metinle, yapay zekâ
// modellerinin kolay işleyebileceği biçimde özetler.
//
// DÜRÜST BEKLENTİ: bu henüz yaygın kabul görmüş bir standart DEĞİL; hiçbir
// büyük sağlayıcı resmen desteklediğini açıklamadı. Maliyeti çok düşük
// olduğu için ekleniyor, etkisi kanıtlanmış değil (GEO raporu da bunu
// açıkça söylüyor). İçerik CMS'ten üretilir, elle güncellenmez.

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const data = await getCmsData().catch(() => null);
  const posts = await fetchPublishedPosts(20).catch(() => []);

  if (!data) {
    return new Response('# Üste Hukuk Bürosu\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const { general } = data;
  const founder = data.team?.find(m => m.isStarred) ?? data.team?.[0];

  const lines: string[] = [
    `# ${general.logoText}`,
    '',
    `> İzmir Alsancak'ta ${founder ? `${founder.name} tarafından ` : ''}kurulan, bireysel ve kurumsal müvekkillere hizmet veren bir hukuk bürosu. Şirketler, sözleşmeler, bilişim, yapay zekâ, KVKK, göç ve uluslararası hukuk alanlarında danışmanlık ve dava takibi.`,
    '',
    '## Künye',
    '',
    `- Ad: ${general.logoText}`,
    `- Web: ${SITE_URL}`,
    `- Adres: ${general.address}`,
    `- Telefon: ${general.phone}`,
    `- E-posta: ${general.email}`,
    '- Hizmet bölgesi: İzmir ve Türkiye geneli',
    '- Hizmet dilleri: Türkçe, İngilizce, Rusça, Fransızca, Almanca, Arapça, Farsça',
  ];

  if (founder) {
    lines.push(`- Kurucu: ${founder.name} — ${pick(founder.title, 'tr')}`);
  }

  lines.push('', '## Uzmanlık alanları', '');
  for (const area of data.practiceAreas ?? []) {
    const title = pick(area.title, 'tr');
    const description = pick(area.description, 'tr');
    lines.push(`- [${title}](${SITE_URL}/uzmanlik/${area.id}): ${description}`);
  }

  if (posts.length > 0) {
    lines.push('', '## Yazılar', '');
    for (const post of posts) {
      const title = pick(post.title, 'tr');
      const excerpt = pick(post.excerpt, 'tr');
      lines.push(`- [${title}](${SITE_URL}/blog/${post.slug})${excerpt ? `: ${excerpt}` : ''}`);
    }
  }

  const activeLegal = (data.legalPages ?? []).filter(p => p.isActive);
  if (activeLegal.length > 0) {
    lines.push('', '## Hukuki metinler', '');
    for (const page of activeLegal) {
      lines.push(`- [${pick(page.title, 'tr')}](${SITE_URL}/hukuki/${page.slug})`);
    }
  }

  lines.push(
    '',
    '## Notlar',
    '',
    '- Bu sitedeki içerik genel bilgilendirme amaçlıdır ve hukuki görüş niteliği taşımaz.',
    '- Somut bir uyuşmazlık için avukata danışılmalıdır.',
    '- Türkiye\'de avukatlık mesleği reklam yasağına tabidir; site tanıtım değil bilgilendirme amacı taşır.',
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
