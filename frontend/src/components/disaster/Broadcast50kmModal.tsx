import React, { useState } from 'react'
import { useDisasterResponseStore } from '@/stores/disasterResponseStore'
import { Radio, Send, X, CheckCircle, Users, MapPin, Loader2 } from 'lucide-react'

export function Broadcast50kmModal() {
  const { isBroadcastModalOpen, closeBroadcastModal, send50kmBroadcast, affectedPopulation } = useDisasterResponseStore()
  const [message, setMessage] = useState(
    'EMERGENCY ADVISORY: Evacuation order in effect for low-lying zones within 50km. Move to designated emergency shelters immediately.'
  )
  const [sending, setSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)

  if (!isBroadcastModalOpen) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await new Promise((r) => setTimeout(r, 1200))
    send50kmBroadcast(message, 50)
    setSending(false)
    setSentSuccess(true)
    setTimeout(() => {
      setSentSuccess(false)
    }, 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-50 via-white to-blue-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 border border-cyan-300 flex items-center justify-center text-cyan-700 shadow-sm animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                50km Mass Broadcast Alert
                <span className="text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-300 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
                  Cell Broadcast
                </span>
              </h2>
              <p className="text-xs text-slate-500">Targeted emergency alert dispatch to all citizens in 50km radius</p>
            </div>
          </div>
          <button onClick={closeBroadcastModal} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSend} className="p-6 space-y-5">
          {/* Target Impact Info */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-cyan-600" />
              <div>
                <p className="text-slate-500">Target Recipients</p>
                <p className="text-base font-extrabold text-slate-900 font-mono">~{affectedPopulation.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-slate-500">Coverage Radius</p>
                <p className="text-base font-extrabold text-slate-900 font-mono">50 km Perimeter</p>
              </div>
            </div>
          </div>

          {/* Broadcast Message Input */}
          <div>
            <label className="label text-xs font-semibold text-slate-700">Emergency Message Payload</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input font-mono text-xs text-slate-900 bg-white border-slate-300 rounded-xl"
              placeholder="Type urgent broadcast alert text..."
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">Dispatched via WEA (Wireless Emergency Alerts) + SMS Gateways.</p>
          </div>

          {sentSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>50km Broadcast Dispatched to {affectedPopulation.toLocaleString()} citizens!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={closeBroadcastModal} className="btn-secondary flex-1 py-3 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={sending} className="btn-primary flex-[2] py-3 text-xs font-bold flex items-center justify-center gap-2">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Transmitting Signals...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> DISPATCH 50KM BROADCAST
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
