import React from 'react'
import { useDisasterResponseStore, Shelter } from '@/stores/disasterResponseStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Users, Home, AlertCircle, Navigation, ShieldCheck, Radio, MapPin, Phone } from 'lucide-react'

export function DisasterAnalysisPanel() {
  const {
    affectedPopulation,
    sheltersRequiredCount,
    shelters,
    blockedRoads,
    evacuationRoutes,
    rescueTeams,
    selectedShelter,
    selectShelter,
    activeRoute,
    selectRoute,
    openBroadcastModal,
    showSheltersLayer,
    showRoadblocksLayer,
    showRoutesLayer,
    show50kmRadiusLayer,
    toggleLayer,
  } = useDisasterResponseStore()

  return (
    <div className="space-y-6">
      {/* 11 Core Capabilities Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Affected Population Card */}
        <Card className="p-5 border-slate-200 bg-white relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Impacted Citizen Population</p>
              <p className="text-3xl font-black text-slate-900 mt-2 font-mono">{affectedPopulation.toLocaleString()}</p>
              <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> High Density NDMA Warning Zone
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Shelters Required Card */}
        <Card className="p-5 border-slate-200 bg-white relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Emergency Shelters Needed</p>
              <p className="text-3xl font-black text-slate-900 mt-2 font-mono">{sheltersRequiredCount} Shelters</p>
              <p className="text-xs text-cyan-700 mt-1 font-semibold flex items-center gap-1">
                <Home className="w-3.5 h-3.5" /> {shelters.length} NDRF Relief Facilities Active
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
              <Home className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 50km Mass Broadcast Action Card */}
        <Card className="p-5 border-slate-200 bg-gradient-to-tr from-orange-50 via-white to-green-50 relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-orange-600 animate-pulse" /> 9. 50km Cell Alert Broadcast
            </p>
            <p className="text-xs text-slate-600 mt-1">Send NDMA emergency advisory to all citizens in 50km radius.</p>
          </div>
          <button
            onClick={openBroadcastModal}
            className="btn-primary w-full py-2.5 mt-3 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4" /> DISPATCH NDMA 50KM ALERT
          </button>
        </Card>
      </div>

      {/* Main Analysis Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nearby Shelters & Directory */}
        <Card className="border-slate-200 bg-white p-0 overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-5 h-5 text-orange-600" />
                3. NDRF & State Emergency Shelters (India)
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Real-time bed occupancy, ISRO satellite comm & emergency helplines</p>
            </div>
            <button
              onClick={() => toggleLayer('shelters')}
              className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition', showSheltersLayer ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-slate-100 text-slate-500')}
            >
              {showSheltersLayer ? 'Map Layer ON' : 'Map Layer OFF'}
            </button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {shelters.map((s) => (
              <div
                key={s.id}
                onClick={() => selectShelter(s)}
                className={cn(
                  'p-4 rounded-xl border transition cursor-pointer',
                  selectedShelter?.id === s.id
                    ? 'bg-orange-50/60 border-orange-300 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                      {s.name}
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200')}>
                        {s.status}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-600" /> {s.address} ({s.distanceKm} km away)
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3 h-3 text-emerald-600" /> {s.contactPhone}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <p className="text-orange-700 font-bold">{s.capacityOccupied} / {s.capacityTotal}</p>
                    <p className="text-[10px] text-slate-500">Beds Occupied</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
                  {s.amenities.map((am, i) => (
                    <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {am}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Blocked Roads & Evacuation Routes */}
        <div className="space-y-6">
          {/* Roads Blocked Card */}
          <Card className="border-slate-200 bg-white p-0 overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  4. Indian Highway & Pass Disruption Telemetry
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">NH-44 Himalayan landslides, Brahmaputra flood passes & expressway debris</p>
              </div>
              <button
                onClick={() => toggleLayer('roadblocks')}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition', showRoadblocksLayer ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-500')}
              >
                {showRoadblocksLayer ? 'Map Layer ON' : 'Map Layer OFF'}
              </button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {blockedRoads.map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{r.roadName}</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">Disruption: {r.reason} ({r.severity})</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold font-mono', r.detourAvailable ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200')}>
                    {r.detourAvailable ? 'Detour Clear' : 'No Detour'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3D Evacuation Routes & Safe Zone */}
          <Card className="border-slate-200 bg-white p-0 overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-emerald-600" />
                  5 & 7. Indian Safe Evacuation Corridors
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Coastal Odisha & Assam Brahmaputra safe escape routes</p>
              </div>
              <button
                onClick={() => toggleLayer('routes')}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition', showRoutesLayer ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500')}
              >
                {showRoutesLayer ? 'Map Layer ON' : 'Map Layer OFF'}
              </button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {evacuationRoutes.map((rt) => (
                <div
                  key={rt.id}
                  onClick={() => selectRoute(rt)}
                  className={cn(
                    'p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between',
                    activeRoute?.id === rt.id ? 'bg-emerald-50/60 border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <div>
                    <p className="font-bold text-slate-900">{rt.routeName}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">Status: <span className="text-emerald-700 font-semibold">{rt.status}</span></p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono font-bold">
                      {rt.safetyScore}/100 Safe
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NDRF Rescue Teams Required Breakdown */}
      <Card className="border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              6. NDRF & First Responder Battalion Allocation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">National Disaster Response Force unit requirements & active deployment</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {rescueTeams.map((team, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{team.type.replace(/_/g, ' ')}</p>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-xl font-extrabold text-orange-700">{team.countDispatched} / {team.countNeeded}</span>
                <span className="text-[10px] text-slate-500">Battalions</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-orange-600 h-full rounded-full transition-all"
                  style={{ width: `${(team.countDispatched / team.countNeeded) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
