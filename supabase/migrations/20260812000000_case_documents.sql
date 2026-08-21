-- Doküman otomasyonunda üretilen belgeler artık isteğe bağlı olarak bir
-- dosyaya (case) bağlanıp sisteme kaydedilebilir — yalnızca indirilip
-- unutulmuyor. Dosya bytes'ı `private-documents` bucket'ına (bkz.
-- 20260810000000_private_documents_bucket.sql) yazılır, bu tablo yalnızca
-- meta veriyi (hangi dosyaya ait, kim/ne zaman üretti, storage yolu) tutar.
CREATE TABLE case_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL,
  format       TEXT NOT NULL CHECK (format IN ('docx', 'pdf')),
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_case_documents_case ON case_documents (case_id);

-- RLS: cases tablosundaki mevcut sahiplik deseniyle hizalı (yönetici hepsini
-- görür, avukat yalnızca kendi owner_id'sine sahip dosyaların belgelerini).
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for case_documents" ON case_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_documents.case_id AND (is_yonetici() OR c.owner_id = auth.uid()))
);
CREATE POLICY "Allow delete for case_documents" ON case_documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_documents.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
);
-- INSERT için politika YOK (varsayılan-red) — yazma yalnızca /api/generate-doc
-- route'unun kullandığı servis-rolüyle (RLS'i atlar) yapılır; istemci
-- doğrudan sahte bir "belge üretildi" kaydı ekleyemez.
