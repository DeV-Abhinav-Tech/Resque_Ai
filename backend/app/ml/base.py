import abc
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import mlflow
import joblib
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.models.prediction import ModelVersion, HazardType


@dataclass
class PredictionResult:
    geometry: Dict[str, Any]
    probability: float
    expected_severity: str
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    feature_importance: Optional[Dict[str, float]] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseHazardModel(abc.ABC):
    def __init__(self, hazard_type: HazardType, model_version: str):
        self.hazard_type = hazard_type
        self.model_version = model_version
        self.model = None
        self.feature_names: List[str] = []
        self.is_trained = False

    @abc.abstractmethod
    def prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        pass

    @abc.abstractmethod
    def train(self, X: pd.DataFrame, y: pd.Series, **kwargs) -> Dict[str, float]:
        pass

    @abc.abstractmethod
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        pass

    @abc.abstractmethod
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        pass

    def save(self, path: Path) -> None:
        artifact = {
            "model": self.model,
            "feature_names": self.feature_names,
            "model_version": self.model_version,
            "hazard_type": self.hazard_type.value,
            "saved_at": datetime.utcnow().isoformat(),
        }
        joblib.dump(artifact, path)

    def load(self, path: Path) -> None:
        artifact = joblib.load(path)
        self.model = artifact["model"]
        self.feature_names = artifact["feature_names"]
        self.model_version = artifact["model_version"]
        self.is_trained = True

    def log_to_mlflow(self, metrics: Dict[str, float], params: Dict[str, Any], artifact_path: str) -> str:
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
        mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)

        with mlflow.start_run() as run:
            mlflow.log_params(params)
            mlflow.log_metrics(metrics)
            mlflow.log_artifact(artifact_path)

            model_info = mlflow.register_model(
                f"runs:/{run.info.run_id}/model",
                f"{self.hazard_type.value}_model",
            )

            return model_info.version


class ModelRegistry:
    def __init__(self):
        self._models: Dict[str, BaseHazardModel] = {}

    def register(self, hazard_type: HazardType, model: BaseHazardModel) -> None:
        key = f"{hazard_type.value}_{model.model_version}"
        self._models[key] = model

    def get(self, hazard_type: HazardType, version: Optional[str] = None) -> Optional[BaseHazardModel]:
        if version:
            key = f"{hazard_type.value}_{version}"
            return self._models.get(key)
        for key, model in self._models.items():
            if key.startswith(f"{hazard_type.value}_"):
                return model
        return None

    def get_production(self, hazard_type: HazardType) -> Optional[BaseHazardModel]:
        for model in self._models.values():
            if hasattr(model, "is_production") and model.is_production:
                if model.hazard_type == hazard_type:
                    return model
        return None


model_registry = ModelRegistry()


class ModelLoader:
    @staticmethod
    async def load_production_model(hazard_type: HazardType) -> BaseHazardModel:
        from backend.app.database import AsyncSessionLocal
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(ModelVersion)
                .where(ModelVersion.hazard_type == hazard_type)
                .where(ModelVersion.is_production == True)
                .order_by(ModelVersion.deployed_at.desc())
            )
            mv = result.scalar_one_or_none()

            if not mv:
                raise ValueError(f"No production model found for {hazard_type.value}")

            model_class = ModelLoader._get_model_class(hazard_type)
            model = model_class(hazard_type, mv.version)
            model.load(Path(mv.artifact_uri))
            return model

    @staticmethod
    def _get_model_class(hazard_type: HazardType):
        if hazard_type == HazardType.EARTHQUAKE:
            from backend.app.ml.earthquake import EarthquakeModel
            return EarthquakeModel
        elif hazard_type == HazardType.FLOOD:
            from backend.app.ml.flood import FloodModel
            return FloodModel
        elif hazard_type == HazardType.HURRICANE:
            from backend.app.ml.hurricane import HurricaneModel
            return HurricaneModel
        raise ValueError(f"No model class for {hazard_type.value}")