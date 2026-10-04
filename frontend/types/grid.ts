export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ProbableCause = 
  | 'Possible Theft / Tampering'
  | 'Meter Malfunction'
  | 'Communication Failure'
  | 'Abnormal Consumption'
  | 'Seasonal Variation'
  | 'Normal';

export type ConsumerCategory = 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';

export interface Feeder {
  id: string;
  name: string;
  substation: string;
  totalTransformers: number;
  totalConsumers: number;
  currentLoadKW: number;
  totalEnergyKWh: number;
  totalLossPercentage: number;
  unexplainedLossPercentage: number;
  activeAnomalies: number;
  communicationFailures: number;
  healthScore: number;
}

export interface Transformer {
  id: string;
  name: string;
  feederId: string;
  capacityKVA: number;
  consumerCount: number;
  inputEnergyKWh: number;
  consumerUsageKWh: number;
  technicalLossKWh: number;
  unexplainedLossKWh: number;
  lossPercentage: number;
  riskLevel: RiskLevel;
  highRiskCount: number;
  location: string;
  status: 'Online' | 'Warning' | 'Critical';
}

export interface TopFactor {
  feature: string;
  impact: number;
  description: string;
}

export interface MLPrediction {
  consumerId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  probableCause: ProbableCause;
  confidence: number;
  recommendedAction: 'FIELD INSPECTION' | 'METER AUDIT' | 'COMMUNICATION CHECK' | 'NO ACTION' | 'ROUTINE REVIEW';
  actionPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedActionReason: string;
  topFactors: TopFactor[];
  evidence: string[];
}

export interface Consumer {
  id: string;
  meterId: string;
  transformerId: string;
  name: string;
  address: string;
  category: ConsumerCategory;
  tariff: string;
  sanctionedLoadKW: number;
  connectionStatus: 'Active' | 'Disconnected' | 'Suspended';
  currentUsageKWh: number;
  baselineKWh: number;
  deviationPercentage: number;
  prediction: MLPrediction;
  meterHealth: {
    status: 'Normal' | 'Faulty' | 'Tamper Alert';
    communication: 'Connected' | 'Intermittent' | 'Disconnected';
    missingReadingsPct: number;
    duplicateReadingsPct: number;
    dataQualityPct: number;
    lastPing: string;
  };
}

export interface Alert {
  id: string;
  timestamp: string;
  consumerId?: string;
  transformerId: string;
  type: 'Possible Tampering' | 'Meter Fault' | 'Communication Failure' | 'Abnormal Consumption' | 'Transformer Loss';
  riskScore: number;
  riskLevel: RiskLevel;
  status: 'New' | 'Investigating' | 'Resolved' | 'Dismissed';
  message: string;
}

export interface InvestigationCase {
  id: string;
  consumerId: string;
  transformerId: string;
  probableCause: ProbableCause;
  riskScore: number;
  confidencePct: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  status: 'Open' | 'Investigating' | 'Inspection Scheduled' | 'Resolved' | 'Requires Review';
  assignedTo?: string;
  notes?: string;
}

export interface LiveTelemetry {
  timestamp: string;
  consumerId: string;
  voltageV: number;
  currentA: number;
  powerKW: number;
  energyKWh: number;
  status: 'NORMAL' | 'ANOMALY' | 'COMM_FAIL' | 'OVERLOAD';
}

export interface ReportItem {
  id: string;
  title: string;
  category: string;
  description: string;
  lastGenerated: string;
  recordCount: number;
  type: string;
}
