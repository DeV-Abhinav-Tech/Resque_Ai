# Resque.AI - Disaster Management & Hazard Prediction System

A comprehensive, real-time disaster management platform that predicts natural hazards (earthquakes, floods, hurricanes) using AI/ML models trained on historical data, integrates real-time data from government APIs (NOAA, USGS, FEMA), weather services, and satellite/IoT sensors to provide early warnings and risk assessments.

## Features

### 🌍 Multi-Hazard Prediction
- **Earthquake**: Seismic risk modeling with magnitude probability forecasts
- **Flood**: Hydrological modeling with inundation probability and depth estimates
- **Hurricane**: Storm track, intensity, and landfall probability forecasting

### 📡 Real-Time Data Integration
- **USGS Earthquake Hazards Program**: Real-time feeds + historical catalog
- **NOAA NWS/NHC**: Weather alerts, hurricane advisories, forecasts
- **FEMA OpenFEMA**: Disaster declarations and historical incidents
- **OpenWeather / WeatherAPI**: Current conditions, forecasts, historical weather
- **NASA FIRMS**: Satellite fire/thermal anomaly detection
- **Custom Data**: CSV/JSON/Parquet upload support

### 🤖 AI/ML Pipeline
- XGBoost, LightGBM models for each hazard type
- MLflow experiment tracking and model versioning
- Automated retraining with drift detection
- Explainable predictions (SHAP feature importance)
- Confidence intervals and uncertainty quantification

### 🚨 Alert System
- CAP-compliant alert levels (Info/Watch/Warning/Emergency)
- Geotargeted alerts with polygon geometry
- Multi-channel notifications (Email, SMS, Push, Webhook)
- Alert deduplication and escalation

### 🗺️ Interactive Dashboard
- Real-time hazard map with risk heatmaps
- Historical event explorer with filtering
- Alert timeline and management
- Location-based risk profiles
- PWA with offline support

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local development)
- Node.js 20+ (for frontend development)

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Resque.Ai

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Access services:
# - API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - Dashboard: http://localhost:3000
# - MLflow: http://localhost:5000
# - MinIO Console: http://localhost:9001
# - Flower (Celery): http://localhost:5555
```

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env with your settings

# Run database migrations
alembic upgrade head

# Start API server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker (separate terminal)
celery -A backend.app.tasks.celery_app worker --loglevel=info

# Start Celery beat (separate terminal)
celery -A backend.app.tasks.celery_app beat --loglevel=info
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:3000
```

## API Documentation

### Prediction Endpoints

```bash
# Earthquake risk prediction
POST /api/v1/predict/earthquake
{
  "latitude": 34.05,
  "longitude": -118.25,
  "radius_km": 100,
  "time_horizon_days": 7
}

# Flood risk prediction
POST /api/v1/predict/flood
{
  "latitude": 34.05,
  "longitude": -118.25,
  "radius_km": 50,
  "time_horizon_hours": 48
}

# Hurricane prediction
POST /api/v1/predict/hurricane
{
  "storm_id": "AL092024"
}
# or
{
  "latitude": 25.0,
  "longitude": -80.0
}
```

### Data Endpoints

```bash
# Active alerts
GET /api/v1/alerts/active?hazard_type=EARTHQUAKE&severity=WARNING

# Historical events
GET /api/v1/historical?hazard_type=FLOOD&start_date=2024-01-01&limit=100

# Model information
GET /api/v1/models?hazard_type=EARTHQUAKE
```

### WebSocket
```bash
# Real-time monitoring stream
WS /api/v1/ws/monitoring
```

## Project Structure

```
Resque.Ai/
├── .planning/              # Project planning documents
│   ├── PROJECT.md          # Project overview and vision
│   ├── REQUIREMENTS.md     # Detailed requirements
│   └── ROADMAP.md          # Phase-based roadmap
├── backend/
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── ml/             # ML models
│   │   ├── data/           # Data ingestion
│   │   ├── tasks/          # Celery tasks
│   │   └── utils/          # Utilities
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   └── lib/            # Utilities
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Configuration

Key environment variables (see `.env.example`):

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | No* |
| `WEATHERAPI_KEY` | WeatherAPI.com key | No* |
| `NASA_FIRMS_KEY` | NASA FIRMS API key | No* |
| `SECRET_KEY` | JWT signing key (min 32 chars) | Yes |
| `MAPBOX_TOKEN` | Mapbox access token | No* |

*At least one weather API key recommended for full functionality.

## ML Model Training

```bash
# Train earthquake model
python -m backend.app.ml.train_earthquake

# Train flood model
python -m backend.app.ml.train_flood

# Train hurricane model
python -m backend.app.ml.train_hurricane

# Or trigger via Celery
celery -A backend.app.tasks.celery_app call backend.app.tasks.ml_training.retrain_all_models
```

## Testing

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=backend.app

# Frontend tests
cd frontend
npm run test
```

## Deployment

### Kubernetes (Production)

```bash
# Build and push images
docker build -t resque/backend:latest ./backend
docker build -t resque/frontend:latest ./frontend
docker push resque/backend:latest
docker push resque/frontend:latest

# Apply manifests
kubectl apply -f k8s/
```

### Helm (Recommended for Production)

```bash
helm install resque ./helm/resque \
  --set postgresql.enabled=true \
  --set redis.enabled=true \
  --set kafka.enabled=true
```

## Monitoring

- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001` (admin/admin)
- **MLflow**: `http://localhost:5000`
- **Flower**: `http://localhost:5555`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- USGS Earthquake Hazards Program
- NOAA National Weather Service
- FEMA OpenFEMA
- OpenWeatherMap
- WeatherAPI.com
- NASA FIRMS
- OpenStreetMap contributors