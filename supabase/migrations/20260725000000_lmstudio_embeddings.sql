-- Bilgi bankası embedding boyutunu LM Studio'nun yerel nomic-embed-text-v2-moe
-- modeline (768 boyut) göre değiştirir. Önceki OpenAI (1536 boyut) embedding'leri
-- farklı vektör uzayında olduğu için taşınamaz; sütun temizlenir ve içerik
-- /dashboard/knowledge üzerinden yeniden indexlenmelidir.

ALTER TABLE documents DROP COLUMN embedding;
ALTER TABLE documents ADD COLUMN embedding vector(768);

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
