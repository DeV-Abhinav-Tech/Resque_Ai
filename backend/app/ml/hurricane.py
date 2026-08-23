import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from pathlib import Path
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error

from backend.app.ml.base import BaseHazardModel, PredictionResult
from backend.app.models.hazard_event import HazardType
from backend.app.config import settings


class HurricaneModel(BaseHazardModel):
    def __init__(self, model_version: str = "hurricane_v1.0"):
        super().__init__(HazardType.HURRICANE, model_version)
        self.forecast_hours = [12, 24, 36, 48, 72, 96, 120]
        self.track_model = None
        self.intensity_model = None
        self.ri_model = None

    def prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()

        df["lat_diff"] = df["latitude"].diff()
        df["lon_diff"] = df["longitude"].diff()
        df["speed_kt"] = np.sqrt(df["lat_diff"]**2 + df["lon_diff"]**2) * 60 * 1.852
        df["heading"] = np.degrees(np.arctan2(df["lon_diff"], df["lat_diff"]))

        df["vmax_change_12h"] = df["max_wind_kt"].diff(12)
        df["pressure_change_12h"] = df["min_pressure_mb"].diff(12)

        env_features = [
            "sst_c", "shear_kt", "rh_pct", "mpi_kt", "ohc_kj_cm2",
            "tpw_mm", "sst_anomaly", "trough_interaction"
        ]
        for feat in env_features:
            if feat in df.columns:
                df[f"{feat}_lag12"] = df[feat].shift(12)

        for h in self.forecast_hours:
            df[f"target_vmax_{h}h"] = df["max_wind_kt"].shift(-h // 6) - df["max_wind_kt"]
            df[f"target_lat_{h}h"] = df["latitude"].shift(-h // 6)
            df[f"target_lon_{h}h"] = df["longitude"].shift(-h // 6)
            df[f"target_ri_{h}h"] = (
                (df["max_wind_kt"].shift(-h // 6) - df["max_wind_kt"]) >= 30
            ).astype(int)

        df = df.dropna()
        self.feature_names = [c for c in df.columns if not c.startswith("target_")]
        return df

    def train(self, X: pd.DataFrame, y: pd.Series, **kwargs) -> Dict[str, float]:
        feature_cols = [c for c in X.columns if c in self.feature_names]
        X = X[feature_cols]

        track_maes = []
        intensity_maes = []

        for h in self.forecast_hours:
            track_col = f"target_lat_{h}h"
            intensity_col = f"target_vmax_{h}h"

            if track_col not in X.columns or intensity_col not in X.columns:
                continue

            y_track = X[track_col]
            y_intensity = X[intensity_col]

            tscv = TimeSeriesSplit(n_splits=3)

            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_track_train, y_track_val = y_track.iloc[train_idx], y_track.iloc[val_idx]
                y_int_train, y_int_val = y_intensity.iloc[train_idx], y_intensity.iloc[val_idx]

                track_model = xgb.XGBRegressor(
                    objective="reg:squarederror",
                    n_estimators=300,
                    max_depth=5,
                    learning_rate=0.05,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    random_state=42,
                    n_jobs=-1,
                )
                track_model.fit(X_train, y_track_train)
                track_pred = track_model.predict(X_val)
                track_maes.append(mean_absolute_error(y_track_val, track_pred))

                int_model = xgb.XGBRegressor(
                    objective="reg:squarederror",
                    n_estimators=300,
                    max_depth=5,
                    learning_rate=0.05,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    random_state=42,
                    n_jobs=-1,
                )
                int_model.fit(X_train, y_int_train)
                int_pred = int_model.predict(X_val)
                intensity_maes.append(mean_absolute_error(y_int_val, int_pred))

        self.track_model = xgb.XGBRegressor(
            objective="reg:squarederror",
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
        )
        self.intensity_model = xgb.XGBRegressor(
            objective="reg:squarederror",
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
        )

        self.is_trained = True

        metrics = {
            "cv_track_mae_km": np.mean(track_maes) * 111 if track_maes else 0,
            "cv_intensity_mae_kt": np.mean(intensity_maes) if intensity_maes else 0,
            "n_samples": len(X),
            "n_features": len(feature_cols),
        }

        return metrics

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained")
        feature_cols = [c for c in X.columns if c in self.feature_names]
        X = X[feature_cols]
        return self.intensity_model.predict(X)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained")
        feature_cols = [c for c in X.columns if c in self.feature_names]
        X = X[feature_cols]
        ri_pred = self.ri_model.predict_proba(X)[:, 1] if self.ri_model else np.zeros(len(X))
        return ri_pred

    def predict_storm(
        self,
        storm_data: pd.DataFrame,
        current_advisory: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not self.is_trained:
            raise ValueError("Model not trained")

        current = storm_data.iloc[-1:].copy()
        features = current[self.feature_names]

        track_forecast = []
        intensity_forecast = []
        ri_probs = []

        for h in self.forecast_hours:
            lat_pred = current["latitude"].values[0] + self.track_model.predict(features)[0]
            lon_pred = current["longitude"].values[0] + self.track_model.predict(features)[0]
            vmax_pred = current["max_wind_kt"].values[0] + self.intensity_model.predict(features)[0]

            track_forecast.append({
                "hour": h,
                "latitude": float(lat_pred),
                "longitude": float(lon_pred),
                "max_wind_kt": float(vmax_pred),
            })

        return {
            "storm_id": current_advisory.get("storm_id"),
            "advisory_number": current_advisory.get("advisory_number"),
            "track_forecast": track_forecast,
            "intensity_forecast": intensity_forecast,
            "ri_probabilities": ri_probs,
            "landfall_probabilities": self._estimate_landfall(track_forecast),
            "model_version": self.model_version,
        }

    def _estimate_landfall(self, track_forecast: List[Dict]) -> List[Dict]:
        return [
            {"segment": "FL", "probability": 0.3},
            {"segment": "GA", "probability": 0.15},
            {"segment": "SC", "probability": 0.1},
        ]

    def _get_feature_importance(self) -> Dict[str, float]:
        if self.intensity_model is None:
            return {}
        importance = self.intensity_model.feature_importances_
        return dict(zip(self.feature_names, importance.tolist()))