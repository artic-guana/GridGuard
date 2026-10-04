'use client';

import React from 'react';
import { ReportItem } from '@/types/grid';
import { X, FileText, Download, CheckCircle } from 'lucide-react';

interface ReportPreviewModalProps {
  report: ReportItem | null;
  onClose: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg shadow-lg overflow-hidden font-sans">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                {report.category}
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {report.title}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            {report.description}
          </p>

          <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Report ID:</span>
              <span className="font-bold text-slate-800">{report.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Records Included:</span>
              <span className="font-bold text-slate-800">{report.recordCount} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Last Generated:</span>
              <span className="font-medium text-slate-700">{report.lastGenerated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Export Format:</span>
              <span className="font-bold text-sky-700">{report.type}</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ready for instant download & offline review</span>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-md transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              alert(`Report ${report.id} exported successfully!`);
              onClose();
            }}
            className="px-4 py-2 bg-sky-700 text-white text-xs font-bold rounded-md flex items-center gap-2 hover:bg-sky-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};
