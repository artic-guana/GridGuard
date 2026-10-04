"""
results_store.py — Persists evaluation results to MongoDB.

Two collections:
  consumer_scores  → one document per consumer
  dt_scores        → one document per distribution transformer

Both are overwritten (upsert) on every evaluation run.
"""
from datetime import datetime
import pandas as pd
from pymongo import MongoClient, ASCENDING, DESCENDING
from config import settings

client = MongoClient(settings.mongo_uri)
db = client[settings.mongo_db]

consumer_scores = db["consumer_scores"]
dt_scores       = db["dt_scores"]


# ------------------------------------------------------------
# Indexes — call once at startup
# ------------------------------------------------------------
def ensure_indexes():
    consumer_scores.create_index([("CONS_NO", ASCENDING)], unique=True)
    consumer_scores.create_index([("combined_score", DESCENDING)])
    consumer_scores.create_index([("predicted_flag", ASCENDING)])
    consumer_scores.create_index([("probable_cause", ASCENDING)])
    consumer_scores.create_index([("priority", ASCENDING)])

    dt_scores.create_index([("dt_id", ASCENDING)], unique=True)
    dt_scores.create_index([("dt_suspicion", DESCENDING)])
    dt_scores.create_index([("dt_priority", ASCENDING)])

    print("[results_store] indexes ensured")


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def _clean(value):
    """Convert NaN / NaT / numpy types into plain Python values."""
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if isinstance(value, (int, float, str, bool)):
        return value
    if hasattr(value, "item"):     # numpy scalar
        return value.item()
    return str(value)


def _row_to_doc(row: dict) -> dict:
    return {k: _clean(v) for k, v in row.items()}


# ------------------------------------------------------------
# Write consumer scores
# ------------------------------------------------------------
def save_consumer_scores(df: pd.DataFrame) -> int:
    if df is None or df.empty:
        print("[results_store] no consumer scores to save")
        return 0

    now = datetime.utcnow()
    written = 0

    for record in df.to_dict("records"):
        doc = _row_to_doc(record)
        doc["computed_at"] = now

        consumer_scores.update_one(
            {"CONS_NO": doc["CONS_NO"]},
            {"$set": doc},
            upsert=True,
        )
        written += 1

    print(f"[results_store] saved {written} consumer scores")
    return written


# ------------------------------------------------------------
# Write DT scores
# ------------------------------------------------------------
def save_dt_scores(df: pd.DataFrame) -> int:
    if df is None or df.empty:
        print("[results_store] no DT scores to save")
        return 0

    now = datetime.utcnow()
    written = 0

    for record in df.to_dict("records"):
        doc = _row_to_doc(record)
        doc["computed_at"] = now

        dt_scores.update_one(
            {"dt_id": doc["dt_id"]},
            {"$set": doc},
            upsert=True,
        )
        written += 1

    print(f"[results_store] saved {written} DT scores")
    return written


# ------------------------------------------------------------
# High-level: save everything from an evaluation result
# ------------------------------------------------------------
def save_evaluation(result: dict) -> dict:
    """
    result: the dict returned by evaluator.evaluate_all()
    Returns: { consumers_saved, dts_saved, saved_at }
    """
    if result is None:
        return {"consumers_saved": 0, "dts_saved": 0, "saved_at": None}

    n_consumers = save_consumer_scores(result.get("consumers"))
    n_dts       = save_dt_scores(result.get("dts"))

    return {
        "consumers_saved": n_consumers,
        "dts_saved":       n_dts,
        "saved_at":        datetime.utcnow().isoformat(),
    }


# ------------------------------------------------------------
# Read helpers — used by FastAPI endpoints
# ------------------------------------------------------------
def get_consumer_scores(limit: int = 500) -> list:
    return list(
        consumer_scores
        .find({}, {"_id": 0})
        .sort("combined_score", DESCENDING)
        .limit(limit)
    )


def get_consumer_score(cons_no: str) -> dict | None:
    return consumer_scores.find_one({"CONS_NO": cons_no}, {"_id": 0})


def get_dt_scores() -> list:
    return list(
        dt_scores
        .find({}, {"_id": 0})
        .sort("dt_suspicion", DESCENDING)
    )


def get_summary() -> dict:
    """Aggregate counts from the stored collections."""
    total_consumers   = consumer_scores.count_documents({})
    flagged_consumers = consumer_scores.count_documents({"predicted_flag": 1})
    total_dts         = dt_scores.count_documents({})
    suspicious_dts    = dt_scores.count_documents({"dt_priority": "P1"})

    cause_dist = {}
    for row in consumer_scores.aggregate([
        {"$group": {"_id": "$probable_cause", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]):
        if row["_id"]:
            cause_dist[row["_id"]] = row["count"]

    priority_dist = {}
    for row in consumer_scores.aggregate([
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]):
        if row["_id"]:
            priority_dist[row["_id"]] = row["count"]

    return {
        "total_consumers":       total_consumers,
        "flagged_consumers":     flagged_consumers,
        "total_dts":             total_dts,
        "suspicious_dts":        suspicious_dts,
        "cause_distribution":    cause_dist,
        "priority_distribution": priority_dist,
    }