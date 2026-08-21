-- ============================================================
-- BİRLEŞTİRİLMİŞ MIGRATION — Faz 1 + Faz 2 (9 dosya, doğru sırayla)
-- Bu dosya bir gerçek migration DEĞİLDİR (supabase/migrations/ dışında
-- tutulur, CLI tarafından okunmaz) — yalnızca Supabase SQL Editor'e TEK
-- SEFERDE yapıştırıp çalıştırmanız için 9 dosyayı doğru bağımlılık
-- sırasıyla birleştirir. BEGIN/COMMIT ile sarılıdır: bir adım bile
-- başarısız olursa TÜMÜ geri alınır, yarım kalmış bir şema oluşmaz.
-- Tüm CREATE INDEX ifadeleri IF NOT EXISTS ile idempotent hale
-- getirildi — kısmi önceki denemelerden kalan indeksler artık
-- çakışma hatası vermez.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────
-- 20260729000000_profiles_roles.sql
-- ─────────────────────────────────────────────────────────
-- Çok kullanıcılı temel: rol tabanlı erişim (yönetici / avukat / stajyer).
-- Bu andan itibaren dosya, ajanda ve finans tabloları "auth.role() =
-- 'authenticated' ise her şeyi görür" yerine role/owner_id bazlı RLS
-- kullanacak — bu yüzden diğer tüm Faz 1 migration'larından önce gelir.

-- e-posta burada tekrarlanır: anon anahtarla auth.users doğrudan
-- okunamadığı için (yalnızca service-role erişebilir), Ekip panelinin
-- normal "use client" + anon-client CRUD deseniyle (applicationsRepository
-- ile aynı desen) çalışabilmesi için trigger'da bir kez kopyalanır.
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'avukat' CHECK (role IN ('yonetici', 'avukat', 'stajyer')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- auth.users'a yeni kullanıcı eklendiğinde otomatik profil açar (varsayılan
-- rol 'avukat'). Büronun ilk hesabı burada 'avukat' olarak açılır; hemen
-- altındaki bootstrap adımı ilk profili 'yonetici'ye yükseltir — aksi halde
-- rol atayabilecek hiç kimse olmaz.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Rol kontrol fonksiyonları SECURITY DEFINER olmak ZORUNDA: profiles
-- üzerindeki bir RLS politikası kendi tablosunu bu fonksiyonla sorgulayınca,
-- fonksiyon SECURITY INVOKER olsaydı politika kendi kendini çağırıp sonsuz
-- özyinelemeye girerdi. SET search_path = public, arama yolu enjeksiyonuna
-- karşı standart önlem.
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active;
$$;

CREATE OR REPLACE FUNCTION is_yonetici() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() = 'yonetici';
$$;

CREATE OR REPLACE FUNCTION can_see_finance() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() IN ('yonetici', 'avukat');
$$;

GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_yonetici() TO authenticated;
GRANT EXECUTE ON FUNCTION can_see_finance() TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow self select for profiles" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_yonetici());
CREATE POLICY "Allow yonetici update for profiles" ON profiles
  FOR UPDATE USING (is_yonetici());

-- Bootstrap: hiç 'yonetici' yoksa (büronun ilk girişi), ilk profili
-- 'yonetici' yapar. Tek seferlik — bir yonetici oluştuktan sonra devre dışı
-- kalır çünkü WHERE koşulu artık hiç satıra uymaz.
CREATE OR REPLACE FUNCTION bootstrap_first_yonetici() RETURNS TRIGGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'yonetici') THEN
    UPDATE profiles SET role = 'yonetici' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_profile_created_bootstrap
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION bootstrap_first_yonetici();

