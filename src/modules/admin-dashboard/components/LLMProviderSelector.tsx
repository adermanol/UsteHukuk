"use client"

import { useEffect, useState, useTransition } from 'react'
import { Cloud, Cpu, Sparkles, Check, AlertTriangle } from 'lucide-react'
import { LlmProvider } from '@/lib/llmSettings'
import { getLlmProviderState, selectLlmProvider, useAutomaticProvider } from '../services/llmProviderActions'

interface ProviderCardDef {
  id: LlmProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const PROVIDERS: ProviderCardDef[] = [
  { id: 'anthropic', name: 'Anthropic Claude', description: 'claude-3-5-sonnet — ücretli, bulut tabanlı', icon: <Cloud size={20} /> },
  { id: 'openai', name: 'OpenAI GPT-4o', description: 'gpt-4o — ücretli, bulut tabanlı', icon: <Cloud size={20} /> },
  { id: 'lmstudio', name: 'LM Studio (Yerel)', description: 'mizan-27b-turkish-legal-llm — ücretsiz, veriniz dışarı çıkmaz', icon: <Cpu size={20} /> },
];

export function LLMProviderSelector() {
  const [activeProvider, setActiveProvider] = useState<LlmProvider | null>(null);
  const [available, setAvailable] = useState<Record<LlmProvider, boolean> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = async () => {
    const state = await getLlmProviderState();
    setActiveProvider(state.activeProvider);
    setAvailable(state.available);
  };

  useEffect(() => { load(); }, []);

  const handleSelect = (provider: LlmProvider) => {
    setMessage(null);
    startTransition(async () => {
      const result = await selectLlmProvider(provider);
      setMessage(result.message);
      await load();
    });
  };

  const handleAutomatic = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await useAutomaticProvider();
      setMessage(result.message);
      await load();
    });
  };

  if (!available) {
    return <p className="text-sm text-muted-foreground">Yükleniyor...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROVIDERS.map(p => {
          const isConfigured = available[p.id];
          const isActive = activeProvider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!isConfigured || isPending}
              onClick={() => handleSelect(p.id)}
              className={`text-left p-4 rounded-2xl border transition-all relative ${
                isActive
                  ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10'
                  : isConfigured
                    ? 'border-border bg-muted hover:border-[var(--primary)]/30'
                    : 'border-border bg-muted opacity-50 cursor-not-allowed'
              }`}
            >
              {isActive && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--primary)] text-black flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
                {p.icon}
                <span className="font-serif text-lg text-foreground">{p.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              {!isConfigured && (
                <p className="text-[11px] text-amber-400/80 mt-2 flex items-center gap-1">
                  <AlertTriangle size={11} /> API anahtarı tanımlı değil
                </p>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAutomatic}
        disabled={isPending}
        className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full border transition-colors ${
          activeProvider === null
            ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]'
            : 'border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sparkles size={14} />
        Otomatik (yapılandırılmış ilk sağlayıcı: Anthropic → OpenAI)
        {activeProvider === null && <Check size={12} strokeWidth={3} />}
      </button>

      {message && <p className="text-xs text-emerald-400">{message}</p>}

      <div className="flex items-start gap-2.5 text-[11px] text-muted-foreground bg-muted border border-border rounded-xl px-3.5 py-3">
        <Cpu size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
        <p>
          <span className="text-muted-foreground">LM Studio (Yerel) seçiliyken</span> yalnızca sohbet asistanı değil, Bilgi Bankası'na eklenen belgelerin ve İçtihat/Kanun aramasının embedding&apos;i de bu makinede üretilir — hiçbir belge içeriği bulut sağlayıcısına gönderilmez. Cezaevi görüşmesi notları veya göç dosyası belgeleri gibi hassas içerikler için bu mod önerilir.
        </p>
      </div>
    </div>
  );
}
