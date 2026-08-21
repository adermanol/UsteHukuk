import { supabase, isMockSupabase } from '@/core/database/supabase'

export type NotificationKind = 'sistem' | 'duyuru' | 'mesaj';

export interface NotificationRow {
  id: string;
  created_at: string;
  user_id: string | null;
  sender_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
}

export interface NotificationWithSender extends NotificationRow {
  sender: { full_name: string | null; email: string | null } | null;
}

export class NotificationsNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotificationsNotConfiguredError'
  }
}

const COLUMNS = 'id, created_at, user_id, sender_id, kind, title, body, link, is_read, sender:sender_id ( full_name, email )';

/** RLS zaten yalnızca kendinize ait (user_id = auth.uid()) veya büro geneli
 * (user_id IS NULL) bildirimleri döndürür. */
export async function fetchNotifications(limit = 50): Promise<NotificationWithSender[]> {
  if (isMockSupabase()) throw new NotificationsNotConfiguredError('Supabase yapılandırılmadı: bildirimler alınamadı.');
  const { data, error } = await supabase
    .from('notifications')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Bildirimler alınamadı: ${error.message}`);
  return (data ?? []) as unknown as NotificationWithSender[];
}

export async function fetchUnreadCount(): Promise<number> {
  if (isMockSupabase()) return 0;
  const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  if (isMockSupabase()) return;
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllAsRead(): Promise<void> {
  if (isMockSupabase()) return;
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
}

export async function deleteNotification(id: string): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) return { success: false, message: 'Silinirken bir hata oluştu.' };
  return { success: true, message: 'Silindi.' };
}

/** Belirli bir kişiye mesaj (recipientId dolu) veya büro geneline duyuru
 * (recipientId null — RLS bunu yalnızca yöneticiye izin verir) gönderir. */
export async function sendNotification(params: {
  recipientId: string | null;
  title: string;
  body: string | null;
}): Promise<{ success: boolean; message: string }> {
  if (isMockSupabase()) return { success: false, message: 'Supabase yapılandırılmadı.' };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, message: 'Oturum bulunamadı.' };

  const { error } = await supabase.from('notifications').insert({
    user_id: params.recipientId,
    sender_id: userData.user.id,
    kind: params.recipientId ? 'mesaj' : 'duyuru',
    title: params.title.trim(),
    body: params.body?.trim() || null,
  });
  if (error) {
    console.error('sendNotification error:', error);
    return { success: false, message: 'Gönderilirken bir hata oluştu (büro geneli duyuru yalnızca yönetici tarafından gönderilebilir).' };
  }
  return { success: true, message: params.recipientId ? 'Mesaj gönderildi.' : 'Duyuru tüm büroya gönderildi.' };
}
