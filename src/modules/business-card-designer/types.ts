export type ElementType = 'text' | 'qr' | 'image' | 'shape';

export interface CardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // Metin içeriği, QR linki veya resim URL'si
  style: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    fontWeight?: string | number;
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    borderRadius?: number;
    rotation?: number; // 0-360 arası açı
    scale?: number; // 0.1 - 5.0 arası
    scaleY?: number; // Y ekseninde çevirme (flip) için, 1 veya -1
  };
}
