import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatRelativeTime, getSeverityColor, getHazardIcon } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  hazard_type: string
  severity: string
  timestamp: string
  properties: any
}

interface RecentEventsWidgetProps {
  events: Event[]
}

export function RecentEventsWidget({ events }: RecentEventsWidgetProps) {
  if (events.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <span className="text-lg">📋</span>
            Recent Historical Events
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-slate-500">
          No recent historical events logged
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white p-0 overflow-hidden">
      <CardHeader className="p-5 border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <span className="text-lg">📋</span>
          Recent Historical Events
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 text-xs">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getHazardIcon(event.hazard_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-900">{event.hazard_type}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold font-mono', getSeverityColor(event.severity))}>
                      {event.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">
                    {event.properties?.place || event.properties?.title || 'Event detected'}
                    {' • '}
                    <span className="text-slate-400">{formatRelativeTime(event.timestamp)}</span>
                  </p>
                </div>
                {event.properties?.magnitude && (
                  <div className="text-right pl-2">
                    <p className="font-mono font-bold text-slate-900">M{event.properties.magnitude}</p>
                    <p className="text-[10px] text-slate-400">Mag</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {events.length > 5 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <a href="/historical" className="text-xs text-cyan-700 hover:text-cyan-800 font-bold">
              View all {events.length} historical events →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}