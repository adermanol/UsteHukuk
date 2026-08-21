"use server"

import { syncAllCaseLaw, CaseLawNotConfiguredError } from './syncAllCaseLaw'

export async function triggerCaseLawSync() {
  try {
    const results = await syncAllCaseLaw();
    return { success: true as const, results };
  } catch (error) {
    if (error instanceof CaseLawNotConfiguredError) {
      return { success: false as const, message: error.message };
    }
    console.error('Manuel içtihat senkronizasyonu hatası:', error);
    return { success: false as const, message: 'Senkronizasyon sırasında beklenmeyen bir hata oluştu.' };
  }
}
