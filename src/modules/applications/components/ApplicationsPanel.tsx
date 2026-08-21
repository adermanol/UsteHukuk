"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertTriangle, Download, Mail, MessageCircle, Pencil, Phone, Trash2, X } from 'lucide-react'
import {
  fetchApplications,
  updateApplicationStatus,
  updateApplication,
  deleteApplication,
  ApplicationRow,
  ApplicationStatus,
  EditableApplicationFields,
  ApplicationsNotConfiguredError,
} from '../services/applicationsRepository'
import { PRACTICE_AREA_TAXONOMY, recordAliasIfNew } from '@/modules/practice-areas'

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Beklemede',
  active: 'Aktif',
  resolved: 'Sonuçlandı',
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: 'text-amber-400 bg-amber-500/10',
  active: 'text-emerald-400 bg-emerald-500/10',
  resolved: 'text-muted-foreground bg-gray-500/10',
};

const SOURCE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  website_consultation: 'Web Sitesi',
};

const CONSENT_LABELS: Record<string, string> = {
  fee_notice: 'Avukatlık Kanunu ücret bilgilendirmesi onayı',
  kvkk: 'KVKK açık rıza onayı',
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

export function ApplicationsPanel() {
  const [items, setItems] = useState<ApplicationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<EditableApplicationFields | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const data = await fetchApplications(100);
      setItems(data);
    } catch (err) {
      if (err instanceof ApplicationsNotConfiguredError) {
        setError(err.message);
      } else {
        console.error('Başvurular yüklenemedi:', err);
        setError('Başvurular yüklenirken beklenmeyen bir hata oluştu.');
      }
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = useMemo(() => items?.find(i => i.id === selectedId) ?? null, [items, selectedId]);

  // Farklı bir başvuruya geçildiğinde yarım kalmış düzenlemeyi terk et.
  useEffect(() => {
    setIsEditing(false);
    setEditFields(null);
  }, [selectedId]);

  const handleStatusChange = (id: string, status: ApplicationStatus) => {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await updateApplicationStatus(id, status);
      setStatusMessage(result.message);
      if (result.success) {
        setItems(prev => prev?.map(i => (i.id === id ? { ...i, status } : i)) ?? prev);
      }
    });
  };

  const startEdit = () => {
    if (!selected) return;
    setEditFields({
      full_name: selected.full_name,
      email: selected.email,
      phone: selected.phone,
      case_type: selected.case_type,
      practice_area_id: selected.practice_area_id,
      details: selected.details,
      preferred_channel: selected.preferred_channel,
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditFields(null);
  };

  const saveEdit = () => {
    if (!selected || !editFields) return;
    setStatusMessage(null);
    // Hukuki alan seçilmişse case_type'ı okunur etikete eşitle — geriye
    // dönük uyumluluk için (henüz practice_area_id'ye normalize edilmemiş
    // eski kayıtları listeleyen kodlar hâlâ case_type'ı okuyor).
    const area = PRACTICE_AREA_TAXONOMY.find(a => a.id === editFields.practice_area_id);
    const fields = { ...editFields, case_type: area?.labelTr ?? editFields.case_type };
    // Eski serbest metin bir alana daha önce hiç bağlanmamışsa, aynı metin
    // bir daha görüldüğünde otomatik çözülsün diye alias tablosuna yazılır.
    if (selected.practice_area_id === null && selected.case_type && fields.practice_area_id) {
      recordAliasIfNew(selected.case_type, fields.practice_area_id);
    }
    startTransition(async () => {
      const result = await updateApplication(selected.id, fields);
      setStatusMessage(result.message);
      if (result.success) {
        setItems(prev => prev?.map(i => (i.id === selected.id ? { ...i, ...fields } : i)) ?? prev);
        setIsEditing(false);
        setEditFields(null);
      }
    });
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`"${selected.full_name}" adlı başvuruyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setIsDeleting(true);
    const result = await deleteApplication(selected.id);
    setIsDeleting(false);
    if (result.success) {
      setItems(prev => prev?.filter(i => i.id !== selected.id) ?? prev);
      setSelectedId(null);
    } else {
      setStatusMessage(result.message);
    }
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Başvurular Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
        {items === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {items !== null && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz başvuru yok.</p>
        )}
        {items?.map(item => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className={`w-full text-left bg-muted hover:bg-muted border rounded-xl p-3 transition-colors ${
              selectedId === item.id ? 'border-[var(--primary)]/40' : 'border-border hover:border-[var(--primary)]/20'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              {item.source && (
                <span className="text-[10px] text-muted-foreground">{SOURCE_LABELS[item.source] ?? item.source}</span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">{formatRelativeTime(item.created_at)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{item.full_name}</p>
            {item.case_type && <p className="text-xs text-muted-foreground mt-0.5">{item.case_type}</p>}
          </button>
        ))}
      </div>

      <div className="lg:col-span-3">
        {!selected && (
          <div className="glass-card p-8 text-center h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Detayları görmek için soldan bir başvuru seçin.</p>
          </div>
        )}
        {selected && (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    value={editFields?.full_name ?? ''}
                    onChange={e => setEditFields(f => f && { ...f, full_name: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-2 py-1 text-lg font-serif text-foreground outline-none focus:border-[var(--primary)]/40"
                  />
                ) : (
                  <h3 className="font-serif text-xl text-foreground">{selected.full_name}</h3>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRelativeTime(selected.created_at)} · {selected.source ? (SOURCE_LABELS[selected.source] ?? selected.source) : 'Bilinmiyor'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!isEditing && (
                  <>
                    <button onClick={startEdit} className="p-1.5 text-muted-foreground hover:text-[var(--primary)] transition-colors" aria-label="Düzenle">
                      <Pencil size={15} />
                    </button>
                    <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-40" aria-label="Sil">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedId(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors lg:hidden" aria-label="Kapat">
                  <X size={16} />
                </button>
              </div>
            </div>

            {isEditing && editFields ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">E-posta</label>
                    <input
                      value={editFields.email ?? ''}
                      onChange={e => setEditFields(f => f && { ...f, email: e.target.value || null })}
                      className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Telefon</label>
                    <input
                      value={editFields.phone ?? ''}
                      onChange={e => setEditFields(f => f && { ...f, phone: e.target.value || null })}
                      className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Hukuki Alan</label>
                  <select
                    value={editFields.practice_area_id ?? ''}
                    onChange={e => setEditFields(f => f && { ...f, practice_area_id: e.target.value || null })}
                    className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
                  >
                    <option value="" className="bg-[var(--background)]">Eşleştirilmemiş</option>
                    {PRACTICE_AREA_TAXONOMY.map(area => (
                      <option key={area.id} value={area.id} className="bg-[var(--background)]">{area.labelTr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Tercih Edilen Görüşme Kanalı</label>
                  <input
                    value={editFields.preferred_channel ?? ''}
                    onChange={e => setEditFields(f => f && { ...f, preferred_channel: e.target.value || null })}
                    className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">Özet</label>
                  <textarea
                    value={editFields.details ?? ''}
                    onChange={e => setEditFields(f => f && { ...f, details: e.target.value || null })}
                    rows={4}
                    className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40 resize-y"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={isPending || !editFields.full_name.trim()}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 hover:text-[var(--primary)] transition-colors">
                      <Mail size={13} /> {selected.email}
                    </a>
                  )}
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="flex items-center gap-1.5 hover:text-[var(--primary)] transition-colors">
                      <Phone size={13} /> {selected.phone}
                    </a>
                  )}
                  {selected.preferred_channel && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageCircle size={13} /> Tercih: {selected.preferred_channel}
                    </span>
                  )}
                </div>

                {selected.case_type && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Hukuki Alan</p>
                    <p className="text-sm text-muted-foreground">
                      {selected.case_type}
                      {!selected.practice_area_id && (
                        <span className="ml-2 text-[10px] text-amber-400 align-middle">eşleştirilmemiş</span>
                      )}
                    </p>
                  </div>
                )}

                {selected.details && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Özet</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selected.details}</p>
                  </div>
                )}
              </>
            )}

            {!isEditing && selected.attachment_url && (
              <a
                href={selected.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline w-fit"
              >
                <Download size={14} /> Ek dosyayı görüntüle
              </a>
            )}

            {selected.consents && Object.keys(selected.consents).length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Onaylar</p>
                <ul className="space-y-1">
                  {Object.entries(selected.consents)
                    .filter(([key]) => key !== 'timestamp')
                    .map(([key, value]) => (
                      <li key={key} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className={value ? 'text-emerald-400' : 'text-rose-400'}>{value ? '✓' : '✗'}</span>
                        {CONSENT_LABELS[key] ?? key}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Durum</p>
              <div className="flex items-center gap-2">
                <select
                  value={selected.status}
                  disabled={isPending}
                  onChange={e => handleStatusChange(selected.id, e.target.value as ApplicationStatus)}
                  className="bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
                >
                  {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(s => (
                    <option key={s} value={s} className="bg-[var(--background)]">{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {statusMessage && <span className="text-xs text-muted-foreground">{statusMessage}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
