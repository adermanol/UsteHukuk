import { supabaseAdmin } from '@/core/database/supabase-admin'
import { LegalCodeRegistryEntry, buildSourceUrl } from '../registry'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UsteHukuk-KanunSenkron/1.0 (+https://ustehukuk.com; hukuk burosu ic kullanim araci)';

interface ParsedArticle {
  articleNo: string;
  heading: string | null;
  content: string;
}

// mevzuat.gov.tr PDF'lerinde madde başlangıcı: "MADDE 299-" veya "GEÇİCİ MADDE 3-"
// (tire yerine bazen kısa çizgi/nokta da geçebiliyor). Kanuna göre büyük/küçük
// harf farklı olabiliyor (ör. TBK "MADDE 1-", TMK "Madde 1 -") — Türkçe İ/ı
// büyük-küçük harf kuralları JS'in /i bayrağıyla güvenilir çalışmadığı için
// varyantlar açıkça listelendi (15 kanunun tamamı üzerinde canlı test edildi).
// Harf ekli madde numaraları (ör. "6/A") da desteklenir.
const ARTICLE_START_RE = /(?:^|\n)[ \t]*(GEÇİCİ MADDE|Geçici Madde|MADDE|Madde)[ \t]+(\d+(?:\/[A-ZÇĞİÖŞÜa-z])?)[ \t]*[-–.]/g;
const PAGE_BREAK_RE = /^--\s*\d+\s*of\s*\d+\s*--$/gm;
const GAZETTE_DATE_RE = /Resmî Gazete[\s\S]{0,40}?Tarih\s*:\s*([\d./]+)/;

function parseArticles(rawText: string): ParsedArticle[] {
  const text = rawText.replace(PAGE_BREAK_RE, '');
  const matches = [...text.matchAll(ARTICLE_START_RE)];
  if (matches.length === 0) return [];

  // Ham gövdeler: her eşleşmenin bitişinden bir sonrakinin başlangıcına kadar.
  const rawSpans = matches.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    return text.slice(start, end);
  });

  const articles: ParsedArticle[] = [];
  const seenArticleNos = new Set<string>();
  let pendingHeading: string | null = null;

  for (let i = 0; i < matches.length; i++) {
    const prefix = matches[i][1];
    const number = matches[i][2];
    // "GEÇİCİ MADDE" ve "Geçici Madde" (karışık büyük/küçük harf) — bkz.
    // ARTICLE_START_RE üstündeki not, kanuna göre büyük/küçük harf değişiyor.
    const isGeciciMadde = prefix.startsWith('GEÇİCİ') || prefix.startsWith('Geçici');
    const articleNo = isGeciciMadde ? `Geçici ${number}` : number;

    const lines = rawSpans[i].split('\n').map(l => l.trim()).filter(Boolean);

    // Bir sonraki maddenin başlığı genelde bu gövdenin son satırıdır (madde
    // numarasından hemen önce gelen kısa alt başlık, ör. "2. İkinci derecedeki
    // noktalar"). Kısa ve tek satırsa başlık say, gövdeden çıkar.
    let content = lines;
    let nextHeading: string | null = null;
    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.length <= 80 && !/[.!?"”]$/.test(lastLine)) {
      nextHeading = lastLine;
      content = lines.slice(0, -1);
    }

    const contentText = content.join('\n').trim();
    // Bazı kanun PDF'leri sonda "önceki değişiklik kanunlarının orijinal
    // metni" başlıklı tarihi bir ek bölüm içeriyor; bu bölüm ana gövdedeki
    // (özellikle geçici) madde numaralarını tekrarlayabiliyor. İlk (asıl,
    // yürürlükteki) geçiş her zaman ek bölümden önce geldiği için yalnızca
    // ilk görülen kopya saklanır.
    if (contentText && !seenArticleNos.has(articleNo)) {
      seenArticleNos.add(articleNo);
      articles.push({ articleNo, heading: pendingHeading, content: contentText });
    }
    pendingHeading = nextHeading;
  }

  return articles;
}

export interface ImportResult {
  mevzuatNo: number;
  status: 'ok' | 'error';
  articleCount: number;
  error?: string;
}

