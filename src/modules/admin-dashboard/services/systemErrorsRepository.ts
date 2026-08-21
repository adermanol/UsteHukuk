import { supabase, isMockSupabase } from '@/core/database/supabase'

export interface SystemErrorRow {
  id: string;
  created_at: string;
  source: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  resolved_at: string | null;
}

const COLUMNS = 'id, created_at, source, message, stack, context, resolved_at';

/** RLS "Allow yonetici or master select for system_errors" gereği yalnızca
 * yönetici/master görür; başka bir rol çağırırsa boş dizi döner. */
export async function fetchUnresolvedSystemErrors(limit = 10): Promise<SystemErrorRow[]> {
  if (isMockSupabase()) return [];
  const { data, error } = await supabase
    .from('system_errors')
    .select(COLUMNS)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('fetchUnresolvedSystemErrors error:', error);
    return [];
  }
  return data ?? [];
}

export async function resolveSystemError(id: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('system_errors')
    .update({ resolved_at: new Date().toISOString(), resolved_by: userData.user?.id ?? null })
    .eq('id', id)
    .select('id');
  if (error) {
    console.error('resolveSystemError error:', error);
    return { success: false, message: 'İşaretlenirken bir hata oluştu.' };
  }
  if (!data || data.length === 0) {
    return { success: false, message: 'İşaretlenemedi — yetkiniz olmayabilir.' };
  }
  return { success: true, message: 'Çözüldü olarak işaretlendi.' };
}