-- ─────────────────────────────────────────────────────────
-- 20260729001000_practice_areas.sql
-- ─────────────────────────────────────────────────────────
-- Hukuk alanı taksonomisi normalizasyonu.
--
-- Sorun: aynı kavram üç ayrı yerden ve 7 dilden `clients.case_type`'a serbest
-- metin olarak yazılıyordu — src/modules/intake-assistant/components/
-- IntakeForm.tsx'teki 6 öğelik LEGAL_AREAS sabiti, src/lib/i18n/dictionary.ts
-- içindeki 6×7=42 farklı dilde yerelleştirilmiş consultationForm.legalAreas
-- dizisi, ve data/cms-data.json'daki 10 öğelik farklı bir practiceAreas
-- taksonomisi (yalnızca pazarlama sayfası için, case_type'a hiç yazılmıyor).
-- Bu normalizasyon olmadan "dava türü dağılımı" grafiği aynı 6 kavramı 42
-- ayrı dilim olarak çizerdi.
--
-- Kaynak doğruluk src/modules/practice-areas/taxonomy.ts dosyasıdır; bu tablo
-- yalnızca FK bütünlüğü ve SQL tarafındaki JOIN/GROUP BY için onun aynasıdır.
-- Kanonik id'ler CMS'in pazarlama taksonomisinin (10 öğe, gerçek üstkümesi)
-- üzerine büronun pazarlamadığı ama fiilen baktığı alanlar eklenerek
-- oluşturulmuştur.

CREATE TABLE practice_areas (
  id          TEXT PRIMARY KEY,
  label_tr    TEXT NOT NULL,
  cms_area_id TEXT,                              -- data/cms-data.json 'pa-N' köprüsü
  sort_order  INT  NOT NULL DEFAULT 100,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO practice_areas (id, label_tr, cms_area_id, sort_order) VALUES
  ('sirketler-ticaret',        'Şirketler ve Ticaret Hukuku',                  'pa-1',  10),
  ('sozlesmeler',              'Sözleşmeler Hukuku ve Risk Analizi',           'pa-2',  20),
  ('esya-kentsel-donusum',     'Eşya ve Kentsel Dönüşüm Hukuku',               'pa-3',  30),
  ('aile-miras',               'Aile, Miras ve Varlık Yönetimi',               'pa-4',  40),
  ('startup',                  'Startup ve Girişimcilik Hukuku',               'pa-5',  50),
  ('uluslararasi-sozlesmeler', 'Uluslararası Sözleşmeler Hukuku',              'pa-6',  60),
  ('goc-yabancilar',           'Göç, Yabancılar ve Uluslararası Mobilite',     'pa-7',  70),
  ('mukayeseli-hukuk',         'Mukayeseli Hukuk ve Kanunlar İhtilafı',        'pa-8',  80),
  ('bilisim-yz-dijital',       'Bilişim, Yapay Zekâ ve Dijital Haklar',        'pa-9',  90),
  ('bilisim-ceza',             'Bilişim Ceza Hukuku ve Siber Kriminoloji',     'pa-10', 100),
  ('is-hukuku',                'İş ve Sosyal Güvenlik Hukuku',                 NULL,    110),
  ('icra-iflas',               'İcra ve İflas Hukuku',                         NULL,    120),
  ('ceza-genel',               'Ceza Hukuku (Genel)',                          NULL,    130),
  ('idare-vergi',              'İdare ve Vergi Hukuku',                        NULL,    140),
  ('tuketici',                 'Tüketici Hukuku',                              NULL,    150),
  ('gayrimenkul-kira',         'Gayrimenkul ve Kira Hukuku',                   NULL,    160),
  ('diger',                    'Diğer',                                        NULL,    900);

-- Geçmiş kirliliği kanonik id'ye bağlayan alias tablosu. Anahtar normalize
-- edilmiş (küçük harf, kırpılmış) ham metindir — 7 dilin tamamı ve serbest
-- metin girişleri aynı satır biçiminde saklanır.
CREATE TABLE practice_area_aliases (
  alias_normalized TEXT PRIMARY KEY,
  practice_area_id TEXT NOT NULL REFERENCES practice_areas(id) ON DELETE CASCADE,
  source_note      TEXT                          -- 'i18n:tr' | 'i18n:en' | 'manuel' vb.
);
CREATE INDEX IF NOT EXISTS idx_practice_area_aliases_area ON practice_area_aliases (practice_area_id);

-- src/lib/i18n/dictionary.ts consultationForm.legalAreas — 6 kavram × 7 dil.
-- Sıra dictionary.ts'teki dizi sırasıyla birebir aynıdır:
-- [bilisim-yz-dijital, startup, uluslararasi-sozlesmeler, bilisim-ceza, sirketler-ticaret, aile-miras]
INSERT INTO practice_area_aliases (alias_normalized, practice_area_id, source_note) VALUES
  -- tr (IntakeForm.tsx LEGAL_AREAS ile birebir aynı)
  ('bilişim, yapay zekâ ve dijital haklar',                             'bilisim-yz-dijital',       'i18n:tr'),
  ('startup ve girişimcilik hukuku',                                    'startup',                  'i18n:tr'),
  ('uluslararası sözleşmeler & mukayeseli hukuk',                       'uluslararasi-sozlesmeler', 'i18n:tr'),
  ('bilişim ceza hukuku',                                               'bilisim-ceza',              'i18n:tr'),
  ('şirketler, ticaret ve sözleşmeler hukuku',                          'sirketler-ticaret',         'i18n:tr'),
  ('geleneksel hukuk disiplinleri (aile, miras, gayrimenkul)',          'aile-miras',                'i18n:tr'),
  -- en
  ('it, artificial intelligence and digital rights',                    'bilisim-yz-dijital',       'i18n:en'),
  ('startup and entrepreneurship law',                                  'startup',                  'i18n:en'),
  ('international contracts & comparative law',                        'uluslararasi-sozlesmeler', 'i18n:en'),
  ('cybercrime law',                                                    'bilisim-ceza',              'i18n:en'),
  ('corporate, commercial and contract law',                            'sirketler-ticaret',         'i18n:en'),
  ('traditional legal disciplines (family, inheritance, real estate)',  'aile-miras',                'i18n:en'),
  -- ar
  ('تكنولوجيا المعلومات والذكاء الاصطناعي والحقوق الرقمية',              'bilisim-yz-dijital',       'i18n:ar'),
  ('قانون الشركات الناشئة وريادة الأعمال',                              'startup',                  'i18n:ar'),
  ('العقود الدولية والقانون المقارن',                                   'uluslararasi-sozlesmeler', 'i18n:ar'),
  ('قانون الجرائم الإلكترونية',                                         'bilisim-ceza',              'i18n:ar'),
  ('قانون الشركات والتجارة والعقود',                                    'sirketler-ticaret',         'i18n:ar'),
  ('المجالات القانونية التقليدية (الأسرة، الميراث، العقارات)',          'aile-miras',                'i18n:ar'),
  -- fa
  ('فناوری اطلاعات، هوش مصنوعی و حقوق دیجیتال',                          'bilisim-yz-dijital',       'i18n:fa'),
  ('حقوق استارتاپ و کارآفرینی',                                         'startup',                  'i18n:fa'),
  ('قراردادهای بین‌المللی و حقوق تطبیقی',                                'uluslararasi-sozlesmeler', 'i18n:fa'),
  ('حقوق جرایم رایانه‌ای',                                               'bilisim-ceza',              'i18n:fa'),
  ('حقوق شرکت‌ها، تجارت و قراردادها',                                    'sirketler-ticaret',         'i18n:fa'),
  ('حوزه‌های حقوقی سنتی (خانواده، ارث، املاک)',                          'aile-miras',                'i18n:fa'),
  -- ru
  ('ит, искусственный интеллект и цифровые права',                      'bilisim-yz-dijital',       'i18n:ru'),
  ('право стартапов и предпринимательства',                             'startup',                  'i18n:ru'),
  ('международные договоры и сравнительное право',                      'uluslararasi-sozlesmeler', 'i18n:ru'),
  ('киберпреступность',                                                 'bilisim-ceza',              'i18n:ru'),
  ('корпоративное, коммерческое и договорное право',                    'sirketler-ticaret',         'i18n:ru'),
  ('традиционные отрасли права (семейное, наследственное, недвижимость)','aile-miras',                'i18n:ru'),
  -- fr
  ('informatique, intelligence artificielle et droits numériques',      'bilisim-yz-dijital',       'i18n:fr'),
  ('droit des startups et de l''entrepreneuriat',                       'startup',                  'i18n:fr'),
  ('contrats internationaux et droit comparé',                          'uluslararasi-sozlesmeler', 'i18n:fr'),
  ('droit de la cybercriminalité',                                      'bilisim-ceza',              'i18n:fr'),
  ('droit des sociétés, commercial et des contrats',                    'sirketler-ticaret',         'i18n:fr'),
  ('disciplines juridiques traditionnelles (famille, succession, immobilier)', 'aile-miras',          'i18n:fr'),
  -- de
  ('it, künstliche intelligenz und digitale rechte',                    'bilisim-yz-dijital',       'i18n:de'),
  ('startup- und unternehmensrecht',                                    'startup',                  'i18n:de'),
  ('internationale verträge & rechtsvergleichung',                      'uluslararasi-sozlesmeler', 'i18n:de'),
  ('cyberkriminalitätsrecht',                                           'bilisim-ceza',              'i18n:de'),
  ('gesellschafts-, handels- und vertragsrecht',                        'sirketler-ticaret',         'i18n:de'),
  ('traditionelle rechtsgebiete (familie, erbschaft, immobilien)',      'aile-miras',                'i18n:de')
ON CONFLICT (alias_normalized) DO NOTHING;

ALTER TABLE clients
  ADD COLUMN practice_area_id TEXT REFERENCES practice_areas(id),
  ADD COLUMN assigned_to      UUID REFERENCES auth.users(id),
  ADD COLUMN updated_at       TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN resolved_at      TIMESTAMPTZ;

-- Tek seferlik backfill: eşleşen case_type değerleri practice_area_id'ye
-- bağlanır. Eşleşmeyenler NULL kalır ve panelde "eşleştirilmemiş" olarak
-- gösterilir — hiçbir satır tahmin edilerek doldurulmaz.
UPDATE clients c
   SET practice_area_id = a.practice_area_id
  FROM practice_area_aliases a
 WHERE a.alias_normalized = lower(trim(c.case_type))
   AND c.practice_area_id IS NULL;

-- Mevcut 'resolved' kayıtlar için resolved_at bilinmiyor; created_at ile
-- doldurmak sahte veri üretmek olurdu — NULL bırakılır.

CREATE INDEX IF NOT EXISTS idx_clients_practice_area ON clients (practice_area_id);
CREATE INDEX IF NOT EXISTS idx_clients_status        ON clients (status);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to   ON clients (assigned_to);

ALTER TABLE practice_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for practice_areas" ON practice_areas
  FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE practice_area_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for practice_area_aliases" ON practice_area_aliases
  FOR SELECT USING (auth.role() = 'authenticated');
-- Avukat elle bir alan atadığında uygulama aynı serbest metni buraya da
-- yazar (bkz. src/modules/practice-areas/services/resolveAlias.ts) — böylece
-- taksonomi kendini iyileştirir.
CREATE POLICY "Allow authenticated insert for practice_area_aliases" ON practice_area_aliases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────
-- 20260729002000_cases.sql
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- 20260729003000_agenda.sql
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- 20260729004000_finance.sql
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- 20260729005000_institutions.sql
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- 20260729006000_analytics_rpc.sql
-- ─────────────────────────────────────────────────────────
-- Analitik RPC'leri. Mevcut analyticsService.ts client-side (unpaginated)
-- select yapıyordu — bu yalnızca ölçek sorunu değil, PostgREST'in 1000
-- satırlık varsayılan tavanı yüzünden BUGÜN ZATEN yanlış sayı üretiyor
-- (totalTokens/llmCallCount 1000. satırdan sonra büyümüyor). Finans
-- eklenince client-side yaklaşım her ücret tutarını sadece grafik çizmek
-- için tarayıcıya indirirdi — hem yavaş hem KVKK açısından aşırı ifşa.
--
-- Tümü SECURITY INVOKER: RLS uygulanmaya devam eder, bu yüzden rol bazlı
-- görünürlük analitikte bedava gelir — avukat yalnızca kendi dosyalarının,
-- yönetici büronun tamamının rakamlarını görür. SECURITY DEFINER burada
-- tüm büronun finansalını sızdırırdı.

CREATE OR REPLACE FUNCTION analytics_monthly_cashflow(p_from DATE, p_to DATE)
RETURNS TABLE (bucket DATE, income_try NUMERIC, expense_try NUMERIC, net_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('month', m)::date AS bucket,
         COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'income'),  0) AS income_try,
         COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'expense'), 0) AS expense_try,
         COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'income'),  0)
       - COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'expense'), 0) AS net_try
    FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), '1 month') m
    LEFT JOIN ledger_entries e
      ON date_trunc('month', e.entry_date) = m
     AND e.entry_type IN ('income', 'expense')
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_monthly_cashflow(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION analytics_case_mix(p_from DATE, p_to DATE)
RETURNS TABLE (area_id TEXT, label TEXT, case_count BIGINT, open_count BIGINT, income_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT pa.id, pa.label_tr,
         COUNT(DISTINCT c.id),
         COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('aktif', 'istinaf', 'temyiz')),
         COALESCE(SUM(le.amount_try) FILTER (WHERE le.entry_type = 'income' AND le.paid_at IS NOT NULL), 0)
    FROM practice_areas pa
    JOIN cases c ON c.practice_area_id = pa.id AND c.opened_at BETWEEN p_from AND p_to
    LEFT JOIN ledger_entries le ON le.case_id = c.id
   GROUP BY pa.id, pa.label_tr
  HAVING COUNT(DISTINCT c.id) > 0
   ORDER BY 3 DESC;
$$;
GRANT EXECUTE ON FUNCTION analytics_case_mix(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION analytics_receivables_aging()
RETURNS TABLE (bucket TEXT, sort_order INT, total_try NUMERIC, entry_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT b.bucket, b.sort_order, COALESCE(SUM(e.amount_try), 0), COUNT(e.id)
    FROM (VALUES ('Vadesi gelmedi', 0), ('0-30 gün', 1), ('31-60 gün', 2), ('61-90 gün', 3), ('90+ gün', 4)) AS b(bucket, sort_order)
    LEFT JOIN ledger_entries e
      ON e.entry_type = 'income' AND e.paid_at IS NULL AND e.due_date IS NOT NULL
     AND b.bucket = CASE
           WHEN e.due_date > CURRENT_DATE           THEN 'Vadesi gelmedi'
           WHEN CURRENT_DATE - e.due_date <= 30      THEN '0-30 gün'
           WHEN CURRENT_DATE - e.due_date <= 60      THEN '31-60 gün'
           WHEN CURRENT_DATE - e.due_date <= 90      THEN '61-90 gün'
           ELSE '90+ gün' END
   GROUP BY 1, 2 ORDER BY 2;
$$;
GRANT EXECUTE ON FUNCTION analytics_receivables_aging() TO authenticated;

-- Başvuru -> dosya dönüşüm hunisi: o ay oluşturulan başvurulardan kaçının
-- (herhangi bir zamanda) bir dosyaya dönüştüğünü sayar. Web sitesindeki
-- 7 dilli danışma formunun gerçek iş ürettip üretmediğini ölçen tek grafik.
CREATE OR REPLACE FUNCTION analytics_intake_funnel(p_from DATE, p_to DATE)
RETURNS TABLE (bucket DATE, applications BIGINT, converted BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('month', m)::date AS bucket,
         COUNT(cl.id),
         COUNT(cl.id) FILTER (WHERE EXISTS (SELECT 1 FROM cases c WHERE c.client_id = cl.id))
    FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), '1 month') m
    LEFT JOIN clients cl ON date_trunc('month', cl.created_at) = m
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_intake_funnel(DATE, DATE) TO authenticated;

-- İleriye bakan tek grafik: önümüzdeki p_weeks hafta için duruşma/süre
-- yoğunluğu. Hangi haftaya başka iş almamak gerektiğini söyler.
CREATE OR REPLACE FUNCTION analytics_hearing_load(p_weeks INT)
RETURNS TABLE (week_start DATE, hearings BIGINT, deadlines BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('week', w)::date AS week_start,
         COUNT(ce.id) FILTER (WHERE ce.event_type = 'durusma'),
         COUNT(ce.id) FILTER (WHERE ce.event_type = 'sure')
    FROM generate_series(date_trunc('week', CURRENT_DATE), date_trunc('week', CURRENT_DATE) + ((p_weeks - 1) * 7 || ' days')::interval, '1 week') w
    LEFT JOIN case_events ce
      ON date_trunc('week', ce.starts_at) = w
     AND ce.status = 'planlandi'
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_hearing_load(INT) TO authenticated;

-- Açık dosya yaş dağılımı: unutulmuş dosyaları yüzeye çıkarır.
CREATE OR REPLACE FUNCTION analytics_case_age()
RETURNS TABLE (bucket TEXT, sort_order INT, case_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT b.bucket, b.sort_order, COUNT(c.id)
    FROM (VALUES ('0-3 ay', 0), ('3-6 ay', 1), ('6-12 ay', 2), ('1-2 yıl', 3), ('2+ yıl', 4)) AS b(bucket, sort_order)
    LEFT JOIN cases c
      ON c.status IN ('aktif', 'istinaf', 'temyiz')
     AND b.bucket = CASE
           WHEN CURRENT_DATE - c.opened_at <= 90         THEN '0-3 ay'
           WHEN CURRENT_DATE - c.opened_at <= 180         THEN '3-6 ay'
           WHEN CURRENT_DATE - c.opened_at <= 365         THEN '6-12 ay'
           WHEN CURRENT_DATE - c.opened_at <= 730         THEN '1-2 yıl'
           ELSE '2+ yıl' END
   GROUP BY 1, 2 ORDER BY 2;
$$;
GRANT EXECUTE ON FUNCTION analytics_case_age() TO authenticated;

-- 1000 satır PostgREST tavanını çözer: sunucu tarafında toplanır, tam token
-- sayısı tarayıcıya hiç indirilmez.
CREATE OR REPLACE FUNCTION analytics_llm_usage(p_from DATE, p_to DATE)
RETURNS TABLE (bucket DATE, tokens BIGINT, calls BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('month', m)::date AS bucket,
         COALESCE(SUM(l.tokens_used), 0),
         COUNT(l.id)
    FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), '1 month') m
    LEFT JOIN llm_logs l ON date_trunc('month', l.created_at) = m
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_llm_usage(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION analytics_kpis(p_from DATE, p_to DATE)
RETURNS TABLE (
  income_try NUMERIC, expense_try NUMERIC, net_try NUMERIC,
  receivable_try NUMERIC, trust_balance_try NUMERIC,
  open_cases BIGINT, new_cases BIGINT,
  hearings_next_7d BIGINT, deadlines_next_7d BIGINT,
  new_applications BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'income'  AND entry_date BETWEEN p_from AND p_to), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'expense' AND entry_date BETWEEN p_from AND p_to), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'income'  AND entry_date BETWEEN p_from AND p_to), 0)
      - COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'expense' AND entry_date BETWEEN p_from AND p_to), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'income' AND paid_at IS NULL), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'trust_in'), 0)
      - COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'trust_out'), 0),
    (SELECT COUNT(*) FROM cases WHERE status IN ('aktif', 'istinaf', 'temyiz')),
    (SELECT COUNT(*) FROM cases WHERE opened_at BETWEEN p_from AND p_to),
    (SELECT COUNT(*) FROM case_events WHERE event_type = 'durusma' AND status = 'planlandi' AND starts_at BETWEEN NOW() AND NOW() + interval '7 days'),
    (SELECT COUNT(*) FROM case_events WHERE event_type = 'sure' AND status = 'planlandi' AND computed_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7),
    (SELECT COUNT(*) FROM clients WHERE created_at BETWEEN p_from AND p_to);
