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
