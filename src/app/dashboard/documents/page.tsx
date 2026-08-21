import { DocumentWizard } from '@/modules/document-wizard'
import { FileText } from 'lucide-react'

export default function DocumentsPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><FileText size={22} strokeWidth={1.5} /></span>
        Doküman Otomasyon Merkezi
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Taraf bilgileri, yasal dayanaklar ve büro arşivinden alınan referanslarla ihtarname, sözleşme ve dilekçelerinizi saniyeler içinde oluşturun.
      </p>

      <div className="max-w-4xl">
        <DocumentWizard />
      </div>
    </div>
  )
}
