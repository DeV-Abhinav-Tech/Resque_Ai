import { create } from 'zustand'

export interface GpsPoint {
  latitude: number
  longitude: number
  altitude: number // meters
  speed: number // km/h
  heading: number // degrees
  accuracy: number // meters
  timestamp: string
  signalType: 'GPS_HARDWARE' | 'ISRO_NAVIC' | 'INSAT_3D' | 'LORA_MESH'
}

export interface SatelliteUplinkInfo {
  provider: 'ISRO_NAVIC_IRNSS' | 'INSAT_3D_MET' | 'GSAT_31_COMM' | 'STARLINK_DIRECT'
  status: 'CONNECTED' | 'TRANSMITTING' | 'ACQUIRING_LOCK' | 'OFFLINE'
  signalDb: number // e.g. -74 dBm
  signalPercent: number // 0 - 100%
  satellitesInView: number
  dopplerOffsetHz: number
  lastPingTime: string
}

export interface SatellitePacket {
  id: string
  payloadType: 'SOS_BEACON_PING' | 'LOCATION_TELEMETRY' | 'SHELTER_UPDATE'
  latitude: number
  longitude: number
  altitude: number
  sentAt: string
  status: 'QUEUED' | 'TRANSMITTING' | 'ACKNOWLEDGED_BY_SATELLITE'
}

interface GpsSatelliteState {
  isTracking: boolean
  currentPosition: GpsPoint
  satelliteUplink: SatelliteUplinkInfo
  breadcrumbTrail: GpsPoint[]
  queuedPackets: SatellitePacket[]
  watchId: number | null
  showGpsTrailOnMap: boolean

  startGpsTracking: () => void
  stopGpsTracking: () => void
  transmitSatellitePacket: (payloadType?: 'SOS_BEACON_PING' | 'LOCATION_TELEMETRY') => void
  toggleGpsTrailLayer: () => void
  exportGpxTrail: () => void
}

const DEFAULT_INDIAN_GPS_POINT: GpsPoint = {
  latitude: 28.6139,
  longitude: 77.2090,
  altitude: 216,
  speed: 14.2,
  heading: 110,
  accuracy: 2.8,
  timestamp: new Date().toISOString(),
  signalType: 'ISRO_NAVIC',
}

const INITIAL_INDIAN_TRAIL: GpsPoint[] = [
  { latitude: 28.5920, longitude: 77.1850, altitude: 210, speed: 11.2, heading: 105, accuracy: 3.5, timestamp: new Date(Date.now() - 600000).toISOString(), signalType: 'GPS_HARDWARE' },
  { latitude: 28.6045, longitude: 77.1980, altitude: 214, speed: 12.8, heading: 108, accuracy: 3.0, timestamp: new Date(Date.now() - 300000).toISOString(), signalType: 'GPS_HARDWARE' },
  DEFAULT_INDIAN_GPS_POINT,
]

const INITIAL_ISRO_SATELLITE: SatelliteUplinkInfo = {
  provider: 'ISRO_NAVIC_IRNSS',
  status: 'CONNECTED',
  signalDb: -72,
  signalPercent: 98,
  satellitesInView: 7,
  dopplerOffsetHz: 1240,
  lastPingTime: new Date().toISOString(),
}

export const useGpsSatelliteStore = create<GpsSatelliteState>((set, get) => ({
  isTracking: true,
  currentPosition: DEFAULT_INDIAN_GPS_POINT,
  satelliteUplink: INITIAL_ISRO_SATELLITE,
  breadcrumbTrail: INITIAL_INDIAN_TRAIL,
  queuedPackets: [],
  watchId: null,
  showGpsTrailOnMap: true,

  toggleGpsTrailLayer: () => set((s) => ({ showGpsTrailOnMap: !s.showGpsTrailOnMap })),

  startGpsTracking: () => {
    if (get().watchId !== null) return

    if ('geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const newPoint: GpsPoint = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude || 216,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 14.2,
            heading: pos.coords.heading || 110,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date().toISOString(),
            signalType: 'ISRO_NAVIC',
          }
          set((state) => ({
            currentPosition: newPoint,
            breadcrumbTrail: [...state.breadcrumbTrail, newPoint],
            isTracking: true,
          }))
        },
        () => {
          set({ isTracking: true })
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
      set({ watchId: id as any, isTracking: true })
    } else {
      set({ isTracking: true })
    }
  },

  stopGpsTracking: () => {
    const id = get().watchId
    if (id !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(id)
    }
    set({ watchId: null, isTracking: false })
  },

  transmitSatellitePacket: (payloadType = 'SOS_BEACON_PING') => {
    const pos = get().currentPosition
    const packet: SatellitePacket = {
      id: `isro_pkt_${Date.now()}`,
      payloadType,
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude,
      sentAt: new Date().toISOString(),
      status: 'TRANSMITTING',
    }

    set((state) => ({
      queuedPackets: [packet, ...state.queuedPackets],
      satelliteUplink: {
        ...state.satelliteUplink,
        status: 'TRANSMITTING',
        lastPingTime: new Date().toISOString(),
      },
    }))

    setTimeout(() => {
      set((state) => ({
        queuedPackets: state.queuedPackets.map((p) => (p.id === packet.id ? { ...p, status: 'ACKNOWLEDGED_BY_SATELLITE' } : p)),
        satelliteUplink: { ...state.satelliteUplink, status: 'CONNECTED' },
      }))
    }, 1200)
  },

  exportGpxTrail: () => {
    const trail = get().breadcrumbTrail
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Resque.AI Bharat NavIC Satellite GPS Tracker">
  <trk>
    <name>NDMA India Telemetry Trail</name>
    <trkseg>
      ${trail
        .map(
          (pt) =>
            `<trkpt lat="${pt.latitude}" lon="${pt.longitude}"><ele>${pt.altitude}</ele><time>${pt.timestamp}</time></trkpt>`
        )
        .join('\n')}
    </trkseg>
  </trk>
</gpx>`

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bharat_navic_gps_trail_${Date.now()}.gpx`
    a.click()
    URL.revokeObjectURL(url)
  },
}))
