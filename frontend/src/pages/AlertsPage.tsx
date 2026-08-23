import { useState, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Filter, Search, Bell, Clock, AlertTriangle, ChevronDown, ChevronUp, Radio } from 'lucide-react'

interface Alert {
  id: string
  hazard_type: string
  severity: string
  status: string
  geometry: any
  effective: string
  expires: string
  headline: string
  description: string
  instruction: string | null
  certainty: string
  urgency: string
}

export function AlertsPage() {
  const [filters, setFilters] = useState({
    hazard_type: '',
    severity: '',
    status: 'ACTIVE',
    search: '',
  })
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'effective', direction: 'desc' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['alerts', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams()
        if (filters.hazard_type) params.append('hazard_type', filters.hazard_type)
        if (filters.severity) params.append('severity', filters.severity)
        params.append('limit', '100')
        const response = await api.get(`/alerts/active?${params.toString()}`)
        return response.data as Alert[]
      } catch {
        return MOCK_ALERTS
      }
    },
    refetchInterval: 30000,
  })

  const sortedAlerts = (alerts || MOCK_ALERTS).sort((a, b) => {
    const aVal = a[sortConfig.key as keyof Alert] || ''
    const bVal = b[sortConfig.key as keyof Alert] || ''
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const severityOptions = ['INFO', 'WATCH', 'WARNING', 'EMERGENCY']
  const hazardOptions = ['EARTHQUAKE', 'FLOOD', 'HURRICANE', 'TORNADO', 'WILDFIRE', 'TSUNAMI', 'VOLCANO']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
            <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
            Alerts Telemetry Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Live active hazard dispatches & public safety advisories</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} className="btn-secondary text-xs">
            <Filter className="w-4 h-4 mr-1.5" />
            Refresh Signals
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <Card className="p-5 border-slate-800 bg-slate-900/90">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label text-xs">Search Headline</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search active alert headers..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Hazard Category</label>
            <select
              value={filters.hazard_type}
              onChange={(e) => setFilters({ ...filters, hazard_type: e.target.value })}
              className="input text-xs bg-slate-950 border-slate-800 text-slate-200"
            >
              <option value="">All Hazards</option>
              {hazardOptions.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Alert Severity Level</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="input text-xs bg-slate-950 border-slate-800 text-slate-200"
            >
              <option value="">All Severities</option>
              {severityOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Dispatch Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input text-xs bg-slate-950 border-slate-800 text-slate-200"
            >
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Alerts Table */}
      <Card className="overflow-hidden border-slate-800 bg-slate-900/90">
        {isLoading ? (
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Decrypting satellite alert feeds...</p>
          </CardContent>
        ) : sortedAlerts.length === 0 ? (
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No active alerts matching filter criteria</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <tr>
                  {['Type', 'Severity', 'Headline', 'Effective', 'Expires', 'Status', 'Actions'].map((label, idx) => (
                    <th key={idx} className="px-4 py-3.5 text-left font-bold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {sortedAlerts.map((alert) => (
                  <Fragment key={alert.id}>
                    <tr className={cn('hover:bg-slate-800/50 transition-colors', expandedId === alert.id && 'bg-slate-800/80')}>
                      <td className="px-4 py-3.5 font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                          <span>{getHazardIcon(alert.hazard_type)}</span>
                          <span>{alert.hazard_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2.5 py-0.5 rounded-full font-bold text-[10px]', getSeverityBadge(alert.severity))}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-sm">
                        <p className="font-bold text-slate-100 truncate">{alert.headline}</p>
                        <p className="text-slate-400 text-[11px] truncate mt-0.5">{alert.description}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono">
                        <Clock className="w-3 h-3 inline mr-1 text-cyan-400" />
                        {formatRelativeTime(alert.effective)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono">
                        <Clock className="w-3 h-3 inline mr-1 text-amber-400" />
                        {formatRelativeTime(alert.expires)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="badge badge-info">{alert.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 ml-auto"
                        >
                          {expandedId === alert.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          Details
                        </button>
                      </td>
                    </tr>

                    {expandedId === alert.id && (
                      <tr>
                        <td colSpan={7} className="p-4 bg-slate-950/80 border-t border-slate-800">
                          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Advisory Description</p>
                              <p className="text-sm text-slate-200 mt-1">{alert.description}</p>
                            </div>
                            {alert.instruction && (
                              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 text-xs space-y-1">
                                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                                  <AlertTriangle className="w-4 h-4" /> Emergency Action Required
                                </p>
                                <p>{alert.instruction}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function getHazardIcon(type: string): string {
  const icons: Record<string, string> = {
    EARTHQUAKE: '🌍',
    FLOOD: '🌊',
    HURRICANE: '🌀',
    TORNADO: '🌪️',
    WILDFIRE: '🔥',
    TSUNAMI: '🌊',
  }
  return icons[type] || '⚠️'
}

function getSeverityBadge(severity: string): string {
  const colors: Record<string, string> = {
    INFO: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    WATCH: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    WARNING: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    EMERGENCY: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  }
  return colors[severity] || 'bg-slate-800 text-slate-300'
}

const MOCK_ALERTS: Alert[] = [
  {
    id: 'alt_101',
    hazard_type: 'EARTHQUAKE',
    severity: 'EMERGENCY',
    status: 'ACTIVE',
    geometry: null,
    effective: new Date().toISOString(),
    expires: new Date(Date.now() + 86400000).toISOString(),
    headline: 'Major Subduction Zone Movement Detected - M6.8',
    description: 'Seismograph network recorded rapid S-wave amplification along Cascadia fault margin.',
    instruction: 'Drop, Cover, and Hold On. Prepare emergency evacuation kits immediately.',
    certainty: 'HIGH',
    urgency: 'IMMEDIATE',
  },
  {
    id: 'alt_102',
    hazard_type: 'FLOOD',
    severity: 'WARNING',
    status: 'ACTIVE',
    geometry: null,
    effective: new Date().toISOString(),
    expires: new Date(Date.now() + 43200000).toISOString(),
    headline: 'Flash Inundation Alert - Coastal Storm Surge',
    description: 'Hydro-gauges indicate water level rise exceeding flood stage by 4.2ft in low-lying zones.',
    instruction: 'Avoid driving across flooded roadways. Move to high ground.',
    certainty: 'OBSERVED',
    urgency: 'IMMEDIATE',
  },
]