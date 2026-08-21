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
