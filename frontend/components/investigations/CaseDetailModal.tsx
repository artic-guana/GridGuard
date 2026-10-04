'use client';

import React from 'react';
import { InvestigationCase } from '@/types/grid';
import { X, ShieldAlert, UserCheck, Calendar, FileText } from 'lucide-react';
import { RiskBadge } from '../dashboard/RiskBadge';
import { StatusBadge } from '../dashboard/StatusBadge';
import Link from 'next/link';

interface CaseDetailModalProps {
  item: InvestigationCase | null;
  onClose: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-xl shadow-lg overflow-hidden">
        {/* Modal Header */}
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
                Case Details: Consumer {item.consumerId}
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

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-md border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-mono">
                Priority & Risk Score
              </span>
              <RiskBadge level={item.priority} score={item.riskScore} />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-mono">
                Current Case Status
              </span>
              <StatusBadge status={item.status} />
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Consumer ID:</span>
              <Link
                href={`/consumers/${item.consumerId}`}
                className="font-bold text-sky-700 hover:underline"
              >
                {item.consumerId} →
              </Link>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Distribution Transformer:</span>
              <span className="font-semibold text-slate-800">{item.transformerId}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Probable Cause:</span>
              <span className="font-bold text-rose-700">{item.probableCause}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-sans">ML Confidence Score:</span>
              <span className="font-bold text-slate-800">{item.confidencePct}%</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Assigned Technical Team:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 font-sans">
                <UserCheck className="w-3.5 h-3.5 text-sky-700" />
                {item.assignedTo || 'Unassigned'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Case Created:</span>
              <span className="font-medium text-slate-700 flex items-center gap-1 font-sans">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {item.createdAt}
              </span>
            </div>
          </div>

          {/* Field Notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5 font-sans">
              <FileText className="w-4 h-4 text-slate-400" />
              Investigation Notes & Findings
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200 leading-relaxed font-sans">
              {item.notes}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
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
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
};
