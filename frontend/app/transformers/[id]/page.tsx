/**
 * app/transformers/[id]/page.tsx
 * Distribution Transformer detail page showing DT health metrics, attached consumer inventory,
 * and PDF diagnostic report download capability.
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useScoresDTs, useScoresConsumers, useRunEvaluation } from '@/lib/hooks/useApi';
import { DownloadReportButton } from '@/components/reports/DownloadReportButton';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export default function TransformerDetailPage() {
  const params = useParams();
  const dtId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const { data: dts, error: dtError, isLoading: dtLoading, mutate: mutateDTs } = useScoresDTs();
  const { data: consumers, error: consError, isLoading: consLoading, mutate: mutateConsumers } = useScoresConsumers(5000);
  const { trigger: runEvaluation, isMutating: isEvaluating } = useRunEvaluation();

  const handleRefresh = async () => {
    try {
      await runEvaluation();
      await mutateDTs();
      await mutateConsumers();
    } catch {
      // Error handled by hook
    }
  };

  const isLoading = dtLoading || consLoading;
  const error = dtError || consError;

  const dt = (dts || []).find((t) => t.dt_id === dtId);
  const dtConsumers = (consumers || []).filter((c) => c.dt_id === dtId);

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/transformers"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
                <Cpu className="w-6 h-6 text-emerald-700" />
                {dtId || 'DT Detail'}
              </h1>
              {dt && (
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold font-sans ${
                    dt.dt_priority === 'P1'
                      ? 'bg-rose-600 text-white'
                      : dt.dt_priority === 'P2'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {dt.dt_priority} Priority
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Distribution Transformer Feeder Node Analysis
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {dt && (
            <DownloadReportButton
              kind="transformer"
              payload={{
                dt,
                consumers: dtConsumers,
              }}
              label="Download DT PDF Report"
            />
          )}

          <button
            onClick={handleRefresh}
            disabled={isEvaluating || isLoading}
            className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading transformer telemetry and consumer endpoints...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Transformer Record</h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md">{error.message}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
            >
              Retry
            </button>
            <Link
              href="/transformers"
              className="px-4 py-2 bg-white text-slate-800 border border-slate-200 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Back to DT List
            </Link>
          </div>
        </div>
      )}

      {/* Empty State / Not Found */}
      {!isLoading && !error && !dt && (
        <div className="p-12 bg-white border border-slate-200 rounded-lg text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Transformer Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">No transformer matching ID &quot;{dtId}&quot; exists in evaluation store.</p>
          <Link
            href="/transformers"
            className="mt-4 inline-block px-4 py-2 bg-sky-700 text-white rounded-md text-xs font-semibold hover:bg-sky-800 transition-colors shadow-2xs"
          >
            Back to DT List
          </Link>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && dt && (
        <div className="space-y-6">
          {/* DT Metrics Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Suspicion Score</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{(dt.dt_suspicion * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Aggregated Loss Score</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Isolation Forest Risk</p>
              <p className="text-2xl font-bold text-purple-900 mt-1 font-mono">{(dt.dt_if_risk * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Max: {(dt.dt_if_risk_max * 100).toFixed(1)}%</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Loss Ratio</p>
              <p
                className={`text-2xl font-bold mt-1 font-mono ${
                  (dt.dt_loss_ratio || 0) > 0.15 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {dt.dt_loss_ratio !== undefined ? `${(dt.dt_loss_ratio * 100).toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Energy Discrepancy</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Flagged Ratio</p>
              <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{(dt.flagged_ratio * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {dt.flagged_count} of {dt.total_count} consumers
              </p>
            </div>
          </div>

          {/* Connected Consumer Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Connected Consumers ({dtConsumers.length})</h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Consumers served by transformer {dtId}</p>
              </div>
            </div>

            {dtConsumers.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No consumers associated with transformer {dtId} in score database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Consumer</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Combined Score</th>
                      <th className="py-3 px-4">Deviation %</th>
                      <th className="py-3 px-4">Probable Cause</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dtConsumers.map((c) => (
                      <tr key={c.CONS_NO} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/consumers/${c.CONS_NO}`} className="font-bold text-sky-700 hover:underline">
                            {c.CONS_NO}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {(c.combined_score * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-bold ${
                              (c.deviation_pct || 0) < -20 ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {c.deviation_pct !== undefined ? `${c.deviation_pct.toFixed(1)}%` : '0.0%'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-sans text-[11px]">
                          {c.probable_cause || 'Unclassified'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-sans ${
                              c.priority === 'P1'
                                ? 'bg-rose-600 text-white'
                                : c.priority === 'P2'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {c.priority || 'P3'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/consumers/${c.CONS_NO}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-sm text-[11px] font-bold transition-colors"
                          >
                            <span>Inspect</span>
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
