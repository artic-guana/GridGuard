/**
 * lib/api.ts
 * Typed API fetchers for electricity-theft detector FastAPI backend.
 * Provides server-side fetchers (direct to FASTAPI_URL) and client-side fetchers (via Next.js proxy route /api/backend).
 */

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
  features?: Record<string, number>;
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

export interface FullEvaluationResponse {
  computed_at: string;
  total_consumers: number;
  total_dts: number;
  flagged_consumers: number;
  suspicious_dts: number;
  cause_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  consumers: ConsumerScore[];
  dts: DTScore[];
}

export interface HealthResponse {
  status: string;
  timestamp?: string;
}

export interface RunEvaluationResponse {
  status: string;
  message?: string;
  computed_at?: string;
}

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const PROXY_BASE = '/api/backend';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`API Error ${res.status}: ${errorText || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/* ==========================================================================
   HEALTH ENDPOINT
   ========================================================================== */
export async function fetchServerHealth(): Promise<HealthResponse> {
  const res = await fetch(`${FASTAPI_URL}/health`, { cache: 'no-store' });
  return handleResponse<HealthResponse>(res);
}

export async function fetchClientHealth(): Promise<HealthResponse> {
  const res = await fetch(`${PROXY_BASE}/health`, { cache: 'no-store' });
  return handleResponse<HealthResponse>(res);
}

/* ==========================================================================
   SUMMARY / FULL EVALUATION SCORES
   ========================================================================== */
export async function fetchServerSummary(): Promise<FullEvaluationResponse> {
  const res = await fetch(`${FASTAPI_URL}/api/v1/scores/summary`, { cache: 'no-store' });
  return handleResponse<FullEvaluationResponse>(res);
}

export async function fetchClientSummary(): Promise<FullEvaluationResponse> {
  const res = await fetch(`${PROXY_BASE}/api/v1/scores/summary`, { cache: 'no-store' });
  return handleResponse<FullEvaluationResponse>(res);
}

/* ==========================================================================
   CONSUMER SCORES
   ========================================================================== */
export async function fetchServerScoresConsumers(n: number = 500): Promise<ConsumerScore[]> {
  const res = await fetch(`${FASTAPI_URL}/api/v1/scores/consumers?n=${n}`, { cache: 'no-store' });
  return handleResponse<ConsumerScore[]>(res);
}

export async function fetchClientScoresConsumers(n: number = 500): Promise<ConsumerScore[]> {
  const res = await fetch(`${PROXY_BASE}/api/v1/scores/consumers?n=${n}`, { cache: 'no-store' });
  return handleResponse<ConsumerScore[]>(res);
}

/* ==========================================================================
   SINGLE CONSUMER SCORE DETAIL
   ========================================================================== */
export async function fetchServerScoresConsumer(consNo: string): Promise<ConsumerScore> {
  let res = await fetch(`${FASTAPI_URL}/api/v1/scores/consumer/${encodeURIComponent(consNo)}`, { cache: 'no-store' });
  if (res.status === 404) {
    res = await fetch(`${FASTAPI_URL}/api/v1/consumer/${encodeURIComponent(consNo)}`, { cache: 'no-store' });
  }
  const data = await handleResponse<any>(res);
  if (data && data.score) {
    return {
      ...data.score,
      CONS_NO: data.CONS_NO || data.score.CONS_NO || consNo,
      features: data.features || data.score.features || {},
    };
  }
  return data as ConsumerScore;
}

export async function fetchClientScoresConsumer(consNo: string): Promise<ConsumerScore> {
  let res = await fetch(`${PROXY_BASE}/api/v1/scores/consumer/${encodeURIComponent(consNo)}`, { cache: 'no-store' });
  if (res.status === 404) {
    res = await fetch(`${PROXY_BASE}/api/v1/consumer/${encodeURIComponent(consNo)}`, { cache: 'no-store' });
  }
  const data = await handleResponse<any>(res);
  if (data && data.score) {
    return {
      ...data.score,
      CONS_NO: data.CONS_NO || data.score.CONS_NO || consNo,
      features: data.features || data.score.features || {},
    };
  }
  return data as ConsumerScore;
}

/* ==========================================================================
   TRANSFORMER (DT) SCORES
   ========================================================================== */
export async function fetchServerScoresDTs(): Promise<DTScore[]> {
  const res = await fetch(`${FASTAPI_URL}/api/v1/scores/dts`, { cache: 'no-store' });
  return handleResponse<DTScore[]>(res);
}

export async function fetchClientScoresDTs(): Promise<DTScore[]> {
  const res = await fetch(`${PROXY_BASE}/api/v1/scores/dts`, { cache: 'no-store' });
  return handleResponse<DTScore[]>(res);
}

/* ==========================================================================
   RUN EVALUATION ADMIN TRIGGER
   ========================================================================== */
export async function postServerRunEvaluation(): Promise<RunEvaluationResponse> {
  const res = await fetch(`${FASTAPI_URL}/api/v1/admin/run-evaluation`, {
    method: 'POST',
    cache: 'no-store',
  });
  return handleResponse<RunEvaluationResponse>(res);
}

export async function postClientRunEvaluation(): Promise<RunEvaluationResponse> {
  const res = await fetch(`${PROXY_BASE}/api/v1/admin/run-evaluation`, {
    method: 'POST',
    cache: 'no-store',
  });
  return handleResponse<RunEvaluationResponse>(res);
}
