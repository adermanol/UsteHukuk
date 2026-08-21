import { NextResponse } from 'next/server'
import { isCronAuthorized, reportCronError } from '@/core/cron-auth'
import { generateDueRecurringExpenses } from '@/modules/finance/services/recurringExpensesService'

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }
  try {
    const result = await generateDueRecurringExpenses();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Recurring expenses cron error:', error);
    reportCronError('recurring-expenses', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: `Tekrarlayan giderler oluşturulamadı: ${message}` }, { status: 500 });
  }
}

// Vercel Cron GET isteğiyle tetikler.
export async function GET(req: Request) {
  return POST(req);
}
