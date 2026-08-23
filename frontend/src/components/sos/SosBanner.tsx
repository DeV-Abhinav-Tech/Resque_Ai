import React from 'react'
import { useSosStore } from '@/stores/sosStore'
import { AlertOctagon, MapPin, Radio, CheckCircle, X } from 'lucide-react'

export function SosBanner() {
  const { activeSos, resolveSos } = useSosStore()

  if (!activeSos) return null

  return (
    <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 text-white px-4 py-2.5 shadow-2xl border-b border-rose-500/50 flex flex-wrap items-center justify-between gap-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-rose-500/30 border border-rose-400/60 flex items-center justify-center text-rose-200">
          <Radio className="w-4 h-4 animate-ping" />
        </div>
        <div>
          <div className="flex items-center gap-2 font-bold text-sm text-rose-100 uppercase tracking-wider">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            EMERGENCY SOS ACTIVE: {activeSos.hazardType} DISPATCHED
          </div>
          <p className="text-xs text-rose-200/90 flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono">
              <MapPin className="w-3 h-3 text-cyan-400" />
              {activeSos.latitude.toFixed(4)}, {activeSos.longitude.toFixed(4)}
            </span>
            {activeSos.notes && <span>• Note: "{activeSos.notes}"</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block text-xs bg-rose-500/30 border border-rose-400/40 text-rose-100 px-2.5 py-1 rounded-full font-mono">
          Rescue Ops Notified
        </span>
        <button
          onClick={resolveSos}
          className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-rose-300 hover:text-white rounded-lg text-xs font-semibold border border-rose-500/40 flex items-center gap-1.5 transition"
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Mark Resolved
        </button>
      </div>
    </div>
  )
}
