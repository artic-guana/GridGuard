'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LiveTelemetry } from '@/types/grid';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Activity } from 'lucide-react';

const initialTelemetry: LiveTelemetry[] = [
  { timestamp: '10:42:18', consumerId: 'C-10482', voltageV: 231.4, currentA: 2.8, powerKW: 0.65, energyKWh: 0.0108, status: 'ANOMALY' },
  { timestamp: '10:42:17', consumerId: 'C-00083', voltageV: 0.0, currentA: 0.0, powerKW: 0.0, energyKWh: 0.0, status: 'COMM_FAIL' },
  { timestamp: '10:42:16', consumerId: 'C-00094', voltageV: 230.2, currentA: 0.0, powerKW: 0.0, energyKWh: 0.0, status: 'ANOMALY' },
  { timestamp: '10:42:15', consumerId: 'C-00001', voltageV: 232.1, currentA: 12.4, powerKW: 2.88, energyKWh: 0.0480, status: 'NORMAL' },
  { timestamp: '10:42:14', consumerId: 'C-00002', voltageV: 229.8, currentA: 8.5, powerKW: 1.95, energyKWh: 0.0325, status: 'NORMAL' },
];

export default function LiveMonitoringPage() {
  const [telemetry, setTelemetry] = useState<LiveTelemetry[]>(initialTelemetry);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const randomNum = Math.floor(Math.random() * 150) + 1;
      const consumerId = `C-${randomNum.toString().padStart(5, '0')}`;

      const isAnomaly = consumerId === 'C-10482' || Math.random() < 0.08;

      const newReading: LiveTelemetry = {
        timestamp: timeStr,
        consumerId,
        voltageV: parseFloat((228 + Math.random() * 6).toFixed(1)),
        currentA: parseFloat((3 + Math.random() * 15).toFixed(1)),
        powerKW: parseFloat((0.7 + Math.random() * 3.5).toFixed(2)),
        energyKWh: parseFloat((0.01 + Math.random() * 0.05).toFixed(4)),
        status: isAnomaly ? 'ANOMALY' : 'NORMAL',
      };

      setTelemetry((prev) => [newReading, ...prev.slice(0, 14)]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-700" />
          Smart Meter Telemetry Stream
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          High-frequency data telemetry channel • Data received: 10:42:17 AM • Latency: 142 ms • Gateway: Connected
        </p>
      </div>

      {/* Engineering Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Sampling Rate</span>
          <div className="text-sm font-bold font-mono text-slate-900 mt-1">1 reading / 5 min</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Connected Endpoints</span>
          <div className="text-sm font-bold font-mono text-slate-900 mt-1">147 / 150 Meters</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Interrupted Modems</span>
          <div className="text-sm font-bold font-mono text-slate-900 mt-1">3 Gateway links</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Processing Latency</span>
          <div className="text-sm font-bold font-mono text-slate-900 mt-1">142 ms</div>
        </div>
      </div>

      {/* Stream Buffer Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        <div className="pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Telemetry Stream Buffer</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider font-sans">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Consumer ID</th>
                <th className="py-2.5 px-3">Phase Voltage</th>
                <th className="py-2.5 px-3">Line Current</th>
                <th className="py-2.5 px-3">Active Power</th>
                <th className="py-2.5 px-3">Energy Tick</th>
                <th className="py-2.5 px-3 font-sans">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {telemetry.map((t, idx) => (
                <tr key={`${t.timestamp}-${t.consumerId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 text-slate-500">{t.timestamp}</td>
                  <td className="py-2 px-3">
                    <Link href={`/consumers/${t.consumerId}`} className="text-sky-700 font-bold hover:underline">
                      {t.consumerId}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-slate-800">{t.voltageV} V</td>
                  <td className="py-2 px-3 text-slate-800">{t.currentA} A</td>
                  <td className="py-2 px-3 text-slate-800">{t.powerKW} kW</td>
                  <td className="py-2 px-3 text-slate-800">{t.energyKWh} kWh</td>
                  <td className="py-2 px-3 font-sans">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
