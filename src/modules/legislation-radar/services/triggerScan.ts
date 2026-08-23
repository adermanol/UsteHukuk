"use server"

import { runLegalRadar, RadarNotConfiguredError } from './aggregator'

// NOT: `maxDuration` burada export EDİLEMEZ — "use server" dosyaları
// yalnızca async fonksiyon export edebilir (Next.js kısıtı); denendiğinde
// derleme tüm export'ları sessizce siliyor. Süre sınırı yalnızca
// types.ts:fetchHtml'deki 15sn'lik fetch zaman aşımıyla sağlanıyor — 4
// kaynak paralel çalıştığı için toplam üst sınır da ~15sn+işleme payı olur.

// /dashboard/legislation sayfasındaki "Şimdi Tara" butonu için. Bu server action
// zaten proxy.ts tarafından korunan /dashboard altından çağrılır, bu yüzden ayrı
// bir yetki kontrolüne gerek yok (CRON_SECRET yalnızca dış cron tetikleyicisi içindir).
export async function triggerLegalRadarScan() {
  try {
    const results = await runLegalRadar();
    return { success: true as const, results };
  } catch (error) {
    if (error instanceof RadarNotConfiguredError) {
      return { success: false as const, message: error.message };
    }
    console.error('Manuel radar taraması hatası:', error);
    return { success: false as const, message: 'Tarama sırasında beklenmeyen bir hata oluştu.' };
  }
}
