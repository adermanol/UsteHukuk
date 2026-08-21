import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
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
