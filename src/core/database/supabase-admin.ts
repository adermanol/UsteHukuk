import { createClient } from '@supabase/supabase-js'

// `SUPABASE_URL` (önek'siz) önceliklidir: canlıda gözlemlenen bir platform
// davranışı nedeniyle `NEXT_PUBLIC_` önekli değişkenler, yalnızca istemci
// paketine gömülmek üzere derleme-anında işlenir — saf sunucu-taraflı
// (server-only) modüllerin çalışma zamanı `process.env`'inde HER ZAMAN
// görünür olacakları garanti değildir (bkz. 2026-08-21 canlıya alma
// teşhisi: /api/debug-env, aynı `NEXT_PUBLIC_SUPABASE_URL` okuması istemci
// paketine bağlı dosyalarda çalışırken bu dosyada `undefined` döndü).
// Önek'siz `SUPABASE_URL` eklenirse (aynı değerle) bu belirsizliği bypass
// eder; eklenmezse `NEXT_PUBLIC_SUPABASE_URL`'e düşer (yerel geliştirme
// `.env.local`'i değiştirmeden çalışmaya devam eder).
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isSupabaseAdminConfigured = () => Boolean(supabaseUrl && serviceRoleKey)

// Yalnızca sunucu tarafında (API route / server action) kullanılır: RLS'i atlayarak
// legal_feed_items / legal_feed_runs gibi yalnızca sistemin yazması gereken tablolara
// yazmak için. Tarayıcıya asla import edilmemeli.
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://not-configured.supabase.co',
  serviceRoleKey || 'not-configured',
  { auth: { persistSession: false } }
)
