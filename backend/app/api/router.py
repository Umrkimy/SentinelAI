from fastapi import APIRouter

from backend.app.api.routes import equipment, health, predictions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(predictions.router)
api_router.include_router(equipment.router)
