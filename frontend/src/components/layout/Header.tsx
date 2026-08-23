import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSosStore } from '@/stores/sosStore'
import { useGpsSatelliteStore } from '@/stores/gpsSatelliteStore'
import { useIncidentStore } from '@/stores/incidentStore'
import { OfflineIndicator } from '@/components/disaster/OfflineIndicator'
import { AreaSearchWidget } from '@/components/disaster/AreaSearchWidget'
import { LogOut, User, Menu, AlertTriangle, LogIn, Satellite, Phone, AlertCircle } from 'lucide-react'

export function Header() {
  const { user, logout, isGuest } = useAuthStore()
  const { openModal, activeSos } = useSosStore()
  const { satelliteUplink } = useGpsSatelliteStore()
  const { openReportModal } = useIncidentStore()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-orange-600 via-white to-green-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-600/20 border border-orange-400/40 flex-shrink-0">
              <span className="text-slate-900 font-black text-base tracking-wider">R</span>
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 hidden sm:block tracking-wide flex items-center gap-2">
                Resque<span className="text-orange-600 font-normal">.AI</span>
                <span className="text-[10px] bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                  Bharat Command
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Area Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md">
          <AreaSearchWidget />
        </div>

        {/* Right: Actions, SOS, Report Incident & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Report Incident Button */}
          <button
            onClick={openReportModal}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 font-bold"
            title="Report Disaster Incident & Describe Problem"
          >
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="hidden sm:inline">Report Incident</span>
          </button>

          {/* Emergency SOS Button */}
          <button
            onClick={openModal}
            className={`btn-sos text-xs sm:text-sm px-3.5 sm:px-4 py-2 flex items-center gap-2 rounded-xl border border-red-400/50 ${
              activeSos ? 'animate-bounce ring-2 ring-rose-500' : ''
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
            <span className="tracking-wide">EMERGENCY SOS</span>
          </button>

          {/* User / Guest Account Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
            >
              <div className="w-8 h-8 bg-orange-100 border border-orange-300 rounded-lg flex items-center justify-center text-orange-700 font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden md:block text-xs font-semibold text-slate-800">
                {user?.full_name || 'Guest Operator'}
                {isGuest && <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono border border-slate-300">GUEST</span>}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{user?.full_name || 'Guest Command Operator'}</p>
                  <p className="text-[11px] text-orange-700 uppercase tracking-wider mt-0.5 font-mono">
                    Mode: {isGuest ? 'BHARAT GUEST ACCESS' : `ROLE: ${user?.role}`}
                  </p>
                </div>
                {isGuest ? (
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-cyan-700 hover:bg-slate-50 transition text-left font-semibold"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In / Register Account
                  </button>
                ) : (
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 transition text-left font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    Switch to Guest Mode
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}