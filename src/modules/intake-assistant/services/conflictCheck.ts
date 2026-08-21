/**
 * Çıkar Çatışması Ön Kontrol Modülü (Conflict of Interest Check)
 *
 * Bu servis, yeni müvekkil adayı veya karşı taraf bilgisi girildiğinde
 * büronun mevcut veritabanında (Supabase) çakışma olup olmadığını kontrol eder.
 */

import { supabase, isMockSupabase } from '@/core/database/supabase'

export interface ConflictCheckResult {
  hasConflict: boolean;
  details?: string;
  configured: boolean;
}

export const checkConflict = async (fullName: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('clients')
    .select('full_name')
    .ilike('full_name', `%${fullName}%`)

  if (error) {
    throw new Error(`Çıkar çatışması kontrolü başarısız: ${error.message}`)
  }

  return Boolean(data && data.length > 0)
}

export const checkConflictOfInterest = async (partyName: string): Promise<ConflictCheckResult> => {
  if (isMockSupabase()) {
    return {
      hasConflict: false,
      configured: false,
      details: 'Supabase yapılandırılmadı: çıkar çatışması kontrolü yapılamadı.',
    }
  }

  const hasConflict = await checkConflict(partyName);

  if (hasConflict) {
    return { hasConflict: true, configured: true, details: 'Bu kişi/kurum mevcut bir dosyanın karşı tarafıdır.' }
  }

  return { hasConflict: false, configured: true }
}
