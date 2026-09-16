from fastapi import FastAPI

from backend.app.api.router import api_router


app = FastAPI(title="SentinelAI API", version="0.1.0")
app.include_router(api_router)
