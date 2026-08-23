import { createBrowserClient } from '@supabase/ssr'

declare global {
  interface Window {
    __SUPABASE_ENV__?: { url: string; anonKey: string };
  }
}

// Bkz. supabase-admin.ts'deki not. Bu dosya hem tarayıcıda hem sunucuda
// (`isMockSupabase()` üzerinden `src/lib/auth.ts`'teki `login()` server
// action'ı gibi "use server" bağlamlarından) kullanılıyor.
//
// Canlıya alma teşhisi (2026-08-21): bu ortamda `NEXT_PUBLIC_` önekli
// değişkenler ne sunucu tarafında ne de tarayıcı paketinde build-anında
// güvenilir şekilde gömülmüyor/görünüyor — ne olduğu netleşmedi ama
// gözlemlenen davranış bu. Bu yüzden öncelik sırası: (1) `window.__SUPABASE_ENV__`
// (kök layout'ta bir Server Component tarafından yazılan, sunucu tarafında
// güvenilir şekilde okunan değer — bkz. src/app/layout.tsx), (2) önek'siz
// `SUPABASE_URL`/`SUPABASE_ANON_KEY` (sunucu bağlamları için, örn. bu
// dosyanın "use server" bir dosyadan içe aktarıldığı durumlar), (3) en son
// çare olarak `NEXT_PUBLIC_` sürümleri (yerel `next dev` için — orada bu
// sorun gözlemlenmedi).
const runtimeEnv = typeof window !== 'undefined' ? window.__SUPABASE_ENV__ : undefined;
const supabaseUrl = runtimeEnv?.url || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = runtimeEnv?.anonKey || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
