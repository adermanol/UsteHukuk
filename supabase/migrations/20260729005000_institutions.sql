-- Kurum rehberi (adliye/cezaevi/göç idaresi/devlet kurumları) + prosedür
-- kontrol listeleri. Sıfır satırla gelir — ulusal bir adliye/cezaevi/göç
-- adres rehberi hafızadan üretilmez; büro kendi doğruladığı kurumları girer.

CREATE TABLE institutions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind           TEXT NOT NULL CHECK (kind IN
                   ('adliye', 'cezaevi', 'goc_idaresi', 'emniyet', 'jandarma', 'icra_dairesi',
                    'noter', 'tapu', 'nufus', 'sgk', 'vergi', 'belediye', 'baro', 'arabuluculuk',
                    'bilirkisi', 'konsolosluk', 'diger')),
  name           TEXT NOT NULL,
  city           TEXT,
  district       TEXT,
  address        TEXT,
  lat            NUMERIC(9,6),
  lng            NUMERIC(9,6),
  phone          TEXT,
  alt_phone      TEXT,
  fax            TEXT,
  email          TEXT,
  website        TEXT,
  working_hours  TEXT,
  -- Sahada gerçekten zaman kazandıran alanlar — adres değil, bu üç not:
  entrance_note  TEXT,   -- 'Avukat girişi B kapısı; baro kartı yeterli, sıraya girilmez'
  parking_note   TEXT,   -- 'Otopark C blok arkası, 3 saat ücretsiz'
  procedure_note TEXT,   -- 'Randevu zorunlu, 0232 xxx, sabah 09:00-11:00 arası aranır'
  is_favorite    BOOLEAN NOT NULL DEFAULT false,
  notes          TEXT,
  verified_at    DATE,   -- büro doğrulaması; hafızadan veri ÜRETİLMEZ
  verified_by    TEXT
);
CREATE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_institutions_kind_city ON institutions (kind, city);
CREATE INDEX IF NOT EXISTS idx_institutions_name_trgm ON institutions USING GIN (name gin_trgm_ops);

CREATE TABLE institution_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  unit           TEXT,          -- '3. Asliye Hukuk Mahkemesi Kalemi'
  full_name      TEXT,
  role           TEXT,          -- 'Zabıt Kâtibi' / 'Kalem Müdürü' / 'Mübaşir'
  phone          TEXT,
  internal_ext   TEXT,
  email          TEXT,
  notes          TEXT,
  sort_order     INT NOT NULL DEFAULT 100
);
CREATE INDEX IF NOT EXISTS idx_institution_contacts_inst ON institution_contacts (institution_id);

-- Kuruma/kurum türüne bağlı prosedür kontrol listeleri (ör. cezaevi görüşü,
-- duruşma evrak listesi).
CREATE TABLE procedure_checklists (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_kind  TEXT,        -- tür bazlı genel liste
  institution_id    UUID REFERENCES institutions(id) ON DELETE CASCADE,  -- kuruma özel
  title             TEXT NOT NULL,
  description       TEXT,
  legal_basis       TEXT,
  sort_order        INT NOT NULL DEFAULT 100,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  CHECK (institution_kind IS NOT NULL OR institution_id IS NOT NULL)
);
CREATE TABLE procedure_checklist_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES procedure_checklists(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  hint         TEXT,
  is_required  BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 100
);
CREATE TABLE procedure_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checklist_id     UUID NOT NULL REFERENCES procedure_checklists(id) ON DELETE CASCADE,
  case_id          UUID REFERENCES cases(id)       ON DELETE SET NULL,
  event_id         UUID REFERENCES case_events(id) ON DELETE SET NULL,
  owner_id         UUID REFERENCES auth.users(id),
  checked_item_ids UUID[] NOT NULL DEFAULT '{}',
  completed_at     TIMESTAMPTZ,
  notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_procedure_runs_event ON procedure_runs (event_id);

-- Faz 1'de eklenen cases/case_events tablolarındaki institution_id
-- sütunlarını artık gerçek bir FK ile bağla.
ALTER TABLE cases       ADD CONSTRAINT fk_cases_institution
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;
ALTER TABLE case_events ADD CONSTRAINT fk_case_events_institution
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;

