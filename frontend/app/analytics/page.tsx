/**
 * app/analytics/page.tsx
 * Analytics & Intelligence summary page rendering cause, priority, risk distribution visualizations,
 * and distribution transformer suspicion leaderboards.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useScoresSummary, useScoresConsumers, useScoresDTs, useRunEvaluation } from '@/lib/hooks/useApi';
import { ConsumerScore, DTScore } from '@/lib/api';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export default function AnalyticsPage() {
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
      // Handled by hook
    }
  };

  const isLoading = summaryLoading || consumersLoading || dtsLoading;
  const error = summaryError || consumersError || dtsError;

  const summaryObj = summary as Record<string, any> | undefined;
  const consumersObj = summaryObj?.consumers && typeof summaryObj.consumers === 'object' && !Array.isArray(summaryObj.consumers)
    ? summaryObj.consumers
    : null;
  const dtsObj = summaryObj?.dts && typeof summaryObj.dts === 'object' && !Array.isArray(summaryObj.dts)
    ? summaryObj.dts
    : null;

  const causeDist: Record<string, number> =
    summary?.cause_distribution || consumersObj?.cause_distribution || {};
  const priorityDist: Record<string, number> =
    summary?.priority_distribution || consumersObj?.priority_distribution || {};

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

  // Risk Distribution Math
  const riskCounts = {
    High: consumersObj?.risk_distribution?.High ?? consumers.filter((c) => c.risk_level === 'High').length,
    Medium: consumersObj?.risk_distribution?.Medium ?? consumers.filter((c) => c.risk_level === 'Medium').length,
    Low: consumersObj?.risk_distribution?.Low ?? consumers.filter((c) => c.risk_level === 'Low').length,
    Normal: consumersObj?.risk_distribution?.Normal ?? consumers.filter((c) => c.risk_level === 'Normal').length,
  };

  const totalConsumersCount = (consumersObj?.total ?? consumers.length) || 1;

  // Top 10 DT Leaderboard
  const top10Dts = [...dts].sort((a, b) => (b.dt_suspicion || 0) - (a.dt_suspicion || 0)).slice(0, 10);

  // Cause distribution max for scaling bars
  const maxCauseVal = Math.max(...Object.values(causeDist), 1);

  // Priority distribution math
  const totalPriorityVal = Object.values(priorityDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-700" />
            Grid Analytics & Root-Cause Distribution
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Statistical insights on anomaly signatures, priority distribution, and loss risk levels.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isEvaluating || isLoading}
          className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'Evaluating...' : 'Refresh Analytics'}</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Calculating grid analytics distributions...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Analytics</h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md">{error.message}</p>
          <button
            onClick={() => handleRefresh()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Charts Row: Cause & Priority */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cause Distribution Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-700" />
                    Probable Cause Distribution
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Frequency Bar Chart</span>
                </div>

                {Object.keys(causeDist).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">No cause classification data available.</div>
                ) : (
                  <div className="mt-5 space-y-4 font-mono text-xs">
                    {Object.entries(causeDist).map(([cause, count]) => {
                      const pct = Math.min(100, Math.round((count / maxCauseVal) * 100));
                      return (
                        <div key={cause} className="space-y-1">
                          <div className="flex justify-between font-sans text-slate-700 font-semibold">
                            <span>{cause}</span>
                            <span className="font-mono text-slate-900">{count} cases</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-sky-700 rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Priority Distribution Segmented Visualizer */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-700" />
                    Inspection Priority Distribution
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Breakdown</span>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Multi-segment Horizontal Bar representing Pie */}
                  <div className="w-full h-6 rounded-lg bg-slate-100 overflow-hidden flex shadow-inner">
                    {Object.entries(priorityDist).map(([prio, count]) => {
                      const sharePct = ((count / totalPriorityVal) * 100).toFixed(1);
                      const bgClass =
                        prio === 'P1'
                          ? 'bg-rose-600'
                          : prio === 'P2'
                          ? 'bg-amber-500'
                          : 'bg-sky-600';
                      return (
                        <div
                          key={prio}
                          style={{ width: `${sharePct}%` }}
                          title={`${prio}: ${count} (${sharePct}%)`}
                          className={`h-full ${bgClass} transition-all duration-500`}
                        />
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-xs text-center">
                    {Object.entries(priorityDist).map(([prio, count]) => {
                      const sharePct = ((count / totalPriorityVal) * 100).toFixed(1);
                      const colorClass =
                        prio === 'P1'
                          ? 'text-rose-700 bg-rose-50 border-rose-200'
                          : prio === 'P2'
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-sky-700 bg-sky-50 border-sky-200';
                      return (
                        <div key={prio} className={`p-3 rounded-md border ${colorClass}`}>
                          <p className="text-[10px] font-bold uppercase font-sans">{prio}</p>
                          <p className="text-lg font-bold mt-0.5">{count}</p>
                          <p className="text-[11px] text-slate-500">{sharePct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Level Horizontal Progress Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                Risk Level Breakdown (High / Medium / Low / Normal)
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Total Evaluated: {totalConsumersCount}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-sans text-slate-700 font-semibold">
                  <span>High Risk</span>
                  <span className="font-mono text-rose-700">
                    {riskCounts.High} (
                    {((riskCounts.High / totalConsumersCount) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(riskCounts.High / totalConsumersCount) * 100}%` }}
                    className="h-full bg-rose-600 rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-sans text-slate-700 font-semibold">
                  <span>Medium Risk</span>
                  <span className="font-mono text-amber-700">
                    {riskCounts.Medium} (
                    {((riskCounts.Medium / totalConsumersCount) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(riskCounts.Medium / totalConsumersCount) * 100}%` }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-sans text-slate-700 font-semibold">
                  <span>Low Risk</span>
                  <span className="font-mono text-sky-700">
                    {riskCounts.Low} (
                    {((riskCounts.Low / totalConsumersCount) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(riskCounts.Low / totalConsumersCount) * 100}%` }}
                    className="h-full bg-sky-500 rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-sans text-slate-700 font-semibold">
                  <span>Normal</span>
                  <span className="font-mono text-emerald-700">
                    {riskCounts.Normal} (
                    {((riskCounts.Normal / totalConsumersCount) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(riskCounts.Normal / totalConsumersCount) * 100}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 DT Suspicion Leaderboard */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-700" />
                  Top 10 DT Suspicion Leaderboard
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Highest priority transformers by loss ratio and isolation forest anomaly score</p>
              </div>
              <Link href="/transformers" className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1">
                View All DTs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {top10Dts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No transformer data available.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">DT ID</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Suspicion Score</th>
                      <th className="py-3 px-4">Flagged Consumers</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {top10Dts.map((t, idx) => (
                      <tr key={t.dt_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-500">#{idx + 1}</td>
                        <td className="py-3 px-4">
                          <Link href={`/transformers/${t.dt_id}`} className="font-bold text-sky-700 hover:underline">
                            {t.dt_id}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {((t.dt_suspicion || 0) * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-sans">
                          {t.flagged_count} / {t.total_count} ({((t.flagged_ratio || 0) * 100).toFixed(0)}%)
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/transformers/${t.dt_id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-sm text-[11px] font-bold transition-colors"
                          >
                            <span>View</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
