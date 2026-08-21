"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchKnowledgeBase, generateAnswerFromRAG } from '../services/ragService'
import { SearchResult, KnowledgeBaseNotConfiguredError } from '../services/types'
import { IndexDocumentForm } from './IndexDocumentForm'

export function SearchInterface() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setAnswer(null)
    setSearched(true)
    setResults([])

    // Arama (embedding + pgvector) ve yapay zeka yanıtı üretimi ayrı adımlar;
    // biri başarısız olsa bile diğerinin sonucu kaybolmasın (ör. arşivde
    // kaynak bulunur ama seçili LLM sağlayıcısına -örn. LM Studio- ulaşılamazsa
    // bulunan kaynaklar yine de gösterilmeli).
    let docs: SearchResult[] = [];
    try {
      docs = await searchKnowledgeBase(query)
      setResults(docs)
    } catch (err) {
      if (err instanceof KnowledgeBaseNotConfiguredError) {
        setError(err.message)
      } else {
        console.error('Knowledge base search error:', err)
        setError(err instanceof Error ? `Arama başarısız: ${err.message}` : 'Arama sırasında beklenmeyen bir hata oluştu.')
      }
      setLoading(false)
      return
    }

    if (docs.length === 0) {
      setAnswer("Bu konuyla ilgili büro arşivinde bilgi bulunamadı.")
      setLoading(false)
      return
    }

    try {
      const llmResponse = await generateAnswerFromRAG(query, docs)
      setAnswer(llmResponse.text)
    } catch (err) {
      console.error('RAG answer generation error:', err)
      setError(err instanceof Error ? `Kaynaklar bulundu ancak yapay zeka yanıtı üretilemedi: ${err.message}` : 'Kaynaklar bulundu ancak yapay zeka yanıtı üretilemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Büro Bilgi Bankası (RAG)</CardTitle>
        <CardDescription>Büronun geçmiş dilekçe, sözleşme ve içtihat arşivinde akıllı arama yapın.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input 
            placeholder="Ne aramak istersiniz? (Örn: Geçersiz fesih ihtarname örneği)" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Aranıyor...' : 'Ara'}
          </Button>
        </form>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        {answer && (
          <div className="bg-muted p-4 rounded-md space-y-2">
            <h4 className="font-semibold text-sm">Yapay Zeka Yanıtı (Taslak):</h4>
            <p className="text-sm">{answer}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Bulunan Kaynaklar:</h4>
            <ul className="space-y-4">
              {results.map(res => (
                <li key={res.id} className="text-sm border p-3 rounded-md">
                  <div className="font-medium text-primary">{res.title} (Alaka: %{Math.round(res.relevance * 100)})</div>
                  <div className="text-muted-foreground mt-1">{res.snippet}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {searched && !loading && !error && results.length === 0 && (
          <IndexDocumentForm />
        )}
      </CardContent>
    </Card>
  )
}
