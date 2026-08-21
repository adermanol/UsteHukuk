-- Faz 0 (sistem denetimi): clients ve llm_logs tabloları başlangıçtan beri
-- "USING (true)" ile herkese açık okunabilir/güncellenebilirdi (ilk migration
-- kendi içinde "production'da kilitlenmeli" uyarısı taşıyordu). Müvekkil
-- verisi (ad/e-posta/telefon/dava detayı) ve LLM log'ları (prompt içinde dava
-- detayı geçebilir) artık yalnızca oturum açmış (dashboard) kullanıcılara
-- açık; formlardan gelen public INSERT davranışı değişmiyor.

DROP POLICY IF EXISTS "Allow public select for clients" ON clients;
CREATE POLICY "Allow authenticated select for clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public update for clients" ON clients;
CREATE POLICY "Allow authenticated update for clients" ON clients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- INSERT politikası değişmiyor: hem dashboard içi IntakeForm hem de web
-- sitesindeki ConsultationRequestForm kimliksiz (public) insert yapabilmeli.

DROP POLICY IF EXISTS "Allow public select for logs" ON llm_logs;
CREATE POLICY "Allow authenticated select for logs" ON llm_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Public INSERT politikası tamamen kaldırılıyor: llm_logs'a yazma zaten
-- yalnızca src/core/llm-gateway/index.ts üzerinden, sunucu tarafında
-- (anon istemciyle ama kullanıcı etkileşimi olmadan) yapılıyor; anon'un
-- keyfi log satırı ekleyebilmesine hiç gerek yok.
DROP POLICY IF EXISTS "Allow public insert for logs" ON llm_logs;
