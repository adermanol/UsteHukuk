import { supabase, isMockSupabase } from '@/core/database/supabase'
import { normalizeAlias } from '../taxonomy'

/**
 * Avukat bir başvuruya elle bir hukuk alanı atadığında, o başvurunun eski
 * serbest metin case_type'ı da alias tablosuna yazılır — böylece aynı
 * serbest metin bir daha görüldüğünde otomatik çözülür (taksonomi kendini
 * iyileştirir). Yazma başarısız olursa sessizce yutulur: bu bir önbellek
 * optimizasyonudur, ana atama işlemini bloklamamalı.
 */
export async function recordAliasIfNew(rawCaseType: string | null, practiceAreaId: string): Promise<void> {
  if (isMockSupabase() || !rawCaseType?.trim()) return;
  const alias = normalizeAlias(rawCaseType);
  await supabase
    .from('practice_area_aliases')
    .insert({ alias_normalized: alias, practice_area_id: practiceAreaId, source_note: 'manuel' })
    .then(({ error }) => {
      if (error && error.code !== '23505') {
        console.error('recordAliasIfNew error:', error);
      }
    });
}
