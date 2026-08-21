-- Müvekkilden alacak raporu: analytics_receivables_aging()'deki bucket CASE
-- ifadesi aynen taşınır, case_clients üzerinden müvekkil bazlı gruplanır.
-- (case_clients bir dosyanın hem tek hem çok müvekkilli hâlini tek doğru
-- şekilde kapsadığı için ledger_entries.client_id yerine bu kullanılır —
-- bkz. 20260730000000_case_clients.sql.)
CREATE OR REPLACE FUNCTION analytics_client_receivables()
RETURNS TABLE (client_id UUID, full_name TEXT, phone TEXT, not_due_try NUMERIC,
               d0_30_try NUMERIC, d31_60_try NUMERIC, d61_90_try NUMERIC, d90_plus_try NUMERIC,
               total_try NUMERIC, oldest_due_date DATE, open_entry_count BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT cl.id, cl.full_name, cl.phone,
         COALESCE(SUM(le.amount_try) FILTER (WHERE le.due_date > CURRENT_DATE), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date BETWEEN 0 AND 30), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date BETWEEN 31 AND 60), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date BETWEEN 61 AND 90), 0),
         COALESCE(SUM(le.amount_try) FILTER (WHERE CURRENT_DATE - le.due_date > 90), 0),
         COALESCE(SUM(le.amount_try), 0), MIN(le.due_date), COUNT(le.id)
    FROM clients cl
    JOIN case_clients cc ON cc.client_id = cl.id
    JOIN ledger_entries le ON le.case_id = cc.case_id
   WHERE le.entry_type = 'income' AND le.paid_at IS NULL AND le.due_date IS NOT NULL
   GROUP BY cl.id, cl.full_name, cl.phone
  HAVING SUM(le.amount_try) > 0
   ORDER BY 9 DESC;
$$;
GRANT EXECUTE ON FUNCTION analytics_client_receivables() TO authenticated;
