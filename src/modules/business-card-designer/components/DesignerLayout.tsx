"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Undo2, Redo2, Wrench, SlidersHorizontal, Download } from 'lucide-react'
import { CardElement } from '../types'
import { CANVAS_WIDTH } from '../constants'
import { Canvas } from './Canvas'
import { Toolbox } from './Toolbox'
import { PropertiesPanel } from './PropertiesPanel'
import { BottomSheet } from '@/components/ui/BottomSheet'

export function DesignerLayout() {
  const [frontElements, setFrontElements] = useState<CardElement[]>([
    {
      id: 'default-name',
      type: 'text',
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      content: 'Av. Ahmet Yılmaz',
      style: { fontFamily: 'sans-serif', fontSize: 24, color: '#ffffff', fontWeight: 'bold' }
    },
    {
      id: 'default-title',
      type: 'text',
      x: 50,
      y: 90,
      width: 200,
      height: 30,
      content: 'Kurucu Ortak',
      style: { fontFamily: 'sans-serif', fontSize: 14, color: '#aaaaaa' }
    }
  ])
  const [backElements, setBackElements] = useState<CardElement[]>([])
  
  const [historyState, setHistoryState] = useState({
    past: [] as {front: CardElement[], back: CardElement[]}[],
    present: {front: frontElements, back: backElements}, // Will be overridden on mount
    future: [] as {front: CardElement[], back: CardElement[]}[]
  });

  const [activeFace, setActiveFace] = useState<'front' | 'back'>('front')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  // Mobil (< lg): canvas viewport genişliğine sığdırılır. lg ve üstünde her
  // zaman 1 (mevcut masaüstü davranışı — panel kendi overflow-auto'suyla
  // kaydırılır, hiç ölçeklenmez).
  const [zoom, setZoom] = useState(1)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const [toolboxOpen, setToolboxOpen] = useState(false)
  const [propertiesOpen, setPropertiesOpen] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const wrapperEl = canvasWrapperRef.current

    const updateZoom = () => {
      if (mql.matches) { setZoom(1); return }
      const available = wrapperEl?.clientWidth ?? 0
      if (!available) return
      setZoom(Math.max(0.3, Math.min(1, (available - 24) / CANVAS_WIDTH)))
    }

    updateZoom()
    mql.addEventListener('change', updateZoom)
    const ro = new ResizeObserver(updateZoom)
    if (wrapperEl) ro.observe(wrapperEl)
    return () => {
      mql.removeEventListener('change', updateZoom)
      ro.disconnect()
    }
    // isLoaded bağımlılığı şart: ilk render'da (isLoaded=false) "Yükleniyor..."
    // placeholder'ı döner, canvasWrapperRef henüz hiçbir DOM elemanına bağlı
    // değildir — bu efekt yalnızca [] ile yeniden çalışmazsa zoom sonsuza kadar
    // varsayılan 1'de kalır (mobilde canvas kırpılmış görünür).
  }, [isLoaded])

  // Dışa aktarım her zaman ölçeklenmemiş (zoom=1) DOM'u yakalamalı — html2canvas
  // canvas'ı doğrudan görünen elementten (id=card-canvas-export) alıyor. Mobilde
  // ekrana sığdırmak için uygulanan CSS transform'u dışa aktarım anında geçici
  // olarak kaldırıp işlem bitince geri getiriyoruz.
  const exportWithScaleReset = useCallback((run: () => void) => {
    setSelectedId(null)
    const prevZoom = zoom
    const needsReset = prevZoom !== 1
    if (needsReset) setZoom(1)
    setTimeout(() => {
      run()
      if (needsReset) setTimeout(() => setZoom(prevZoom), 300)
    }, 100)
  }, [zoom])

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('business-card-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.front && parsed.back) {
          setFrontElements(parsed.front);
          setBackElements(parsed.back);
          setHistoryState({
            past: [],
            present: { front: parsed.front, back: parsed.back },
            future: []
          });
        }
      } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  // 2. Commit State Function
  const commitState = useCallback((newFront: CardElement[], newBack: CardElement[]) => {
    setHistoryState(prev => {
      if (prev.present.front === newFront && prev.present.back === newBack) return prev;
      const newState = {
        past: [...prev.past, prev.present].slice(-50), // Keep last 50 states
        present: { front: newFront, back: newBack },
        future: []
      };
      localStorage.setItem('business-card-state', JSON.stringify(newState.present));
      return newState;
    });
    setFrontElements(newFront);
    setBackElements(newBack);
  }, []);

  // 3. Undo / Redo Functions
  const handleUndo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      
      setFrontElements(previous.front);
      setBackElements(previous.back);
      localStorage.setItem('business-card-state', JSON.stringify(previous));

      return { past: newPast, present: previous, future: [prev.present, ...prev.future] };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      setFrontElements(next.front);
      setBackElements(next.back);
      localStorage.setItem('business-card-state', JSON.stringify(next));

      return { past: [...prev.past, prev.present], present: next, future: newFuture };
    });
  }, []);

  // 4. State Modifiers
  const handleUpdateElement = useCallback((id: string, newProps: Partial<CardElement>) => {
    let newFront = frontElements;
    let newBack = backElements;

    if (activeFace === 'front') {
      newFront = frontElements.map(el => el.id === id ? { ...el, ...newProps } : el);
      if (id === 'bg-front') {
        newBack = backElements.map(el => el.id === 'bg-back' ? { ...el, ...newProps, id: 'bg-back', style: { ...el.style, ...(newProps.style || {}), scaleY: -1 } } : el);
      }
    } else {
      newBack = backElements.map(el => el.id === id ? { ...el, ...newProps } : el);
      if (id === 'bg-back') {
        newFront = frontElements.map(el => el.id === 'bg-front' ? { ...el, ...newProps, id: 'bg-front', style: { ...el.style, ...(newProps.style || {}), scaleY: 1 } } : el);
      }
    }
    commitState(newFront, newBack);
  }, [frontElements, backElements, activeFace, commitState]);

  const handleAddElement = useCallback((element: CardElement) => {
    let newFront = frontElements;
    let newBack = backElements;
    if (activeFace === 'front') newFront = [...frontElements, element];
    else newBack = [...backElements, element];
    commitState(newFront, newBack);
    setSelectedId(element.id);
  }, [frontElements, backElements, activeFace, commitState]);

  const handleDeleteElement = useCallback((id: string) => {
    const newFront = frontElements.filter(el => el.id !== id);
    const newBack = backElements.filter(el => el.id !== id);
    commitState(newFront, newBack);
    if (selectedId === id) setSelectedId(null);
  }, [frontElements, backElements, selectedId, commitState]);

  const handleSetBackground = useCallback((url: string) => {
    let newFront = frontElements;
    let newBack = backElements;

    if (!url) {
      newFront = frontElements.filter(el => el.id !== 'bg-front');
      newBack = backElements.filter(el => el.id !== 'bg-back');
    } else {
      const frontExists = frontElements.find(el => el.id === 'bg-front');
      newFront = frontExists 
        ? frontElements.map(el => el.id === 'bg-front' ? { ...el, content: url } : el)
        : [{ id: 'bg-front', type: 'image', x: 0, y: 0, width: 850, height: 500, content: url, style: { rotation: 0, scaleY: 1 } }, ...frontElements];
        
      const backExists = backElements.find(el => el.id === 'bg-back');
      newBack = backExists
        ? backElements.map(el => el.id === 'bg-back' ? { ...el, content: url } : el)
        : [{ id: 'bg-back', type: 'image', x: 0, y: 0, width: 850, height: 500, content: url, style: { rotation: 0, scaleY: -1 } }, ...backElements];
    }
    commitState(newFront, newBack);
  }, [frontElements, backElements, commitState]);

  // 5. Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input veya Textarea içindeyken kısayolları engelle
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDeleteElement(selectedId);
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDeleteElement, handleUndo, handleRedo]);

  const elements = activeFace === 'front' ? frontElements : backElements

  if (!isLoaded) return <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">Yükleniyor...</div>

  const faceToggle = (
    <div className="flex rounded-md overflow-hidden bg-accent p-1">
      <button
        className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${activeFace === 'front' ? 'bg-primary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}
        onClick={() => { setActiveFace('front'); setSelectedId(null) }}
      >
        Ön Yüz
      </button>
      <button
        className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${activeFace === 'back' ? 'bg-primary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}
        onClick={() => { setActiveFace('back'); setSelectedId(null) }}
      >
        Arka Yüz
      </button>
    </div>
  );

  const toolboxContent = (
    <>
      <Toolbox
        onAdd={handleAddElement}
        onSetBackground={handleSetBackground}
        currentBackground={elements.find(el => el.id === `bg-${activeFace}`)?.content || ''}
      />
      <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
        <span className="text-sm">Otomatik Hizala (Grid)</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
          <div className="w-9 h-5 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>
    </>
  );

  const exportButtons = (
    <div className="flex flex-col gap-2">
      <button
        className="w-full min-h-11 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
        onClick={() => exportWithScaleReset(() => {
          import('../services/exportService').then(s => s.exportCanvasAsPNG('card-canvas-export', `kartvizit_${activeFace}.png`))
        })}
      >
        PNG İndir ({activeFace === 'front' ? 'Ön' : 'Arka'})
      </button>
      <button
        className="w-full min-h-11 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-medium transition-colors"
        onClick={() => exportWithScaleReset(() => {
          import('../services/exportService').then(s => s.exportCanvasAsPDF('card-canvas-export', `kartvizit_${activeFace}.pdf`))
        })}
      >
        PDF İndir ({activeFace === 'front' ? 'Ön' : 'Arka'})
      </button>
      <button
        className="w-full min-h-11 py-2 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors mt-2"
        onClick={() => exportWithScaleReset(() => {
          import('../services/exportService').then(s => s.exportDualPDF('export-front-hidden', 'export-back-hidden'))
        })}
      >
        Çift Yönlü PDF İndir (Matbaa)
      </button>
    </div>
  );

  const selectedElement = elements.find(e => e.id === selectedId);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] w-full gap-4 p-4 text-foreground">
      {/* Mobil üst araç çubuğu: Ön/Arka Yüz + Geri Al/İleri Al (masaüstünde
          bu kısayollar klavyeden çalışıyor; dokunmatikte görünür buton gerekir) */}
      <div className="lg:hidden glass-panel rounded-2xl p-2 flex items-center gap-2 shrink-0">
        <div className="flex-1">{faceToggle}</div>
        <button
          onClick={handleUndo}
          disabled={historyState.past.length === 0}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted-foreground disabled:opacity-30 hover:bg-accent transition-colors"
          aria-label="Geri al"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyState.future.length === 0}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted-foreground disabled:opacity-30 hover:bg-accent transition-colors"
          aria-label="İleri al"
        >
          <Redo2 size={18} />
        </button>
      </div>

      {/* Sol Panel: Araçlar — yalnızca lg ve üstünde sabit panel */}
      <div className="hidden lg:flex w-64 glass-panel rounded-2xl flex-col p-4 overflow-y-auto">
        <h3 className="font-bold mb-4 text-lg">Araçlar</h3>
        <div className="mb-6">{faceToggle}</div>
        {toolboxContent}
      </div>

      {/* Orta Panel: Canvas */}
      <div ref={canvasWrapperRef} className="flex-1 glass-panel rounded-2xl flex items-center justify-center overflow-auto bg-black/40 relative min-h-[280px] touch-pan-x touch-pan-y">
        <Canvas
          elements={elements}
          selectedId={selectedId}
          snapToGrid={snapToGrid}
          scale={zoom}
          onSelect={setSelectedId}
          onUpdate={handleUpdateElement}
          onAddElement={handleAddElement}
        />
      </div>

      {/* Sağ Panel: Özellikler — yalnızca lg ve üstünde sabit panel */}
      <div className="hidden lg:flex w-80 glass-panel rounded-2xl flex-col p-4">
        <h3 className="font-bold mb-4 text-lg">Özellikler</h3>
        <PropertiesPanel
          selectedElement={selectedElement}
          onUpdate={(props) => selectedId && handleUpdateElement(selectedId, props)}
          onDelete={() => selectedId && handleDeleteElement(selectedId)}
        />
        <div className="mt-auto pt-4">{exportButtons}</div>
      </div>

      {/* Mobil alt araç çubuğu: Araçlar (+ dışa aktarma) / Özellikler sheet'lerini açar */}
      <div className="lg:hidden glass-panel rounded-2xl p-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setToolboxOpen(true)}
          className="flex-1 min-h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <Wrench size={16} /> Araçlar
        </button>
        <button
          onClick={() => setPropertiesOpen(true)}
          disabled={!selectedElement}
          className="flex-1 min-h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted-foreground disabled:opacity-30 hover:bg-accent transition-colors"
        >
          <SlidersHorizontal size={16} /> Özellikler
        </button>
        <button
          onClick={() => exportWithScaleReset(() => {
            import('../services/exportService').then(s => s.exportCanvasAsPNG('card-canvas-export', `kartvizit_${activeFace}.png`))
          })}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--background)]"
          aria-label="PNG olarak indir"
        >
          <Download size={18} />
        </button>
      </div>

      <BottomSheet open={toolboxOpen} onClose={() => setToolboxOpen(false)} title="Araçlar">
        <div className="space-y-8">
          {toolboxContent}
          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dışa Aktar</h4>
            {exportButtons}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={propertiesOpen} onClose={() => setPropertiesOpen(false)} title="Özellikler">
        <PropertiesPanel
          selectedElement={selectedElement}
          onUpdate={(props) => selectedId && handleUpdateElement(selectedId, props)}
          onDelete={() => { selectedId && handleDeleteElement(selectedId); setPropertiesOpen(false) }}
        />
      </BottomSheet>

      {/* Hidden canvases for dual export */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <Canvas exportId="export-front-hidden" elements={frontElements} selectedId={null} snapToGrid={false} onSelect={() => {}} onUpdate={() => {}} onAddElement={() => {}} />
        <Canvas exportId="export-back-hidden" elements={backElements} selectedId={null} snapToGrid={false} onSelect={() => {}} onUpdate={() => {}} onAddElement={() => {}} />
      </div>
    </div>
  )
}
