"""
Fuel prediction ML model.

Trains a RandomForestRegressor on synthetic but realistic data and persists it.
Real deployments should retrain this on actual telemetry.

Features:
  - distance_km
  - vehicle_type (one-hot)
  - mileage_kmpl
  - load_kg
Target:
  - fuel consumption in litres
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

VEHICLE_TYPES = ["truck", "van", "mini_truck", "container", "tanker"]

# Base mileage (km/L) per vehicle type — used for data generation
BASE_MILEAGE = {
    "truck": 8,
    "van": 12,
    "mini_truck": 15,
    "container": 6,
    "tanker": 5,
}


def _generate_training_data(n: int = 3000, seed: int = 42):
    """Generate realistic synthetic dataset linking distance/load/type → fuel."""
    rng = np.random.default_rng(seed)

    rows = []
    for _ in range(n):
        vt = rng.choice(VEHICLE_TYPES)
        base = BASE_MILEAGE[vt]
        # Actual mileage has ±15% noise around the base
        mileage = max(3, rng.normal(base, base * 0.15))
        distance = float(rng.uniform(5, 1200))
        load = float(rng.uniform(0, 12000))

        # Fuel model:
        #   base_fuel = distance / mileage
        #   + load penalty: heavier load reduces effective mileage
        #   + small random noise
        load_penalty = 1 + (load / 20000)  # up to ~60% worse at max load
        effective_mileage = mileage / load_penalty
        fuel = distance / effective_mileage
        fuel *= rng.normal(1.0, 0.05)  # 5% real-world noise
        fuel = max(fuel, 0.1)

        rows.append(
            {
                "distance_km": distance,
                "vehicle_type": vt,
                "mileage_kmpl": mileage,
                "load_kg": load,
                "fuel_litres": fuel,
            }
        )
    return pd.DataFrame(rows)


def _build_pipeline() -> Pipeline:
    categorical = ["vehicle_type"]
    numeric = ["distance_km", "mileage_kmpl", "load_kg"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
            ("num", "passthrough", numeric),
        ]
    )

    pipeline = Pipeline(
        steps=[
            ("pre", preprocessor),
            (
                "reg",
                RandomForestRegressor(
                    n_estimators=120,
                    max_depth=14,
                    min_samples_leaf=3,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    return pipeline


def train_and_save() -> Pipeline:
    print("🧠 Training fuel prediction model...")
    df = _generate_training_data(n=3000)
    X = df[["distance_km", "vehicle_type", "mileage_kmpl", "load_kg"]]
    y = df["fuel_litres"]

    model = _build_pipeline()
    model.fit(X, y)

    score = model.score(X, y)
    print(f"✅ Model trained. R² on training set: {score:.3f}")

    joblib.dump(model, MODEL_PATH)
    print(f"💾 Model saved → {MODEL_PATH}")
    return model


def load_model() -> Pipeline:
    if os.path.exists(MODEL_PATH):
        try:
            return joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"⚠️  Could not load existing model ({e}); retraining")
    return train_and_save()


def predict_fuel(model: Pipeline, distance_km: float, vehicle_type: str,
                 mileage_kmpl: float = None, load_kg: float = 0) -> float:
    vt = vehicle_type if vehicle_type in VEHICLE_TYPES else "truck"
    mileage = mileage_kmpl if mileage_kmpl and mileage_kmpl > 0 else BASE_MILEAGE[vt]

    X = pd.DataFrame(
        [
            {
                "distance_km": float(distance_km),
                "vehicle_type": vt,
                "mileage_kmpl": float(mileage),
                "load_kg": float(load_kg or 0),
            }
        ]
    )
    pred = model.predict(X)[0]
    return float(max(pred, 0.1))


if __name__ == "__main__":
    train_and_save()
