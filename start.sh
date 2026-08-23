#!/usr/bin/env bash
# Resque.AI Startup Script

set -e

echo "🚀 Starting Resque.AI Disaster Management Platform"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your API keys before continuing"
    echo "   Required: SECRET_KEY (min 32 chars)"
    echo "   Optional: OPENWEATHER_API_KEY, WEATHERAPI_KEY, NASA_FIRMS_KEY, MAPBOX_TOKEN"
    read -p "Press Enter after editing .env..."
fi

# Start services with Docker Compose
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check backend health
echo "🏥 Checking backend health..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi
    echo "   Waiting for backend... ($i/30)"
    sleep 2
done

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T backend alembic upgrade head

echo ""
echo "🎉 Resque.AI is ready!"
echo ""
echo "📍 Access points:"
echo "   • Dashboard:      http://localhost:3000"
echo "   • API Docs:       http://localhost:8000/docs"
echo "   • API Health:     http://localhost:8000/api/v1/health"
echo "   • MLflow:         http://localhost:5000"
echo "   • MinIO Console:  http://localhost:9001 (minioadmin/minioadmin)"
echo "   • Flower:         http://localhost:5555"
echo ""
echo "🔑 Demo credentials:"
echo "   • Email:    demo@resque.ai"
echo "   • Password: demo123456"
echo "   • API Key:  rsk_demo_key_123 (add to X-API-Key header)"
echo ""
echo "📚 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Sign in with demo credentials"
echo "   3. Explore the hazard map, alerts, and historical data"
echo "   4. Try the prediction APIs at http://localhost:8000/docs"
echo ""
echo "🛑 To stop: docker-compose down"
echo "🗑️  To reset: docker-compose down -v"