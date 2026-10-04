/**
 * app/settings/page.tsx
 * Admin settings and health diagnostics page for manual evaluation triggers and connection status.
 */

'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useHealth, useScoresSummary, useRunEvaluation } from '@/lib/hooks/useApi';
import { fetchClientHealth, HealthResponse } from '@/lib/api';
import {
  Settings,
  Activity,
  Play,
  RefreshCw,
  Server,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const { data: healthData, error: healthError, isLoading: healthLoading, mutate: mutateHealth } = useHealth();
  const { data: summaryData, isLoading: summaryLoading, mutate: mutateSummary } = useScoresSummary();
  const { trigger: runEvaluation, isMutating: isRunningEval } = useRunEvaluation();

  const [manualHealth, setManualHealth] = useState<HealthResponse | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [evalResultMsg, setEvalResultMsg] = useState<string | null>(null);

  const handleManualHealthCheck = async () => {
    setHealthChecking(true);
    setEvalResultMsg(null);
    try {
      const res = await fetchClientHealth();
      setManualHealth(res);
      await mutateHealth();
    } catch {
      setManualHealth({ status: 'unreachable' });
    } finally {
      setHealthChecking(false);
    }
  };

  const handleRunEvaluationNow = async () => {
    setEvalResultMsg(null);
    try {
      const res = await runEvaluation();
      await mutateSummary();
      setEvalResultMsg(res?.message || 'Evaluation executed successfully.');
    } catch (err) {
      setEvalResultMsg(err instanceof Error ? err.message : 'Evaluation trigger failed.');
    }
  };

  const isOnline = !healthError && (healthData?.status === 'ok' || healthData?.status === 'healthy');

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            System Diagnostics & Controls
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Backend API integration settings, health checks, and evaluation triggers.
          </p>
        </div>

        <button
          onClick={() => {
            mutateHealth();
            mutateSummary();
          }}
          disabled={healthLoading || summaryLoading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Page</span>
        </button>
      </div>

      {/* Main Settings Panel */}
      <div className="space-y-6">
        {/* Backend Connectivity Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-sans">
              <Server className="w-4 h-4 text-sky-700" />
              FastAPI Proxy & Connectivity Status
            </h3>
            <span className="flex items-center gap-1.5 text-xs font-semibold font-mono">
              {isOnline ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Online & Healthy</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700">Disconnected / Error</span>
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
              <span className="text-slate-500 font-sans font-medium text-[11px] uppercase">
                Frontend Proxy Base URL
              </span>
              <p className="font-bold text-slate-900">/api/backend/*</p>
              <p className="text-[11px] text-slate-500 font-sans">
                Next.js App Router internal rewrites & request forwarding.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
              <span className="text-slate-500 font-sans font-medium text-[11px] uppercase">
                Upstream FastAPI Target
              </span>
              <p className="font-bold text-slate-900">
                {process.env.FASTAPI_URL || 'http://localhost:8000'}
              </p>
              <p className="text-[11px] text-slate-500 font-sans">
                Server-to-server connection string (hidden from client browser).
              </p>
            </div>
          </div>
        </div>

        {/* Evaluation Controls & Timestamps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Run Evaluation */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-700" />
                  Run ML Anomaly Evaluation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Executes XGBoost inference, isolation forest scoring, and persists results to MongoDB.
                </p>
              </div>

              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600 font-sans">Last Computed Timestamp:</span>
                </div>
                <p className="font-bold text-slate-900 text-sm pl-6">
                  {summaryData?.computed_at
                    ? new Date(summaryData.computed_at).toLocaleString()
                    : summaryLoading
                    ? 'Loading...'
                    : 'Not available'}
                </p>
              </div>

              {evalResultMsg && (
                <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-md text-xs text-sky-900 font-mono">
                  {evalResultMsg}
                </div>
              )}
            </div>

            <button
              onClick={handleRunEvaluationNow}
              disabled={isRunningEval}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer mt-4"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningEval ? 'animate-spin' : ''}`} />
              <span>{isRunningEval ? 'Executing Evaluation Job...' : 'Run Evaluation Now'}</span>
            </button>
          </div>

          {/* Health Diagnostics */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-700" />
                  Live Health Check Probe
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sends an HTTP ping to GET /health endpoint to verify API responsiveness.
                </p>
              </div>

              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">SWR Automatic Status:</span>
                  <span className={`font-bold ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {healthLoading ? 'Checking...' : isOnline ? 'HEALTHY' : 'UNREACHABLE'}
                  </span>
                </div>

                {manualHealth && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <span className="text-slate-500 font-sans text-[11px]">Manual Probe Response:</span>
                    <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] overflow-x-auto">
                      {JSON.stringify(manualHealth, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleManualHealthCheck}
              disabled={healthChecking}
              className="w-full py-2.5 px-4 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer mt-4"
            >
              <Activity className={`w-4 h-4 ${healthChecking ? 'animate-spin' : ''}`} />
              <span>{healthChecking ? 'Probing /health...' : 'Execute Health Check'}</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {(healthError || summaryData === undefined) && !healthLoading && !summaryLoading && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-bold">Backend Warning</p>
              <p>
                Could not retrieve evaluation summary. Ensure FastAPI server is running at{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">
                  {process.env.FASTAPI_URL || 'http://localhost:8000'}
                </code>
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
