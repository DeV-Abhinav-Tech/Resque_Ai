import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLiveEarthquakes, fetchLiveWeather } from '@/lib/realtimeApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn, formatRelativeTime } from '@/lib/utils'
import { RefreshCw, Zap, ExternalLink, Activity, CloudRain, Wind, Thermometer, ShieldAlert } from 'lucide-react'

export function RealtimeSyncWidget() {
  const {
    data: earthquakes = [],
    isLoading: loadingQuakes,
    refetch: refetchQuakes,
  } = useQuery({
    queryKey: ['live-usgs-earthquakes'],
    queryFn: fetchLiveEarthquakes,
    refetchInterval: 30000,
  })

  const {
    data: weatherList = [],
    isLoading: loadingWeather,
    refetch: refetchWeather,
  } = useQuery({
    queryKey: ['live-openmeteo-weather'],
    queryFn: fetchLiveWeather,
    refetchInterval: 60000,
  })

  const handleSyncAll = () => {
    refetchQuakes()
    refetchWeather()
  }

  const isSyncing = loadingQuakes || loadingWeather

  return (
    <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-md">
      {/* Header */}
      <CardHeader className="p-5 border-b border-slate-100 bg-gradient-to-r from-cyan-50/50 via-white to-blue-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Zap className="w-5 h-5 text-cyan-600 animate-pulse" />
            Authentic Real-Time Live Data Ingestion Feeds
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Live 60s USGS Seismic GeoJSON & Open-Meteo High-Res Weather API</p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
          {isSyncing ? 'FETCHING LIVE API...' : 'LIVE SYNC NOW'}
        </button>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Top Grid: Open-Meteo Live Weather & Wind Gust Telemetry Across India */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <CloudRain className="w-4 h-4 text-cyan-600" />
              Live India Weather & Cyclone Wind Gust Feeds (Open-Meteo)
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">Updated Live • 6 Regional Hubs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {weatherList.map((city, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">{city.city}</span>
                  {city.cyclone_warning && (
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" title="Cyclone Wind Warning" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 truncate">{city.region}</p>
                <div className="pt-1.5 flex items-baseline justify-between font-mono">
                  <span className="text-base font-extrabold text-cyan-700">{city.temperature_c}°C</span>
                  <span className="text-[10px] text-slate-500">{city.humidity_pct}% RH</span>
                </div>
                <div className="text-[10px] text-slate-600 flex items-center gap-1 pt-0.5 font-mono">
                  <Wind className="w-3 h-3 text-slate-400" /> {city.wind_speed_kmh} km/h (Gusts {city.wind_gusts_kmh} km/h)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Grid: USGS Live Seismic GeoJSON Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Activity className="w-4 h-4 text-rose-600" />
              Live USGS Seismic Feed ({earthquakes.length} Events Detected in last 24h)
            </h4>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold">
              USGS GeoJSON Live
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs font-mono">
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {earthquakes.slice(0, 8).map((eq) => (
                <div key={eq.id} className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-lg text-xs font-extrabold font-mono text-center flex-shrink-0',
                        eq.magnitude >= 5.0
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : eq.magnitude >= 3.5
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                      )}
                    >
                      M {eq.magnitude.toFixed(1)}
                    </span>

                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate font-sans text-xs">{eq.place}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Depth: {eq.depth_km.toFixed(1)} km</span>
                        <span>•</span>
                        <span>{formatRelativeTime(new Date(eq.timestamp).toISOString())}</span>
                        {eq.is_south_asia && (
                          <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 border border-orange-200 text-[9px] font-bold">
                            SOUTH ASIA
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <a
                    href={eq.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-cyan-700 transition rounded-lg hover:bg-slate-100 flex-shrink-0"
                    title="View Official USGS Report"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
