import { supabaseAdmin } from '@/core/database/supabase-admin'

interface RecurringTemplateRow {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  day_of_month: number;
  last_generated_month: string | null;
}

/** Her gün çalışan cron tarafından çağrılır: bugünün günü şablonun
 * day_of_month'una eşitse VE bu ay için henüz üretilmemişse, büro geneli
 * (case_id=NULL) bir gider kaydı açar. service-role kullanır — kimlik
 * doğrulaması cron rotasındaki paylaşılan CRON_SECRET kontrolüyle yapılır. */
export async function generateDueRecurringExpenses(): Promise<{ generated: number; skipped: number; errors: string[] }> {
  const today = new Date();
  const todayDay = today.getDate();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const { data: templates, error } = await supabaseAdmin
    .from('recurring_expense_templates')
    .select('id, category_id, description, amount, day_of_month, last_generated_month')
    .eq('is_active', true)
    .eq('day_of_month', todayDay);
  if (error) throw new Error(`Tekrarlayan gider şablonları alınamadı: ${error.message}`);

  let generated = 0, skipped = 0;
  const errors: string[] = [];

  for (const t of (templates ?? []) as RecurringTemplateRow[]) {
    if (t.last_generated_month === monthStart) { skipped++; continue; }

    const { error: insertErr } = await supabaseAdmin.from('ledger_entries').insert({
      entry_type: 'expense', category_id: t.category_id, case_id: null, client_id: null,
      description: t.description, amount: t.amount, currency: 'TRY', fx_rate: 1,
      entry_date: today.toISOString().slice(0, 10), paid_at: today.toISOString().slice(0, 10),
    });
    if (insertErr) { errors.push(`${t.description}: ${insertErr.message}`); continue; }

    const { error: updateErr } = await supabaseAdmin
      .from('recurring_expense_templates').update({ last_generated_month: monthStart }).eq('id', t.id);
    if (updateErr) errors.push(`${t.description} (last_generated_month güncellenemedi): ${updateErr.message}`);

    generated++;
  }

  return { generated, skipped, errors };
}
