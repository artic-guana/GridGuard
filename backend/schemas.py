from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


# ------------------------------------------------------------
# MongoDB document shapes — bundle (one doc per transformer)
# ------------------------------------------------------------
class BundleDTReading(BaseModel):
    dt_id:        str
    timestamp:    datetime
    energy_kwh:   Optional[float] = None
    power_kw:     Optional[float] = None
    voltage_v:    Optional[float] = None
    current_a:    Optional[float] = None
    power_factor: Optional[float] = None


class BundleConsumerReading(BaseModel):
    consumer_id:  str
    timestamp:    datetime
    energy_kwh:   Optional[float] = None
    power_kw:     Optional[float] = None
    voltage_v:    Optional[float] = None
    current_a:    Optional[float] = None
    power_factor: Optional[float] = None


class TransformerBundle(BaseModel):
    batch_id:     str
    simulated_at: datetime
    transformer:  BundleDTReading
    consumers:    List[BundleConsumerReading]


# ------------------------------------------------------------
# MongoDB document shapes — flat / block (legacy)
# ------------------------------------------------------------
class ReadingDoc(BaseModel):
    meter_id:     str
    meter_type:   str
    consumer_id:  Optional[str] = None
    dt_id:        Optional[str] = None
    timestamp:    datetime
    energy_kwh:   Optional[float] = None
    power_kw:     Optional[float] = None
    voltage_v:    Optional[float] = None
    current_a:    Optional[float] = None
    power_factor: Optional[float] = None
    status:       Optional[str] = None


# ------------------------------------------------------------
# Consumer
# ------------------------------------------------------------
class ConsumerScore(BaseModel):
    CONS_NO:             str
    dt_id:               Optional[str] = None
    xgb_score:           float
    combined_score:      float
    predicted_flag:      int
    risk_level:          str
    historical_mean:     Optional[float] = None
    current_mean:        Optional[float] = None
    deviation_pct:       Optional[float] = None
    probable_cause:      Optional[str] = None
    cause_confidence:    Optional[float] = None
    priority:            Optional[str] = None
    recommended_action:  Optional[str] = None
    supporting_features: Optional[List[Dict[str, Any]]] = None


class ConsumerDetail(BaseModel):
    CONS_NO:  str
    score:    ConsumerScore
    features: Dict[str, Any]


# ------------------------------------------------------------
# Distribution Transformer
# ------------------------------------------------------------
class DTScore(BaseModel):
    dt_id:          str
    dt_if_risk:     float
    dt_if_risk_max: float
    dt_suspicion:   float
    dt_priority:    str
    flagged_count:  int
    total_count:    int
    flagged_ratio:  float
    dt_mean_power:  Optional[float] = None
    dt_loss_ratio:  Optional[float] = None
    dt_loss_zscore: Optional[float] = None


# ------------------------------------------------------------
# Full evaluation response
# ------------------------------------------------------------
class FullEvaluationResponse(BaseModel):
    computed_at:           datetime
    total_consumers:       int
    total_dts:             int
    flagged_consumers:     int
    suspicious_dts:        int
    cause_distribution:    Dict[str, int]
    priority_distribution: Dict[str, int]
    consumers:             List[ConsumerScore]
    dts:                   List[DTScore]