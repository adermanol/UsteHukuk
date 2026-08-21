"use server"

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/core/database/supabase-server'
import { isMockSupabase } from '@/core/database/supabase'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'

/** `log_audit_event` RPC'si yalnızca `authenticated` role'üne GRANT
 * edilmiş (bkz. 20260805000000_security_hardening.sql) — başarısız bir
 * giriş denemesinde henüz oturum yoktur, RPC çağrısı reddedilir. Bu yüzden
 * giriş/çıkış olayları burada servis-rolüyle (RLS'i atlayarak) doğrudan
 * yazılır; `actor_id` başarısız denemelerde NULL kalır, denenen e-posta
 * `details`'e yazılır (hedefli/kaba kuvvet giriş denemelerini görebilmek
 * için — güvenlik denetimi, 2026-08-11).
 */
async function logAuthEvent(action: 'login_success' | 'login_failure' | 'logout', actorId: string | null, details: Record<string, unknown>) {
  if (!isSupabaseAdminConfigured()) return;
  try {
    await supabaseAdmin.from('audit_log').insert({ actor_id: actorId, action, details });
  } catch (err) {
    console.error('logAuthEvent error:', err);
  }
}

export async function login(email: string, password: string) {
  if (isMockSupabase()) {
    return {
      success: false,
      message: 'Supabase yapılandırılmadı (.env.local dosyasına NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin).',
    }
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await logAuthEvent('login_failure', null, { email })
    return { success: false, message: 'Hatalı e-posta veya şifre' }
  }

  // MFA (TOTP) etkinleştirmiş bir kullanıcı için signInWithPassword yalnızca
  // aal1 (parola) düzeyinde bir oturum kurar — sunucuya erişim proxy.ts'de
  // aal2 gerektirir. Buradaki kontrol yalnızca kendi TOTP faktörünü
  // doğrulamış kullanıcıları etkiler; MFA hiç kurmamış kullanıcılar için
  // `nextLevel === currentLevel` olur, akış değişmez.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.find(f => f.status === 'verified');
    if (!totpFactor) {
      return { success: false, message: 'MFA yapılandırma hatası — lütfen büronuzla iletişime geçin.' };
    }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeError || !challenge) {
      return { success: false, message: 'Doğrulayıcı kodu istenirken bir hata oluştu.' };
    }
    return { success: true, mfaRequired: true, factorId: totpFactor.id, challengeId: challenge.id };
  }

  await logAuthEvent('login_success', data.user?.id ?? null, { email })
  return { success: true }
}

/** Login'den sonra `mfaRequired` döndüyse çağrılır — kimlik doğrulayıcı
 * uygulamasındaki 6 haneli kodu doğrulayıp oturumu aal2'ye yükseltir. */
export async function verifyMfaCode(factorId: string, challengeId: string, code: string) {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı.' };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) {
    return { success: false, message: 'Kod hatalı veya süresi doldu, lütfen tekrar deneyin.' };
  }
  await logAuthEvent('login_success', data.user?.id ?? null, { mfa: true });
  return { success: true };
}

/** Passkey ile giriş (`supabase.auth.signInWithPasskey()`) tamamen
 * tarayıcıda çalışır — WebAuthn seremonisi (navigator.credentials.get())
 * yalnızca DOM'da mümkündür, bu yüzden `login()`'in aksine burada bir
 * server action YOK, giriş doğrudan istemci tarafında olur. Bu fonksiyon
 * yalnızca o başarılı girişi denetim kaydına (audit_log) işlemek için
 * ayrıca çağrılır — session zaten kurulmuş olur, burada kimlik doğrulama
 * YAPILMAZ, yalnızca oturumdaki kullanıcı kaydedilir. */
export async function logPasskeyLogin() {
  if (isMockSupabase()) return;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await logAuthEvent('login_success', user.id, { passkey: true, email: user.email });
}

/** Büronun ilk hesabını, Supabase Dashboard'a erişimi olmayan biri
 * (devralan avukat) tek seferlik bir kurulum ekranından açabilmesi için —
 * geliştiricinin teslimden sonra "aradan çekilmiş" olabilmesi bu adıma
 * bağlı. `profiles` tablosu boşken (bkz. bootstrap_first_yonetici trigger'ı,
 * 20260729000000_profiles_roles.sql) çalışır; ilk hesap oluşturulduğu an
 * `profiles` artık boş olmayacağından bu fonksiyon ve `/ilk-kurulum` sayfası
 * kalıcı olarak kilitlenir — halka açık, sınırsız bir kayıt formu DEĞİLDİR.
 */
export async function createFirstAccount(email: string, password: string, fullName: string) {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, message: 'Sistem henüz yapılandırılmadı (sunucu tarafı ortam değişkenleri eksik).' };
  }

  const { count, error: countError } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  if (countError) {
    return { success: false, message: 'Kurulum durumu kontrol edilemedi, lütfen tekrar deneyin.' };
  }
  if (count && count > 0) {
    return { success: false, message: 'Kurulum zaten tamamlanmış. Lütfen giriş yapın.' };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    return { success: false, message: error?.message === 'User already registered'
      ? 'Bu e-posta adresi zaten kayıtlı.'
      : 'Hesap oluşturulamadı, lütfen tekrar deneyin.' };
  }

  await logAuthEvent('login_success', data.user.id, { email, first_account_setup: true });
  return { success: true };
}

export async function logout() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.auth.signOut()
  await logAuthEvent('logout', user?.id ?? null, {})
  redirect('/login')
}
