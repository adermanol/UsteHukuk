import { supabase, isMockSupabase } from '@/core/database/supabase'

export type TeamRole = 'master' | 'yonetici' | 'avukat' | 'stajyer';

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  nav_order: string[] | null;
}

export class TeamNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TeamNotConfiguredError'
  }
}

/**
 * RLS "Allow self select for profiles" gereği: yönetici tüm ekibi görür,
 * avukat/stajyer yalnızca kendi profilini görür (dizi tek elemanlı döner).
 */
export async function fetchTeamMembers(): Promise<ProfileRow[]> {
  if (isMockSupabase()) {
    throw new TeamNotConfiguredError('Supabase yapılandırılmadı: ekip listesi alınamadı.');
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at, nav_order')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Ekip listesi alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchCurrentProfile(): Promise<ProfileRow | null> {
  if (isMockSupabase()) {
    throw new TeamNotConfiguredError('Supabase yapılandırılmadı: profil alınamadı.');
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at, nav_order')
    .eq('id', userData.user.id)
    .single();
  if (error) throw new Error(`Profil alınamadı: ${error.message}`);
  return data;
}

/**
 * RLS "Allow yonetici update for profiles" (USING is_yonetici()) erişimi
 * doğrular — yönetici olmayan bir hesap çağırırsa Supabase satırı
 * güncellemeden 0 satır döner. ÖNEMLİ: `.select()` olmadan bu durumda
 * PostgREST `error: null` + boş sonuç döner, kod bunu "başarılı" sanardı
 * (gerçek hata: rol hiç değişmezdi ama "Rol güncellendi." mesajı görünürdü).
 * `.select('id')` + boş dizi kontrolü bu sessiz başarısızlığı yakalar.
 */
export async function updateMemberRole(id: string, role: TeamRole): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: rol güncellenemedi.' };
  }
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user?.id === id) {
    return { success: false, message: 'Kendi rolünüzü değiştiremezsiniz — büronun tek yöneticisinin/master\'ının kendini kilitlemesini önlemek için bu kısıtlama kasıtlıdır. Rolünüzü başka bir yönetici değiştirebilir.' };
  }
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select('id');
  if (error) {
    console.error('updateMemberRole error:', error);
    return { success: false, message: 'Rol güncellenirken bir hata oluştu. Bu işlem yalnızca yönetici/master rolündeki kullanıcılar tarafından yapılabilir.' };
  }
  if (!data || data.length === 0) {
    return { success: false, message: 'Rol güncellenemedi — bu işlem için yetkiniz olmayabilir.' };
  }
  await supabase.rpc('log_audit_event', { p_action: 'role_change', p_details: { target_id: id, new_role: role } });
  return { success: true, message: 'Rol güncellendi.' };
}

/**
 * `set_nav_order` SECURITY DEFINER RPC'sini çağırır — bu, doğrudan
 * `profiles.update({ nav_order })` yerine kasıtlı bir tercihtir: normal RLS
 * "self update" politikası olmadığından (role/is_active gibi hassas
 * kolonların da kazara açılmasını önlemek için), fonksiyon yalnızca
 * çağıranın kendi satırındaki nav_order kolonunu değiştirir.
 */
export async function updateNavOrder(order: string[]): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: menü sırası kaydedilemedi.' };
  }
  const { error } = await supabase.rpc('set_nav_order', { new_order: order });
  if (error) {
    console.error('updateNavOrder error:', error);
    return { success: false, message: 'Menü sırası kaydedilirken bir hata oluştu.' };
  }
  return { success: true, message: 'Menü sırası kaydedildi.' };
}

export async function toggleMemberActive(id: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) {
    return { success: false, message: 'Supabase yapılandırılmadı: durum güncellenemedi.' };
  }
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user?.id === id && !isActive) {
    return { success: false, message: 'Kendinizi devre dışı bırakamazsınız — bu, hesabınıza geri dönüşü olmayan bir şekilde erişiminizi kaybetmenize yol açabilir. Başka bir yönetici sizi devre dışı bırakabilir.' };
  }
  const { data, error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id).select('id');
  if (error) {
    console.error('toggleMemberActive error:', error);
    return { success: false, message: 'Durum güncellenirken bir hata oluştu.' };
  }
  if (!data || data.length === 0) {
    return { success: false, message: 'Durum güncellenemedi — bu işlem için yetkiniz olmayabilir.' };
  }
  await supabase.rpc('log_audit_event', { p_action: 'active_status_change', p_details: { target_id: id, is_active: isActive } });
  return { success: true, message: isActive ? 'Kullanıcı etkinleştirildi.' : 'Kullanıcı devre dışı bırakıldı.' };
}
