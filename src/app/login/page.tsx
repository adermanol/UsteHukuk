"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, verifyMfaCode, logPasskeyLogin } from '@/lib/auth'
import { supabase } from '@/core/database/supabase'
import { Lock, ShieldCheck, Fingerprint } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const router = useRouter()

  // Passkey (WebAuthn): cihazın kendi donanımını (parmak izi/Face ID/
  // Windows Hello) kullanır, parolayı tamamen atlar. `signInWithPasskey`
  // tarayıcıda navigator.credentials.get() seremonisini kendisi yürütür.
  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true)
    setError('')
    const { error: passkeyError } = await supabase.auth.signInWithPasskey()
    if (passkeyError) {
      setError(passkeyError.message === 'AbortError'
        ? 'İşlem iptal edildi.'
        : 'Passkey ile giriş yapılamadı. Bu cihazda kayıtlı bir passkey olduğundan emin olun.')
      setIsPasskeyLoading(false)
      return
    }
    await logPasskeyLogin()
    router.push('/dashboard')
    router.refresh()
  }

  // MFA (TOTP) etkinleştirmiş bir kullanıcı için login() `mfaRequired` ile
  // döner — parola doğru ama oturum henüz aal2'ye yükselmemiştir. Bu
  // durumda ikinci bir adımla 6 haneli doğrulayıcı kodu istenir.
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string; challengeId: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await login(email, password)

    if (result.success && result.mfaRequired && result.factorId && result.challengeId) {
      setMfaChallenge({ factorId: result.factorId, challengeId: result.challengeId })
      setIsLoading(false)
    } else if (result.success) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError(result.message || 'Giriş başarısız')
      setIsLoading(false)
    }
  }

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaChallenge) return
    setIsLoading(true)
    setError('')

    const result = await verifyMfaCode(mfaChallenge.factorId, mfaChallenge.challengeId, mfaCode)
    if (result.success) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError(result.message || 'Doğrulama başarısız')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[var(--background)] border border-border rounded-3xl p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-6">
              <img src="/logo-icon.svg" alt="Üste Hukuk" width={28} height={32} className="h-8 w-auto" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Üste Hukuk</h1>
            <p className="text-muted-foreground text-sm tracking-widest uppercase font-medium">
              {mfaChallenge ? 'Kimlik Doğrulama' : 'Terminal Yetkilendirmesi'}
            </p>
          </div>

          {!mfaChallenge ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-4 text-foreground focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                  placeholder="avukat@buro.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Erişim Şifresi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                    placeholder="Şifrenizi girin..."
                    autoComplete="current-password"
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
                disabled={isLoading || !email || !password}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(100,50,250,0.3)] disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-sm"
              >
                {isLoading ? 'Doğrulanıyor...' : 'Sisteme Giriş Yap'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">veya</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={isPasskeyLoading}
                className="w-full flex items-center justify-center gap-2 border border-border hover:border-primary/40 text-foreground font-medium py-4 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                <Fingerprint className="h-5 w-5" />
                {isPasskeyLoading ? 'Bekleniyor...' : 'Passkey ile Giriş Yap'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyMfa} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Doğrulayıcı Uygulaması Kodu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 py-4 text-foreground tracking-[0.3em] text-center font-mono text-lg focus:outline-none focus:border-primary transition-colors focus:bg-accent"
                    placeholder="000000"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Kimlik doğrulayıcı uygulamanızdaki (Google Authenticator, 1Password vb.) 6 haneli kodu girin.</p>
              </div>

              {error && (
                <div className="text-red-400 text-sm font-medium bg-red-400/10 border border-red-400/20 rounded-lg p-3 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(100,50,250,0.3)] disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-sm"
              >
                {isLoading ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
              </button>
              <button
                type="button"
                onClick={() => { setMfaChallenge(null); setMfaCode(''); setError('') }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Geri dön
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-muted-foreground text-xs mt-8 font-medium">
          Bu alan sadece yetkili hukuk personeli içindir.
        </p>
        <p className="text-center text-muted-foreground text-xs mt-2">
          Büronun ilk hesabını mı açıyorsunuz?{' '}
          <Link href="/ilk-kurulum" className="text-primary hover:underline">İlk kurulum ekranına git</Link>
        </p>
      </div>
    </div>
  )
}
