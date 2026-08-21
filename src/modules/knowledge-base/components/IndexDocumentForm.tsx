"use client"

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { indexDocument } from '../services/indexDocument'

export function IndexDocumentForm({ onIndexed }: { onIndexed?: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await indexDocument(title, content)
      setMessage({ ok: result.success, text: result.message })
      if (result.success) {
        setTitle('')
        setContent('')
        onIndexed?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted border border-border rounded-xl p-4">
      <h4 className="text-sm font-semibold text-foreground">Bilgi Bankasına Ekle</h4>
      <p className="text-xs text-muted-foreground">
        Büronun geçmiş dilekçe, mütalaa veya sözleşme metnini yapıştırın; arama için otomatik indekslenir.
      </p>
      <Input
        placeholder="Başlık (örn. Örnek Kira Sözleşmesi - Konut)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <Textarea
        placeholder="Metni buraya yapıştırın..."
        value={content}
        onChange={e => setContent(e.target.value)}
        className="h-32"
        required
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? 'Ekleniyor...' : 'Arşive Ekle'}
      </Button>
      {message && (
        <p className={`text-xs ${message.ok ? 'text-emerald-400' : 'text-destructive'}`}>{message.text}</p>
      )}
    </form>
  )
}
