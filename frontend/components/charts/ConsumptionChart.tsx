'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { networkTrends, TimeSeriesPoint } from '@/data/readings';

interface ConsumptionChartProps {
  customData?: TimeSeriesPoint[];
  title?: string;
  subtitle?: string;
  showPeer?: boolean;
}

export const ConsumptionChart: React.FC<ConsumptionChartProps> = ({
  customData,
  title = 'Network Consumption',
  subtitle = 'Actual telemetry vs Expected machine learning baseline',
  showPeer = false,
}) => {
  const [range, setRange] = useState<'24H' | '7D' | '30D' | '90D'>('7D');

  const chartData = customData || networkTrends[range] || networkTrends['7D'];

  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {!customData && (
          <div className="inline-flex p-1 bg-slate-100 rounded-md border border-slate-200 self-start sm:self-auto font-mono text-xs">
            {(['24H', '7D', '30D', '90D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
                  range === r
                    ? 'bg-white text-sky-700 shadow-2xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-72 w-full font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="expectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="peerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
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
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual Usage (kWh)"
              stroke="#0284c7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#actualGrad)"
            />
            <Area
              type="monotone"
              dataKey="expected"
              name="Baseline Expected"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#expectedGrad)"
            />
            {showPeer && (
              <Area
                type="monotone"
                dataKey="peer"
                name="Peer Cluster Avg"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="2 2"
                fillOpacity={1}
                fill="url(#peerGrad)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
