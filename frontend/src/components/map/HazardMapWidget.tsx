import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { api } from '@/lib/api'
import { fetchLiveEarthquakes, RealtimeEarthquake } from '@/lib/realtimeApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useDisasterResponseStore } from '@/stores/disasterResponseStore'
import { useGpsSatelliteStore } from '@/stores/gpsSatelliteStore'
import { useIncidentStore } from '@/stores/incidentStore'
import { cn } from '@/lib/utils'
import { Compass, Home, AlertOctagon, Navigation, Radio, Satellite, MapPin, Zap, Moon, Sun, AlertTriangle } from 'lucide-react'

// Center anchor set to India / South Asia
const INDIA_CENTER: [number, number] = [20.5937, 78.9629]
const DEFAULT_ZOOM = 5

const MAP_TILES = {
  CARTO_DARK: {
    name: '3D Dark Vector',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    isDark: true,
  },
  GOOGLE_DARK: {
    name: 'Google Dark Vector',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    isDark: true,
  },
  VOYAGER: {
    name: 'Carto Voyager (Light)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    isDark: false,
  },
  GOOGLE_STREETS: {
    name: 'Google India Vector',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    isDark: false,
  },
  SATELLITE: {
    name: 'ISRO / Esri Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, ISRO Bhuvan',
    isDark: false,
  },
}

const INDIAN_HAZARD_PREDICTIONS = [
  { id: 'cy_1', hazard_type: 'HURRICANE', latitude: 19.8135, longitude: 85.8312, probability: 0.92, expected_severity: 'CRITICAL', model_version: 'imd_cyclone_v2.1', title: 'Bay of Bengal Cyclone Remal' },
  { id: 'fl_ind_1', hazard_type: 'FLOOD', latitude: 26.1445, longitude: 91.7362, probability: 0.85, expected_severity: 'CRITICAL', model_version: 'brahmaputra_flood_v1.4', title: 'Assam Brahmaputra Inundation' },
  { id: 'eq_ind_1', hazard_type: 'EARTHQUAKE', latitude: 30.3165, longitude: 78.0322, probability: 0.74, expected_severity: 'HIGH', model_version: 'himalayan_seismic_v3.0', title: 'Uttarakhand Himalayan Seismic Zone V' },
  { id: 'fl_ind_2', hazard_type: 'FLOOD', latitude: 18.9388, longitude: 72.8353, probability: 0.68, expected_severity: 'HIGH', model_version: 'monsoon_urban_v1.2', title: 'Mumbai Coastal Monsoon Surge' },
  { id: 'eq_ind_2', hazard_type: 'EARTHQUAKE', latitude: 28.6139, longitude: 77.2090, probability: 0.58, expected_severity: 'MEDIUM', model_version: 'delhi_fault_v2.0', title: 'Delhi-NCR Ridge Seismic Tremors' },
]


function MapEventsHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

function MapRecenter({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, 9, { duration: 1.5 })
    }
  }, [center, map])
  return null
}

