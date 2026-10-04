"""
diagnose.py — End-to-end diagnostic for the electricity theft detection pipeline.

Run:
    python diagnose.py

Prints a section per stage:
  1. MongoDB collections
  2. Raw reading shape and date spread
  3. Scenario distribution (seed anomalies)
  4. Feature builder output
  5. Model score distribution
  6. Stored consumer_scores
  7. Live API endpoints

Each section prints PASS / WARN / FAIL and a short explanation.
"""

import sys
from datetime import datetime, timedelta
from collections import Counter

import numpy as np
import joblib

try:
    from pymongo import MongoClient
    from config import settings
except ImportError as e:
    print(f"[FATAL] Cannot import project modules: {e}")
    sys.exit(1)


# ============================================================
# Helpers
# ============================================================
PASS = "PASS"
WARN = "WARN"
FAIL = "FAIL"


def section(title: str):
    print()
    print("=" * 70)
    print(f"  {title}")
    print("=" * 70)


def verdict(status: str, msg: str):
    icon = {"PASS": "✓", "WARN": "!", "FAIL": "✗"}.get(status, "?")
    print(f"  [{icon}] {status}: {msg}")


def safe_import_requests():
    try:
        import requests
        return requests
    except ImportError:
        return None


# ============================================================
# 1. MongoDB connectivity and collections
# ============================================================
def check_mongodb():
    section("1. MongoDB collections")

    try:
        client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=3000)
        client.admin.command("ping")
    except Exception as e:
        verdict(FAIL, f"Cannot connect to MongoDB at {settings.mongo_uri}: {e}")
        return None

    db = client[settings.mongo_db]
    names = db.list_collection_names()

    if not names:
        verdict(FAIL, f"Database '{settings.mongo_db}' has no collections")
        return None

    verdict(PASS, f"Connected to '{settings.mongo_db}'")
    print(f"  Collections: {names}")

    for name in names:
        n = db[name].count_documents({})
        print(f"    {name:25s} {n:>8d} docs")

    return db


# ============================================================
# 2. Raw reading shape and date spread
# ============================================================
def check_readings(db):
    section("2. Raw reading shape and date spread")

    # Find readings collection
    coll = None
    coll_name = None
    for name in ("bundles", "readings", "meter_readings", "blocks", "meter_data"):
        if name in db.list_collection_names():
            coll = db[name]
            coll_name = name
            break

    if coll is None:
        verdict(FAIL, "No readings collection found")
        return None

    total = coll.count_documents({})
    if total == 0:
        verdict(FAIL, f"Collection '{coll_name}' is empty")
        return None

    verdict(PASS, f"Using collection '{coll_name}' with {total} docs")

    # Detect shape
    sample = coll.find_one({})
    if "consumers" in sample and isinstance(sample["consumers"], list):
        shape = "bundle"
    elif "readings" in sample and isinstance(sample["readings"], list):
        shape = "block"
    else:
        shape = "flat"
    print(f"  Shape detected: {shape}")

    # Date field name
    date_field = "simulated_at" if shape == "bundle" else "timestamp"

    # Distinct dates
    dates = coll.distinct(date_field)
    unique_days = set()
    for d in dates:
        if hasattr(d, "date"):
            unique_days.add(d.date())
        elif isinstance(d, str):
            try:
                unique_days.add(datetime.fromisoformat(d).date())
            except ValueError:
                pass

    n_days = len(unique_days)
    print(f"  Distinct dates: {n_days}")

    if n_days < 7:
        verdict(FAIL, f"Only {n_days} distinct dates — minimum is 7")
    elif n_days < 90:
        verdict(WARN, f"Only {n_days} days — 90 is ideal for full feature accuracy")
    else:
        verdict(PASS, f"{n_days} days of data available")

    if unique_days:
        print(f"  Date range: {min(unique_days)} → {max(unique_days)}")

    return {"collection": coll, "shape": shape, "n_days": n_days, "date_field": date_field}


