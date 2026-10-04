/**
 * app/consumers/[consNo]/page.tsx
 * Deep-dive consumer diagnostic report page presenting risk gauges, ML scores, feature breakdowns,
 * SHAP evidence visualizations, PDF generation capabilities, and JSON export.
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useScoresConsumer, useRunEvaluation } from '@/lib/hooks/useApi';
import { DownloadReportButton } from '@/components/reports/DownloadReportButton';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Download,
  ShieldAlert,
  Activity,
  Cpu,
  FileText,
  BarChart2,
  CheckCircle,
} from 'lucide-react';

export default function ConsumerDetailPage() {
  const params = useParams();
  const rawId = params?.consNo || params?.id;
  const consNo = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const { data: consumer, error, isLoading, mutate } = useScoresConsumer(consNo);
  const { trigger: runEvaluation, isMutating: isEvaluating } = useRunEvaluation();

  const handleRefresh = async () => {
    try {
      await runEvaluation();
      await mutate();
    } catch {
      // Error handled by hook
    }
  };

  const handleExportJSON = () => {
    if (!consumer) return;
    const blob = new Blob([JSON.stringify(consumer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${consumer.CONS_NO}-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group consumer.features into 4 categories
  const features = consumer?.features || {};
  const featureEntries = Object.entries(features);

  const consumptionStats: [string, unknown][] = [];
  const rollingWindows: [string, unknown][] = [];
  const dataQuality: [string, unknown][] = [];
  const anomalySignals: [string, unknown][] = [];

  featureEntries.forEach(([key, val]) => {
    const k = key.toLowerCase();
    if (k.includes('roll') || k.includes('win') || k.includes('w_') || k.includes('m3') || k.includes('m6') || k.includes('d7')) {
      rollingWindows.push([key, val]);
    } else if (k.includes('zero') || k.includes('null') || k.includes('gap') || k.includes('qual') || k.includes('missing')) {
      dataQuality.push([key, val]);
    } else if (k.includes('anomaly') || k.includes('score') || k.includes('zscore') || k.includes('if_') || k.includes('xgb') || k.includes('flag')) {
      anomalySignals.push([key, val]);
    } else {
      consumptionStats.push([key, val]);
    }
  });

  return (
    <DashboardLayout>
      {/* Top Navigation & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/consumers"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {consNo || 'Consumer Detail'}
              </h1>
              {consumer && (
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold font-sans ${
                    consumer.risk_level === 'High'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : consumer.risk_level === 'Medium'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : consumer.risk_level === 'Low'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {consumer.risk_level} Risk
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Transformer DT: <span className="font-mono font-semibold text-slate-800">{consumer?.dt_id || 'N/A'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {consumer && (
            <>
              <DownloadReportButton
                kind="consumer"
                payload={{
                  CONS_NO: consumer.CONS_NO,
                  score: consumer,
                  features: consumer.features || {},
                }}
                label="Download PDF Report"
              />

              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export JSON</span>
              </button>
            </>
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
          <p className="text-sm font-medium text-slate-600">Retrieving consumer telemetry and model scoring...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">Consumer Record Not Found</h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md">
            {error.message || `No telemetry record exists for consumer ${consNo}. Trigger evaluation to compute scores.`}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isEvaluating}
              className="px-4 py-2 bg-sky-700 text-white rounded-md text-xs font-semibold hover:bg-sky-800 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
              <span>{isEvaluating ? 'Running...' : 'Run Evaluation Now'}</span>
            </button>
            <Link
              href="/consumers"
              className="px-4 py-2 bg-white text-slate-800 border border-slate-200 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Back to Consumers
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && consumer && (
        <div className="space-y-6">
          {/* Top Summary Grid: Gauge, Specs, Model Output */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Risk Gauge Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Theft Risk Gauge
                  </h3>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    COMBINED ML
                  </span>
                </div>

                <div className="my-6 text-center">
                  <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-rose-500 bg-rose-50/50">
                    <span className="text-3xl font-bold font-mono text-rose-900">
                      {((consumer.combined_score || 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mt-0.5">
                      {consumer.risk_level || 'Normal'} Risk
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Probable Cause:</span>
                    <span className="font-semibold text-slate-800">{consumer.probable_cause || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Cause Confidence:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {consumer.cause_confidence !== undefined ? `${(consumer.cause_confidence * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Consumer Specs Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-700" />
                    Consumer Baseline Specifications
                  </h3>
                </div>

                <div className="mt-4 space-y-3 text-xs font-mono">
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-md">
                    <span className="text-slate-600 font-sans">Transformer ID</span>
                    <span className="font-bold text-slate-900">{consumer.dt_id || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-md">
                    <span className="text-slate-600 font-sans">Historical Mean Usage</span>
                    <span className="font-bold text-slate-900">
                      {consumer.historical_mean !== undefined ? `${consumer.historical_mean.toFixed(2)} kWh` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-md">
                    <span className="text-slate-600 font-sans">Current Mean Usage</span>
                    <span className="font-bold text-slate-900">
                      {consumer.current_mean !== undefined ? `${consumer.current_mean.toFixed(2)} kWh` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-md">
                    <span className="text-slate-600 font-sans">Usage Deviation %</span>
                    <span
                      className={`font-bold ${
                        (consumer.deviation_pct || 0) < -20
                          ? 'text-rose-600'
                          : (consumer.deviation_pct || 0) > 20
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {consumer.deviation_pct !== undefined ? `${consumer.deviation_pct.toFixed(1)}%` : '0.0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Output Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-700" />
                    Model Output & Classifier Status
                  </h3>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-md font-mono">
                    <span className="text-slate-600 font-sans">XGBoost Raw Score</span>
                    <span className="font-bold text-purple-900">{((consumer.xgb_score || 0) * 100).toFixed(1)}%</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-md font-mono">
                    <span className="text-slate-600 font-sans">Combined Anomaly Score</span>
                    <span className="font-bold text-slate-900">{((consumer.combined_score || 0) * 100).toFixed(1)}%</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-md">
                    <span className="text-slate-600">Predicted Flag</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        consumer.predicted_flag === 1 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {consumer.predicted_flag === 1 ? 'FLAGGED (1)' : 'NORMAL (0)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-md">
                    <span className="text-slate-600">Action Priority</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        consumer.priority === 'P1'
                          ? 'bg-rose-600 text-white'
                          : consumer.priority === 'P2'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {consumer.priority || 'P3'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Action Card */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-lg p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-sky-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-sky-900">Recommended Field Action</h3>
                <p className="text-xs text-sky-800 mt-1 font-medium leading-relaxed">
                  {consumer.recommended_action || 'Inspect meter physical seals, bypass lines, and neutral link connectivity.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-sky-900">Priority Level:</span>
              <span className="px-3 py-1 bg-sky-700 text-white font-mono font-bold text-xs rounded-md">
                {consumer.priority || 'P3'}
              </span>
            </div>
          </div>

          {/* Evidence Card & SHAP Chart */}
          {consumer.supporting_features && consumer.supporting_features.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-700" />
                    SHAP Feature Attribution & Evidence
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Feature contributions driving the machine learning anomaly flag
                  </p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {consumer.supporting_features.map((sf, idx) => {
                  const maxShap = Math.max(...consumer.supporting_features!.map((f) => Math.abs(f.shap)), 0.001);
                  const pct = Math.min(100, (Math.abs(sf.shap) / maxShap) * 100);
                  const isPositive = sf.shap >= 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-slate-800 font-semibold font-sans">
                        <span>{sf.feature}</span>
                        <span>
                          Value: <strong className="font-mono text-slate-900">{sf.value}</strong> | SHAP:{' '}
                          <strong className={isPositive ? 'text-rose-600 font-mono' : 'text-emerald-600 font-mono'}>
                            {sf.shap > 0 ? `+${sf.shap.toFixed(4)}` : sf.shap.toFixed(4)}
                          </strong>
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${isPositive ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4 Feature Tables Grouped */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                Telemetry Features Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Grouped feature metrics extracted from meter readings pipeline
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table 1: Consumption Stats */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  Consumption Statistics ({consumptionStats.length})
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <tbody className="divide-y divide-slate-100">
                      {consumptionStats.map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600 font-sans">{k}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 text-right">{String(v ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Rolling Windows */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  Rolling Windows & Trends ({rollingWindows.length})
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <tbody className="divide-y divide-slate-100">
                      {rollingWindows.map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600 font-sans">{k}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 text-right">{String(v ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 3: Data Quality */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  Data Quality & Gaps ({dataQuality.length})
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <tbody className="divide-y divide-slate-100">
                      {dataQuality.map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600 font-sans">{k}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 text-right">{String(v ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 4: Anomaly Signals */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  Anomaly Signals & Z-Scores ({anomalySignals.length})
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <tbody className="divide-y divide-slate-100">
                      {anomalySignals.map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600 font-sans">{k}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 text-right">{String(v ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
