"use server"

import crypto from 'crypto'
import { headers } from 'next/headers'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { createServerSupabaseClient } from '@/core/database/supabase-server'
import { checkRateLimit } from '@/core/rate-limit'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function requireStaffUser(): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Oturum bulunamadı.' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !['yonetici', 'avukat'].includes(profile.role)) {
    return { ok: false, message: 'Bu işlem için yönetici veya avukat yetkisi gerekir.' };
  }
  return { ok: true, userId: user.id };
}

export interface StatusLinkInfo {
  isActive: boolean;
  createdAt: string;
  lastAccessedAt: string | null;
}

/** Bir (dosya, müvekkil) çifti için var olan linkin durumunu döner —
 * ham token asla döndürülmez, yalnızca personel arayüzünde "aktif/pasif,
 * son erişim" gösterimi için. */
export async function fetchStatusLinkInfo(caseId: string, clientId: string): Promise<StatusLinkInfo | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const { data } = await supabaseAdmin
    .from('case_status_links')
    .select('is_active, created_at, last_accessed_at')
    .eq('case_id', caseId).eq('client_id', clientId)
    .maybeSingle();
  if (!data) return null;
  return { isActive: data.is_active, createdAt: data.created_at, lastAccessedAt: data.last_accessed_at };
}

/** Yeni bir durum linki üretir (veya var olanı geçersiz kılıp yenisiyle
 * değiştirir — UNIQUE (case_id, client_id) upsert). Ham token yalnızca bu
 * çağrının dönüşünde bir kez görünür, DB'ye asla yazılmaz. */
export async function generateStatusLink(caseId: string, clientId: string): Promise<{ success: boolean; message: string; path?: string }> {
  if (!isSupabaseAdminConfigured()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const auth = await requireStaffUser();
  if (!auth.ok) return { success: false, message: auth.message };

  const { data: membership } = await supabaseAdmin
    .from('case_clients').select('case_id').eq('case_id', caseId).eq('client_id', clientId).maybeSingle();
  if (!membership) return { success: false, message: 'Bu müvekkil bu dosyaya bağlı değil.' };

  const rawToken = crypto.randomBytes(24).toString('base64url');
  const STATUS_LINK_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 gün
  const { error } = await supabaseAdmin
    .from('case_status_links')
    .upsert({
      case_id: caseId, client_id: clientId, token_hash: hashToken(rawToken),
      is_active: true, created_by: auth.userId, regenerated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + STATUS_LINK_TTL_MS).toISOString(),
    }, { onConflict: 'case_id,client_id' });
  if (error) {
    console.error('generateStatusLink error:', error);
    return { success: false, message: 'Link oluşturulurken bir hata oluştu.' };
  }
  await supabaseAdmin.from('audit_log').insert({
    actor_id: auth.userId, action: 'status_link_generate', details: { case_id: caseId, client_id: clientId },
  });
  return { success: true, message: 'Link oluşturuldu.', path: `/portal/durum/${rawToken}` };
}

export async function revokeStatusLink(caseId: string, clientId: string): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseAdminConfigured()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const auth = await requireStaffUser();
  if (!auth.ok) return { success: false, message: auth.message };

  const { error } = await supabaseAdmin.from('case_status_links').update({ is_active: false }).eq('case_id', caseId).eq('client_id', clientId);
  if (error) return { success: false, message: 'Erişim kapatılırken bir hata oluştu.' };
  await supabaseAdmin.from('audit_log').insert({
    actor_id: auth.userId, action: 'status_link_revoke', details: { case_id: caseId, client_id: clientId },
  });
  return { success: true, message: 'Erişim kapatıldı.' };
}

export interface ResolvedStatusLink {
  caseId: string;
  clientId: string;
}

/** Müvekkilin açtığı /portal/durum/[token] sayfasından çağrılır. Token'ı
 * hash'leyip arar, ayrıca case_clients'te bu çiftin HÂLÂ geçerli olduğunu
 * doğrular (personel müvekkili dosyadan çıkarmışsa link kendiliğinden
 * geçersiz sayılır). supabaseAdmin ile — bu rota Supabase oturumu taşımaz. */
export async function resolveStatusLink(rawToken: string): Promise<ResolvedStatusLink | null> {
  if (!isSupabaseAdminConfigured() || !rawToken) return null;

  // Basit kötüye kullanım freni — 192 bitlik token için pratikte gereksiz
  // ama ucuz bir ek güvence (bkz. plan Aşama D.3).
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  const { allowed } = await checkRateLimit(`portal-durum:${ip}`, 30, 60 * 1000);
  if (!allowed) return null;

  const tokenHash = hashToken(rawToken);
  const { data: link } = await supabaseAdmin
    .from('case_status_links')
    .select('case_id, client_id, is_active, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (!link || !link.is_active) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  const { data: membership } = await supabaseAdmin
    .from('case_clients').select('case_id').eq('case_id', link.case_id).eq('client_id', link.client_id).maybeSingle();
  if (!membership) return null;

  await supabaseAdmin.from('case_status_links').update({ last_accessed_at: new Date().toISOString() })
    .eq('case_id', link.case_id).eq('client_id', link.client_id);
  // actor_id NULL: müvekkil bu sayfaya Supabase oturumu olmadan erişir —
  // erişimin kendisi denetim izi için önemli, kimin eriştiği personel
  // tarafında zaten link üretiminde (status_link_generate) biliniyor.
  await supabaseAdmin.from('audit_log').insert({
    actor_id: null, action: 'status_link_access', details: { case_id: link.case_id, client_id: link.client_id },
  });

  return { caseId: link.case_id, clientId: link.client_id };
}
