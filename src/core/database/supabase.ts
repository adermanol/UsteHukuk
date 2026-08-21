import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
