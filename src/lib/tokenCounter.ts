"use server"

import { supabase, isMockSupabase } from '@/core/database/supabase'
import { createServerSupabaseClient } from '@/core/database/supabase-server'

const COUNTER_KEY = 'token_counter_reset_at';

/** Sayaç son ne zaman sıfırlandı — `app_settings`'te tutulur (bkz.
 * 20260804000000_token_counter.sql'deki not). Hiç sıfırlanmadıysa `null`
 * döner (tüm zamanlar sayılır). */
export async function getCounterResetAt(): Promise<string | null> {
  try {
    if (isMockSupabase()) return null;
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', COUNTER_KEY).maybeSingle();
    if (error) throw error;
    const value = (data?.value as { resetAt?: string } | undefined)?.resetAt;
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/** Sıfırlama sonrası pencerede toplam işlenen token. `llm_logs` satırları
 * SİLİNMEZ — yalnızca `total_llm_tokens(p_since)` RPC'si sıfırlama
 * zamanından sonraki satırları toplar. */
export async function getTotalTokens(): Promise<number> {
  try {
    if (isMockSupabase()) return 0;
    const resetAt = await getCounterResetAt();
    const { data, error } = await supabase.rpc('total_llm_tokens', { p_since: resetAt });
    if (error) throw error;
    return typeof data === 'number' ? data : Number(data) || 0;
  } catch (error) {
    console.error('Error fetching total tokens:', error);
    return 0;
  }
}

export async function resetTokenCounter(): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseServer = await createServerSupabaseClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const { error } = await supabaseServer.from('app_settings').upsert({
      key: COUNTER_KEY,
      value: { resetAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    if (error) {
      console.error('Error resetting token counter:', error);
      return { success: false, message: 'Sayaç sıfırlanırken bir hata oluştu (yalnızca yönetici/master sıfırlayabilir).' };
    }
    await supabaseServer.rpc('log_audit_event', { p_action: 'token_counter_reset', p_details: null });
    return { success: true, message: 'Token sayacı sıfırlandı. Geçmiş kayıtlar (llm_logs) silinmedi, yalnızca görüntüleme penceresi sıfırlandı.' };
  } catch (error) {
    console.error('Error resetting token counter:', error);
    return { success: false, message: 'Sayaç sıfırlanırken bir hata oluştu.' };
  }
}
