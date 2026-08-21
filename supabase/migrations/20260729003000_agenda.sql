-- Ajanda: duruşma, süre (deadline) ve tatil takvimi.
--
-- Tasarım kararı: tek case_events tablosu, ayrı hearings + deadlines değil.
-- Mobil "Bugün" ekranı ve hatırlatma cron'u tek bir zaman sıralı akış
-- istiyor; iki tablo her okumada UNION view ve iki ayrı hatırlatma kod yolu
-- demek olurdu. Bedeli yalnızca ~6 nullable sütun (event_type='sure'
-- satırları için) — açıkça doğru takas.

CREATE TABLE deadline_rules (
  id                     TEXT PRIMARY KEY,               -- 'hmk-istinaf'
  label                  TEXT NOT NULL,                  -- 'İstinaf başvuru süresi'
  jurisdiction           TEXT NOT NULL CHECK (jurisdiction IN ('hukuk','ceza','icra','idare','is','goc','genel')),
  duration_value         INT  NOT NULL,
  duration_unit          TEXT NOT NULL CHECK (duration_unit IN ('gun','is_gunu','hafta','ay','yil')),
  trigger_label          TEXT NOT NULL,                  -- 'Gerekçeli kararın tebliği'
  legal_basis            TEXT NOT NULL,                  -- 'HMK m.345/1'
  -- legal_code_articles ile eşleşir: hesaplama ekranında güncel kanun metni
  -- doğrudan mevzuat.gov.tr senkronundan (src/modules/legal-codes) gösterilir.
  legal_code_short_name  TEXT,                           -- 'HMK'
  legal_article_no       TEXT,                           -- '345'
  affected_by_recess     BOOLEAN NOT NULL DEFAULT true,   -- adli tatil, HMK m.104
  rolls_over_non_working BOOLEAN NOT NULL DEFAULT true,   -- HMK m.93
  notes                  TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  -- Doğrulama iş akışı: büro doğrulamadan hesaplayıcı "DOĞRULANMADI" rozeti
  -- gösterir, sonuç yine de kullanılabilir ama görünür şekilde işaretli.
  verified_at            DATE,
  verified_by            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_deadline_rules_updated_at BEFORE UPDATE ON deadline_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Seed: HMK istinaf/temyiz/cevap/ön inceleme, CMK itiraz/istinaf, İİK
-- itiraz/şikâyet/istihkak, YUKK göç süreleri. Hepsi verified_at=NULL —
-- kullanılabilir ama büro onaylayana kadar görünür şekilde doğrulanmamış.
INSERT INTO deadline_rules (id, label, jurisdiction, duration_value, duration_unit, trigger_label, legal_basis, legal_code_short_name, legal_article_no) VALUES
  ('hmk-cevap-dilekcesi',   'Cevap dilekçesi süresi',              'hukuk', 2,  'hafta',  'Dava dilekçesinin tebliği',              'HMK m.127',   'HMK', '127'),
  ('hmk-on-inceleme',       'Ön inceleme itirazları süresi',        'hukuk', 2,  'hafta',  'Ön inceleme duruşmasına davet tebliği',  'HMK m.137',   'HMK', '137'),
  ('hmk-istinaf',           'İstinaf başvuru süresi',               'hukuk', 2,  'hafta',  'Gerekçeli kararın tebliği',              'HMK m.345',   'HMK', '345'),
  ('hmk-temyiz',            'Temyiz başvuru süresi',                'hukuk', 2,  'hafta',  'Bölge Adliye Mahkemesi kararının tebliği','HMK m.361',  'HMK', '361'),
  ('hmk-tashih',            'Tashih-i karar (karar düzeltme) süresi','hukuk', 2,  'hafta',  'Yargıtay kararının tebliği',             'HMK m.375',   'HMK', '375'),
  ('cmk-itiraz',            'CMK itiraz süresi',                    'ceza',  7,  'gun',    'Kararın tebliği/tefhimi',                'CMK m.268',   'CMK', '268'),
  ('cmk-istinaf',           'CMK istinaf başvuru süresi',           'ceza',  7,  'gun',    'Gerekçeli kararın tebliği',              'CMK m.273',   'CMK', '273'),
  ('cmk-temyiz',            'CMK temyiz başvuru süresi',            'ceza',  15, 'gun',    'Bölge Adliye Mahkemesi kararının tebliği','CMK m.291',  'CMK', '291'),
  ('iik-itiraz',            'İcra emrine itiraz süresi',            'icra',  7,  'gun',    'İcra emrinin tebliği',                   'İİK m.62',    'İİK', '62'),
  ('iik-sikayet',           'İcra memuru işlemine şikâyet süresi',  'icra',  7,  'gun',    'İşlemin öğrenilmesi',                    'İİK m.16',    'İİK', '16'),
  ('iik-istihkak',          'İstihkak iddiasına itiraz süresi',     'icra',  7,  'gun',    'Haciz tutanağının tebliği',              'İİK m.96',    'İİK', '96'),
  ('yukk-sinirdisina-itiraz','Sınır dışı kararına itiraz süresi',   'goc',   7,  'gun',    'Sınır dışı etme kararının tebliği',      'YUKK m.53',   '6458 Sayılı Kanun', '53'),
  ('yukk-idari-gozetim',    'İdari gözetime itiraz süresi',         'goc',   7,  'gun',    'İdari gözetim kararının tebliği',        'YUKK m.57',   '6458 Sayılı Kanun', '57')
ON CONFLICT (id) DO NOTHING;

-- Adli tatil: yıl damgalı, düzenlenebilir. Tarihler tarihsel olarak değişti
-- (eskiden 20 Temmuz–5 Eylül idi); koda gömülmez.
CREATE TABLE judicial_recess_periods (
  year           INT PRIMARY KEY,
  starts_on      DATE NOT NULL,
  ends_on        DATE NOT NULL,
  extension_days INT  NOT NULL DEFAULT 7,          -- HMK m.104: "bir hafta uzatılmış sayılır"
  legal_basis    TEXT NOT NULL DEFAULT 'HMK m.102-104',
  notes          TEXT
);
INSERT INTO judicial_recess_periods (year, starts_on, ends_on) VALUES
  (2026, '2026-07-20', '2026-08-31'),
  (2027, '2027-07-20', '2027-08-31')
ON CONFLICT (year) DO NOTHING;

-- Tatil takvimi: dini bayramlar hareketli olduğu için algoritmayla
-- hesaplanmaz; Diyanet takvimine göre elle girilir, yıl yıl. Kapsanmayan bir
-- yıl için hesaplayıcı açıkça uyarır, sessizce yanlış sonuç üretmez.
CREATE TABLE non_working_days (
  day         DATE PRIMARY KEY,
  label       TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('resmi_tatil','dini_bayram','idari_izin')),
  is_half_day BOOLEAN NOT NULL DEFAULT false,        -- arife (öğleden sonra)
  source_note TEXT
);
-- 2026 sabit resmî tatilleri seed edilir (dini bayramlar hareketli olduğu
-- için büro tarafından Diyanet takvimine göre elle eklenmelidir).
INSERT INTO non_working_days (day, label, kind, source_note) VALUES
  ('2026-01-01', 'Yılbaşı',                     'resmi_tatil', 'Sabit resmî tatil'),
  ('2026-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı', 'resmi_tatil', 'Sabit resmî tatil'),
  ('2026-05-01', 'Emek ve Dayanışma Günü',       'resmi_tatil', 'Sabit resmî tatil'),
  ('2026-05-19', 'Atatürk''ü Anma, Gençlik ve Spor Bayramı', 'resmi_tatil', 'Sabit resmî tatil'),
  ('2026-08-30', 'Zafer Bayramı',                'resmi_tatil', 'Sabit resmî tatil'),
  ('2026-10-29', 'Cumhuriyet Bayramı',           'resmi_tatil', 'Sabit resmî tatil')
