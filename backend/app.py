from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
import json
import pandas as pd

from config import settings
from evaluator import evaluate_all
from schemas import (
    FullEvaluationResponse, ConsumerScore, ConsumerDetail,
    DTScore, TransformerBundle,
)


# ------------------------------------------------------------
# MongoDB
# ------------------------------------------------------------
client = MongoClient(settings.mongo_uri)
db = client[settings.mongo_db]
readings_coll   = db["readings"]
consumer_scores = db["consumer_scores"]
dt_scores       = db["dt_scores"]


# ------------------------------------------------------------
# Indexes — created once at startup
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

    print("[startup] indexes ensured")


# ------------------------------------------------------------
# Scheduler — runs evaluate_all every 7 days
# ------------------------------------------------------------
scheduler = BackgroundScheduler(timezone="UTC")


def _clean_value(v):
    """Convert NaN / numpy types to plain Python."""
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    if hasattr(v, "item"):
        return v.item()
    return v


def _run_evaluation_job():
    """Compute scores and persist to MongoDB collections."""
    started = datetime.utcnow()
    try:
        result = evaluate_all()
        if result is None:
            print(f"[scheduler] {started} — no data")
            return

        consumers = result["consumers"]
        dts       = result["dts"]
        now       = datetime.utcnow()

        n_consumers = 0
        n_dts       = 0

        if not consumers.empty:
            for rec in consumers.to_dict("records"):
                doc = {k: _clean_value(v) for k, v in rec.items()}
                doc["computed_at"] = now
                consumer_scores.update_one(
                    {"CONS_NO": doc["CONS_NO"]},
                    {"$set": doc},
                    upsert=True,
                )
                n_consumers += 1

        if not dts.empty:
            for rec in dts.to_dict("records"):
                doc = {k: _clean_value(v) for k, v in rec.items()}
                doc["computed_at"] = now
                dt_scores.update_one(
                    {"dt_id": doc["dt_id"]},
                    {"$set": doc},
                    upsert=True,
                )
                n_dts += 1

        elapsed = (datetime.utcnow() - started).total_seconds()
        print(f"[scheduler] {now} — saved {n_consumers} consumers, "
              f"{n_dts} DTs in {elapsed:.1f}s")

    except Exception as e:
        import traceback
        print(f"[scheduler] error: {e}")
        traceback.print_exc()


# ------------------------------------------------------------
# Lifespan — startup + shutdown
# ------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure indexes
    ensure_indexes()

    # 2. Schedule weekly job
    scheduler.add_job(
        _run_evaluation_job,
        "interval",
        days=7,
        id="weekly_eval",
        replace_existing=True,
    )
    scheduler.start()
    print("[startup] scheduler started (every 7 days)")

    # 3. Run once immediately so stored collections are populated
    if consumer_scores.count_documents({}) == 0:
        print("[startup] stored collections empty — running initial evaluation")
        _run_evaluation_job()
    else:
        print(f"[startup] using existing stored results "
              f"({consumer_scores.count_documents({})} consumers, "
              f"{dt_scores.count_documents({})} DTs)")

    yield

    scheduler.shutdown()
    print("[shutdown] scheduler stopped")


app = FastAPI(
    title="PS2 Evaluation Service",
    version="4.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def _clean(v):
    if v is None:
        return None
    try:
        v = float(v)
        return None if pd.isna(v) else round(v, 4)
    except (TypeError, ValueError):
        return v


def _to_consumer(row):
    sf = row.get("supporting_features")
    if isinstance(sf, str):
        try:
            sf = json.loads(sf)
        except Exception:
            sf = []
    elif sf is None:
        sf = []

    return ConsumerScore(
        CONS_NO=row["CONS_NO"],
        dt_id=row.get("dt_id"),
        xgb_score=round(float(row["xgb_score"]), 4),
        combined_score=round(float(row["combined_score"]), 4),
        predicted_flag=int(row["predicted_flag"]),
        risk_level=row["risk_level"],
        historical_mean=_clean(row.get("historical_mean")),
        current_mean=_clean(row.get("current_mean")),
        deviation_pct=_clean(row.get("deviation_pct")),
        probable_cause=row.get("probable_cause"),
        cause_confidence=_clean(row.get("cause_confidence")),
        priority=row.get("priority"),
        recommended_action=row.get("recommended_action"),
        supporting_features=sf,
    )


def _to_dt(row):
    return DTScore(
        dt_id=row["dt_id"],
        dt_if_risk=_clean(row.get("dt_if_risk")) or 0.0,
        dt_if_risk_max=_clean(row.get("dt_if_risk_max")) or 0.0,
        dt_suspicion=_clean(row.get("dt_suspicion")) or 0.0,
        dt_priority=str(row.get("dt_priority") or "P3"),
        flagged_count=int(_clean(row.get("flagged_count")) or 0),
        total_count=int(_clean(row.get("total_count")) or 0),
        flagged_ratio=_clean(row.get("flagged_ratio")) or 0.0,
        dt_mean_power=_clean(row.get("dt_mean_power")),
        dt_loss_ratio=_clean(row.get("dt_loss_ratio")),
        dt_loss_zscore=_clean(row.get("dt_loss_zscore")),
    )


# ------------------------------------------------------------
# Health
# ------------------------------------------------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "mongo_db": settings.mongo_db,
        "scheduler_running": scheduler.running,
        "stored_consumers": consumer_scores.count_documents({}),
        "stored_dts":       dt_scores.count_documents({}),
    }


