import math
import os
from collections import defaultdict
from datetime import date, timedelta

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, HTTPException

# Requirement 11 — GET /forecast/demand?federationId=&days=7
#
# Model: simple moving average over a trailing SMA_WINDOW_DAYS window of
# real booking history (queried directly from Postgres — not synthetic
# data regenerated in Python; Part K's "using synthetic seed data" is
# satisfied by the fact that the *seed data itself* is synthetic, seeded
# once by backend/prisma/seed.ts). The daily average from that window is
# projected flat across the next `days` days per service category — the
# simplest legitimate reading of "simple moving average forecast".
#
# GAP: this couples the ai-service directly to the Postgres schema
# (DATABASE_URL + raw SQL against Booking/Service/Worker/Society table
# names), which cuts against Part C's "kept isolated and scoped" framing
# for the AI service. The alternative — having the Node backend query
# Prisma and POST the aggregated history to a schema-agnostic ai-service
# endpoint — would preserve isolation but deviates from Part K's literal
# "ai-service implementing GET /forecast/demand" contract. Direct DB
# access was chosen to match that contract; flagged as a trade-off worth
# revisiting if true service isolation matters more than endpoint shape.
router = APIRouter()

HISTORY_WINDOW_DAYS = 60
SMA_WINDOW_DAYS = 14
# Assumed jobs one worker can complete per day — not derived from any real
# capacity data (none is modeled in the schema), just a stated constant so
# "recommended worker allocation" has a concrete, explainable basis.
WORKER_DAILY_CAPACITY = 2


def get_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")
    return psycopg2.connect(database_url)


@router.get("/demand")
def get_demand_forecast(federationId: str, days: int = 7):
    query = f"""
        SELECT s.category AS service_category,
               DATE(b."scheduledAt") AS booking_date,
               COUNT(*) AS booking_count
        FROM "Booking" b
        JOIN "Service" s ON b."serviceId" = s.id
        JOIN "Worker" w ON b."workerId" = w.id
        JOIN "Society" soc ON w."societyId" = soc.id
        WHERE soc."federationId" = %s
          AND b."scheduledAt" >= NOW() - INTERVAL '{HISTORY_WINDOW_DAYS} days'
          AND b."scheduledAt" <= NOW()
        GROUP BY s.category, DATE(b."scheduledAt")
    """

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, (federationId,))
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return {"federationId": federationId, "days": days, "forecast": []}

    by_category: dict[str, dict[date, int]] = defaultdict(dict)
    for row in rows:
        by_category[row["service_category"]][row["booking_date"]] = row["booking_count"]

    today = date.today()
    window_start = today - timedelta(days=SMA_WINDOW_DAYS)

    forecast = []
    for category, counts_by_date in by_category.items():
        window_total = sum(
            counts_by_date.get(window_start + timedelta(days=i), 0)
            for i in range(SMA_WINDOW_DAYS)
        )
        daily_avg = window_total / SMA_WINDOW_DAYS
        predicted_bookings = round(daily_avg * days)
        recommended_workers = (
            math.ceil(daily_avg / WORKER_DAILY_CAPACITY) if daily_avg > 0 else 0
        )

        forecast.append(
            {
                "serviceCategory": category,
                "predictedBookings": predicted_bookings,
                "recommendedWorkers": recommended_workers,
            }
        )

    forecast.sort(key=lambda f: f["predictedBookings"], reverse=True)

    return {"federationId": federationId, "days": days, "forecast": forecast}