$$;
GRANT EXECUTE ON FUNCTION analytics_kpis(DATE, DATE) TO authenticated;

-- ─────────────────────────────────────────────────────────
-- 20260729007000_notifications.sql
-- ─────────────────────────────────────────────────────────
-- Hatırlatma bildirimleri. src/app/api/cron/agenda-reminders/route.ts her gün
-- bu tabloya satır yazar; mobil sekme çubuğundaki rozet buradan okunur.
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    UUID REFERENCES auth.users(id),   -- NULL = büro geneli (tüm authenticated görür)
  event_id   UUID REFERENCES case_events(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read own or broadcast for notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Allow update own for notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
-- INSERT yalnızca service-role (cron) tarafından yapılır, authenticated
-- politikası yok — kullanıcılar birbirine sahte bildirim yazamaz.

-- ─────────────────────────────────────────────────────────
-- 20260729008000_case_law.sql
-- ─────────────────────────────────────────────────────────
-- İçtihat (case law) RAG genişletmesi. Bedesten (Adalet Bakanlığı'nın
-- mevzuat.adalet.gov.tr'nin kullandığı emsal-karar arka ucu) üzerinden
-- büronun pratik alanlarına hedefli, küçük anahtar kelime taramalarıyla
-- büyüyen, doğrulanmış bir kapsamla başlar — legal-codes'un 15 kanunla
-- başlayıp büyümesiyle aynı disiplin. "Milyonlarca karar" gibi büyük
-- iddialar bilinçli olarak yapılmaz (bkz. src/modules/case-law/registry.ts).

CREATE TABLE case_law_decisions (
  id               TEXT PRIMARY KEY,           -- Bedesten documentId
  decision_type    TEXT,                       -- 'Yargıtay Kararı' vb. (itemType.description)
  birim            TEXT,                       -- '22. Hukuk Dairesi'
  esas_no          TEXT,
  karar_no         TEXT,
  karar_tarihi     DATE,
  search_keyword   TEXT NOT NULL,              -- hangi tarama bunu getirdi
  practice_area_id TEXT REFERENCES practice_areas(id),
  content          TEXT NOT NULL,
  -- documents.embedding ile aynı boyut (768) — aktif sağlayıcıya göre
  -- embedQuery() ya LM Studio (nomic-embed, 768) ya OpenAI (1536) döner;
  -- bu tablo mevcut bilgi bankası kuruluş kararıyla tutarlı kalır.
  embedding        vector(768),
  source_url       TEXT NOT NULL,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_law_practice_area ON case_law_decisions (practice_area_id);
CREATE INDEX IF NOT EXISTS idx_case_law_karar_tarihi  ON case_law_decisions (karar_tarihi DESC);
CREATE INDEX IF NOT EXISTS idx_case_law_content_trgm  ON case_law_decisions USING GIN (content gin_trgm_ops);

ALTER TABLE case_law_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for case_law_decisions" ON case_law_decisions
  FOR SELECT USING (auth.role() = 'authenticated');

-- match_documents (bilgi bankası RPC'si) ile aynı desen, case_law_decisions
-- üzerinde. SECURITY INVOKER: case_law_decisions SELECT politikası zaten
-- tüm authenticated'e açık, ekstra bir kısıtlama gerekmiyor.
CREATE OR REPLACE FUNCTION match_case_law(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text, decision_type text, birim text, esas_no text, karar_no text,
  karar_tarihi date, content text, source_url text, similarity float
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT cld.id, cld.decision_type, cld.birim, cld.esas_no, cld.karar_no,
         cld.karar_tarihi, cld.content, cld.source_url,
         1 - (cld.embedding <=> query_embedding) AS similarity
    FROM case_law_decisions cld
   WHERE cld.embedding IS NOT NULL
     AND 1 - (cld.embedding <=> query_embedding) > match_threshold
   ORDER BY similarity DESC
   LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION match_case_law(vector(768), float, int) TO authenticated;

-- ─────────────────────────────────────────────────────────
-- 20260729010000_notifications_messaging.sql
-- ─────────────────────────────────────────────────────────
-- Büro içi haberleşme: notifications tablosu şimdiye dek yalnızca
-- agenda-reminders cron'unun (service-role) yazdığı otomatik hatırlatmaları
-- taşıyordu — hiçbir authenticated INSERT politikası yoktu, personel
-- birbirine mesaj/duyuru gönderemiyordu. Bu migration mevcut tabloyu
-- genişletir, yeni bir tablo eklemez.

ALTER TABLE notifications
  ADD COLUMN sender_id UUID REFERENCES auth.users(id),
  -- 'sistem' = cron/otomatik hatırlatma (mevcut davranış), 'duyuru' = tüm
  -- büroya yönetici mesajı, 'mesaj' = belirli bir kişiye doğrudan mesaj.
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'sistem' CHECK (kind IN ('sistem', 'duyuru', 'mesaj'));

-- Personelin gönderdiği duyuru/mesajları INSERT edebilmesi için politika.
-- Doğrudan mesaj (user_id dolu) herhangi bir personelden herhangi birine
-- gönderilebilir; büro geneli duyuru (user_id NULL = broadcast) yalnızca
-- yöneticiden — aksi halde herkes tüm büroya spam atabilir.
CREATE POLICY "Allow staff insert for notifications" ON notifications
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND kind IN ('duyuru', 'mesaj')
    AND (user_id IS NOT NULL OR is_yonetici())
  );

-- Gönderen kendi mesajını geri çekebilir (yanlışlıkla gönderilen bir
-- duyuruyu silmek gibi); yönetici herhangi birini silebilir.
CREATE POLICY "Allow sender or yonetici delete for notifications" ON notifications
  FOR DELETE USING (sender_id = auth.uid() OR is_yonetici());

CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications (sender_id);

-- profiles'taki mevcut SELECT politikası ("Allow self select for profiles",
-- 20260729000000) yalnızca kendi profilinizi veya (yöneticiyseniz) herkesi
-- görmenize izin veriyordu — sıradan bir avukat/stajyer mesaj göndermek için
-- meslektaş seçemezdi çünkü onları hiç göremiyordu. Aşağıdaki politika,
-- mevcut politikayla OR'lanarak, tüm aktif personelin küçük bir büro içi
-- rehber olarak birbirini görmesine izin verir (e-posta/rol dahil — küçük,
-- güvenilir bir ekip için makul bir şeffaflık düzeyi).
CREATE POLICY "Allow authenticated select for team directory" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active);

-- ─────────────────────────────────────────────────────────
-- 20260730000000_case_clients.sql
-- ─────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────
-- 20260730001000_client_receivables_rpc.sql
-- ─────────────────────────────────────────────────────────
-- Müvekkilden alacak raporu: analytics_receivables_aging()'deki bucket CASE
-- ifadesi aynen taşınır, case_clients üzerinden müvekkil bazlı gruplanır.
-- (case_clients bir dosyanın hem tek hem çok müvekkilli hâlini tek doğru
-- şekilde kapsadığı için ledger_entries.client_id yerine bu kullanılır —
-- bkz. 20260730000000_case_clients.sql.)
CREATE OR REPLACE FUNCTION analytics_client_receivables()
RETURNS TABLE (client_id UUID, full_name TEXT, phone TEXT, not_due_try NUMERIC,
               d0_30_try NUMERIC, d31_60_try NUMERIC, d61_90_try NUMERIC, d90_plus_try NUMERIC,
               total_try NUMERIC, oldest_due_date DATE, open_entry_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT cl.id, cl.full_name, cl.phone,
         COALESCE(SUM(le.amount_try) FILTER (WHERE le.due_date > CURRENT_DATE), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date BETWEEN 0 AND 30), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date BETWEEN 31 AND 60), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date BETWEEN 61 AND 90), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date > 90), 0),
         COALESCE(SUM(le.amount_try), 0), MIN(le.due_date), COUNT(le.id)
    FROM clients cl
    JOIN case_clients cc ON cc.client_id = cl.id
    JOIN ledger_entries le ON le.case_id = cc.case_id
   WHERE le.entry_type = 'income' AND le.paid_at IS NULL AND le.due_date IS NOT NULL
   GROUP BY cl.id, cl.full_name, cl.phone
  HAVING SUM(le.amount_try) > 0
   ORDER BY 9 DESC;
