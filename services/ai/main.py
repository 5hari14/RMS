from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.forecast import router as forecast_router
from routers.training import router as training_router

app = FastAPI(
    title="Bites RMS AI Service",
    version="0.1.0",
    description="ML predictions for restaurant demand and revenue forecasting",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)
app.include_router(training_router)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
