import { SearchInterface, DocumentLibrary } from '@/modules/knowledge-base'
import { Search } from 'lucide-react'

export default function KnowledgePage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400"><Search size={22} strokeWidth={1.5} /></span>
        Bilgi Bankası & İçtihat Araması
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Gelişmiş semantik arama motoru ile binlerce içtihat ve emsal karar arasında saniyeler içinde aradığınızı bulun.
      </p>

      <div className="max-w-4xl space-y-10">
        <SearchInterface />

        <div>
          <h2 className="text-xl font-bold mb-4">Bilgi Bankasındaki Belgeler</h2>
          <DocumentLibrary />
        </div>
      </div>
    </div>
  )
}
