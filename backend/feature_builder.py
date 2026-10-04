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


def _ratio(numerator: np.ndarray, denominator: np.ndarray) -> np.ndarray:
    """Element-wise ratio with a safe denominator. Never returns inf."""
    den = np.where(
        np.isnan(denominator) | (denominator <= 0),
        1e-6,
        denominator,
    )
    num = np.where(np.isnan(numerator), 0.0, numerator)
    return num / den


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

    # ---------- Basic statistics ----------
    f["mean_consumption"]   = np.nanmean(X, axis=1)
    f["median_consumption"] = np.nanmedian(X, axis=1)
    f["std_consumption"]    = np.nanstd(X, axis=1)
    f["min_consumption"]    = np.nanmin(X, axis=1)
    f["max_consumption"]    = np.nanmax(X, axis=1)
    f["variance"]           = np.nanvar(X, axis=1)
    f["coefficient_of_variation"] = _ratio(f["std_consumption"].values,
                                           f["mean_consumption"].values)

    # ---------- Missing / zero ----------
    nan_mask  = np.isnan(X)
    zero_mask = (X == 0)
    f["missing_count"]      = nan_mask.sum(axis=1)
    f["missing_percentage"] = f["missing_count"] / n_days
    f["zero_count"]         = zero_mask.sum(axis=1)
    f["zero_percentage"]    = f["zero_count"] / n_days
    f["max_zero_streak"]    = _max_consecutive_true(zero_mask)
    f["max_missing_streak"] = _max_consecutive_true(nan_mask)

    # ---------- Change / volatility ----------
    X_filled = pd.DataFrame(X).ffill(axis=1).values
    diff = np.diff(X_filled, axis=1)

    f["mean_absolute_change"] = np.nanmean(np.abs(diff), axis=1)
    f["max_increase"]         = np.nanmax(diff, axis=1)
    f["max_decrease"]         = np.nanmin(diff, axis=1)

    # FIX: compute denominator safely BEFORE dividing to avoid 0/0 warnings
    denom = X_filled[:, :-1]
    denom_safe = np.where(denom > 0, denom, 1.0)
    pct = np.where(denom > 0, diff / denom_safe, 0.0)
    pct = np.clip(pct, -5, 5)

    f["mean_percentage_change"]  = np.nanmean(np.abs(pct), axis=1)
    f["max_percentage_increase"] = np.nanmax(pct, axis=1)
    f["max_percentage_decrease"] = np.nanmin(pct, axis=1)
    f["large_increase_count"]    = (pct >  0.5).sum(axis=1)
    f["large_decrease_count"]    = (pct < -0.5).sum(axis=1)

    # ---------- Rolling means ----------
    for w in (7, 30, 90):
        if n_days > w:
            f[f"{w}_day_mean"] = _rolling_mean(X, w)
        else:
            f[f"{w}_day_mean"] = np.nanmean(X, axis=1)

    last30 = min(30, n_days)
    last90 = min(90, n_days)
    f["recent_30_day_mean"] = np.nanmean(X[:, -last30:], axis=1)
    f["recent_90_day_mean"] = np.nanmean(X[:, -last90:], axis=1)

    hist = f["90_day_mean"].values
    f["recent_vs_historical"] = _ratio(f["recent_30_day_mean"].values, hist)
    f["consumption_trend"]    = f["recent_30_day_mean"] - hist

    # ---------- Quantiles ----------
    f["q25"] = np.nanpercentile(X, 25, axis=1)
    f["q50"] = np.nanpercentile(X, 50, axis=1)
    f["q75"] = np.nanpercentile(X, 75, axis=1)
    f["iqr"] = f["q75"] - f["q25"]

    # ---------- Skewness (numpy — avoids pandas 2.2 deprecation) ----------
    _m = np.nanmean(X, axis=1, keepdims=True)
    _s = np.nanstd(X,  axis=1, keepdims=True)
    f["skewness"] = np.nanmean(((X - _m) / (_s + 1e-9)) ** 3, axis=1)

    # ---------- Drop ratio (adaptive window) ----------
    # FIX: 90-day seed no longer forces drop_ratio to 1.0.
    # Use the largest window that fits.
    if n_days >= 180:
        f["drop_ratio"] = _ratio(
            np.nanmean(X[:, -90:],  axis=1),
            np.nanmean(X[:, -180:-90], axis=1),
        )
    elif n_days >= 60:
        f["drop_ratio"] = _ratio(
            np.nanmean(X[:, -30:],  axis=1),
            np.nanmean(X[:, -60:-30], axis=1),
        )
    elif n_days >= 30:
        f["drop_ratio"] = _ratio(
            np.nanmean(X[:, -10:],  axis=1),
            np.nanmean(X[:, -30:-10], axis=1),
        )
    else:
        f["drop_ratio"] = 1.0

    # ---------- Recovery ratio (adaptive window) ----------
    if n_days >= 60:
        f["recovery_ratio"] = _ratio(
            np.nanmean(X[:, -30:],  axis=1),
            np.nanmean(X[:, -60:-30], axis=1),
        )
    elif n_days >= 30:
        f["recovery_ratio"] = _ratio(
            np.nanmean(X[:, -10:],  axis=1),
            np.nanmean(X[:, -30:-10], axis=1),
        )
    else:
        f["recovery_ratio"] = 1.0

    # ---------- Seasonal ----------
    if n_days >= 30:
        months = pd.to_datetime(daily.columns).month
        monthly = pd.DataFrame(X).T.groupby(months).mean().T
        f["seasonal_amplitude"] = _ratio(monthly.std(axis=1).values,
                                         f["mean_consumption"].values)
        last_month = pd.to_datetime(daily.columns[-1]).month
        expected = monthly[last_month].values
        f["seasonal_residual"] = _ratio(
            np.abs(f["recent_30_day_mean"].values - expected),
            expected,
        )
    else:
        f["seasonal_amplitude"] = 0.0
        f["seasonal_residual"]  = 0.0

    # ---------- Peer z-score ----------
    try:
        f["peer_bucket"] = pd.qcut(
            f["mean_consumption"], q=10, labels=False, duplicates="drop"
        )
        pm = f.groupby("peer_bucket")["mean_consumption"].transform("mean")
        ps = f.groupby("peer_bucket")["mean_consumption"].transform("std")
        f["peer_zscore"] = (f["mean_consumption"] - pm) / (ps + 1e-6)
        f.drop(columns=["peer_bucket"], inplace=True)
    except Exception:
        f["peer_zscore"] = 0.0

    # ---------- Z-scores for missing / zero ----------
    mp_med = f["missing_percentage"].median()
    mp_std = f["missing_percentage"].std()
    f["missing_zscore"] = (f["missing_percentage"] - mp_med) / (mp_std + 1e-9)

    zp_med = f["zero_percentage"].median()
    zp_std = f["zero_percentage"].std()
    f["zero_zscore"] = (f["zero_percentage"] - zp_med) / (zp_std + 1e-9)

    # ---------- Deviation vs own history ----------
    f["historical_mean"] = f["90_day_mean"]
    f["current_mean"]    = f["recent_30_day_mean"]

    dev_num = f["current_mean"] - f["historical_mean"]
    dev_den = f["historical_mean"].where(f["historical_mean"] > 0, np.nan)
    f["deviation_pct"] = (dev_num / (dev_den + 1e-6)) * 100

    # ---------- Detection window ----------
    # FIX: use a shorter window (14 days) so thefts starting in the last
    # third of the seed window still register a detection.
    window = 14
    if n_days > window:
        valid_arr  = (~np.isnan(X_filled)).astype(np.float32)
        filled_arr = np.nan_to_num(X_filled, nan=0.0)
        cum_v = np.cumsum(filled_arr, axis=1)
        cum_c = np.cumsum(valid_arr,  axis=1)

        pad_v = np.zeros((n_rows, window), dtype=cum_v.dtype)
        pad_c = np.zeros((n_rows, window), dtype=cum_c.dtype)
        shifted_v = np.concatenate([pad_v, cum_v[:, :-window]], axis=1)
        shifted_c = np.concatenate([pad_c, cum_c[:, :-window]], axis=1)

        rv = cum_v - shifted_v
        rc = cum_c - shifted_c

        roll_w = rv / np.maximum(rc, 1)
        roll_w[:, :window - 1] = np.nan

        threshold = 0.7 * f["historical_mean"].values[:, None]
        below = np.where(np.isnan(roll_w), False, roll_w < threshold)

        detect_start = np.full(n_rows, -1, dtype=int)
        for i in range(n_rows):
            if below[i].any():
                detect_start[i] = int(np.argmax(below[i]))
        f["detection_days"] = np.where(
            detect_start >= 0, n_days - detect_start, 0
        )
    else:
        f["detection_days"] = 0

    # ---------- Attach dt_id ----------
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
    loss["dt_loss_ratio"] = _ratio(loss["dt_input"].values, loss["consumer_sum"].values)

    loss["dt_loss_zscore"] = (
        (loss["dt_loss_ratio"] - loss["dt_loss_ratio"].mean())
        / (loss["dt_loss_ratio"].std() + 1e-9)
    )
    return loss[["dt_id", "dt_loss_ratio", "dt_loss_zscore"]]