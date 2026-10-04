/**
 * app/dashboard/page.tsx
 * Overview dashboard page displaying key system metrics, top 20 suspicious consumers,
 * transformer suspicion rankings, and real-time evaluation controls.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useScoresSummary, useScoresConsumers, useScoresDTs, useRunEvaluation } from '@/lib/hooks/useApi';
import { ConsumerScore, DTScore } from '@/lib/api';
import {
  Users,
  AlertTriangle,
  Cpu,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: summary, error: summaryError, isLoading: summaryLoading, mutate: mutateSummary } = useScoresSummary();
  const { data: consumersData, error: consumersError, isLoading: consumersLoading, mutate: mutateConsumers } = useScoresConsumers(500);
  const { data: dtsData, error: dtsError, isLoading: dtsLoading, mutate: mutateDTs } = useScoresDTs();
  const { trigger: runEvaluation, isMutating: isEvaluating } = useRunEvaluation();

  const handleRefresh = async () => {
    try {
      await runEvaluation();
      await mutateSummary();
      await mutateConsumers();
      await mutateDTs();
    } catch {
      // Error handled by hook state
    }
  };

  const isLoading = summaryLoading || consumersLoading || dtsLoading;
  const error = summaryError || consumersError || dtsError;

  // Safely extract consumer and DT lists regardless of summary format
  const consumers: ConsumerScore[] = Array.isArray(consumersData)
    ? consumersData
    : Array.isArray(summary?.consumers)
    ? (summary.consumers as ConsumerScore[])
    : [];

  const dts: DTScore[] = Array.isArray(dtsData)
    ? dtsData
    : Array.isArray(summary?.dts)
    ? (summary.dts as DTScore[])
    : [];

  // Defensive metric extraction (handles both summary object structure and live array calculations)
  const summaryObj = summary as Record<string, any> | undefined;
  const consumersObj = summaryObj?.consumers && typeof summaryObj.consumers === 'object' && !Array.isArray(summaryObj.consumers)
    ? summaryObj.consumers
    : null;
  const dtsObj = summaryObj?.dts && typeof summaryObj.dts === 'object' && !Array.isArray(summaryObj.dts)
    ? summaryObj.dts
    : null;

  const totalConsumersCount = consumersObj?.total ?? summary?.total_consumers ?? consumers.length;
  const flaggedConsumersCount = consumersObj?.flagged ?? summary?.flagged_consumers ?? consumers.filter((c) => c.predicted_flag === 1).length;
  const totalDtsCount = dtsObj?.total ?? summary?.total_dts ?? dts.length;
  const suspiciousDtsCount = dtsObj?.suspicious ?? dtsObj?.p1 ?? summary?.suspicious_dts ?? dts.filter((t) => t.dt_priority === 'P1').length;
  const highRiskCount = consumersObj?.risk_distribution?.High ?? consumers.filter((c) => c.risk_level === 'High').length;

  // Top 20 suspicious consumers
  const topSuspiciousConsumers = [...consumers]
    .sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0))
    .slice(0, 20);

  // Sorted transformers by suspicion
  const topTransformers = [...dts]
    .sort((a, b) => (b.dt_suspicion || 0) - (a.dt_suspicion || 0));

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
            Grid Theft Detection Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time loss detection, transformer monitoring, and consumer risk analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {summary?.computed_at && (
            <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 font-mono font-medium shadow-2xs">
              Last evaluation: <strong className="text-slate-900">{new Date(summary.computed_at).toLocaleString()}</strong>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isEvaluating || isLoading}
            className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating...' : 'Refresh Evaluation'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading grid analytics from backend...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Dashboard Data</h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md">
            {error.message || 'Unable to connect to backend server. Please verify FastAPI status.'}
          </p>
          <button
            onClick={() => handleRefresh()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <>
          {/* 5 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Total Consumers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalConsumersCount.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Monitored Endpoints</p>
              </div>
              <div className="p-3 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Flagged Consumers</p>
                <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{flaggedConsumersCount.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Anomalous Activity</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Total Transformers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalDtsCount.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Active DT Sub-units</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                <Cpu className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Suspicious DTs</p>
                <p className="text-2xl font-bold text-rose-600 mt-1 font-mono">{suspiciousDtsCount.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">High Imbalance/Loss</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">High Risk Consumers</p>
                <p className="text-2xl font-bold text-rose-700 mt-1 font-mono">{highRiskCount.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Priority Inspection</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 20 Suspicious Consumers */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Top 20 Suspicious Consumers</h3>
                  <p className="text-xs text-slate-500">Highest combined anomaly & ML scores</p>
                </div>
                <Link href="/consumers" className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {topSuspiciousConsumers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No suspicious consumers found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-2 px-3">Consumer ID</th>
                        <th className="py-2 px-3">DT ID</th>
                        <th className="py-2 px-3">Combined Score</th>
                        <th className="py-2 px-3">Risk Level</th>
                        <th className="py-2 px-3">Probable Cause</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topSuspiciousConsumers.map((c) => (
                        <tr key={c.CONS_NO} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3">
                            <Link href={`/consumers/${c.CONS_NO}`} className="font-bold text-sky-700 hover:underline">
                              {c.CONS_NO}
                            </Link>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{c.dt_id || 'N/A'}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {((c.combined_score || 0) * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                                c.risk_level === 'High'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : c.risk_level === 'Medium'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : c.risk_level === 'Low'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              {c.risk_level}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-sans font-medium text-[11px]">
                            {c.probable_cause || 'Unclassified'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Transformer Suspicion Ranking */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">DT Suspicion Ranking</h3>
                  <p className="text-xs text-slate-500">Distribution transformers prioritized by loss & anomaly risk</p>
                </div>
                <Link href="/transformers" className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1">
                  View All DTs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {topTransformers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No transformer data available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-2 px-3">DT ID</th>
                        <th className="py-2 px-3">Priority</th>
                        <th className="py-2 px-3">Suspicion Score</th>
                        <th className="py-2 px-3">Flagged Consumers</th>
                        <th className="py-2 px-3">IF Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topTransformers.map((t) => (
                        <tr key={t.dt_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3">
                            <Link href={`/transformers/${t.dt_id}`} className="font-bold text-sky-700 hover:underline">
                              {t.dt_id}
                            </Link>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-sans ${
                                t.dt_priority === 'P1'
                                  ? 'bg-rose-600 text-white'
                                  : t.dt_priority === 'P2'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {t.dt_priority}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {((t.dt_suspicion || 0) * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-sans">
                            {t.flagged_count} / {t.total_count} ({((t.flagged_ratio || 0) * 100).toFixed(0)}%)
                          </td>
                          <td className="py-2 px-3 text-slate-800">
                            {((t.dt_if_risk || 0) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
