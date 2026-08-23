@echo off
REM Resque.AI Startup Script for Windows

echo 🚀 Starting Resque.AI Disaster Management Platform

REM Check if .env exists
if not exist .env (
    echo 📝 Creating .env from template...
    copy .env.example .env
    echo ⚠️  Please edit .env with your API keys before continuing
    echo    Required: SECRET_KEY (min 32 chars)
    echo    Optional: OPENWEATHER_API_KEY, WEATHERAPI_KEY, NASA_FIRMS_KEY, MAPBOX_TOKEN
    pause
)

REM Check if Docker engine is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Docker daemon is not running. Launching Docker Desktop...
    if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
        start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
    ) else (
        start "" "Docker Desktop"
    )
    echo ⏳ Waiting for Docker engine to initialize...
    timeout /t 15 /nobreak >nul
)

REM Start services with Docker Compose
echo 🐳 Starting Docker services...
docker-compose up -d

REM Wait for services to be healthy
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check backend health
echo 🏥 Checking backend health...
for /l %%i in (1,1,30) do (
    curl -s http://localhost:8000/api/v1/health >nul 2>&1
    if not errorlevel 1 (
        echo ✅ Backend is healthy
        goto :migrations
    )
    echo    Waiting for backend... (%%i/30)
    timeout /t 2 /nobreak >nul
)
echo ❌ Backend health check failed
exit /b 1

:migrations
REM Run database migrations
echo 🗄️ Running database migrations...
docker-compose exec -T backend alembic upgrade head

echo.
echo 🎉 Resque.AI is ready!
echo.
echo 📍 Access points:
echo    • Dashboard:      http://localhost:3000
echo    • API Docs:       http://localhost:8000/docs
echo    • API Health:     http://localhost:8000/api/v1/health
echo    • MLflow:         http://localhost:5000
echo    • MinIO Console:  http://localhost:9001 (minioadmin/minioadmin)
echo    • Flower:         http://localhost:5555
echo.
echo 🔑 Demo credentials:
echo    • Email:    demo@resque.ai
echo    • Password: demo123456
echo    • API Key:  rsk_demo_key_123 (add to X-API-Key header)
echo.
echo 📚 Next steps:
echo    1. Open http://localhost:3000 in your browser
echo    2. Sign in with demo credentials
echo    3. Explore the hazard map, alerts, and historical data
echo    4. Try the prediction APIs at http://localhost:8000/docs
echo.
echo 🛑 To stop: docker-compose down
echo 🗑️  To reset: docker-compose down -v
echo.
pause