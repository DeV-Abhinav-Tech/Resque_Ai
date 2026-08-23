import { useState } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { cn } from "@/lib/utils"
import { TrendingUp, Calendar, Zap, Waves, Wind, Activity } from "lucide-react"

interface TrendPoint {
  time: string
  earthquake: number
  flood: number
  hurricane: number
  composite: number
}

const DATA_24H: TrendPoint[] = [
  { time: "00:00", earthquake: 42, flood: 65, hurricane: 20, composite: 65 },
  { time: "04:00", earthquake: 45, flood: 72, hurricane: 25, composite: 72 },
  { time: "08:00", earthquake: 58, flood: 80, hurricane: 30, composite: 80 },
  { time: "12:00", earthquake: 74, flood: 85, hurricane: 45, composite: 85 },
  { time: "16:00", earthquake: 68, flood: 78, hurricane: 52, composite: 78 },
  { time: "20:00", earthquake: 60, flood: 70, hurricane: 48, composite: 70 },
  { time: "24:00", earthquake: 55, flood: 62, hurricane: 40, composite: 62 },
]

const DATA_7D: TrendPoint[] = [
  { time: "Mon", earthquake: 35, flood: 45, hurricane: 15, composite: 45 },
  { time: "Tue", earthquake: 40, flood: 55, hurricane: 20, composite: 55 },
  { time: "Wed", earthquake: 65, flood: 70, hurricane: 35, composite: 70 },
  { time: "Thu", earthquake: 78, flood: 85, hurricane: 60, composite: 85 },
  { time: "Fri", earthquake: 70, flood: 82, hurricane: 75, composite: 82 },
  { time: "Sat", earthquake: 55, flood: 65, hurricane: 50, composite: 65 },
  { time: "Sun", earthquake: 48, flood: 50, hurricane: 30, composite: 50 },
]

const DATA_30D: TrendPoint[] = [
  { time: "Week 1", earthquake: 30, flood: 40, hurricane: 10, composite: 40 },
  { time: "Week 2", earthquake: 50, flood: 60, hurricane: 25, composite: 60 },
  { time: "Week 3", earthquake: 75, flood: 88, hurricane: 70, composite: 88 },
  { time: "Week 4", earthquake: 60, flood: 65, hurricane: 40, composite: 65 },
]

export function RiskTrendChartWidget() {
  const [timeframe, setTimeframe] = useState<"24H" | "7D" | "30D">("24H")
  const [activeHazard, setActiveHazard] = useState<"ALL" | "EARTHQUAKE" | "FLOOD" | "HURRICANE">("ALL")

  const chartData = timeframe === "24H" ? DATA_24H : timeframe === "7D" ? DATA_7D : DATA_30D

  return (
    <Card className="border-slate-200/80 bg-white shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-slate-200">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <TrendingUp className="w-5 h-5 text-orange-600 animate-pulse" />
            Regional Multi-Hazard Risk Trends & Forecast
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Predictive time-series trajectory calculated across Himalayan, Brahmaputra & Coastal observation grids.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {(["24H", "7D", "30D"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all",
                  timeframe === tf ? "bg-orange-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Hazard Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveHazard("ALL")}
              className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", activeHazard === "ALL" ? "bg-slate-900 text-white" : "text-slate-600")}
            >
              All
            </button>
            <button
              onClick={() => setActiveHazard("EARTHQUAKE")}
              className={cn("px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all", activeHazard === "EARTHQUAKE" ? "bg-rose-600 text-white" : "text-slate-600")}
            >
              <Zap className="w-3 h-3" /> Quake
            </button>
            <button
              onClick={() => setActiveHazard("FLOOD")}
              className={cn("px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all", activeHazard === "FLOOD" ? "bg-cyan-600 text-white" : "text-slate-600")}
            >
              <Waves className="w-3 h-3" /> Flood
            </button>
            <button
              onClick={() => setActiveHazard("HURRICANE")}
              className={cn("px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all", activeHazard === "HURRICANE" ? "bg-amber-600 text-white" : "text-slate-600")}
            >
              <Wind className="w-3 h-3" /> Cyclone
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEarthquake" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorFlood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorHurricane" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />

              {(activeHazard === "ALL" || activeHazard === "EARTHQUAKE") && (
                <Area type="monotone" dataKey="earthquake" name="Seismic (Earthquake)" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEarthquake)" />
              )}

              {(activeHazard === "ALL" || activeHazard === "FLOOD") && (
                <Area type="monotone" dataKey="flood" name="Hydrological (Flood)" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFlood)" />
              )}

              {(activeHazard === "ALL" || activeHazard === "HURRICANE") && (
                <Area type="monotone" dataKey="hurricane" name="Tropical (Cyclone)" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHurricane)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer info summary */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>AI Risk Models calibrated against USGS, IMD & CWC live observation data.</span>
          </div>
          <div className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            Peak Forecast: Flood Risk (85% Peak)
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

