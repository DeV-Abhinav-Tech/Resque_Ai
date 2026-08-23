import React, { useState } from 'react'
import { useIncidentStore } from '@/stores/incidentStore'
import { Search, MapPin, X, Navigation, Filter } from 'lucide-react'

const AREA_SUGGESTIONS = [
  { name: 'New Delhi / NCR', center: [28.6139, 77.2090] as [number, number], tag: 'Ridge Seismic Zone' },
  { name: 'Mumbai, Maharashtra', center: [19.0760, 72.8777] as [number, number], tag: 'Monsoon Flood Zone' },
  { name: 'Dehradun, Uttarakhand', center: [30.3165, 78.0322] as [number, number], tag: 'Himalayan Landslide Zone' },
  { name: 'Guwahati, Assam', center: [26.1445, 91.7362] as [number, number], tag: 'Brahmaputra Flood Delta' },
  { name: 'Puri, Odisha', center: [19.8135, 85.8312] as [number, number], tag: 'Cyclone Remal Belt' },
  { name: 'Kochi, Kerala', center: [9.9312, 76.2673] as [number, number], tag: 'Western Ghats Monsoon' },
]

export function AreaSearchWidget() {
  const { searchQuery, setSearchQuery, setSelectedArea, selectedAreaName } = useIncidentStore()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSelectArea = (name: string, center: [number, number]) => {
    setSearchQuery(name)
    setSelectedArea(name, center)
    setShowDropdown(false)
  }

  const handleClear = () => {
    setSearchQuery('')
    setSelectedArea('', null)
  }

  const filteredSuggestions = AREA_SUGGESTIONS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search specific city, region or pin code alerts (e.g. Mumbai, Uttarakhand, Puri)..."
          className="input pl-10 pr-9 py-2.5 text-xs bg-white border-slate-200 shadow-sm rounded-2xl"
        />
        {searchQuery ? (
          <button onClick={handleClear} className="absolute right-3 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Auto Suggestions Dropdown */}
      {showDropdown && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs">
          <div className="p-2 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-orange-600" /> Select Region to Zoom Map & Filter Active Alerts
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectArea(item.name, item.center)}
                className="w-full px-4 py-2.5 text-left hover:bg-orange-50/60 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-900">{item.name}</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  {item.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Selected Area Badge */}
      {selectedAreaName && (
        <div className="mt-2 flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Active Area Filter:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-bold flex items-center gap-1">
            <Navigation className="w-3 h-3 text-orange-600" /> {selectedAreaName}
          </span>
          <button onClick={handleClear} className="text-[11px] text-slate-400 hover:text-slate-700 underline">
            Clear Filter
          </button>
        </div>
      )}
    </div>
  )
}