$$;
GRANT EXECUTE ON FUNCTION analytics_client_receivables() TO authenticated;


-- ─────────────────────────────────────────────────────────
-- 20260730002000_case_status_links.sql
-- ─────────────────────────────────────────────────────────
-- Müvekkil durum linki: şifre/kullanıcı adıyla giriş formu YOK. Personel bir
-- (dosya, müvekkil) çifti için tek kullanımlık bir link üretir, kendisi
-- WhatsApp/SMS/e-posta ile müvekkile gönderir. Link, o TEK dosyanın durumunu
-- gösterir — bir müvekkilin 2 dosyası varsa 2 ayrı link olur, bir dosyanın
-- 3 müvekkili varsa her biri aynı dosya için kendi ayrı linkini alır.
CREATE TABLE case_status_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash       TEXT NOT NULL UNIQUE,   -- sha256(ham token) — ham token DB'ye asla yazılmaz
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id),
  regenerated_at   TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE (case_id, client_id)             -- bu dosya + bu müvekkil için tek aktif link
);

-- KASITLI OLARAK RLS AÇIK, HİÇ POLİTİKA YOK — varsayılan-red. Bu tabloya
-- yalnızca supabaseAdmin (service-role, sunucu taraflı) erişebilir; anon/
-- authenticated hiçbir zaman doğrudan sorgulayamaz. Müvekkil linke token ile
-- erişir, Supabase oturumu hiç kullanmaz (bkz. src/modules/client-portal).
ALTER TABLE case_status_links ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────
-- 20260730003000_office_budget.sql
-- ─────────────────────────────────────────────────────────
-- Ofis bütçe/gider yönetimi güçlendirmesi. Tam muhasebe yazılımı DEĞİL —
-- mevcut Finans defterinin (yönetim raporlama, resmi muhasebe defteri
-- değil) büro-geneli gider tarafını güçlendirir: tekrarlayan giderler,
-- kasa/banka bakiyesi, aylık bütçe-gerçekleşen karşılaştırması.

