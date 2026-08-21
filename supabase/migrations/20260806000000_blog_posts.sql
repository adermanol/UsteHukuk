-- Aşama 10: blog. `legalPages`'in fs/JSON-blob tabanlı deseni yerine ayrı
-- bir tablo — büyüyebilen, aranabilen, yazar/tarih meta verisi olan bir
-- içerik türü için daha uygun.
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

-- Herkes (anon dahil) yayınlanmış yazıları okuyabilir — ana sayfa "Son
-- Yazılar" ve /blog rotaları oturumsuz render edilir.
CREATE POLICY "Allow public select for published blog_posts" ON blog_posts
  FOR SELECT USING (status = 'published');

-- yönetici/master taslaklar dahil tümünü görür (dashboard editörü).
CREATE POLICY "Allow yonetici or master select for all blog_posts" ON blog_posts
  FOR SELECT USING (is_yonetici() OR is_master());

CREATE POLICY "Allow yonetici or master insert for blog_posts" ON blog_posts
  FOR INSERT WITH CHECK (is_yonetici() OR is_master());

CREATE POLICY "Allow yonetici or master update for blog_posts" ON blog_posts
  FOR UPDATE USING (is_yonetici() OR is_master()) WITH CHECK (is_yonetici() OR is_master());

CREATE POLICY "Allow yonetici or master delete for blog_posts" ON blog_posts
  FOR DELETE USING (is_yonetici() OR is_master());
