"""
Reads consumer and DT readings from MongoDB regardless of document shape
(bundle, block, or flat) and builds the feature tables needed for XGBoost
and the DT Isolation Forest.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pymongo import MongoClient
from config import settings

client = MongoClient(settings.mongo_uri)
db = client[settings.mongo_db]


# ============================================================
# Shape detection + loaders
# ============================================================
def _detect_shape(collection) -> str:
    doc = collection.find_one({})
    if doc is None:
        return "empty"
    if "consumers" in doc and isinstance(doc["consumers"], list):
        return "bundle"
    if "readings" in doc and isinstance(doc["readings"], list):
        return "block"
    if "timestamp" in doc and (
        "energy_kwh" in doc or "power_kw" in doc
    ):
        return "flat"
    return "unknown"


def _find_collection():
    for name in ("bundles", "readings", "meter_readings", "blocks", "meter_data"):
        if name in db.list_collection_names():
            return db[name], name
    raise RuntimeError(
        "No readings collection found. Present: "
        + ", ".join(db.list_collection_names())
    )


def _load_flat(collection, meter_type, cutoff) -> pd.DataFrame:
    cursor = collection.find(
        {"meter_type": meter_type, "timestamp": {"$gte": cutoff}},
        {"_id": 0},
    )
    df = pd.DataFrame(list(cursor))
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def _load_block(collection, meter_type, cutoff) -> pd.DataFrame:
    pipeline = [
        {"$match": {"meter_type": meter_type, "block_start": {"$gte": cutoff}}},
        {"$unwind": "$readings"},
        {"$project": {
            "_id": 0,
            "meter_id":     1,
            "meter_type":   1,
            "consumer_id":  1,
            "dt_id":        1,
            "timestamp":    "$readings.timestamp",
            "energy_kwh":   "$readings.energy_kwh",
            "power_kw":     "$readings.power_kw",
            "voltage_v":    "$readings.voltage_v",
            "current_a":    "$readings.current_a",
            "power_factor": "$readings.power_factor",
            "status":       1,
        }},
    ]
    df = pd.DataFrame(list(collection.aggregate(pipeline)))
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def _load_bundle_consumers(collection, cutoff) -> pd.DataFrame:
    """Unwind the `consumers` array from bundle documents."""
    pipeline = [
        {"$match": {"simulated_at": {"$gte": cutoff}}},
        {"$unwind": "$consumers"},
        {"$project": {
            "_id": 0,
            "meter_id":     "$consumers.consumer_id",
            "meter_type":   {"$literal": "consumer"},
            "consumer_id":  "$consumers.consumer_id",
            "dt_id":        "$transformer.dt_id",
            "timestamp":    "$consumers.timestamp",
            "energy_kwh":   "$consumers.energy_kwh",
            "power_kw":     "$consumers.power_kw",
            "voltage_v":    "$consumers.voltage_v",
            "current_a":    "$consumers.current_a",
            "power_factor": "$consumers.power_factor",
        }},
    ]
    df = pd.DataFrame(list(collection.aggregate(pipeline)))
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def _load_bundle_dts(collection, cutoff) -> pd.DataFrame:
    """Extract the transformer object from bundle documents."""
    pipeline = [
        {"$match": {"simulated_at": {"$gte": cutoff}}},
        {"$project": {
            "_id": 0,
            "meter_id":     "$transformer.dt_id",
            "meter_type":   {"$literal": "dt"},
            "consumer_id":  {"$literal": None},
            "dt_id":        "$transformer.dt_id",
            "timestamp":    "$transformer.timestamp",
            "energy_kwh":   "$transformer.energy_kwh",
            "power_kw":     "$transformer.power_kw",
            "voltage_v":    "$transformer.voltage_v",
            "current_a":    "$transformer.current_a",
            "power_factor": "$transformer.power_factor",
        }},
    ]
    df = pd.DataFrame(list(collection.aggregate(pipeline)))
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def fetch_readings(meter_type: str, days: int = None) -> pd.DataFrame:
    days = days or settings.history_days
    cutoff = datetime.utcnow() - timedelta(days=days)

    coll, name = _find_collection()
    shape = _detect_shape(coll)
    print(f"[feature_builder] {name} shape='{shape}' type='{meter_type}'")

    if shape == "bundle":
        if meter_type == "consumer":
            return _load_bundle_consumers(coll, cutoff)
        if meter_type == "dt":
            return _load_bundle_dts(coll, cutoff)
        raise RuntimeError(f"Unsupported meter_type for bundle: {meter_type}")

    if shape == "flat":
        return _load_flat(coll, meter_type, cutoff)
    if shape == "block":
        return _load_block(coll, meter_type, cutoff)

    raise RuntimeError(f"Unknown collection shape: {shape}")


# ============================================================
# Consumer features
# ============================================================
def _max_consecutive_true(mask: np.ndarray) -> np.ndarray:
    n, m = mask.shape
    c = np.zeros((n, m), dtype=np.int32)
    c[:, 0] = mask[:, 0].astype(np.int32)
    for j in range(1, m):
        c[:, j] = np.where(mask[:, j], c[:, j - 1] + 1, 0)
    return c.max(axis=1)


def _rolling_mean(values: np.ndarray, window: int) -> np.ndarray:
    """
    One scalar per row: the mean of window-sized rolling means.

    Guards:
    - If the series is shorter than or equal to the window, the rolling
      slice would be empty and produce NaN. Fall back to the global mean.
    """
    n, m = values.shape
    if m <= window:
        return np.nanmean(values, axis=1)

    filled = np.nan_to_num(values, nan=0.0)
    valid  = (~np.isnan(values)).astype(np.float32)
    cv = np.cumsum(filled, axis=1)
    cc = np.cumsum(valid,  axis=1)
    rv = cv[:, window:] - cv[:, :-window]
    rc = cc[:, window:] - cc[:, :-window]
    return np.nanmean(rv / np.maximum(rc, 1), axis=1)


def build_consumer_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["date"] = df["timestamp"].dt.date

    if "consumer_id" not in df.columns or df["consumer_id"].isna().all():
        df["consumer_id"] = df["meter_id"]

    daily = (
        df.groupby(["consumer_id", "date"])["energy_kwh"]
        .sum()
        .unstack(fill_value=None)
    )
    daily = daily.reindex(sorted(daily.columns), axis=1)
    X = daily.values.astype(np.float32)
    ids = daily.index.values
    n_rows, n_days = X.shape

    if n_days < settings.min_days_for_scoring:
        print(f"[feature_builder] only {n_days} days available")
        return pd.DataFrame()

    f = pd.DataFrame({"CONS_NO": ids})

    f["mean_consumption"]   = np.nanmean(X, axis=1)
    f["median_consumption"] = np.nanmedian(X, axis=1)
    f["std_consumption"]    = np.nanstd(X, axis=1)
    f["min_consumption"]    = np.nanmin(X, axis=1)
    f["max_consumption"]    = np.nanmax(X, axis=1)
    f["variance"]           = np.nanvar(X, axis=1)
    f["coefficient_of_variation"] = f["std_consumption"] / (f["mean_consumption"] + 1e-6)

    nan_mask  = np.isnan(X)
    zero_mask = (X == 0)
    f["missing_count"]      = nan_mask.sum(axis=1)
    f["missing_percentage"] = f["missing_count"] / n_days
    f["zero_count"]         = zero_mask.sum(axis=1)
    f["zero_percentage"]    = f["zero_count"] / n_days
    f["max_zero_streak"]    = _max_consecutive_true(zero_mask)
    f["max_missing_streak"] = _max_consecutive_true(nan_mask)

    X_filled = pd.DataFrame(X).ffill(axis=1).values
    diff = np.diff(X_filled, axis=1)
    f["mean_absolute_change"] = np.nanmean(np.abs(diff), axis=1)
    f["max_increase"]         = np.nanmax(diff, axis=1)
    f["max_decrease"]         = np.nanmin(diff, axis=1)

    pct = np.where(X_filled[:, :-1] > 0, diff / X_filled[:, :-1], 0.0)
    pct = np.clip(pct, -5, 5)
    f["mean_percentage_change"]  = np.nanmean(np.abs(pct), axis=1)
    f["max_percentage_increase"] = np.nanmax(pct, axis=1)
    f["max_percentage_decrease"] = np.nanmin(pct, axis=1)
    f["large_increase_count"]    = (pct >  0.5).sum(axis=1)
    f["large_decrease_count"]    = (pct < -0.5).sum(axis=1)

    # --- Rolling means: only compute if we have MORE days than the window ---
    for w in (7, 30, 90):
        if n_days > w:
            f[f"{w}_day_mean"] = _rolling_mean(X, w)
        else:
            # Not enough days for a full rolling window — use the global mean
            f[f"{w}_day_mean"] = np.nanmean(X, axis=1)

    last30 = min(30, n_days)
    last90 = min(90, n_days)
    f["recent_30_day_mean"] = np.nanmean(X[:, -last30:], axis=1)
    f["recent_90_day_mean"] = np.nanmean(X[:, -last90:], axis=1)

    # Guard against a NaN historical mean
    hist = f["90_day_mean"].values
    hist_safe = np.where(np.isnan(hist) | (hist == 0), 1e-6, hist)
    f["recent_vs_historical"] = f["recent_30_day_mean"] / hist_safe
    f["consumption_trend"]    = f["recent_30_day_mean"] - hist

    f["q25"] = np.nanpercentile(X, 25, axis=1)
    f["q50"] = np.nanpercentile(X, 50, axis=1)
    f["q75"] = np.nanpercentile(X, 75, axis=1)
    f["iqr"] = f["q75"] - f["q25"]

    # --- skewness (numpy — avoids pandas 2.2 deprecation) ---
    _m = np.nanmean(X, axis=1, keepdims=True)
    _s = np.nanstd(X,  axis=1, keepdims=True)
    f["skewness"] = np.nanmean(((X - _m) / (_s + 1e-9)) ** 3, axis=1)

    if n_days >= 180:
        f["drop_ratio"] = (
            np.nanmean(X[:, -90:], axis=1)
            / (np.nanmean(X[:, -180:-90], axis=1) + 1e-6)
        )
    else:
        f["drop_ratio"] = 1.0

    if n_days >= 60:
        f["recovery_ratio"] = (
            np.nanmean(X[:, -30:], axis=1)
            / (np.nanmean(X[:, -60:-30], axis=1) + 1e-6)
        )
    else:
        f["recovery_ratio"] = 1.0

    if n_days >= 30:
        months = pd.to_datetime(daily.columns).month
        monthly = pd.DataFrame(X).T.groupby(months).mean().T
        f["seasonal_amplitude"] = monthly.std(axis=1).values / (f["mean_consumption"] + 1e-6)
        last_month = pd.to_datetime(daily.columns[-1]).month
        expected = monthly[last_month].values
        f["seasonal_residual"] = np.abs(f["recent_30_day_mean"] - expected) / (expected + 1e-6)
    else:
        f["seasonal_amplitude"] = 0.0
        f["seasonal_residual"]  = 0.0

    try:
        f["peer_bucket"] = pd.qcut(f["mean_consumption"], q=10, labels=False, duplicates="drop")
        pm = f.groupby("peer_bucket")["mean_consumption"].transform("mean")
        ps = f.groupby("peer_bucket")["mean_consumption"].transform("std")
        f["peer_zscore"] = (f["mean_consumption"] - pm) / (ps + 1e-6)
        f.drop(columns=["peer_bucket"], inplace=True)
    except Exception:
        f["peer_zscore"] = 0.0

    f["missing_zscore"] = (
        (f["missing_percentage"] - f["missing_percentage"].median())
        / (f["missing_percentage"].std() + 1e-9)
    )
    f["zero_zscore"] = (
        (f["zero_percentage"] - f["zero_percentage"].median())
        / (f["zero_percentage"].std() + 1e-9)
    )

    f["historical_mean"] = f["90_day_mean"]
    f["current_mean"]    = f["recent_30_day_mean"]
    f["deviation_pct"]   = (
        (f["current_mean"] - f["historical_mean"])
        / (f["historical_mean"] + 1e-6) * 100
    )

    # --- Rolling 30-day mean along axis=1 (cumsum-based, pandas 2.2 compatible) ---
    window = 30
    if n_days >= window:
        valid_arr  = (~np.isnan(X_filled)).astype(np.float32)
        filled_arr = np.nan_to_num(X_filled, nan=0.0)
        cum_v = np.cumsum(filled_arr, axis=1)
        cum_c = np.cumsum(valid_arr,  axis=1)

        # shifted[i, k] = cum[i, k - window] for k >= window, else 0
        pad_v = np.zeros((n_rows, window), dtype=cum_v.dtype)
        pad_c = np.zeros((n_rows, window), dtype=cum_c.dtype)
        shifted_v = np.concatenate([pad_v, cum_v[:, :-window]], axis=1)
        shifted_c = np.concatenate([pad_c, cum_c[:, :-window]], axis=1)

        rv = cum_v - shifted_v
        rc = cum_c - shifted_c

        roll_30 = rv / np.maximum(rc, 1)
        roll_30[:, :window - 1] = np.nan   # first `window-1` positions are warm-up

        threshold = 0.7 * f["historical_mean"].values[:, None]
        below = np.where(np.isnan(roll_30), False, roll_30 < threshold)

        detect_start = np.full(n_rows, -1, dtype=int)
        for i in range(n_rows):
            if below[i].any():
                detect_start[i] = int(np.argmax(below[i]))
        f["detection_days"] = np.where(detect_start >= 0, n_days - detect_start, 0)
    else:
        f["detection_days"] = 0

    # Attach dt_id for cluster aggregation
    meta = (
        df.groupby("consumer_id")[["dt_id"]]
        .first()
        .reset_index()
        .rename(columns={"consumer_id": "CONS_NO"})
    )
    f = f.merge(meta, on="CONS_NO", how="left")

    f.replace([np.inf, -np.inf], np.nan, inplace=True)
    return f


# ============================================================
# DT features
# ============================================================
def build_dt_features(df: pd.DataFrame):
    if df.empty:
        return pd.DataFrame(), pd.DataFrame()

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["dt_id", "timestamp"]).reset_index(drop=True)
    df["hour"] = df["timestamp"].dt.hour

    df["rolling_mean_1h"] = (
        df.groupby("dt_id")["power_kw"]
        .transform(lambda s: s.rolling(4, min_periods=1).mean())
    )
    df["rolling_std_1h"] = (
        df.groupby("dt_id")["power_kw"]
        .transform(lambda s: s.rolling(4, min_periods=1).std().fillna(0))
    )
    df["deviation_from_dt_mean"] = (
        df["power_kw"] - df.groupby("dt_id")["power_kw"].transform("mean")
    )

    agg = df.groupby("dt_id").agg(
        dt_mean_power    = ("power_kw", "mean"),
        dt_std_power     = ("power_kw", "std"),
        dt_max_power     = ("power_kw", "max"),
        dt_min_power     = ("power_kw", "min"),
        dt_mean_voltage  = ("voltage_v", "mean"),
        dt_mean_pf       = ("power_factor", "mean"),
        dt_reading_count = ("power_kw", "count"),
    ).reset_index()

    return df, agg


def compute_dt_loss_ratio(dt_df: pd.DataFrame, consumer_df: pd.DataFrame) -> pd.DataFrame:
    """DT input power vs sum of its consumers (daily totals)."""
    if dt_df.empty or consumer_df.empty:
        return pd.DataFrame(columns=["dt_id", "dt_loss_ratio", "dt_loss_zscore"])

    if "energy_kwh" not in dt_df.columns or dt_df["energy_kwh"].isna().all():
        dt_total = dt_df.groupby("dt_id")["power_kw"].sum().rename("dt_input")
    else:
        dt_total = dt_df.groupby("dt_id")["energy_kwh"].sum().rename("dt_input")

    if "energy_kwh" not in consumer_df.columns or consumer_df["energy_kwh"].isna().all():
        cons_total = (
            consumer_df.dropna(subset=["power_kw"])
            .groupby("dt_id")["power_kw"].sum()
            .rename("consumer_sum")
        )
    else:
        cons_total = (
            consumer_df.dropna(subset=["energy_kwh"])
            .groupby("dt_id")["energy_kwh"].sum()
            .rename("consumer_sum")
        )

    loss = pd.concat([dt_total, cons_total], axis=1).reset_index()
    loss["dt_loss_ratio"] = loss["dt_input"] / (loss["consumer_sum"] + 1e-6)
    loss["dt_loss_zscore"] = (
        (loss["dt_loss_ratio"] - loss["dt_loss_ratio"].mean())
        / (loss["dt_loss_ratio"].std() + 1e-9)
    )
    return loss[["dt_id", "dt_loss_ratio", "dt_loss_zscore"]]