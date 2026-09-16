-- Avukatın kendi belgelerini (PDF, görsel, Word, Excel, UYAP .udf vb.)
-- bir dosyaya (case) veya doğrudan bir müvekkile yükleyebilmesi.
--
-- Önceden `case_documents` yalnızca Doküman Otomasyonu'nun ÜRETTİĞİ
-- DOCX/PDF'leri tutuyordu (bkz. 20260812000000_case_documents.sql);
-- müvekkil kaydında hiç belge alanı yoktu. Bu migration:
--   1) case_documents'a `source` ('generated' | 'uploaded') ve dosya meta
--      verisini (mime_type, size_bytes) ekler, `format` kısıtını docx/pdf
--      dışındaki uzantılara açar.
--   2) Dosyaya bağlı olmayan müvekkil belgeleri (kimlik, vekaletname,
--      sözleşme) için `client_documents` tablosunu ekler.
--   3) `private-documents` bucket'ına sunucu tarafında zorlanan 25 MB
--      dosya boyutu sınırı koyar.
--
-- Dosya byte'ları tarayıcıdan doğrudan private bucket'a, sunucunun ürettiği
-- tek kullanımlık imzalı yükleme URL'siyle gider (Vercel fonksiyonlarının
-- 4,5 MB istek gövdesi sınırına takılmamak için). Meta veri satırı yine
-- YALNIZCA servis-rolüyle, sunucu nesnenin gerçek boyutunu ve MIME türünü
-- doğruladıktan sonra yazılır — bu yüzden iki tabloda da INSERT politikası
-- bilinçli olarak YOK (varsayılan-red).

-- 1) case_documents genişletmesi
ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT;

ALTER TABLE case_documents DROP CONSTRAINT IF EXISTS case_documents_source_check;
ALTER TABLE case_documents ADD CONSTRAINT case_documents_source_check
  CHECK (source IN ('generated', 'uploaded'));

ALTER TABLE case_documents DROP CONSTRAINT IF EXISTS case_documents_format_check;
ALTER TABLE case_documents ADD CONSTRAINT case_documents_format_check
  CHECK (format ~ '^[a-z0-9]{1,10}$');

CREATE UNIQUE INDEX IF NOT EXISTS uq_case_documents_storage_path ON case_documents (storage_path);

-- 2) client_documents
CREATE TABLE IF NOT EXISTS client_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL,
  format       TEXT NOT NULL CHECK (format ~ '^[a-z0-9]{1,10}$'),
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type    TEXT,
  size_bytes   BIGINT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents (client_id);

-- RLS: `clients` tablosunun mevcut deseniyle hizalı — SELECT tüm oturumlu
-- personele açık (20260727000200_rls_hardening.sql notu: paylaşımlı vaka
-- yükü), kalıcı SİLME stajyer hariç (20260808000000 madde 5).
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for client_documents" ON client_documents;
CREATE POLICY "Allow authenticated select for client_documents" ON client_documents
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow non-stajyer delete for client_documents" ON client_documents;
CREATE POLICY "Allow non-stajyer delete for client_documents" ON client_documents
  FOR DELETE USING (auth.role() = 'authenticated' AND current_user_role() != 'stajyer');

-- 3) Bucket düzeyinde boyut sınırı (uygulama kodundaki kontrolden bağımsız,
-- imzalı URL ile doğrudan yüklemede de Storage tarafından zorlanır).
UPDATE storage.buckets SET file_size_limit = 26214400 WHERE id = 'private-documents';
