'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RiskBadge } from '@/components/dashboard/RiskBadge';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { CaseDetailModal } from '@/components/investigations/CaseDetailModal';
import {
  SearchCode,
  ExternalLink,
  Filter,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface ApiConsumerScore {
  CONS_NO: string;
  dt_id?: string;
  xgb_score: number;
  combined_score: number;
  predicted_flag: number;
  risk_level: 'Normal' | 'Low' | 'Medium' | 'High';
  probable_cause?: string;
  cause_confidence?: number;
  priority?: string;
  recommended_action?: string;
  historical_mean?: number;
  current_mean?: number;
  deviation_pct?: number;
}

type CaseStatus =
  | 'Open'
  | 'Investigating'
  | 'Inspection Scheduled'
  | 'Requires Review'
  | 'Resolved';

interface CaseRow {
  id: string;
  consumerId: string;
  transformerId: string;
  probableCause: string;
  riskScore: number;
  confidencePct: number;
  priority: string;
  createdAt: string;
  status: CaseStatus;
  raw: ApiConsumerScore;
}

// ------------------------------------------------------------
// Mapping helpers
// ------------------------------------------------------------
function statusFromPriority(priority?: string, riskLevel?: string): CaseStatus {
  if (priority?.startsWith('P1')) return 'Open';
  if (priority?.startsWith('P2')) return 'Investigating';
  if (priority?.startsWith('P3')) return 'Requires Review';
  if (riskLevel === 'Normal') return 'Resolved';
  return 'Requires Review';
}

function toCase(c: ApiConsumerScore, computedAt: string): CaseRow {
  return {
    id: `CASE-${c.CONS_NO.replace('CONS-', '')}`,
    consumerId: c.CONS_NO,
    transformerId: c.dt_id ?? '—',
    probableCause: c.probable_cause ?? 'Unknown',
    riskScore: Math.round(c.combined_score * 100),
    confidencePct: Math.round((c.cause_confidence ?? 0) * 100),
    priority: c.risk_level,
    createdAt: computedAt
      ? new Date(computedAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—',
    status: statusFromPriority(c.priority, c.risk_level),
    raw: c,
  };
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------
export default function InvestigationsPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);

  // ------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------
  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scoreRes, summaryRes] = await Promise.all([
        fetch('/api/backend/api/v1/scores/consumers?n=5000', {
          cache: 'no-store',
        }),
        fetch('/api/backend/api/v1/scores/summary', { cache: 'no-store' }),
      ]);

      if (scoreRes.status === 404) {
        setCases([]);
        setLoading(false);
        return;
      }
      if (!scoreRes.ok) throw new Error(`API ${scoreRes.status}`);

      const consumers: ApiConsumerScore[] = await scoreRes.json();

      let computedAt = '';
      if (summaryRes.ok) {
        const s = await summaryRes.json();
        computedAt = s.computed_at ?? '';
      }

      const rows = consumers
        .filter((c) => c.predicted_flag === 1)
        .map((c) => toCase(c, computedAt));

      setCases(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Auto-refresh every 60 s
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) loadCases();
    }, 60_000);
    return () => clearInterval(id);
  }, [loadCases]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/backend/api/v1/admin/run-evaluation', {
        method: 'POST',
      });
      await loadCases();
    } catch {
      setError('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // ------------------------------------------------------------
  // Filtering
  // ------------------------------------------------------------
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (filterStatus === 'ALL') return true;
      return c.status === filterStatus;
    });
  }, [cases, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: cases.length,
      Open: 0,
      Investigating: 0,
      'Inspection Scheduled': 0,
      'Requires Review': 0,
      Resolved: 0,
    };
    for (const c of cases) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [cases]);

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 font-sans flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SearchCode className="w-5 h-5 text-sky-700" />
            Active Investigation Cases
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {loading
              ? 'Loading…'
              : `${cases.length} active cases derived from stored scores`}
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

      {/* Filter */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-md shadow-2xs font-sans">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          Filter Cases by Status:
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden"
        >
          <option value="ALL">All Cases ({statusCounts.ALL})</option>
          <option value="Open">Open ({statusCounts.Open})</option>
          <option value="Investigating">
            Investigating ({statusCounts.Investigating})
          </option>
          <option value="Inspection Scheduled">
            Inspection Scheduled ({statusCounts['Inspection Scheduled']})
          </option>
          <option value="Requires Review">
            Requires Review ({statusCounts['Requires Review']})
          </option>
          <option value="Resolved">Resolved ({statusCounts.Resolved})</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-md p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500">Loading cases…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-red-800 text-sm">
          <p className="font-semibold mb-1">Failed to load cases</p>
          <p className="text-red-600 text-xs">{error}</p>
          <button
            onClick={loadCases}
            className="mt-3 px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredCases.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
          <p className="text-sm text-slate-500 font-medium">
            {cases.length === 0
              ? 'No active investigation cases.'
              : `No cases with status "${filterStatus}".`}
          </p>
          {cases.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Click Refresh to run the pipeline and generate cases.
            </p>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredCases.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Consumer</th>
                  <th className="py-2.5 px-3">Transformer</th>
                  <th className="py-2.5 px-3">Probable Cause</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCases.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedCase(item)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-bold text-sky-700">
                      {item.id}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      <Link
                        href={`/consumers/${item.consumerId}`}
                        className="text-sky-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.consumerId}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.transformerId !== '—' ? (
                        <Link
                          href={`/transformers/${item.transformerId}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.transformerId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                      {item.probableCause}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {item.riskScore}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.confidencePct}%
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskBadge level={item.priority} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {item.createdAt}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td
                      className="py-2.5 px-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setSelectedCase(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-sm text-[11px] font-mono font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <span>View Case</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedCase && (
        <CaseDetailModal
          item={selectedCase as any}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </DashboardLayout>
  );
}