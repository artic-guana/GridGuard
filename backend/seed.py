"""
seed.py — Generate 90 days of smart-meter data with realistic anomalies.

Each consumer gets ONE reading per day. The XGBoost model was trained on
daily kWh totals in the 50–400 kWh/day range, so this seed writes daily
energy in a matching range.

Anomaly mix:
    --mix normal    5% theft, 2% fault, 2% comms, 3% legit
    --mix heavy    15% theft, 8% fault, 8% comms, 8% legit
    --mix demo     25% theft, 10% fault, 5% comms, 10% legit

Usage:
    python seed.py                            # 90 days, heavy mix
    python seed.py --mix demo --clear
    python seed.py --days 30
    python seed.py --mix normal --clear
"""

import argparse
import random
from datetime import datetime, timedelta, timezone
from collections import Counter

import numpy as np
from pymongo import MongoClient, ASCENDING

from config import settings


# ------------------------------------------------------------
# Topology
# ------------------------------------------------------------
def build_topology(n_dts=3, n_consumers_per_dt=50):
    dts = [f"DT-{i+1:02d}" for i in range(n_dts)]
    consumers = []
    for dt_idx, dt_id in enumerate(dts):
        for c in range(n_consumers_per_dt):
            consumers.append({
                "consumer_id": f"CONS-{dt_idx * n_consumers_per_dt + c + 1:05d}",
                "dt_id":       dt_id,
            })
    return dts, consumers


# ------------------------------------------------------------
# Scenario assignment
# ------------------------------------------------------------
def assign_scenarios(consumers, mix="heavy"):
    presets = {
        "normal": {"theft": 0.05, "fault": 0.02, "comms": 0.02, "legit": 0.03},
        "heavy":  {"theft": 0.15, "fault": 0.08, "comms": 0.08, "legit": 0.08},
        "demo":   {"theft": 0.25, "fault": 0.10, "comms": 0.05, "legit": 0.10},
    }
    p = presets.get(mix, presets["heavy"])
    out = {}
    for c in consumers:
        r = random.random()
        cum = p["theft"]
        if r < cum:
            out[c["consumer_id"]] = "theft"
            continue
        cum += p["fault"]
        if r < cum:
            out[c["consumer_id"]] = "meter_fault"
            continue
        cum += p["comms"]
        if r < cum:
            out[c["consumer_id"]] = "comms_failure"
            continue
        cum += p["legit"]
        if r < cum:
            out[c["consumer_id"]] = "legit_abnormal"
            continue
        out[c["consumer_id"]] = "normal"
    return out


# ------------------------------------------------------------
# Daily consumption model
# ------------------------------------------------------------
def daily_baseline(ts, base_kwh):
    """Realistic daily consumption in kWh: weekday + seasonal + noise."""
    dow = ts.weekday()
    weekly = 1.0 if dow < 5 else 1.15

    doy = ts.timetuple().tm_yday
    seasonal = 1.0 + 0.15 * np.sin((doy - 172) / 365 * 2 * np.pi)

    noise = random.uniform(0.92, 1.08)

    return base_kwh * weekly * seasonal * noise


