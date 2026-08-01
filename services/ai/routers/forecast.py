from datetime import date

from fastapi import APIRouter, Query

from models.demand_forecast import DemandForecaster
from models.revenue_forecast import RevenueForecaster
from schemas.forecast import (
    DailyForecastResponse,
    HourlyForecastResponse,
    RevenueForecastResponse,
    WeeklyForecastResponse,
    WeeklyRevenueResponse,
)

router = APIRouter(prefix="/api/v1/forecast", tags=["forecast"])


@router.get("/daily/{restaurant_id}", response_model=DailyForecastResponse)
async def get_daily_forecast(
    restaurant_id: str,
    target_date: date = Query(alias="date", default=None),
):
    target = target_date or date.today()
    forecaster = DemandForecaster(restaurant_id)
    return forecaster.predict_daily(target)


@router.get("/hourly/{restaurant_id}", response_model=HourlyForecastResponse)
async def get_hourly_forecast(
    restaurant_id: str,
    target_date: date = Query(alias="date", default=None),
):
    target = target_date or date.today()
    forecaster = DemandForecaster(restaurant_id)
    hours = forecaster.predict_hourly(target)
    return HourlyForecastResponse(date=target.isoformat(), hours=hours)


@router.get("/weekly/{restaurant_id}", response_model=WeeklyForecastResponse)
async def get_weekly_forecast(
    restaurant_id: str,
    start_date: date = Query(alias="start_date", default=None),
):
    start = start_date or date.today()
    forecaster = DemandForecaster(restaurant_id)
    days = forecaster.predict_weekly(start)
    total = sum(d["predicted_covers"] for d in days)
    return WeeklyForecastResponse(
        start_date=start.isoformat(),
        days=days,
        total_predicted_covers=total,
    )


@router.get("/revenue/daily/{restaurant_id}", response_model=RevenueForecastResponse)
async def get_daily_revenue_forecast(
    restaurant_id: str,
    target_date: date = Query(alias="date", default=None),
):
    target = target_date or date.today()
    forecaster = RevenueForecaster(restaurant_id)
    return forecaster.predict_daily(target)


@router.get("/revenue/weekly/{restaurant_id}", response_model=WeeklyRevenueResponse)
async def get_weekly_revenue_forecast(
    restaurant_id: str,
    start_date: date = Query(alias="start_date", default=None),
):
    start = start_date or date.today()
    forecaster = RevenueForecaster(restaurant_id)
    days = forecaster.predict_weekly(start)
    total = sum(d["predicted_revenue"] for d in days)
    return WeeklyRevenueResponse(
        start_date=start.isoformat(),
        days=days,
        total_predicted_revenue=round(total, 2),
    )
