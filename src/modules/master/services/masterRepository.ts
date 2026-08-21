import { supabase, isMockSupabase } from '@/core/database/supabase'

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  feature_flags: Record<string, boolean>;
  created_at: string;
}

export class MasterNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MasterNotConfiguredError'
  }
}

/** RLS "Allow master all for tenants" gereği yalnızca master rolündeki
 * kullanıcılar bu sorguyu çalıştırabilir; başka biri çağırırsa boş dizi
 * döner (satır yok, hata yok). */
export async function fetchTenants(): Promise<TenantRow[]> {
  if (isMockSupabase()) throw new MasterNotConfiguredError('Supabase yapılandırılmadı: kiracı listesi alınamadı.');
  const { data, error } = await supabase.from('tenants').select('id, slug, name, is_active, feature_flags, created_at').order('created_at');
  if (error) throw new Error(`Kiracı listesi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function updateTenantFeatureFlags(id: string, flags: Record<string, boolean>): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { data, error } = await supabase.from('tenants').update({ feature_flags: flags }).eq('id', id).select('id');
  if (error) return { success: false, message: 'Güncellenirken bir hata oluştu.' };
  if (!data || data.length === 0) return { success: false, message: 'Güncellenemedi — yetkiniz olmayabilir.' };
  return { success: true, message: 'Özellik anahtarları güncellendi.' };
}

export async function toggleTenantActive(id: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { data, error } = await supabase.from('tenants').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) return { success: false, message: 'Güncellenirken bir hata oluştu.' };
  if (!data || data.length === 0) return { success: false, message: 'Güncellenemedi — yetkiniz olmayabilir.' };
  await supabase.rpc('log_audit_event', { p_action: 'tenant_active_toggle', p_details: { tenant_id: id, is_active: isActive } });
  return { success: true, message: isActive ? 'Kiracı etkinleştirildi.' : 'Kiracı devre dışı bırakıldı.' };
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalStaff: number;
  totalTokens: number;
}

/** Yalnızca master'ın erişebildiği, kiracı sınırı gözetmeyen platform
 * geneli özet — bugün tek kiracı olduğu için sayılar Üste Hukuk'a eşit,
 * ikinci bir kiracı eklendiğinde otomatik olarak tüm kiracıları kapsar. */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  if (isMockSupabase()) throw new MasterNotConfiguredError('Supabase yapılandırılmadı: platform özeti alınamadı.');
  // Platform özeti kasıtlı olarak TÜM zamanları kapsar (per-büro token
  // sayacı sıfırlamasından — bkz. src/lib/tokenCounter.ts — bağımsızdır):
  // master'ın gördüğü bu sayı, herhangi bir büronun kendi ekranındaki
  // sayacı sıfırlamasından etkilenmemelidir.
  const [{ count: totalTenants }, { count: activeTenants }, { count: totalStaff }, { data: totalTokensData }] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.rpc('total_llm_tokens'),
  ]);
  const totalTokens = typeof totalTokensData === 'number' ? totalTokensData : Number(totalTokensData) || 0;
  return { totalTenants: totalTenants ?? 0, activeTenants: activeTenants ?? 0, totalStaff: totalStaff ?? 0, totalTokens };
}
