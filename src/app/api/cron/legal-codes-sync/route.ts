import { NextResponse } from 'next/server'
import { isCronAuthorized, reportCronError } from '@/core/cron-auth'
import { syncAllLegalCodes, LegalCodesNotConfiguredError } from '@/modules/legal-codes/services/syncAllCodes'

// 15 kanun ~5000+ madde parse ediyor; legal-radar'ın 60s'lik limiti yetmeyebilir.
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const results = await syncAllLegalCodes();
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof LegalCodesNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Legal codes sync cron error:', error);
    reportCronError('legal-codes-sync', error);
    return NextResponse.json({ error: 'Senkronizasyon sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}

// Vercel Cron GET isteğiyle tetikler.
export async function GET(req: Request) {
  return POST(req);
}
