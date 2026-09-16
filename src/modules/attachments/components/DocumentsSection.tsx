"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, FileText, FileImage, FileSpreadsheet, File as FileIcon, Eye, Download, Trash2, Sparkles, X } from 'lucide-react'
import {
  requestAttachmentUpload,
  finalizeAttachmentUpload,
  fetchAttachments,
  getAttachmentDownloadUrl,
  deleteAttachment,
} from '../services/attachmentsRepository'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_CATEGORIES,
  ATTACHMENT_FILE_TYPES,
  MAX_ATTACHMENT_BYTES,
  categoryLabel,
  fileExtension,
  formatBytes,
  type AttachmentRow,
  type AttachmentTarget,
} from '../attachmentTypes'
import { getTemplate } from '@/modules/document-wizard/templates/registry'
import { DocumentViewerModal } from './DocumentViewerModal'

const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

interface QueueItem {
  key: string;
  name: string;
  progress: number;
  error: string | null;
}

function iconFor(format: string) {
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tif', 'tiff'].includes(format)) return FileImage;
  if (['xls', 'xlsx', 'ods', 'csv'].includes(format)) return FileSpreadsheet;
  if (['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'udf'].includes(format)) return FileText;
  return FileIcon;
}

/** Byte'ları sunucudan geçirmeden, imzalı URL'ye doğrudan yükler. fetch()
 * yükleme ilerlemesi bildirmediği için XMLHttpRequest kullanılır. Content-Type
 * açıkça kanonik türe ayarlanır — sunucu kayıt öncesi bunu doğrular. */
function putWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=3600');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Ağ hatası'));
    xhr.send(file);
  });
}

type DocumentsSectionProps = {
  target: AttachmentTarget;
  targetId: string;
  title?: string;
  emptyHint?: string;
};

/**
 * Bir dosyaya (case) veya müvekkile bağlı belgeler: avukatın yüklediği her
 * türlü evrak (PDF, görsel, Word/Excel, UYAP .udf…) ve — dosyalarda — Doküman
 * Otomasyonu'nun ürettiği belgeler tek listede. Dosya Kartı, Müvekkil detayı
 * ve Doküman Otomasyon Merkezi aynı bileşeni kullanır.
 */
export function DocumentsSection(props: DocumentsSectionProps) {
  // Kayıt değiştiğinde (ör. arşiv panelinde başka dosya seçildiğinde) liste,
  // kuyruk ve mesajların bir önceki kayda sızmaması için bileşen anahtarla
  // yeniden kurulur — efekt içinde durumu elle sıfırlamak yerine.
  return <DocumentsSectionInner key={`${props.target}:${props.targetId}`} {...props} />;
}