const HazardLayer = ({ hazardType, onClick }: { hazardType: string; onClick?: (event: any) => void }) => {
  const [data, setData] = useState<any[]>([])
  const [liveQuakes, setLiveQuakes] = useState<RealtimeEarthquake[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const live = await fetchLiveEarthquakes()
        if (live && live.length > 0) {
          setLiveQuakes(live)
        }
      } catch (e) {}

      try {
        const response = await api.get(`/predictions/latest?hazard_type=${hazardType}&limit=100`)
        if (response.data && response.data.length > 0) {
          setData(response.data)
          return
        }
      } catch (error) {}
      const filtered = INDIAN_HAZARD_PREDICTIONS.filter(
        (item) => hazardType === 'ALL' || item.hazard_type === hazardType
      )
      setData(filtered)
    }
    fetchData()
  }, [hazardType])

  const getColor = (probability: number) => {
    if (probability >= 0.7) return '#dc2626'
    if (probability >= 0.4) return '#d97706'
    if (probability >= 0.15) return '#0284c7'
    return '#16a34a'
  }

  return (
    <>
      {/* Regional Hazard Models Overlay */}
      {data.map((item) => {
        const lat = item.latitude || (item.geometry ? item.geometry.coordinates[1] : 20.5937)
        const lon = item.longitude || (item.geometry ? item.geometry.coordinates[0] : 78.9629)
        const color = getColor(item.probability)
        const radius = Math.max(14, item.probability * 38)

        return (
          <CircleMarker
            key={item.id}
            center={[lat, lon]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.55,
              weight: 2,
            }}
            eventHandlers={{ click: (e) => onClick?.({ ...item, leafletEvent: e }) }}
          >
            <Popup>
              <div className="p-2 min-w-[230px]">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                  <span className="text-xl">{getHazardIcon(item.hazard_type)}</span>
                  <div>
                    <h4 className="font-bold text-slate-900">{item.title || `${item.hazard_type} Threat`}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">IMD/NDMA ID: {item.id}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Risk Index:</span>
                    <strong className="text-cyan-700 font-mono">{(item.probability * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Severity:</span>
                    <span className={cn('px-2 py-0.5 rounded font-bold text-[10px]', getSeverityBadge(item.expected_severity))}>
                      {item.expected_severity}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-mono text-[11px] pt-1">
                    <span>Model Engine:</span>
                    <span>{item.model_version}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Live Authentic USGS Earthquakes Overlay */}
      {(hazardType === 'ALL' || hazardType === 'EARTHQUAKE') &&
        liveQuakes.map((eq) => (
          <CircleMarker
            key={`usgs_${eq.id}`}
            center={[eq.latitude, eq.longitude]}
            radius={Math.max(8, eq.magnitude * 3.5)}
            pathOptions={{
              color: eq.magnitude >= 5.0 ? '#dc2626' : '#f59e0b',
              fillColor: eq.magnitude >= 5.0 ? '#ef4444' : '#fbbf24',
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-2 text-xs min-w-[200px]">
                <p className="font-bold text-rose-800 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Live USGS M{eq.magnitude.toFixed(1)} Earthquake
                </p>
                <p className="text-slate-700 mt-1 font-sans">{eq.place}</p>
                <div className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-600">
                  <p>Depth: {eq.depth_km.toFixed(1)} km</p>
                  <p>Coords: ({eq.latitude.toFixed(4)}°, {eq.longitude.toFixed(4)}°)</p>
                  {eq.is_south_asia && <p className="text-orange-700 font-bold">SOUTH ASIA REGION</p>}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
    </>
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
    LOW: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    MEDIUM: 'bg-amber-100 text-amber-800 border border-amber-300',
    HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
    CRITICAL: 'bg-rose-100 text-rose-800 border border-rose-300',
  }
  return colors[severity] || 'bg-slate-100 text-slate-800'
}

export function HazardMapWidget({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  const [selectedHazard, setSelectedHazard] = useState<'EARTHQUAKE' | 'FLOOD' | 'HURRICANE' | 'ALL'>('ALL')
  const [tileMode, setTileMode] = useState<keyof typeof MAP_TILES>('CARTO_DARK')
  const [clickedFeature, setClickedFeature] = useState<any>(null)

  const {
    shelters,
    blockedRoads,
    evacuationRoutes,
    showSheltersLayer,
    showRoadblocksLayer,
    showRoutesLayer,
    show50kmRadiusLayer,
  } = useDisasterResponseStore()

  const { currentPosition, breadcrumbTrail, showGpsTrailOnMap, satelliteUplink } = useGpsSatelliteStore()
  const { incidents, selectedAreaCenter } = useIncidentStore()

  const currentTile = MAP_TILES[tileMode]

  return (
    <Card className="h-[540px] flex flex-col p-0 border-slate-200/80 bg-white shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white border-b border-slate-200">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-600 animate-spin-slow" />
            Bharat Spatial Command Map
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Live Area Alert Search, Citizen Reported Incidents, NDRF Shelters & USGS Feeds</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Dark / Light Map Theme Toggle */}
          <button
            onClick={() => setTileMode(currentTile.isDark ? 'VOYAGER' : 'CARTO_DARK')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5',
              currentTile.isDark
                ? 'bg-slate-900 text-cyan-300 border-slate-700 shadow-sm'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            )}
            title="Toggle Map Dark Theme"
          >
            {currentTile.isDark ? (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Map Dark Theme (Active)</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-600" />
                <span>Map Light Theme</span>
              </>
            )}
          </button>

          {/* Tile Layer Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {(Object.keys(MAP_TILES) as Array<keyof typeof MAP_TILES>).map((key) => (
              <button
                key={key}
                onClick={() => setTileMode(key)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all',
                  tileMode === key
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {MAP_TILES[key].name}
              </button>
            ))}
          </div>

          {/* Hazard Selector */}
          <select
            value={selectedHazard}
            onChange={(e) => setSelectedHazard(e.target.value as any)}
            className="input py-1 px-3 text-xs bg-white border-slate-300 text-slate-800 rounded-xl"
          >
            <option value="ALL">All Regional Hazards</option>
            <option value="HURRICANE">🌀 Cyclone (Bay of Bengal/Arabian Sea)</option>
            <option value="FLOOD">🌊 Flood (Brahmaputra/Monsoon)</option>
            <option value="EARTHQUAKE">🌍 Earthquake (Himalayan Fault & Live USGS)</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className={cn('flex-1 relative min-h-0 p-0', currentTile.isDark && 'dark-map-container')}>
        <MapContainer
          center={INDIA_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <MapRecenter center={selectedAreaCenter} />
          <MapEventsHandler onMapClick={onMapClick} />
          <TileLayer attribution={currentTile.attribution} url={currentTile.url} />

          {/* Citizen & Operator Reported Incidents Overlay */}
          {incidents.map((inc) => (
            <CircleMarker
              key={inc.id}
              center={[inc.latitude, inc.longitude]}
              radius={13}
              pathOptions={{
                color: '#f97316',
                fillColor: '#fb923c',
                fillOpacity: 0.9,
                weight: 3,
              }}
            >
              <Popup>
                <div className="p-2 text-xs min-w-[210px]">
                  <div className="flex items-center gap-1.5 font-bold text-orange-800 pb-1.5 border-b border-slate-200">
                    <AlertTriangle className="w-4 h-4 text-orange-600" /> Reported Incident: {inc.title}
                  </div>
                  <div className="mt-1.5 space-y-1 text-slate-700">
                    <p><strong>Category:</strong> {inc.hazardCategory}</p>
                    <p><strong>Problem:</strong> {inc.description}</p>
                    <p><strong>Reporter:</strong> {inc.reporterName} ({inc.contactPhone})</p>
                    <p><strong>Status:</strong> <span className="text-orange-700 font-bold">{inc.status}</span></p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Offline GPS Breadcrumb Trail Polyline */}
          {showGpsTrailOnMap && breadcrumbTrail.length > 1 && (
            <Polyline
              positions={breadcrumbTrail.map((pt) => [pt.latitude, pt.longitude])}
              pathOptions={{
                color: currentTile.isDark ? '#38bdf8' : '#0284c7',
                weight: 4,
                opacity: 0.9,
                dashArray: '4, 8',
              }}
            >
              <Popup>
                <div className="p-2 text-xs">
                  <p className="font-bold text-cyan-700 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" /> ISRO NavIC Breadcrumb Trail
                  </p>
                  <p className="text-slate-700 mt-1">{breadcrumbTrail.length} location points recorded.</p>
                </div>
              </Popup>
            </Polyline>
          )}

          {/* Current GPS Satellite Position Beacon Marker */}
          {currentPosition && (
            <CircleMarker
              center={[currentPosition.latitude, currentPosition.longitude]}
              radius={11}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#38bdf8',
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <div className="p-2 text-xs min-w-[210px]">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-800 pb-1.5 border-b border-slate-200">
                    <Satellite className="w-4 h-4" /> ISRO NavIC Satellite Beacon
                  </div>
                  <div className="mt-1.5 space-y-1 text-slate-700 font-mono">
                    <p><strong>Position:</strong> {currentPosition.latitude.toFixed(4)}° N, {currentPosition.longitude.toFixed(4)}° E</p>
                    <p><strong>Accuracy:</strong> ±{currentPosition.accuracy} meters</p>
                    <p><strong>Sat Uplink:</strong> {satelliteUplink.provider} ({satelliteUplink.signalPercent}%)</p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* 50km Broadcast Radius Perimeter Ring */}
          {show50kmRadiusLayer && (
            <Circle
              center={selectedAreaCenter || INDIA_CENTER}
              radius={50000}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#0284c7',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '8, 8',
              }}
            >
              <Popup>
                <div className="p-2 text-xs">
                  <p className="font-bold text-cyan-700 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" /> NDMA 50 km Mass Alert Radius
                  </p>
                  <p className="text-slate-700 mt-1">Covering ~284,000 citizens in target zone.</p>
                </div>
              </Popup>
            </Circle>
          )}

          {/* 3D Safe Evacuation Routes Overlay */}
          {showRoutesLayer &&
            evacuationRoutes.map((rt) => (
              <Polyline
                key={rt.id}
                positions={[rt.startPoint, ...rt.waypoints, rt.endPoint]}
                pathOptions={{
                  color: '#10b981',
                  weight: 5,
                  opacity: 0.9,
                  dashArray: rt.status === 'CAUTION' ? '10, 10' : undefined,
                }}
              >
                <Popup>
                  <div className="p-2 text-xs">
                    <p className="font-bold text-emerald-700 flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5" /> {rt.routeName}
                    </p>
                    <p className="text-slate-700 mt-1">Safety Index: {rt.safetyScore}/100 ({rt.status})</p>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* Nearby Emergency Shelters Markers */}
          {showSheltersLayer &&
            shelters.map((sh) => (
              <CircleMarker
                key={sh.id}
                center={[sh.latitude, sh.longitude]}
                radius={14}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="p-2 text-xs min-w-[210px]">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 pb-1.5 border-b border-slate-200">
                      <Home className="w-4 h-4" /> {sh.name}
                    </div>
                    <div className="mt-1.5 space-y-1 text-slate-700">
                      <p><strong>Address:</strong> {sh.address}</p>
                      <p><strong>Capacity:</strong> {sh.capacityOccupied} / {sh.capacityTotal} Beds</p>
                      <p><strong>Helpline:</strong> {sh.contactPhone}</p>
                      <p><strong>Status:</strong> <span className="text-emerald-700 font-bold">{sh.status}</span></p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Blocked Roads Markers */}
          {showRoadblocksLayer &&
            blockedRoads.map((rb) => (
              <CircleMarker
                key={rb.id}
                center={[rb.latitude, rb.longitude]}
                radius={12}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#dc2626',
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="p-2 text-xs min-w-[210px]">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800 pb-1.5 border-b border-slate-200">
                      <AlertOctagon className="w-4 h-4" /> Roadblock: {rb.roadName}
                    </div>
                    <div className="mt-1.5 space-y-1 text-slate-700">
                      <p><strong>Disruption:</strong> {rb.reason}</p>
                      <p><strong>Severity:</strong> {rb.severity}</p>
                      <p><strong>Detour:</strong> {rb.detourAvailable ? 'Available' : 'Blocked'}</p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Hazard Prediction Layers + Live USGS GeoJSON Overlay */}
          {selectedHazard === 'ALL' || selectedHazard === 'EARTHQUAKE' ? (
            <HazardLayer hazardType="EARTHQUAKE" onClick={setClickedFeature} />
          ) : null}
          {selectedHazard === 'ALL' || selectedHazard === 'FLOOD' ? (
            <HazardLayer hazardType="FLOOD" onClick={setClickedFeature} />
          ) : null}
          {selectedHazard === 'ALL' || selectedHazard === 'HURRICANE' ? (
            <HazardLayer hazardType="HURRICANE" onClick={setClickedFeature} />
          ) : null}
        </MapContainer>
      </CardContent>
    </Card>
  )
}
