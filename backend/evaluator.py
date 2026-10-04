"""
Loads xgb_model.pkl and iso_dt.pkl.
Scores consumers and distribution transformers. Computes DT cluster suspicion.
SHAP is optional — falls back to XGBoost's native pred_contribs if unavailable.

The flagging threshold comes from settings.decision_threshold (config.py),
not from the pickled feature_config.pkl.
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
# Helpers
# ------------------------------------------------------------
def _f(v, default=0.0):
    try:
        v = float(v)
        return default if np.isnan(v) else v
    except (TypeError, ValueError):
        return default


def _risk_level(s):
    if s >= 0.70: return "High"
    if s >= 0.45: return "Medium"
    if s >= 0.30: return "Low"
    return "Normal"


def _cut_priority(series, bins=(0.20, 0.40)):
    return pd.cut(
        series, [-0.01, bins[0], bins[1], 1.01], labels=["P3", "P2", "P1"]
    ).astype(str)


def _infer_cause(row):
    score  = _f(row.get("combined_score"))
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

    if score < 0.35:
        return "Normal", round(1 - score, 3)
    if miss_z > 2.5 and mmax > 20:
        return "Communication Failure", round(min(0.95, 0.5 + 0.1 * miss_z), 3)
    if zmax > 25 or zero_z > 2.5 or (std < 0.03 * max(mean_c, 1e-3) and mean_c > 1):
        return "Meter Malfunction", 0.70
    if seas > 0.6 and resid < 0.30:
        return "Legitimate Abnormal", 0.60
    if score >= 0.45:
        return "Theft / Tampering", round(min(0.95, 0.55 + score * 0.4), 3)
    if drop < 0.75 and rvh < 0.85 and miss_z < 1.5 and zmax < 20:
        return "Theft / Tampering", 0.55
    if miss_z > 1.5 and mmax > 15:
        return "Communication Failure", 0.45
    return "Requires Review", 0.40


def _priority(row):
    score = _f(row.get("combined_score"))
    conf  = _f(row.get("cause_confidence"))
    dev   = abs(_f(row.get("deviation_pct"))) / 100.0
    days  = _f(row.get("detection_days")) / 90.0
    sev   = float(np.clip(dev + 0.5 * days, 0, 2))
    p     = score * conf * sev

    if p >= 0.50: return "P1 - Immediate inspection"
    if p >= 0.25: return "P2 - Schedule within 1 week"
    if p >= 0.10: return "P3 - Monitor / review"
    return "P4 - No action"


def _action(cause):
    return {
        "Theft / Tampering":     "Field inspection of meter and service line.",
        "Meter Malfunction":     "Replace or calibrate meter.",
        "Communication Failure": "Check modem, SIM, network.",
        "Legitimate Abnormal":   "Monitor for 2 weeks.",
        "Requires Review":       "Manual desk review.",
    }.get(cause, "No action.")


def _score_if(bundle, df, id_col):
    """Generic Isolation Forest scorer: returns per-id risk."""
    cols = bundle["feature_cols"]
    for c in cols:
        if c not in df.columns:
            df[c] = 0.0

    X = bundle["imputer"].transform(df[cols])
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
    """Fallback: use XGBoost's built-in pred_contribs (equivalent to SHAP)."""
    import xgboost as xgb

    booster = xgb_model.get_booster()
    dmat = xgb.DMatrix(X_row.reshape(1, -1), feature_names=feature_cols)
    contribs = booster.predict(dmat, pred_contribs=True)
    sv = contribs[0][:-1]   # drop the bias column

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
    """Use SHAP if available, otherwise XGBoost pred_contribs."""
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

    # Threshold comes from config, not the pickled config
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

            causes = feat_cons.apply(_infer_cause, axis=1, result_type="expand")
            feat_cons["probable_cause"]     = causes[0]
            feat_cons["cause_confidence"]   = causes[1]
            feat_cons["priority"]           = feat_cons.apply(_priority, axis=1)
            feat_cons["recommended_action"] = feat_cons["probable_cause"].apply(_action)

            # ---- SHAP / pred_contribs (only for flagged consumers) ----
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

            feat_cons["supporting_features"] = [
                json.dumps(e) for e in evidence_list
            ]

            consumers = feat_cons

    # ---- 3. DTs ----
    dts = pd.DataFrame()
    if not raw_dt.empty:
        dt_time, dt_agg = build_dt_features(raw_dt)

        if not raw_cons.empty:
            dt_loss = compute_dt_loss_ratio(raw_dt, raw_cons)
            dt_agg = dt_agg.merge(dt_loss, on="dt_id", how="left")

        dt_if = _score_if(iso_dt, dt_time, "dt_id")
        dts = dt_agg.merge(dt_if, on="dt_id", how="left")
        dts["dt_if_risk"]     = dts["if_risk"].fillna(0)
        dts["dt_if_risk_max"] = dts["if_risk_max"].fillna(0)

    # ---- 4. DT-level cluster suspicion ----
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
        dts["dt_suspicion"] = (
            0.6 * dts["flagged_ratio"] + 0.4 * dts["dt_if_risk"]
        )
        dts["dt_priority"] = _cut_priority(dts["dt_suspicion"])
    elif not dts.empty:
        dts["flagged_count"] = 0
        dts["total_count"]   = 0
        dts["flagged_ratio"] = 0.0
        dts["mean_score"]    = 0.0
        dts["dt_suspicion"]  = dts["dt_if_risk"]
        dts["dt_priority"]   = _cut_priority(dts["dt_suspicion"])

    return {
        "consumers": consumers,
        "dts":       dts,
    }