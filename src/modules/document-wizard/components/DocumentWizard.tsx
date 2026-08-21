"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { saveAs } from 'file-saver'
import { FileText, FileType, Save } from 'lucide-react'
import { DOCUMENT_TEMPLATES, getTemplate } from '../templates/registry'
import { LegalReferencePicker } from './LegalReferencePicker'
import { PartyFieldGroup, PartyValue } from './PartyFieldGroup'
import { CasePicker } from './CasePicker'
import { fetchClients, type ClientRow } from '@/modules/clients'
import { fetchCases, type CaseRow } from '@/modules/case-files'

const today = () => new Date().toISOString().split('T')[0];

function defaultValuesFor(templateId: string): Record<string, string> {
  const template = getTemplate(templateId);
  const defaults: Record<string, string> = {};
  for (const field of template?.fields ?? []) {
    if (field.type === 'date') defaults[field.id] = today();
  }
  return defaults;
}

export function DocumentWizard() {
  const [docType, setDocType] = useState(DOCUMENT_TEMPLATES[0].id)
  const [scalarValues, setScalarValues] = useState<Record<string, string>>(() => defaultValuesFor(DOCUMENT_TEMPLATES[0].id))
  const [parties, setParties] = useState<PartyValue[]>([{ ad: '', tcVergiNo: '', adres: '' }])
  const [generatingFormat, setGeneratingFormat] = useState<'docx' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [cases, setCases] = useState<CaseRow[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null)

  useEffect(() => {
    fetchClients(500).then(setClients).catch(() => setClients([]));
    fetchCases(500).then(setCases).catch(() => setCases([]));
  }, []);

  const template = useMemo(() => getTemplate(docType) ?? DOCUMENT_TEMPLATES[0], [docType]);

  const handleTemplateChange = (id: string) => {
    setDocType(id);
    setScalarValues(defaultValuesFor(id));
    setParties([{ ad: '', tcVergiNo: '', adres: '' }]);
    setError(null);
  };

  const setField = (id: string, value: string) => {
    setScalarValues(prev => ({ ...prev, [id]: value }));
  };

  const handleGenerate = async (format: 'docx' | 'pdf') => {
    setGeneratingFormat(format)
    setError(null)
    setSaveMessage(null)
    try {
      const payload: Record<string, unknown> = {
        docType, format, ...scalarValues, parties,
        ...(selectedCase ? { caseId: selectedCase.id } : {}),
      };

      const response = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Doküman oluşturulamadı.')
      }

      if (selectedCase) {
        const saved = response.headers.get('X-Saved') === 'true';
        const saveErrorRaw = response.headers.get('X-Save-Error');
        setSaveMessage(saved
          ? `"${selectedCase.title}" dosyasına kaydedildi.`
          : (saveErrorRaw ? decodeURIComponent(saveErrorRaw) : 'Dosyaya kaydedilemedi.'));
      }

      const blob = await response.blob()
      const firstPartyName = parties[0]?.ad || 'Taslak';
      saveAs(blob, `${template.label.replace(/\s+/g, '_')}_${firstPartyName}.${format}`)
    } catch (err) {
      console.error('Download error:', err)
      setError(err instanceof Error ? err.message : 'Doküman oluşturulurken bir hata oluştu.')
    } finally {
      setGeneratingFormat(null)
    }
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Doküman Otomasyon Sihirbazı</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Evrak Türü</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={docType}
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            {DOCUMENT_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Dosyaya Kaydet (opsiyonel)</Label>
          <CasePicker cases={cases} selected={selectedCase} onSelect={setSelectedCase} />
          <p className="text-xs text-muted-foreground">Bir dosya seçerseniz, belge indirilmesinin yanında o dosyanın altına da kaydedilir.</p>
        </div>

        {template.fields.map(field => {
          if (field.type === 'party') {
            return (
              <PartyFieldGroup key={field.id} label={field.label} value={parties} onChange={setParties} clients={clients} />
            )
          }
          if (field.type === 'legal-reference') {
            return (
              <LegalReferencePicker
                key={field.id}
                label={field.label}
                value={scalarValues[field.id] || ''}
                onChange={v => setField(field.id, v)}
              />
            )
          }
          if (field.type === 'textarea') {
            return (
              <div key={field.id} className="space-y-2">
                <Label>{field.label}</Label>
                <Textarea
                  value={scalarValues[field.id] || ''}
                  onChange={e => setField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </div>
            )
          }
          if (field.type === 'select') {
            return (
              <div key={field.id} className="space-y-2">
                <Label>{field.label}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={scalarValues[field.id] || ''}
                  onChange={e => setField(field.id, e.target.value)}
                >
                  <option value="" disabled>Seçiniz...</option>
                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )
          }
          return (
            <div key={field.id} className="space-y-2">
              <Label>{field.label}</Label>
              <Input
                type={field.type === 'date' ? 'date' : 'text'}
                value={scalarValues[field.id] || ''}
                onChange={e => setField(field.id, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            </div>
          )
        })}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saveMessage && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Save size={13} /> {saveMessage}</p>}
        <div className="flex gap-3">
          <Button onClick={() => handleGenerate('docx')} className="flex-1 gap-2" disabled={generatingFormat !== null}>
            <FileText size={16} />
            {generatingFormat === 'docx' ? 'Oluşturuluyor...' : 'Word (.docx) İndir'}
          </Button>
          <Button onClick={() => handleGenerate('pdf')} variant="outline" className="flex-1 gap-2" disabled={generatingFormat !== null}>
            <FileType size={16} />
            {generatingFormat === 'pdf' ? 'Oluşturuluyor...' : 'PDF İndir'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
