from datetime import date, timedelta

import pandas as pd
from sqlalchemy import create_engine, text

from config import settings

_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(settings.database_url)
    return _engine


def get_historical_covers(
    restaurant_id: str,
    start_date: date,
    end_date: date,
) -> pd.DataFrame:
    query = text("""
        SELECT
            DATE("date") AS date,
            EXTRACT(HOUR FROM "time") AS hour,
            SUM("partySize") AS covers,
            EXTRACT(DOW FROM "date") AS day_of_week,
            CASE WHEN EXTRACT(DOW FROM "date") IN (0, 6) THEN 1 ELSE 0 END AS is_weekend
        FROM "Reservation"
        WHERE "restaurantId" = :restaurant_id
          AND "status" IN ('CONFIRMED', 'SEATED', 'COMPLETED')
          AND DATE("date") BETWEEN :start_date AND :end_date
        GROUP BY DATE("date"), EXTRACT(HOUR FROM "time"), EXTRACT(DOW FROM "date")
        ORDER BY date, hour
    """)
    with _get_engine().connect() as conn:
        df = pd.read_sql(
            query,
            conn,
            params={
                "restaurant_id": restaurant_id,
                "start_date": start_date,
                "end_date": end_date,
            },
        )
    if df.empty:
        return pd.DataFrame(
            columns=["date", "hour", "covers", "day_of_week", "is_weekend"]
        )
    df["is_holiday"] = 0
    return df


def get_daily_covers(
    restaurant_id: str,
    start_date: date,
    end_date: date,
) -> pd.DataFrame:
    query = text("""
        SELECT
            DATE("date") AS ds,
            SUM("partySize") AS y
        FROM "Reservation"
        WHERE "restaurantId" = :restaurant_id
          AND "status" IN ('CONFIRMED', 'SEATED', 'COMPLETED')
          AND DATE("date") BETWEEN :start_date AND :end_date
        GROUP BY DATE("date")
        ORDER BY ds
    """)
    with _get_engine().connect() as conn:
        df = pd.read_sql(
            query,
            conn,
            params={
                "restaurant_id": restaurant_id,
                "start_date": start_date,
                "end_date": end_date,
            },
        )
    return df


def get_reservation_data(restaurant_id: str, target_date: date) -> dict:
    query = text("""
        SELECT
            COUNT(*) AS reservation_count,
            COALESCE(SUM("partySize"), 0) AS confirmed_covers
        FROM "Reservation"
        WHERE "restaurantId" = :restaurant_id
          AND DATE("date") = :target_date
          AND "status" IN ('CONFIRMED', 'SEATED')
    """)
    with _get_engine().connect() as conn:
        row = conn.execute(
            query,
            {"restaurant_id": restaurant_id, "target_date": target_date},
        ).fetchone()
    if row is None:
        return {"reservation_count": 0, "confirmed_covers": 0}
    return {
        "reservation_count": int(row[0]),
        "confirmed_covers": int(row[1]),
    }


def get_average_spend(restaurant_id: str, days: int = 90) -> float:
    cutoff = date.today() - timedelta(days=days)
    query = text("""
        SELECT
            COALESCE(AVG(d."amount"), 0) AS avg_spend
        FROM "Deposit" d
        JOIN "Reservation" r ON d."reservationId" = r."id"
        WHERE r."restaurantId" = :restaurant_id
          AND d."status" = 'CAPTURED'
          AND d."type" = 'deposit'
          AND DATE(r."date") >= :cutoff
    """)
    with _get_engine().connect() as conn:
        row = conn.execute(
            query,
            {"restaurant_id": restaurant_id, "cutoff": cutoff},
        ).fetchone()
    if row is None or row[0] is None:
        return 0.0
    return float(row[0]) / 100.0


def get_data_days_count(restaurant_id: str) -> int:
    query = text("""
        SELECT COUNT(DISTINCT DATE("date")) AS day_count
        FROM "Reservation"
        WHERE "restaurantId" = :restaurant_id
          AND "status" IN ('CONFIRMED', 'SEATED', 'COMPLETED')
    """)
    with _get_engine().connect() as conn:
        row = conn.execute(
            query, {"restaurant_id": restaurant_id}
        ).fetchone()
    return int(row[0]) if row else 0


def get_day_of_week_averages(restaurant_id: str) -> pd.DataFrame:
    query = text("""
        SELECT
            EXTRACT(DOW FROM "date") AS day_of_week,
            AVG(daily_covers) AS avg_covers
        FROM (
            SELECT DATE("date") AS "date", SUM("partySize") AS daily_covers
            FROM "Reservation"
            WHERE "restaurantId" = :restaurant_id
              AND "status" IN ('CONFIRMED', 'SEATED', 'COMPLETED')
            GROUP BY DATE("date")
        ) sub
        GROUP BY EXTRACT(DOW FROM "date")
        ORDER BY day_of_week
    """)
    with _get_engine().connect() as conn:
        df = pd.read_sql(query, conn, params={"restaurant_id": restaurant_id})
    return df


def get_hourly_averages(restaurant_id: str) -> pd.DataFrame:
    query = text("""
        SELECT
            EXTRACT(HOUR FROM "time") AS hour,
            AVG(hourly_covers) AS avg_covers
        FROM (
            SELECT DATE("date"), EXTRACT(HOUR FROM "time") AS "time",
                   SUM("partySize") AS hourly_covers
            FROM "Reservation"
            WHERE "restaurantId" = :restaurant_id
              AND "status" IN ('CONFIRMED', 'SEATED', 'COMPLETED')
            GROUP BY DATE("date"), EXTRACT(HOUR FROM "time")
        ) sub
        GROUP BY EXTRACT(HOUR FROM "time")
        ORDER BY hour
    """)
    with _get_engine().connect() as conn:
        df = pd.read_sql(query, conn, params={"restaurant_id": restaurant_id})
    return df
