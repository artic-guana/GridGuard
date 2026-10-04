'use client';

import React from 'react';
import { RiskBadge } from './RiskBadge';

interface RiskGaugeProps {
  score: number;
  level: string;
  probableCause: string;
  confidence: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  level,
  probableCause,
  confidence,
}) => {
  const radius = 60;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = '#10b981';
  if (score >= 85) strokeColor = '#e11d48';
  else if (score >= 70) strokeColor = '#ea580c';
  else if (score >= 40) strokeColor = '#d97706';

  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
      <div className="text-center mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
          AI Risk Score Gauge
        </h3>
      </div>

      <div className="relative flex items-center justify-center py-2">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle
            stroke="#e2e8f0"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
            {score}
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-semibold uppercase">/ 100</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 text-center">
        <div>
          <RiskBadge level={level} score={score} />
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 font-sans">
            Primary Probable Cause
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {probableCause}
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700 font-mono">
          <span className="font-sans text-slate-500">ML Confidence:</span>
          <span className="font-bold text-sky-700">{confidence}%</span>
        </div>
      </div>
    </div>
  );
};
