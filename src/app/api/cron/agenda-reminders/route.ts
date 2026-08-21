import { NextResponse } from 'next/server'
import { isCronAuthorized, reportCronError } from '@/core/cron-auth'
import { runAgendaReminders } from '@/modules/agenda/services/runReminders'
import { AgendaNotConfiguredError } from '@/modules/agenda/services/agendaRepository'

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const result = await runAgendaReminders();
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof AgendaNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Agenda reminders cron error:', error);
    reportCronError('agenda-reminders', error);
    return NextResponse.json({ error: 'Hatırlatmalar oluşturulurken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}

// Vercel Cron GET isteğiyle tetikler.
export async function GET(req: Request) {
  return POST(req);
}
