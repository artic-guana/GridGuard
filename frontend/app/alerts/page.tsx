/**
 * app/alerts/page.tsx
 * Real-time alert stream and priority incident response list derived from consumer anomaly scores.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useScoresConsumers, useRunEvaluation } from '@/lib/hooks/useApi';
import { ConsumerScore } from '@/lib/api';
import {
  Bell,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

type PriorityTab = 'ALL' | 'P1' | 'P2' | 'P3' | 'RESOLVED';

interface AlertItem {
  id: string;
  consNo: string;
  dtId: string;
  priority: string;
  riskLevel: string;
  status: 'Critical' | 'High' | 'Medium' | 'Resolved';
  score: number;
  probableCause: string;
  recommendedAction: string;
}

export default function AlertsPage() {
  const { data: consumers, error, isLoading, mutate } = useScoresConsumers(500);
  const { trigger: runEvaluation, isMutating: isEvaluating } = useRunEvaluation();
  const [activeTab, setActiveTab] = useState<PriorityTab>('ALL');

  const handleRefresh = async () => {
    try {
      await runEvaluation();
      await mutate();
    } catch {
      // Error handled by hook
    }
  };

  // Map ConsumerScore array to AlertItems
  const alerts: AlertItem[] = (consumers || []).map((c: ConsumerScore) => {
    let status: 'Critical' | 'High' | 'Medium' | 'Resolved' = 'Medium';
    if (c.risk_level === 'Normal') {
      status = 'Resolved';
    } else if (c.priority === 'P1') {
      status = 'Critical';
    } else if (c.priority === 'P2') {
      status = 'High';
    } else if (c.priority === 'P3') {
      status = 'Medium';
    }

    return {
      id: c.CONS_NO,
      consNo: c.CONS_NO,
      dtId: c.dt_id || 'Unassigned',
      priority: c.priority || 'P3',
      riskLevel: c.risk_level,
      status,
      score: c.combined_score,
      probableCause: c.probable_cause || 'Unclassified Anomaly',
      recommendedAction: c.recommended_action || 'Inspect meter sealing & verify load curve.',
    };
  });

  // Filter alerts by tab
  const filteredAlerts = alerts.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'RESOLVED') return item.status === 'Resolved';
    return item.priority === activeTab;
  });

  const countP1 = alerts.filter((a) => a.priority === 'P1' && a.status !== 'Resolved').length;
  const countP2 = alerts.filter((a) => a.priority === 'P2' && a.status !== 'Resolved').length;
  const countP3 = alerts.filter((a) => a.priority === 'P3' && a.status !== 'Resolved').length;
  const countResolved = alerts.filter((a) => a.status === 'Resolved').length;

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-600" />
            Grid Anomaly & Theft Alerts
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Automated alerts synthesized from XGBoost model scores and transformer load variance.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isEvaluating || isLoading}
          className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'Evaluating...' : 'Refresh Alerts'}</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading alerts stream from backend...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg flex flex-col items-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Alerts</h3>
          <p className="text-xs text-rose-700 mt-1 max-w-md">{error.message}</p>
          <button
            onClick={() => mutate()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {/* Priority Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('P1')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'P1'
                  ? 'bg-rose-700 text-white'
                  : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              P1 Critical ({countP1})
            </button>
            <button
              onClick={() => setActiveTab('P2')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'P2'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              P2 High ({countP2})
            </button>
            <button
              onClick={() => setActiveTab('P3')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'P3'
                  ? 'bg-sky-700 text-white'
                  : 'bg-white border border-slate-200 text-sky-700 hover:bg-sky-50'
              }`}
            >
              P3 Medium ({countP3})
            </button>
            <button
              onClick={() => setActiveTab('RESOLVED')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                activeTab === 'RESOLVED'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Resolved ({countResolved})
            </button>
          </div>

          {/* Alerts Table / Empty state */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            {filteredAlerts.length === 0 ? (
              <div className="py-16 text-center">
                <Filter className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No Alerts Found</h3>
                <p className="text-xs text-slate-500 mt-1">There are no alerts matching the selected priority tab.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Priority / Status</th>
                      <th className="py-3 px-4">Consumer</th>
                      <th className="py-3 px-4">Transformer</th>
                      <th className="py-3 px-4">Risk Score</th>
                      <th className="py-3 px-4">Probable Cause</th>
                      <th className="py-3 px-4">Recommended Action</th>
                      <th className="py-3 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAlerts.map((alt) => (
                      <tr key={alt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-sans inline-flex items-center gap-1 ${
                              alt.status === 'Critical'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : alt.status === 'High'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : alt.status === 'Medium'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {alt.status} ({alt.priority})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/consumers/${alt.consNo}`} className="font-bold text-sky-700 hover:underline">
                            {alt.consNo}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{alt.dtId}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {(alt.score * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-sans font-semibold">
                          {alt.probableCause}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans max-w-xs truncate">
                          {alt.recommendedAction}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/consumers/${alt.consNo}`}
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