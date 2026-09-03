"use client"

import { useState } from 'react'
import { Loader2, KeyRound } from 'lucide-react'
import { supabase } from '@/core/database/supabase'

/** Kullanıcının kendi şifresini değiştirmesi için — özellikle bir hesap
 * yönetici tarafından Supabase Dashboard'dan elle (geçici bir şifreyle)
 * açıldığında, o kişinin şifresini kendi başına değiştirebilmesi için
 * gereklidir. Mevcut şifre önce `signInWithPassword` ile doğrulanır
 * (yalnızca aktif bir oturuma güvenmek yerine) — böylece açık bırakılmış
 * bir tarayıcı sekmesinden, mevcut şifreyi bilmeyen biri şifreyi
 * değiştiremez. */
export function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 8) {
      setMessage('Yeni şifre en az 8 karakter olmalıdır.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setMessage('Yeni şifreler eşleşmiyor.')
      return
    }

    setIsPending(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const email = userData.user?.email
      if (!email) {
        setMessage('Oturum bilgisi alınamadı, lütfen tekrar giriş yapın.')
        return
      }

      // Mevcut şifreyi doğrula.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (signInError) {
        setMessage('Mevcut şifreniz hatalı.')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setMessage('Şifre güncellenemedi: ' + updateError.message)
        return
      }

      setMessage('Şifreniz güncellendi.')
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Mevcut Şifre</label>
        <input
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--primary)]/40"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Yeni Şifre</label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="En az 8 karakter"
          required
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--primary)]/40"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Yeni Şifre (Tekrar)</label>
        <input
          type="password"
          value={newPasswordConfirm}
          onChange={e => setNewPasswordConfirm(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--primary)]/40"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
        {isPending ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
      </button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </form>
  )
}