-- Göç dosyaları için clients'a ikamet izni / yabancı kimlik alanları.
ALTER TABLE clients
  ADD COLUMN foreign_id_no TEXT,                     -- 99 ile başlayan yabancı kimlik no
  ADD COLUMN passport_no TEXT,
  ADD COLUMN nationality TEXT,
  ADD COLUMN residence_permit_type TEXT,
  ADD COLUMN residence_permit_expires_on DATE,
  ADD COLUMN goc_appointment_at TIMESTAMPTZ,
  ADD COLUMN goc_appointment_no TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_permit_expiry ON clients (residence_permit_expires_on) WHERE residence_permit_expires_on IS NOT NULL;

-- RLS: kurum rehberi ve prosedür listeleri referans/paylaşılan veridir —
-- tüm authenticated okur, yalnızca yönetici ve avukat düzenler (stajyer
-- sahada bu bilgiyi kullanır ama kurum kaydı oluşturmaz).
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for institutions" ON institutions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow non-stajyer write for institutions" ON institutions
  FOR ALL USING (current_user_role() != 'stajyer') WITH CHECK (current_user_role() != 'stajyer');

ALTER TABLE institution_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for institution_contacts" ON institution_contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow non-stajyer write for institution_contacts" ON institution_contacts
  FOR ALL USING (current_user_role() != 'stajyer') WITH CHECK (current_user_role() != 'stajyer');

ALTER TABLE procedure_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for procedure_checklists" ON procedure_checklists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow non-stajyer write for procedure_checklists" ON procedure_checklists
  FOR ALL USING (current_user_role() != 'stajyer') WITH CHECK (current_user_role() != 'stajyer');

ALTER TABLE procedure_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for procedure_checklist_items" ON procedure_checklist_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow non-stajyer write for procedure_checklist_items" ON procedure_checklist_items
  FOR ALL USING (current_user_role() != 'stajyer') WITH CHECK (current_user_role() != 'stajyer');

ALTER TABLE procedure_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read own or all for procedure_runs" ON procedure_runs
  FOR SELECT USING (is_yonetici() OR owner_id = auth.uid());
CREATE POLICY "Allow insert own for procedure_runs" ON procedure_runs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update own or all for procedure_runs" ON procedure_runs
  FOR UPDATE USING (is_yonetici() OR owner_id = auth.uid());

-- Seed: cezaevi görüşü genel kontrol listesi (kurum türü bazlı, tüm cezaevi
-- kayıtlarına otomatik uygulanır).
INSERT INTO procedure_checklists (institution_kind, title, description, sort_order) VALUES
  ('cezaevi', 'Cezaevi Görüşü Hazırlık Listesi', 'Görüşe girmeden önce yanınızda bulunması gerekenler.', 10)
ON CONFLICT DO NOTHING;

-- NOT: plpgsql değişkeni bilerek "v_" önekiyle adlandırıldı — sütun adıyla
-- aynı isimde bir değişken (variable_conflict=error varsayımıyla) aşağıdaki
-- EXISTS alt sorgusunda "ambiguous column reference" hatasıyla migration'ın
-- tamamını başarısız kılardı.
DO $$
DECLARE v_checklist_id UUID;
BEGIN
  SELECT id INTO v_checklist_id FROM procedure_checklists WHERE institution_kind = 'cezaevi' AND title = 'Cezaevi Görüşü Hazırlık Listesi' LIMIT 1;
  IF v_checklist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_checklist_items WHERE checklist_id = v_checklist_id) THEN
    INSERT INTO procedure_checklist_items (checklist_id, label, sort_order) VALUES
      (v_checklist_id, 'Vekaletname aslı veya görevlendirme yazısı', 10),
      (v_checklist_id, 'Baro kimlik kartı', 20),
      (v_checklist_id, 'Görüş talep formu (doldurulmuş)', 30),
      (v_checklist_id, 'Müvekkil adı, soyadı, baba adı', 40),
      (v_checklist_id, 'Koğuş / dosya numarası', 50),
      (v_checklist_id, 'Görüşülecek konuların listesi', 60);
  END IF;
END $$;
