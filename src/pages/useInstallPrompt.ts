import { useEffect, useState } from 'react';

/**
 * Hook genérico de "instalar como app" (PWA) — captura el evento nativo
 * beforeinstallprompt (Android/Chrome/Edge) para poder disparar el
 * cuadro de instalación con un botón propio, en vez del banner del
 * navegador. En iOS Safari no existe ese evento — ahí solo se puede
 * guiar al usuario a "Compartir → Agregar a pantalla de inicio".
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return {
    canInstall: !!deferred && !installed,
    isIOS: isIOS() && !installed,
    // Ni Android con prompt disponible ni iOS — puede pasar si Chrome
    // todavía no considera "suficiente" el engagement para ofrecer el
    // evento automático. Mostramos igual una instrucción manual en vez
    // de dejar el bloque vacío.
    showManualHint: !isIOS() && !deferred && !installed,
    installed,
    install,
  };
}