ON CONFLICT (day) DO NOTHING;

CREATE TABLE case_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  case_id            UUID REFERENCES cases(id)   ON DELETE CASCADE,
  client_id          UUID REFERENCES clients(id) ON DELETE SET NULL,
  institution_id     UUID,                        -- FK 20260729005000'de eklenir
  owner_id           UUID REFERENCES auth.users(id),

  event_type         TEXT NOT NULL CHECK (event_type IN
                       ('durusma','kesif','ifade','icra_islemi','muvekkil_gorusmesi',
                        'cezaevi_gorusmesi','kurum_randevusu','sure','gorev','not')),
  title              TEXT NOT NULL,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ,
  all_day            BOOLEAN NOT NULL DEFAULT false,
  location_note      TEXT,                        -- 'D Blok 3. kat, 12 no.lu salon'
  status             TEXT NOT NULL DEFAULT 'planlandi' CHECK (status IN ('planlandi','tamamlandi','ertelendi','iptal')),
  outcome_note       TEXT,
  follow_up_event_id UUID REFERENCES case_events(id) ON DELETE SET NULL,  -- erteleme zinciri
  completed_at       TIMESTAMPTZ,

  -- yalnızca event_type='sure' için doldurulur
  deadline_rule_id   TEXT REFERENCES deadline_rules(id),
  trigger_date       DATE,                        -- tebliğ / tefhim tarihi
  computed_due_date  DATE,
  -- Hesaplamanın adım adım denetlenebilir dökümü — "bu tarih nasıl çıktı?"
  -- sorusunun altı ay sonra bile cevaplanabilmesi, mesleki sorumluluk
  -- açısından kritik.
  computation        JSONB,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,

  reminder_offsets   INT[] NOT NULL DEFAULT '{-7,-3,-1,0}',   -- gün cinsinden
  last_reminded_at   TIMESTAMPTZ
);
CREATE TRIGGER trg_case_events_updated_at BEFORE UPDATE ON case_events
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_case_events_starts_at ON case_events (starts_at);
CREATE INDEX IF NOT EXISTS idx_case_events_case      ON case_events (case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_owner     ON case_events (owner_id);
CREATE INDEX IF NOT EXISTS idx_case_events_open      ON case_events (starts_at) WHERE status = 'planlandi';
CREATE INDEX IF NOT EXISTS idx_case_events_due       ON case_events (computed_due_date) WHERE event_type = 'sure' AND status = 'planlandi';

-- RLS: deadline_rules / judicial_recess_periods / non_working_days referans
-- verisidir, tüm authenticated okuyabilir; yalnızca yönetici düzenler.
-- case_events dosyalarla aynı sahiplik modelini takip eder.
ALTER TABLE deadline_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for deadline_rules" ON deadline_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for deadline_rules" ON deadline_rules FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

ALTER TABLE judicial_recess_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for judicial_recess_periods" ON judicial_recess_periods FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for judicial_recess_periods" ON judicial_recess_periods FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

ALTER TABLE non_working_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for non_working_days" ON non_working_days FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for non_working_days" ON non_working_days FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read own or all for case_events" ON case_events
  FOR SELECT USING (is_yonetici() OR owner_id = auth.uid());
CREATE POLICY "Allow insert own for case_events" ON case_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND current_user_role() != 'stajyer');
CREATE POLICY "Allow update own or all for case_events" ON case_events
  FOR UPDATE USING (is_yonetici() OR (owner_id = auth.uid() AND current_user_role() != 'stajyer'));
CREATE POLICY "Allow delete own or all for case_events" ON case_events
  FOR DELETE USING (is_yonetici() OR (owner_id = auth.uid() AND current_user_role() != 'stajyer'));
