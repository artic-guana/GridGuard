/**
 * app/consumers/page.tsx
 * Paginated consumer database with client-side filtering.
 */

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useScoresConsumers, useRunEvaluation } from '@/lib/hooks/useApi';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// ------------------------------------------------------------
// Priority helpers — API returns full strings
// ------------------------------------------------------------
const PRIORITY_OPTIONS = [
  { value: 'P1 - Immediate inspection', label: 'P1 · Immediate' },
  { value: 'P2 - Schedule within 1 week', label: 'P2 · This week' },
  { value: 'P3 - Monitor / review', label: 'P3 · Monitor' },
  { value: 'P4 - No action', label: 'P4 · No action' },
];

function priorityCode(priority?: string): string {
  if (!priority) return 'P4';
  const match = priority.match(/^(P[1-4])/);
  return match ? match[1] : 'P4';
}

function priorityBadgeClass(priority?: string): string {
  const code = priorityCode(priority);
  if (code === 'P1') return 'bg-rose-600 text-white';
  if (code === 'P2') return 'bg-amber-500 text-white';
  if (code === 'P3') return 'bg-sky-100 text-sky-800 border border-sky-300';
  return 'bg-slate-200 text-slate-800';
}

export default function ConsumersPage() {
  const { data: consumers, error, isLoading, mutate } = useScoresConsumers(5000);
  const { trigger: runEvaluation, isMutating: isEvaluating } = useRunEvaluation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDt, setSelectedDt] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedCause, setSelectedCause] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const handleRefresh = async () => {
    try {
      await runEvaluation();
      await mutate();
    } catch {
      // hook state handles errors
    }
  };

  const rawConsumers = consumers || [];

  // Unique DT options from data
  const dtOptions = useMemo(() => {
    const dts = new Set<string>();
    rawConsumers.forEach((c) => {
      if (c.dt_id) dts.add(c.dt_id);
    });
    return Array.from(dts).sort();
  }, [rawConsumers]);

  // Unique cause options from data
  const causeOptions = useMemo(() => {
    const causes = new Set<string>();
    rawConsumers.forEach((c) => {
      if (c.probable_cause) causes.add(c.probable_cause);
    });
    return Array.from(causes).sort();
  }, [rawConsumers]);

  // Filtering
  const filteredConsumers = useMemo(() => {
    return rawConsumers.filter((c) => {
      if (
        searchTerm &&
        !c.CONS_NO.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (selectedDt !== 'ALL' && c.dt_id !== selectedDt) return false;
      if (selectedRisk !== 'ALL' && c.risk_level !== selectedRisk) return false;
      if (selectedCause !== 'ALL' && c.probable_cause !== selectedCause) return false;
      if (selectedPriority !== 'ALL' && c.priority !== selectedPriority) return false;
      return true;
    });
  }, [
    rawConsumers,
    searchTerm,
    selectedDt,
    selectedRisk,
    selectedCause,
    selectedPriority,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredConsumers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedConsumers = filteredConsumers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleFilterChange =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setCurrentPage(1);
    };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-700" />
            Consumer Risk Directory
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            ML anomaly scores, consumption profiles, and risk actions.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isEvaluating || isLoading}
          className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'Evaluating…' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Consumer ID…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono"
            />
          </div>

          {/* DT */}
          <div>
            <select
              value={selectedDt}
              onChange={handleFilterChange(setSelectedDt)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-700 font-sans"
            >
              <option value="ALL">All Transformers (DTs)</option>
              {dtOptions.map((dt) => (
                <option key={dt} value={dt}>
                  DT: {dt}
                </option>
              ))}
            </select>
          </div>

          {/* Risk */}
          <div>
            <select
              value={selectedRisk}
              onChange={handleFilterChange(setSelectedRisk)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-700 font-sans"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          {/* Cause */}
          <div>
            <select
              value={selectedCause}
              onChange={handleFilterChange(setSelectedCause)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-700 font-sans"
            >
              <option value="ALL">All Probable Causes</option>
              {causeOptions.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>
          </div>

          {/* Priority — full strings matching the API */}
          <div>
            <select
              value={selectedPriority}
              onChange={handleFilterChange(setSelectedPriority)}
              className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-700 font-sans"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">
            Loading consumers from backend…
          </p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">
            Failed to Load Consumers
          </h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md">
            {error.message ?? 'Unknown error'}
          </p>
          <button
            onClick={() => mutate()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          {paginatedConsumers.length === 0 ? (
            <div className="py-16 text-center">
              <Filter className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Consumers Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                {rawConsumers.length === 0
                  ? 'The backend returned no scores. Click Refresh Data to run the pipeline.'
                  : 'Adjust your filters to see more results.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Consumer</th>
                      <th className="py-3 px-4">Transformer</th>
                      <th className="py-3 px-4">Current kWh</th>
                      <th className="py-3 px-4">Baseline kWh</th>
                      <th className="py-3 px-4">Deviation %</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Risk</th>
                      <th className="py-3 px-4">Cause</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedConsumers.map((c) => {
                      const dev = c.deviation_pct ?? 0;
                      const score = c.combined_score ?? 0;
                      const code = priorityCode(c.priority);

                      return (
                        <tr
                          key={c.CONS_NO}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <Link
                              href={`/consumers/${c.CONS_NO}`}
                              className="font-bold text-sky-700 hover:underline"
                            >
                              {c.CONS_NO}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {c.dt_id || 'Unassigned'}
                          </td>
                          <td className="py-3 px-4 text-slate-800">
                            {c.current_mean != null
                              ? c.current_mean.toFixed(1)
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {c.historical_mean != null
                              ? c.historical_mean.toFixed(1)
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-bold ${
                                dev < -20
                                  ? 'text-rose-600'
                                  : dev > 20
                                  ? 'text-amber-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {dev.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {(score * 100).toFixed(1)}%
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
                          <td className="py-3 px-4 text-slate-700 font-sans text-[11px]">
                            {c.probable_cause || 'Unclassified'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-sans ${priorityBadgeClass(
                                c.priority
                              )}`}
                            >
                              {code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/consumers/${c.CONS_NO}`}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-sm text-[11px] font-bold transition-colors"
                            >
                              <span>View</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 font-sans">
                  Showing{' '}
                  <strong className="text-slate-900">{startIndex + 1}</strong> to{' '}
                  <strong className="text-slate-900">
                    {Math.min(startIndex + ITEMS_PER_PAGE, filteredConsumers.length)}
                  </strong>{' '}
                  of <strong className="text-slate-900">{filteredConsumers.length}</strong> consumers
                </span>

                <div className="flex items-center gap-2 font-mono">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <span className="px-3 py-1 font-semibold text-slate-800 bg-white border border-slate-200 rounded-md">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}