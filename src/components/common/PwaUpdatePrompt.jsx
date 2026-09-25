import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, X } from 'lucide-react';

export const PwaUpdatePrompt = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    // Check if Service Worker update is registered via Vite PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
                setUpdateSW(() => () => {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                });
              }
            });
          }
        });
      });
    }
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-[#003524] text-white p-4 rounded-2xl shadow-xl border border-[#C9A227]/40 flex items-center justify-between gap-3 animate-slide-down">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-[#174D38] text-[#C9A227]">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">App Update Available</p>
          <p className="text-[10px] text-[#C4D9CC]">A new version of MSR CHITS is ready.</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => updateSW && updateSW()}
          className="px-3 py-1.5 bg-[#C9A227] hover:bg-[#b8921e] text-[#003524] text-xs font-bold rounded-lg transition-colors shadow-xs"
        >
          Update Now
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="p-1 text-white/60 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
