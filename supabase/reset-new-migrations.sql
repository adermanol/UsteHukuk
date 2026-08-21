-- ============================================================
-- SIFIRLAMA — Faz 1 + Faz 2 migration'larının kısmi/başarısız denemelerini
-- temizler. Yalnızca bugün eklenen 8 migration'ın oluşturduğu nesneleri
-- kaldırır (profiles, practice_areas, cases, agenda, finance, institutions,
-- analytics RPC'leri, notifications) — clients/documents/llm_logs/legal_*
-- gibi ÖNCEDEN VAR OLAN tablolara dokunmaz, yalnızca bu migration'ların
-- clients'a EKLEDİĞİ sütunları geri alır.
--
-- Ne zaman kullanılır: "relation X does not exist" veya "already exists"
-- gibi hatalarla migration'lar yarım kaldıysa, bu script'i ÖNCE çalıştırıp
-- temiz bir başlangıç noktasına dönün, SONRA run-all-new-migrations.sql'i
-- çalıştırın. Bu tablolarda henüz gerçek müvekkil verisi olmadığı için
-- (bugün ilk kez oluşturulmaya çalışılıyor) güvenlidir.
-- ============================================================

BEGIN;

-- clients üzerindeki indeksler açıkça düşürülür. Aşağıdaki ALTER TABLE ...
-- DROP COLUMN çoğunu zaten kaskadla düşürür (yeni eklenen bir sütun
-- üzerindeyse), AMA idx_clients_status status sütunu ÜZERİNDE — o sütun
-- migration'lardan önce de vardı ve hiç düşürülmüyor, bu yüzden sütun
-- silme onu kaskadla götürmez ve bir sonraki denemede "already exists"
-- hatasına yol açar. Bu satır olmadan reset script'i eksik kalırdı.
DROP INDEX IF EXISTS idx_clients_status;
DROP INDEX IF EXISTS idx_clients_practice_area;
DROP INDEX IF EXISTS idx_clients_assigned_to;
DROP INDEX IF EXISTS idx_clients_permit_expiry;

ALTER TABLE clients
  DROP COLUMN IF EXISTS practice_area_id,
  DROP COLUMN IF EXISTS assigned_to,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS foreign_id_no,
  DROP COLUMN IF EXISTS passport_no,
  DROP COLUMN IF EXISTS nationality,
  DROP COLUMN IF EXISTS residence_permit_type,
  DROP COLUMN IF EXISTS residence_permit_expires_on,
  DROP COLUMN IF EXISTS goc_appointment_at,
  DROP COLUMN IF EXISTS goc_appointment_no,
  DROP COLUMN IF EXISTS image_url;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS case_documents CASCADE;

DROP TABLE IF EXISTS system_errors CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit(TEXT, INT, INT);
DROP TABLE IF EXISTS rate_limit_buckets CASCADE;

DELETE FROM storage.buckets WHERE id = 'private-documents';

ALTER TABLE case_status_links DROP COLUMN IF EXISTS expires_at;

-- Kritik güvenlik sıkılaştırması geri alma (bkz. 20260808000000).
DROP POLICY IF EXISTS "Allow non-stajyer delete for clients" ON clients;
CREATE POLICY "Allow authenticated delete for clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public select for known public app_settings keys" ON app_settings;
DROP POLICY IF EXISTS "Allow authenticated select for app_settings" ON app_settings;
CREATE POLICY "Allow public select for app_settings" ON app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write for case_clients" ON case_clients;
CREATE POLICY "Allow write for case_clients" ON case_clients FOR ALL USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_clients.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
) WITH CHECK (true);

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (id uuid, title text, content text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT documents.id, documents.title, documents.content,
         1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC LIMIT match_count;
$$;

DROP POLICY IF EXISTS "Allow authenticated select for documents" ON documents;
CREATE POLICY "Allow public read for docs" ON documents FOR SELECT USING (true);

DELETE FROM institutions WHERE name IN (
  'İzmir Adliyesi (Ana Bina)', 'Karşıyaka Adliyesi (Ana Bina)', 'İzmir İl Göç İdaresi Müdürlüğü',
  'İzmir Kadın Kapalı Ceza İnfaz Kurumu (Şakran)', 'İzmir 1 Nolu T Tipi Kapalı Ceza İnfaz Kurumu (Şakran)',
  'İzmir Barosu', 'Konak Tapu Müdürlüğü'
);

DROP TABLE IF EXISTS blog_posts CASCADE;

DROP FUNCTION IF EXISTS log_audit_event(TEXT, JSONB);
DROP TABLE IF EXISTS audit_log CASCADE;
DROP POLICY IF EXISTS "Allow yonetici or master select for logs" ON llm_logs;
CREATE POLICY "Allow authenticated select for logs" ON llm_logs FOR SELECT USING (auth.role() = 'authenticated');

DROP FUNCTION IF EXISTS total_llm_tokens(TIMESTAMPTZ);

DROP FUNCTION IF EXISTS set_nav_order(TEXT[]);
ALTER TABLE profiles DROP COLUMN IF EXISTS nav_order;

DROP TABLE IF EXISTS tenants CASCADE;
DROP FUNCTION IF EXISTS is_master();
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS case_status_links CASCADE;
DROP TABLE IF EXISTS case_clients CASCADE;
DROP TABLE IF EXISTS office_budgets CASCADE;
DROP TABLE IF EXISTS recurring_expense_templates CASCADE;
DROP TABLE IF EXISTS cash_accounts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS procedure_runs CASCADE;
DROP TABLE IF EXISTS procedure_checklist_items CASCADE;
DROP TABLE IF EXISTS procedure_checklists CASCADE;
DROP TABLE IF EXISTS institution_contacts CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS ledger_categories CASCADE;
DROP TABLE IF EXISTS case_events CASCADE;
DROP TABLE IF EXISTS non_working_days CASCADE;
DROP TABLE IF EXISTS judicial_recess_periods CASCADE;
DROP TABLE IF EXISTS deadline_rules CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS practice_area_aliases CASCADE;
DROP TABLE IF EXISTS practice_areas CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS analytics_office_budget_vs_actual(INT, INT);
DROP FUNCTION IF EXISTS analytics_cash_balance();
DROP FUNCTION IF EXISTS analytics_client_receivables();
DROP FUNCTION IF EXISTS analytics_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS analytics_llm_usage(DATE, DATE);
DROP FUNCTION IF EXISTS analytics_case_age();
DROP FUNCTION IF EXISTS analytics_hearing_load(INT);
DROP FUNCTION IF EXISTS analytics_intake_funnel(DATE, DATE);
DROP FUNCTION IF EXISTS analytics_receivables_aging();
DROP FUNCTION IF EXISTS analytics_case_mix(DATE, DATE);
DROP FUNCTION IF EXISTS analytics_monthly_cashflow(DATE, DATE);
DROP FUNCTION IF EXISTS touch_updated_at() CASCADE;
DROP FUNCTION IF EXISTS bootstrap_first_yonetici() CASCADE;
DROP FUNCTION IF EXISTS can_see_finance();
DROP FUNCTION IF EXISTS is_yonetici();
DROP FUNCTION IF EXISTS current_user_role();
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

COMMIT;
