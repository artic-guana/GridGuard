import React from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface EvidenceCardProps {
  consumerId: string;
  evidence: string[];
  probableCause: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  consumerId,
  evidence,
  probableCause,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Why was <span className="font-mono text-sky-700">{consumerId}</span> flagged?
          </h3>
          <p className="text-xs text-slate-500">
            Key empirical evidence synthesized by XGBoost & Isolation Forest model
          </p>
        </div>
      </div>

      <div className="space-y-2 bg-slate-50 p-3.5 rounded-md border border-slate-200">
        {evidence.map((item, index) => (
          <div key={index} className="flex items-start gap-2.5 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-center justify-between font-mono">
        <span className="font-bold">Classification: {probableCause}</span>
        <span className="text-[11px] font-sans font-medium text-amber-800">Investigation Recommended</span>
      </div>
    </div>
  );
};
