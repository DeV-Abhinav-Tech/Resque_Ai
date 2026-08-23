import React, { useState, useEffect } from 'react'
import { useSosStore } from '@/stores/sosStore'
import { AlertTriangle, MapPin, Phone, ShieldAlert, X, Loader2, CheckCircle2, Navigation } from 'lucide-react'

export function SosModal() {
  const { isModalOpen, closeModal, dispatchSos } = useSosStore()
  const [hazardType, setHazardType] = useState('EARTHQUAKE')
  const [notes, setNotes] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [lat, setLat] = useState<number | null>(39.8283)
  const [lon, setLon] = useState<number | null>(-98.5795)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')

  const acquireLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLon(pos.coords.longitude)
        setAccuracy(Math.round(pos.coords.accuracy))
        setLocating(false)
      },
      (err) => {
        setLocError('GPS permission denied or timed out. Default location locked.')
        setLocating(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  useEffect(() => {
    if (isModalOpen) {
      acquireLocation()
    }
  }, [isModalOpen])

  if (!isModalOpen) return null

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault()
    dispatchSos({
      hazardType,
      latitude: lat || 39.8283,
      longitude: lon || -98.5795,
      accuracy: accuracy || undefined,
      notes,
      contactPhone,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl shadow-3d overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-b border-rose-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-neon-red animate-pulse">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Emergency SOS Dispatch
                <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  Live
                </span>
              </h2>
              <p className="text-xs text-rose-300/80">Broadcast emergency coordinates & alert rescue ops</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDispatch} className="p-6 space-y-5">
          {/* Emergency Category Selection */}
          <div>
            <label className="label text-slate-200 font-medium">Select Emergency Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {[
                { id: 'EARTHQUAKE', name: 'Earthquake Evac', icon: '🌋' },
                { id: 'FLOOD', name: 'Flash Flood Rescue', icon: '🌊' },
                { id: 'HURRICANE', name: 'Hurricane Emergency', icon: '🌀' },
                { id: 'MEDICAL', name: 'Medical Rescue', icon: '🚑' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setHazardType(item.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                    hazardType === item.id
                      ? 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-neon-red scale-[1.02]'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* GPS Location Monitor */}
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Target Coordinates
              </span>
              <button
                type="button"
                onClick={acquireLocation}
                disabled={locating}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium disabled:opacity-50"
              >
                {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                {locating ? 'Locking GPS...' : 'Refresh GPS'}
              </button>
            </div>

            <div className="flex items-center justify-between font-mono text-sm bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-cyan-300">
              <div>
                LAT: <span className="text-slate-100 font-bold">{lat?.toFixed(4)}</span> | LON:{' '}
                <span className="text-slate-100 font-bold">{lon?.toFixed(4)}</span>
              </div>
              {accuracy && <span className="text-xs text-emerald-400">±{accuracy}m GPS Lock</span>}
            </div>
            {locError && <p className="text-xs text-amber-400 mt-1">{locError}</p>}
          </div>

          {/* Contact & Emergency Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Emergency Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="input pl-9 text-sm py-2"
                />
              </div>
            </div>
            <div>
              <label className="label text-xs">Dispatch Notes / Trapped Info</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="2 people on 2nd floor roof..."
                className="input text-sm py-2"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="btn-secondary flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-sos flex-[2] py-3.5 text-base flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              BROADCAST SOS ALERT
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
