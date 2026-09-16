// İstemci ve sunucu (attachmentsRepository.ts) tarafından ORTAK kullanılan
// sabitler. "use server" dosyası yalnızca async fonksiyon export edebildiği
// için ayrı tutulur — izin listesi tek yerde durur, iki taraf asla ayrışmaz.

export type AttachmentTarget = 'case' | 'client';
export type AttachmentSource = 'generated' | 'uploaded';

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // migration'daki bucket sınırıyla aynı

/**
 * Uzantı → kanonik MIME türü. Yükleme, tarayıcının tahmin ettiği türle değil
 * BU türle yapılır; sunucu kayıt öncesi Storage'daki nesnenin türünün bununla
 * birebir eşleştiğini doğrular. Böylece `.pdf` uzantılı ama `text/html`
 * olarak yüklenmiş bir dosya (imzalı indirme bağlantısında tarayıcıda
 * çalıştırılabilecek içerik) hiçbir zaman kayda geçmez. HTML/SVG/JS ve
 * çalıştırılabilir türler bilinçli olarak listede YOK.
 */
export const ATTACHMENT_FILE_TYPES: Record<string, { mime: string; previewable: boolean }> = {
  pdf: { mime: 'application/pdf', previewable: true },
  doc: { mime: 'application/msword', previewable: false },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', previewable: false },
  odt: { mime: 'application/vnd.oasis.opendocument.text', previewable: false },
  rtf: { mime: 'application/rtf', previewable: false },
  txt: { mime: 'text/plain', previewable: false },
  xls: { mime: 'application/vnd.ms-excel', previewable: false },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', previewable: false },
  ods: { mime: 'application/vnd.oasis.opendocument.spreadsheet', previewable: false },
  csv: { mime: 'text/csv', previewable: false },
  ppt: { mime: 'application/vnd.ms-powerpoint', previewable: false },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', previewable: false },
  jpg: { mime: 'image/jpeg', previewable: true },
  jpeg: { mime: 'image/jpeg', previewable: true },
  png: { mime: 'image/png', previewable: true },
  webp: { mime: 'image/webp', previewable: true },
  heic: { mime: 'image/heic', previewable: false },
  heif: { mime: 'image/heif', previewable: false },
  tif: { mime: 'image/tiff', previewable: false },
  tiff: { mime: 'image/tiff', previewable: false },
  // UYAP Doküman Editörü formatı — mahkeme evrakının yerel formatı.
  udf: { mime: 'application/octet-stream', previewable: false },
  eml: { mime: 'message/rfc822', previewable: false },
  msg: { mime: 'application/vnd.ms-outlook', previewable: false },
};

export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_FILE_TYPES).map(ext => `.${ext}`).join(',');

export const ATTACHMENT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'vekaletname', label: 'Vekaletname' },
  { id: 'kimlik', label: 'Kimlik / Pasaport' },
  { id: 'sozlesme', label: 'Sözleşme' },
  { id: 'dilekce', label: 'Dilekçe' },
  { id: 'karar', label: 'Karar / Tutanak' },
  { id: 'delil', label: 'Delil' },
  { id: 'yazisma', label: 'Yazışma' },
  { id: 'makbuz', label: 'Makbuz / Fatura' },
  { id: 'diger', label: 'Diğer' },
];

export function categoryLabel(id: string): string | undefined {
  return ATTACHMENT_CATEGORIES.find(c => c.id === id)?.label;
}

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface AttachmentRow {
  id: string;
  source: AttachmentSource;
  doc_type: string;
  format: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}
