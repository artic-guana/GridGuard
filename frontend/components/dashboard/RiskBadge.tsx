import React from 'react';
import { RiskLevel } from '@/types/grid';

interface RiskBadgeProps {
  level: RiskLevel | string;
  score?: number;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, className = '' }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
  let dotStyle = 'bg-slate-500';

  const normalized = level.toLowerCase();

  if (normalized === 'critical') {
    badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
    dotStyle = 'bg-rose-600';
  } else if (normalized === 'high') {
    badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200';
    dotStyle = 'bg-amber-600';
  } else if (normalized === 'medium') {
    badgeStyle = 'bg-orange-50 text-orange-800 border-orange-200';
    dotStyle = 'bg-orange-600';
  } else if (normalized === 'low') {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotStyle = 'bg-emerald-600';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-bold border ${badgeStyle} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      {level.toUpperCase()}
      {score !== undefined && <span className="opacity-80 font-mono ml-0.5">({score})</span>}
    </span>
  );
};
