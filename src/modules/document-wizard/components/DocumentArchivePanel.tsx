"use client"

import { useEffect, useState } from 'react'
import { FolderArchive, User, X } from 'lucide-react'
import { CasePicker } from './CasePicker'
import { ClientPicker } from './ClientPicker'
import { DocumentsSection } from '@/modules/attachments'
import { fetchClients, type ClientRow } from '@/modules/clients'
import { fetchCases, type CaseRow } from '@/modules/case-files'

type Mode = 'case' | 'client';

/**
 * Doküman Otomasyon Merkezi'nin "Belge Arşivi" bölümü: şablondan üretilmeyen,
 * dışarıdan gelen evrakı (karşı taraf dilekçesi, bilirkişi raporu, müvekkilin
 * gönderdiği taramalar…) sayfadan ayrılmadan bir dosyaya veya müvekkile
 * yüklemek için. Dosya ve Müvekkil ekranlarındaki belge bölümüyle aynı
 * bileşeni ve aynı depoyu kullanır — belge hangi ekrandan yüklenirse
 * yüklensin her üç yerde de görünür.
 */
export function DocumentArchivePanel() {
  const [mode, setMode] = useState<Mode>('case');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);

  useEffect(() => {
    fetchClients(500).then(setClients).catch(() => setClients([]));
    fetchCases(500).then(setCases).catch(() => setCases([]));
  }, []);

  const tabClass = (active: boolean) =>
    `text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]'
        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
          <FolderArchive size={18} className="text-[var(--primary)]" /> Belge Arşivi
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Şablondan üretilmeyen evrakı — karşı taraf dilekçesi, bilirkişi raporu, müvekkilden gelen taramalar — bir dosyaya veya müvekkile yükleyin.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Belgenin bağlanacağı kayıt">
        <button type="button" role="tab" aria-selected={mode === 'case'} className={tabClass(mode === 'case')} onClick={() => setMode('case')}>
          Dosyaya yükle
        </button>
        <button type="button" role="tab" aria-selected={mode === 'client'} className={tabClass(mode === 'client')} onClick={() => setMode('client')}>
          Müvekkile yükle
        </button>
      </div>

      {mode === 'case' && (
        <div className="space-y-4">
          <CasePicker cases={cases} selected={selectedCase} onSelect={setSelectedCase} />
          {selectedCase
            ? <DocumentsSection target="case" targetId={selectedCase.id} />
            : <p className="text-xs text-muted-foreground">Belgelerini görmek ve yükleme yapmak için bir dosya seçin.</p>}
        </div>
      )}

      {mode === 'client' && (
        <div className="space-y-4">
          {selectedClient ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-sm">
              <span className="flex items-center gap-2 min-w-0 text-foreground">
                <User size={14} className="text-[var(--primary)] shrink-0" />
                <span className="truncate">{selectedClient.full_name}</span>
              </span>
              <button type="button" onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Kaldır">
                <X size={14} />
              </button>
            </div>
          ) : (
            <ClientPicker clients={clients} onSelect={setSelectedClient} />
          )}
          {selectedClient
            ? <DocumentsSection target="client" targetId={selectedClient.id} title="Müvekkil Belgeleri" />
            : <p className="text-xs text-muted-foreground">Belgelerini görmek ve yükleme yapmak için bir müvekkil seçin.</p>}
        </div>
      )}
    </div>
  );
}
