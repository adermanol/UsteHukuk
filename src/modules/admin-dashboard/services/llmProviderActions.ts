"use server"

import { getLlmSettings, updateLlmSettings, getAvailableProviders, LlmProvider } from '@/lib/llmSettings'

export async function getLlmProviderState() {
  const [settings, available] = await Promise.all([getLlmSettings(), getAvailableProviders()]);
  return { activeProvider: settings.activeProvider, available };
}

export async function selectLlmProvider(provider: LlmProvider) {
  return updateLlmSettings({ activeProvider: provider });
}

export async function useAutomaticProvider() {
  return updateLlmSettings({ activeProvider: null });
}
