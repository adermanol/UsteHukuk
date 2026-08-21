"use client"

import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'
import { supabase } from '@/core/database/supabase'

type Factor = { id: string; friendly_name?: string; status: string };

/** Supabase Auth'un yerleşik TOTP MFA'sı. Kayıt tamamen bu tarayıcı
 * oturumundan yürütülür (`supabase.auth.mfa.*`); oturumu aal2'ye yükseltme
 * adımı ise login sırasında `src/lib/auth.ts`'te ayrıca yapılır — burada
 * yalnızca kurulum/kaldırma akışı vardır. */
export function MfaSettings() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const loadFactors = () => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactors((data?.totp ?? []) as Factor[]);
    });
  };

  useEffect(() => { loadFactors(); }, []);

  const startEnroll = async () => {
    setMessage(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) {
      setMessage('Kurulum başlatılamadı: ' + (error?.message ?? 'bilinmeyen hata'));
      return;
    }
    setEnrolling({ factorId: data.id, qrCode: `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`, secret: data.totp.secret });
  };

  const confirmEnroll = async () => {
    if (!enrolling) return;
    setIsPending(true);
    setMessage(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (challengeError || !challenge) {
      setMessage('Doğrulama başlatılamadı: ' + (challengeError?.message ?? 'bilinmeyen hata'));
      setIsPending(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrolling.factorId, challengeId: challenge.id, code });
    setIsPending(false);
    if (verifyError) {
      setMessage('Kod hatalı: ' + verifyError.message);
      return;
    }
    setMessage('Kimlik doğrulayıcı başarıyla bağlandı. Bir sonraki girişte kod istenecek.');
    setEnrolling(null);
    setCode('');
    loadFactors();
  };

  const unenroll = async (factorId: string) => {
    if (!confirm('Bu kimlik doğrulayıcıyı kaldırmak istediğinize emin misiniz? Kaldırdıktan sonra girişte kod istenmeyecek.')) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setMessage('Kaldırılamadı: ' + error.message);
      return;
    }
    setMessage('Kimlik doğrulayıcı kaldırıldı.');
    loadFactors();
  };

  if (factors === null) return <p className="text-sm text-muted-foreground">Yükleniyor...</p>;

  const verifiedFactor = factors.find(f => f.status === 'verified');

  return (
    <div className="space-y-4">
      {verifiedFactor ? (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">İki adımlı doğrulama etkin</p>
              <p className="text-xs text-muted-foreground">{verifiedFactor.friendly_name || 'Kimlik Doğrulayıcı Uygulaması'}</p>
            </div>
          </div>
          <button
            onClick={() => unenroll(verifiedFactor.id)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
          >
            <ShieldOff size={14} /> Kaldır
          </button>
        </div>
      ) : enrolling ? (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/40">
          <p className="text-sm text-muted-foreground">Google Authenticator, 1Password veya benzeri bir uygulamayla aşağıdaki kodu tarayın, ardından uygulamanın gösterdiği 6 haneli kodu girin.</p>
          <img src={enrolling.qrCode} alt="QR kodu" className="w-40 h-40 mx-auto rounded-lg bg-white p-2" />
          <p className="text-xs text-muted-foreground text-center">Taratamıyorsanız manuel girin: <span className="font-mono text-foreground">{enrolling.secret}</span></p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-foreground focus:outline-none focus:border-[var(--primary)]"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={confirmEnroll}
              disabled={isPending || code.length !== 6}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />} Doğrula ve Etkinleştir
            </button>
            <button
              onClick={() => { setEnrolling(null); setCode(''); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startEnroll}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
        >
          <ShieldCheck size={16} /> Kimlik Doğrulayıcı Uygulaması Bağla
        </button>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