/** Tek bir kanunu mevzuat.gov.tr'den indirir, ayrıştırır ve tamamen değiştirir
 * (eski maddeler silinip yenileri yazılır — numaralandırma/kapsam değişikliğinde
 * yetim madde satırı kalmaz). */
export async function importLegalCode(entry: LegalCodeRegistryEntry): Promise<ImportResult> {
  const sourceUrl = buildSourceUrl(entry);

  try {
    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`${sourceUrl} -> HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();

    // Statik `import { PDFParse } from 'pdf-parse'` yerine dinamik import:
    // canlıya alma teşhisi (2026-08-24) — bu modülü (transitive olarak) içe
    // aktaran HERHANGİ bir route, Vercel'in dağıtım ortamında pdf-parse/
    // pdfjs-dist'in çalışma zamanı varlıklarıyla (worker/cmap dosyaları,
    // next.config.ts'deki serverExternalPackages notuna bkz.) ilgili bir
    // sorun nedeniyle MODÜL YÜKLEME anında çöküyordu — bu, çağıran kodun
    // (ör. bu route'un auth kontrolü) hiç çalışma fırsatı bulamadığı,
    // try/catch ile yakalanamayan bir hataydı (yerel ortamda tekrarlanamadı,
    // yalnızca Vercel'de gözlemlendi). Dinamik import bu değerlendirmeyi
    // gerçek çağrı anına, bu try bloğunun İÇİNE erteleyip en azından gerçek
    // hatanın system_errors'a düzgün raporlanmasını sağlar.
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
    const { text } = await parser.getText();

    const articles = parseArticles(text);
    if (articles.length === 0) {
      throw new Error('PDF ayrıştırıldı ama hiç madde bulunamadı (regex uyuşmazlığı olabilir).');
    }

    const gazetteMatch = GAZETTE_DATE_RE.exec(text);
    const resmiGazeteTarihi = gazetteMatch ? gazetteMatch[1] : null;

    const { data: codeRow, error: upsertCodeError } = await supabaseAdmin
      .from('legal_codes')
      .upsert(
        {
          mevzuat_no: entry.mevzuatNo,
          name: entry.name,
          short_name: entry.shortName,
          mevzuat_tur: entry.mevzuatTur,
          mevzuat_tertip: entry.mevzuatTertip,
          source_url: sourceUrl,
          resmi_gazete_tarihi: resmiGazeteTarihi,
          article_count: articles.length,
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'ok',
          last_sync_error: null,
        },
        { onConflict: 'mevzuat_no' }
      )
      .select('id')
      .single();

    if (upsertCodeError || !codeRow) {
      throw new Error(`legal_codes upsert hatası: ${upsertCodeError?.message}`);
    }

    // Tam değiştirme: önce bu kanuna ait tüm maddeleri sil, sonra yeniden yaz.
    const { error: deleteError } = await supabaseAdmin
      .from('legal_code_articles')
      .delete()
      .eq('legal_code_id', codeRow.id);
    if (deleteError) throw new Error(`Eski maddeler silinemedi: ${deleteError.message}`);

    const rows = articles.map(a => ({
      legal_code_id: codeRow.id,
      article_no: a.articleNo,
      heading: a.heading,
      content: a.content,
    }));

    // Büyük kanunlarda (TBK ~650 madde) tek seferde insert edilebilir boyutta;
    // yine de güvenlik payı için 500'lük parçalar halinde yazılır.
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error: insertError } = await supabaseAdmin.from('legal_code_articles').insert(chunk);
      if (insertError) throw new Error(`Madde eklenemedi: ${insertError.message}`);
    }

    return { mevzuatNo: entry.mevzuatNo, status: 'ok', articleCount: articles.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('legal_codes')
      .upsert(
        {
          mevzuat_no: entry.mevzuatNo,
          name: entry.name,
          short_name: entry.shortName,
          mevzuat_tur: entry.mevzuatTur,
          mevzuat_tertip: entry.mevzuatTertip,
          source_url: sourceUrl,
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: message,
        },
        { onConflict: 'mevzuat_no' }
      );
    return { mevzuatNo: entry.mevzuatNo, status: 'error', articleCount: 0, error: message };
  }
}
