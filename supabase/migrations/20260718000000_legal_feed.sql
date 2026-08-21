-- M5: Mevzuat & Güncel Bilgiler Radarı (yapay zekâ kullanmadan taranan resmi kaynaklar)

CREATE TABLE legal_feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,            -- 'resmi_gazete' | 'mevzuat_gov' | 'kvkk' | 'rekabet_kurumu'
    category TEXT,                   -- kaynağın kendi kategorisi (örn. 'YÖNETMELİKLER', 'Kurul Kararı')
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    excerpt TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (source, url)
);

CREATE INDEX idx_legal_feed_items_first_seen ON legal_feed_items (first_seen_at DESC);
CREATE INDEX idx_legal_feed_items_source ON legal_feed_items (source);

CREATE TABLE legal_feed_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    status TEXT NOT NULL,            -- 'ok' | 'error'
    item_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    duration_ms INTEGER,
    ran_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_legal_feed_runs_ran_at ON legal_feed_runs (ran_at DESC);

-- MVP: panel içi okuma herkese açık (dashboard zaten Supabase Auth ile korunuyor);
-- yazma yalnızca service role (API route) üzerinden yapılır, bu yüzden insert/update policy'si yok.
ALTER TABLE legal_feed_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for legal_feed_items" ON legal_feed_items FOR SELECT USING (true);

ALTER TABLE legal_feed_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for legal_feed_runs" ON legal_feed_runs FOR SELECT USING (true);
