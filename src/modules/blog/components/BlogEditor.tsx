"use client"

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, ExternalLink, FileText } from 'lucide-react'
import { ImageDropzone } from '@/components/ui/image-dropzone'
import { TranslatableField } from '@/components/ui/TranslatableField'
import { fetchAllPostsForDashboard, createPost, updatePost, deletePost, type BlogPost, type BlogPostInput, type BlogPostStatus } from '../services/blogRepository'
import { emptyTranslatable } from '../utils'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function newDraft(): BlogPostInput {
  return {
    slug: '',
    title: emptyTranslatable(),
    excerpt: emptyTranslatable(),
    content: emptyTranslatable(),
    cover_image_url: null,
    status: 'draft',
  };
}

export function BlogEditor() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<BlogPostInput>(newDraft());
  const [previousStatus, setPreviousStatus] = useState<BlogPostStatus>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const loadPosts = () => {
    fetchAllPostsForDashboard().then(setPosts).catch(() => setPosts([]));
  };

  useEffect(() => { loadPosts(); }, []);

  const selectPost = (post: BlogPost) => {
    setSelectedId(post.id);
    setDraft({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover_image_url: post.cover_image_url,
      status: post.status,
    });
    setPreviousStatus(post.status);
    setSlugTouched(true);
    setMessage(null);
  };

  const startNew = () => {
    setSelectedId('new');
    setDraft(newDraft());
    setPreviousStatus('draft');
    setSlugTouched(false);
    setMessage(null);
  };

  const handleTitleChange = (next: typeof draft.title) => {
    setDraft(d => ({ ...d, title: next }));
    if (!slugTouched) {
      setDraft(d => ({ ...d, slug: slugify(next.tr || Object.values(next).find(v => v) || '') }));
    }
  };

  const handleSave = async () => {
    if (!draft.slug.trim()) {
      setMessage('Slug (URL) boş olamaz.');
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = selectedId === 'new'
      ? await createPost(draft)
      : await updatePost(selectedId!, draft, previousStatus);
    setMessage(result.message);
    setIsSaving(false);
    if (result.success) {
      loadPosts();
      if (selectedId === 'new') { setSelectedId(null); setDraft(newDraft()); }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return;
    const result = await deletePost(id);
    setMessage(result.message);
    if (result.success) {
      loadPosts();
      if (selectedId === id) { setSelectedId(null); setDraft(newDraft()); }
    }
  };

  if (posts === null) return <p className="text-sm text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-2">
        <button
          type="button"
          onClick={startNew}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
        >
          <Plus size={16} /> Yeni Yazı
        </button>

        {posts.length === 0 && <p className="text-sm text-muted-foreground px-1">Henüz yazı yok.</p>}

        <div className="space-y-1.5">
          {posts.map(post => (
            <div
              key={post.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                selectedId === post.id ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10' : 'border-border bg-muted/40 hover:border-[var(--primary)]/20'
              }`}
              onClick={() => selectPost(post)}
            >
              <FileText size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{post.title.tr || post.slug}</p>
                <p className="text-xs text-muted-foreground">
                  {post.status === 'published' ? 'Yayında' : 'Taslak'}
                </p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleDelete(post.id); }}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label="Sil"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-5">
        {selectedId === null ? (
          <p className="text-sm text-muted-foreground">Düzenlemek için bir yazı seçin veya yeni bir yazı oluşturun.</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Kapak Görseli</label>
              <ImageDropzone value={draft.cover_image_url ?? ''} onChange={url => setDraft(d => ({ ...d, cover_image_url: url }))} />
            </div>

            <TranslatableField label="Başlık" value={draft.title} onChange={handleTitleChange} />

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Slug (URL)</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)] font-mono text-sm"
                value={draft.slug}
                onChange={e => { setSlugTouched(true); setDraft(d => ({ ...d, slug: slugify(e.target.value) })); }}
              />
              {draft.slug && <p className="text-xs text-muted-foreground mt-1">/blog/{draft.slug}</p>}
            </div>

            <TranslatableField label="Özet" value={draft.excerpt} onChange={next => setDraft(d => ({ ...d, excerpt: next }))} multiline />
            <TranslatableField label="İçerik" value={draft.content} onChange={next => setDraft(d => ({ ...d, content: next }))} multiline />

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground">Durum</label>
              <select
                className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-[var(--primary)]"
                value={draft.status}
                onChange={e => setDraft(d => ({ ...d, status: e.target.value as BlogPostStatus }))}
              >
                <option value="draft">Taslak</option>
                <option value="published">Yayınla</option>
              </select>
              {draft.status === 'published' && (
                <a href={`/blog/${draft.slug}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                  Görüntüle <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              {message && <span className="text-xs text-muted-foreground">{message}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
