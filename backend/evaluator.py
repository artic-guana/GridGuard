"""
Loads xgb_model.pkl and iso_dt.pkl.
Scores consumers and distribution transformers. Computes DT cluster suspicion.
SHAP is optional — falls back to XGBoost's native pred_contribs if unavailable.

The flagging threshold comes from settings.decision_threshold (config.py),
not from the pickled feature_config.pkl.

Consistency rules enforced here:
  - predicted_flag == 0  → probable_cause is always "Normal"
  - predicted_flag == 1  → probable_cause is always non-Normal
  - priority is derived FROM the cause, never independently
  - therefore cause and priority can never contradict

Resilience:
  - _score_if accepts either `imputer` or `fill_values` in the pickle
  - DT scoring is wrapped in try/except so a DT failure cannot
    prevent consumer scores from being persisted
"""
import json
import joblib
import numpy as np
import pandas as pd
from config import settings
from feature_builder import (
    fetch_readings,
    build_consumer_features,
    build_dt_features,
    compute_dt_loss_ratio,
)

# --- SHAP is optional ---
try:
    import shap
    _HAS_SHAP = True
except ImportError:
    _HAS_SHAP = False
    print("[evaluator] shap not installed — using XGBoost pred_contribs fallback")

_models = {}


def load_models():
    if not _models:
        _models["xgb"]    = joblib.load(f"{settings.models_dir}/xgb_model.pkl")
        _models["cfg"]    = joblib.load(f"{settings.models_dir}/feature_config.pkl")
        _models["iso_dt"] = joblib.load(f"{settings.models_dir}/iso_dt.pkl")
    return _models


# ------------------------------------------------------------
# Numeric helpers
# ------------------------------------------------------------
def _f(v, default=0.0):
    """Robust float conversion. Handles None, NaN, numpy scalars."""
    try:
        if v is None:
            return default
        v = float(v)
        return default if np.isnan(v) else v
    except (TypeError, ValueError):
        return default


def _is_flagged(row) -> bool:
    try:
        return int(row.get("predicted_flag", 0) or 0) == 1
    except (TypeError, ValueError):
        return False


# ------------------------------------------------------------
# Risk level (consumer)
# ------------------------------------------------------------
def _risk_level(s: float) -> str:
    if s >= 0.70: return "High"
    if s >= 0.45: return "Medium"
    if s >= 0.30: return "Low"
    return "Normal"


# ------------------------------------------------------------
# DT priority from suspicion score
# ------------------------------------------------------------
def _cut_priority(series, bins=(0.20, 0.40)):
    return pd.cut(
        series, [-0.01, bins[0], bins[1], 1.01], labels=["P3", "P2", "P1"]
    ).astype(str)


# ------------------------------------------------------------
# Cause inference (driven by predicted_flag)
# ------------------------------------------------------------
def _infer_cause(row):
    """
    Returns (cause, confidence).

    Unflagged consumers → Normal.
    Flagged consumers   → one of the five non-Normal classes.
    """
    score = _f(row.get("combined_score"))

    if not _is_flagged(row):
        return "Normal", round(max(0.0, min(1.0, 1 - score)), 3)

    # Only flagged consumers reach this point
    miss_z = _f(row.get("missing_zscore"))
    zero_z = _f(row.get("zero_zscore"))
    zmax   = _f(row.get("max_zero_streak"))
    mmax   = _f(row.get("max_missing_streak"))
    drop   = _f(row.get("drop_ratio"), 1.0)
    rvh    = _f(row.get("recent_vs_historical"), 1.0)
    seas   = _f(row.get("seasonal_amplitude"))
    resid  = _f(row.get("seasonal_residual"))
    std    = _f(row.get("std_consumption"))
    mean_c = _f(row.get("mean_consumption"))

    # 1. Communication failure — missing-data signature
    if miss_z > 2.5 and mmax > 20:
        return "Communication Failure", round(min(0.95, 0.5 + 0.1 * miss_z), 3)

    # 2. Meter malfunction — flat line or zero streak
    if zmax > 25 or zero_z > 2.5 or (std < 0.03 * max(mean_c, 1e-3) and mean_c > 1):
        return "Meter Malfunction", 0.70

    # 3. Legitimate abnormal — matches a seasonal pattern
    if seas > 0.6 and resid < 0.30:
        return "Legitimate Abnormal", 0.60

    # 4. Strong theft signal
    if score >= 0.55:
        return "Theft / Tampering", round(min(0.95, 0.55 + score * 0.4), 3)

    # 5. Moderate theft signal with structural drop
    if score >= 0.40 and drop < 0.75 and rvh < 0.85 and miss_z < 1.5 and zmax < 20:
        return "Theft / Tampering", 0.55

    # 6. Flagged but no rule matched — needs a human
    return "Requires Review", 0.45