function DocumentsSectionInner({
  target,
  targetId,
  title = 'Belgeler',
  emptyHint,
}: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<AttachmentRow[] | null>(null);
  const [category, setCategory] = useState('diger');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AttachmentRow | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = queue.some(q => q.error === null && q.progress < 100);

  useEffect(() => {
    let cancelled = false;
    fetchAttachments(target, targetId).then(rows => { if (!cancelled) setDocuments(rows); });
    return () => { cancelled = true; };
  }, [target, targetId]);

  const updateItem = (key: string, patch: Partial<QueueItem>) =>
    setQueue(prev => prev.map(item => (item.key === key ? { ...item, ...patch } : item)));

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setMessage(null);
    const items = files.map(file => ({ file, key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}` }));
    setQueue(prev => [...prev, ...items.map(({ file, key }) => ({ key, name: file.name, progress: 0, error: null }))]);

    // Sunucu fonksiyonları istemciden zaten sırayla işleniyor; dosyalar da
    // sırayla yüklenir — hız sınırına takılmaz, hata hangi dosyada net görünür.
    for (const { file, key } of items) {
      const ext = fileExtension(file.name);
      if (!ATTACHMENT_FILE_TYPES[ext]) { updateItem(key, { error: `Desteklenmeyen tür: .${ext || '?'}` }); continue; }
      if (file.size > MAX_ATTACHMENT_BYTES) { updateItem(key, { error: '25 MB sınırını aşıyor' }); continue; }
      if (file.size === 0) { updateItem(key, { error: 'Dosya boş' }); continue; }

      try {
        const ticket = await requestAttachmentUpload({ target, targetId, fileName: file.name, size: file.size });
        if (!ticket.ok) { updateItem(key, { error: ticket.error }); continue; }

        await putWithProgress(ticket.signedUrl, file, ticket.contentType, pct => updateItem(key, { progress: Math.min(pct, 99) }));

        const result = await finalizeAttachmentUpload({ target, targetId, path: ticket.path, fileName: file.name, category });
        if (!result.ok) { updateItem(key, { error: result.error }); continue; }

        setDocuments(prev => [result.row, ...(prev ?? [])]);
        setQueue(prev => prev.filter(item => item.key !== key));
      } catch (err) {
        console.error('Belge yüklenemedi:', err);
        updateItem(key, { error: 'Yükleme başarısız oldu' });
      }
    }
  }, [target, targetId, category]);

  const headingFor = (doc: AttachmentRow) =>
    doc.source === 'generated' ? (getTemplate(doc.doc_type)?.label ?? doc.file_name) : doc.file_name;

  const closeViewer = useCallback(() => setViewing(null), []);

  const handleDownload = async (doc: AttachmentRow) => {
    setBusyId(doc.id);
    setMessage(null);
    const result = await getAttachmentDownloadUrl(target, doc.id, 'download');
    setBusyId(null);
    if (!result.url) { setMessage(result.error || 'İndirme bağlantısı üretilemedi.'); return; }
    // `Content-Disposition: attachment` — sayfa değişmez, yalnızca indirme başlar.
    window.location.assign(result.url);
  };

  const handleDelete = async (doc: AttachmentRow) => {
    if (!window.confirm(`"${doc.file_name}" belgesini kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    setBusyId(doc.id);
    const result = await deleteAttachment(target, doc.id);
    setBusyId(null);
    setMessage(result.message);
    if (result.success) setDocuments(prev => (prev ?? []).filter(d => d.id !== doc.id));
  };

  return (
    <div
      className={`space-y-3 rounded-xl transition-colors ${isDragging ? 'outline-2 outline-dashed outline-[var(--primary)]/60 bg-[var(--primary)]/5' : ''}`}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setIsDragging(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
      onDrop={e => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setIsDragging(false);
        void uploadFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`${labelClass} mb-0`}>{title}{documents ? ` (${documents.length})` : ''}</p>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`doc-category-${targetId}`}>Belge türü</label>
          <select
            id={`doc-category-${targetId}`}
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-[var(--primary)]/40"
          >
            {ATTACHMENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors"
          >
            <Upload size={13} /> Belge Yükle
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              void uploadFiles(files);
            }}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        PDF, Word, Excel, görsel, UYAP (.udf) ve e-posta dosyaları · en fazla 25 MB · sürükleyip bırakabilirsiniz. Belgeler şifreli, herkese kapalı depoda saklanır.
      </p>

      {queue.length > 0 && (
        <div className="space-y-1.5" aria-live="polite">
          {queue.map(item => (
            <div key={item.key} className={`bg-muted border rounded-xl p-2.5 ${item.error ? 'border-rose-500/40' : 'border-border'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-foreground truncate min-w-0">{item.name}</p>
                {item.error ? (
                  <button type="button" onClick={() => setQueue(prev => prev.filter(q => q.key !== item.key))} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Kapat">
                    <X size={13} />
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">%{item.progress}</span>
                )}
              </div>
              {item.error ? (
                <p className="text-[11px] text-rose-400 mt-1">{item.error}</p>
              ) : (
                <div className="h-1 mt-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-[var(--primary)] transition-[width] duration-200" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {documents === null && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
      {documents?.length === 0 && queue.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border border-dashed border-border rounded-xl p-5 text-center text-xs text-muted-foreground hover:border-[var(--primary)]/40 hover:text-foreground transition-colors"
        >
          <Upload size={18} className="mx-auto mb-2 text-[var(--primary)]" />
          {emptyHint ?? 'Henüz belge yok. Dosya seçmek için tıklayın veya buraya sürükleyin.'}
        </button>
      )}

      {documents && documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map(doc => {
            const Icon = iconFor(doc.format);
            const isGenerated = doc.source === 'generated';
            const heading = headingFor(doc);
            const meta = [
              isGenerated ? null : categoryLabel(doc.doc_type),
              doc.format.toUpperCase(),
              formatBytes(doc.size_bytes),
              new Date(doc.created_at).toLocaleDateString('tr-TR'),
            ].filter(Boolean).join(' · ');
            return (
              <div key={doc.id} className="flex items-center justify-between gap-2 bg-muted border border-border hover:border-[var(--primary)]/30 rounded-xl p-1.5 pl-3 transition-colors">
                <button
                  type="button"
                  onClick={() => setViewing(doc)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-1.5 rounded-lg"
                  title="Görüntüle"
                >
                  <Icon size={16} className="text-[var(--primary)] shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground truncate">{heading}</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      {isGenerated && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
                          <Sparkles size={9} /> Otomasyon
                        </span>
                      )}
                      {meta}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewing(doc)}
                    className="p-2 text-muted-foreground hover:text-[var(--primary)] transition-colors"
                    aria-label="Görüntüle"
                    title="Görüntüle"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={busyId === doc.id}
                    className="p-2 text-muted-foreground hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                    aria-label="İndir"
                    title="İndir"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={busyId === doc.id}
                    className="p-2 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-50"
                    aria-label="Sil"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {isUploading && <span className="sr-only">Yükleme sürüyor</span>}

      {viewing && (
        <DocumentViewerModal target={target} doc={viewing} heading={headingFor(viewing)} onClose={closeViewer} />
      )}
    </div>
  );
}
