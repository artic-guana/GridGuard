export interface SupportingFeature {
  feature: string;
  value: number;
  shap: number;
}

export interface ConsumerScore {
  CONS_NO: string;
  dt_id?: string;
  xgb_score: number;
  combined_score: number;
  predicted_flag: 0 | 1;
  risk_level: 'Normal' | 'Low' | 'Medium' | 'High';
  historical_mean?: number;
  current_mean?: number;
  deviation_pct?: number;
  probable_cause?: string;
  cause_confidence?: number;
  priority?: string;
  recommended_action?: string;
  supporting_features?: SupportingFeature[];
}

export interface ConsumerDetail {
  CONS_NO: string;
  score: ConsumerScore;
  features: Record<string, number | string | null | undefined>;
}

export interface DTScore {
  dt_id: string;
  dt_if_risk: number;
  dt_if_risk_max: number;
  dt_suspicion: number;
  dt_priority: 'P1' | 'P2' | 'P3';
  flagged_count: number;
  total_count: number;
  flagged_ratio: number;
  dt_mean_power?: number;
  dt_loss_ratio?: number;
  dt_loss_zscore?: number;
}

export function formatNumber(v: unknown, decimals = 4): string {
  if (v === null || v === undefined || v === '') return '—';
  const num = typeof v === 'number' ? v : Number(v);
  if (isNaN(num)) return '—';
  return num.toFixed(decimals);
}

export function formatKWh(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const num = typeof v === 'number' ? v : Number(v);
  if (isNaN(num)) return '—';
  return `${num.toFixed(2)} kWh`;
}

export function formatPct(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const num = typeof v === 'number' ? v : Number(v);
  if (isNaN(num)) return '—';
  return `${num.toFixed(1)}%`;
}

export function formatTimestamp(iso?: string): string {
  if (iso) {
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      }
    } catch {
      // fallback
    }
  }
  return new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

export function safe(v: unknown, fallback = '—'): string {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'number') {
    if (isNaN(v)) return fallback;
    return String(v);
  }
  return String(v);
}

export function priorityCode(priority?: string): 'P1' | 'P2' | 'P3' | 'P4' {
  if (!priority) return 'P3';
  const p = priority.toUpperCase().trim();
  if (p === 'P1' || p === 'P2' || p === 'P3' || p === 'P4') return p as 'P1' | 'P2' | 'P3' | 'P4';
  return 'P3';
}

export function priorityDescription(code?: string): string {
  const c = priorityCode(code);
  switch (c) {
    case 'P1':
      return 'Critical - High Theft Suspect / Immediate Action Required';
    case 'P2':
      return 'High - Significant Anomaly / Scheduled Inspection Needed';
    case 'P3':
      return 'Medium - Desk Review / Routine Verification';
    case 'P4':
      return 'Low - Minimal Risk / Operational Monitoring Only';
    default:
      return 'Medium - Desk Review / Routine Verification';
  }
}

export function priorityColor(code?: string): string {
  const c = priorityCode(code);
  switch (c) {
    case 'P1':
      return '#e11d48'; // Rose
    case 'P2':
      return '#f59e0b'; // Amber
    case 'P3':
      return '#0284c7'; // Sky
    case 'P4':
      return '#64748b'; // Slate
    default:
      return '#0284c7';
  }
}

export function riskColor(level?: string): string {
  if (!level) return '#64748b';
  const l = level.trim();
  switch (l) {
    case 'High':
      return '#e11d48'; // Rose
    case 'Medium':
      return '#f59e0b'; // Amber
    case 'Low':
      return '#0284c7'; // Sky
    case 'Normal':
      return '#059669'; // Emerald
    default:
      return '#64748b';
  }
}

export function deriveBehaviour(features?: Record<string, unknown>): string {
  if (!features) return 'steady';
  const missing_zscore = Number(features.missing_zscore ?? 0);
  const zero_zscore = Number(features.zero_zscore ?? 0);
  const recovery_ratio = Number(features.recovery_ratio ?? 0);
  const drop_ratio = Number(features.drop_ratio ?? 1);
  const recent_vs_historical = Number(features.recent_vs_historical ?? 1);
  const coefficient_of_variation = Number(features.coefficient_of_variation ?? 0);

  if (missing_zscore > 2.0) return 'missing_heavy';
  if (zero_zscore > 2.0) return 'flat_zero';
  if (recovery_ratio > 1.3 && drop_ratio < 0.8) return 'recovery';
  if (recent_vs_historical < 0.5 && drop_ratio < 0.6) return 'declining';
  if (recent_vs_historical > 1.8) return 'spiking';
  if (coefficient_of_variation > 0.7) return 'intermittent';
  return 'steady';
}

