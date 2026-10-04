'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const RiskDistributionChart: React.FC = () => {
  const data = [
    { name: 'Low Risk', value: 114, color: '#10b981' },
    { name: 'Medium Risk', value: 24, color: '#f59e0b' },
    { name: 'High Risk', value: 9, color: '#f97316' },
    { name: 'Critical Risk', value: 3, color: '#f43f5e' },
  ];

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">
          Risk Distribution
        </h3>
        <p className="text-xs text-slate-500">
          Consumer risk level classification (150 total)
        </p>
      </div>

      <div className="h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-900 font-mono">
            {total}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-500 font-mono">
            Consumers
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200 font-mono text-xs">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 font-sans font-medium">{item.name}</span>
            </div>
            <span className="font-bold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