# ------------------------------------------------------------
# Ingest
# ------------------------------------------------------------
@app.post("/api/v1/ingest/transformer-batch")
def ingest_transformer_batch(batch: TransformerBundle):
    dt_id = batch.transformer.dt_id
    now = datetime.utcnow()
    docs = []

    dt = batch.transformer
    docs.append({
        "meter_id":     dt.dt_id,
        "meter_type":   "dt",
        "consumer_id":  None,
        "dt_id":        dt_id,
        "timestamp":    dt.timestamp,
        "energy_kwh":   dt.energy_kwh,
        "power_kw":     dt.power_kw,
        "voltage_v":    dt.voltage_v,
        "current_a":    dt.current_a,
        "power_factor": dt.power_factor,
        "ingested_at":  now,
    })

    for c in batch.consumers:
        docs.append({
            "meter_id":     c.consumer_id,
            "meter_type":   "consumer",
            "consumer_id":  c.consumer_id,
            "dt_id":        dt_id,
            "timestamp":    c.timestamp,
            "energy_kwh":   c.energy_kwh,
            "power_kw":     c.power_kw,
            "voltage_v":    c.voltage_v,
            "current_a":    c.current_a,
            "power_factor": c.power_factor,
            "ingested_at":  now,
        })

    if docs:
        readings_coll.insert_many(docs, ordered=False)

    return {
        "batch_id": batch.batch_id,
        "dt_id":    dt_id,
        "inserted": len(docs),
    }


# ------------------------------------------------------------
# STORED RESULTS (fast path — reads MongoDB only)
# ------------------------------------------------------------
@app.get("/api/v1/scores/consumers", response_model=list[ConsumerScore])
def read_consumer_scores(n: int = Query(500, le=5000)):
    docs = list(
        consumer_scores
        .find({}, {"_id": 0})
        .sort("combined_score", DESCENDING)
        .limit(n)
    )
    if not docs:
        raise HTTPException(404, "No stored consumer scores. Trigger evaluation first.")
    return [_to_consumer(r) for r in docs]


@app.get("/api/v1/scores/consumer/{cons_no}", response_model=ConsumerDetail)
def read_stored_consumer(cons_no: str):
    doc = consumer_scores.find_one({"CONS_NO": cons_no}, {"_id": 0})
    if not doc:
        raise HTTPException(404, f"{cons_no} not found in stored scores")

    score = _to_consumer(doc)
    features = {
        k: _clean(v) for k, v in doc.items()
        if k not in ("probable_cause", "recommended_action", "risk_level", "supporting_features")
    }
    return ConsumerDetail(CONS_NO=cons_no, score=score, features=features)


@app.get("/api/v1/scores/dts", response_model=list[DTScore])
def read_dt_scores():
    docs = list(
        dt_scores
        .find({}, {"_id": 0})
        .sort("dt_suspicion", DESCENDING)
    )
    if not docs:
        raise HTTPException(404, "No stored DT scores. Trigger evaluation first.")
    return [_to_dt(r) for r in docs]


