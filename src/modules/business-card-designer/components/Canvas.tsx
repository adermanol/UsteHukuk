"use client"

import { useState } from 'react'
import { CardElement } from '../types'
import { DraggableElement } from './DraggableElement'
import { CANVAS_WIDTH, CANVAS_HEIGHT, BLEED_MM, MM_TO_PX } from '../constants'

interface Props {
  elements: CardElement[];
  selectedId: string | null;
  snapToGrid: boolean;
  backgroundUrl?: string; // no longer strictly needed if background is an element, but keeping for compatibility
  exportId?: string;
  /**
   * Görüntüleme ölçeği (mobilde küçük ekrana sığdırmak için) — export edilen
   * id={exportId} div'inin DOM boyutları hiç değişmez, yalnızca CSS transform
   * ile küçültülür. Export sırasında DesignerLayout bunu geçici olarak 1'e
   * çeker (bkz. exportWithScaleReset), bu yüzden html2canvas her zaman
   * ölçeklenmemiş/tam çözünürlüklü DOM'u yakalar.
   */
  scale?: number;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, props: Partial<CardElement>) => void;
  onAddElement: (element: CardElement) => void;
}

export function Canvas({ elements, selectedId, snapToGrid, scale = 1, exportId = "card-canvas-export", onSelect, onUpdate, onAddElement }: Props) {
  // Standart kartvizit ölçüsü: 85x50mm
  // Ekrandaki oran için mm'yi px'e çeviriyoruz (Örn: 1mm = 10px dersek 850x500 px)
  // Bıçak payı (Bleed): Her kenardan 3mm (30px) -> Toplam: 910x560 px
  
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const canvasWidth = CANVAS_WIDTH;
  const canvasHeight = CANVAS_HEIGHT;

  const bleedWidth = BLEED_MM * MM_TO_PX;
  const gridBackground = snapToGrid ? 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)' : 'none';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onAddElement({
            id: `el-${Date.now()}`,
            type: 'image',
            x: 100,
            y: 100,
            width: 150,
            height: 150,
            content: event.target.result as string,
            style: {}
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    // Dış sarmalayıcı: transform:scale() layout akışını etkilemediği için,
    // görsel olarak küçültülmüş canvas'ın kapladığı gerçek alanı ebeveyne
    // bildirir (aksi halde etraftaki flex/grid boş alan bırakır).
    <div style={{ width: canvasWidth * scale, height: canvasHeight * scale }}>
    <div
      className={`relative shadow-2xl overflow-hidden transition-colors ${isDraggingOver ? 'bg-primary/20 ring-4 ring-primary' : 'bg-[#1a1a1a]'}`}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        backgroundImage: gridBackground,
        backgroundSize: '10px 10px'
      }}
      onClick={() => onSelect(null)}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      id={exportId}
    >
      {/* Görsel Maske: Bıçak payı dışındaki her şeyi keser ve ızgarayı gösterir */}
      <div 
        className="absolute inset-0 pointer-events-none z-40 hide-on-export bg-[#1a1a1a]"
        style={{
          backgroundImage: gridBackground,
          backgroundSize: '10px 10px',
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${bleedWidth}px, ${bleedWidth}px ${bleedWidth}px, ${bleedWidth}px calc(100% - ${bleedWidth}px), calc(100% - ${bleedWidth}px) calc(100% - ${bleedWidth}px), calc(100% - ${bleedWidth}px) ${bleedWidth}px, ${bleedWidth}px ${bleedWidth}px, 0 ${bleedWidth}px, 0 0)`
        }}
      />

      {/* Bıçak Payı (Bleed) Çizgileri */}
      <div 
        className="absolute border border-red-500/80 border-dashed pointer-events-none z-50 hide-on-export"
        style={{
          top: bleedWidth,
          left: bleedWidth,
          right: bleedWidth,
          bottom: bleedWidth,
        }}
      >
        <span className="absolute -top-6 left-2 text-xs text-red-500 font-medium">Kesim Çizgisi (85x50mm)</span>
      </div>

      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <p className="text-white text-xl font-bold">Resmi Buraya Bırakın</p>
        </div>
      )}

      {/* Elementler */}
      <div className="absolute inset-0 z-10">
        {elements.map(el => (
          <DraggableElement
            key={el.id}
            element={el}
            isSelected={selectedId === el.id}
            snapToGrid={snapToGrid}
            scale={scale}
            onSelect={(id) => onSelect(id)}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
    </div>
  )
}
