"use client"

import Image from 'next/image'
import Link from 'next/link'
import { pick } from '@/lib/i18n/locales'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import type { BlogPost } from '../services/blogRepository'

export function BlogSection({ posts }: { posts: BlogPost[] }) {
  const { locale, dict } = useLocale();

  if (!posts || posts.length === 0) return null;

  return (
    <div className="bg-[var(--background)] py-16 px-5 md:py-24 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-[var(--primary)] uppercase tracking-[0.2em] text-xs font-bold mb-4">{dict.blog.eyebrow}</h3>
          <h2 className="font-serif text-3xl md:text-5xl text-foreground">{dict.blog.heading}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-muted/30 hover:border-[var(--primary)]/30 transition-colors"
            >
              <div className="relative h-48 w-full bg-muted overflow-hidden">
                {post.cover_image_url ? (
                  <Image
                    src={post.cover_image_url}
                    alt={pick(post.title, locale)}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/15 to-transparent" />
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                {post.published_at && (
                  <span className="text-xs text-muted-foreground mb-2">
                    {new Date(post.published_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale)}
                  </span>
                )}
                <h3 className="font-serif text-xl text-foreground mb-2 leading-snug">{pick(post.title, locale)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">{pick(post.excerpt, locale)}</p>
                <span className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--primary)] group-hover:text-foreground transition-colors">
                  {dict.blog.readMore} →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/blog"
            className="inline-block border border-border px-8 py-3 text-xs font-bold uppercase tracking-widest text-foreground hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors"
          >
            {dict.blog.viewAll}
          </Link>
        </div>
      </div>
    </div>
  )
}
