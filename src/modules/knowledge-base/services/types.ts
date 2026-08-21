export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  relevance: number;
}

export class KnowledgeBaseNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KnowledgeBaseNotConfiguredError'
  }
}
