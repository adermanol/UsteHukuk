import { NextResponse } from 'next/server'
import { isCronAuthorized, reportCronError } from '@/core/cron-auth'
import { syncAllCaseLaw, CaseLawNotConfiguredError } from '@/modules/case-law/services/syncAllCaseLaw'

// ~17 anahtar kelime × arama + yeni kararların tam metin çekimi/embed'i;
// devlet servisine ölçülü gecikmelerle (bkz. bedestenClient.ts delay())
// davranıldığı için legal-codes-sync ile aynı geniş süre payı verildi.
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const results = await syncAllCaseLaw();
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof CaseLawNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Case law sync cron error:', error);
    reportCronError('case-law-sync', error);
    return NextResponse.json({ error: 'Senkronizasyon sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}

// Vercel Cron GET isteğiyle tetikler.
export async function GET(req: Request) {
  return POST(req);
}
