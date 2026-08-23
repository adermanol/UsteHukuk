"use client"

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, isMockSupabase } from '@/core/database/supabase'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { getTotalTokens, resetTokenCounter } from '@/lib/tokenCounter'
import { isChatAvailable } from '@/lib/llmSettings'
import { fetchCurrentProfile } from '@/modules/team'
import { SystemErrorsCard } from './SystemErrorsCard'
import { GettingStartedHint } from './GettingStartedHint'

interface LlmLog {
  id: string;
  module: string;
  tokens_used: number;
  created_at: string;
}

interface ClientRow {
  id: string;
  full_name: string;
  created_at: string;
}

const NOT_CONFIGURED_STATS = [
  { title: 'Aktif Başvurular', value: '—' },
  { title: 'Açık Dosya', value: '—' },
  { title: 'İşlenen Token Sayısı', value: '—' },
  { title: 'Sistem Durumu', value: 'Yapılandırılmadı' }
]

export function Dashboard() {
  const [stats, setStats] = useState(NOT_CONFIGURED_STATS)
  const [logs, setLogs] = useState<LlmLog[] | null>(null)
  const [recentClients, setRecentClients] = useState<ClientRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPrivileged, setIsPrivileged] = useState(false)
  const [llmAvailable, setLlmAvailable] = useState(true)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [isResetting, startReset] = useTransition()

  const loadStats = async () => {
    if (isMockSupabase()) return;

    try {
      const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { count: openCaseCount } = await supabase.from('cases').select('*', { count: 'exact', head: true }).in('status', ['aktif', 'istinaf', 'temyiz']);

      const { data: logsData, error: logsError } = await supabase
        .from('llm_logs')
        .select('id, module, tokens_used, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (logsError) throw logsError;

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (clientsError) throw clientsError;

      const profile = await fetchCurrentProfile().catch(() => null);
      const privileged = profile?.role === 'yonetici' || profile?.role === 'master';
      setIsPrivileged(privileged);
      // llm_logs SELECT RLS artık yalnızca yönetici/master'a açık (bkz.
      // 20260805000000_security_hardening.sql) — avukat/stajyer için
      // gerçek toplamı sorgulamak yerine (ki 0 dönerdi, "hiç token
      // kullanılmadı" gibi yanlış bir izlenim verirdi) doğrudan "—" gösterilir.
      const tokenValue = privileged ? `${(await getTotalTokens()).toLocaleString('tr-TR')}` : '—';
      // Gerçekten çalışan bir LLM sağlayıcısı yoksa (bkz. llmSettings.ts)
      // bu istatistik büsbütün anlamsız — hiç göstermiyoruz.
      const chatAvailable = await isChatAvailable().catch(() => true);
      setLlmAvailable(chatAvailable);

      setStats([
        { title: 'Aktif Başvurular', value: `${clientCount || 0}` },
        { title: 'Açık Dosya', value: `${openCaseCount ?? '—'}` },
        ...(chatAvailable ? [{ title: 'İşlenen Token Sayısı', value: tokenValue }] : []),
        { title: 'Sistem Durumu', value: 'Online' }
      ])
      setLogs(logsData ?? [])
      setRecentClients(clientsData ?? [])
    } catch (err) {
      console.error("Dashboard yüklenirken hata:", err)
      setError('Panel verileri yüklenirken bir hata oluştu.')
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleResetCounter = () => {
    setResetMessage(null);
    startReset(async () => {
      const result = await resetTokenCounter();
      setResetMessage(result.message);
      if (result.success) await loadStats();
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Yönetim Paneli</h2>
      <GettingStartedHint />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.title === 'İşlenen Token Sayısı' && isPrivileged && (
                <button
                  type="button"
                  onClick={handleResetCounter}
                  disabled={isResetting}
                  title="Sayacı sıfırla (geçmiş kayıtlar silinmez)"
                  className="text-muted-foreground hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={14} className={isResetting ? 'animate-spin' : ''} />
                </button>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.title === 'İşlenen Token Sayısı' && resetMessage && (
                <p className="text-xs text-muted-foreground mt-1">{resetMessage}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isMockSupabase() && (
        <Card className="border-amber-500/30">
          <CardContent className="flex items-center gap-3 pt-6 text-amber-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Supabase yapılandırılmadı. Gerçek verileri görmek için .env.local dosyasına NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.
          </CardContent>
        </Card>
      )}

      {isPrivileged && <SystemErrorsCard />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {llmAvailable && (
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Sistem Aktiviteleri</CardTitle>
              <CardDescription>Son AI kullanım detayları (llm_logs).</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {!error && !isPrivileged && logs !== null && (
                <p className="text-sm text-muted-foreground">Bu bölüm yalnızca yönetici/master rolüne açıktır — AI kullanım kayıtları müvekkil detayları içerebilir.</p>
              )}
              {!error && logs === null && !isMockSupabase() && (
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              )}
              {!error && isMockSupabase() && (
                <p className="text-sm text-muted-foreground">Yapılandırılmadı.</p>
              )}
              {!error && isPrivileged && logs !== null && logs.length === 0 && (
                <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
              )}
              {!error && isPrivileged && logs && logs.length > 0 && (
                <ul className="space-y-2">
                  {logs.map(log => (
                    <li key={log.id} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                      <span className="text-muted-foreground">{log.module}</span>
                      <span className="font-mono">{log.tokens_used} token</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
        <Card className={llmAvailable ? 'col-span-3' : 'col-span-7'}>
          <CardHeader>
            <CardTitle>Son Başvurular</CardTitle>
            <CardDescription>Yakın zamanda kaydedilen müvekkil adayları (clients).</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!error && recentClients === null && !isMockSupabase() && (
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            )}
            {!error && isMockSupabase() && (
              <p className="text-sm text-muted-foreground">Yapılandırılmadı.</p>
            )}
            {!error && recentClients !== null && recentClients.length === 0 && (
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">Henüz başvuru yok.</p>
                <p className="text-xs text-muted-foreground">Başvurular, herkese açık web sitenizdeki danışma formundan otomatik gelir. Bu ekranı ilk kez mi görüyorsunuz? <Link href="/dashboard/dosyalar" className="text-[var(--primary)] hover:underline">Dosyalar</Link> bölümünden manuel olarak da bir dosya açabilirsiniz.</p>
              </div>
            )}
            {!error && recentClients && recentClients.length > 0 && (
              <ul className="space-y-2">
                {recentClients.map(c => (
                  <li key={c.id} className="text-sm border-b border-border/50 pb-2 last:border-0">
                    <Link href="/dashboard/applications" className="hover:text-primary transition-colors">
                      {c.full_name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/dashboard/applications" className="inline-block mt-3 text-xs text-primary hover:underline">
              Tümünü Gör →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
