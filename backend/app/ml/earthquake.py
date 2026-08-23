import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score, brier_score_loss, precision_recall_curve
from sklearn.calibration import CalibratedClassifierCV

from backend.app.ml.base import BaseHazardModel, PredictionResult
from backend.app.models.hazard_event import HazardType
from backend.app.config import settings


class EarthquakeModel(BaseHazardModel):
    def __init__(self, model_version: str = "eq_v1.0"):
        super().__init__(HazardType.EARTHQUAKE, model_version)
        self.grid_resolution = settings.PREDICTION_GRID_RESOLUTION_DEG
        self.time_horizons = [7, 30]
        self.magnitude_thresholds = [5.0, 6.0, 7.0]
        self.calibrator = None

    def prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()

        df["time_since_last_eq"] = df["timestamp"].diff().dt.total_seconds() / 86400
        df["rolling_rate_7d"] = df["magnitude"].rolling("7D", on="timestamp").count()
        df["rolling_rate_30d"] = df["magnitude"].rolling("30D", on="timestamp").count()
        df["rolling_max_mag_30d"] = df["magnitude"].rolling("30D", on="timestamp").max()
        df["rolling_mean_mag_30d"] = df["magnitude"].rolling("30D", on="timestamp").mean()
        df["b_value"] = self._compute_b_value(df["magnitude"])

        for horizon in self.time_horizons:
            for mag_thresh in self.magnitude_thresholds:
                df[f"target_m{mag_thresh}_{horizon}d"] = self._create_target(
                    df, horizon, mag_thresh
                )

        df = df.dropna()
        self.feature_names = [c for c in df.columns if not c.startswith("target_")]
        return df

    def _compute_b_value(self, magnitudes: pd.Series, window: int = 100) -> pd.Series:
        def calc_b(mags):
            if len(mags) < 10:
                return 1.0
            m_min = mags.min()
            return np.log10(np.e) / (mags.mean() - m_min)

        return magnitudes.rolling(window, min_periods=10).apply(calc_b, raw=True)

    def _create_target(self, df: pd.DataFrame, horizon_days: int, mag_threshold: float) -> pd.Series:
        target = pd.Series(0, index=df.index, dtype=int)
        for idx, row in df.iterrows():
            future = df[
                (df["timestamp"] > row["timestamp"]) &
                (df["timestamp"] <= row["timestamp"] + timedelta(days=horizon_days)) &
                (df["magnitude"] >= mag_threshold)
            ]
            if len(future) > 0:
                target[idx] = 1
        return target

    def train(self, X: pd.DataFrame, y: pd.Series, **kwargs) -> Dict[str, float]:
        feature_cols = [c for c in X.columns if c in self.feature_names]
        X = X[feature_cols]

        tscv = TimeSeriesSplit(n_splits=5)
        aucs = []
        briers = []

        params = {
            "objective": "binary:logistic",
            "eval_metric": "auc",
            "scale_pos_weight": (y == 0).sum() / (y == 1).sum(),
            "max_depth": 6,
            "learning_rate": 0.1,
            "n_estimators": 500,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            "n_jobs": -1,
        }
        params.update(kwargs.get("xgb_params", {}))

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            model = xgb.XGBClassifier(**params)
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                early_stopping_rounds=50,
                verbose=False,
            )

            y_pred_proba = model.predict_proba(X_val)[:, 1]
            aucs.append(roc_auc_score(y_val, y_pred_proba))
            briers.append(brier_score_loss(y_val, y_pred_proba))

        self.model = xgb.XGBClassifier(**params)
        self.model.fit(X, y)
        self.is_trained = True

        self.calibrator = CalibratedClassifierCV(self.model, method="isotonic", cv=3)
        self.calibrator.fit(X, y)

        metrics = {
            "cv_auc_mean": np.mean(aucs),
            "cv_auc_std": np.std(aucs),
            "cv_brier_mean": np.mean(briers),
            "cv_brier_std": np.std(briers),
            "n_samples": len(X),
            "n_features": len(feature_cols),
            "pos_rate": y.mean(),
        }

        return metrics

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained")
        feature_cols = [c for c in X.columns if c in self.feature_names]
        X = X[feature_cols]
        return self.model.predict(X)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained")
        feature_cols = [c for c in X.columns if c in self.feature_names]
        X = X[feature_cols]
        if self.calibrator:
            return self.calibrator.predict_proba(X)[:, 1]
        return self.model.predict_proba(X)[:, 1]

    def predict_grid(
        self,
        grid_data: pd.DataFrame,
        lat: float,
        lon: float,
        radius_km: float = 100,
        time_horizon_days: int = 7,
    ) -> List[PredictionResult]:
        if not self.is_trained:
            raise ValueError("Model not trained")

        grid_data = grid_data.copy()
        grid_data["dist_km"] = self._haversine_vectorized(
            grid_data["latitude"], grid_data["longitude"], lat, lon
        )
        grid_data = grid_data[grid_data["dist_km"] <= radius_km]

        features = grid_data[self.feature_names]
        probabilities = self.predict_proba(features)

        results = []
        for idx, (_, row) in enumerate(grid_data.iterrows()):
            prob = float(probabilities[idx])
            severity = self._prob_to_severity(prob)

            results.append(PredictionResult(
                geometry={
                    "type": "Point",
                    "coordinates": [row["longitude"], row["latitude"]],
                },
                probability=prob,
                expected_severity=severity,
                confidence_lower=max(0, prob - 0.1),
                confidence_upper=min(1, prob + 0.1),
                feature_importance=self._get_feature_importance(),
                metadata={
                    "grid_id": row.get("grid_id", f"cell_{idx}"),
                    "distance_km": row["dist_km"],
                    "model_version": self.model_version,
                }
            ))

        return results

    def _prob_to_severity(self, prob: float) -> str:
        if prob >= settings.EQ_WARNING_PROBABILITY:
            return "CRITICAL"
        elif prob >= settings.EQ_WATCH_PROBABILITY:
            return "HIGH"
        elif prob >= 0.05:
            return "MEDIUM"
        else:
            return "LOW"

    def _get_feature_importance(self) -> Dict[str, float]:
        if self.model is None:
            return {}
        importance = self.model.feature_importances_
        return dict(zip(self.feature_names, importance.tolist()))

    def _haversine_vectorized(
        self, lat1: pd.Series, lon1: pd.Series, lat2: float, lon2: float
    ) -> pd.Series:
        R = 6371
        lat1_rad = np.radians(lat1)
        lon1_rad = np.radians(lon1)
        lat2_rad = np.radians(lat2)
        lon2_rad = np.radians(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = np.sin(dlat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        return R * c