"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFirstAccount } from '@/lib/auth'
import { supabase } from '@/core/database/supabase'
import { UserPlus, Lock, Mail, User } from 'lucide-react'

export function FirstSetupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setIsLoading(true)
    const result = await createFirstAccount(email, password, fullName)

    if (!result.success) {
      setError(result.message || 'Hesap oluşturulamadı.')
      setIsLoading(false)
      return
    }

    // Hesap sunucu tarafında (servis rolüyle) oluşturuldu — şimdi normal
    // parola girişiyle bu tarayıcıda oturum açıp doğrudan panele yönlendirir.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      router.push('/login')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[var(--background)] border border-border rounded-3xl p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-6">
              <img src="/logo-icon.svg" alt="LawLM" width={28} height={32} className="h-8 w-auto" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">İlk Kurulum</h1>
            <p className="text-muted-foreground text-sm tracking-widest uppercase font-medium text-center">
              Büronuzun İlk Yönetici Hesabını Oluşturun
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Ad Soyad</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                  placeholder="Av. Adınız Soyadınız"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">E-posta</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                  placeholder="avukat@buro.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Şifre</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Şifre (Tekrar)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                  placeholder="Şifrenizi tekrar girin"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm font-medium bg-red-400/10 border border-red-400/20 rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !fullName || !email || !password || !passwordConfirm}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(100,50,250,0.3)] disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {isLoading ? 'Oluşturuluyor...' : 'Hesabı Oluştur ve Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-8 font-medium">
          Bu ekran yalnızca büronun ilk hesabı açılana kadar aktiftir; bir hesap oluşturulduktan sonra kalıcı olarak kapanır.
        </p>
      </div>
    </div>
  )
}
