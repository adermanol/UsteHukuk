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
