import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  trendColor?: 'danger' | 'warning' | 'success' | 'neutral';
  icon: LucideIcon;
  iconBg?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendDirection,
  trendColor = 'neutral',
  icon: Icon,
  iconBg = 'bg-sky-50 text-sky-700 border border-sky-200',
}) => {
  let trendClass = 'text-slate-500';
  if (trendColor === 'danger') trendClass = 'text-rose-600 font-semibold';
  if (trendColor === 'warning') trendClass = 'text-amber-700 font-semibold';
  if (trendColor === 'success') trendClass = 'text-emerald-700 font-semibold';

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          {title}
        </span>
        <div className={`p-2 rounded-md ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {value}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-mono ${trendClass}`}>
            {trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            <span>{trend}</span>
          </div>
        )}
      </div>

      <div className="mt-1 text-xs text-slate-500 font-medium">
        {subtitle}
      </div>
    </div>
  );
};
