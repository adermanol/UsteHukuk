-- Enable pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    case_type TEXT,
    details TEXT,
    status TEXT DEFAULT 'pending' -- pending, active, resolved
);

-- Table: documents (Knowledge Base for RAG)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- Assuming OpenAI embeddings (1536 dims)
    metadata JSONB
);

-- Table: llm_logs
CREATE TABLE llm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    prompt TEXT,
    response TEXT,
    tokens_used INTEGER,
    cost NUMERIC(10, 4),
    module TEXT
);

-- Basic RLS setup (Example: allow public for MVP demo)
-- WARNING: In production, these should be locked down.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for clients" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select for clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Allow public update for clients" ON clients FOR UPDATE USING (true);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for docs" ON documents FOR SELECT USING (true);

ALTER TABLE llm_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for logs" ON llm_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select for logs" ON llm_logs FOR SELECT USING (true);

-- Function to search documents via pgvector
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
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
