"use client"

import { useEffect, useState, useTransition } from 'react'
import { Link2, Copy, Check } from 'lucide-react'
import { fetchStatusLinkInfo, generateStatusLink, revokeStatusLink, StatusLinkInfo } from '../services/statusLinkService'

/** Bir (dosya, müvekkil) çifti için durum linki yönetim kontrolü —
 * hem CasesPanel'in dosya detayında (her taraf için) hem ClientsPanel'in
 * müvekkil detayında (her dosya için) kullanılan, tek paylaşılan parça. */
export function CaseStatusLinks({ caseId, clientId }: { caseId: string; clientId: string; clientName?: string }) {
  const [info, setInfo] = useState<StatusLinkInfo | null | undefined>(undefined);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => { fetchStatusLinkInfo(caseId, clientId).then(setInfo).catch(() => setInfo(null)); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId, clientId]);

  const handleGenerate = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await generateStatusLink(caseId, clientId);
      if (res.success && res.path) {
        setNewUrl(`${window.location.origin}${res.path}`);
        load();
      } else {
        setMessage(res.message);
      }
    });
  };

  const handleRevoke = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await revokeStatusLink(caseId, clientId);
      setMessage(res.message);
      setNewUrl(null);
      load();
    });
  };

  const handleCopy = () => {
    if (!newUrl) return;
    navigator.clipboard.writeText(newUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (info === undefined) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-border mt-1">
      <Link2 size={12} className="text-muted-foreground shrink-0" />
      {newUrl ? (
        <div className="flex items-center gap-2 bg-muted border border-[var(--primary)]/30 rounded-lg px-2 py-1">
          <span className="text-muted-foreground truncate max-w-[220px]">{newUrl}</span>
          <button onClick={handleCopy} className="text-[var(--primary)] hover:opacity-80 shrink-0" aria-label="Kopyala">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      ) : info?.isActive ? (
        <>
          <span className="text-muted-foreground">
            Durum linki aktif{info.lastAccessedAt ? ` · son erişim ${new Date(info.lastAccessedAt).toLocaleDateString('tr-TR')}` : ''}
          </span>
          <button onClick={handleGenerate} disabled={isPending} className="text-muted-foreground hover:text-[var(--primary)] transition-colors">Yeni Link Oluştur</button>
          <button onClick={handleRevoke} disabled={isPending} className="text-muted-foreground hover:text-rose-400 transition-colors">Erişimi Kapat</button>
        </>
      ) : (
        <button onClick={handleGenerate} disabled={isPending} className="text-[var(--primary)] hover:underline">Durum Linki Oluştur</button>
      )}
      {message && <span className="text-muted-foreground">{message}</span>}
      {newUrl && <span className="text-amber-400 text-[10px] w-full">Bu bağlantıyı bir daha göremezsiniz — şimdi kopyalayıp müvekkile iletin.</span>}
    </div>
  );
}
