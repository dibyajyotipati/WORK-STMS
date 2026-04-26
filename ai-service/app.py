"""
STMS AI Microservice
--------------------
Provides:
  - POST /route/estimate  : source/destination → distance_km, duration_min
  - POST /predict/fuel    : distance + vehicle → fuel litres & cost
  - GET  /health          : liveness probe

Routing strategies:
  - heuristic (default): geocodes city names via Nominatim then great-circle distance.
  - osrm: uses OSRM for real routing (requires OSRM_URL).

The fuel model is a scikit-learn RandomForest, auto-trained on first run.
"""

import os
import math
import logging
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model import load_model, predict_fuel

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("stms-ai")

MAPS_PROVIDER = os.getenv("MAPS_PROVIDER", "heuristic").lower()
OSRM_URL = os.getenv("OSRM_URL", "https://router.project-osrm.org")
FUEL_PRICE = float(os.getenv("FUEL_PRICE_PER_LITRE", "100"))

# In-memory geocode cache
_geocode_cache: dict[str, tuple[float, float]] = {}

# Will hold loaded ML model
_state: dict = {}


# ───────────────────────────── Schemas ─────────────────────────────

class RouteRequest(BaseModel):
    source: str = Field(..., min_length=2, description="Source city/address")
    destination: str = Field(..., min_length=2, description="Destination city/address")


class RouteResponse(BaseModel):
    source: str
    destination: str
    distance_km: float
    duration_min: float
    provider: str
    source_coords: Optional[dict] = None
    destination_coords: Optional[dict] = None


class FuelRequest(BaseModel):
    distance_km: float = Field(..., gt=0)
    vehicle_type: str
    mileage_kmpl: Optional[float] = None
    load_kg: Optional[float] = 0


class FuelResponse(BaseModel):
    fuel_litres: float
    fuel_cost: float
    price_per_litre: float
    vehicle_type: str


# ───────────────────────── Geocoding & Routing ─────────────────────────

async def _geocode(place: str) -> tuple[float, float]:
    """Resolve a place name to (lat, lon). Uses Nominatim (OpenStreetMap)."""
    key = place.strip().lower()
    if key in _geocode_cache:
        return _geocode_cache[key]

    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            r = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": place, "format": "json", "limit": 1},
                headers={"User-Agent": "STMS-AI/1.0"},
            )
            r.raise_for_status()
            data = r.json()
            if not data:
                raise HTTPException(404, f"Location not found: {place}")
            coords = (float(data[0]["lat"]), float(data[0]["lon"]))
            _geocode_cache[key] = coords
            return coords
        except httpx.RequestError as e:
            log.warning("Geocoding error for '%s': %s", place, e)
            raise HTTPException(502, f"Geocoding service unavailable: {e}")


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance in km."""
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


async def _osrm_route(src: tuple[float, float], dst: tuple[float, float]) -> tuple[float, float]:
    url = f"{OSRM_URL}/route/v1/driving/{src[1]},{src[0]};{dst[1]},{dst[0]}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get(url, params={"overview": "false"})
        r.raise_for_status()
        data = r.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(502, "OSRM returned no route")
        route = data["routes"][0]
        return route["distance"] / 1000.0, route["duration"] / 60.0


async def estimate_route(source: str, destination: str) -> dict:
    src = await _geocode(source)
    dst = await _geocode(destination)

    if MAPS_PROVIDER == "osrm":
        try:
            distance_km, duration_min = await _osrm_route(src, dst)
            provider = "osrm"
        except Exception as e:
            log.warning("OSRM failed, falling back to heuristic: %s", e)
            distance_km = _haversine_km(src, dst) * 1.3  # road factor
            duration_min = (distance_km / 45.0) * 60
            provider = "heuristic_fallback"
    else:
        # Heuristic: great-circle × 1.3 road-winding factor, assume 45 km/h avg
        distance_km = _haversine_km(src, dst) * 1.3
        duration_min = (distance_km / 45.0) * 60
        provider = "heuristic"

    return {
        "source": source,
        "destination": destination,
        "distance_km": round(distance_km, 2),
        "duration_min": round(duration_min, 1),
        "provider": provider,
        "source_coords": {"lat": src[0], "lng": src[1]},
        "destination_coords": {"lat": dst[0], "lng": dst[1]},
    }


# ───────────────────────── Lifespan: load model ─────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Loading ML model…")
    _state["model"] = load_model()
    log.info("Model ready.")
    yield
    _state.clear()


app = FastAPI(
    title="STMS AI Service",
    description="Route + fuel prediction microservice for STMS",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────────────── Routes ─────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": "model" in _state,
        "maps_provider": MAPS_PROVIDER,
    }


@app.post("/route/estimate", response_model=RouteResponse)
async def route_estimate(req: RouteRequest):
    result = await estimate_route(req.source, req.destination)
    return result


@app.post("/predict/fuel", response_model=FuelResponse)
async def fuel_predict(req: FuelRequest):
    model = _state.get("model")
    if model is None:
        raise HTTPException(503, "Model not loaded")

    fuel = predict_fuel(
        model,
        distance_km=req.distance_km,
        vehicle_type=req.vehicle_type,
        mileage_kmpl=req.mileage_kmpl,
        load_kg=req.load_kg or 0,
    )
    return {
        "fuel_litres": round(fuel, 2),
        "fuel_cost": round(fuel * FUEL_PRICE, 2),
        "price_per_litre": FUEL_PRICE,
        "vehicle_type": req.vehicle_type,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app:app", host=host, port=port)
