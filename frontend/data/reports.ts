import { ReportItem } from '@/types/grid';

export const reportItems: ReportItem[] = [
  {
    id: 'REP-001',
    title: 'Consumer Anomaly & Tampering Investigation Report',
    category: 'Theft & Loss Audit',
    description: 'Detailed analysis of high-risk consumers flagged for non-technical distribution losses on Feeder F001.',
    lastGenerated: 'Today, 08:30 AM',
    recordCount: 12,
    type: 'PDF / Excel'
  },
  {
    id: 'REP-002',
    title: 'Transformer Energy Loss & Technical Efficiency Report',
    category: 'Distribution Network',
    description: 'Energy balance and unaccounted distribution loss breakdowns for DT-01, DT-02, and DT-03.',
    lastGenerated: 'Yesterday, 06:00 PM',
    recordCount: 3,
    type: 'PDF / CSV'
  },
  {
    id: 'REP-003',
    title: 'Feeder F001 Monthly Energy Balance Audit',
    category: 'Substation Intelligence',
    description: 'Substation input vs aggregate consumer billing reconciliation report.',
    lastGenerated: 'Oct 01, 2026',
    recordCount: 150,
    type: 'PDF / JSON'
  },
  {
    id: 'REP-004',
    title: 'Smart Meter Communication & Telemetry Reliability',
    category: 'IoT Infrastructure',
    description: 'Audit of missing packets, clock drift, offline gateways, and RF signal strength.',
    lastGenerated: 'Oct 02, 2026',
    recordCount: 150,
    type: 'PDF'
  },
];
