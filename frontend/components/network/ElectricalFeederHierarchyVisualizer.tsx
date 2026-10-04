'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Transformer } from '@/types/grid';
import { transformers as defaultTransformers } from '@/data/transformers';
import { feederF001 } from '@/data/feeders';
import { RiskBadge } from '@/components/dashboard/RiskBadge';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  Users,
  Zap,
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Info,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';

// Custom SVG Transmission Tower (Pylon) Icon
export const TransmissionTowerIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Pylon Lattice Structure */}
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
    {/* Cross arms */}
    <path d="M8 26H56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M14 38H50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 50H46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Cross Bracing */}
    <path d="M22 22L42 38M42 22L22 38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />
    <path d="M17 38L47 50M47 38L17 50" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />
    <path d="M14 50L50 60M50 50L14 60" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.7" />
    {/* Insulators */}
    <circle cx="8" cy="29" r="2" fill="currentColor" />
    <circle cx="56" cy="29" r="2" fill="currentColor" />
    <circle cx="32" cy="12" r="2" fill="currentColor" />
  </svg>
);

// Custom SVG Distribution Transformer (Pole-mounted Drum / Bushing Unit) Icon
export const DistributionTransformerIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Main Cylinder Tank Body */}
    <rect x="18" y="20" width="28" height="34" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" />
    {/* Top Cap */}
    <rect x="16" y="16" width="32" height="6" rx="2" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.2" />
    {/* Cooling Fins / Radiators */}
    <path d="M14 26V48M10 30V44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 26V48M54 30V44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* High Voltage Bushings (Top Terminals) */}
    <path d="M24 16V8M32 16V6M40 16V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="6" r="2.5" fill="currentColor" />
    <circle cx="32" cy="4" r="2.5" fill="currentColor" />
    <circle cx="40" cy="6" r="2.5" fill="currentColor" />
    {/* Grounding / Oil Level Gauge */}
    <circle cx="32" cy="36" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M32 34V38" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

interface FeederVisualizerProps {
  transformers?: Transformer[];
}

