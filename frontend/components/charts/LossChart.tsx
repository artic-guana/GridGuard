'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { transformerLossTrends } from '@/data/readings';

export const LossChart: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">
          Transformer Loss Trend (DT-02)
        </h3>
        <p className="text-xs text-slate-500">
          Monthly input energy vs aggregated consumer usage and resulting distribution loss %
        </p>
      </div>

      <div className="h-64 w-full font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={transformerLossTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#e11d48', fontSize: 11 }} axisLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '12px',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar yAxisId="left" dataKey="inputEnergy" name="Input (kWh)" fill="#0284c7" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="left" dataKey="consumerUsage" name="Consumer Usage (kWh)" fill="#94a3b8" radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="lossPct" name="Loss %" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4, fill: '#e11d48' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
