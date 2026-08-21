-- Ofis bütçe/gider yönetimi güçlendirmesi. Tam muhasebe yazılımı DEĞİL —
-- mevcut Finans defterinin (yönetim raporlama, resmi muhasebe defteri
-- değil) büro-geneli gider tarafını güçlendirir: tekrarlayan giderler,
-- kasa/banka bakiyesi, aylık bütçe-gerçekleşen karşılaştırması.

CREATE TABLE recurring_expense_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    TEXT NOT NULL REFERENCES ledger_categories(id),
  description    TEXT NOT NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  day_of_month   INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_generated_month DATE,          -- o ayın 1'i olarak tutulur, tekrar üretimi önler
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,            -- 'Kasa', 'Ziraat Bankası - Vadesiz'
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ledger_entries ADD COLUMN cash_account_id UUID REFERENCES cash_accounts(id);
CREATE INDEX IF NOT EXISTS idx_ledger_cash_account ON ledger_entries (cash_account_id);

CREATE TABLE office_budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    TEXT NOT NULL REFERENCES ledger_categories(id),
  year           INT NOT NULL,
  month          INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  budgeted_try   NUMERIC(14,2) NOT NULL CHECK (budgeted_try >= 0),
  UNIQUE (category_id, year, month)
);

-- RLS: referans/yönetim verisi deseni (deadline_rules ile aynı şekil) —
-- tüm authenticated okur, yalnızca yönetici yazar. Finans ekranının bir
-- parçası olduğu için stajyer bu ekranı zaten hiç görmez (UI tarafında
-- can_see_finance() ile gizlenir), ama RLS okumayı engellemez — kasıtlı:
-- kategori/kasa isimleri gizli değil, yalnızca tutarların bulunduğu
-- ledger_entries zaten ayrı RLS ile korunuyor.
ALTER TABLE recurring_expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for recurring_expense_templates" ON recurring_expense_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for recurring_expense_templates" ON recurring_expense_templates FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for cash_accounts" ON cash_accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for cash_accounts" ON cash_accounts FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

ALTER TABLE office_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for office_budgets" ON office_budgets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow yonetici write for office_budgets" ON office_budgets FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());

-- Her kasa/banka hesabının güncel bakiyesi (trust hariç — emanet parası
-- büronun kendi kasası değildir). SECURITY INVOKER: ledger_entries RLS'i
-- miras alır, ama kasa/banka bakiyesi zaten büro geneli bir özet olduğu
-- için pratikte yalnızca yönetici/avukat anlamlı veri görür.
CREATE OR REPLACE FUNCTION analytics_cash_balance()
RETURNS TABLE (cash_account_id UUID, name TEXT, balance_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT ca.id, ca.name,
         ca.opening_balance
           + COALESCE(SUM(le.amount_try) FILTER (WHERE le.entry_type = 'income'), 0)
           - COALESCE(SUM(le.amount_try) FILTER (WHERE le.entry_type = 'expense'), 0)
    FROM cash_accounts ca
    LEFT JOIN ledger_entries le ON le.cash_account_id = ca.id
   WHERE ca.is_active
   GROUP BY ca.id, ca.name, ca.opening_balance
   ORDER BY ca.name;
$$;
GRANT EXECUTE ON FUNCTION analytics_cash_balance() TO authenticated;

-- Bütçe vs gerçekleşen: seçili ay için, kategori bazlı. office_budgets'ta
-- girilmemiş bir kategori de gerçekleşen gideri varsa satırda görünür
-- (budgeted_try 0 olarak) — sessizce atlanmaz.
CREATE OR REPLACE FUNCTION analytics_office_budget_vs_actual(p_year INT, p_month INT)
RETURNS TABLE (category_id TEXT, label TEXT, budgeted_try NUMERIC, actual_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT lc.id, lc.label, COALESCE(ob.budgeted_try, 0) AS budgeted_try,
         COALESCE((
           SELECT SUM(le.amount_try) FROM ledger_entries le
            WHERE le.category_id = lc.id AND le.entry_type = 'expense'
              AND EXTRACT(YEAR FROM le.entry_date) = p_year AND EXTRACT(MONTH FROM le.entry_date) = p_month
         ), 0) AS actual_try
    FROM ledger_categories lc
    LEFT JOIN office_budgets ob ON ob.category_id = lc.id AND ob.year = p_year AND ob.month = p_month
   WHERE lc.entry_type = 'expense'
     AND (COALESCE(ob.budgeted_try, 0) > 0 OR EXISTS (
           SELECT 1 FROM ledger_entries le
            WHERE le.category_id = lc.id AND le.entry_type = 'expense'
              AND EXTRACT(YEAR FROM le.entry_date) = p_year AND EXTRACT(MONTH FROM le.entry_date) = p_month
         ))
   ORDER BY 4 DESC;
$$;
GRANT EXECUTE ON FUNCTION analytics_office_budget_vs_actual(INT, INT) TO authenticated;
