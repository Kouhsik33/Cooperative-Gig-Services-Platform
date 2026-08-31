from dotenv import load_dotenv
from fastapi import FastAPI

from app.routers import forecast

load_dotenv()

# Part H — AI demand forecasting microservice. GET /forecast/demand queries
# Postgres directly (see forecast.py for why) — kept otherwise isolated and
# scoped to that one endpoint per Part E.

app = FastAPI(title="SIH26089 AI Forecasting Service")

app.include_router(forecast.router, prefix="/forecast", tags=["forecast"])


@app.get("/health")
def health():
    return {"status": "ok"}
