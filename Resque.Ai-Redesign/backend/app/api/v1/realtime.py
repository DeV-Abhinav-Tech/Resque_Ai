import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any

router = APIRouter(prefix="/realtime", tags=["realtime"])

USGS_ALL_DAY_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
NASA_EONET_URL = "https://eonet.gsfc.nasa.gov/api/v2.1/events"

INDIAN_CITIES = [
  {"name": "New Delhi", "lat": 28.6139, "lon": 77.2090, "region": "North India / NCR"},
  {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777, "region": "Arabian Sea Coast"},
  {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639, "region": "Bay of Bengal Delta"},
  {"name": "Chennai", "lat": 13.0827, "lon": 80.2707, "region": "Coromandel Coast"},
  {"name": "Puri", "lat": 19.8135, "lon": 85.8312, "region": "Odisha Cyclone Belt"},
  {"name": "Guwahati", "lat": 26.1445, "lon": 91.7362, "region": "Assam Brahmaputra Valley"},
  {"name": "Dehradun", "lat": 30.3165, "lon": 78.0322, "region": "Himalayan Seismic Zone"},
]

@router.get("/earthquakes")
async def get_live_earthquakes(region_only: bool = Query(True, description="Filter for Indian Subcontinent & South Asia region")):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(USGS_ALL_DAY_URL)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch live USGS data")
            
            geojson = response.json()
            features = geojson.get("features", [])
            
            parsed_events = []
            for feat in features:
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})
                coords = geom.get("coordinates", [0, 0, 0])
                lon, lat, depth = coords[0], coords[1], coords[2]

                is_in_south_asia = (5.0 <= lat <= 38.0) and (60.0 <= lon <= 100.0)

                if not region_only or is_in_south_asia:
                    parsed_events.append({
                        "id": feat.get("id"),
                        "title": props.get("title"),
                        "magnitude": props.get("mag"),
                        "place": props.get("place"),
                        "latitude": lat,
                        "longitude": lon,
                        "depth_km": depth,
                        "timestamp": props.get("time"),
                        "url": props.get("url"),
                        "hazard_type": "EARTHQUAKE",
                        "severity": "CRITICAL" if (props.get("mag") or 0) >= 5.5 else ("HIGH" if (props.get("mag") or 0) >= 4.0 else "MEDIUM"),
                        "is_south_asia": is_in_south_asia
                    })
            
            return {
                "source": "USGS Real-Time GeoJSON Feed",
                "count": len(parsed_events),
                "region_filtered": region_only,
                "events": parsed_events
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing USGS live feed: {str(e)}")

@router.get("/weather")
async def get_live_indian_weather():
    try:
        city_weather_results = []
        async with httpx.AsyncClient(timeout=10.0) as client:
            for city in INDIAN_CITIES:
                params = {
                    "latitude": city["lat"],
                    "longitude": city["lon"],
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
                }
                res = await client.get(OPEN_METEO_URL, params=params)
                if res.status_code == 200:
                    data = res.json().get("current", {})
                    city_weather_results.append({
                        "city": city["name"],
                        "region": city["region"],
                        "latitude": city["lat"],
                        "longitude": city["lon"],
                        "temperature_c": data.get("temperature_2m"),
                        "humidity_pct": data.get("relative_humidity_2m"),
                        "wind_speed_kmh": data.get("wind_speed_10m"),
                        "wind_gusts_kmh": data.get("wind_gusts_10m"),
                        "rainfall_mm": data.get("rain", 0),
                        "weather_code": data.get("weather_code"),
                        "cyclone_warning": (data.get("wind_gusts_10m") or 0) >= 60.0
                    })

        return {
            "source": "Open-Meteo Real-Time Weather API",
            "country": "India",
            "count": len(city_weather_results),
            "cities": city_weather_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Open-Meteo live data: {str(e)}")

@router.get("/nasa-eonet")
async def get_nasa_eonet_events():
    """
    Fetch authentic real-time natural events (wildfires, storms, volcanoes) from NASA EONET.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{NASA_EONET_URL}?limit=20&status=open")
            if res.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch NASA EONET data")
            
            data = res.json()
            events = data.get("events", [])
            
            parsed_nasa = []
            for ev in events:
                categories = ev.get("categories", [{}])
                cat_title = categories[0].get("title", "Natural Event") if categories else "Natural Event"
                geometries = ev.get("geometries", [{}])
                latest_geom = geometries[-1] if geometries else {}
                coords = latest_geom.get("coordinates", [0, 0])
                
                # Check if coordinates are 2D lat/lon
                lon = coords[0] if len(coords) > 0 else 0
                lat = coords[1] if len(coords) > 1 else 0

                parsed_nasa.append({
                    "id": ev.get("id"),
                    "title": ev.get("title"),
                    "category": cat_title,
                    "latitude": lat,
                    "longitude": lon,
                    "date": latest_geom.get("date"),
                    "source_link": ev.get("link")
                })
            
            return {
                "source": "NASA EONET (Earth Observatory Natural Event Tracker)",
                "count": len(parsed_nasa),
                "events": parsed_nasa
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching NASA EONET: {str(e)}")

@router.get("/air-quality")
async def get_indian_air_quality():
    """
    Fetch authentic real-time Air Quality Index (AQI, PM2.5, PM10) from Open-Meteo Air Quality API.
    """
    try:
        results = []
        async with httpx.AsyncClient(timeout=10.0) as client:
            for city in INDIAN_CITIES[:4]:
                params = {
                    "latitude": city["lat"],
                    "longitude": city["lon"],
                    "current": "us_aqi,pm2_5,pm10,dust,sulphur_dioxide"
                }
                res = await client.get(OPEN_METEO_AQ_URL, params=params)
                if res.status_code == 200:
                    cur = res.json().get("current", {})
                    results.append({
                        "city": city["name"],
                        "aqi": cur.get("us_aqi"),
                        "pm2_5": cur.get("pm2_5"),
                        "pm10": cur.get("pm10"),
                        "dust": cur.get("dust"),
                        "so2": cur.get("sulphur_dioxide")
                    })
        return {
            "source": "Open-Meteo Air Quality & Pollution API",
            "count": len(results),
            "air_quality": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Air Quality data: {str(e)}")
