import { useState } from 'react'
import { HazardMapWidget } from '@/components/map/HazardMapWidget'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useDisasterResponseStore } from '@/stores/disasterResponseStore'
import { useGpsSatelliteStore } from '@/stores/gpsSatelliteStore'
import { Compass, Home, AlertOctagon, Navigation, Radio, Satellite, ShieldCheck, MapPin, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HazardMap() {
  const {
    shelters,
    blockedRoads,
    evacuationRoutes,
    showSheltersLayer,
    showRoadblocksLayer,
    showRoutesLayer,
    show50kmRadiusLayer,
    toggleLayer,
  } = useDisasterResponseStore()

  const { isTracking, currentPosition, satelliteUplink } = useGpsSatelliteStore()

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-600 animate-spin-slow" />
            3D Spatial Command Map Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Toggle 3D Dark & Light cartography, NDRF shelters, Indian highway roadblocks, and ISRO NavIC satellite links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            ISRO NavIC {satelliteUplink.signalPercent}%
          </span>
        </div>
      </div>

      {/* Main Map View */}
      <HazardMapWidget />

      {/* Interactive Map Layer Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => toggleLayer('shelters')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all flex items-center justify-between',
            showSheltersLayer ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
          )}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Home className="w-4 h-4 text-emerald-600" /> NDRF Shelters
            </p>
            <p className="text-xs font-mono mt-1 font-bold">{shelters.length} Facilities Active</p>
          </div>
          <span className={cn('w-2.5 h-2.5 rounded-full', showSheltersLayer ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300')} />
        </button>

        <button
          onClick={() => toggleLayer('roadblocks')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all flex items-center justify-between',
            showRoadblocksLayer ? 'bg-rose-50 text-rose-900 border-rose-300 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
          )}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-600" /> Roadblocks
            </p>
            <p className="text-xs font-mono mt-1 font-bold">{blockedRoads.length} Highway Passes</p>
          </div>
          <span className={cn('w-2.5 h-2.5 rounded-full', showRoadblocksLayer ? 'bg-rose-600 animate-pulse' : 'bg-slate-300')} />
        </button>

        <button
          onClick={() => toggleLayer('routes')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all flex items-center justify-between',
            showRoutesLayer ? 'bg-cyan-50 text-cyan-900 border-cyan-300 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
          )}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-cyan-600" /> 3D Escape Routes
            </p>
            <p className="text-xs font-mono mt-1 font-bold">{evacuationRoutes.length} Safety Corridors</p>
          </div>
          <span className={cn('w-2.5 h-2.5 rounded-full', showRoutesLayer ? 'bg-cyan-600 animate-pulse' : 'bg-slate-300')} />
        </button>

        <button
          onClick={() => toggleLayer('radius50km')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all flex items-center justify-between',
            show50kmRadiusLayer ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
          )}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-amber-600" /> 50km Alert Perimeter
            </p>
            <p className="text-xs font-mono mt-1 font-bold">284K Citizens</p>
          </div>
          <span className={cn('w-2.5 h-2.5 rounded-full', show50kmRadiusLayer ? 'bg-amber-600 animate-pulse' : 'bg-slate-300')} />
        </button>
      </div>
    </div>
  )
}