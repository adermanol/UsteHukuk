import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Bkz. supabase-admin.ts'deki not: server-only modüllerde `NEXT_PUBLIC_`
// önekli değişkenler çalışma zamanında görünmeyebiliyor — önce önek'siz
// düz isim denenir, sonra `NEXT_PUBLIC_` sürümüne düşülür.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://not-configured.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'not-configured'

// Server component'ler ve server action'lar için: session'ı Next.js cookie
// deposundan okur/yazar, böylece proxy.ts (middleware) ile aynı session'ı paylaşır.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server component içinden çağrılırsa cookie yazılamaz; proxy.ts
          // her istekte session'ı zaten tazeliyor, bu yüzden yok sayılabilir.
        }
      },
    },
  })
}
