import { createServerSupabaseClient } from '../database/supabase-server'

export const getUser = async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }
  return user
}

export const signOut = async () => {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
}
