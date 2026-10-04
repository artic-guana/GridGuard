'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  Users,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react';

// ------------------------------------------------------------
// SVG Icons
// ------------------------------------------------------------
export const TransmissionTowerIcon: React.FC<{ className?: string }> = ({
  className = 'w-6 h-6',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M32 4L22 22H42L32 4Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M22 22L12 60H52L42 22"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M8 26H56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M14 38H50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 50H46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M22 22L42 38M42 22L22 38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />
    <path d="M17 38L47 50M47 38L17 50" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />
    <path d="M14 50L50 60M50 50L14 60" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />
    <circle cx="8" cy="29" r="2" fill="currentColor" />
    <circle cx="56" cy="29" r="2" fill="currentColor" />
    <circle cx="32" cy="12" r="2" fill="currentColor" />
  </svg>
);

export const DistributionTransformerIcon: React.FC<{ className?: string }> = ({
  className = 'w-6 h-6',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="18" y="20" width="28" height="34" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" />
    <rect x="16" y="16" width="32" height="6" rx="2" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
    <path d="M14 26V48M10 30V44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 26V48M54 30V44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 16V8M32 16V6M40 16V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="6" r="2.5" fill="currentColor" />
    <circle cx="32" cy="4" r="2.5" fill="currentColor" />
    <circle cx="40" cy="6" r="2.5" fill="currentColor" />
    <circle cx="32" cy="36" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M32 34V38" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// ------------------------------------------------------------
// Props — matches the adapter output in app/network/page.tsx
// ------------------------------------------------------------
export interface VisualizerTransformer {
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

interface FeederVisualizerProps {
  transformers: VisualizerTransformer[];
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export const ElectricalFeederHierarchyVisualizer: React.FC<
  FeederVisualizerProps
> = ({ transformers }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ANOMALOUS' | 'NORMAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ------------------------------------------------------------
  // Filtering
  // ------------------------------------------------------------
  const filteredTransformers = useMemo(() => {
    return transformers.filter((dt) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        dt.id.toLowerCase().includes(q) ||
        dt.name.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const isAnomalous = dt.priority === 'P1' || dt.priority === 'P2';
      if (filterMode === 'ANOMALOUS') return isAnomalous;
      if (filterMode === 'NORMAL')    return !isAnomalous;
      return true;
    });
  }, [transformers, searchQuery, filterMode]);

  // ------------------------------------------------------------
  // Aggregate metrics derived from prop
  // ------------------------------------------------------------
  const aggregate = useMemo(() => {
    const total = transformers.length;
    if (total === 0) {
      return {
        totalDts: 0,
        totalConsumers: 0,
        totalFlagged: 0,
        totalInputKWh: 0,
        totalConsumerKWh: 0,
        totalUnexplainedKWh: 0,
        avgTechnicalLoss: 0,
        avgUnexplainedLossPct: 0,
        suspiciousDts: 0,
        criticalDts: 0,
      };
    }

    const totalConsumers     = transformers.reduce((s, d) => s + d.consumers, 0);
    const totalFlagged       = transformers.reduce((s, d) => s + d.flagged, 0);
    const totalInputKWh      = transformers.reduce((s, d) => s + d.inputEnergyKWh, 0);
    const totalConsumerKWh   = transformers.reduce((s, d) => s + d.consumerUsageKWh, 0);
    const totalUnexplainedKWh = transformers.reduce((s, d) => s + d.unexplainedLossKWh, 0);
    const avgTechnicalLoss   =
      transformers.reduce((s, d) => s + d.technicalLossPercentage, 0) / total;
    const avgUnexplainedLossPct =
      transformers.reduce((s, d) => s + d.unexplainedLossPercentage, 0) / total;

    const suspiciousDts = transformers.filter((d) => d.priority === 'P1').length;
    const criticalDts   = transformers.filter((d) => d.priority === 'P1' || d.priority === 'P2').length;

    return {
      totalDts: total,
      totalConsumers,
      totalFlagged,
      totalInputKWh,
      totalConsumerKWh,
      totalUnexplainedKWh,
      avgTechnicalLoss,
      avgUnexplainedLossPct,
      suspiciousDts,
      criticalDts,
    };
  }, [transformers]);

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
              <TransmissionTowerIcon className="w-6 h-6 text-sky-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Distribution Network Visualizer
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {aggregate.totalDts} transformers · {aggregate.totalConsumers} monitored endpoints
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="relative w-48 hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter DT node…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden font-mono"
            />
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-mono">
            {(['ALL', 'ANOMALOUS', 'NORMAL'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                  filterMode === mode
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {mode === 'ALL' ? 'All Nodes' : mode === 'ANOMALOUS' ? 'Anomalous' : 'Normal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Network Summary Card (was the feeder card) */}
      <div className="relative bg-slate-900 text-white rounded-md p-5 shadow-xs overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none pr-6 flex items-center">
          <TransmissionTowerIcon className="w-44 h-44 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-md text-sky-400">
                <TransmissionTowerIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Distribution Network</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    aggregate.suspiciousDts > 0 ? 'bg-rose-400' : 'bg-emerald-400'
                  }`} />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {aggregate.totalDts} Active Transformers
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
              <span className={`px-2.5 py-1 rounded-md font-bold border ${
                aggregate.suspiciousDts > 0
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${
                  aggregate.suspiciousDts > 0 ? 'bg-rose-400' : 'bg-emerald-400'
                }`} />
                {aggregate.suspiciousDts > 0
                  ? `${aggregate.suspiciousDts} suspicious`
                  : 'All nominal'}
              </span>
            </div>
          </div>

          {/* Derived summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            <SummaryTile
              label="Total Consumers"
              value={`${aggregate.totalConsumers}`}
              sub={`${aggregate.totalDts} transformers`}
            />
            <SummaryTile
              label="Total Input"
              value={`${aggregate.totalInputKWh.toLocaleString()}`}
              sub="kWh/day"
            />
            <SummaryTile
              label="Accounted Usage"
              value={`${aggregate.totalConsumerKWh.toLocaleString()}`}
              sub="kWh/day"
            />
            <SummaryTile
              label="Flagged"
              value={`${aggregate.totalFlagged}`}
              sub={`${aggregate.totalConsumers} total`}
              accent={aggregate.totalFlagged > 0 ? 'warn' : 'default'}
            />
            <SummaryTile
              label="Technical Loss"
              value={`${aggregate.avgTechnicalLoss.toFixed(1)}%`}
              sub="avg impedance"
              accent="good"
            />
            <SummaryTile
              label="Unexplained Loss"
              value={`${aggregate.avgUnexplainedLossPct.toFixed(1)}%`}
              sub={`${aggregate.totalUnexplainedKWh.toLocaleString()} kWh`}
              accent={aggregate.avgUnexplainedLossPct > 10 ? 'danger' : 'default'}
            />
          </div>
        </div>
      </div>

      {/* Transformer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredTransformers.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-slate-500">
            No transformers match the current filter.
          </div>
        )}

        {filteredTransformers.map((dt) => {
          const isAnomalous =
            dt.priority === 'P1' || dt.priority === 'P2';
          const isSelected = selectedNode === dt.id;

          return (
            <div
              key={dt.id}
              onClick={() => setSelectedNode(isSelected ? null : dt.id)}
              className={`group relative bg-white border rounded-md p-5 shadow-2xs transition-all duration-150 cursor-pointer ${
                isAnomalous
                  ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/10'
                  : isSelected
                  ? 'border-sky-500 ring-1 ring-sky-500'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Status Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-md border ${
                      isAnomalous
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    <DistributionTransformerIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      Priority {dt.priority}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors font-mono">
                      {dt.id}
                    </h3>
                  </div>
                </div>

                <StatusBadge status={dt.status} />
              </div>

              {/* Specs box */}
              <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-md border border-slate-200/90 mb-4 font-mono">
                <SpecRow
                  label="Consumer endpoints"
                  value={
                    <span className="flex items-center gap-1 font-sans">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {dt.consumers} users
                    </span>
                  }
                />
                <SpecRow
                  label="Bulk input"
                  value={`${dt.inputEnergyKWh.toLocaleString()} kWh`}
                />
                <SpecRow
                  label="Accounted usage"
                  value={`${dt.consumerUsageKWh.toLocaleString()} kWh`}
                />
                <SpecRow
                  label="Unexplained loss"
                  value={`${dt.unexplainedLossKWh.toLocaleString()} kWh`}
                  highlight={isAnomalous ? 'danger' : 'default'}
                  border
                />
                <SpecRow
                  label="Unexplained loss %"
                  value={`${dt.unexplainedLossPercentage.toFixed(1)}%`}
                  highlight={isAnomalous ? 'danger' : 'good'}
                />
                <SpecRow
                  label="Suspicion"
                  value={dt.suspicion.toFixed(3)}
                  highlight={dt.suspicion > 0.6 ? 'danger' : 'default'}
                />
              </div>

              {/* Flagged banner — only when there are flagged consumers */}
              {dt.flagged > 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 mb-4 flex items-center justify-between font-sans">
                  <span className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    {dt.flagged} flagged consumer{dt.flagged === 1 ? '' : 's'}
                  </span>
                  <span className="font-mono text-[11px] font-bold">
                    {dt.unexplainedLossKWh.toLocaleString()} kWh lost
                  </span>
                </div>
              )}

              {/* Expander footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  {isSelected ? 'Hide breakdown' : 'Show breakdown'}
                  {isSelected ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>

                <Link
                  href={`/transformers/${dt.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Expanded details — derived, not hardcoded */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-mono">
                    <span>{dt.id} — Derived Metrics</span>
                    <span>{dt.consumers} endpoints</span>
                  </div>

                  <div className="space-y-1.5 text-xs font-sans">
                    <InsightRow
                      tone={dt.flagged > 0 ? 'danger' : 'default'}
                      label="Flagged consumers"
                      detail={`${dt.flagged} of ${dt.consumers} (${(
                        (dt.flagged / Math.max(dt.consumers, 1)) * 100
                      ).toFixed(1)}%)`}
                      value={`${dt.flagged}`}
                    />
                    <InsightRow
                      tone={dt.unexplainedLossPercentage > 10 ? 'warn' : 'default'}
                      label="Unexplained loss"
                      detail={`Technical baseline ${dt.technicalLossPercentage.toFixed(1)}%`}
                      value={`${dt.unexplainedLossPercentage.toFixed(1)}%`}
                    />
                    <InsightRow
                      tone="default"
                      label="Transformer load"
                      detail={`Suspicion score ${dt.suspicion.toFixed(3)}`}
                      value={`${dt.loadPercentage}%`}
                    />
                    <InsightRow
                      tone="default"
                      label="Energy balance"
                      detail={`${dt.inputEnergyKWh.toLocaleString()} kWh in / ${dt.consumerUsageKWh.toLocaleString()} kWh out`}
                      value={`${dt.lossRatio.toFixed(3)}`}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href={`/transformers/${dt.id}`}
                      className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-md text-xs font-bold transition-colors"
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      Open full transformer report
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------
function SummaryTile({
  label,
  value,
  sub,
  accent = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'default' | 'warn' | 'danger' | 'good';
}) {
  const valueColor =
    accent === 'danger'
      ? 'text-rose-400'
      : accent === 'warn'
      ? 'text-amber-400'
      : accent === 'good'
      ? 'text-emerald-400'
      : 'text-white';

  return (
    <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-md">
      <span className="text-[10px] font-sans uppercase text-slate-400 font-semibold block">
        {label}
      </span>
      <div className={`text-sm font-bold mt-0.5 ${valueColor}`}>{value}</div>
      {sub && <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">{sub}</span>}
    </div>
  );
}

function SpecRow({
  label,
  value,
  highlight = 'default',
  border = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: 'default' | 'danger' | 'good';
  border?: boolean;
}) {
  const valueColor =
    highlight === 'danger'
      ? 'text-rose-600'
      : highlight === 'good'
      ? 'text-emerald-700'
      : 'text-slate-800';

  return (
    <div className={`flex justify-between items-center ${border ? 'pt-2 border-t border-slate-200' : ''}`}>
      <span className="text-slate-500 font-sans">{label}:</span>
      <span className={`font-bold font-mono ${valueColor}`}>{value}</span>
    </div>
  );
}

function InsightRow({
  label,
  detail,
  value,
  tone = 'default',
}: {
  label: string;
  detail: string;
  value: string;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const cls =
    tone === 'danger'
      ? 'bg-rose-50 border-rose-200 text-rose-950'
      : tone === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-950'
      : 'bg-slate-50 border-slate-200 text-slate-800';

  return (
    <div className={`p-2 border rounded-md flex items-center justify-between ${cls}`}>
      <div>
        <div className="font-bold">{label}</div>
        <div className="text-[10px] opacity-80">{detail}</div>
      </div>
      <span className="font-mono font-bold text-xs">{value}</span>
    </div>
  );
}