'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ProbableCausesChart: React.FC = () => {
  const data = [
    { cause: 'Normal', count: 128, color: '#10b981' },
    { cause: 'Possible Tampering', count: 7, color: '#e11d48' },
    { cause: 'Abnormal Consumption', count: 6, color: '#ea580c' },
    { cause: 'Communication Failure', count: 4, color: '#7c3aed' },
    { cause: 'Meter Malfunction', count: 3, color: '#ca8a04' },
    { cause: 'Seasonal Variation', count: 2, color: '#0284c7' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">
          Probable Cause Breakdown
        </h3>
        <p className="text-xs text-slate-500">
          AI classification model primary flagged causes
        </p>
      </div>

      <div className="h-56 font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="cause"
              width={140}
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(val: any) => [`${val ?? 0} consumers`, 'Count']}
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '12px',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