CREATE TABLE recurring_expense_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    TEXT NOT NULL REFERENCES ledger_categories(id),
  description    TEXT NOT NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  day_of_month   INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_generated_month DATE,          -- o ayın 1'i olarak tutulur, tekrar üretimi önler
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,            -- 'Kasa', 'Ziraat Bankası - Vadesiz'
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ledger_entries ADD COLUMN cash_account_id UUID REFERENCES cash_accounts(id);
CREATE INDEX IF NOT EXISTS idx_ledger_cash_account ON ledger_entries (cash_account_id);

CREATE TABLE office_budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    TEXT NOT NULL REFERENCES ledger_categories(id),
  year           INT NOT NULL,
  month          INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  budgeted_try   NUMERIC(14,2) NOT NULL CHECK (budgeted_try >= 0),
  UNIQUE (category_id, year, month)
);

-- RLS: referans/yönetim verisi deseni (deadline_rules ile aynı şekil) —
-- tüm authenticated okur, yalnızca yönetici yazar. Finans ekranının bir
-- parçası olduğu için stajyer bu ekranı zaten hiç görmez (UI tarafında
-- can_see_finance() ile gizlenir), ama RLS okumayı engellemez — kasıtlı:
-- kategori/kasa isimleri gizli değil, yalnızca tutarların bulunduğu
-- ledger_entries zaten ayrı RLS ile korunuyor.
ALTER TABLE recurring_expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for recurring_expense_templates" ON recurring_expense_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for recurring_expense_templates" ON recurring_expense_templates FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for cash_accounts" ON cash_accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for cash_accounts" ON cash_accounts FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

