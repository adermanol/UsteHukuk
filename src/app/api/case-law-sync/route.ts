import { NextResponse } from 'next/server'
import { getUser } from '@/core/auth'
import { syncAllCaseLaw, CaseLawNotConfiguredError } from '@/modules/case-law/services/syncAllCaseLaw'
import { reportSystemError } from '@/core/system-error-log'

// Panelin "Şimdi Senkronize Et" butonu için — bkz. legislation-radar-scan/
// route.ts'deki not: Server Action'lar maxDuration export edemez.
export const maxDuration = 300;

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const results = await syncAllCaseLaw();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof CaseLawNotConfiguredError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    console.error('Manual case law sync error:', error);
    void reportSystemError('api:case-law-sync', error);
    return NextResponse.json({ success: false, error: 'Senkronizasyon sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
