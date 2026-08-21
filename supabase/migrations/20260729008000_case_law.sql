-- İçtihat (case law) RAG genişletmesi. Bedesten (Adalet Bakanlığı'nın
-- mevzuat.adalet.gov.tr'nin kullandığı emsal-karar arka ucu) üzerinden
-- büronun pratik alanlarına hedefli, küçük anahtar kelime taramalarıyla
-- büyüyen, doğrulanmış bir kapsamla başlar — legal-codes'un 15 kanunla
-- başlayıp büyümesiyle aynı disiplin. "Milyonlarca karar" gibi büyük
-- iddialar bilinçli olarak yapılmaz (bkz. src/modules/case-law/registry.ts).

CREATE TABLE case_law_decisions (
  id               TEXT PRIMARY KEY,           -- Bedesten documentId
  decision_type    TEXT,                       -- 'Yargıtay Kararı' vb. (itemType.description)
  birim            TEXT,                       -- '22. Hukuk Dairesi'
  esas_no          TEXT,
  karar_no         TEXT,
  karar_tarihi     DATE,
  search_keyword   TEXT NOT NULL,              -- hangi tarama bunu getirdi
  practice_area_id TEXT REFERENCES practice_areas(id),
  content          TEXT NOT NULL,
  -- documents.embedding ile aynı boyut (768) — aktif sağlayıcıya göre
  -- embedQuery() ya LM Studio (nomic-embed, 768) ya OpenAI (1536) döner;
  -- bu tablo mevcut bilgi bankası kuruluş kararıyla tutarlı kalır.
  embedding        vector(768),
  source_url       TEXT NOT NULL,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_law_practice_area ON case_law_decisions (practice_area_id);
CREATE INDEX IF NOT EXISTS idx_case_law_karar_tarihi  ON case_law_decisions (karar_tarihi DESC);
CREATE INDEX IF NOT EXISTS idx_case_law_content_trgm  ON case_law_decisions USING GIN (content gin_trgm_ops);

ALTER TABLE case_law_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select for case_law_decisions" ON case_law_decisions
  FOR SELECT USING (auth.role() = 'authenticated');

-- match_documents (bilgi bankası RPC'si) ile aynı desen, case_law_decisions
-- üzerinde. SECURITY INVOKER: case_law_decisions SELECT politikası zaten
-- tüm authenticated'e açık, ekstra bir kısıtlama gerekmiyor.
CREATE OR REPLACE FUNCTION match_case_law(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text, decision_type text, birim text, esas_no text, karar_no text,
  karar_tarihi date, content text, source_url text, similarity float
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT cld.id, cld.decision_type, cld.birim, cld.esas_no, cld.karar_no,
         cld.karar_tarihi, cld.content, cld.source_url,
         1 - (cld.embedding <=> query_embedding) AS similarity
    FROM case_law_decisions cld
   WHERE cld.embedding IS NOT NULL
     AND 1 - (cld.embedding <=> query_embedding) > match_threshold
   ORDER BY similarity DESC
   LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION match_case_law(vector(768), float, int) TO authenticated;
