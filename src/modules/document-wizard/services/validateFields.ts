import { z } from 'zod'
import { DocumentTemplateDef } from '../templates/registry'

const partySchema = z.object({
  ad: z.string(),
  tcVergiNo: z.string(),
  adres: z.string(),
});

/**
 * Şablonun field tanımlarından (registry.ts) dinamik bir zod şeması üretir.
 * Zorunlu alanlar boş bırakılamaz; isteğe bağlı alanlar eksikse '' ile
 * doldurulur (buildDocumentBody.ts'teki keyValueLine/bodyParagraphs
 * eksik değeri '—' ile gösterir, undefined değil boş string bekler).
 */
function buildFieldsSchema(template: DocumentTemplateDef) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of template.fields) {
    if (field.type === 'party') {
      shape[field.id] = field.required
        ? z.array(partySchema).min(1, `${field.label}: en az bir taraf girilmeli.`)
        : z.array(partySchema).optional().default([]);
    } else {
      shape[field.id] = field.required
        ? z.string().trim().min(1, `${field.label} alanı boş bırakılamaz.`)
        : z.string().optional().default('');
    }
  }

  return z.object(shape).passthrough();
}

export interface FieldValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export function validateFields(template: DocumentTemplateDef, fields: unknown): FieldValidationResult {
  const schema = buildFieldsSchema(template);
  const result = schema.safeParse(fields);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return { success: false, error: firstIssue?.message ?? 'Geçersiz alan verisi.' };
  }
  return { success: true, data: result.data };
}