# ============================================================
# 3. Scenario distribution (are anomalies in the data?)
# ============================================================
def check_scenarios(db, reading_info):
    section("3. Scenario distribution in the seed")

    coll = reading_info["collection"]
    shape = reading_info["shape"]

    # Sample a bundle from the middle of the time range
    sample = coll.find_one({}, sort=[(reading_info["date_field"], 1)])

    if shape != "bundle":
        verdict(WARN, "Only bundles support scenario detection")
        return

    # Collect consumer energy values from a day in the anomaly window
    # Anomalies start around day 30-60, so take a bundle near the end
    late_bundles = list(
        coll.find({}, {"simulated_at": 1, "consumers": 1})
        .sort(reading_info["date_field"], -1)
        .limit(5)
    )

    if not late_bundles:
        verdict(FAIL, "Cannot sample late bundles")
        return

    # Aggregate consumer energy per consumer from the last 5 bundles
    per_consumer = {}
    for b in late_bundles:
        for c in b.get("consumers", []):
            cid = c.get("consumer_id")
            val = c.get("energy_kwh")
            if cid is None:
                continue
            per_consumer.setdefault(cid, []).append(val)

    # Categorize
    zero_consumers = 0
    missing_consumers = 0
    low_consumers = 0
    normal_consumers = 0

    for cid, vals in per_consumer.items():
        non_null = [v for v in vals if v is not None]
        if len(non_null) == 0:
            missing_consumers += 1
            continue
        avg = sum(non_null) / len(non_null)
        if avg == 0:
            zero_consumers += 1
        elif avg < 5:
            low_consumers += 1
        else:
            normal_consumers += 1

    total = zero_consumers + missing_consumers + low_consumers + normal_consumers
    print(f"  Consumers in last 5 bundles: {total}")
    print(f"    Zero readings (meter_fault):    {zero_consumers}")
    print(f"    Null readings (comms_failure):  {missing_consumers}")
    print(f"    Low readings (theft, <5 kWh):   {low_consumers}")
    print(f"    Normal readings:                {normal_consumers}")

    if zero_consumers + missing_consumers + low_consumers == 0:
        verdict(FAIL, "No anomalies detected in the seed — all consumers look normal")
    else:
        verdict(PASS, f"Seed contains {zero_consumers + missing_consumers + low_consumers} anomalous consumers")


# ============================================================
# 4. Feature builder output
# ============================================================
def check_features():
    section("4. Feature builder")

    try:
        from feature_builder import fetch_readings, build_consumer_features
    except ImportError as e:
        verdict(FAIL, f"Cannot import feature_builder: {e}")
        return None

    try:
        raw = fetch_readings("consumer")
    except Exception as e:
        verdict(FAIL, f"fetch_readings failed: {e}")
        return None

    if raw is None or raw.empty:
        verdict(FAIL, "fetch_readings returned empty DataFrame")
        return None

    verdict(PASS, f"Loaded {len(raw)} raw consumer readings")

    try:
        feat = build_consumer_features(raw)
    except Exception as e:
        verdict(FAIL, f"build_consumer_features failed: {e}")
        return None

    if feat is None or feat.empty:
        verdict(FAIL, "build_consumer_features returned empty DataFrame")
        return None

    verdict(PASS, f"Built features for {len(feat)} consumers, {len(feat.columns)} columns")

    # Critical feature check
    critical = [
        "90_day_mean", "historical_mean", "current_mean",
        "deviation_pct", "recent_vs_historical", "drop_ratio",
        "coefficient_of_variation",
    ]
    print()
    print("  Critical features:")
    all_ok = True
    for c in critical:
        if c not in feat.columns:
            print(f"    {c:25s} MISSING")
            all_ok = False
            continue
        n_null = int(feat[c].isna().sum())
        n_total = len(feat)
        if n_null == n_total:
            print(f"    {c:25s} ALL NULL  ← FAIL")
            all_ok = False
        else:
            print(f"    {c:25s} min={feat[c].min():9.3f}  max={feat[c].max():9.3f}  null={n_null}")

    if all_ok:
        verdict(PASS, "All critical features present with real values")
    else:
        verdict(FAIL, "Some critical features are missing or all NULL")

    return feat


# ============================================================
# 5. Model score distribution
# ============================================================
def check_model(feat):
    section("5. Model score distribution")

    if feat is None or feat.empty:
        verdict(FAIL, "No features available")
        return None

    try:
        model = joblib.load(f"models/xgb_model.pkl")
        cfg = joblib.load(f"models/feature_config.pkl")
    except Exception as e:
        verdict(FAIL, f"Cannot load models: {e}")
        return None

    cols = cfg.get("feature_cols", [])
    threshold = cfg.get("threshold", 0.5)

    missing = [c for c in cols if c not in feat.columns]
    if missing:
        print(f"  Missing features from config: {missing[:5]} ...")
        verdict(WARN, f"{len(missing)} features missing — padding with 0")

    X = feat.reindex(columns=cols, fill_value=0).astype(float).fillna(0).values

    try:
        proba = model.predict_proba(X)[:, 1]
    except Exception as e:
        verdict(FAIL, f"predict_proba failed: {e}")
        return None

    verdict(PASS, f"Model ran on {len(proba)} consumers")

    print(f"  Threshold : {threshold}")
    print(f"  Min score : {proba.min():.4f}")
    print(f"  Max score : {proba.max():.4f}")
    print(f"  Mean score: {proba.mean():.4f}")
    print(f"  > threshold: {int((proba >= threshold).sum())} consumers")

    print()
    print("  Top 10 consumers by score:")
    top_idx = np.argsort(-proba)[:10]
    for i in top_idx:
        row = feat.iloc[i]
        print(f"    {row['CONS_NO']:15s} score={proba[i]:.4f}  "
              f"rvh={row.get('recent_vs_historical', 0):.3f}  "
              f"drop={row.get('drop_ratio', 0):.3f}  "
              f"dev={row.get('deviation_pct', 0):.1f}%")

    # Verdict
    if proba.max() < 0.05:
        verdict(FAIL, "Model produces near-zero scores — features likely wrong")
    elif proba.max() < threshold:
        verdict(FAIL, f"Max score {proba.max():.3f} below threshold {threshold} — nothing will flag")
    elif (proba >= threshold).sum() == 0:
        verdict(FAIL, "No consumer crosses threshold")
    else:
        verdict(PASS, f"{int((proba >= threshold).sum())} consumers above threshold")

    return {"proba": proba, "feat": feat, "threshold": threshold}


