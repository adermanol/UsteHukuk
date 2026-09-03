import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/core/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { reportSystemError } from '@/core/system-error-log'

export const maxDuration = 30;

const deleteSchema = z.object({ id: z.string().uuid() });

/** Ekip panelindeki hesap silme butonu için. Gerçek `auth.users` satırını
 * siler (yalnızca `profiles`'ı değil) — `profiles.id` ON DELETE CASCADE
 * ile bağlı olduğundan profil de kendiliğinden gider. Dosya/defter/denetim
 * izi gibi tablolardaki `owner_id`/`created_by`/`actor_id` sütunları
 * kasıtlı olarak ON DELETE davranışı TANIMLAMADAN bırakıldı (bkz. ilgili
 * migration'lar) — yani bu kullanıcıya bağlı GERÇEK iş verisi (dosya,
 * defter kaydı vb.) varsa Postgres silme işlemini bir foreign-key
 * hatasıyla kendiliğinden reddeder; burada o hatayı yakalayıp anlaşılır
 * bir mesaja çeviriyoruz. Bu, geçmişi olan bir hesabın kazayla (ve
 * müvekkil dosyalarının etkilenmesi pahasına) silinmesine karşı DB
 * seviyesinde bir güvenlik ağıdır — atlanamaz. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Sistem yapılandırılmadı.' }, { status: 503 });
  }

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'yonetici' && profile?.role !== 'master') {
    return NextResponse.json({ error: 'Bu işlem yalnızca yönetici/master rolündeki kullanıcılar tarafından yapılabilir.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    }
    const { id } = parsed.data;

    if (id === user.id) {
      return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      const isForeignKeyBlock = /foreign key|violat/i.test(error.message);
      const message = isForeignKeyBlock
        ? 'Bu kullanıcıya bağlı kayıtlar (dosya, defter kaydı, denetim izi vb.) olduğu için hesap silinemez. Erişimini kaldırmak için "Devre Dışı Bırak" seçeneğini kullanın.'
        : 'Hesap silinemedi.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await supabaseAdmin.from('audit_log').insert({ actor_id: user.id, action: 'team_member_delete', details: { target_id: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team delete error:', error);
    void reportSystemError('api:team-delete', error);
    return NextResponse.json({ error: 'Hesap silinirken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
