import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useChit } from '../../context/ChitContext';

export const NetworkStatus = ({ compact = false }) => {
  const { syncStatus, checkHealth } = useChit();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkHealth();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkHealth]);

  const isConnected = isOnline && syncStatus.connected;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isConnected
              ? 'bg-emerald-500 animate-pulse'
              : !isOnline
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`}
        />
        <span className={isConnected ? 'text-emerald-800' : 'text-amber-800'}>
          {!isOnline ? 'Offline' : syncStatus.connected ? 'Connected' : 'Offline'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-colors ${
        isConnected
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          : !isOnline
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <WifiOff className="w-4 h-4 text-rose-600" />
        ) : isConnected ? (
          <Wifi className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        )}

        <div>
          <p className="font-bold leading-none">
            {!isOnline
              ? 'Network Offline'
              : syncStatus.connected
              ? 'Google Sheets Connected'
              : 'Standalone Mode (Offline)'}
          </p>
          <p className="text-[10px] opacity-80 mt-0.5">
            {!isOnline
              ? 'Using cached app shell'
              : syncStatus.checking
              ? 'Checking status...'
              : `Last synced ${syncStatus.relativeSync}`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => checkHealth()}
        disabled={syncStatus.checking}
        className="p-1.5 hover:bg-black/5 rounded-lg transition-colors text-inherit"
        title="Refresh Connection"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.checking ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export default NetworkStatus;
