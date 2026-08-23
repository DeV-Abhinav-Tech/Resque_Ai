import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { fetchLocationRiskProfile, LocationRiskProfile } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  MapPin,
  Search,
  AlertTriangle,
  Home,
  AlertOctagon,
  Copy,
  Check,
  Zap,
  Waves,
  Wind,
  ShieldAlert,
  Compass,
} from "lucide-react"

const PRESET_LOCATIONS = [
  { name: "Guwahati, Assam", lat: 26.1445, lon: 91.7362, desc: "High Flood Zone" },
  { name: "Dehradun, UK", lat: 30.3165, lon: 78.0322, desc: "Seismic Zone V" },
  { name: "Puri, Odisha", lat: 19.8135, lon: 85.8312, desc: "Cyclone Corridor" },
  { name: "Mumbai, MH", lat: 18.9388, lon: 72.8353, desc: "Coastal Monsoon" },
  { name: "Delhi-NCR", lat: 28.6139, lon: 77.209, desc: "Fault Line" },
]

interface LocationRiskProfileWidgetProps {
  selectedCoords?: { lat: number; lon: number } | null
  onLocationSelect?: (lat: number, lon: number) => void
}

export function LocationRiskProfileWidget({ selectedCoords, onLocationSelect }: LocationRiskProfileWidgetProps) {
  const [latInput, setLatInput] = useState<string>("20.5937")
  const [lonInput, setLonInput] = useState<string>("78.9629")
  const [profile, setProfile] = useState<LocationRiskProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  // Sync when selectedCoords prop changes (e.g. user clicked map)
  useEffect(() => {
    if (selectedCoords) {
      setLatInput(selectedCoords.lat.toFixed(4))
      setLonInput(selectedCoords.lon.toFixed(4))
      loadProfile(selectedCoords.lat, selectedCoords.lon)
    } else {
      loadProfile(20.5937, 78.9629)
    }
  }, [selectedCoords])

  const loadProfile = async (lat: number, lon: number) => {
    setLoading(true)
    try {
      const data = await fetchLocationRiskProfile(lat, lon)
      setProfile(data)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = parseFloat(latInput)
    const lon = parseFloat(lonInput)
    if (!isNaN(lat) && !isNaN(lon)) {
      onLocationSelect?.(lat, lon)
      loadProfile(lat, lon)
    }
  }

  const handleSelectPreset = (lat: number, lon: number) => {
    setLatInput(lat.toString())
    setLonInput(lon.toString())
    onLocationSelect?.(lat, lon)
    loadProfile(lat, lon)
  }

  const handleCopyReport = () => {
    if (!profile) return
    const reportText = `[RESQUE.AI RISK REPORT]
Location: ${profile.locationName} (${profile.latitude}N, ${profile.longitude}E)
Composite Risk Score: ${profile.compositeRiskScore}% (${profile.riskLevel})
Hazard Breakdown:
- Earthquake: ${profile.hazardBreakdown.earthquake}%
- Flood: ${profile.hazardBreakdown.flood}%
- Cyclone: ${profile.hazardBreakdown.hurricane}%
Nearby NDRF Shelters: ${profile.nearbySheltersCount} Active
Highway Roadblocks: ${profile.nearbyRoadblocksCount} Reported
Key Recommendations:
${profile.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\\n")}
Generated at: ${new Date().toISOString()}`

    navigator.clipboard.writeText(reportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-slate-200/80 bg-white shadow-md flex flex-col">
      <CardHeader className="p-5 border-b border-slate-200 bg-slate-50/50">
        <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
          <MapPin className="w-5 h-5 text-cyan-600 animate-bounce" />
          Location Risk Profile & Spatial Analyzer
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter GPS coordinates or click on the spatial map to calculate location threat vectors.
        </p>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Search & Coordinate Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1">
              <input
                type="number"
                step="any"
                placeholder="Latitude (e.g. 26.14)"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                className="w-full pl-3 pr-2 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-slate-900"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                step="any"
                placeholder="Longitude (e.g. 91.73)"
                value={lonInput}
                onChange={(e) => setLonInput(e.target.value)}
                className="w-full pl-3 pr-2 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-slate-900"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            {loading ? "Analyzing..." : "Calculate Risk"}
          </button>
        </form>

        {/* Preset High-Risk Zone Buttons */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">High-Risk Regional Hotspots:</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset.lat, preset.lon)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border border-slate-200"
              >
                <Compass className="w-3 h-3 text-cyan-600" />
                <span>{preset.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({preset.desc})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Profile Card Output */}
        {profile && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4 shadow-inner">
            {/* Header: Location & Level */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">SPATIAL TARGET</span>
                <h3 className="text-base font-black text-white flex items-center gap-1.5 mt-0.5">
                  {profile.locationName}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  GPS: {profile.latitude}° N, {profile.longitude}° E
                </p>
              </div>

              <div className="text-right">
                <span
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-block shadow-sm",
                    profile.riskLevel === "CRITICAL"
                      ? "bg-rose-600 text-white"
                      : profile.riskLevel === "HIGH"
                      ? "bg-orange-500 text-white"
                      : profile.riskLevel === "MEDIUM"
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-600 text-white"
                  )}
                >
                  {profile.riskLevel} THREAT
                </span>
                <p className="text-[11px] font-mono text-slate-300 mt-1 font-bold">
                  Score: <span className="text-cyan-300 text-sm font-black">{profile.compositeRiskScore}/100</span>
                </p>
              </div>
            </div>

            {/* Hazard Breakdown Bars */}
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="flex items-center gap-1 text-rose-300">
                    <Zap className="w-3 h-3 text-rose-400" /> Earthquake Risk
                  </span>
                  <strong className="text-rose-300">{profile.hazardBreakdown.earthquake}%</strong>
                </div>
                <div className="w-full bg-slate-700/70 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${profile.hazardBreakdown.earthquake}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Waves className="w-3 h-3 text-cyan-400" /> Flood Inundation Risk
                  </span>
                  <strong className="text-cyan-300">{profile.hazardBreakdown.flood}%</strong>
                </div>
                <div className="w-full bg-slate-700/70 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${profile.hazardBreakdown.flood}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="flex items-center gap-1 text-amber-300">
                    <Wind className="w-3 h-3 text-amber-400" /> Cyclone Surge Risk
                  </span>
                  <strong className="text-amber-300">{profile.hazardBreakdown.hurricane}%</strong>
                </div>
                <div className="w-full bg-slate-700/70 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${profile.hazardBreakdown.hurricane}%` }} />
                </div>
              </div>
            </div>

            {/* Emergency Facilities & Recommendations */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/60 font-mono">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400">NDRF Shelters</p>
                  <p className="font-bold text-emerald-300">{profile.nearbySheltersCount} Nearby</p>
                </div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400">Roadblocks</p>
                  <p className="font-bold text-rose-300">{profile.nearbyRoadblocksCount} Reported</p>
                </div>
              </div>
            </div>

            {/* Recommendations & Action */}
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
              <div className="text-[11px] text-slate-300 space-y-0.5">
                {profile.recommendations.slice(0, 2).map((rec, i) => (
                  <p key={i} className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-orange-400 shrink-0" /> {rec}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0 ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Report"}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

