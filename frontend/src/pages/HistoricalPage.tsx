import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Search, Calendar, Download, ChevronLeft, ChevronRight, Globe, History } from 'lucide-react'

interface HazardEvent {
  id: string
  hazard_type: string
  severity: string
  geometry: any
  timestamp: string
  source: string
  properties: any
}

export function HistoricalPage() {
  const [filters, setFilters] = useState({
    hazard_type: '',
    severity: '',
    source: '',
    start_date: '',
    end_date: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['historical', filters, page],
    queryFn: async () => {
      try {
        const params = new URLSearchParams()
        if (filters.hazard_type) params.append('hazard_type', filters.hazard_type)
        if (filters.severity) params.append('severity', filters.severity)
        if (filters.source) params.append('source', filters.source)
        params.append('limit', pageSize.toString())
        params.append('offset', ((page - 1) * pageSize).toString())
        const res = await api.get(`/historical?${params.toString()}`)
        return res.data as { events: HazardEvent[]; total: number }
      } catch {
        return { events: MOCK_HISTORICAL, total: MOCK_HISTORICAL.length }
      }
    },
    refetchInterval: 60000,
  })

  const events = response?.events || MOCK_HISTORICAL
  const total = response?.total || MOCK_HISTORICAL.length
  const totalPages = Math.ceil(total / pageSize)

  const hazardOptions = ['EARTHQUAKE', 'FLOOD', 'HURRICANE', 'TORNADO', 'WILDFIRE', 'TSUNAMI']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-400" />
            Historical Archive & Declarations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Cross-reference historical disaster declarations & seismic logs</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary text-xs">
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Box */}
      <Card className="p-5 border-slate-800 bg-slate-900/90">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="label text-xs">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search archive titles..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Hazard Type</label>
            <select
              value={filters.hazard_type}
              onChange={(e) => setFilters({ ...filters, hazard_type: e.target.value })}
              className="input text-xs bg-slate-950 border-slate-800 text-slate-200"
            >
              <option value="">All Types</option>
              {hazardOptions.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Data Provider Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="input text-xs bg-slate-950 border-slate-800 text-slate-200"
            >
              <option value="">All Sources</option>
              <option value="USGS">USGS Earthquakes</option>
              <option value="NOAA">NOAA Weather</option>
              <option value="FEMA">FEMA Declarations</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => refetch()} className="btn-primary w-full text-xs py-2.5">
              Query Historical Log
            </button>
          </div>
        </div>
      </Card>

      {/* Historical Data Table */}
      <Card className="overflow-hidden border-slate-800 bg-slate-900/90">
        {isLoading ? (
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading historical database...</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 text-left">Hazard Type</th>
                  <th className="px-4 py-3.5 text-left">Severity</th>
                  <th className="px-4 py-3.5 text-left">Timestamp</th>
                  <th className="px-4 py-3.5 text-left">Source</th>
                  <th className="px-4 py-3.5 text-left">Event Title / Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{getHazardIcon(event.hazard_type)}</span>
                        <span>{event.hazard_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('px-2.5 py-0.5 rounded-full font-bold text-[10px]', getSeverityBadge(event.severity))}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono">
                      <Calendar className="w-3.5 h-3.5 inline mr-1 text-cyan-400" />
                      {formatDateTime(event.timestamp)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 border border-slate-800 text-cyan-300">
                        {event.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {event.properties?.place || event.properties?.title || 'Historical Incident Entry'}
                      {event.properties?.magnitude && (
                        <span className="ml-2 font-mono text-cyan-400 font-bold">M{event.properties.magnitude}</span>
                      )}
                    </td>
                  </tr>
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
  }
  return icons[type] || '⚠️'
}

function getSeverityBadge(severity: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    HIGH: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    CRITICAL: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  }
  return colors[severity] || 'bg-slate-800 text-slate-300'
}

const MOCK_HISTORICAL: HazardEvent[] = [
  {
    id: 'hist_1',
    hazard_type: 'EARTHQUAKE',
    severity: 'CRITICAL',
    geometry: null,
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    source: 'USGS',
    properties: { place: '14km S of Ridgecrest, CA', magnitude: 6.4 },
  },
  {
    id: 'hist_2',
    hazard_type: 'HURRICANE',
    severity: 'HIGH',
    geometry: null,
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    source: 'NOAA_NHC',
    properties: { place: 'Gulf Coast Landfall - Cat 4 Surge', title: 'Hurricane Ida Inundation' },
  },
]