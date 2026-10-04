export interface TimeSeriesPoint {
  time: string;
  actual: number;
  expected: number;
  peer?: number;
  loss?: number;
  anomaly?: boolean;
}

export const networkTrends: Record<string, TimeSeriesPoint[]> = {
  '24H': [
    { time: '00:00', actual: 820, expected: 800 },
    { time: '03:00', actual: 550, expected: 540 },
    { time: '06:00', actual: 680, expected: 700 },
    { time: '09:00', actual: 1120, expected: 1150 },
    { time: '12:00', actual: 1350, expected: 1400 },
    { time: '15:00', actual: 1420, expected: 1450 },
    { time: '18:00', actual: 1680, expected: 1620 },
    { time: '21:00', actual: 1210, expected: 1250 },
  ],
  '7D': [
    { time: 'Mon', actual: 52100, expected: 54000 },
    { time: 'Tue', actual: 53400, expected: 54200 },
    { time: 'Wed', actual: 52500, expected: 54100 },
    { time: 'Thu', actual: 51900, expected: 53900 },
    { time: 'Fri', actual: 54800, expected: 55200 },
    { time: 'Sat', actual: 49500, expected: 51000 },
    { time: 'Sun', actual: 48200, expected: 49800 },
  ],
  '30D': [
    { time: 'Week 1', actual: 362000, expected: 380000 },
    { time: 'Week 2', actual: 368000, expected: 382000 },
    { time: 'Week 3', actual: 359000, expected: 381000 },
    { time: 'Week 4', actual: 364000, expected: 385000 },
  ],
  '90D': [
    { time: 'Month 1', actual: 1540000, expected: 1620000 },
    { time: 'Month 2', actual: 1520000, expected: 1630000 },
    { time: 'Month 3', actual: 1490000, expected: 1640000 },
  ],
};

export const heroConsumerTrends: Record<string, TimeSeriesPoint[]> = {
  '30D': [
    { time: 'Day 1', actual: 3.2, expected: 12.1, peer: 11.8, anomaly: true },
    { time: 'Day 5', actual: 2.8, expected: 12.4, peer: 12.0, anomaly: true },
    { time: 'Day 10', actual: 3.0, expected: 11.9, peer: 12.2, anomaly: true },
    { time: 'Day 15', actual: 3.1, expected: 12.5, peer: 12.3, anomaly: true },
    { time: 'Day 20', actual: 2.9, expected: 12.0, peer: 11.9, anomaly: true },
    { time: 'Day 25', actual: 3.0, expected: 12.2, peer: 12.1, anomaly: true },
    { time: 'Day 30', actual: 3.1, expected: 12.3, peer: 12.4, anomaly: true },
  ],
  '90D': [
    { time: 'Month -3', actual: 375, expected: 370, peer: 368, anomaly: false },
    { time: 'Month -2', actual: 95, expected: 368, peer: 372, anomaly: true },
    { time: 'Month -1', actual: 91, expected: 365, peer: 366, anomaly: true },
    { time: 'Current', actual: 92, expected: 365, peer: 369, anomaly: true },
  ],
  '6M': [
    { time: 'M-6', actual: 380, expected: 375, peer: 370 },
    { time: 'M-5', actual: 385, expected: 380, peer: 378 },
    { time: 'M-4', actual: 372, expected: 370, peer: 372 },
    { time: 'M-3', actual: 95, expected: 368, peer: 372, anomaly: true },
    { time: 'M-2', actual: 91, expected: 365, peer: 366, anomaly: true },
    { time: 'M-1', actual: 92, expected: 365, peer: 369, anomaly: true },
  ],
  '1Y': [
    { time: 'Q1', actual: 1120, expected: 1110, peer: 1100 },
    { time: 'Q2', actual: 1150, expected: 1140, peer: 1130 },
    { time: 'Q3', actual: 1140, expected: 1130, peer: 1135 },
    { time: 'Q4', actual: 278, expected: 1098, peer: 1105, anomaly: true },
  ],
};

export const transformerLossTrends = [
  { month: 'Jan', inputEnergy: 18200, consumerUsage: 17600, lossPct: 3.3 },
  { month: 'Feb', inputEnergy: 18100, consumerUsage: 17500, lossPct: 3.3 },
  { month: 'Mar', inputEnergy: 18400, consumerUsage: 17750, lossPct: 3.5 },
  { month: 'Apr', inputEnergy: 18600, consumerUsage: 17400, lossPct: 6.45, anomaly: true },
  { month: 'May', inputEnergy: 18550, consumerUsage: 17000, lossPct: 8.35, anomaly: true },
  { month: 'Jun', inputEnergy: 18500, consumerUsage: 16900, lossPct: 8.65, anomaly: true },
];