# ------------------------------------------------------------
# Main seed
# ------------------------------------------------------------
def seed(days=90, mix="heavy", fmt="bundle", clear=False):
    random.seed(42)
    np.random.seed(42)

    client = MongoClient(settings.mongo_uri)
    db = client[settings.mongo_db]

    coll_name = "bundles" if fmt == "bundle" else "readings"
    coll = db[coll_name]

    if clear:
        for name in ("bundles", "readings", "consumer_scores", "dt_scores"):
            db[name].drop()
        print("[seed] dropped bundles, readings, consumer_scores, dt_scores")

    # Indexes
    if fmt == "bundle":
        coll.create_index([("simulated_at", ASCENDING)])
        coll.create_index([("transformer.dt_id", ASCENDING), ("simulated_at", ASCENDING)])
    else:
        coll.create_index([("meter_type", ASCENDING), ("timestamp", ASCENDING)])
        coll.create_index([("dt_id", ASCENDING), ("timestamp", ASCENDING)])

    # Topology
    dts, consumers = build_topology()
    by_dt = {d: [c for c in consumers if c["dt_id"] == d] for d in dts}

    # Scenarios
    scenarios = assign_scenarios(consumers, mix=mix)
    scen_counts = Counter(scenarios.values())
    print(f"[seed] mix='{mix}': {dict(scen_counts)}")

    # Base load: 80–350 kWh/day per consumer (matches training range)
    base_loads = {
        c["consumer_id"]: random.uniform(80.0, 350.0) for c in consumers
    }

    # Technical loss per DT
    tech_loss = {d: random.uniform(0.03, 0.06) for d in dts}

    # Anomaly start/end day
    start_day, end_day = {}, {}
    for c in consumers:
        cid = c["consumer_id"]
        scen = scenarios[cid]

        if scen in ("theft", "meter_fault", "comms_failure"):
            start_day[cid] = random.randint(30, 60)
            end_day[cid] = days
        elif scen == "legit_abnormal":
            start_day[cid] = random.randint(30, 50)
            end_day[cid] = start_day[cid] + random.randint(10, 20)
        else:
            start_day[cid] = -1
            end_day[cid] = -1

    # Time window
    end_ts = datetime.now(timezone.utc).replace(
        hour=12, minute=0, second=0, microsecond=0
    )
    start_ts = end_ts - timedelta(days=days - 1)

    print(f"[seed] {days} days from {start_ts.date()} to {end_ts.date()}")

    docs = []
    total = 0

    for day_idx in range(days):
        ts = start_ts + timedelta(days=day_idx)

        for dt_id in dts:
            consumer_readings = []
            real_powers = []

            for c in by_dt[dt_id]:
                cid = c["consumer_id"]
                scen = scenarios[cid]
                base = base_loads[cid]

                # What the consumer actually uses
                real_daily_kwh = daily_baseline(ts, base)

                # What the meter records
                recorded_daily_kwh = real_daily_kwh
                reading_type = "actual"
                status = "OK"

                # Apply scenario
                if scen == "theft" and start_day[cid] <= day_idx:
                    # Theft: recorded drops to 15–25% of real usage
                    recorded_daily_kwh = real_daily_kwh * random.uniform(0.15, 0.25)

                elif scen == "meter_fault" and start_day[cid] <= day_idx:
                    recorded_daily_kwh = 0.0
                    status = "FAULT"

                elif scen == "comms_failure" and start_day[cid] <= day_idx <= end_day[cid]:
                    recorded_daily_kwh = None
                    reading_type = "missing"
                    status = "COMM_LOST"

                elif scen == "legit_abnormal" and start_day[cid] <= day_idx <= end_day[cid]:
                    recorded_daily_kwh = real_daily_kwh * random.uniform(0.4, 1.6)

                # Derived fields
                if recorded_daily_kwh is None:
                    power_kw = None
                    energy_kwh = None
                    voltage_v = None
                    current_a = None
                    power_factor = None
                else:
                    power_kw = round(recorded_daily_kwh / 24.0, 4)
                    energy_kwh = round(recorded_daily_kwh, 4)
                    voltage_v = round(random.gauss(230, 3), 2)
                    current_a = round(power_kw / 0.23, 3)
                    power_factor = round(random.uniform(0.85, 0.99), 3)

                consumer_readings.append({
                    "consumer_id":  cid,
                    "timestamp":    ts,
                    "energy_kwh":   energy_kwh,
                    "power_kw":     power_kw,
                    "voltage_v":    voltage_v,
                    "current_a":    current_a,
                    "power_factor": power_factor,
                    "status":       status,
                    "reading_type": reading_type,
                })

                real_powers.append(real_daily_kwh)

            # DT input = sum of real consumption + technical loss
            dt_input_kwh = sum(real_powers) * (1 + tech_loss[dt_id])

            # Extra theft loss on DTs that contain an active theft
            any_theft_today = any(
                scenarios[c["consumer_id"]] == "theft"
                and start_day[c["consumer_id"]] <= day_idx
                for c in by_dt[dt_id]
            )
            if any_theft_today:
                dt_input_kwh *= 1 + random.uniform(0.05, 0.15)

            dt_reading = {
                "dt_id":        dt_id,
                "timestamp":    ts,
                "energy_kwh":   round(dt_input_kwh, 4),
                "power_kw":     round(dt_input_kwh / 24.0, 4),
                "voltage_v":    round(random.gauss(415, 3), 2),
                "current_a":    round(dt_input_kwh / 24.0 / 0.415 / 1.732, 3),
                "power_factor": round(random.uniform(0.88, 0.98), 3),
            }

            if fmt == "bundle":
                docs.append({
                    "batch_id":     f"b-{int(ts.timestamp())}-{dt_id}",
                    "simulated_at": ts,
                    "transformer":  dt_reading,
                    "consumers":    consumer_readings,
                })
            else:
                docs.append({
                    "meter_id":     dt_id,
                    "meter_type":   "dt",
                    "consumer_id":  None,
                    "dt_id":        dt_id,
                    "timestamp":    ts,
                    "energy_kwh":   dt_reading["energy_kwh"],
                    "power_kw":     dt_reading["power_kw"],
                    "voltage_v":    dt_reading["voltage_v"],
                    "current_a":    dt_reading["current_a"],
                    "power_factor": dt_reading["power_factor"],
                    "status":       "OK",
                })
                for r in consumer_readings:
                    docs.append({
                        "meter_id":     r["consumer_id"],
                        "meter_type":   "consumer",
                        "consumer_id":  r["consumer_id"],
                        "dt_id":        dt_id,
                        "timestamp":    r["timestamp"],
                        "energy_kwh":   r["energy_kwh"],
                        "power_kw":     r["power_kw"],
                        "voltage_v":    r["voltage_v"],
                        "current_a":    r["current_a"],
                        "power_factor": r["power_factor"],
                        "status":       r.get("status", "OK"),
                    })

        # Flush every 30 days
        if (day_idx + 1) % 30 == 0 or day_idx == days - 1:
            coll.insert_many(docs, ordered=False)
            total += len(docs)
            print(f"[seed] inserted {total} docs (day {day_idx + 1}/{days})")
            docs.clear()

    print(f"[seed] total inserted: {total}")
    print(f"[seed] collection: {coll_name}, documents: {coll.count_documents({})}")

    field = "simulated_at" if fmt == "bundle" else "timestamp"
    dates = coll.distinct(field)
    unique_days = {d.date() if hasattr(d, "date") else d for d in dates}
    print(f"[seed] distinct dates: {len(unique_days)}")

    # Sanity check: report the daily kWh range across all consumers
    sample = coll.find_one({})
    if sample and "consumers" in sample:
        kwh_vals = [
            c["energy_kwh"]
            for b in coll.find({}, {"consumers": 1}).limit(10)
            for c in b.get("consumers", [])
            if c.get("energy_kwh") is not None
        ]
        if kwh_vals:
            print(f"[seed] kWh range in first 10 bundles: "
                  f"min={min(kwh_vals):.1f}, max={max(kwh_vals):.1f}")


# ------------------------------------------------------------
# CLI
# ------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--mix", choices=["normal", "heavy", "demo"], default="demo")
    parser.add_argument("--format", choices=["bundle", "flat"], default="bundle")
    parser.add_argument("--clear", action="store_true")
    args = parser.parse_args()

    seed(days=args.days, mix=args.mix, fmt=args.format, clear=args.clear)