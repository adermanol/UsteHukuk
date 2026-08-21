-- Website'teki "Online Danışma Talebi" formu için clients tablosuna alanlar ekler.
-- Mevcut "Allow public insert for clients" RLS politikası zaten anonim (herkese
-- açık) insert'e izin veriyor, bu yüzden burada RLS değişikliği gerekmiyor.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS consents JSONB,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'dashboard';
