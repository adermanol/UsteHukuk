import { NextResponse } from 'next/server'

// TEMP-DEBUG-ONLY: SUPABASE_SERVICE_ROLE_KEY canlıda neden algılanmıyor
// sorusunu teşhis etmek için — hiçbir gizli değer döndürmez, yalnızca
// hangi ortam değişkenlerinin sunucu tarafında görünür olduğunu raporlar.
// Teşhis bitince bu route silinecek. force-dynamic: aksi halde bu route de
// build anında statik olarak dondurulup env değişikliklerini yansıtmaz.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  })
}
