import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatRelativeTime, getSeverityColor } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Alert {
  id: string
  hazard_type: string
  severity: string
  headline: string
  effective: string
  geometry: any
}

interface AlertsWidgetProps {
  alerts: Alert[]
}

export function AlertsWidget({ alerts }: AlertsWidgetProps) {
  const getHazardIcon = (type: string) => {
    const icons: Record<string, string> = {
      EARTHQUAKE: '🌍',
      FLOOD: '🌊',
      HURRICANE: '🌀',
      TORNADO: '🌪️',
      WILDFIRE: '🔥',
    }
    return icons[type] || '⚠️'
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
            Active Emergency Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No active alerts</p>
          <p className="text-xs text-slate-400 mt-1">All monitoring zones operational</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white p-0 overflow-hidden">
      <CardHeader className="p-5 border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Active Emergency Alerts
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {alerts.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 text-xs">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getHazardIcon(alert.hazard_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 truncate">{alert.headline}</h4>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold font-mono', getSeverityColor(alert.severity))}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{alert.hazard_type} • {formatRelativeTime(alert.effective)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {alerts.length > 5 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <a href="/alerts" className="text-xs text-cyan-700 hover:text-cyan-800 font-bold">
              View all {alerts.length} active alerts →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}