export function deriveBehaviourDescription(pattern: string): string {
  switch (pattern) {
    case 'steady':
      return 'Consumption is stable over the window.';
    case 'declining':
      return 'Sustained reduction relative to baseline.';
    case 'intermittent':
      return 'High variance with frequent swings.';
    case 'missing_heavy':
      return 'Telemetry gaps dominate the window.';
    case 'flat_zero':
      return 'Readings are constant or zero.';
    case 'recovery':
      return 'Consumption is returning to baseline.';
    case 'spiking':
      return 'Consumption is well above baseline.';
    default:
      return 'Consumption is stable over the window.';
  }
}

export function deriveExplanation(score: ConsumerScore, features?: Record<string, unknown>): string {
  const cause = (score.probable_cause || '').trim();
  const combined_score = formatNumber(score.combined_score, 4);
  const deviation_pct = formatNumber(score.deviation_pct, 1);
  const max_zero_streak = safe(features?.max_zero_streak, '0');
  const missing_pct_val = Number(features?.missing_percentage ?? 0);
  const missing_percentage = (missing_pct_val * 100).toFixed(1);
  const max_missing_streak = safe(features?.max_missing_streak, '0');

  if (cause === 'Theft / Tampering' || cause.toLowerCase().includes('theft') || cause.toLowerCase().includes('tamper')) {
    return `The consumer's ML score of ${combined_score} is above the classification threshold. Recent 30-day consumption is ${deviation_pct}% below the 90-day historical mean. Communication has been continuous and meter status is nominal, ruling out data-quality issues. The sustained drop pattern is consistent with meter bypass or unauthorised load.`;
  }

  if (cause === 'Meter Malfunction' || cause.toLowerCase().includes('malfunction') || cause.toLowerCase().includes('meter')) {
    return `The meter has produced flat-line or zero readings for ${max_zero_streak} consecutive days. This pattern is inconsistent with real consumption and points to an internal sensor or measurement fault.`;
  }

  if (cause === 'Communication Failure' || cause.toLowerCase().includes('comm') || cause.toLowerCase().includes('telemetry')) {
    return `Missing telemetry on ${missing_percentage}% of days with a maximum continuous gap of ${max_missing_streak} days. Verify the modem, SIM, and backhaul link before dispatching a field visit.`;
  }

  if (cause === 'Legitimate Abnormal' || cause.toLowerCase().includes('legitimate') || cause.toLowerCase().includes('abnormal')) {
    return `The deviation of ${deviation_pct}% aligns with a seasonal pattern. No counter-signals of theft or fault. Monitor for two more weeks.`;
  }

  if (cause === 'Requires Review' || (score.predicted_flag === 1 && !cause)) {
    return `The consumer was flagged with a combined score of ${combined_score}. The pattern does not match any single high-confidence cause. Manual desk review is required.`;
  }

  if (cause === 'Normal' || score.predicted_flag === 0) {
    return 'This consumer is within expected tolerance. No action required.';
  }

  return `The consumer was flagged with a combined score of ${combined_score}. The pattern does not match any single high-confidence cause. Manual desk review is required.`;
}

export function deriveSuggestedTeam(priority?: string): string {
  const p = priorityCode(priority);
  switch (p) {
    case 'P1':
      return 'Field Crew A — Immediate';
    case 'P2':
      return 'Field Crew B — Scheduled';
    case 'P3':
      return 'Desk Review Team';
    case 'P4':
      return 'No dispatch';
    default:
      return 'Desk Review Team';
  }
}

export function deriveSla(priority?: string): string {
  const p = priorityCode(priority);
  switch (p) {
    case 'P1':
      return '24 hours';
    case 'P2':
      return '7 days';
    case 'P3':
      return '30 days';
    case 'P4':
      return 'None';
    default:
      return '30 days';
  }
}

export function deriveStatus(cause?: string): string {
  const c = (cause || '').trim();
  switch (c) {
    case 'Theft / Tampering':
      return 'Open';
    case 'Meter Malfunction':
      return 'Investigating';
    case 'Legitimate Abnormal':
      return 'Investigating';
    case 'Communication Failure':
      return 'Requires Review';
    case 'Requires Review':
      return 'Requires Review';
    case 'Normal':
      return 'Resolved';
    default:
      return 'Open';
  }
}

export interface DtEnergyDerivation {
  inputEnergyKWh: number;
  consumerUsageKWh: number;
  unexplainedLossKWh: number;
  unexplainedLossPct: number;
  technicalLossPct: number;
}

export function deriveDtEnergy(dt: DTScore): DtEnergyDerivation {
  const inputEnergyKWh = (dt.dt_mean_power ?? 0) * 24;
  const lossRatio = dt.dt_loss_ratio ?? 1;
  const consumerUsageKWh = lossRatio > 0 ? inputEnergyKWh / lossRatio : inputEnergyKWh;
  const unexplainedLossKWh = inputEnergyKWh - consumerUsageKWh;
  const unexplainedLossPct = lossRatio > 1 ? (lossRatio - 1) * 100 : 0;
  const technicalLossPct = 3.0;

  return {
    inputEnergyKWh,
    consumerUsageKWh,
    unexplainedLossKWh,
    unexplainedLossPct,
    technicalLossPct,
  };
}
