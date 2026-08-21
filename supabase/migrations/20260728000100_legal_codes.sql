-- Kendini güncelleyen kanun metni veritabanı: mevzuat.gov.tr'den resmi
-- kanun PDF'lerini periyodik olarak çeken, madde madde ayrıştırıp saklayan
-- yapı. LegalReferencePicker'daki "Yasal Dayanak" aramasının gerçek kanun
-- metni bulabilmesi için gerekli — önceki üç kaynak (canlı Bedesten API,
-- Mevzuat Radarı önbelleği, Bilgi Bankası) hiçbiri tam metin içermiyordu.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE legal_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mevzuat_no INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  mevzuat_tur INTEGER NOT NULL,
  mevzuat_tertip INTEGER NOT NULL,
  source_url TEXT NOT NULL,
  resmi_gazete_tarihi TEXT,
  article_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT
);

CREATE TABLE legal_code_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_code_id UUID REFERENCES legal_codes(id) ON DELETE CASCADE,
  article_no TEXT NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  UNIQUE (legal_code_id, article_no)
);

CREATE INDEX idx_legal_code_articles_content_trgm ON legal_code_articles USING GIN (content gin_trgm_ops);
CREATE INDEX idx_legal_code_articles_heading_trgm ON legal_code_articles USING GIN (heading gin_trgm_ops);
CREATE INDEX idx_legal_code_articles_code ON legal_code_articles (legal_code_id);

ALTER TABLE legal_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for legal_codes" ON legal_codes FOR SELECT USING (true);

ALTER TABLE legal_code_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for legal_code_articles" ON legal_code_articles FOR SELECT USING (true);

-- Yazma yalnızca service-role (supabaseAdmin) ile yapılır — legal_feed_items
-- ile aynı desen, ayrı bir INSERT/UPDATE politikası eklenmez.
