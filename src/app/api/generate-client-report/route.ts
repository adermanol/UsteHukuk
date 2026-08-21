import { NextResponse } from 'next/server'
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, Packer, WidthType, AlignmentType } from 'docx'
import { createServerSupabaseClient } from '@/core/database/supabase-server'
import { fetchClientDetail } from '@/modules/clients'
import { reportSystemError } from '@/core/system-error-log'

const STATUS_LABELS: Record<string, string> = {
  potansiyel: 'Potansiyel', aktif: 'Aktif', istinaf: 'İstinaf', temyiz: 'Temyiz',
  kesinlesti: 'Kesinleşti', kapandi: 'Kapandı', arsiv: 'Arşiv',
};
const ENTRY_TYPE_LABELS: Record<string, string> = {
  income: 'Gelir', expense: 'Gider', trust_in: 'Emanet (Giriş)', trust_out: 'Emanet (Çıkış)',
};

function formatMoney(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY`;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR');
}

function headerCell(text: string) {
  return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] });
}
function cell(text: string) {
  return new TableCell({ children: [new Paragraph(text)] });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  if (!clientId || !UUID_RE.test(clientId)) {
    return NextResponse.json({ error: 'Geçersiz clientId.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !['yonetici', 'avukat'].includes(profile.role)) {
    return NextResponse.json({ error: 'Bu rapor için yönetici veya avukat yetkisi gerekir.' }, { status: 403 });
  }

  await supabase.rpc('log_audit_event', { p_action: 'client_report_export', p_details: { client_id: clientId } });

  try {
    const detail = await fetchClientDetail(clientId);
    if (!detail) return NextResponse.json({ error: 'Müvekkil bulunamadı.' }, { status: 404 });

    const hasMultiParty = detail.cases.some(c => c.otherParties.length > 0);

    const caseRows = [
      new TableRow({ children: [headerCell('Dosya'), headerCell('Durum'), headerCell('Mahkeme'), headerCell('Açılış'), headerCell('Anlaşılan Ücret')] }),
      ...detail.cases.map(c => new TableRow({ children: [
        cell(c.title + (c.otherParties.length > 0 ? ` (diğer taraflar: ${c.otherParties.join(', ')})` : '')),
        cell(STATUS_LABELS[c.status] ?? c.status),
        cell(c.court_name ?? '—'),
        cell(formatDate(c.opened_at)),
        cell(c.agreed_fee != null ? formatMoney(c.agreed_fee) : '—'),
      ] })),
    ];

    const ledgerRows = [
      new TableRow({ children: [headerCell('Tarih'), headerCell('Dosya'), headerCell('Tür'), headerCell('Açıklama'), headerCell('Tutar'), headerCell('Ödendi mi')] }),
      ...detail.ledgerEntries.map(l => new TableRow({ children: [
        cell(formatDate(l.entry_date)),
        cell(l.case_title ?? '—'),
        cell(ENTRY_TYPE_LABELS[l.entry_type] ?? l.entry_type),
        cell(l.description),
        cell(formatMoney(l.amount_try)),
        cell(l.entry_type === 'income' ? (l.paid_at ? `Evet (${formatDate(l.paid_at)})` : 'Hayır') : '—'),
      ] })),
    ];

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Üste Hukuk Bürosu', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: 'Müvekkil Raporu — Durum ve Finans', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Oluşturulma tarihi: ${new Date().toLocaleDateString('tr-TR')}`, spacing: { after: 300 } }),

          new Paragraph({ text: 'Müvekkil Bilgileri', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
          new Paragraph(`Ad Soyad: ${detail.client.full_name}`),
          new Paragraph(`Telefon: ${detail.client.phone ?? '—'}`),
          new Paragraph(`E-posta: ${detail.client.email ?? '—'}`),

          new Paragraph({ text: 'Dosyalar', heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
          detail.cases.length > 0
            ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: caseRows })
            : new Paragraph('Bu müvekkile bağlı dosya bulunmuyor.'),

          new Paragraph({ text: 'Finans Özeti', heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
          new Paragraph(`Toplam Anlaşılan Ücret: ${formatMoney(detail.totals.agreedFeeTry)}`),
          new Paragraph(`Tahsil Edilen: ${formatMoney(detail.totals.collectedTry)}`),
          new Paragraph({ children: [new TextRun({ text: `Bekleyen Bakiye: ${formatMoney(detail.totals.outstandingTry)}`, bold: detail.totals.outstandingTry > 0 })] }),

          new Paragraph({ text: 'Finans Hareketleri', heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
          detail.ledgerEntries.length > 0
            ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: ledgerRows })
            : new Paragraph('Bu müvekkile bağlı finans kaydı bulunmuyor.'),

          ...(hasMultiParty ? [new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: 'Not: Bu dosyalardan bazıları birden fazla müvekkile aittir. Yukarıdaki tutarlar dosyanın toplamıdır; taraflar arası pay hesabı otomatik yapılmaz.', italics: true, size: 18 })],
          })] : []),
        ],
      }],
    });

    const buf = await Packer.toBuffer(doc);

    // Türkçe karakterli Content-Disposition — src/app/api/generate-doc ile
    // aynı RFC 5987/6266 çift form deseni (Türkçe İ tek başına header'ı kırar).
    const rawFilename = `Muvekkil_Raporu_${detail.client.full_name.replace(/\s+/g, '_')}.docx`;
    const asciiFilename = rawFilename
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[İIı]/g, 'I')
      .replace(/[^\x20-\x7E]/g, '_');

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(rawFilename)}`,
      },
    });
  } catch (error) {
    console.error('generate-client-report error:', error);
    void reportSystemError('api:generate-client-report', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: `Rapor oluşturulamadı: ${message}` }, { status: 500 });
  }
}
