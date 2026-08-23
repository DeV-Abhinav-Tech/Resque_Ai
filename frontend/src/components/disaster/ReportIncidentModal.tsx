import React, { useState } from 'react'
import { useIncidentStore } from '@/stores/incidentStore'
import { AlertTriangle, MapPin, Camera, Send, X, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react'

export function ReportIncidentModal() {
  const { isReportModalOpen, closeReportModal, addIncident } = useIncidentStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hazardCategory, setHazardCategory] = useState<'LANDSLIDE' | 'FLOOD' | 'STRUCTURAL_COLLAPSE' | 'MEDICAL_CRISIS' | 'FIRE' | 'CYCLONE'>('LANDSLIDE')
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL')
  const [latitude, setLatitude] = useState(28.6139)
  const [longitude, setLongitude] = useState(77.2090)
  const [reporterName, setReporterName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [photoUploaded, setPhotoUploaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isReportModalOpen) return null

  const handleGpsLock = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1000))

    addIncident({
      title: title || `${hazardCategory} Emergency Incident`,
      description,
      hazardCategory,
      severity,
      latitude,
      longitude,
      reporterName: reporterName || 'Anonymous Citizen',
      contactPhone: contactPhone || '+91 112-Emergency',
      photoUrl: photoUploaded ? 'incident_photo_evidence.jpg' : undefined,
    })

    setSubmitting(false)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 via-white to-red-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-700 shadow-sm">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Report Disaster Incident
                <span className="text-[10px] bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
                  NDMA Dispatch
                </span>
              </h2>
              <p className="text-xs text-slate-500">Describe the emergency problem for immediate first responder rescue</p>
            </div>
          </div>
          <button onClick={closeReportModal} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Incident Title */}
          <div>
            <label className="label text-xs font-semibold text-slate-700">Incident Title / Summary</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flash Landslide blocking Pilgrimage Route near Kedarnath"
              className="input text-xs"
              required
            />
          </div>

          {/* Hazard Category & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs font-semibold text-slate-700">Hazard Category</label>
              <select
                value={hazardCategory}
                onChange={(e) => setHazardCategory(e.target.value as any)}
                className="input text-xs bg-white"
              >
                <option value="LANDSLIDE">⛰️ Landslide / Rockfall</option>
                <option value="FLOOD">🌊 Flash Flood / Inundation</option>
                <option value="STRUCTURAL_COLLAPSE">🏢 Building / Bridge Collapse</option>
                <option value="MEDICAL_CRISIS">🚑 Mass Medical Trauma</option>
                <option value="FIRE">🔥 Urban / Wildfire</option>
                <option value="CYCLONE">🌀 Cyclone Storm Damage</option>
              </select>
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-700">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="input text-xs bg-white"
              >
                <option value="CRITICAL">🔴 CRITICAL (Lives at Risk)</option>
                <option value="HIGH">🟠 HIGH (Major Damage)</option>
                <option value="MEDIUM">🟡 MEDIUM (Moderate Risk)</option>
                <option value="LOW">🟢 LOW (Advisory)</option>
              </select>
            </div>
          </div>

          {/* Problem Description */}
          <div>
            <label className="label text-xs font-semibold text-slate-700">Describe the Emergency Problem</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what happened, estimated citizens trapped, injuries, road blockages, or urgent rescue requirements..."
              className="input text-xs"
              required
            />
          </div>

          {/* Location Coordinates Lock */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs font-semibold text-slate-700 mb-0">GPS Coordinates</label>
              <button
                type="button"
                onClick={handleGpsLock}
                className="text-[11px] text-cyan-700 hover:text-cyan-800 font-bold flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5" /> Auto-Lock Current GPS
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                placeholder="Latitude (°N)"
                className="input text-xs font-mono"
                required
              />
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                placeholder="Longitude (°E)"
                className="input text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Reporter Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs font-semibold text-slate-700">Reporter Name</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Your Name / Operator ID"
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-slate-700">Contact Phone Number</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765-43210"
                className="input text-xs font-mono"
              />
            </div>
          </div>

          {/* Photo Evidence Uploader Simulation */}
          <div
            onClick={() => setPhotoUploaded(!photoUploaded)}
            className={`p-3.5 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
              photoUploaded ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-5 h-5 mx-auto mb-1 text-slate-400" />
            <p className="font-bold text-xs">
              {photoUploaded ? '✓ Photo Attached (incident_damage_photo.jpg)' : 'Click to Attach Incident Photo / Damage Evidence'}
            </p>
          </div>

          {submitted && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Incident Reported! NDRF Control Room & Rescue Teams Notified.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={closeReportModal} className="btn-secondary flex-1 py-3 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-[2] py-3 text-xs font-bold flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 border-orange-500">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Report...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> SUBMIT INCIDENT REPORT
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
