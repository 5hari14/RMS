import os

from fastapi import APIRouter, BackgroundTasks

from config import settings
from models.demand_forecast import DemandForecaster
from schemas.forecast import TrainingResponse, TrainingStatusResponse
from services.data_service import get_data_days_count

router = APIRouter(prefix="/api/v1/training", tags=["training"])

_training_status: dict[str, str] = {}


def _run_training(restaurant_id: str) -> None:
    _training_status[restaurant_id] = "training"
    try:
        forecaster = DemandForecaster(restaurant_id)
        forecaster.train()
        _training_status[restaurant_id] = "completed"
    except Exception as e:
        _training_status[restaurant_id] = f"failed: {e}"


@router.post("/trigger/{restaurant_id}", response_model=TrainingResponse)
async def trigger_training(restaurant_id: str, background_tasks: BackgroundTasks):
    current = _training_status.get(restaurant_id)
    if current == "training":
        return TrainingResponse(
            restaurant_id=restaurant_id,
            status="already_running",
            message="Training is already in progress for this restaurant",
        )

    background_tasks.add_task(_run_training, restaurant_id)
    _training_status[restaurant_id] = "queued"

    return TrainingResponse(
        restaurant_id=restaurant_id,
        status="started",
        message="Model training has been queued",
    )


@router.get("/status/{restaurant_id}", response_model=TrainingStatusResponse)
async def get_training_status(restaurant_id: str):
    data_days = get_data_days_count(restaurant_id)

    forecaster = DemandForecaster(restaurant_id)
    model_dir = os.path.join(settings.model_storage_path, restaurant_id)

    return TrainingStatusResponse(
        restaurant_id=restaurant_id,
        strategy=forecaster.strategy,
        data_days=data_days,
        has_prophet_model=os.path.exists(os.path.join(model_dir, "prophet.pkl")),
        has_xgboost_model=os.path.exists(os.path.join(model_dir, "xgboost.pkl")),
    )
