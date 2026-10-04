'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  ShieldAlert,
  UserCheck,
  Calendar,
  FileText,
  TrendingDown,
  MapPin,
  Target,
  Clipboard,
} from 'lucide-react';
import { StatusBadge } from '../dashboard/StatusBadge';

// ------------------------------------------------------------
// Types — matches the CaseRow shape from app/investigations
// ------------------------------------------------------------
export interface CaseRow {
  id: string;
  consumerId: string;
  transformerId: string;
  probableCause: string;
  riskScore: number;
  confidencePct: number;
  priority: string;
  createdAt: string;
  status: string;
  raw?: {
    CONS_NO: string;
    dt_id?: string;
    xgb_score?: number;
    combined_score?: number;
    probable_cause?: string;
    cause_confidence?: number;
    priority?: string;
    recommended_action?: string;
    historical_mean?: number;
    current_mean?: number;
    deviation_pct?: number;
    supporting_features?: { feature: string; value: number; shap: number }[];
  };
}

interface CaseDetailModalProps {
  item: CaseRow | null;
  onClose: () => void;
}

// ------------------------------------------------------------
// Derivation helpers — replace the fields the API does not return
// ------------------------------------------------------------
function deriveAssignedTeam(priority: string): string {
  if (priority?.startsWith('P1')) return 'Field Crew A — Immediate';
  if (priority?.startsWith('P2')) return 'Field Crew B — Scheduled';
  if (priority?.startsWith('P3')) return 'Desk Review Team';
  return 'Unassigned';
}

function deriveNotes(item: CaseRow): string {
  const dev = item.raw?.deviation_pct ?? null;
  const cause = item.probableCause || 'Anomaly';
  const devTxt =
    dev != null
      ? `${dev > 0 ? '+' : ''}${dev.toFixed(1)}% deviation vs baseline`
      : 'no deviation data';

  const summary: Record<string, string> = {
    'Theft / Tampering':
      `Sustained drop in consumption detected (${devTxt}). ${item.confidencePct}% ML confidence. Possible meter bypass, tampering, or unauthorised load. Field inspection recommended.`,
    'Meter Malfunction':
      `Meter reported flat-line or zero readings (${devTxt}). Likely internal fault or sensor failure. Calibration or meter replacement should be evaluated.`,
    'Communication Failure':
      `Missing or interrupted telemetry detected (${devTxt}). Verify modem, SIM, network link, and last-good timestamp before dispatching a field visit.`,
    'Legitimate Abnormal':
      `Consumption pattern deviates from baseline (${devTxt}) but matches a temporary pattern. Monitor for two more weeks before escalation.`,
    'Requires Review':
      `Deviation of ${devTxt} detected. Model confidence is ${item.confidencePct}%. Manual desk review required to determine the root cause before dispatch.`,
    Normal:
      `Consumption within expected range (${devTxt}). No action recommended at this time.`,
  };

  return (
    summary[cause] ??
    `Flagged with ${item.confidencePct}% confidence. Manual review recommended.`
  );
}

