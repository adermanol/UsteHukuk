import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { AgendaNotConfiguredError } from './agendaRepository'

const PERMIT_REMINDER_OFFSETS = [-60, -30, -10, 0];

export interface ReminderRunResult {
  notificationsCreated: number;
  permitEventsCreated: number;
}

/** Günlük hatırlatma cron'unun iş mantığı. İki görevi var:
 * 1. İkamet izni süresi dolan müvekkiller için otomatik bir 'sure' etkinliği
 *    üretir (yoksa) — kaçırılan uzatma penceresi yabancı müvekkilin başına
 *    gelen en yaygın ve en zarar verici şey, tamamen takvim işi.
 * 2. Bugün reminder_offsets'ten birine denk gelen planlı duruşma/süre
 *    etkinlikleri için notifications satırı yazar (günde bir kez). */
export async function runAgendaReminders(): Promise<ReminderRunResult> {
  if (!isSupabaseAdminConfigured()) {
    throw new AgendaNotConfiguredError('Supabase yapılandırılmadı: SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL eksik.');
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  // 1. İkamet izni yenileme süreleri
  const { data: expiringClients, error: clientsError } = await supabaseAdmin
    .from('clients')
    .select('id, full_name, residence_permit_expires_on')
    .not('residence_permit_expires_on', 'is', null)
    .gte('residence_permit_expires_on', todayIso);
  if (clientsError) throw new Error(`Göç dosyaları alınamadı: ${clientsError.message}`);

  let permitEventsCreated = 0;
  for (const client of expiringClients ?? []) {
    const { data: existing } = await supabaseAdmin
      .from('case_events')
      .select('id')
      .eq('client_id', client.id)
      .eq('event_type', 'sure')
      .eq('computed_due_date', client.residence_permit_expires_on)
      .maybeSingle();
    if (existing) continue;

    const { error: insertError } = await supabaseAdmin.from('case_events').insert({
      client_id: client.id,
      event_type: 'sure',
      title: `İkamet İzni Yenileme — ${client.full_name}`,
      starts_at: new Date(`${client.residence_permit_expires_on}T09:00:00`).toISOString(),
      all_day: true,
      status: 'planlandi',
      computed_due_date: client.residence_permit_expires_on,
      reminder_offsets: PERMIT_REMINDER_OFFSETS,
      computation: [{ label: 'İkamet izni son geçerlilik tarihi', date: client.residence_permit_expires_on, legalBasis: 'YUKK m.24' }],
    });
    if (!insertError) permitEventsCreated++;
    else console.error('İkamet izni etkinliği oluşturulamadı:', client.id, insertError.message);
  }

  // 2. Bugün için hatırlatma bildirimleri (duruşma + süre, günde bir kez)
  const { data: candidates, error: eventsError } = await supabaseAdmin
    .from('case_events')
    .select('id, title, event_type, starts_at, computed_due_date, reminder_offsets, last_reminded_at, owner_id')
    .in('event_type', ['durusma', 'sure'])
    .eq('status', 'planlandi');
  if (eventsError) throw new Error(`Etkinlikler alınamadı: ${eventsError.message}`);

  let notificationsCreated = 0;
  for (const ev of candidates ?? []) {
    const targetDateStr = ev.event_type === 'sure' ? ev.computed_due_date : (ev.starts_at as string).slice(0, 10);
    if (!targetDateStr) continue;
    const targetDate = new Date(targetDateStr); targetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / 86400000);
    const offsets: number[] = ev.reminder_offsets ?? [];
    if (!offsets.includes(diffDays)) continue;

    const alreadyRemindedToday = ev.last_reminded_at && (ev.last_reminded_at as string).slice(0, 10) === todayIso;
    if (alreadyRemindedToday) continue;

    const body = diffDays === 0
      ? `Bugün: ${ev.title}`
      : diffDays > 0
      ? `${diffDays} gün sonra: ${ev.title}`
      : `${ev.title} tarihi geçti — kontrol edilmeli`;

    const { error: notifError } = await supabaseAdmin.from('notifications').insert({
      user_id: ev.owner_id, event_id: ev.id,
      title: ev.event_type === 'durusma' ? 'Duruşma Hatırlatması' : 'Süre Hatırlatması',
      body, link: '/dashboard/ajanda',
    });
    if (!notifError) {
      notificationsCreated++;
      await supabaseAdmin.from('case_events').update({ last_reminded_at: new Date().toISOString() }).eq('id', ev.id);
    } else {
      console.error('Bildirim oluşturulamadı:', ev.id, notifError.message);
    }
  }

  return { notificationsCreated, permitEventsCreated };
}
