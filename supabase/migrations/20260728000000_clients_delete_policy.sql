-- Başvurular sayfasında silme özelliği için: clients tablosunda hiç DELETE
-- politikası yoktu (yalnızca INSERT/SELECT/UPDATE), bu yüzden RLS silmeyi
-- tamamen engelliyordu. Diğer politikalarla (20260727000200_rls_hardening.sql)
-- tutarlı şekilde yalnızca oturum açmış (dashboard) kullanıcılara açılır.

CREATE POLICY "Allow authenticated delete for clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated');
