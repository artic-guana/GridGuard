'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ElectricalFeederHierarchyVisualizer } from '@/components/network/ElectricalFeederHierarchyVisualizer';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  Network,
  Database,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// ------------------------------------------------------------
// Physical constants (documented, not magic numbers)
// ------------------------------------------------------------
// Typical distribution transformer technical loss baseline.
// Reference: CEA India distribution loss benchmarks (3–6%).
const TECHNICAL_LOSS_FRACTION = 0.03;

// UI tone thresholds — these are presentation decisions, not data.
const THRESHOLDS = {
  suspicionDanger: 0.60,
  lossRatioWarn:   1.10,
  lossRatioDanger: 1.15,
};

// ------------------------------------------------------------
// Types — what the API returns
// ------------------------------------------------------------
interface DTScore {
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

interface ConsumerScore {
  CONS_NO: string;
  dt_id?: string;
  combined_score: number;
  predicted_flag: number;
  probable_cause?: string;
  priority?: string;
}

// ------------------------------------------------------------
// Type — what the visualizer expects
// ------------------------------------------------------------
interface VisualizerTransformer {
  id: string;
  name: string;
  capacity: string;
  status: string;
  consumers: number;
  suspicion: number;
  priority: string;
  flagged: number;
  lossRatio: number;

  inputEnergyKWh: number;
  outputEnergyKWh: number;
  consumerUsageKWh: number;
  unexplainedLossKWh: number;

  technicalLossKWh: number;
  technicalLossPercentage: number;
  unexplainedLossPercentage: number;
  loadPercentage: number;
}

// ------------------------------------------------------------
// Adapter
// ------------------------------------------------------------
function toVisualizerTransformer(dt: DTScore): VisualizerTransformer {
  const meanPower   = Number(dt.dt_mean_power ?? 0);
  const lossRatio   = Number(dt.dt_loss_ratio ?? 1.0);
  const suspicion   = Number(dt.dt_suspicion ?? 0);
  const totalCount  = Number(dt.total_count ?? 0);
  const flaggedCount = Number(dt.flagged_count ?? 0);

  // Energy over a 24-hour day
  const inputEnergyKWh = meanPower * 24;

  // loss_ratio = input / consumer_sum  →  consumer_sum = input / loss_ratio
  const consumerUsageKWh =
    lossRatio > 0 ? inputEnergyKWh / lossRatio : inputEnergyKWh;
  const outputEnergyKWh = consumerUsageKWh;

  // Total loss = input − consumer usage (never negative)
  const totalLossKWh = Math.max(0, inputEnergyKWh - consumerUsageKWh);

  // Technical baseline loss is a fixed fraction of input
  const technicalLossKWh = inputEnergyKWh * TECHNICAL_LOSS_FRACTION;

  // Unexplained = total loss minus the expected technical portion
  const unexplainedLossKWh = Math.max(0, totalLossKWh - technicalLossKWh);

  // Percentages relative to input
  const technicalLossPercentage = TECHNICAL_LOSS_FRACTION * 100;
  const unexplainedLossPercentage =
    inputEnergyKWh > 0
      ? (unexplainedLossKWh / inputEnergyKWh) * 100
      : 0;

  const loadPercentage = Math.round(suspicion * 100);

  const status =
    dt.dt_priority === 'P1'
      ? 'Critical'
      : dt.dt_priority === 'P2'
      ? 'Warning'
      : 'Online';

  return {
    id: dt.dt_id,
    name: dt.dt_id,
    capacity: `${totalCount} endpoints`,
    status,
    consumers: totalCount,
    suspicion,
    priority: dt.dt_priority,
    flagged: flaggedCount,
    lossRatio,

    inputEnergyKWh: Math.round(inputEnergyKWh),
    outputEnergyKWh: Math.round(outputEnergyKWh),
    consumerUsageKWh: Math.round(consumerUsageKWh),
    unexplainedLossKWh: Math.round(unexplainedLossKWh),

    technicalLossKWh: Math.round(technicalLossKWh),
    technicalLossPercentage:
      Math.round(technicalLossPercentage * 10) / 10,
    unexplainedLossPercentage:
      Math.round(unexplainedLossPercentage * 10) / 10,
    loadPercentage,
  };
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------
export default function NetworkPage() {
  const [dts, setDts] = useState<DTScore[]>([]);
  const [consumers, setConsumers] = useState<ConsumerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState('');

  // ------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dtRes, consRes, sumRes] = await Promise.all([
        fetch('/api/backend/api/v1/scores/dts', { cache: 'no-store' }),
        fetch('/api/backend/api/v1/scores/consumers?n=5000', {
          cache: 'no-store',
        }),
        fetch('/api/backend/api/v1/scores/summary', { cache: 'no-store' }),
      ]);

      if (dtRes.status === 404) {
        setDts([]);
        setConsumers([]);
        setLoading(false);
        return;
      }
      if (!dtRes.ok) throw new Error(`API ${dtRes.status}`);

