"use client"

import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, FileText, Loader2, X } from 'lucide-react'
import { getAttachmentDownloadUrl } from '../services/attachmentsRepository'
import {
  ATTACHMENT_FILE_TYPES,
  categoryLabel,
  formatBytes,
  type AttachmentRow,
  type AttachmentTarget,
} from '../attachmentTypes'

const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

/**
 * Belgeyi sayfadan ayrılmadan açan görüntüleyici. PDF'ler tarayıcının kendi
 * PDF görüntüleyicisiyle, görseller doğrudan gösterilir; önizlenemeyen
 * türlerde (Word, Excel, UYAP .udf…) dosya bilgisi ve indirme sunulur.
 * Dışarıya tıklamak veya Esc pencereyi kapatır.
 *
 * Mobil tarayıcılar (Android Chrome, iOS Safari) gömülü PDF'i ya hiç ya da
 * yalnızca ilk sayfasıyla gösterdiği için "Yeni sekmede aç" her zaman
 * görünür bir yedek olarak durur.
 */
export function DocumentViewerModal({
  target,
  doc,
  heading,
  onClose,
}: {
  target: AttachmentTarget;
  doc: AttachmentRow;
  heading: string;
  onClose: () => void;
}) {
  const previewable = ATTACHMENT_FILE_TYPES[doc.format]?.previewable ?? false;
  const isImage = IMAGE_FORMATS.includes(doc.format);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;
    getAttachmentDownloadUrl(target, doc.id, 'preview').then(result => {
      if (cancelled) return;
      if (result.url) setPreviewUrl(result.url);
      else setPreviewError(result.error || 'Önizleme yüklenemedi.');
    });
    return () => { cancelled = true; };
  }, [target, doc.id, previewable]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    const result = await getAttachmentDownloadUrl(target, doc.id, 'download');
    setIsDownloading(false);
    if (!result.url) { setDownloadError(result.error || 'İndirme bağlantısı üretilemedi.'); return; }
    // Bağlantı `Content-Disposition: attachment` taşıdığı için sayfa değişmez,
    // yalnızca indirme başlar — görüntüleyici açık kalır.
    window.location.assign(result.url);
  };

  const meta = [
    doc.source === 'generated' ? 'Otomasyonla üretildi' : categoryLabel(doc.doc_type),
    doc.format.toUpperCase(),
    formatBytes(doc.size_bytes),
    new Date(doc.created_at).toLocaleDateString('tr-TR'),
  ].filter(Boolean).join(' · ');

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="relative glass-panel rounded-2xl border border-[var(--primary)]/30 shadow-2xl w-full max-w-5xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate" title={doc.file_name}>{heading}</p>
            <p className="text-[11px] text-muted-foreground truncate">{meta}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>İndir</span>
            </button>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-[var(--primary)] transition-colors"
                aria-label="Yeni sekmede aç"
                title="Yeni sekmede aç"
              >
                <ExternalLink size={15} />
              </a>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {downloadError && <p className="text-xs text-rose-400 px-4 pt-2">{downloadError}</p>}

        <div className="flex-1 min-h-0 bg-black/20">
          {previewable && !previewUrl && !previewError && (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 size={16} className="animate-spin" /> Belge yükleniyor...
            </div>
          )}

          {previewError && (
            <div className="h-full flex items-center justify-center p-6 text-sm text-rose-400 text-center">{previewError}</div>
          )}

          {previewUrl && isImage && (
            <div className="h-full w-full overflow-auto flex items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- kısa ömürlü imzalı URL; next/image optimizasyonu burada anlamsız ve özel belgeyi önbelleğe alırdı */}
              <img src={previewUrl} alt={heading} referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          )}

          {previewUrl && !isImage && (
            <iframe src={previewUrl} title={heading} referrerPolicy="no-referrer" className="w-full h-full border-0 bg-white" />
          )}

          {!previewable && (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText size={40} className="text-[var(--primary)]" />
              <p className="text-sm text-foreground font-medium break-all">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {doc.format.toUpperCase()} dosyaları tarayıcıda önizlenemez. İndirerek bilgisayarınızdaki ilgili programla açabilirsiniz.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
              >
                <Download size={15} /> {isDownloading ? 'Hazırlanıyor...' : 'Dosyayı İndir'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
