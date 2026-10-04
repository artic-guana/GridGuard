/**
 * app/transformers/page.tsx
 * Distribution Transformers (DT) overview page showing summary metrics and suspicion ranking table.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useScoresDTs, useRunEvaluation } from '@/lib/hooks/useApi';
import {
  Cpu,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function TransformersPage() {
  const router = useRouter();
  const { data: dts, error, isLoading, mutate } = useScoresDTs();
  const { trigger: runEvaluation, isMutating: isEvaluating } = useRunEvaluation();

  const handleRefresh = async () => {
    try {
      await runEvaluation();
      await mutate();
    } catch {
      // Handled by hook
    }
  };

  const transformers = dts || [];

  // Summary Metrics Math
  const totalDts = transformers.length;
  const countP1 = transformers.filter((t) => t.dt_priority === 'P1').length;
  const countP2 = transformers.filter((t) => t.dt_priority === 'P2').length;
  const meanSuspicion =
    totalDts > 0
      ? transformers.reduce((acc, t) => acc + (t.dt_suspicion || 0), 0) / totalDts
      : 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-700" />
            Distribution Transformers (DTs)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Substation distribution transformer energy balance, loss ratio, and isolation forest risk scoring.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isEvaluating || isLoading}
          className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'Evaluating...' : 'Refresh DTs'}</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading distribution transformers from backend...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Transformers</h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md">{error.message}</p>
          <button
            onClick={() => mutate()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Total Transformers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalDts.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Active Feeders</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                <Cpu className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Priority P1 DTs</p>
                <p className="text-2xl font-bold text-rose-700 mt-1 font-mono">{countP1.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Critical Imbalance</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Priority P2 DTs</p>
                <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{countP2.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Moderate Loss</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Mean Suspicion Score</p>
                <p className="text-2xl font-bold text-purple-900 mt-1 font-mono">{(meanSuspicion * 100).toFixed(1)}%</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Grid Loss Average</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Ranking Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 font-sans">Transformer Suspicion Ranking</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">Click any row to inspect feeder consumers and detailed metrics.</p>
            </div>

            {transformers.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">No transformer records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Transformer ID</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Suspicion Score</th>
                      <th className="py-3 px-4">Flagged Ratio</th>
                      <th className="py-3 px-4">Loss Ratio</th>
                      <th className="py-3 px-4">IF Risk</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transformers.map((t) => (
                      <tr
                        key={t.dt_id}
                        onClick={() => router.push(`/transformers/${t.dt_id}`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/transformers/${t.dt_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-sky-700 hover:underline"
                          >
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
                          {(t.dt_suspicion * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-sans">
                          {t.flagged_count} / {t.total_count} ({(t.flagged_ratio * 100).toFixed(0)}%)
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-bold ${
                              (t.dt_loss_ratio || 0) > 0.15
                                ? 'text-rose-600'
                                : (t.dt_loss_ratio || 0) > 0.05
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {t.dt_loss_ratio !== undefined ? `${(t.dt_loss_ratio * 100).toFixed(1)}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {(t.dt_if_risk * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/transformers/${t.dt_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-sm text-[11px] font-bold transition-colors"
                          >
                            <span>Inspect DT</span>
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
