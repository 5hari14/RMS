from pydantic import BaseModel


class HourlyForecast(BaseModel):
    hour: int
    predicted_covers: int
    strategy: str


class DailyForecastResponse(BaseModel):
    date: str
    strategy: str
    predicted_covers: int
    confidence_low: int
    confidence_high: int


class HourlyForecastResponse(BaseModel):
    date: str
    hours: list[HourlyForecast]


class WeeklyForecastResponse(BaseModel):
    start_date: str
    days: list[DailyForecastResponse]
    total_predicted_covers: int


class RevenueForecastResponse(BaseModel):
    date: str
    predicted_covers: int
    average_spend: float
    predicted_revenue: float
    revenue_low: float
    revenue_high: float
    strategy: str


class WeeklyRevenueResponse(BaseModel):
    start_date: str
    days: list[RevenueForecastResponse]
    total_predicted_revenue: float


class TrainingResponse(BaseModel):
    restaurant_id: str
    status: str
    message: str


class TrainingStatusResponse(BaseModel):
    restaurant_id: str
    strategy: str
    data_days: int
    has_prophet_model: bool
    has_xgboost_model: bool


class HealthResponse(BaseModel):
    status: str
    version: str
