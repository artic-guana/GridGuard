'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { reportItems } from '@/data/reports';
import { ReportItem } from '@/types/grid';
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal';
import { FileText, Download, Eye, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-700" />
          Grid Intelligence & Investigation Reports
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Generate formal audit dossiers, transformer energy balance reports & non-technical loss documentation.
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportItems.map((rep) => (
          <div
            key={rep.id}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {rep.category}
                </span>
                <span className="font-mono text-xs text-slate-400 font-semibold">{rep.id}</span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 mb-1">{rep.title}</h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">{rep.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded border border-slate-200 mb-5 font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-bold block">Last Generated</span>
                  <span className="text-slate-700 mt-0.5 block">{rep.lastGenerated}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-bold block">Included Records</span>
                  <span className="text-slate-900 font-bold mt-0.5 block">{rep.recordCount} items</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedReport(rep)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>View Summary</span>
              </button>

              <button
                onClick={() => alert(`PDF Report generated for ${rep.title}`)}
                className="flex-1 py-2 px-3 bg-sky-700 hover:bg-sky-600 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF Dossier</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Modal */}
      <ReportPreviewModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </DashboardLayout>
  );
}
