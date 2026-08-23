CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS resque;

CREATE TABLE resque.data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(255),
    rate_limit_rpm INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{}',
    last_fetched_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    consecutive_failures INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resque.hazard_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    source VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    properties JSONB DEFAULT '{}',
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, external_id)
) PARTITION BY RANGE (timestamp);

CREATE INDEX ix_hazard_events_hazard_type ON resque.hazard_events (hazard_type);
CREATE INDEX ix_hazard_events_timestamp ON resque.hazard_events (timestamp);
CREATE INDEX ix_hazard_events_source ON resque.hazard_events (source);
CREATE INDEX ix_hazard_events_geometry ON resque.hazard_events USING GIST (geometry);
CREATE INDEX ix_hazard_events_hazard_type_timestamp ON resque.hazard_events (hazard_type, timestamp);

DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', NOW()) - INTERVAL '2 years';
    end_date DATE := start_date + INTERVAL '1 month';
    partition_name TEXT;
BEGIN
    WHILE start_date < NOW() + INTERVAL '3 months' LOOP
        partition_name := 'hazard_events_' || TO_CHAR(start_date, 'YYYY_MM');
        EXECUTE format('CREATE TABLE IF NOT EXISTS resque.%I PARTITION OF resque.hazard_events FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
        start_date := end_date;
        end_date := end_date + INTERVAL '1 month';
    END LOOP;
END $$;

CREATE TABLE resque.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_type VARCHAR(50) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
    valid_time_start TIMESTAMPTZ NOT NULL,
    valid_time_end TIMESTAMPTZ NOT NULL,
    probability DOUBLE PRECISION NOT NULL,
    expected_severity VARCHAR(20) NOT NULL,
    confidence_lower DOUBLE PRECISION,
    confidence_upper DOUBLE PRECISION,
    feature_importance JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'COMPLETED',
    source_event_id UUID REFERENCES resque.hazard_events(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_predictions_hazard_type ON resque.predictions (hazard_type);
CREATE INDEX ix_predictions_model_version ON resque.predictions (model_version);
CREATE INDEX ix_predictions_valid_time ON resque.predictions (valid_time_start, valid_time_end);
CREATE INDEX ix_predictions_geometry ON resque.predictions USING GIST (geometry);

CREATE TABLE resque.model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_type VARCHAR(50) NOT NULL,
    version VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    framework VARCHAR(50) NOT NULL,
    training_data_start TIMESTAMPTZ NOT NULL,
    training_data_end TIMESTAMPTZ NOT NULL,
    metrics JSONB DEFAULT '{}',
    hyperparameters JSONB DEFAULT '{}',
    artifact_uri VARCHAR(500) NOT NULL,
    is_production BOOLEAN DEFAULT FALSE,
    is_staging BOOLEAN DEFAULT FALSE,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    UNIQUE(hazard_type, version)
);

CREATE TABLE resque.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    certainty VARCHAR(20) DEFAULT 'LIKELY',
    urgency VARCHAR(20) DEFAULT 'EXPECTED',
    geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
    effective TIMESTAMPTZ NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    headline VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    instruction TEXT,
    source_predictions UUID[],
    source_events UUID[],
    cap_event VARCHAR(100),
    cap_category VARCHAR(50),
    cap_response_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    acknowledged_by UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_alerts_hazard_type ON resque.alerts (hazard_type);
CREATE INDEX ix_alerts_severity ON resque.alerts (severity);
CREATE INDEX ix_alerts_status ON resque.alerts (status);
CREATE INDEX ix_alerts_effective ON resque.alerts (effective);
CREATE INDEX ix_alerts_expires ON resque.alerts (expires);
CREATE INDEX ix_alerts_geometry ON resque.alerts USING GIST (geometry);

CREATE TABLE resque.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255),
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'PUBLIC',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resque.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES resque.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    rate_limit_rpm INTEGER DEFAULT 100,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_api_keys_user_id ON resque.api_keys (user_id);
CREATE INDEX ix_api_keys_key_prefix ON resque.api_keys (key_prefix);

CREATE TABLE resque.alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES resque.users(id) ON DELETE CASCADE,
    hazard_types VARCHAR(50)[] DEFAULT '{}',
    min_severity VARCHAR(20) DEFAULT 'WATCH',
    geometry GEOMETRY(GEOMETRY, 4326),
    notify_email BOOLEAN DEFAULT TRUE,
    notify_sms BOOLEAN DEFAULT FALSE,
    notify_push BOOLEAN DEFAULT TRUE,
    notify_webhook BOOLEAN DEFAULT FALSE,
    webhook_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_alert_subscriptions_user_id ON resque.alert_subscriptions (user_id);

CREATE TABLE resque.ingestion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES resque.data_sources(id),
    status VARCHAR(20) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX ix_ingestion_logs_data_source ON resque.ingestion_logs (data_source_id);
CREATE INDEX ix_ingestion_logs_started_at ON resque.ingestion_logs (started_at);

INSERT INTO resque.data_sources (name, source_type, base_url, rate_limit_rpm) VALUES
('USGS Earthquakes', 'USGS', 'https://earthquake.usgs.gov', 60),
('NOAA NWS Alerts', 'NOAA_NWS', 'https://api.weather.gov', 100),
('FEMA Declarations', 'FEMA', 'https://www.fema.gov/api/open', 60),
('OpenWeather', 'OPENWEATHER', 'https://api.openweathermap.org/data/2.5', 60),
('WeatherAPI', 'WEATHERAPI', 'http://api.weatherapi.com/v1', 60),
('NASA FIRMS', 'NASA_FIRMS', 'https://firms.modaps.eosdis.nasa.gov/api', 30)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION resque.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON resque.data_sources
    FOR EACH ROW EXECUTE FUNCTION resque.update_updated_at_column();

CREATE TRIGGER update_hazard_events_updated_at BEFORE UPDATE ON resque.hazard_events
    FOR EACH ROW EXECUTE FUNCTION resque.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON resque.alerts
    FOR EACH ROW EXECUTE FUNCTION resque.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON resque.users
    FOR EACH ROW EXECUTE FUNCTION resque.update_updated_at_column();

CREATE TRIGGER update_alert_subscriptions_updated_at BEFORE UPDATE ON resque.alert_subscriptions
    FOR EACH ROW EXECUTE FUNCTION resque.update_updated_at_column();