-- Gelir / gider / kâr / alacak defteri. Bu bir yönetim raporlama defteridir,
-- muhasebe defteri değildir — stopaj/KDV beyanını modellemez, mali
-- müşavirin yerini almaz. vat_rate ve invoice_no yalnızca referans amaçlıdır.

CREATE TABLE ledger_categories (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  sort_order INT NOT NULL DEFAULT 100,
  is_active  BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO ledger_categories (id, label, entry_type, sort_order) VALUES
  ('vekalet-ucreti',        'Vekâlet Ücreti',           'income', 10),
  ('vekalet-ucreti-taksit', 'Vekâlet Ücreti (Taksit)',  'income', 20),
  ('basari-primi',          'Başarı Primi',             'income', 30),
  ('danismanlik',           'Danışmanlık / Mütalaa',    'income', 40),
  ('karsi-yan-vekalet',     'Karşı Yan Vekâlet Ücreti', 'income', 50),
  ('masraf-iadesi',         'Dosya Masrafı İadesi',     'income', 60),
  ('diger-gelir',           'Diğer Gelir',              'income', 90),
  ('harc-masraf',           'Harç ve Yargılama Gideri', 'expense', 10),
  ('bilirkisi',             'Bilirkişi / Keşif Gideri', 'expense', 20),
  ('tebligat-posta',        'Tebligat ve Posta',        'expense', 30),
  ('ulasim',                'Ulaşım / Yol',             'expense', 40),
  ('baro-aidat',            'Baro Aidatı ve Pul',       'expense', 50),
  ('ofis-kira',             'Ofis Kira ve Aidat',       'expense', 60),
  ('personel',              'Personel Gideri',          'expense', 70),
  ('yazilim-abonelik',      'Yazılım / Abonelik',       'expense', 80),
  ('vergi-sgk',             'Vergi / SGK',              'expense', 85),
  ('kirtasiye',             'Kırtasiye ve Ofis',        'expense', 88),
  ('diger-gider',           'Diğer Gider',              'expense', 95)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE ledger_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- trust_in / trust_out = müvekkil adına alınan-verilen EMANET para (icra
  -- tahsilatı, masraf avansı). Kâra ASLA dahil edilmez, ayrı bakiye tutulur
  -- — bu ayrım olmadan icra tahsilatları geliri yapay şekilde şişirirdi.
  entry_type     TEXT NOT NULL CHECK (entry_type IN ('income', 'expense', 'trust_in', 'trust_out')),
  category_id    TEXT REFERENCES ledger_categories(id),
  case_id        UUID REFERENCES cases(id)   ON DELETE SET NULL,
  client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
  owner_id       UUID REFERENCES auth.users(id),
  description    TEXT NOT NULL,

  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency       TEXT NOT NULL DEFAULT 'TRY',
  -- Kur girişte elle girilir (o günkü kur) — doğrulanabilir ücretsiz bir
  -- otomatik kur kaynağı bulunamadığı için sisteme gömülmedi.
  fx_rate        NUMERIC(12,6) NOT NULL DEFAULT 1 CHECK (fx_rate > 0),
  amount_try     NUMERIC(14,2) GENERATED ALWAYS AS (ROUND(amount * fx_rate, 2)) STORED,
  vat_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,

  entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,                        -- vade (tahsil edilecekse)
  paid_at        DATE,                        -- NULL => tahsil edilmedi (ALACAK)
  payment_method TEXT CHECK (payment_method IN ('nakit', 'havale', 'kredi_karti', 'cek', 'senet', 'mahsup')),
  invoice_no     TEXT,                        -- serbest meslek makbuzu no
  attachment_url TEXT,                        -- /api/upload -> Supabase Storage
  is_reimbursable BOOLEAN NOT NULL DEFAULT false,  -- müvekkilden tahsil edilecek masraf
  notes          TEXT
);
CREATE TRIGGER trg_ledger_entries_updated_at BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_ledger_entry_date ON ledger_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_case       ON ledger_entries (case_id);
CREATE INDEX IF NOT EXISTS idx_ledger_client     ON ledger_entries (client_id);
CREATE INDEX IF NOT EXISTS idx_ledger_owner      ON ledger_entries (owner_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type_date  ON ledger_entries (entry_type, entry_date DESC);
-- Alacak yaşlandırma grafiğinin taradığı tek indeks (kısmi indeks).
CREATE INDEX IF NOT EXISTS idx_ledger_receivable ON ledger_entries (due_date) WHERE paid_at IS NULL AND entry_type = 'income';

ALTER TABLE ledger_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for ledger_categories" ON ledger_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS: yalnızca yönetici ve avukat finansal veriye erişebilir (stajyer hiç
-- göremez — can_see_finance()). Avukat yalnızca kendi dosyalarının veya
-- dosyaya bağlı olmayan (case_id IS NULL — ofis geneli gider) OLMAYAN
-- kayıtlarını görür; büro geneli giderler (kira, personel, vergi) yalnızca
-- yöneticiye görünür.
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for ledger_entries" ON ledger_entries
  FOR SELECT USING (
    is_yonetici()
    OR (can_see_finance() AND case_id IS NOT NULL AND owner_id = auth.uid())
  );

CREATE POLICY "Allow insert for ledger_entries" ON ledger_entries
  FOR INSERT WITH CHECK (
    is_yonetici()
    OR (can_see_finance() AND case_id IS NOT NULL AND owner_id = auth.uid())
  );

CREATE POLICY "Allow update for ledger_entries" ON ledger_entries
  FOR UPDATE USING (
    is_yonetici()
    OR (can_see_finance() AND case_id IS NOT NULL AND owner_id = auth.uid())
  );

CREATE POLICY "Allow delete for ledger_entries" ON ledger_entries
  FOR DELETE USING (
    is_yonetici()
    OR (can_see_finance() AND case_id IS NOT NULL AND owner_id = auth.uid())
  );
