"use server"

import { syncAllLegalCodes, LegalCodesNotConfiguredError } from './syncAllCodes'

// /dashboard/legislation sayfasındaki "Şimdi Senkronize Et" butonu için.
// triggerLegalRadarScan ile aynı desen — proxy.ts zaten /dashboard'u koruyor.
export async function triggerLegalCodesSync() {
  try {
    const results = await syncAllLegalCodes();
    return { success: true as const, results };
  } catch (error) {
    if (error instanceof LegalCodesNotConfiguredError) {
      return { success: false as const, message: error.message };
    }
    console.error('Manuel kanun senkronizasyonu hatası:', error);
    return { success: false as const, message: 'Senkronizasyon sırasında beklenmeyen bir hata oluştu.' };
  }
}
