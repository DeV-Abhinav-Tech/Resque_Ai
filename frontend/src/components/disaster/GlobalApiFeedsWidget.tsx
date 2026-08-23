import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNasaEonetEvents, fetchAirQualityData } from '@/lib/realtimeApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Globe, Wind, ExternalLink, Flame, ShieldAlert, Activity } from 'lucide-react'

export function GlobalApiFeedsWidget() {
  const { data: nasaEvents = [], isLoading: loadingNasa } = useQuery({
    queryKey: ['nasa-eonet-events'],
    queryFn: fetchNasaEonetEvents,
    refetchInterval: 60000,
  })

  const { data: airQuality = [], isLoading: loadingAq } = useQuery({
    queryKey: ['openmeteo-air-quality'],
    queryFn: fetchAirQualityData,
    refetchInterval: 60000,
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* NASA EONET Live Natural Events */}
      <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-md">
        <CardHeader className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 via-white to-red-50/50">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Globe className="w-5 h-5 text-amber-600 animate-spin-slow" />
            NASA EONET Live Natural Events Ingestion
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">NASA Earth Observatory Natural Event Tracker (Wildfires, Storms, Volcanoes)</p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="max-h-56 overflow-y-auto space-y-2 text-xs">
            {nasaEvents.slice(0, 6).map((ev) => (
              <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-slate-900">{ev.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    Category: {ev.category} • ({ev.latitude.toFixed(2)}°, {ev.longitude.toFixed(2)}°)
                  </p>
                </div>
                <a
                  href={ev.source_link}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-400 hover:text-amber-700 transition"
                  title="View Official NASA EONET Event Details"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Open-Meteo Air Quality & Pollution Extraction */}
      <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-md">
        <CardHeader className="p-5 border-b border-slate-100 bg-gradient-to-r from-cyan-50/50 via-white to-emerald-50/50">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Wind className="w-5 h-5 text-cyan-600" />
            Air Quality & Dust Hazard Feature Extraction
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Live Air Quality Index (AQI), PM2.5, PM10 & Dust Pollution Telemetry</p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {airQuality.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">{item.city}</p>
                <div className="flex items-baseline justify-between font-mono pt-1">
                  <span className="text-base font-extrabold text-cyan-700">AQI {item.aqi || 'N/A'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-1 border-t border-slate-200">
                  <p>PM2.5: {item.pm2_5?.toFixed(1) || '--'} µg/m³</p>
                  <p>PM10: {item.pm10?.toFixed(1) || '--'} µg/m³</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
