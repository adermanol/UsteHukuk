-- Dosyalar (cases). `clients` bir başvuru/lead olarak aynen kalır — bu
-- tablo, bir başvurunun (veya doğrudan büro içi bir vekaletin) gerçek bir
-- hukuki dosyaya dönüştüğü noktayı temsil eder. Bir başvuru 0..n dosya
-- doğurabilir; bu dönüşüm oranı analitikteki huni grafiğinin veri kaynağıdır.

CREATE TABLE cases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  office_no        TEXT,                          -- büro iç dosya numarası
  file_no          TEXT,                          -- UYAP esas no: '2026/1234'
  court_name       TEXT,                          -- 'İzmir 3. Asliye Hukuk Mahkemesi'
  institution_id   UUID,                          -- FK aşağıda değil; institutions
                                                    -- tablosu 20260729005000'de eklenir

  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  owner_id         UUID REFERENCES auth.users(id),
  title            TEXT NOT NULL,
  practice_area_id TEXT REFERENCES practice_areas(id),
  jurisdiction     TEXT NOT NULL DEFAULT 'hukuk'
                     CHECK (jurisdiction IN ('hukuk','ceza','icra','idare','is','arabuluculuk','danismanlik')),
  case_role        TEXT CHECK (case_role IN
                     ('davaci','davali','sanik','supheli','musteki','katilan','alacakli','borclu','ucuncu_kisi','danisan')),
  status           TEXT NOT NULL DEFAULT 'aktif'
                     CHECK (status IN ('potansiyel','aktif','istinaf','temyiz','kesinlesti','kapandi','arsiv')),
  opened_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at        DATE,                          -- gerçek "kapanan dosya" analitik kaynağı
  outcome          TEXT CHECK (outcome IN
                     ('kabul','kismen_kabul','ret','feragat','sulh','takipsizlik','beraat','mahkumiyet','dusme','diger')),

  opposing_party   TEXT,
  -- Ücret anlaşması. Tutarlar bürodan girilir; hiçbir yasal tarife
  -- (AAÜT vb.) koda gömülmez — yıllık değişiyor ve doğrulanamıyor.
  fee_model        TEXT CHECK (fee_model IN ('maktu','oransal','saatlik','karma','ucretsiz')),
  agreed_fee       NUMERIC(14,2),
  fee_currency     TEXT NOT NULL DEFAULT 'TRY',
  success_fee_pct  NUMERIC(5,2),

  -- HMK m.103 istisnası bir hukuki değerlendirmedir, yazılım karar veremez;
  -- avukat dosya bazında işaretler, süre hesaplayıcı bu bayrağa göre dallanır.
  is_recess_exempt BOOLEAN NOT NULL DEFAULT false,
  source           TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','uyap_import')),
  import_batch_id  UUID,
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_cases_client        ON cases (client_id);
CREATE INDEX IF NOT EXISTS idx_cases_owner         ON cases (owner_id);
CREATE INDEX IF NOT EXISTS idx_cases_status        ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_area          ON cases (practice_area_id);
CREATE INDEX IF NOT EXISTS idx_cases_opened_at     ON cases (opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_closed_at     ON cases (closed_at DESC) WHERE closed_at IS NOT NULL;
-- İçe aktarımda tekilleştirme anahtarı (Faz 3, UYAP CSV içe aktarımı).
-- Esas no tek başına benzersiz DEĞİL — farklı mahkemelerde aynı esas no olur.
CREATE INDEX IF NOT EXISTS idx_cases_court_file    ON cases (lower(coalesce(court_name, '')), file_no) WHERE file_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_title_trgm    ON cases USING GIN (title gin_trgm_ops);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- RLS: yönetici hepsini görür/düzenler; avukat yalnızca kendi owner_id'sine
-- sahip dosyaları; stajyer atandığı dosyaları görür ama düzenleyemez.
-- 'stajyer atandığı dosyalar' kavramı Faz 1'de owner_id ile temsil edilir
-- (ayrı bir case_assignees tablosu şimdilik gereksiz karmaşıklık).
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read own or all for cases" ON cases
  FOR SELECT USING (is_yonetici() OR owner_id = auth.uid());

CREATE POLICY "Allow insert own for cases" ON cases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND current_user_role() != 'stajyer');

CREATE POLICY "Allow update own or all for cases" ON cases
  FOR UPDATE USING (is_yonetici() OR (owner_id = auth.uid() AND current_user_role() != 'stajyer'));

CREATE POLICY "Allow delete own or all for cases" ON cases
  FOR DELETE USING (is_yonetici() OR (owner_id = auth.uid() AND current_user_role() != 'stajyer'));
