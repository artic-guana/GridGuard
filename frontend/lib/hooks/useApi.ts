/**
 * lib/hooks/useApi.ts
 * Client-side SWR hooks for polling backend resources with auto-refresh every 60 seconds.
 * Skips polling when document.hidden is true.
 */

'use client';

import useSWR, { useSWRConfig } from 'swr';
import {
  fetchClientHealth,
  fetchClientSummary,
  fetchClientScoresConsumers,
  fetchClientScoresConsumer,
  fetchClientScoresDTs,
  postClientRunEvaluation,
  HealthResponse,
  FullEvaluationResponse,
  ConsumerScore,
  DTScore,
  RunEvaluationResponse,
} from '@/lib/api';
import { useState } from 'react';

const SWR_CONFIG = {
  refreshInterval: 60000,
  isPaused: () => typeof document !== 'undefined' && document.hidden,
  revalidateOnFocus: true,
};

export function useHealth() {
  const { data, error, isLoading, mutate } = useSWR<HealthResponse>(
    '/health',
    fetchClientHealth,
    SWR_CONFIG
  );
  return { data, error, isLoading, mutate };
}

export function useScoresSummary() {
  const { data, error, isLoading, mutate } = useSWR<FullEvaluationResponse>(
    '/api/v1/scores/summary',
    fetchClientSummary,
    SWR_CONFIG
  );
  return { data, error, isLoading, mutate };
}

export function useScoresConsumers(n: number = 500) {
  const { data, error, isLoading, mutate } = useSWR<ConsumerScore[]>(
    ['/api/v1/scores/consumers', n],
    () => fetchClientScoresConsumers(n),
    SWR_CONFIG
  );
  return { data, error, isLoading, mutate };
}

export function useScoresConsumer(consNo?: string) {
  const { data, error, isLoading, mutate } = useSWR<ConsumerScore>(
    consNo ? ['/api/v1/scores/consumer', consNo] : null,
    () => (consNo ? fetchClientScoresConsumer(consNo) : Promise.reject('No consumer number')),
    SWR_CONFIG
  );
  return { data, error, isLoading, mutate };
}

export function useScoresDTs() {
  const { data, error, isLoading, mutate } = useSWR<DTScore[]>(
    '/api/v1/scores/dts',
    fetchClientScoresDTs,
    SWR_CONFIG
  );
  return { data, error, isLoading, mutate };
}

export function useRunEvaluation() {
  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trigger = async (): Promise<RunEvaluationResponse | undefined> => {
    setIsMutating(true);
    setError(null);
    try {
      const res = await postClientRunEvaluation();
      await mutate('/api/v1/scores/summary');
      await mutate('/api/v1/scores/dts');
      await mutate((key) => Array.isArray(key) && key[0] === '/api/v1/scores/consumers');
      await mutate((key) => Array.isArray(key) && key[0] === '/api/v1/scores/consumer');
      return res;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to run evaluation');
      setError(e);
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  return { trigger, isMutating, error };
}
