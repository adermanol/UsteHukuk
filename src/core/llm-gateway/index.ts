/**
 * LLM Gateway Service
 *
 * Bu servis tüm yapay zeka API çağrılarının merkezidir.
 * Loglama, model yönlendirmesi ve RAG mantıkları bu serviste birleşir.
 */

import { generateText } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { isMockSupabase } from '../database/supabase'
import { supabaseAdmin, isSupabaseAdminConfigured } from '../database/supabase-admin'
import { getLlmSettings, LlmProvider } from '@/lib/llmSettings'

interface LLMRequest {
  prompt?: string;
  context?: string;
  messages?: any[];
  system?: string;
  moduleName?: string;
}

function resolveProvider(activeProvider: LlmProvider | null, hasOpenAI: boolean, hasAnthropic: boolean): LlmProvider | null {
  // Kullanıcı /dashboard/settings'ten elle bir sağlayıcı seçtiyse o kullanılır
  // (LM Studio anahtar gerektirmeden her zaman geçerlidir).
  if (activeProvider) return activeProvider;
  // Aksi halde otomatik: Anthropic > OpenAI.
  if (hasAnthropic) return 'anthropic';
  if (hasOpenAI) return 'openai';
  return null;
}

export const callLLM = async ({ prompt, context, messages, system, moduleName = 'general' }: LLMRequest) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const { activeProvider } = await getLlmSettings();
  const provider = resolveProvider(activeProvider, hasOpenAI, hasAnthropic);

  const missingKeyForSelection =
    (provider === 'openai' && !hasOpenAI) || (provider === 'anthropic' && !hasAnthropic);

  if (!provider || missingKeyForSelection) {
    console.warn(`[LLM Gateway] Kullanılabilir sağlayıcı yok. Modül: ${moduleName}`);
    return {
      text: "LLM sağlayıcısı yapılandırılmadı. Lütfen /dashboard/settings üzerinden bir sağlayıcı seçin veya .env.local dosyasına OPENAI_API_KEY / ANTHROPIC_API_KEY ekleyin.",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      mocked: true,
    }
  }

  const buildModel = (p: LlmProvider) =>
    p === 'anthropic'
      ? anthropic('claude-3-5-sonnet-20240620')
      : p === 'openai'
        ? openai('gpt-4o')
        : createOpenAI({
            baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
            apiKey: 'lm-studio', // LM Studio anahtarı doğrulamaz, SDK boş olmayan bir değer bekler.
          }).chat(process.env.LM_STUDIO_MODEL || 'mizan-27b-turkish-legal-llm');

  const finalPrompt = context ? `Aşağıdaki bağlamı göz önünde bulundurarak cevap ver:\n\nBAĞLAM:\n${context}\n\nSORU/İSTEK:\n${prompt}` : prompt;

  // LM Studio bellekte yüklü bir model yoksa her istekte JIT (anlık) model
  // yüklemesi tetikler — bu dakikalar sürebilir. abortSignal olmadan istek
  // sunucu tarafında sonsuza dek asılı kalır, AI SDK'nın varsayılan 2 tekrar
  // denemesi de bunu üçe katlar. 30sn'lik zaman aşımı + tek deneme ile
  // kullanıcı en geç 30sn'de anlamlı bir hata alır (bkz. ChatWidget).
  const runGeneration = async (p: LlmProvider) => {
    const options: any = {
      model: buildModel(p),
      system: system || "Sen profesyonel, Türkçe dil kurallarına hakim ve net cevaplar veren bir hukuk bürosu yapay zeka asistanısın.",
      temperature: 0.2, // Hukuki konularda düşük halüsinasyon riski için
      abortSignal: AbortSignal.timeout(30_000),
      maxRetries: 1,
    };
    if (messages && messages.length > 0) {
      options.messages = messages;
    } else {
      options.prompt = finalPrompt;
    }
    return generateText(options);
  };

  const logUsage = (usedProvider: LlmProvider, text: string, totalTokens: number) => {
    // Supabase Logging — service-role ile yazılır (llm_logs artık yalnızca
    // authenticated okuyabiliyor, anon insert politikası da kaldırıldı; bkz.
    // 20260727000200_rls_hardening.sql).
    if (!isMockSupabase() && isSupabaseAdminConfigured()) {
      supabaseAdmin.from('llm_logs').insert({
        prompt: (finalPrompt ?? messages?.map((m: any) => m.content).join('\n') ?? '').substring(0, 500),
        response: text.substring(0, 500),
        tokens_used: totalTokens || 0,
        module: usedProvider === provider ? moduleName : `${moduleName} (fallback:${usedProvider})`,
      }).then(({error}) => {
        if(error) console.error("LLM Log Error:", error)
      });
    }
  };

  try {
    const { text, usage } = await runGeneration(provider);
    logUsage(provider, text, usage.totalTokens || 0);
    return { text, usage, mocked: false };
  } catch (error) {
    console.error("LLM Gateway Error:", error);

    // LM Studio zaman aşımına uğradıysa veya erişilemiyorsa, yapılandırılmış
    // bir bulut sağlayıcı varsa büro sürekliliği için otomatik ona düşülür —
    // kullanıcı bir hata yerine gecikmeli ama gerçek bir cevap alır.
    if (provider === 'lmstudio') {
      const fallbackProvider: LlmProvider | null = hasAnthropic ? 'anthropic' : hasOpenAI ? 'openai' : null;
      if (fallbackProvider) {
        console.warn(`[LLM Gateway] LM Studio başarısız oldu, ${fallbackProvider} sağlayıcısına düşülüyor.`);
        try {
          const { text, usage } = await runGeneration(fallbackProvider);
          logUsage(fallbackProvider, text, usage.totalTokens || 0);
          return { text, usage, mocked: false };
        } catch (fallbackError) {
          console.error("LLM Gateway fallback error:", fallbackError);
        }
      }
    }

    // Gerçek hata mesajını ilet — jenerik "bağlanılamadı" mesajı
    // asıl sorunu (template hatası, model bulunamadı vs.) maskeliyordu.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("LM Studio'dan beklenmeyen bir hata döndü.");
  }
}