ALTER TABLE office_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for office_budgets" ON office_budgets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for office_budgets" ON office_budgets FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

-- Her kasa/banka hesabının güncel bakiyesi (trust hariç — emanet parası
-- büronun kendi kasası değildir). SECURITY INVOKER: ledger_entries RLS'i
-- miras alır, ama kasa/banka bakiyesi zaten büro geneli bir özet olduğu
-- için pratikte yalnızca yönetici/avukat anlamlı veri görür.
CREATE OR REPLACE FUNCTION analytics_cash_balance()
RETURNS TABLE (cash_account_id UUID, name TEXT, balance_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT ca.id, ca.name,
         ca.opening_balance
           + COALESCE(SUM(le.amount_try) FILTER (WHERE le.entry_type = 'income'), 0)
           - COALESCE(SUM(le.amount_try) FILTER (WHERE le.entry_type = 'expense'), 0)
    FROM cash_accounts ca
    LEFT JOIN ledger_entries le ON le.cash_account_id = ca.id
   WHERE ca.is_active
   GROUP BY ca.id, ca.name, ca.opening_balance
   ORDER BY ca.name;
$$;
GRANT EXECUTE ON FUNCTION analytics_cash_balance() TO authenticated;

-- Bütçe vs gerçekleşen: seçili ay için, kategori bazlı. office_budgets'ta
-- girilmemiş bir kategori de gerçekleşen gideri varsa satırda görünür
-- (budgeted_try 0 olarak) — sessizce atlanmaz.
CREATE OR REPLACE FUNCTION analytics_office_budget_vs_actual(p_year INT, p_month INT)
RETURNS TABLE (category_id TEXT, label TEXT, budgeted_try NUMERIC, actual_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT lc.id, lc.label, COALESCE(ob.budgeted_try, 0) AS budgeted_try,
         COALESCE((
           SELECT SUM(le.amount_try) FROM ledger_entries le
            WHERE le.category_id = lc.id AND le.entry_type = 'expense'
              AND EXTRACT(YEAR FROM le.entry_date) = p_year AND EXTRACT(MONTH FROM le.entry_date) = p_month
         ), 0) AS actual_try
    FROM ledger_categories lc
    LEFT JOIN office_budgets ob ON ob.category_id = lc.id AND ob.year = p_year AND ob.month = p_month
   WHERE lc.entry_type = 'expense'
     AND (COALESCE(ob.budgeted_try, 0) > 0 OR EXISTS (
           SELECT 1 FROM ledger_entries le
            WHERE le.category_id = lc.id AND le.entry_type = 'expense'
              AND EXTRACT(YEAR FROM le.entry_date) = p_year AND EXTRACT(MONTH FROM le.entry_date) = p_month
         ))
   ORDER BY 4 DESC;
$$;
GRANT EXECUTE ON FUNCTION analytics_office_budget_vs_actual(INT, INT) TO authenticated;


-- ─────────────────────────────────────────────────────────
-- 20260731000000_clients_image_url.sql
-- ─────────────────────────────────────────────────────────
-- Web sitesindeki danışma formuna eklenen "Görsel/Fotoğraf Yükleyin" alanı
-- (ConsultationRequestForm.tsx) attachment_url'den ayrı, ayrı bir image_url
-- kolonuna yazıyor — örn. müvekkilin olay yeri/belge fotoğrafı gibi
-- attachment_url'deki resmi belgeden (PDF/Word) farklı, görsel ağırlıklı bir
-- ek. attachment_url deseniyle birebir aynı: opsiyonel, herkese açık
-- formdan anonim insert ile yazılabilir (mevcut "Allow public insert for
-- clients" politikası zaten tüm kolonları kapsıyor, ek bir politika gerekmez).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS image_url TEXT;


-- ─────────────────────────────────────────────────────────
-- 20260801000000_app_settings.sql
-- ─────────────────────────────────────────────────────────
-- Merkezi ayarlar deposu. CMS içeriği (`cms-data.json`) ve LLM sağlayıcı
-- ayarları (`llm-settings.json`) şimdiye kadar `fs.writeFileSync` ile diske
-- yazılıyordu — Vercel'de bu dizin salt-okunur, yani üretimde yapılan
-- değişiklikler kalıcı olmuyordu (fark edilmemiş, kritik bir hata). Bu
-- tablo o iki dosyanın ve yeni tema/sayaç ayarlarının tek doğru kaynağı
-- olur; `src/lib/cms.ts` ve `src/lib/llmSettings.ts` fonksiyon imzaları
-- aynı kalır, yalnızca fs yerine bu tabloyu okur/yazar.
CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- SELECT herkese açık (anon dahil): public site tema/CMS içeriğini render
-- ederken oturum yok. Yazma yalnızca yönetici — bu politika, master rolü
-- eklendiğinde (20260802000000_master_tenants.sql) is_master() da
-- kapsayacak şekilde DROP+CREATE ile genişletilir.
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select for app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow yonetici write for app_settings" ON app_settings FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());


-- ─────────────────────────────────────────────────────────
-- 20260802000000_master_tenants.sql
-- ─────────────────────────────────────────────────────────
-- SaaS platform temeli — YALNIZCA TEMEL. Gerçek çok-kiracılı izolasyon
-- (cases/clients/ledger_entries gibi ~15-20 iş tablosuna tenant_id +
-- genişletilmiş RLS) bilerek BU MİGRATION'A DAHİL EDİLMEDİ: bugün sistemde
-- tek bir kiracı (Üste Hukuk) var, ikinci bir büro olmadan izolasyonu canlı
-- test etmenin yolu yok — doğrulanamayan bir RLS değişikliği, tam olarak
-- önlemeye çalıştığı türden bir veri sızıntısı riski taşır. Gerçek bir
-- ikinci kiracı sisteme alınacağı gün, o kiracıyla birlikte ve iki-kiracılı
-- canlı testle yapılacak.
--
-- Burada kurulan: kiracı kaydı (tenants), master rolü ve is_master()
-- yardımcı fonksiyonu, ve mevcut "master avukat yetkilendiremiyoruz"
-- hatasının kök nedeni olan sessiz RLS başarısızlığının düzeltilmesi.

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  feature_flags JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO tenants (slug, name) VALUES ('uste-hukuk', 'Üste Hukuk Bürosu')
  ON CONFLICT (slug) DO NOTHING;

-- Bugün her profildeki tenant_id tek bir değere (uste-hukuk) sabitlenir —
-- gerçek çok-kiracılı davranış (RLS'in tenant_id'ye göre satır filtrelemesi)
-- yalnızca ikinci bir kiracı eklendiğinde devreye girer.
ALTER TABLE profiles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE profiles SET tenant_id = (SELECT id FROM tenants WHERE slug = 'uste-hukuk') WHERE tenant_id IS NULL;

-- 'master' rolü yönetici'nin üstünde, kiracıya bağlı DEĞİL — tüm
-- kiracıları görür (platformu işleten taraf, büronun kendisi değil).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('master', 'yonetici', 'avukat', 'stajyer'));

CREATE OR REPLACE FUNCTION is_master() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT current_user_role() = 'master' $$;
GRANT EXECUTE ON FUNCTION is_master() TO authenticated;

-- app_settings yazma politikası master'ı da kapsayacak şekilde genişletilir
-- (bkz. 20260801000000_app_settings.sql'deki not).
DROP POLICY IF EXISTS "Allow yonetici write for app_settings" ON app_settings;
CREATE POLICY "Allow yonetici or master write for app_settings" ON app_settings
  FOR ALL USING (is_yonetici() OR is_master()) WITH CHECK (is_yonetici() OR is_master());

-- master her kiracıdaki her profili görebilir/düzenleyebilir (mevcut
-- "Allow self select"/"Allow yonetici update" politikalarıyla OR'lanır).
CREATE POLICY "Allow master select for profiles" ON profiles FOR SELECT USING (is_master());
CREATE POLICY "Allow master update for profiles" ON profiles FOR UPDATE USING (is_master());

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow master all for tenants" ON tenants FOR ALL USING (is_master()) WITH CHECK (is_master());
-- Kendi kiracısını herkes okuyabilir (ör. dashboard'da büro adını göstermek için).
CREATE POLICY "Allow authenticated select own tenant" ON tenants FOR SELECT USING (
  id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Aşama 4: dashboard menüsü sıralaması (bkz. 20260803000000_nav_order.sql'deki not).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nav_order TEXT[];

CREATE OR REPLACE FUNCTION set_nav_order(new_order TEXT[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles SET nav_order = new_order WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION set_nav_order(TEXT[]) TO authenticated;

-- Aşama 6: token sayacı sıfırlama (bkz. 20260804000000_token_counter.sql'deki not).
CREATE OR REPLACE FUNCTION total_llm_tokens(p_since TIMESTAMPTZ DEFAULT NULL)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(tokens_used), 0)::BIGINT
  FROM llm_logs
  WHERE p_since IS NULL OR created_at > p_since;
$$;

GRANT EXECUTE ON FUNCTION total_llm_tokens(TIMESTAMPTZ) TO authenticated;

-- Aşama 5: güvenlik güçlendirmesi (bkz. 20260805000000_security_hardening.sql'deki not).
DROP POLICY IF EXISTS "Allow authenticated select for logs" ON llm_logs;
CREATE POLICY "Allow yonetici or master select for logs" ON llm_logs
  FOR SELECT USING (is_yonetici() OR is_master());

CREATE TABLE audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES auth.users(id),
  action     TEXT NOT NULL,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow yonetici or master select for audit_log" ON audit_log
  FOR SELECT USING (is_yonetici() OR is_master());

CREATE OR REPLACE FUNCTION log_audit_event(p_action TEXT, p_details JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO audit_log (actor_id, action, details) VALUES (auth.uid(), p_action, p_details);
$$;

GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, JSONB) TO authenticated;

-- Aşama 10: blog (bkz. 20260806000000_blog_posts.sql'deki not).
CREATE TABLE blog_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,
  title            JSONB NOT NULL,
  excerpt          JSONB NOT NULL,
  content          JSONB NOT NULL,
  cover_image_url  TEXT,
  author_id        UUID REFERENCES profiles(id),
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX blog_posts_status_published_at_idx ON blog_posts (status, published_at DESC);

CREATE TRIGGER blog_posts_touch_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for published blog_posts" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Allow yonetici or master select for all blog_posts" ON blog_posts
  FOR SELECT USING (is_yonetici() OR is_master());

CREATE POLICY "Allow yonetici or master insert for blog_posts" ON blog_posts
  FOR INSERT WITH CHECK (is_yonetici() OR is_master());

CREATE POLICY "Allow yonetici or master update for blog_posts" ON blog_posts
  FOR UPDATE USING (is_yonetici() OR is_master()) WITH CHECK (is_yonetici() OR is_master());

CREATE POLICY "Allow yonetici or master delete for blog_posts" ON blog_posts
  FOR DELETE USING (is_yonetici() OR is_master());

-- Aşama 8: İzmir çekirdek kurum listesi (bkz. 20260807000000_izmir_institutions_seed.sql'deki not).
INSERT INTO institutions (kind, name, city, district, address, phone, website, notes, verified_at) VALUES
  ('adliye', 'İzmir Adliyesi (Ana Bina)', 'İzmir', 'Bayraklı',
   'Adalet Mahallesi, Şehit Polis Fethi Sekin Caddesi No:11/A, Bayraklı/İzmir',
   '0232 411 20 00', 'https://izmir.adalet.gov.tr',
   'Kaynak: Adalet Bakanlığı resmi sitesi (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin. İzmir Adliyesi tek binada değil, şehrin farklı noktalarında birden fazla yerleşkede hizmet verir; mahkemeye göre bina değişebilir.',
   NULL),
  ('adliye', 'Karşıyaka Adliyesi (Ana Bina)', 'İzmir', 'Karşıyaka',
   'Bahariye Mahallesi No:15, Karşıyaka/İzmir',
   '0232 368 03 03', 'https://karsiyaka.adalet.gov.tr',
   'Kaynak: Adalet Bakanlığı resmi sitesi (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('goc_idaresi', 'İzmir İl Göç İdaresi Müdürlüğü', 'İzmir', 'Konak',
   'Konak Mahallesi, 855 Sokak No:40D, Konak/İzmir',
   '0232 402 44 62', 'https://izmir.goc.gov.tr',
   'Kaynak: web araması (2026-08), resmi site izmir.goc.gov.tr üzerinden teyit edilebilir. Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('cezaevi', 'İzmir Kadın Kapalı Ceza İnfaz Kurumu (Şakran)', 'İzmir', 'Aliağa',
   'İzmir Aliağa Ceza İnfaz Kurumları Kampüsü, Bahçedere Köyü No:63/24, Yeni Şakran/Aliağa-İzmir',
   '0232 618 10 52', 'https://izmirkkcik.adalet.gov.tr',
   'Kaynak: Adalet Bakanlığı resmi sitesi (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('cezaevi', 'İzmir 1 Nolu T Tipi Kapalı Ceza İnfaz Kurumu (Şakran)', 'İzmir', 'Aliağa',
   'Aliağa Ceza İnfaz Kurumları Kampüsü, Bahçedere Köyü, Yeni Şakran/Aliağa-İzmir',
   '0232 618 10 03', NULL,
   'Kaynak: web araması (2026-08). Adres, kampüs genelinden alınmıştır — tam kapı numarası büro tarafından teyit edilmelidir.',
   NULL),
  ('baro', 'İzmir Barosu', 'İzmir', 'Konak',
   '1456 Sokak No:14, Alsancak/İzmir',
   '0232 463 00 14', 'https://www.izmirbarosu.org.tr',
   'Kaynak: web araması (2026-08), resmi site izmirbarosu.org.tr üzerinden teyit edilebilir. Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('tapu', 'Konak Tapu Müdürlüğü', 'İzmir', 'Konak',
   '1474 Sokak No:10-12, Alsancak/İzmir',
   '0232 280 21 01', 'https://www.tkgm.gov.tr/izmir-bm/konak-tapu-mudurlugu',
   'Kaynak: TKGM resmi sayfası (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL);

-- Kritik güvenlik sıkılaştırması (bkz. 20260808000000_critical_security_hardening.sql'deki not).
DROP POLICY IF EXISTS "Allow public read for docs" ON documents;
CREATE POLICY "Allow authenticated select for documents" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION match_documents(vector(768), float, int) TO anon, authenticated;

DROP TABLE IF EXISTS general_settings CASCADE;
DROP TABLE IF EXISTS hero_section CASCADE;
DROP TABLE IF EXISTS why_choose_us CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

DROP POLICY IF EXISTS "Allow write for case_clients" ON case_clients;
CREATE POLICY "Allow write for case_clients" ON case_clients FOR ALL USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_clients.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_clients.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
);

DROP POLICY IF EXISTS "Allow public select for app_settings" ON app_settings;
CREATE POLICY "Allow public select for known public app_settings keys" ON app_settings
  FOR SELECT USING (key IN ('cms_data', 'theme', 'llm_settings'));
CREATE POLICY "Allow authenticated select for app_settings" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete for clients" ON clients;
CREATE POLICY "Allow non-stajyer delete for clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated' AND current_user_role() != 'stajyer');

-- Durum linki süre sınırı (bkz. 20260809000000_status_link_expiry.sql'deki not).
ALTER TABLE case_status_links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE case_status_links
   SET expires_at = COALESCE(regenerated_at, created_at) + INTERVAL '90 days'
 WHERE expires_at IS NULL;

-- Özel belgeler bucket'ı (bkz. 20260810000000_private_documents_bucket.sql'deki not).
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-documents', 'private-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Kendi içine yazılmış rate limiting + hata kaydı (bkz. 20260811000000_self_hosted_ops.sql'deki not).
CREATE TABLE rate_limit_buckets (
  key      TEXT PRIMARY KEY,
  count    INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_max INT, p_window_seconds INT)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  IF random() < 0.01 THEN
    DELETE FROM rate_limit_buckets WHERE reset_at < v_now - INTERVAL '1 day';
  END IF;

  INSERT INTO rate_limit_buckets AS b (key, count, reset_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE SET
    count    = CASE WHEN b.reset_at <= v_now THEN 1 ELSE b.count + 1 END,
    reset_at = CASE WHEN b.reset_at <= v_now THEN v_now + (p_window_seconds || ' seconds')::interval ELSE b.reset_at END
  RETURNING b.count, b.reset_at INTO v_count, v_reset_at;

  IF v_count > p_max THEN
    RETURN QUERY SELECT false, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now)))::INT);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, INT) TO service_role;

CREATE TABLE system_errors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source      TEXT NOT NULL,
  message     TEXT NOT NULL,
  stack       TEXT,
  context     JSONB,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_system_errors_unresolved ON system_errors (created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow yonetici or master select for system_errors" ON system_errors
  FOR SELECT USING (is_yonetici() OR is_master());
CREATE POLICY "Allow yonetici or master update for system_errors" ON system_errors
  FOR UPDATE USING (is_yonetici() OR is_master()) WITH CHECK (is_yonetici() OR is_master());

-- Dosyaya bağlı kayıtlı belgeler (bkz. 20260812000000_case_documents.sql'deki not).
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

ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for case_documents" ON case_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_documents.case_id AND (is_yonetici() OR c.owner_id = auth.uid()))
);
CREATE POLICY "Allow delete for case_documents" ON case_documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_documents.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
);

-- 20260821000000_procedure_runs_delete.sql
-- ─────────────────────────────────────────────────────────
CREATE POLICY "Allow delete own or all for procedure_runs" ON procedure_runs
  FOR DELETE USING (is_yonetici() OR owner_id = auth.uid());

COMMIT;
