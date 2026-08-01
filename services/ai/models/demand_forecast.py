import logging
import os
import pickle
from datetime import date, timedelta

import numpy as np
import pandas as pd

from config import settings
from services.data_service import (
    get_daily_covers,
    get_data_days_count,
    get_day_of_week_averages,
    get_historical_covers,
    get_hourly_averages,
)

logger = logging.getLogger(__name__)

SERVICE_HOURS = list(range(11, 24))
HOUR_WEIGHTS = {
    11: 0.03, 12: 0.10, 13: 0.12, 14: 0.08, 15: 0.03,
    16: 0.02, 17: 0.05, 18: 0.10, 19: 0.14, 20: 0.14,
    21: 0.10, 22: 0.06, 23: 0.03,
}


class DemandForecaster:
    def __init__(self, restaurant_id: str):
        self.restaurant_id = restaurant_id
        self._prophet_model = None
        self._xgb_model = None
        self._data_days = 0

    @property
    def strategy(self) -> str:
        if self._data_days < 30:
            return "averages"
        if self._data_days < 180:
            return "prophet"
        return "ensemble"

    def _model_path(self, name: str) -> str:
        directory = os.path.join(settings.model_storage_path, self.restaurant_id)
        os.makedirs(directory, exist_ok=True)
        return os.path.join(directory, f"{name}.pkl")

    def train(self) -> dict:
        self._data_days = get_data_days_count(self.restaurant_id)
        strategy = self.strategy

        if strategy == "averages":
            return {"strategy": strategy, "status": "skipped", "reason": "insufficient data"}

        end = date.today() - timedelta(days=1)
        start = end - timedelta(days=max(365, self._data_days))
        daily = get_daily_covers(self.restaurant_id, start, end)

        if daily.empty:
            return {"strategy": strategy, "status": "skipped", "reason": "no data"}

        daily["ds"] = pd.to_datetime(daily["ds"])

        if strategy in ("prophet", "ensemble"):
            from prophet import Prophet

            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                changepoint_prior_scale=0.05,
            )
            model.fit(daily[["ds", "y"]])
            self._prophet_model = model
            with open(self._model_path("prophet"), "wb") as f:
                pickle.dump(model, f)

        if strategy == "ensemble":
            hist = get_historical_covers(self.restaurant_id, start, end)
            if not hist.empty:
                from xgboost import XGBRegressor

                features = hist[["hour", "day_of_week", "is_weekend", "is_holiday"]].values
                target = hist["covers"].values
                xgb = XGBRegressor(
                    n_estimators=100,
                    max_depth=4,
                    learning_rate=0.1,
                    random_state=42,
                )
                xgb.fit(features, target)
                self._xgb_model = xgb
                with open(self._model_path("xgboost"), "wb") as f:
                    pickle.dump(xgb, f)

        return {"strategy": strategy, "status": "trained", "data_days": self._data_days}

    def load(self) -> None:
        self._data_days = get_data_days_count(self.restaurant_id)

        prophet_path = self._model_path("prophet")
        if os.path.exists(prophet_path):
            with open(prophet_path, "rb") as f:
                self._prophet_model = pickle.load(f)

        xgb_path = self._model_path("xgboost")
        if os.path.exists(xgb_path):
            with open(xgb_path, "rb") as f:
                self._xgb_model = pickle.load(f)

    def predict_daily(self, target: date) -> dict:
        self.load()
        strategy = self.strategy

        if strategy == "averages":
            avgs = get_day_of_week_averages(self.restaurant_id)
            dow = target.weekday()
            pg_dow = (dow + 1) % 7
            row = avgs[avgs["day_of_week"] == pg_dow]
            predicted = float(row["avg_covers"].iloc[0]) if not row.empty else 0.0
            return {
                "date": target.isoformat(),
                "strategy": strategy,
                "predicted_covers": round(predicted),
                "confidence_low": round(predicted * 0.7),
                "confidence_high": round(predicted * 1.3),
            }

        if self._prophet_model is None:
            return self._fallback_daily(target)

        future = pd.DataFrame({"ds": [pd.Timestamp(target)]})
        forecast = self._prophet_model.predict(future)
        yhat = float(forecast["yhat"].iloc[0])
        yhat_lower = float(forecast["yhat_lower"].iloc[0])
        yhat_upper = float(forecast["yhat_upper"].iloc[0])

        predicted = max(0, yhat)

        if strategy == "ensemble" and self._xgb_model is not None:
            dow = target.weekday()
            is_weekend = 1 if dow >= 5 else 0
            hourly_preds = []
            for h in SERVICE_HOURS:
                feat = np.array([[h, dow, is_weekend, 0]])
                hourly_preds.append(float(self._xgb_model.predict(feat)[0]))
            xgb_total = sum(max(0, p) for p in hourly_preds)
            predicted = predicted * 0.6 + xgb_total * 0.4

        return {
            "date": target.isoformat(),
            "strategy": strategy,
            "predicted_covers": round(max(0, predicted)),
            "confidence_low": round(max(0, yhat_lower)),
            "confidence_high": round(max(0, yhat_upper)),
        }

    def predict_hourly(self, target: date) -> list[dict]:
        daily = self.predict_daily(target)
        total = daily["predicted_covers"]
        strategy = daily["strategy"]

        if strategy == "ensemble" and self._xgb_model is not None:
            dow = target.weekday()
            is_weekend = 1 if dow >= 5 else 0
            results = []
            for h in SERVICE_HOURS:
                feat = np.array([[h, dow, is_weekend, 0]])
                pred = max(0, float(self._xgb_model.predict(feat)[0]))
                results.append({"hour": h, "predicted_covers": round(pred), "strategy": strategy})
            return results

        if strategy == "averages":
            hourly_avgs = get_hourly_averages(self.restaurant_id)
            if not hourly_avgs.empty:
                results = []
                for h in SERVICE_HOURS:
                    row = hourly_avgs[hourly_avgs["hour"] == h]
                    avg = float(row["avg_covers"].iloc[0]) if not row.empty else 0.0
                    results.append({"hour": h, "predicted_covers": round(avg), "strategy": strategy})
                return results

        weight_total = sum(HOUR_WEIGHTS.values())
        results = []
        for h in SERVICE_HOURS:
            w = HOUR_WEIGHTS.get(h, 0)
            pred = round(total * w / weight_total) if weight_total > 0 else 0
            results.append({"hour": h, "predicted_covers": pred, "strategy": strategy})
        return results

    def predict_weekly(self, start: date) -> list[dict]:
        return [self.predict_daily(start + timedelta(days=i)) for i in range(7)]

    def _fallback_daily(self, target: date) -> dict:
        avgs = get_day_of_week_averages(self.restaurant_id)
        dow = target.weekday()
        pg_dow = (dow + 1) % 7
        row = avgs[avgs["day_of_week"] == pg_dow]
        predicted = float(row["avg_covers"].iloc[0]) if not row.empty else 0.0
        return {
            "date": target.isoformat(),
            "strategy": "fallback",
            "predicted_covers": round(predicted),
            "confidence_low": round(predicted * 0.7),
            "confidence_high": round(predicted * 1.3),
        }
