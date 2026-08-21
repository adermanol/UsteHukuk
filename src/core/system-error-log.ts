import { supabaseAdmin, isSupabaseAdminConfigured } from './database/supabase-admin'

/**
 * Sentry hesabı açmadan hata görünürlüğü: hata `system_errors` tablosuna
 * (bkz. 20260811000000_self_hosted_ops.sql) yazılır, yönetici/master
 * `/dashboard`'da bunu görür (bkz. SystemErrorsCard). Sentry de ayrıca
 * yapılandırılmışsa (src/instrumentation.ts) iki kayıt da tutulur — biri
 * dışlamaz, bu yalnızca hesap açmadan çalışan varsayılan katmandır.
 */
export async function reportSystemError(source: string, error: unknown, context?: Record<string, unknown>) {
  if (!isSupabaseAdminConfigured()) return;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? null : null;
  try {
    await supabaseAdmin.from('system_errors').insert({ source, message, stack, context: context ?? null });
  } catch (err) {
    console.error('reportSystemError kendisi başarısız oldu:', err);
  }
}
