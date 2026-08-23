import { createBrowserClient } from '@supabase/ssr'

// Bkz. supabase-admin.ts'deki not. Bu dosya hem tarayıcıda (client bundle,
// NEXT_PUBLIC_ değişkenleri orada doğru gömülür) hem de sunucu tarafında
// (`isMockSupabase()` üzerinden `src/lib/auth.ts`'teki `login()` server
// action'ı gibi "use server" bağlamlarından) kullanılıyor — o ikinci
// bağlamda `NEXT_PUBLIC_` değişkenleri çalışma zamanında görünmeyebiliyor.
// Tarayıcıda `SUPABASE_URL` (önek'siz) hiçbir zaman client paketine
// gömülmez (bilerek — sır olmayan ama yine de NEXT_PUBLIC_ dışı bir
// değişken), bu yüzden orada güvenle `undefined` kalıp ikinci ifadeye
// (doğru gömülen NEXT_PUBLIC_ sürümüne) düşer.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Supabase yapılandırılmamışken (env değişkenleri eksik) tüm servisler bu
// bayrağı kontrol edip gerçek bir sorgu göndermeden önce çıkmalı.
export const isMockSupabase = () => !supabaseUrl || !supabaseAnonKey

// Client component'lerde kullanılan tarayıcı istemcisi. Session, middleware
// (proxy.ts) ve server component'lerin okuyabilmesi için cookie'de tutulur.
//
// `experimental.passkey: true` — cihazın kendi donanımını (parmak izi/Face
// ID/Windows Hello/Secure Enclave) kullanan WebAuthn passkey girişini açar
// (bkz. src/app/login/page.tsx, src/modules/admin-dashboard/components/
// PasskeySettings.tsx). Supabase'in kendi tarafında da projenin Authentication
// → Passkeys ekranından bir kerelik Relying Party ayarı yapılmadan çalışmaz
// — bu, büronun kendi Supabase projesinde kendisinin yapacağı, geliştiricinin
// sürekli müdahalesini gerektirmeyen bir adımdır (bkz. DEPLOYMENT.md).
export const supabase = createBrowserClient(
  supabaseUrl || 'https://not-configured.supabase.co',
  supabaseAnonKey || 'not-configured',
  { auth: { experimental: { passkey: true } } }
)
