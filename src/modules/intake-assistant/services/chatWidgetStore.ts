"use client"

import { useEffect, useState } from 'react'

// ChatWidget hem public ana sayfada hem dashboard'da ayrı ayrı mount ediliyor;
// MobileTabBar'daki FAB'ın hangi sayfada olursa olsun sohbeti açabilmesi için
// (önceden document.querySelector ile ChatWidget'ın kapalı-durum butonunu DOM'dan
// bulup sentetik tıklama gönderiyordu — herhangi bir class değişikliğinde
// sessizce kırılırdı) minik bir modül-seviyesi pub/sub kullanılır.
type Listener = (open: boolean) => void;

let isOpen = false;
const listeners = new Set<Listener>();

function setChatWidgetOpen(value: boolean) {
  isOpen = value;
  listeners.forEach(l => l(value));
}

export function openChatWidget() {
  setChatWidgetOpen(true);
}

export function useChatWidgetOpen(): [boolean, (value: boolean) => void] {
  const [state, setState] = useState(isOpen);

  useEffect(() => {
    const listener: Listener = (value) => setState(value);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return [state, setChatWidgetOpen];
}
