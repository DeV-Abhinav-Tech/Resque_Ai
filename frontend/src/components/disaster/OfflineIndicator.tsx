import React, { useEffect } from 'react'
import { useOfflineStore } from '@/stores/offlineStore'
import { Wifi, WifiOff, HardDrive, RefreshCw } from 'lucide-react'

export function OfflineIndicator() {
  const { isOffline, setOnlineStatus, cachedPredictionsCount, cachedTilesCount, toggleOfflineMode, syncOfflineCache } = useOfflineStore()

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true)
    const handleOffline = () => setOnlineStatus(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus])

  return (
    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono">
      <button
        onClick={toggleOfflineMode}
        className="flex items-center gap-1.5 hover:text-slate-900 transition"
        title="Click to toggle simulated Offline Mode"
      >
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="text-amber-800 font-bold">OFFLINE MAPS ACTIVE</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-700">ONLINE</span>
          </>
        )}
      </button>

      <span className="text-slate-300">|</span>

      <div className="flex items-center gap-1 text-slate-600 text-[11px]" title="Cached map tiles & neural predictions for offline navigation">
        <HardDrive className="w-3 h-3 text-cyan-600" />
        <span>{cachedPredictionsCount} Preds / {cachedTilesCount} Tiles Cached</span>
      </div>

      <button
        onClick={syncOfflineCache}
        className="p-1 text-slate-500 hover:text-cyan-700 transition"
        title="Sync Offline Cache"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  )
}
