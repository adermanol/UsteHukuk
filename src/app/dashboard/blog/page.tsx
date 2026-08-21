import { BlogEditor } from '@/modules/blog'
import { Newspaper } from 'lucide-react'

export default function DashboardBlogPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><Newspaper size={22} strokeWidth={1.5} /></span>
        Blog
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Yazı oluşturun, düzenleyin ve yayınlayın. Yayınlanan yazılar ana sayfada ve /blog altında herkese açık görünür.
      </p>
      <BlogEditor />
    </div>
  )
}
