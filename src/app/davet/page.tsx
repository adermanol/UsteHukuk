"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/core/database/supabase'
import { Lock, UserCheck } from 'lucide-react'

/** Ekip panelindeki davet linkine tıklayan yeni kullanıcının indiği sayfa
 * (bkz. /api/team-invite'daki redirectTo). Supabase'in davet e-postası
 * linki, tarayıcıda otomatik olarak geçici bir oturum kurar (`supabase`
 * istemcisi `detectSessionInUrl` ile bunu kendisi halleder) — burada
 * yalnızca o oturumla yeni bir şifre belirlenir. */
export default function DavetPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setFullName((data.user.user_metadata?.full_name as string) || '')
        setStatus('ready')
      } else {
        setStatus('invalid')
      }
    })
  }, [])

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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName },
    })
    setIsLoading(false)

    if (updateError) {
      setError('Şifre belirlenemedi: ' + updateError.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Kontrol ediliyor...</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-serif text-foreground">Davet Bağlantısı Geçersiz</h1>
          <p className="text-sm text-muted-foreground">
            Bu davet bağlantısı süresi dolmuş veya daha önce kullanılmış olabilir. Sistem yöneticinizden yeni bir davet istemeniz gerekebilir.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[var(--background)] border border-border rounded-3xl p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-6">
              <img src="/logo-icon.svg" alt="Üste Hukuk" width={28} height={32} className="h-8 w-auto" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Davete Hoş Geldiniz</h1>
            <p className="text-muted-foreground text-sm tracking-widest uppercase font-medium text-center">
              Hesabınızı Etkinleştirin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Ad Soyad</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                  placeholder="Adınız Soyadınız"
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
              disabled={isLoading || !fullName || !password || !passwordConfirm}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(100,50,250,0.3)] disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-sm"
            >
              {isLoading ? 'Kaydediliyor...' : 'Şifremi Belirle ve Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
