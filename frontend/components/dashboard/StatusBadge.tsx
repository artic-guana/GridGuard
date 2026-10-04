import React from 'react';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface StatusBadgeProps {
  status: string;
  type?: 'connection' | 'meter' | 'investigation';
}

type Tone = 'good' | 'warn' | 'danger' | 'info' | 'neutral';

interface ToneStyle {
  wrapper: string;
  dot: string;
}

// ------------------------------------------------------------
// Tone palette — single source of truth for colors
// ------------------------------------------------------------
const TONE_STYLES: Record<Tone, ToneStyle> = {
  good: {
    wrapper: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  warn: {
    wrapper: 'bg-amber-50 text-amber-900 border-amber-200',
    dot: 'bg-amber-600',
  },
  danger: {
    wrapper: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-600',
  },
  info: {
    wrapper: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-600',
  },
  neutral: {
    wrapper: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
  },
};

// ------------------------------------------------------------
// Status registry — every status the app emits, mapped to a tone
// Keys are lowercase for case-insensitive matching.
// ------------------------------------------------------------
const STATUS_TONE: Record<string, Tone> = {
  // ---- Connection / device health ----
  online: 'good',
  connected: 'good',
  active: 'good',
  ok: 'good',
  nominal: 'good',

  disconnected: 'danger',
  offline: 'danger',
  faulty: 'danger',
  fault: 'danger',
  'tamper alert': 'danger',
  tamper: 'danger',

  intermittent: 'warn',
  warning: 'warn',
  delayed: 'warn',

  // ---- Risk levels (consumer) ----
  normal: 'good',
  low: 'info',
  medium: 'warn',
  high: 'danger',
  critical: 'danger',

  // ---- Priorities ----
  p1: 'danger',
  p2: 'warn',
  p3: 'info',
  p4: 'neutral',

  // ---- Investigation case statuses ----
  open: 'danger',
  investigating: 'warn',
  'inspection scheduled': 'warn',
  'requires review': 'info',
  resolved: 'good',
  suspended: 'neutral',

  // ---- Telemetry statuses ----
  anomaly: 'danger',
  comm_fail: 'neutral',
  comm_lost: 'neutral',
  no_comms: 'neutral',

  // ---- Probable causes (used as badges elsewhere) ----
  'theft / tampering': 'danger',
  'meter malfunction': 'warn',
  'communication failure': 'neutral',
  'legitimate abnormal': 'info',
  unknown: 'neutral',
  unclassified: 'neutral',
};

// ------------------------------------------------------------
// Extraction: turn "P1 - Immediate inspection" into "p1"
// so it matches the registry.
// ------------------------------------------------------------
function normalize(status: string): string {
  const s = (status ?? '').trim().toLowerCase();
  // Priority strings start with "p1 ", "p1 -", "p1:" — strip the tail
  const priorityMatch = s.match(/^(p[1-4])\b/);
  if (priorityMatch) return priorityMatch[1];
  return s;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const key = normalize(status);
  const tone: Tone = STATUS_TONE[key] ?? 'neutral';
  const styles = TONE_STYLES[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-semibold border ${styles.wrapper}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {status}
    </span>
  );
};

export default StatusBadge;