# ------------------------------------------------------------
# Priority — derived from cause, never independent
# ------------------------------------------------------------
def _priority(row):
    """
    Priority is entirely determined by probable_cause.
    This guarantees priority and cause can never contradict each other.
    """
    cause = row.get("probable_cause", "Normal")
    score = _f(row.get("combined_score"))

    if cause == "Theft / Tampering":
        if score >= 0.70:
            return "P1 - Immediate inspection"
        return "P2 - Schedule within 1 week"

    if cause == "Meter Malfunction":
        if score >= 0.55:
            return "P2 - Schedule within 1 week"
        return "P3 - Monitor / review"

    if cause == "Communication Failure":
        return "P3 - Monitor / review"

    if cause == "Legitimate Abnormal":
        return "P3 - Monitor / review"

    if cause == "Requires Review":
        return "P3 - Monitor / review"

    # cause == "Normal"
    return "P4 - No action"


# ------------------------------------------------------------
# Recommended action per cause
# ------------------------------------------------------------
def _action(cause):
    return {
        "Theft / Tampering":     "Field inspection of meter and service line.",
        "Meter Malfunction":     "Replace or calibrate meter.",
        "Communication Failure": "Check modem, SIM, network.",
        "Legitimate Abnormal":   "Monitor for 2 weeks.",
        "Requires Review":       "Manual desk review.",
        "Normal":                "No action.",
    }.get(cause, "No action.")


# ------------------------------------------------------------
# Isolation Forest scorer (DT-level)
# ------------------------------------------------------------
def _score_if(bundle, df, id_col):
    """
    Isolation Forest scorer.

    Accepts either:
      - bundle["imputer"]      — sklearn SimpleImputer
      - bundle["fill_values"]  — plain list of medians

    Falls back to current-data column medians if neither exists.
    """
    cols = bundle["feature_cols"]
    for c in cols:
        if c not in df.columns:
            df[c] = 0.0

    X = df[cols].astype(float).values

    # Prefer fill_values (portable) over imputer (sklearn-version dependent)
    if "fill_values" in bundle and bundle["fill_values"] is not None:
        fill = np.asarray(bundle["fill_values"], dtype=float)
        mask = np.isnan(X)
        if mask.any():
            X[mask] = np.take(fill, np.where(mask)[1])

    elif "imputer" in bundle and bundle["imputer"] is not None:
        X = bundle["imputer"].transform(X)

    else:
        # Last resort — column median of current data
        med = np.nanmedian(X, axis=0)
        med = np.where(np.isnan(med), 0.0, med)
        mask = np.isnan(X)
        if mask.any():
            X[mask] = np.take(med, np.where(mask)[1])

    raw = -bundle["model"].decision_function(X)
    lo, hi = bundle["score_min"], bundle["score_max"]

    df = df.copy()
    df["if_risk"] = np.clip((raw - lo) / (hi - lo + 1e-9), 0, 1)

    return df.groupby(id_col).agg(
        if_risk     = ("if_risk", "mean"),
        if_risk_max = ("if_risk", "max"),
    ).reset_index()


# ------------------------------------------------------------
# SHAP / pred_contribs explanation
# ------------------------------------------------------------
_explainer = None


def _get_explainer(xgb_model):
    """Build SHAP TreeExplainer once and cache it."""
    global _explainer
    if _explainer is None and _HAS_SHAP:
        _explainer = shap.TreeExplainer(xgb_model)
    return _explainer


def _top_evidence_shap(explainer, X_row, feature_cols, k=5):
    sv = explainer.shap_values(X_row.reshape(1, -1))[0]
    order = np.argsort(-np.abs(sv))[:k]
    return [
        {
            "feature": feature_cols[i],
            "value":   round(float(X_row[i]), 4),
            "shap":    round(float(sv[i]), 4),
        }
        for i in order
    ]


def _top_evidence_native(xgb_model, X_row, feature_cols, k=5):
    """Fallback: XGBoost pred_contribs (equivalent to SHAP)."""
    import xgboost as xgb

    booster = xgb_model.get_booster()
    dmat = xgb.DMatrix(X_row.reshape(1, -1), feature_names=feature_cols)
    contribs = booster.predict(dmat, pred_contribs=True)
    sv = contribs[0][:-1]  # drop the bias column

    order = np.argsort(-np.abs(sv))[:k]
    return [
        {
            "feature": feature_cols[i],
            "value":   round(float(X_row[i]), 4),
            "shap":    round(float(sv[i]), 4),
        }
        for i in order
    ]


