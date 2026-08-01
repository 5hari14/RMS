from datetime import date, timedelta

from models.demand_forecast import DemandForecaster
from services.data_service import get_average_spend


class RevenueForecaster:
    def __init__(self, restaurant_id: str):
        self.restaurant_id = restaurant_id
        self._demand = DemandForecaster(restaurant_id)

    def predict_daily(self, target: date) -> dict:
        demand = self._demand.predict_daily(target)
        avg_spend = get_average_spend(self.restaurant_id)
        covers = demand["predicted_covers"]
        return {
            "date": target.isoformat(),
            "predicted_covers": covers,
            "average_spend": round(avg_spend, 2),
            "predicted_revenue": round(covers * avg_spend, 2),
            "revenue_low": round(demand["confidence_low"] * avg_spend, 2),
            "revenue_high": round(demand["confidence_high"] * avg_spend, 2),
            "strategy": demand["strategy"],
        }

    def predict_weekly(self, start: date) -> list[dict]:
        return [self.predict_daily(start + timedelta(days=i)) for i in range(7)]
