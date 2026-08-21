import { NextResponse } from 'next/server'
import { isCronAuthorized, reportCronError } from '@/core/cron-auth'
import { runLegalRadar, RadarNotConfiguredError } from '@/modules/legislation-radar/services/aggregator'

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const results = await runLegalRadar();
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof RadarNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Legal radar cron error:', error);
    reportCronError('legal-radar', error);
    return NextResponse.json({ error: 'Tarama sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}

// Vercel Cron GET isteğiyle tetikler.
export async function GET(req: Request) {
  return POST(req);
}
