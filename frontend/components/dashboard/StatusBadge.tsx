import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'connection' | 'meter' | 'investigation';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-300';
  let dotColor = 'bg-slate-500';

  const s = status.toLowerCase();

  if (s === 'online' || s === 'active' || s === 'normal' || s === 'connected' || s === 'resolved') {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-600';
  } else if (s === 'warning' || s === 'intermittent' || s === 'investigating' || s === 'inspection scheduled') {
    style = 'bg-amber-50 text-amber-900 border-amber-200';
    dotColor = 'bg-amber-600';
  } else if (s === 'critical' || s === 'disconnected' || s === 'faulty' || s === 'tamper alert' || s === 'open') {
    style = 'bg-rose-50 text-rose-800 border-rose-200';
    dotColor = 'bg-rose-600';
  } else if (s === 'requires review' || s === 'suspended') {
    style = 'bg-purple-50 text-purple-800 border-purple-200';
    dotColor = 'bg-purple-600';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
};
