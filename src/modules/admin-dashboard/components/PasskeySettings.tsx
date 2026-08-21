"use client"

import { useEffect, useState } from 'react'
import { Fingerprint, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/core/database/supabase'

type PasskeyItem = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

/** Passkey (WebAuthn) kaydı — cihazın kendi donanımını (parmak izi/Face ID/
 * Windows Hello/güvenlik anahtarı) kullanan, parolasız/phishing-dirençli
 * bir kimlik bilgisi. `supabase.auth.registerPasskey()` seremoniyi
 * (navigator.credentials.create()) tamamen kendisi yürütür — Supabase'in
 * kendi tarafında Authentication → Passkeys ekranından bir kerelik Relying
 * Party ayarı yapılmış olması gerekir (bkz. DEPLOYMENT.md). */
export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = () => {
    supabase.auth.passkey.list().then(({ data, error }) => {
      if (error) { setPasskeys([]); return; }
      setPasskeys(data ?? []);
    });
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async () => {
    setIsRegistering(true);
    setMessage(null);
    const { error } = await supabase.auth.registerPasskey();
    setIsRegistering(false);
    if (error) {
      setMessage('Passkey eklenemedi: ' + error.message);
      return;
    }
    setMessage('Passkey eklendi.');
    load();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Bu passkey\'i kaldırmak istediğinize emin misiniz?')) return;
    setRemovingId(id);
    const { error } = await supabase.auth.passkey.delete({ passkeyId: id });
    setRemovingId(null);
    if (error) {
      setMessage('Kaldırılamadı: ' + error.message);
      return;
    }
    setMessage('Passkey kaldırıldı.');
    load();
  };

  if (passkeys === null) return <p className="text-sm text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="space-y-3">
      {passkeys.length > 0 && (
        <ul className="space-y-2">
          {passkeys.map(pk => (
            <li key={pk.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/40">
              <div className="flex items-center gap-3 min-w-0">
                <Fingerprint size={18} className="text-[var(--primary)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{pk.friendly_name || 'Passkey'}</p>
                  <p className="text-xs text-muted-foreground">
                    Eklendi: {new Date(pk.created_at).toLocaleDateString('tr-TR')}
                    {pk.last_used_at && ` · Son kullanım: ${new Date(pk.last_used_at).toLocaleDateString('tr-TR')}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(pk.id)}
                disabled={removingId === pk.id}
                className="min-w-9 min-h-9 flex items-center justify-center text-red-400/70 hover:text-red-400 transition-colors shrink-0 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleRegister}
        disabled={isRegistering}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
      >
        {isRegistering ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
        {isRegistering ? 'Bekleniyor...' : 'Bu Cihazı Passkey Olarak Ekle'}
      </button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
