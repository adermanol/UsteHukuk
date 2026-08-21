-- Bilgi Bankası "Tüm Belgeler" listesi için kronolojik sıralama sütunu.
-- Silme işlemi supabaseAdmin (service-role) üzerinden yapılacağı için RLS'e
-- ayrı bir DELETE politikası eklenmiyor (service-role RLS'i bypass eder).

ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at DESC);
