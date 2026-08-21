import { IntakeForm } from '@/modules/intake-assistant'
import { ChatWidget } from '@/modules/intake-assistant'
import { DocumentWizardPreview } from '@/modules/document-wizard'
import { SearchInterface } from '@/modules/knowledge-base'
import { Dashboard } from '@/modules/admin-dashboard'

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <header className="mb-10 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-icon.svg" alt="Üste Hukuk" width={40} height={46} className="h-12 w-auto hidden sm:block" />
            <div>
              <h1 className="text-3xl md:text-5xl font-serif font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Üste Hukuk Terminal</h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-2 font-medium">Yapay Zeka Operasyon Sistemi</p>
            </div>
          </div>
          {/* Minimal profile/status indicator could go here */}
          <div className="hidden md:flex items-center gap-3 bg-background/30 backdrop-blur-md px-4 py-2 rounded-full border border-border">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Sistem Aktif</span>
          </div>
        </header>

        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min md:auto-rows-[minmax(300px,auto)]">
          
          {/* Dashboard spans full top row or partial */}
          <section className="md:col-span-12 xl:col-span-8 glass-panel rounded-3xl p-6">
            <Dashboard />
          </section>

          {/* Document Wizard */}
          <section id="documents" className="md:col-span-12 xl:col-span-4 glass-panel rounded-3xl p-6 scroll-mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">📄</span>
              Doküman Otomasyonu
            </h2>
            <DocumentWizardPreview />
          </section>

          {/* Knowledge Base */}
          <section id="knowledge" className="md:col-span-12 xl:col-span-7 glass-panel rounded-3xl p-6 scroll-mt-8">
            <SearchInterface />
          </section>

          {/* Intake Form */}
          <section className="md:col-span-12 xl:col-span-5 glass-panel rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">👤</span>
              Yeni Başvuru
            </h2>
            <IntakeForm />
          </section>
          
        </div>
      </div>

      <ChatWidget hideMobileTrigger />
    </div>
  );
}