      setDts(await dtRes.json());
      if (consRes.ok) setConsumers(await consRes.json());
      if (sumRes.ok) {
        const s = await sumRes.json();
        setComputedAt(s.computed_at ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load topology');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/backend/api/v1/admin/run-evaluation', {
        method: 'POST',
      });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  // ------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------
  const visualizerData = dts.map(toVisualizerTransformer);

  const totalDts         = dts.length;
  const totalConsumers   = dts.reduce((sum, d) => sum + Number(d.total_count ?? 0), 0);
  const flaggedConsumers = dts.reduce((sum, d) => sum + Number(d.flagged_count ?? 0), 0);
  const suspiciousDts    = dts.filter((d) => d.dt_priority === 'P1').length;

  const avgSuspicion =
    totalDts > 0
      ? dts.reduce((s, d) => s + Number(d.dt_suspicion ?? 0), 0) / totalDts
      : 0;

  const avgLossRatio =
    totalDts > 0
      ? dts.reduce((s, d) => s + Number(d.dt_loss_ratio ?? 0), 0) / totalDts
      : 0;

  const maxSuspicion =
    totalDts > 0
      ? Math.max(...dts.map((d) => Number(d.dt_suspicion ?? 0)), 0)
      : 0;

  const maxLossRatio =
    totalDts > 0
      ? Math.max(...dts.map((d) => Number(d.dt_loss_ratio ?? 0)), 0)
      : 0;

  const topSuspicionDt =
    totalDts > 0
      ? dts.reduce((a, b) =>
          Number(a.dt_suspicion ?? 0) > Number(b.dt_suspicion ?? 0) ? a : b
        )
      : null;

  const topLossDt =
    totalDts > 0
      ? dts.reduce((a, b) =>
          Number(a.dt_loss_ratio ?? 0) > Number(b.dt_loss_ratio ?? 0) ? a : b
        )
      : null;

  // Display loss ratios as excess percentages, not raw ratios
  const avgLossPct = Math.max(0, (avgLossRatio - 1) * 100);
  const maxLossPct = Math.max(0, (maxLossRatio - 1) * 100);

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-700" />
            Network Topology & Transformer Visualizer
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {loading
              ? 'Loading…'
              : computedAt
              ? `Last computed ${new Date(computedAt).toLocaleString()} · ${totalDts} transformers · ${totalConsumers} consumers`
              : 'Distribution transformer network overview.'}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {refreshing ? 'Running pipeline…' : 'Refresh'}
        </button>
      </div>

      {/* Loading */}
      {loading && dts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading network topology…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-red-800 text-sm">
          <p className="font-semibold mb-1">Failed to load network data</p>
          <p className="text-red-600 text-xs">{error}</p>
          <button
            onClick={load}
            className="mt-3 px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && dts.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
          <p className="text-sm text-slate-500 font-medium">
            No transformer data available.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Click Refresh to run the pipeline.
          </p>
        </div>
      )}

      {/* Visualizer */}
      {!loading && !error && dts.length > 0 && (
        <ElectricalFeederHierarchyVisualizer transformers={visualizerData} />
      )}

      {/* Metrics */}
      {!loading && !error && dts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
          {/* Network summary */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 font-mono">
                <Database className="w-4 h-4 text-sky-700" />
                Distribution Network Summary
              </h3>
              <StatusBadge status={suspiciousDts > 0 ? 'Warning' : 'Online'} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <Stat label="Distribution Transformers" value={`${totalDts}`} />
              <Stat label="Smart Meters Monitored" value={`${totalConsumers}`} />
              <Stat
                label="Flagged Consumers"
                value={`${flaggedConsumers}`}
                tone={flaggedConsumers > 0 ? 'warn' : 'default'}
              />
              <Stat
                label="Suspicious Transformers"
                value={`${suspiciousDts}`}
                tone={suspiciousDts > 0 ? 'danger' : 'default'}
              />
              <Stat label="Average Suspicion" value={avgSuspicion.toFixed(3)} />
              <Stat
                label="Peak Suspicion"
                value={maxSuspicion.toFixed(3)}
                tone={maxSuspicion > THRESHOLDS.suspicionDanger ? 'danger' : 'default'}
              />
            </div>
          </div>

          {/* Loss breakdown */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 font-mono">
                <BarChart3 className="w-4 h-4 text-sky-700" />
                Transformer Loss Breakdown
              </h3>
              <span className="text-[10px] font-mono font-semibold text-slate-500">
                {computedAt
                  ? new Date(computedAt).toLocaleDateString()
                  : 'Latest run'}
              </span>
            </div>

            <div className="space-y-2 text-xs font-sans">
              <Row
                label="Average excess loss"
                value={`${avgLossPct.toFixed(1)}%`}
                tone={avgLossPct > 10 ? 'warn' : 'default'}
              />
              <Row
                label="Peak excess loss"
                value={`${maxLossPct.toFixed(1)}%`}
                tone={maxLossPct > 15 ? 'danger' : 'default'}
              />
              <Row
                label="Total consumers flagged"
                value={`${flaggedConsumers} / ${totalConsumers}`}
              />
              <Row
                label="Highest-suspicion transformer"
                value={topSuspicionDt ? topSuspicionDt.dt_id : '—'}
              />
              <Row
                label="Highest loss transformer"
                value={topLossDt ? topLossDt.dt_id : '—'}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ------------------------------------------------------------
// Small components
// ------------------------------------------------------------
function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const color =
    tone === 'danger'
      ? 'text-rose-700'
      : tone === 'warn'
      ? 'text-amber-700'
      : 'text-slate-900';

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
      <span className="text-[10px] font-sans text-slate-500 font-semibold uppercase block">
        {label}
      </span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const cls =
    tone === 'danger'
      ? 'bg-rose-50 border-rose-200 text-rose-900'
      : tone === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-slate-50 border-slate-200 text-slate-900';

  return (
    <div className={`flex justify-between p-2.5 border rounded-md ${cls}`}>
      <span>{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}