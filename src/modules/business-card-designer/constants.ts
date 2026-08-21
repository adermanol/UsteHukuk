// Standart kartvizit ölçüsü: 85x50mm + 3mm bıçak payı (her kenardan).
// mmToPx: ekranda göze hoş görünmesi için seçilen ölçek.
export const MM_TO_PX = 8;
export const CARD_WIDTH_MM = 85;
export const CARD_HEIGHT_MM = 50;
export const BLEED_MM = 3;

export const CANVAS_WIDTH = (CARD_WIDTH_MM + BLEED_MM * 2) * MM_TO_PX;
export const CANVAS_HEIGHT = (CARD_HEIGHT_MM + BLEED_MM * 2) * MM_TO_PX;
