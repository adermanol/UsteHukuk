import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { getUser } from '@/core/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { reportSystemError } from '@/core/system-error-log'

export const maxDuration = 30;

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(200),
});

/** Ekip panelindeki "Yeni Üye Davet Et" formu için — büronun kendi
 * hesabını (veya herhangi bir yeni çalışanı) Supabase Dashboard'a hiç
 * erişmeden, panelden davet edebilmesi içindir. Mevcut hesaplara
 * dokunmaz, yalnızca yeni bir tane ekler. Davet e-postası Supabase'in
 * kendi auth e-posta servisiyle gönderilir; alıcı linke tıklayıp
 * `/davet` sayfasından kendi şifresini belirler. `handle_new_user`
 * trigger'ı profili otomatik açar (varsayılan rol 'avukat') — davet eden
 * yönetici, ardından Ekip panelindeki mevcut rol menüsünden istediği role
 * (yönetici/master dahil) yükseltebilir. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Sistem yapılandırılmadı.' }, { status: 503 });
  }

  // Davet edenin gerçekten yönetici/master olduğu doğrulanır — RLS'e değil
  // doğrudan servis-rolüne dayandığımız için bu kontrol burada ŞART.
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'yonetici' && profile?.role !== 'master') {
    return NextResponse.json({ error: 'Bu işlem yalnızca yönetici/master rolündeki kullanıcılar tarafından yapılabilir.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya ad soyad.' }, { status: 400 });
    }
    const { email, fullName } = parsed.data;

    const hdrs = await headers();
    const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
    const proto = hdrs.get('x-forwarded-proto') ?? 'https';
    const redirectTo = `${proto}://${host}/davet`;

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo,
    });
    if (error) {
      const message = error.message.includes('already been registered') || error.message.includes('already registered')
        ? 'Bu e-posta adresi zaten kayıtlı.'
        : 'Davet gönderilemedi.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await supabaseAdmin.from('audit_log').insert({ actor_id: user.id, action: 'team_invite', details: { email } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team invite error:', error);
    void reportSystemError('api:team-invite', error);
    return NextResponse.json({ error: 'Davet gönderilirken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
