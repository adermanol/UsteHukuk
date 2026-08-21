-- Mevzuat Radarı arama çubuğu için: kelime/isim/numara araması ILIKE ile
-- title/excerpt/category üzerinde yapılır; pg_trgm bu aramaları tablo
-- büyüdükçe hızlı tutmak için trigram indeksleri sağlar. Tarih aralığı
-- filtresi için published_at üzerinde de bir indeks eklenir.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_legal_feed_items_title_trgm
  ON legal_feed_items USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_legal_feed_items_excerpt_trgm
  ON legal_feed_items USING GIN (excerpt gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_legal_feed_items_published_at
  ON legal_feed_items (published_at DESC);