function deriveRecommendedAction(cause: string): string {
  return (
    {
      'Theft / Tampering':     'Dispatch field crew for meter and service-line inspection.',
      'Meter Malfunction':     'Replace or recalibrate meter; verify CT/PT.',
      'Communication Failure': 'Verify modem, SIM, and backhaul link.',
      'Legitimate Abnormal':   'Monitor for 2 weeks; no dispatch.',
      'Requires Review':       'Assign to desk-review analyst.',
      Normal:                  'No action required.',
    }[cause] ?? 'Manual review.'
  );
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  item,
  onClose,
}) => {
  if (!item) return null;

  const assignedTeam = deriveAssignedTeam(item.priority);
  const notes = deriveNotes(item);
  const recommendedAction = deriveRecommendedAction(item.probableCause);

  const raw = item.raw ?? {};
  const isTheft = item.probableCause === 'Theft / Tampering';
  const isComms = item.probableCause === 'Communication Failure';
  const isMeter = item.probableCause === 'Meter Malfunction';
  const isReview = item.probableCause === 'Requires Review';

  const causeTone =
    isTheft
      ? 'text-rose-700'
      : isReview
      ? 'text-amber-700'
      : isComms
      ? 'text-slate-600'
      : isMeter
      ? 'text-amber-700'
      : 'text-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-500">
                {item.id}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Consumer <span className="font-mono">{item.consumerId}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Tile label="Risk Score" value={`${item.riskScore}`} tone="danger" />
            <Tile label="Confidence" value={`${item.confidencePct}%`} />
            <Tile label="Priority" value={item.priority} />
          </div>

          {/* Case status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Case Status
            </span>
            <StatusBadge status={item.status} />
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs font-mono">
            <DetailRow
              icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
              label="Distribution Transformer"
              value={
                item.transformerId && item.transformerId !== '—' ? (
                  <Link
                    href={`/transformers/${item.transformerId}`}
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    {item.transformerId}
                  </Link>
                ) : (
                  <span className="text-slate-400">Unassigned</span>
                )
              }
            />

            <DetailRow
              icon={<Target className="w-3.5 h-3.5 text-slate-400" />}
              label="Probable Cause"
              value={
                <span className={`font-bold ${causeTone}`}>
                  {item.probableCause || 'Unknown'}
                </span>
              }
            />

            <DetailRow
              icon={<TrendingDown className="w-3.5 h-3.5 text-slate-400" />}
              label="Deviation vs Baseline"
              value={
                raw.deviation_pct != null ? (
                  <span
                    className={`font-bold ${
                      raw.deviation_pct < -20
                        ? 'text-rose-600'
                        : raw.deviation_pct > 20
                        ? 'text-amber-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {raw.deviation_pct > 0 ? '+' : ''}
                    {raw.deviation_pct.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )
              }
            />

            <DetailRow
              icon={<Clipboard className="w-3.5 h-3.5 text-slate-400" />}
              label="Historical / Current kWh"
              value={
                raw.historical_mean != null && raw.current_mean != null ? (
                  <span className="text-slate-700">
                    {raw.historical_mean.toFixed(1)} → {raw.current_mean.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )
              }
            />

            <DetailRow
              icon={<UserCheck className="w-3.5 h-3.5 text-sky-700" />}
              label="Suggested Team"
              value={
                <span className="font-semibold text-slate-800">
                  {assignedTeam}
                </span>
              }
            />

            <DetailRow
              icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
              label="Flagged At"
              value={<span className="text-slate-700">{item.createdAt}</span>}
            />
          </div>

          {/* Recommended action */}
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-md">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 mb-1 font-mono">
              Recommended Action
            </div>
            <p className="text-xs text-sky-900 font-sans">
              {raw.recommended_action || recommendedAction}
            </p>
          </div>

          {/* SHAP evidence */}
          {raw.supporting_features && raw.supporting_features.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Top Contributing Features (SHAP)
              </h4>
              <div className="overflow-hidden rounded-md border border-slate-200">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="py-2 px-3 font-sans font-semibold uppercase text-[10px] tracking-wider">
                        Feature
                      </th>
                      <th className="py-2 px-3 font-sans font-semibold uppercase text-[10px] tracking-wider">
                        Value
                      </th>
                      <th className="py-2 px-3 font-sans font-semibold uppercase text-[10px] tracking-wider">
                        Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {raw.supporting_features.map((f, i) => (
                      <tr key={`${f.feature}-${i}`}>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {f.feature}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {Number(f.value).toFixed(4)}
                        </td>
                        <td
                          className={`py-2 px-3 font-bold ${
                            f.shap > 0 ? 'text-rose-600' : 'text-cyan-700'
                          }`}
                        >
                          {f.shap > 0 ? '+' : ''}
                          {Number(f.shap).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Investigation notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Investigation Notes
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200 leading-relaxed">
              {notes}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <Link
            href={`/consumers/${item.consumerId}`}
            className="px-4 py-2 bg-sky-700 text-white rounded-md text-xs font-bold hover:bg-sky-800 transition-colors"
          >
            View Full Consumer Profile
          </Link>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------
function Tile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) {
  const color = tone === 'danger' ? 'text-rose-700' : 'text-slate-900';
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
        {label}
      </div>
      <div className={`text-sm font-bold mt-0.5 font-mono ${color}`}>{value}</div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 gap-3">
      <span className="flex items-center gap-1.5 text-slate-500 font-sans text-[11px]">
        {icon}
        {label}
      </span>
      <span className="text-right">{value}</span>
    </div>
  );
}