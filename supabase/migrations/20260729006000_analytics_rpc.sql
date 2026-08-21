-- Analitik RPC'leri. Mevcut analyticsService.ts client-side (unpaginated)
-- select yapıyordu — bu yalnızca ölçek sorunu değil, PostgREST'in 1000
-- satırlık varsayılan tavanı yüzünden BUGÜN ZATEN yanlış sayı üretiyor
-- (totalTokens/llmCallCount 1000. satırdan sonra büyümüyor). Finans
-- eklenince client-side yaklaşım her ücret tutarını sadece grafik çizmek
-- için tarayıcıya indirirdi — hem yavaş hem KVKK açısından aşırı ifşa.
--
-- Tümü SECURITY INVOKER: RLS uygulanmaya devam eder, bu yüzden rol bazlı
-- görünürlük analitikte bedava gelir — avukat yalnızca kendi dosyalarının,
-- yönetici büronun tamamının rakamlarını görür. SECURITY DEFINER burada
-- tüm büronun finansalını sızdırırdı.

CREATE OR REPLACE FUNCTION analytics_monthly_cashflow(p_from DATE, p_to DATE)
RETURNS TABLE (bucket DATE, income_try NUMERIC, expense_try NUMERIC, net_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('month', m)::date AS bucket,
         COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'income'),  0) AS income_try,
         COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'expense'), 0) AS expense_try,
         COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'income'),  0)
       - COALESCE(SUM(e.amount_try) FILTER (WHERE e.entry_type = 'expense'), 0) AS net_try
    FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), '1 month') m
    LEFT JOIN ledger_entries e
      ON date_trunc('month', e.entry_date) = m
     AND e.entry_type IN ('income', 'expense')
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_monthly_cashflow(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION analytics_case_mix(p_from DATE, p_to DATE)
RETURNS TABLE (area_id TEXT, label TEXT, case_count BIGINT, open_count BIGINT, income_try NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT pa.id, pa.label_tr,
         COUNT(DISTINCT c.id),
         COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('aktif', 'istinaf', 'temyiz')),
         COALESCE(SUM(le.amount_try) FILTER (WHERE le.entry_type = 'income' AND le.paid_at IS NOT NULL), 0)
    FROM practice_areas pa
    JOIN cases c ON c.practice_area_id = pa.id AND c.opened_at BETWEEN p_from AND p_to
    LEFT JOIN ledger_entries le ON le.case_id = c.id
   GROUP BY pa.id, pa.label_tr
  HAVING COUNT(DISTINCT c.id) > 0
   ORDER BY 3 DESC;
$$;
GRANT EXECUTE ON FUNCTION analytics_case_mix(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION analytics_receivables_aging()
RETURNS TABLE (bucket TEXT, sort_order INT, total_try NUMERIC, entry_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT b.bucket, b.sort_order, COALESCE(SUM(e.amount_try), 0), COUNT(e.id)
    FROM (VALUES ('Vadesi gelmedi', 0), ('0-30 gün', 1), ('31-60 gün', 2), ('61-90 gün', 3), ('90+ gün', 4)) AS b(bucket, sort_order)
    LEFT JOIN ledger_entries e
      ON e.entry_type = 'income' AND e.paid_at IS NULL AND e.due_date IS NOT NULL
     AND b.bucket = CASE
           WHEN e.due_date > CURRENT_DATE           THEN 'Vadesi gelmedi'
           WHEN CURRENT_DATE - e.due_date <= 30      THEN '0-30 gün'
           WHEN CURRENT_DATE - e.due_date <= 60      THEN '31-60 gün'
           WHEN CURRENT_DATE - e.due_date <= 90      THEN '61-90 gün'
           ELSE '90+ gün' END
   GROUP BY 1, 2 ORDER BY 2;
$$;
GRANT EXECUTE ON FUNCTION analytics_receivables_aging() TO authenticated;

-- Başvuru -> dosya dönüşüm hunisi: o ay oluşturulan başvurulardan kaçının
-- (herhangi bir zamanda) bir dosyaya dönüştüğünü sayar. Web sitesindeki
-- 7 dilli danışma formunun gerçek iş ürettip üretmediğini ölçen tek grafik.
CREATE OR REPLACE FUNCTION analytics_intake_funnel(p_from DATE, p_to DATE)
RETURNS TABLE (bucket DATE, applications BIGINT, converted BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('month', m)::date AS bucket,
         COUNT(cl.id),
         COUNT(cl.id) FILTER (WHERE EXISTS (SELECT 1 FROM cases c WHERE c.client_id = cl.id))
    FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), '1 month') m
    LEFT JOIN clients cl ON date_trunc('month', cl.created_at) = m
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_intake_funnel(DATE, DATE) TO authenticated;

-- İleriye bakan tek grafik: önümüzdeki p_weeks hafta için duruşma/süre
-- yoğunluğu. Hangi haftaya başka iş almamak gerektiğini söyler.
CREATE OR REPLACE FUNCTION analytics_hearing_load(p_weeks INT)
RETURNS TABLE (week_start DATE, hearings BIGINT, deadlines BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('week', w)::date AS week_start,
         COUNT(ce.id) FILTER (WHERE ce.event_type = 'durusma'),
         COUNT(ce.id) FILTER (WHERE ce.event_type = 'sure')
    FROM generate_series(date_trunc('week', CURRENT_DATE), date_trunc('week', CURRENT_DATE) + ((p_weeks - 1) * 7 || ' days')::interval, '1 week') w
    LEFT JOIN case_events ce
      ON date_trunc('week', ce.starts_at) = w
     AND ce.status = 'planlandi'
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_hearing_load(INT) TO authenticated;

-- Açık dosya yaş dağılımı: unutulmuş dosyaları yüzeye çıkarır.
CREATE OR REPLACE FUNCTION analytics_case_age()
RETURNS TABLE (bucket TEXT, sort_order INT, case_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT b.bucket, b.sort_order, COUNT(c.id)
    FROM (VALUES ('0-3 ay', 0), ('3-6 ay', 1), ('6-12 ay', 2), ('1-2 yıl', 3), ('2+ yıl', 4)) AS b(bucket, sort_order)
    LEFT JOIN cases c
      ON c.status IN ('aktif', 'istinaf', 'temyiz')
     AND b.bucket = CASE
           WHEN CURRENT_DATE - c.opened_at <= 90         THEN '0-3 ay'
           WHEN CURRENT_DATE - c.opened_at <= 180         THEN '3-6 ay'
           WHEN CURRENT_DATE - c.opened_at <= 365         THEN '6-12 ay'
           WHEN CURRENT_DATE - c.opened_at <= 730         THEN '1-2 yıl'
           ELSE '2+ yıl' END
   GROUP BY 1, 2 ORDER BY 2;
$$;
GRANT EXECUTE ON FUNCTION analytics_case_age() TO authenticated;

-- 1000 satır PostgREST tavanını çözer: sunucu tarafında toplanır, tam token
-- sayısı tarayıcıya hiç indirilmez.
CREATE OR REPLACE FUNCTION analytics_llm_usage(p_from DATE, p_to DATE)
RETURNS TABLE (bucket DATE, tokens BIGINT, calls BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT date_trunc('month', m)::date AS bucket,
         COALESCE(SUM(l.tokens_used), 0),
         COUNT(l.id)
    FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), '1 month') m
    LEFT JOIN llm_logs l ON date_trunc('month', l.created_at) = m
   GROUP BY 1 ORDER BY 1;
$$;
GRANT EXECUTE ON FUNCTION analytics_llm_usage(DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION analytics_kpis(p_from DATE, p_to DATE)
RETURNS TABLE (
  income_try NUMERIC, expense_try NUMERIC, net_try NUMERIC,
  receivable_try NUMERIC, trust_balance_try NUMERIC,
  open_cases BIGINT, new_cases BIGINT,
  hearings_next_7d BIGINT, deadlines_next_7d BIGINT,
  new_applications BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'income'  AND entry_date BETWEEN p_from AND p_to), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'expense' AND entry_date BETWEEN p_from AND p_to), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'income'  AND entry_date BETWEEN p_from AND p_to), 0)
      - COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'expense' AND entry_date BETWEEN p_from AND p_to), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'income' AND paid_at IS NULL), 0),
    COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'trust_in'), 0)
      - COALESCE((SELECT SUM(amount_try) FROM ledger_entries WHERE entry_type = 'trust_out'), 0),
    (SELECT COUNT(*) FROM cases WHERE status IN ('aktif', 'istinaf', 'temyiz')),
    (SELECT COUNT(*) FROM cases WHERE opened_at BETWEEN p_from AND p_to),
    (SELECT COUNT(*) FROM case_events WHERE event_type = 'durusma' AND status = 'planlandi' AND starts_at BETWEEN NOW() AND NOW() + interval '7 days'),
    (SELECT COUNT(*) FROM case_events WHERE event_type = 'sure' AND status = 'planlandi' AND computed_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7),
    (SELECT COUNT(*) FROM clients WHERE created_at BETWEEN p_from AND p_to);
$$;
GRANT EXECUTE ON FUNCTION analytics_kpis(DATE, DATE) TO authenticated;