def _explain(xgb_model, X_row, feature_cols, k=5):
    if _HAS_SHAP:
        explainer = _get_explainer(xgb_model)
        return _top_evidence_shap(explainer, X_row, feature_cols, k)
    return _top_evidence_native(xgb_model, X_row, feature_cols, k)


# ------------------------------------------------------------
# Main entry
# ------------------------------------------------------------
def evaluate_all():
    m = load_models()
    xgb, cfg, iso_dt = m["xgb"], m["cfg"], m["iso_dt"]

    threshold = settings.decision_threshold

    # ---- 1. Load raw data ----
    raw_cons = fetch_readings("consumer")
    raw_dt   = fetch_readings("dt")

    # ---- 2. Consumers ----
    consumers = pd.DataFrame()
    if not raw_cons.empty:
        feat_cons = build_consumer_features(raw_cons)
        if not feat_cons.empty:
            cols = cfg["feature_cols"]
            for c in cols:
                if c not in feat_cons.columns:
                    feat_cons[c] = 0.0

            X = feat_cons[cols].astype(float).fillna(0).values
            proba = xgb.predict_proba(X)[:, 1]
            pred  = (proba >= threshold).astype(int)

            feat_cons["xgb_score"]      = proba
            feat_cons["combined_score"] = proba
            feat_cons["predicted_flag"] = pred
            feat_cons["risk_level"]     = feat_cons["combined_score"].apply(_risk_level)

            # --- Cause first (uses predicted_flag) ---
            causes = feat_cons.apply(_infer_cause, axis=1, result_type="expand")
            feat_cons["probable_cause"]   = causes[0]
            feat_cons["cause_confidence"] = causes[1]

            # --- Priority derived from cause ---
            feat_cons["priority"] = feat_cons.apply(_priority, axis=1)

            # --- Action derived from cause ---
            feat_cons["recommended_action"] = feat_cons["probable_cause"].apply(_action)

            # --- SHAP evidence for flagged consumers only ---
            evidence_list = []
            for i in range(len(feat_cons)):
                if pred[i] == 1:
                    try:
                        evidence_list.append(_explain(xgb, X[i], cols, k=5))
                    except Exception as e:
                        print(f"[evaluator] explain failed for row {i}: {e}")
                        evidence_list.append([])
                else:
                    evidence_list.append([])

            feat_cons["supporting_features"] = [json.dumps(e) for e in evidence_list]

            consumers = feat_cons

    # ---- 3. DTs (isolated so a failure cannot kill consumer results) ----
    dts = pd.DataFrame()
    if not raw_dt.empty:
        try:
            dt_time, dt_agg = build_dt_features(raw_dt)

            if not raw_cons.empty:
                dt_loss = compute_dt_loss_ratio(raw_dt, raw_cons)
                dt_agg = dt_agg.merge(dt_loss, on="dt_id", how="left")

            dt_if = _score_if(iso_dt, dt_time, "dt_id")
            dts = dt_agg.merge(dt_if, on="dt_id", how="left")
            dts["dt_if_risk"]     = dts["if_risk"].fillna(0)
            dts["dt_if_risk_max"] = dts["if_risk_max"].fillna(0)
        except Exception as e:
            import traceback
            print(f"[evaluator] DT scoring failed: {e}")
            traceback.print_exc()
            dts = pd.DataFrame()

    # ---- 4. DT-level cluster suspicion ----
    try:
        if not consumers.empty and not dts.empty:
            cons_by_dt = (
                consumers.groupby("dt_id")
                .agg(
                    flagged_count=("predicted_flag", "sum"),
                    total_count=("predicted_flag", "count"),
                    mean_score=("combined_score", "mean"),
                )
                .reset_index()
            )
            cons_by_dt["flagged_ratio"] = (
                cons_by_dt["flagged_count"] / cons_by_dt["total_count"]
            )

            dts = dts.merge(cons_by_dt, on="dt_id", how="left").fillna({
                "flagged_count": 0,
                "total_count":   0,
                "flagged_ratio": 0.0,
                "mean_score":    0.0,
            })
            dts["dt_suspicion"] = 0.6 * dts["flagged_ratio"] + 0.4 * dts["dt_if_risk"]
            dts["dt_priority"]  = _cut_priority(dts["dt_suspicion"])
        elif not dts.empty:
            dts["flagged_count"] = 0
            dts["total_count"]   = 0
            dts["flagged_ratio"] = 0.0
            dts["mean_score"]    = 0.0
            dts["dt_suspicion"]  = dts["dt_if_risk"]
            dts["dt_priority"]   = _cut_priority(dts["dt_suspicion"])
    except Exception as e:
        import traceback
        print(f"[evaluator] DT cluster aggregation failed: {e}")
        traceback.print_exc()

    return {
        "consumers": consumers,
        "dts":       dts,
    }