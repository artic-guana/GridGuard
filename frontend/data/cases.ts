import { InvestigationCase } from '@/types/grid';

export const investigationCases: InvestigationCase[] = [
  {
    id: 'CASE-2026-071',
    consumerId: 'C071',
    transformerId: 'DT-02',
    probableCause: 'Possible Theft / Tampering',
    riskScore: 91,
    confidencePct: 89,
    priority: 'CRITICAL',
    createdAt: '3 months ago',
    status: 'Open',
    assignedTo: 'Field Inspector Tech-04',
    notes: 'Severe baseline drop (-74.8%) with healthy communication and 1,300 kWh unexplained loss on DT-02.'
  },
  {
    id: 'CASE-2026-094',
    consumerId: 'C094',
    transformerId: 'DT-02',
    probableCause: 'Meter Malfunction',
    riskScore: 88,
    confidencePct: 85,
    priority: 'HIGH',
    createdAt: '2 days ago',
    status: 'Inspection Scheduled',
    assignedTo: 'Meter Audit Team A',
    notes: 'Zero current register with voltage line active. CT diagnostic flag set.'
  },
  {
    id: 'CASE-2026-062',
    consumerId: 'C062',
    transformerId: 'DT-02',
    probableCause: 'Possible Theft / Tampering',
    riskScore: 82,
    confidencePct: 84,
    priority: 'HIGH',
    createdAt: '4 days ago',
    status: 'Investigating',
    assignedTo: 'Substation Control Center',
    notes: 'Neutral bypass suspect. Phase current present, zero neutral return.'
  },
  {
    id: 'CASE-2026-083',
    consumerId: 'C083',
    transformerId: 'DT-02',
    probableCause: 'Communication Failure',
    riskScore: 78,
    confidencePct: 82,
    priority: 'HIGH',
    createdAt: '1 week ago',
    status: 'Investigating',
    assignedTo: 'Telecom Ops Team',
    notes: 'Cellular modem link dropping packets intermittently.'
  },
];
