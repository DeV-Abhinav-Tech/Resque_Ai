import React from 'react'
import { useGpsSatelliteStore } from '@/stores/gpsSatelliteStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Radio, Navigation, Download, Zap, CheckCircle2, Loader2, MapPin, Satellite } from 'lucide-react'

export function GpsSatelliteTrackerWidget() {
  const {
    isTracking,
    currentPosition,
    satelliteUplink,
    breadcrumbTrail,
    queuedPackets,
    startGpsTracking,
    stopGpsTracking,
    transmitSatellitePacket,
    exportGpxTrail,
    showGpsTrailOnMap,
    toggleGpsTrailLayer,
  } = useGpsSatelliteStore()

  return (
    <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-md">
      {/* Header */}
      <CardHeader className="p-5 border-b border-slate-100 bg-gradient-to-r from-orange-50/50 via-white to-green-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Satellite className="w-5 h-5 text-orange-600 animate-pulse" />
            ISRO NavIC & Offline GPS Telemetry Tracker
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Indian Regional Navigation Satellite System (NavIC / IRNSS & INSAT-3D)</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (isTracking ? stopGpsTracking() : startGpsTracking())}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5',
              isTracking
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            )}
          >
            <Navigation className={cn('w-3.5 h-3.5', isTracking && 'animate-spin-slow')} />
            {isTracking ? 'NavIC Hardware Active' : 'Enable NavIC GPS'}
          </button>

          <button
            onClick={toggleGpsTrailLayer}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
              showGpsTrailOnMap ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-slate-100 text-slate-500'
            )}
          >
            {showGpsTrailOnMap ? 'Trail Map ON' : 'Trail Map OFF'}
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Top Grid: Live GPS HUD & ISRO Satellite Link Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Live GPS Coordinate HUD */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-orange-600" /> Live India Coordinates (ISRO NavIC)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-orange-800 border border-orange-300">
                ±{currentPosition.accuracy}m NavIC Accuracy
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">LATITUDE</span>
                <span className="text-base font-extrabold text-slate-900">{currentPosition.latitude.toFixed(6)}° N</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">LONGITUDE</span>
                <span className="text-base font-extrabold text-slate-900">{currentPosition.longitude.toFixed(6)}° E</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ALTITUDE</span>
                <span className="text-sm font-bold text-slate-800">{currentPosition.altitude} m MSL</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">VELOCITY / HEADING</span>
                <span className="text-sm font-bold text-slate-800">{currentPosition.speed} km/h • {currentPosition.heading}°</span>
              </div>
            </div>
          </div>

          {/* ISRO NavIC Satellite Uplink Status HUD */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" /> ISRO Satellite Constellation
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {satelliteUplink.provider.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">SIGNAL STRENGTH</span>
                <span className="text-base font-extrabold text-emerald-700">{satelliteUplink.signalPercent}% ({satelliteUplink.signalDb} dBm)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CONSTELLATION LOCK</span>
                <span className="text-base font-extrabold text-slate-900">{satelliteUplink.satellitesInView} NavIC Satellites Locked</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DOPPLER OFFSET</span>
                <span className="text-sm font-bold text-slate-800">{satelliteUplink.dopplerOffsetHz} Hz</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">UPLINK STATUS</span>
                <span className="text-sm font-bold text-orange-700 uppercase">{satelliteUplink.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Satellite Packet Transmitter & Trail Exporter Bar */}
        <div className="p-4 bg-gradient-to-r from-orange-50/60 via-slate-50 to-green-50/60 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600" />
              Direct ISRO NavIC Emergency Packet Transmitter
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Logged {breadcrumbTrail.length} Indian GPS points • {queuedPackets.length} satellite packets dispatched
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={exportGpxTrail}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 w-full sm:w-auto justify-center"
              title="Export NavIC Trail as GPX file for handheld GPS devices"
            >
              <Download className="w-3.5 h-3.5" /> Export GPX Trail
            </button>

            <button
              onClick={() => transmitSatellitePacket('SOS_BEACON_PING')}
              className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" /> TRANSMIT NavIC BEACON
            </button>
          </div>
        </div>

        {/* Dispatched Satellite Packets Log */}
        {queuedPackets.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ISRO Transmitted Telemetry Packets</h5>
            <div className="space-y-1.5 text-xs font-mono max-h-32 overflow-y-auto pr-1">
              {queuedPackets.map((pkt) => (
                <div key={pkt.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pkt.status === 'TRANSMITTING' ? (
                      <Loader2 className="w-3.5 h-3.5 text-orange-600 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span className="font-bold text-slate-800">{pkt.payloadType}</span>
                    <span className="text-[11px] text-slate-500">({pkt.latitude.toFixed(4)}°N, {pkt.longitude.toFixed(4)}°E)</span>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', pkt.status === 'ACKNOWLEDGED_BY_SATELLITE' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800')}>
                    {pkt.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
