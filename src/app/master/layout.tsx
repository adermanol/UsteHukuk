import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/core/database/supabase-server'

/** proxy.ts yalnızca "oturum var mı" kontrolü yapar (staff gate'iyle aynı
 * kaba desen); gerçek rol kontrolü burada yapılır — role='master' olmayan
 * hiçbir authenticated kullanıcı bu ekranı göremez. */
export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'master') redirect('/dashboard');

  return <>{children}</>;
}
