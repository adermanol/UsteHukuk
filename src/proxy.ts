import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Bkz. supabase-admin.ts'deki not — middleware Edge runtime'da çalışır,
// bu da ayrı bir çalışma zamanı ortamıdır; aynı önlem burada da alınır.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const isProtected = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/business-card') ||
    request.nextUrl.pathname.startsWith('/master')

  if (!isProtected) {
    return response
  }

  // Supabase yapılandırılmamışsa (env eksik) korumalı alana erişim engellenir;
  // sahte bir "giriş yapılmış" durumu simüle edilmez.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // MFA (TOTP): bir kullanıcı kendi kimlik doğrulayıcısını bağlamış
  // (bkz. src/modules/admin-dashboard/components/MfaSettings.tsx) ama bu
  // oturumda henüz aal2'ye yükseltmemişse (login sırasında kod adımını
  // atlamış veya eski bir aal1 cookie'siyle geliyorsa) korumalı alana
  // erişim engellenir. Bu kontrol yalnızca doğrulanmış bir TOTP faktörü
  // OLAN kullanıcıları etkiler — MFA hiç kurmamış kullanıcılar için
  // nextLevel === currentLevel olur, davranış değişmez.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/business-card/:path*', '/master/:path*'],
}
