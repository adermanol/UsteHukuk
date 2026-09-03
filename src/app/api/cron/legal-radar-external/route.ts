import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isCronAuthorized, reportCronError } from '@/core/cron-auth'
import { persistFeedResults, RadarNotConfiguredError } from '@/modules/legislation-radar/services/aggregator'
import { SourceRunResult } from '@/modules/legislation-radar/services/types'

export const maxDuration = 60;

// resmi_gazete/mevzuat_gov/rekabet_kurumu Vercel'in sunucu IP'lerinden
// engellendiği için GitHub Actions'ta çalışan scripts/legal-radar-scrape.mjs
// tarafından taranıp buraya POST ediliyor (bkz. aggregator.ts'teki not,
// DEPLOYMENT.md). kvkk ve case_law/legal_codes gibi diğer kaynaklar bu
// route'tan KABUL EDİLMEZ — onlar zaten Vercel içinde sorunsuz çalışıyor,
// buraya yalnızca WAF engelli 3 kaynak gelmeli.
const ALLOWED_SOURCES = ['resmi_gazete', 'mevzuat_gov', 'rekabet_kurumu'] as const;

const scrapedItemSchema = z.object({
  source: z.enum(ALLOWED_SOURCES),
  category: z.string().max(200).nullable(),
  title: z.string().min(1).max(500),
  url: z.string().url().max(1000),
  publishedAt: z.string().datetime().nullable(),
  excerpt: z.string().max(2000).nullable(),
});

const sourceRunResultSchema = z.object({
  source: z.enum(ALLOWED_SOURCES),
  status: z.enum(['ok', 'error']),
  items: z.array(scrapedItemSchema).max(500),
  error: z.string().max(2000).optional(),
  durationMs: z.number().nonnegative(),
});

const bodySchema = z.object({
  results: z.array(sourceRunResultSchema).min(1).max(ALLOWED_SOURCES.length),
});

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.issues : 'Geçersiz istek gövdesi.' },
      { status: 400 }
    );
  }

  try {
    const results = await persistFeedResults(parsed.results as SourceRunResult[]);
    const counts = Object.fromEntries(results.map(r => [r.source, r.items.length]));
    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    if (error instanceof RadarNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Legal radar external ingest error:', error);
    reportCronError('legal-radar-external', error);
    return NextResponse.json({ error: 'Kayıt sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