@app.get("/api/v1/scores/summary")
def read_stored_summary():
    total_consumers = consumer_scores.count_documents({})
    if total_consumers == 0:
        raise HTTPException(404, "No stored results. Trigger evaluation first.")

    flagged = consumer_scores.count_documents({"predicted_flag": 1})

    cause_dist = {
        r["_id"]: r["count"]
        for r in consumer_scores.aggregate([
            {"$group": {"_id": "$probable_cause", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ])
        if r["_id"]
    }

    priority_dist = {
        r["_id"]: r["count"]
        for r in consumer_scores.aggregate([
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ])
        if r["_id"]
    }

    risk_dist = {
        r["_id"]: r["count"]
        for r in consumer_scores.aggregate([
            {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}},
        ])
        if r["_id"]
    }

    total_dts      = dt_scores.count_documents({})
    suspicious_dts = dt_scores.count_documents({"dt_priority": "P1"})
    p2_dts         = dt_scores.count_documents({"dt_priority": "P2"})

    top_dts = list(
        dt_scores
        .find({}, {"_id": 0, "dt_id": 1, "dt_suspicion": 1})
        .sort("dt_suspicion", DESCENDING)
        .limit(5)
    )

    last_computed = consumer_scores.find_one(
        {}, {"_id": 0, "computed_at": 1}, sort=[("computed_at", DESCENDING)]
    )

    return {
        "computed_at": last_computed.get("computed_at") if last_computed else None,
        "consumers": {
            "total":                 total_consumers,
            "flagged":               flagged,
            "cause_distribution":    cause_dist,
            "priority_distribution": priority_dist,
            "risk_distribution":     risk_dist,
        },
        "dts": {
            "total":          total_dts,
            "suspicious":     suspicious_dts,
            "p1":             suspicious_dts,
            "p2":             p2_dts,
            "top_suspicious": top_dts,
        },
    }


# ------------------------------------------------------------
# LIVE EVALUATION (compute on demand — slow)
# ------------------------------------------------------------
@app.get("/api/v1/evaluate-all", response_model=FullEvaluationResponse)
def evaluate_all_levels():
    result = evaluate_all()
    if result is None:
        raise HTTPException(404, "No data in MongoDB to evaluate")

    consumers = result["consumers"]
    dts       = result["dts"]

    consumer_list = [
        _to_consumer(r) for r in
        consumers.sort_values("combined_score", ascending=False).to_dict("records")
    ] if not consumers.empty else []

    dt_list = [
        _to_dt(r) for r in
        dts.sort_values("dt_suspicion", ascending=False).to_dict("records")
    ] if not dts.empty else []

    cause_dist = (
        consumers["probable_cause"].value_counts().to_dict()
        if not consumers.empty else {}
    )
    priority_dist = (
        consumers["priority"].value_counts().to_dict()
        if not consumers.empty else {}
    )

    return FullEvaluationResponse(
        computed_at=datetime.utcnow(),
        total_consumers=len(consumers),
        total_dts=len(dts),
        flagged_consumers=int(consumers["predicted_flag"].sum()) if not consumers.empty else 0,
        suspicious_dts=int((dts["dt_priority"] == "P1").sum()) if not dts.empty else 0,
        cause_distribution=cause_dist,
        priority_distribution=priority_dist,
        consumers=consumer_list,
        dts=dt_list,
    )


@app.get("/api/v1/consumers", response_model=list[ConsumerScore])
def list_consumers(n: int = Query(500, le=5000)):
    result = evaluate_all()
    if result is None or result["consumers"].empty:
        raise HTTPException(404, "No consumer data")
    df = result["consumers"].sort_values("combined_score", ascending=False).head(n)
    return [_to_consumer(r) for r in df.to_dict("records")]


@app.get("/api/v1/dts", response_model=list[DTScore])
def list_dts():
    result = evaluate_all()
    if result is None or result["dts"].empty:
        raise HTTPException(404, "No DT data")
    df = result["dts"].sort_values("dt_suspicion", ascending=False)
    return [_to_dt(r) for r in df.to_dict("records")]


@app.get("/api/v1/consumer/{cons_no}", response_model=ConsumerDetail)
def consumer_detail(cons_no: str):
    result = evaluate_all()
    if result is None or result["consumers"].empty:
        raise HTTPException(404, "No data")
    rows = result["consumers"][result["consumers"]["CONS_NO"] == cons_no]
    if rows.empty:
        raise HTTPException(404, f"{cons_no} not found")

    r = rows.iloc[0].to_dict()
    score = _to_consumer(r)
    features = {k: _clean(v) for k, v in r.items()
                if k not in ("probable_cause", "recommended_action", "risk_level")}
    return ConsumerDetail(CONS_NO=cons_no, score=score, features=features)


@app.get("/api/v1/summary")
def summary_live():
    result = evaluate_all()
    if result is None:
        raise HTTPException(404, "No data")

    consumers = result["consumers"]
    dts       = result["dts"]

    return {
        "computed_at": datetime.utcnow().isoformat(),
        "consumers": {
            "total":                 int(len(consumers)),
            "flagged":               int(consumers["predicted_flag"].sum()) if not consumers.empty else 0,
            "cause_distribution":    consumers["probable_cause"].value_counts().to_dict() if not consumers.empty else {},
            "priority_distribution": consumers["priority"].value_counts().to_dict() if not consumers.empty else {},
            "risk_distribution":     consumers["risk_level"].value_counts().to_dict() if not consumers.empty else {},
        },
        "dts": {
            "total":          int(len(dts)),
            "p1":             int((dts["dt_priority"] == "P1").sum()) if not dts.empty else 0,
            "p2":             int((dts["dt_priority"] == "P2").sum()) if not dts.empty else 0,
            "top_suspicious": dts.nlargest(5, "dt_suspicion")[["dt_id", "dt_suspicion"]].to_dict("records") if not dts.empty else [],
        },
    }


# ------------------------------------------------------------
# Manual trigger — runs evaluation and stores results
# ------------------------------------------------------------
@app.post("/api/v1/admin/run-evaluation")
def run_evaluation_now():
    _run_evaluation_job()
    return {
        "status": "ok",
        "triggered_at": datetime.utcnow().isoformat(),
        "stored_consumers": consumer_scores.count_documents({}),
        "stored_dts":       dt_scores.count_documents({}),
    }