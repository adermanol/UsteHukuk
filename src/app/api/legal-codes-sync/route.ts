import { NextResponse } from 'next/server'
import { getUser } from '@/core/auth'
import { syncAllLegalCodes, LegalCodesNotConfiguredError } from '@/modules/legal-codes/services/syncAllCodes'
import { reportSystemError } from '@/core/system-error-log'

// Panelin "Şimdi Senkronize Et" butonu için — bkz. legislation-radar-scan/
// route.ts'deki not: Server Action'lar maxDuration export edemez, bu 15
// kanun/~5000+ madde işleyen senkronizasyon Vercel'in platform varsayılan
// süre sınırında kesilip jenerik bir hataya yol açıyordu.
export const maxDuration = 300;

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const results = await syncAllLegalCodes();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof LegalCodesNotConfiguredError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    console.error('Manual legal codes sync error:', error);
    void reportSystemError('api:legal-codes-sync', error);
    return NextResponse.json({ success: false, error: 'Senkronizasyon sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
