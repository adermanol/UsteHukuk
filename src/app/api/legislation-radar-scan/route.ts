import { NextResponse } from 'next/server'
import { getUser } from '@/core/auth'
import { runLegalRadar, RadarNotConfiguredError } from '@/modules/legislation-radar/services/aggregator'
import { reportSystemError } from '@/core/system-error-log'

// Panelin "Şimdi Tara" butonu için — cron/legal-radar route'unun ikizi ama
// CRON_SECRET yerine normal oturum kontrolü kullanır. "use server" Server
// Action'lar dosya başına `maxDuration` export EDEMEZ (Next.js kısıtı) —
// önceki triggerScan.ts (Server Action) bu yüzden Vercel'in platform
// varsayılan süre sınırında (genelde 10sn) kesiliyor, kullanıcıya "A server
// error occurred" jenerik hatası olarak görünüyordu; kendi try/catch'imiz
// bunu hiç yakalayamıyordu çünkü kesinti kodun kendisinden değil platformdan
// geliyordu. Route Handler'a taşımak, cron route'uyla aynı 60sn üst sınırı
// açıkça tanımlamamızı sağlar.
export const maxDuration = 60;

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const results = await runLegalRadar();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof RadarNotConfiguredError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    console.error('Legal radar manual scan error:', error);
    void reportSystemError('api:legislation-radar-scan', error);
    return NextResponse.json({ success: false, error: 'Tarama sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
