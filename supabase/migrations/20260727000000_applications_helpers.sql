-- Başvurular (clients) sayfası için: listeleme sıralamasını hızlandıran indeks.
-- Mevcut "Allow public select for clients" / "Allow public update for clients"
-- RLS politikaları (USING (true)) zaten liste + durum güncellemesi için yeterli.

CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at DESC);
