"use client"

import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { listDocuments, deleteDocument, DocumentRow } from '../services/documentsRepository'
import { KnowledgeBaseNotConfiguredError } from '../services/types'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

export function DocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await listDocuments(100);
      setDocuments(data);
    } catch (err) {
      if (err instanceof KnowledgeBaseNotConfiguredError) {
        setError(err.message);
      } else {
        console.error('Belgeler yüklenemedi:', err);
        setError('Belgeler yüklenirken beklenmeyen bir hata oluştu.');
      }
      setDocuments([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu belgeyi bilgi bankasından silmek istediğinize emin misiniz?')) return;
    setDeletingId(id);
    const result = await deleteDocument(id);
    setDeletingId(null);
    if (result.success) {
      setDocuments(prev => prev?.filter(d => d.id !== id) ?? prev);
    } else {
      setError(result.message);
    }
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Belgeler Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
      {documents === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
      {documents !== null && documents.length === 0 && (
        <p className="text-sm text-muted-foreground">Henüz bilgi bankasına eklenmiş belge yok.</p>
      )}
      {documents?.map(doc => (
        <div
          key={doc.id}
          className="flex items-start gap-3 bg-muted hover:bg-muted border border-border hover:border-[var(--primary)]/20 rounded-xl p-3 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] text-muted-foreground">{formatRelativeTime(doc.created_at)}</span>
            </div>
            <p className="text-sm text-muted-foreground group-hover:text-foreground leading-snug">{doc.title}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2">{doc.content}</p>
          </div>
          <button
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId === doc.id}
            className="text-muted-foreground hover:text-rose-400 shrink-0 mt-1 transition-colors disabled:opacity-50"
            aria-label="Belgeyi sil"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
