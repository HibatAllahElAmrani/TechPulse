"""
OSS Pulse — AI Service
Microservice de prédiction de séries temporelles (stars).
Phase 4 du cahier des charges.

Endpoints:
  GET  /health              → health check
  POST /predict             → predict stars at J+7, J+30, J+90 for a project
  POST /anomaly             → detect anomalies in a metric series
  POST /health-score        → compute a composite project health score
"""
import os
from datetime import datetime, timedelta
from typing import List, Optional

import pandas as pd
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Prophet is heavy — import lazily inside predict endpoint
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://osspulse:osspulse_dev_password@postgres:5432/osspulse")

app = FastAPI(
    title="OSS Pulse AI Service",
    version="0.1.0",
    description="Prediction & anomaly detection microservice",
)


# ---------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------
class PredictRequest(BaseModel):
    project_id: str
    horizons: List[int] = [7, 30, 90]


class ForecastPoint(BaseModel):
    date: str
    yhat: float
    yhat_lower: float
    yhat_upper: float


class PredictResponse(BaseModel):
    project_id: str
    model: str = "prophet"
    history_days: int
    forecasts: List[ForecastPoint]
    mape: Optional[float] = None


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def get_conn():
    return psycopg2.connect(DATABASE_URL)


def load_history(project_id: str, days: int = 90) -> pd.DataFrame:
    """Load `stars` history from TimescaleDB for the given project."""
    sql = """
        SELECT date_trunc('day', time) AS day, MAX(stars) AS stars
        FROM metrics_snapshots
        WHERE project_id = %s
          AND time > NOW() - INTERVAL '%s days'
        GROUP BY day
        ORDER BY day ASC;
    """
    with get_conn() as conn:
        df = pd.read_sql(sql, conn, params=(project_id, days))
    df = df.rename(columns={"day": "ds", "stars": "y"})
    df["ds"] = pd.to_datetime(df["ds"]).dt.tz_localize(None)
    return df


# ---------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service", "timestamp": datetime.utcnow().isoformat()}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Train a Prophet model on the project's last 90 days of stars
    and return predictions at the requested horizons.
    """
    df = load_history(req.project_id, days=90)

    if len(df) < 7:
        raise HTTPException(
            status_code=422,
            detail=f"Not enough history to train (need >= 7 days, got {len(df)}). "
            "Wait for more data collection cycles.",
        )

    # Lazy import — Prophet bootstraps slowly
    from prophet import Prophet

    model = Prophet(
        seasonality_mode="multiplicative",
        changepoint_prior_scale=0.05,
        weekly_seasonality=True,
        daily_seasonality=False,
    )
    model.fit(df)

    max_horizon = max(req.horizons)
    future = model.make_future_dataframe(periods=max_horizon)
    forecast = model.predict(future)

    # Extract only the requested horizon dates
    last_date = df["ds"].max()
    forecasts: List[ForecastPoint] = []
    for h in req.horizons:
        target = last_date + timedelta(days=h)
        # find closest row
        row = forecast.iloc[(forecast["ds"] - target).abs().argsort()[:1]].iloc[0]
        forecasts.append(
            ForecastPoint(
                date=row["ds"].strftime("%Y-%m-%d"),
                yhat=float(row["yhat"]),
                yhat_lower=float(row["yhat_lower"]),
                yhat_upper=float(row["yhat_upper"]),
            )
        )

    return PredictResponse(
        project_id=req.project_id,
        history_days=len(df),
        forecasts=forecasts,
    )


@app.post("/anomaly")
def detect_anomaly(req: PredictRequest):
    """
    Detect simple anomalies via Z-score on the stars series.
    Returns days where |z| > 3.
    """
    df = load_history(req.project_id, days=90)
    if len(df) < 14:
        return {"project_id": req.project_id, "anomalies": []}

    df["delta"] = df["y"].diff()
    mean = df["delta"].mean()
    std = df["delta"].std() or 1
    df["z"] = (df["delta"] - mean) / std
    anomalies = df[df["z"].abs() > 3]
    return {
        "project_id": req.project_id,
        "anomalies": [
            {"date": row["ds"].strftime("%Y-%m-%d"), "delta": float(row["delta"]), "z": float(row["z"])}
            for _, row in anomalies.iterrows()
        ],
    }


@app.post("/health-score")
def health_score(req: PredictRequest):
    """
    Composite 0-100 project health score (placeholder formula).
    To be replaced with a proper ML classifier in Phase 5.
    """
    df = load_history(req.project_id, days=30)
    if df.empty:
        return {"project_id": req.project_id, "score": None, "reason": "no_data"}

    growth = (df["y"].iloc[-1] - df["y"].iloc[0]) / max(df["y"].iloc[0], 1)
    score = max(0, min(100, int(50 + growth * 100)))
    return {"project_id": req.project_id, "score": score, "growth_rate_30d": float(growth)}
