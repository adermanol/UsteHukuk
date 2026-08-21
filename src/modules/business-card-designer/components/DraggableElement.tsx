"use client"

import { Rnd } from 'react-rnd'
import { QRCodeSVG } from 'qrcode.react'
import { CardElement } from '../types'

interface Props {
  element: CardElement;
  isSelected: boolean;
  snapToGrid: boolean;
  /** Canvas'ın görüntüleme ölçeği — react-rnd'nin sürükleme/boyutlandırma
   * matematiğini ekran pikselleri yerine bu ölçeğe göre çevirmesi için. */
  scale?: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, newProps: Partial<CardElement>) => void;
}

// Varsayılan react-rnd tutamaçları (~10px) dokunmatik için küçük; hit-box'ı
// görsel boyutu değiştirmeden büyütmek için her yöne özel stil.
const TOUCH_HANDLE_SIZE = 22;
const touchHandleStyle: React.CSSProperties = {
  width: TOUCH_HANDLE_SIZE,
  height: TOUCH_HANDLE_SIZE,
};
const resizeHandleStyles = {
  top: { ...touchHandleStyle, top: -TOUCH_HANDLE_SIZE / 2 },
  right: { ...touchHandleStyle, right: -TOUCH_HANDLE_SIZE / 2 },
  bottom: { ...touchHandleStyle, bottom: -TOUCH_HANDLE_SIZE / 2 },
  left: { ...touchHandleStyle, left: -TOUCH_HANDLE_SIZE / 2 },
  topRight: { ...touchHandleStyle, top: -TOUCH_HANDLE_SIZE / 2, right: -TOUCH_HANDLE_SIZE / 2 },
  bottomRight: { ...touchHandleStyle, bottom: -TOUCH_HANDLE_SIZE / 2, right: -TOUCH_HANDLE_SIZE / 2 },
  bottomLeft: { ...touchHandleStyle, bottom: -TOUCH_HANDLE_SIZE / 2, left: -TOUCH_HANDLE_SIZE / 2 },
  topLeft: { ...touchHandleStyle, top: -TOUCH_HANDLE_SIZE / 2, left: -TOUCH_HANDLE_SIZE / 2 },
};

export function DraggableElement({ element, isSelected, snapToGrid, scale = 1, onSelect, onUpdate }: Props) {
  
  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div 
            style={{ 
              fontFamily: element.style.fontFamily || 'sans-serif',
              fontSize: `${element.style.fontSize}px`, 
              color: element.style.color,
              fontWeight: element.style.fontWeight,
              textAlign: element.style.textAlign,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              wordBreak: 'break-word'
            }}
          >
            {element.content}
          </div>
        )
      case 'qr':
        return (
          <div style={{ width: '100%', height: '100%' }}>
            <QRCodeSVG 
              value={element.content || 'https://ustehukuk.com'} 
              size={Math.min(element.width, element.height)} 
              fgColor={element.style.color || '#ffffff'}
              bgColor="transparent"
            />
          </div>
        )
      case 'image':
        return (
          <img 
            src={element.content} 
            alt="element" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            draggable={false}
          />
        )
      default:
        return null;
    }
  }

  const isBg = element.id.includes('bg');

  return (
    <Rnd
      size={{ width: element.width, height: element.height }}
      position={{ x: element.x, y: element.y }}
      scale={scale}
      resizeHandleStyles={resizeHandleStyles}
      dragGrid={snapToGrid ? [10, 10] : [1, 1]}
      resizeGrid={snapToGrid ? [10, 10] : [1, 1]}
      disableDragging={isBg}
      enableResizing={!isBg}
      onDragStart={() => onSelect(element.id)}
      onDragStop={(e, d) => onUpdate(element.id, { x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate(element.id, {
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position
        })
      }}
      bounds="parent"
      className={`absolute ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-black/50' : ''}`}
      style={{ zIndex: isBg ? 0 : 10 }}
    >
      <div 
        className={`w-full h-full relative group ${isBg ? 'cursor-pointer' : 'cursor-move'}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
        style={{ transform: `rotate(${element.style.rotation || 0}deg) scale(${element.style.scale || 1}) scaleY(${element.style.scaleY || 1})`, transformOrigin: 'center' }}
      >
        {renderContent()}
      </div>
    </Rnd>
  )
}
