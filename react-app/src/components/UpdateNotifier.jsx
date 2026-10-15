import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { btnPrimario, btnNeutroIcono } from '../lib/buttonStyles';

export default function UpdateNotifier() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Si estamos en entorno de desarrollo local con Vite dev server, no verificar
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }

    const checkUpdate = async () => {
      try {
        const res = await fetch('./index.html?t=' + Date.now(), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (!res.ok) return;
        const text = await res.text();
        // Buscar el script principal compilado por Vite
        const match = text.match(/src="(\.\/assets\/index-[^"]+\.js)"/);
        if (match && match[1]) {
          const currentScript = document.querySelector('script[src*="assets/index-"]')?.getAttribute('src');
          if (currentScript && match[1] !== currentScript) {
            setHasUpdate(true);
          }
        }
      } catch {
        // Ignorar fallos de conexión
      }
    };

    // Revisar al abrir
    checkUpdate();

    // Revisar periódicamente cada 90 segundos
    const interval = setInterval(checkUpdate, 90000);

    // Revisar cuando el usuario vuelve a la app o cambia de pestaña
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkUpdate();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleReload = () => {
    // Primero se le pide al service worker que se retire: si no, podria volver
    // a servir el bundle viejo desde su cache justo despues de recargar.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Si el worker activo ya tiene una version mas nueva, se actualiza.
        if (reg && reg.update) reg.update();
      }).catch(() => {});
    }
    window.location.reload();
  };

  if (!hasUpdate || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -60, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-[94vw] sm:max-w-md w-full px-4 py-3 rounded-2xl bg-indigo-900/95 backdrop-blur-md text-white shadow-2xl border border-indigo-400/40 flex items-center justify-between gap-3 select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-amber-300 flex items-center justify-center shrink-0 border border-indigo-400/30">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-tight leading-snug">
              Nueva versión disponible
            </p>
            <p className="text-[11px] text-indigo-200 leading-tight truncate">
              Hay cambios recientes en la app.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            className={btnPrimario}
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className={btnNeutroIcono}
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
