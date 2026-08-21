"use client"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Terminal, X, Send } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useChatWidgetOpen } from '../services/chatWidgetStore'

interface ChatWidgetProps {
  /** Dashboard/kartvizit sayfalarında MobileTabBar zaten merkezde bir
   * sohbet FAB'ı gösteriyor — aynı işlevi tekrar eden bu bileşenin kendi
   * mobil butonunu gizlemek için true geçilir (bkz. dashboard/page.tsx). */
  hideMobileTrigger?: boolean;
}

export function ChatWidget({ hideMobileTrigger = false }: ChatWidgetProps = {}) {
  const { dict } = useLocale();
  const [isOpen, setIsOpen] = useChatWidgetOpen()
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: dict.chat.greeting }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // LM Studio'da model belleğe yüklü değilse sunucu tarafı en geç 30sn'de
    // zaman aşımına uğrar (bkz. llm-gateway); istemci tarafında da 35sn'lik
    // bir üst sınır var ki ağ/sunucu tamamen asılı kalırsa kullanıcı sonsuza
    // dek "yazıyor..." görmesin.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35_000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        signal: controller.signal,
      })

      const data = await response.json()
      if (data.role && data.content) {
        setMessages(prev => [...prev, data])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: dict.chat.errorServer }])
      }
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'AbortError';
      setMessages(prev => [...prev, { role: 'assistant', content: timedOut ? dict.chat.errorTimeout : dict.chat.errorNetwork }])
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        className={`fixed bottom-[90px] right-4 md:bottom-8 md:right-8 rounded-full w-14 h-14 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-50 flex ${hideMobileTrigger ? 'max-md:hidden' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <Terminal size={24} />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] md:inset-auto md:bottom-8 md:right-8 md:w-[400px] md:h-[600px] flex flex-col glass-panel md:rounded-2xl border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted backdrop-blur-md">
        <div className="flex items-center gap-2 text-primary">
          <Terminal size={18} />
          <span className="font-mono text-sm font-semibold tracking-wider">{dict.chat.title}</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm bg-muted">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-muted-foreground mb-1">{msg.role === 'user' ? 'USER' : 'SYSTEM'}</span>
            <div className={`px-3 py-2 max-w-[85%] rounded-md whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary/20 text-primary-foreground border border-primary/30' : 'text-green-400 bg-black/40 border border-green-500/20 shadow-[0_0_10px_rgba(0,255,0,0.05)]'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-muted-foreground mb-1">SYSTEM</span>
            <div className="px-3 py-2 rounded-md text-green-400 bg-black/40 border border-green-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-muted backdrop-blur-md">
        <form onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }} className="flex w-full space-x-2 relative">
          <span className="absolute left-3 top-2.5 text-primary font-mono">{">"}</span>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isLoading ? "..." : "_"}
            disabled={isLoading}
            className="flex-1 pl-8 font-mono bg-black/40 border-primary/30 focus-visible:ring-primary/50 text-primary-foreground disabled:opacity-50"
          />
          <Button type="submit" size="icon" variant="ghost" disabled={isLoading || !input.trim()} className="text-primary hover:bg-primary/20 disabled:opacity-40">
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  )
}
