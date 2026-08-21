import { redirect } from 'next/navigation'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { FirstSetupForm } from './FirstSetupForm'

/** Sistemde hiç hesap yokken (`profiles` boş) devralan avukatın kendi ilk
 * hesabını Supabase Dashboard'a hiç erişmeden açabilmesi için tek seferlik
 * kurulum ekranı. İlk hesap oluşturulduğu an bu sayfa kalıcı olarak
 * kilitlenir (aşağıdaki kontrol her ziyarette tekrar çalışır) — bkz.
 * createFirstAccount (src/lib/auth.ts) ve bootstrap_first_yonetici trigger'ı. */
export default async function IlkKurulumPage() {
  if (!isSupabaseAdminConfigured()) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-serif text-foreground">Sistem Henüz Yapılandırılmadı</h1>
          <p className="text-sm text-muted-foreground">
            Kurulum ekranı için sunucu tarafı ortam değişkenlerinin (Supabase) tanımlanmış olması gerekir.
            Lütfen sistem yöneticinizle iletişime geçin.
          </p>
        </div>
      </div>
    );
  }

  const { count } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true });
  if (count && count > 0) {
    redirect('/login');
  }

  return <FirstSetupForm />;
}