export const ElectricalFeederHierarchyVisualizer: React.FC<FeederVisualizerProps> = ({
  transformers = defaultTransformers,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>('DT-02');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ANOMALOUS' | 'NORMAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransformers = transformers.filter((dt) => {
    const matchesSearch =
      dt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dt.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'ANOMALOUS') return dt.riskLevel === 'High' || dt.riskLevel === 'Critical' || dt.status === 'Warning';
    if (filterMode === 'NORMAL') return dt.riskLevel === 'Low' || dt.status === 'Online';
    return true;
  });

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
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Electrical Feeder Hierarchy Visualizer
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                11.0 kV Distribution Feeder F001 • Substation Alpha Topology & Transformer Spec Grid
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Filter Mode Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="relative w-48 hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter DT node..."
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
                {mode === 'ALL' ? 'All Nodes' : mode === 'ANOMALOUS' ? 'Anomalous Only' : 'Normal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Root Node Card: Feeder F001 (Clean High-Density Enterprise Utility Header) */}
      <div className="relative bg-slate-900 text-white rounded-md p-5 shadow-xs overflow-hidden border border-slate-800">
        {/* Vector Background Graphic */}
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
                  <span>Primary Feeder F001</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Substation Alpha (132/11 kV Grid)
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
              <span className="px-2.5 py-1 bg-slate-800 text-sky-300 border border-slate-700 rounded-md font-bold">
                11.0 kV Busbar
              </span>
              <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-md font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Nominal Voltage
              </span>
            </div>
          </div>

          {/* Technical Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-md">
              <span className="text-[10px] font-sans uppercase text-slate-400 font-semibold block">Connected Load</span>
              <div className="text-sm font-bold text-white mt-0.5">{feederF001.currentLoadKW} kW</div>
              <span className="text-[10px] text-sky-400 font-sans mt-0.5 block">84.5% Rating</span>
            </div>

            <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-md">
              <span className="text-[10px] font-sans uppercase text-slate-400 font-semibold block">Delivered Energy</span>
              <div className="text-sm font-bold text-white mt-0.5">{feederF001.totalEnergyKWh.toLocaleString()} kWh</div>
              <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">Bulk Feeder Meter</span>
            </div>

            <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-md">
              <span className="text-[10px] font-sans uppercase text-slate-400 font-semibold block">Connected DTs</span>
              <div className="text-sm font-bold text-white mt-0.5">{feederF001.totalTransformers} Nodes</div>
              <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">3 x 100 kVA Units</span>
            </div>

            <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-md">
              <span className="text-[10px] font-sans uppercase text-slate-400 font-semibold block">Monitored Users</span>
              <div className="text-sm font-bold text-white mt-0.5">{feederF001.totalConsumers} Endpoints</div>
              <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">50 Users / DT</span>
            </div>

            <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-md">
              <span className="text-[10px] font-sans uppercase text-slate-400 font-semibold block">Technical Loss</span>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{feederF001.totalLossPercentage}%</div>
              <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">Impedance Loss</span>
            </div>

            <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-md">
              <span className="text-[10px] font-sans uppercase text-rose-300 font-semibold block">Unexplained Loss</span>
              <div className="text-sm font-bold text-rose-400 mt-0.5">{feederF001.unexplainedLossPercentage}%</div>
              <span className="text-[10px] text-rose-300 font-sans mt-0.5 block">Unaccounted Delta</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Vector Line Connector Topology */}
      <div className="relative py-2 hidden md:block">
        <svg className="w-full h-14 overflow-visible" preserveAspectRatio="none" viewBox="0 0 900 50">
          {/* Root Feed line down */}
          <line x1="450" y1="0" x2="450" y2="18" stroke="#0284c7" strokeWidth="2.5" />
          <circle cx="450" cy="18" r="3.5" fill="#0284c7" />

          {/* Horizontal Split Bus line */}
          <line x1="150" y1="18" x2="750" y2="18" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Branch Line 1: To DT-01 (Normal) */}
          <path d="M450 18 L150 18 L150 50" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="5 5" className="animate-[dash_15s_linear_infinite]" />

          {/* Branch Line 2: To DT-02 (Anomalous Flow) */}
          <path d="M450 18 L450 50" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeDasharray="5 5" className="animate-[dash_8s_linear_infinite]" />

          {/* Branch Line 3: To DT-03 (Normal) */}
          <path d="M450 18 L750 18 L750 50" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="5 5" className="animate-[dash_15s_linear_infinite]" />
        </svg>

        <style jsx>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -100;
            }
          }
        `}</style>
      </div>

      {/* Grid of Transformer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredTransformers.map((dt) => {
          const isHighLoss = dt.riskLevel === 'High' || dt.riskLevel === 'Critical' || dt.status === 'Warning';
          const isSelected = selectedNode === dt.id;

          return (
            <div
              key={dt.id}
              onClick={() => setSelectedNode(isSelected ? null : dt.id)}
              className={`group relative bg-white border rounded-md p-5 shadow-2xs transition-all duration-150 cursor-pointer ${
                isHighLoss
                  ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/10'
                  : isSelected
                  ? 'border-sky-500 ring-1 ring-sky-500'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Connector line node dot */}
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-400 hidden md:block" />

              {/* Status Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-md border ${
                      isHighLoss
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    <DistributionTransformerIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      {dt.feederId} Node
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors font-mono">
                      {dt.id}
                    </h3>
                  </div>
                </div>

                <StatusBadge status={dt.status} />
              </div>

              <p className="text-xs text-slate-500 font-medium mb-3">
                {dt.name} • {dt.location}
              </p>

              {/* Technical Specs Summary Box */}
              <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-md border border-slate-200/90 mb-4 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Rated Capacity:</span>
                  <span className="font-bold text-slate-900">{dt.capacityKVA} kVA</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Consumer Endpoints:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 font-sans">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {dt.consumerCount} users
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Bulk Input Energy:</span>
                  <span className="text-slate-800">{dt.inputEnergyKWh.toLocaleString()} kWh</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Accounted Usage:</span>
                  <span className="text-slate-800">{dt.consumerUsageKWh.toLocaleString()} kWh</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-sans font-medium">Unexplained Loss:</span>
                  <span className={`font-bold font-mono text-xs ${isHighLoss ? 'text-rose-600' : 'text-slate-700'}`}>
                    {dt.unexplainedLossKWh.toLocaleString()} kWh
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-sans font-medium">Loss Ratio:</span>
                  <span className={`text-xs font-bold font-mono ${isHighLoss ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {dt.lossPercentage}%
                  </span>
                </div>
              </div>

              {/* Anomalous Notice Banner */}
              {isHighLoss && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 mb-4 flex items-center justify-between font-sans">
                  <span className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    8 suspicious consumers flagged
                  </span>
                  <span className="font-mono text-[11px] font-bold">1,300 kWh Unmetered</span>
                </div>
              )}

              {/* Interactive Expander Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  {isSelected ? 'Hide Cluster Breakdown' : 'Show Cluster Breakdown'}
                  {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>

                <Link
                  href={`/transformers/${dt.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Expanded Cluster Breakdown Section */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-mono">
                    <span>Connected Clusters ({dt.id})</span>
                    <span>50 Total Users</span>
                  </div>

                  <div className="space-y-1.5 text-xs font-sans">
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-bold text-rose-950">Cluster A (18 consumers)</div>
                        <div className="text-[10px] text-rose-700">Persistent drop pattern</div>
                      </div>
                      <span className="font-mono font-bold text-rose-700 text-xs">Avg dev −62%</span>
                    </div>

                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-bold text-amber-950">Cluster B (7 consumers)</div>
                        <div className="text-[10px] text-amber-700">Moderate drop pattern</div>
                      </div>
                      <span className="font-mono font-bold text-amber-800 text-xs">Avg dev −48%</span>
                    </div>

                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">Remaining Consumers (25 users)</div>
                        <div className="text-[10px] text-slate-500">Normal historical baseline</div>
                      </div>
                      <span className="font-mono font-bold text-slate-600 text-xs">Normal</span>
                    </div>
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