# ============================================================
# 6. Stored consumer_scores
# ============================================================
def check_stored(db):
    section("6. Stored consumer_scores")

    if "consumer_scores" not in db.list_collection_names():
        verdict(FAIL, "consumer_scores collection does not exist")
        return

    n = db.consumer_scores.count_documents({})
    if n == 0:
        verdict(FAIL, "consumer_scores is empty — pipeline has not run")
        return

    flagged = db.consumer_scores.count_documents({"predicted_flag": 1})
    verdict(PASS, f"{n} stored scores, {flagged} flagged")

    sample = db.consumer_scores.find_one({}, {"_id": 0})
    if sample:
        print("  Sample stored doc:")
        for key in ("CONS_NO", "combined_score", "predicted_flag",
                    "historical_mean", "current_mean", "deviation_pct",
                    "probable_cause", "priority"):
            print(f"    {key:25s} {sample.get(key)}")

    # Null check on critical fields
    n_null_hist = db.consumer_scores.count_documents({"historical_mean": None})
    if n_null_hist > 0:
        verdict(FAIL, f"{n_null_hist} stored docs have historical_mean=null")
    else:
        verdict(PASS, "All stored docs have real historical_mean")


# ============================================================
# 7. Live API
# ============================================================
def check_api():
    section("7. Live API endpoints")

    requests = safe_import_requests()
    if requests is None:
        verdict(WARN, "requests library not installed — skipping API checks")
        return

    base = "http://localhost:8000"

    # Health
    try:
        r = requests.get(f"{base}/health", timeout=5)
        if r.status_code == 200:
            verdict(PASS, f"/health → {r.json()}")
        else:
            verdict(FAIL, f"/health returned {r.status_code}")
    except Exception as e:
        verdict(FAIL, f"Cannot reach {base}: {e}")
        print("  → Is uvicorn running?")
        return

    # Summary
    try:
        r = requests.get(f"{base}/api/v1/scores/summary", timeout=5)
        if r.status_code == 404:
            verdict(FAIL, "/scores/summary → 404 (no stored data)")
        elif r.status_code == 200:
            data = r.json()
            print(f"  /scores/summary → {data.get('consumers', {})}")
            verdict(PASS, "/scores/summary works")
        else:
            verdict(WARN, f"/scores/summary returned {r.status_code}")
    except Exception as e:
        verdict(FAIL, f"/scores/summary failed: {e}")

    # Consumers
    try:
        r = requests.get(f"{base}/api/v1/scores/consumers?n=5", timeout=5)
        if r.status_code == 200:
            verdict(PASS, f"/scores/consumers returned {len(r.json())} rows")
        else:
            verdict(WARN, f"/scores/consumers returned {r.status_code}")
    except Exception as e:
        verdict(FAIL, f"/scores/consumers failed: {e}")


# ============================================================
# Main
# ============================================================
def main():
    print()
    print("=" * 70)
    print("  PIPELINE DIAGNOSTIC")
    print(f"  {datetime.now().isoformat()}")
    print("=" * 70)

    db = check_mongodb()
    if db is None:
        print("\nCannot proceed without MongoDB.")
        return

    reading_info = check_readings(db)
    if reading_info is None:
        print("\nCannot proceed without readings.")
        return

    check_scenarios(db, reading_info)

    feat = check_features()
    model_info = check_model(feat)

    check_stored(db)
    check_api()

    # Final summary
    section("SUMMARY")
    print()
    print("  What to check if flagged=0:")
    print("    1. Section 3 — is the seed injecting anomalies?")
    print("    2. Section 4 — are critical features non-null?")
    print("    3. Section 5 — what is the max model score?")
    print("       • < 0.05 → features wrong")
    print("       • 0.05–threshold → lower the threshold")
    print("       • > threshold but 0 flagged → restart backend")
    print()
    print("  Fastest fixes:")
    print("    • Re-seed:   python seed.py --days 90 --mix demo --clear")
    print("    • Lower:     python -c \"import joblib; c=joblib.load('models/feature_config.pkl'); c['threshold']=0.20; joblib.dump(c,'models/feature_config.pkl')\"")
    print("    • Restart:   Ctrl+C uvicorn; uvicorn app:app --reload --port 8000")
    print()


if __name__ == "__main__":
    main()