-- Canlıya alma öncesi QA raporunda bekleyen Düşük şiddet kalemi: procedure_runs
-- tablosunun hiç DELETE politikası yoktu (SELECT/INSERT/UPDATE var). RLS
-- varsayılan-red olduğundan bugüne kadar hiç kimse (servis-rolü hariç) bir
-- prosedür kaydını silemiyordu — şu an uygulamada bu yola çıkan bir buton
-- yok, ama gelecekte eklenirse sessizce başarısız olmaması için UPDATE
-- politikasıyla aynı "kendi kaydı veya yönetici" desenini burada da kurar.
CREATE POLICY "Allow delete own or all for procedure_runs" ON procedure_runs
  FOR DELETE USING (is_yonetici() OR owner_id = auth.uid());
