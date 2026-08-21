-- Bir dosyanın birden fazla müvekkili olabilir (miras paylaşımı, ortaklığın
-- giderilmesi, birden fazla kiracı/malik vb.). cases.client_id "birincil
-- müvekkil" olarak KALIR (geriye dönük uyumluluk, hızlı erişim); bu tablo
-- tüm tarafları tutar ve müvekkil-bazlı sorguların (rapor, alacak, durum
-- linki) tek doğru kaynağıdır.
CREATE TABLE case_clients (
  case_id    UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  role_note  TEXT,                     -- 'Mirasçı 2', 'Kiracı' gibi serbest not
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (case_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_case_clients_client ON case_clients (client_id);

-- Backfill: mevcut tekli ilişki birincil taraf olarak taşınır.
INSERT INTO case_clients (case_id, client_id, is_primary)
  SELECT id, client_id, true FROM cases WHERE client_id IS NOT NULL
  ON CONFLICT DO NOTHING;

-- RLS: case_clients kendi başına anlamsız, her zaman bağlı olduğu dosyanın
-- erişim kuralını miras alır (cases ile aynı sahiplik mantığı).
ALTER TABLE case_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for case_clients" ON case_clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_clients.case_id AND (is_yonetici() OR c.owner_id = auth.uid()))
);
CREATE POLICY "Allow write for case_clients" ON case_clients FOR ALL USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_clients.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
) WITH CHECK (true);
