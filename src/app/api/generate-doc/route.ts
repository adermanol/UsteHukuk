import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Document, Packer } from 'docx'
import { getUser } from '@/core/auth'
import { createServerSupabaseClient } from '@/core/database/supabase-server'
import { getTemplate } from '@/modules/document-wizard/templates/registry'
import { validateFields } from '@/modules/document-wizard/services/validateFields'
import { buildContent } from '@/modules/document-wizard/services/contentModel'
import { buildBody } from '@/modules/document-wizard/services/buildDocumentBody'
import { buildLetterheadHeader, buildLetterheadFooter } from '@/modules/document-wizard/services/letterhead'
import { buildPdfDocDefinition, generatePdfBuffer } from '@/modules/document-wizard/services/pdfRenderer'
import { getCmsData } from '@/lib/cms'
import { supabaseAdmin } from '@/core/database/supabase-admin'
import { reportSystemError } from '@/core/system-error-log'

type DocFormat = 'docx' | 'pdf';

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { docType, format: rawFormat, caseId, ...fields } = data;
    const format: DocFormat = rawFormat === 'pdf' ? 'pdf' : 'docx';

    const template = getTemplate(docType)
    if (!template) {
      return NextResponse.json({ error: `Bilinmeyen doküman türü: ${docType}` }, { status: 400 })
    }

    const validation = validateFields(template, fields)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const validatedFields = validation.data!;

    // Doküman otomasyonu merkezinde üretilen her belge büronun logosu ve
    // iletişim bilgileriyle antetli olarak oluşturulur — hukuki metin
    // contentModel.ts'de TEK YERDE tanımlanır, .docx ve .pdf render'ları
    // aynı nötr içerik ağacını (ContentNode[]) tüketir; artık statik .docx
    // şablon dosyaları (public/templates/) OKUNMUYOR.
    const cmsData = await getCmsData();

    let buf: Buffer;
    let contentType: string;
    let extension: string;

    if (format === 'pdf') {
      const nodes = buildContent(docType, validatedFields);
      const docDefinition = buildPdfDocDefinition(nodes, cmsData.general);
      buf = await generatePdfBuffer(docDefinition);
      contentType = 'application/pdf';
      extension = 'pdf';
    } else {
      const body = buildBody(docType, validatedFields);
      const doc = new Document({
        sections: [{
          properties: {
            // NOT: `type: SectionType.CONTINUOUS` yanlış seçimdi — continuous
            // bölümler bir ÖNCEKİ bölümden aynı sayfada devam ettiği varsayılan
            // bir sayfa sınırı taşımaz; belgenin TEK/ilk bölümü bu tipte olunca
            // bazı görüntüleyiciler (Word dışı) header/footer'ı hiç göstermedi.
            // Varsayılan (nextPage) tek-bölümlük bir belge için doğru olan.
            page: { margin: { top: 1400, bottom: 1200, left: 1100, right: 1100 } },
          },
          headers: { default: buildLetterheadHeader(cmsData.general) },
          footers: { default: buildLetterheadFooter(cmsData.general) },
          children: body,
        }],
      });
      buf = await Packer.toBuffer(doc);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      extension = 'docx';
    }

    await supabaseAdmin.from('audit_log').insert({
      actor_id: user.id, action: 'document_generate', details: { doc_type: docType, format },
    });

    const parties = validatedFields.parties;
    const firstPartyName = Array.isArray(parties) && (parties[0] as { ad?: string } | undefined)?.ad
      ? (parties[0] as { ad: string }).ad
      : 'Taslak';

    const rawFilename = `${template.label.replace(/\s+/g, '_')}_${firstPartyName}.${extension}`;
    // HTTP header değerleri ByteString (Latin-1) olmak zorunda — Türkçe
    // büyük İ (U+0130, kod noktası 304) gibi karakterler tek başlarına
    // Content-Disposition'ı kırar. RFC 6266/5987: ASCII güvenli bir
    // filename= (aksan/Türkçe harfler sadeleştirilir) ile birlikte, tam
    // UTF-8 adı taşıyan filename*= de eklenir; modern tarayıcılar ikincisini
    // kullanır, eskiler ilkine düşer.
    const asciiFilename = rawFilename
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[İIı]/g, 'I')
      .replace(/[^\x20-\x7E]/g, '_');

    // Belge isteğe bağlı olarak bir dosyaya (case) bağlanıp kalıcı olarak
    // kaydedilebilir — yalnızca indirilip unutulmaz. `caseId` GERÇEKTEN bu
    // kullanıcıya erişilebilir mi önce RLS'e tabi oturum istemcisiyle
    // doğrulanır (servis-rolüyle atlanmaz) — aksi halde bir avukat/stajyer
    // kendi erişimi olmayan bir dosyaya keyfi belge iliştirebilirdi. Sonuç
    // özel bir yanıt başlığıyla (X-Saved) bildirilir — gövde binary dosya
    // akışı olduğu için JSON içine gömülemez.
    let saved = false;
    let saveError: string | null = null;
    if (typeof caseId === 'string' && caseId) {
      const sessionSupabase = await createServerSupabaseClient();
      const { data: caseRow } = await sessionSupabase.from('cases').select('id').eq('id', caseId).maybeSingle();
      if (!caseRow) {
        saveError = 'Dosyaya erişiminiz yok veya dosya bulunamadı.';
      } else {
        const storagePath = `case-documents/${caseId}/${randomUUID()}.${extension}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('private-documents')
          .upload(storagePath, buf, { contentType });
        if (uploadError) {
          console.error('case document upload error:', uploadError);
          saveError = 'Belge sisteme kaydedilemedi.';
        } else {
          const { error: insertError } = await supabaseAdmin.from('case_documents').insert({
            case_id: caseId, doc_type: docType, format, file_name: rawFilename,
            storage_path: storagePath, created_by: user.id,
          });
          if (insertError) {
            console.error('case_documents insert error:', insertError);
            saveError = 'Belge sisteme kaydedilemedi.';
          } else {
            saved = true;
          }
        }
      }
    }

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(rawFilename)}`,
        'X-Saved': String(saved),
        ...(saveError ? { 'X-Save-Error': encodeURIComponent(saveError) } : {}),
      },
    })

  } catch (error) {
    console.error('Doc generation error:', error)
    void reportSystemError('api:generate-doc', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: `Doküman oluşturulamadı: ${message}` }, { status: 500 })
  }
}
