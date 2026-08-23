import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import f1_score, roc_auc_score

from backend.app.ml.base import BaseHazardModel, PredictionResult
from backend.app.models.hazard_event import HazardType
from backend.app.config import settings


class FloodModel(BaseHazardModel):
    def __init__(self, model_version: str = "flood_v1.0"):
        super().__init__(HazardType.FLOOD, model_version)
        self.grid_resolution = settings.PREDICTION_GRID_RESOLUTION_DEG

    def prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        df = data.copy()

        df["api_7d"] = df["precipitation_mm"].rolling("7D", on="timestamp").sum()
        df["api_30d"] = df["precipitation_mm"].rolling("30D", on="timestamp").sum()
        df["api_90d"] = df["precipitation_mm"].rolling("90D", on="timestamp").sum()

        df["soil_moisture_pct"] = df["soil_moisture"].rank(pct=True)
        df["streamflow_pct"] = df["streamflow_cms"].rank(pct=True)

        df["qpf_24h"] = df["forecast_precip_24h"].fillna(0)
        df["qpf_48h"] = df["forecast_precip_48h"].fillna(0)
        df["qpf_72h"] = df["forecast_precip_72h"].fillna(0)

        df["hand"] = df["elevation_m"] - df["nearest_drain_elevation_m"]
        df["tw_index"] = np.log(df["flow_accumulation"] * np.tan(np.radians(df["slope_deg"])))

        df["target_inundation"] = (df["observed_depth_m"] > 0.3).astype(int)

        df = df.dropna()
        self.feature_names = [c for c in df.columns if not c.startswith("target_")]
        return df

    def train(self, X: pd.DataFrame, y: pd.Series, **kwargs) -> Dict[str, float]:
        feature_cols = [c for c in X.columns if c in self.feature_names]
        X = X[feature_cols]

        tscv = TimeSeriesSplit(n_splits=5)
        f1s = []
        aucs = []

        params = {
            "objective": "binary",
            "metric": "auc",
            "boosting_type": "gbdt",
            "num_leaves": 64,
            "learning_rate": 0.05,
            "n_estimators": 500,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            "n_jobs": -1,
            "class_weight": "balanced",
        }
        params.update(kwargs.get("lgb_params", {}))

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            model = lgb.LGBMClassifier(**params)
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                early_stopping_rounds=50,
                verbose=False,
            )

            y_pred = model.predict(X_val)
            y_pred_proba = model.predict_proba(X_val)[:, 1]
            f1s.append(f1_score(y_val, y_pred))
            aucs.append(roc_auc_score(y_val, y_pred_proba))

        self.model = lgb.LGBMClassifier(**params)
        self.model.fit(X, y)
        self.is_trained = True

        metrics = {
            "cv_f1_mean": np.mean(f1s),
            "cv_f1_std": np.std(f1s),
            "cv_auc_mean": np.mean(aucs),
            "cv_auc_std": np.std(aucs),
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
        return self.model.predict_proba(X)[:, 1]

    def predict_watershed(
        self,
        watershed_data: pd.DataFrame,
    ) -> List[PredictionResult]:
        if not self.is_trained:
            raise ValueError("Model not trained")

        features = watershed_data[self.feature_names]
        probabilities = self.predict_proba(features)

        results = []
        for idx, (_, row) in enumerate(watershed_data.iterrows()):
            prob = float(probabilities[idx])
            severity = self._prob_to_severity(prob)

            results.append(PredictionResult(
                geometry=row["geometry"],
                probability=prob,
                expected_severity=severity,
                confidence_lower=max(0, prob - 0.15),
                confidence_upper=min(1, prob + 0.15),
                feature_importance=self._get_feature_importance(),
                metadata={
                    "watershed_id": row.get("watershed_id"),
                    "model_version": self.model_version,
                }
            ))

        return results

    def _prob_to_severity(self, prob: float) -> str:
        if prob >= settings.FLOOD_WARNING_PROBABILITY:
            return "CRITICAL"
        elif prob >= settings.FLOOD_WATCH_PROBABILITY:
            return "HIGH"
        elif prob >= 0.2:
            return "MEDIUM"
        else:
            return "LOW"

    def _get_feature_importance(self) -> Dict[str, float]:
        if self.model is None:
            return {}
        importance = self.model.feature_importances_
        return dict(zip(self.feature_names, importance.tolist()))