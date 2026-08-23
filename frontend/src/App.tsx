import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { HazardMap } from '@/pages/HazardMap'
import { AlertsPage } from '@/pages/AlertsPage'
import { HistoricalPage } from '@/pages/HistoricalPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { SosModal } from '@/components/sos/SosModal'
import { SosBanner } from '@/components/sos/SosBanner'
import { Broadcast50kmModal } from '@/components/disaster/Broadcast50kmModal'
import { ReportIncidentModal } from '@/components/disaster/ReportIncidentModal'
import { ChatbotWidget } from '@/components/chat/ChatbotWidget'
import { useAuthStore } from '@/stores/authStore'

export function App() {
  const { isAuthenticated, isGuest, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-orange-500/20">
      <SosBanner />
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/map" element={<HazardMap />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/historical" element={<HistoricalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <SosModal />
      <Broadcast50kmModal />
      <ReportIncidentModal />
      <ChatbotWidget />
    </div>
  )
}

export default App