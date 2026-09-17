from fastapi import APIRouter

from backend.app.api.routes import assessments, documents, equipment, health, auth

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(assessments.router)
api_router.include_router(equipment.router)
api_router.include_router(documents.router)