import { api } from '@/lib/api'

export interface RealtimeEarthquake {
  id: string
  title: string
  magnitude: number
  place: string
  latitude: number
  longitude: number
  depth_km: number
  timestamp: number
  url: string
  hazard_type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  is_south_asia: boolean
}

export interface RealtimeCityWeather {
  city: string
  region: string
  latitude: number
  longitude: number
  temperature_c: number
  humidity_pct: number
  wind_speed_kmh: number
  wind_gusts_kmh: number
  rainfall_mm: number
  weather_code: number
  cyclone_warning: boolean
}

export interface NasaEonetEvent {
  id: string
  title: string
  category: string
  latitude: number
  longitude: number
  date: string
  source_link: string
}

export interface AirQualityData {
  city: string
  aqi: number
  pm2_5: number
  pm10: number
  dust: number
  so2: number
}

export const fetchLiveEarthquakes = async (): Promise<RealtimeEarthquake[]> => {
  try {
    const res = await api.get('/realtime/earthquakes?region_only=false')
    if (res.data && res.data.events) {
      return res.data.events
    }
  } catch (error) {
    console.warn('Backend proxy offline, fetching directly from USGS API...')
  }

  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
    const geojson = await response.json()
    const features = geojson.features || []

    return features.map((feat: any) => {
      const props = feat.properties || {}
      const coords = feat.geometry?.coordinates || [0, 0, 0]
      const lon = coords[0]
      const lat = coords[1]
      const isSouthAsia = lat >= 5.0 && lat <= 38.0 && lon >= 60.0 && lon <= 100.0

      return {
        id: feat.id,
        title: props.title,
        magnitude: props.mag,
        place: props.place,
        latitude: lat,
        longitude: lon,
        depth_km: coords[2],
        timestamp: props.time,
        url: props.url,
        hazard_type: 'EARTHQUAKE',
        severity: (props.mag || 0) >= 5.5 ? 'CRITICAL' : (props.mag || 0) >= 4.0 ? 'HIGH' : 'MEDIUM',
        is_south_asia: isSouthAsia,
      } as RealtimeEarthquake
    })
  } catch {
    return []
  }
}

export const fetchLiveWeather = async (): Promise<RealtimeCityWeather[]> => {
  try {
    const res = await api.get('/realtime/weather')
    if (res.data && res.data.cities) {
      return res.data.cities
    }
  } catch (error) {
    console.warn('Backend proxy offline, fetching directly from Open-Meteo API...')
  }

  const INDIAN_CITIES = [
    { name: 'New Delhi', lat: 28.6139, lon: 77.2090, region: 'North India / NCR' },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777, region: 'Arabian Sea Coast' },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639, region: 'Bay of Bengal Delta' },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707, region: 'Coromandel Coast' },
    { name: 'Puri', lat: 19.8135, lon: 85.8312, region: 'Odisha Cyclone Belt' },
    { name: 'Guwahati', lat: 26.1445, lon: 91.7362, region: 'Assam Brahmaputra Valley' },
  ]

  try {
    const results = await Promise.all(
      INDIAN_CITIES.map(async (c) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,rain`
        const res = await fetch(url)
        const json = await res.json()
        const cur = json.current || {}
        return {
          city: c.name,
          region: c.region,
          latitude: c.lat,
          longitude: c.lon,
          temperature_c: cur.temperature_2m,
          humidity_pct: cur.relative_humidity_2m,
          wind_speed_kmh: cur.wind_speed_10m,
          wind_gusts_kmh: cur.wind_gusts_10m,
          rainfall_mm: cur.rain || 0,
          weather_code: 0,
          cyclone_warning: (cur.wind_gusts_10m || 0) >= 60.0,
        } as RealtimeCityWeather
      })
    )
    return results
  } catch {
    return []
  }
}

export const fetchNasaEonetEvents = async (): Promise<NasaEonetEvent[]> => {
  try {
    const res = await api.get('/realtime/nasa-eonet')
    if (res.data && res.data.events) {
      return res.data.events
    }
  } catch (error) {
    console.warn('Backend proxy offline, fetching directly from NASA EONET API...')
  }

  try {
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v2.1/events?limit=15&status=open')
    const json = await response.json()
    const events = json.events || []
    return events.map((ev: any) => {
      const cat = ev.categories?.[0]?.title || 'Natural Event'
      const geom = ev.geometries?.[ev.geometries.length - 1] || {}
      const coords = geom.coordinates || [0, 0]
      return {
        id: ev.id,
        title: ev.title,
        category: cat,
        latitude: coords[1] || 0,
        longitude: coords[0] || 0,
        date: geom.date,
        source_link: ev.link,
      } as NasaEonetEvent
    })
  } catch {
    return []
  }
}

export const fetchAirQualityData = async (): Promise<AirQualityData[]> => {
  try {
    const res = await api.get('/realtime/air-quality')
    if (res.data && res.data.air_quality) {
      return res.data.air_quality
    }
  } catch {
    // fallback
  }
  return []
}
