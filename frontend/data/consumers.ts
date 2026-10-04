import { Consumer, ConsumerCategory, ProbableCause, RiskLevel, MLPrediction } from '@/types/grid';

const streetNames = [
  'Oak Avenue', 'Maple Drive', 'Pine Street', 'Cedar Lane', 'Elm Boulevard',
  'Market Street', 'Commercial Plaza', 'Industrial Park Way', 'Green Valley Road', 'Highland Drive'
];

function generateConsumers(): Consumer[] {
  const list: Consumer[] = [];

  for (let i = 1; i <= 150; i++) {
    const padId = i.toString().padStart(3, '0');
    const id = `C${padId}`;
    const meterId = `M${padId}`;

    let transformerId = 'DT-01';
    if (i > 50 && i <= 100) transformerId = 'DT-02';
    if (i > 100) transformerId = 'DT-03';

    let category: ConsumerCategory = 'Residential';
    if (i % 7 === 0) category = 'Commercial';
    else if (i % 13 === 0) category = 'Industrial';
    else if (i % 19 === 0) category = 'Agricultural';

    const street = streetNames[(i % streetNames.length)];
    const address = `${100 + i * 2}, ${street}, Zone ${transformerId === 'DT-01' ? 'A' : transformerId === 'DT-02' ? 'B' : 'C'}`;

    // HERO CONSUMER C071
    if (id === 'C071') {
      list.push({
        id: 'C071',
        meterId: 'M071',
        transformerId: 'DT-02',
        name: 'Vanguard Residency Apt 4B',
        address: '422 Market Avenue, Zone B',
        category: 'Residential',
        tariff: 'Domestic LT-2B',
        sanctionedLoadKW: 5,
        connectionStatus: 'Active',
        currentUsageKWh: 92,
        baselineKWh: 365,
        deviationPercentage: -74.8,
        prediction: {
          consumerId: 'C071',
          riskScore: 91,
          riskLevel: 'Critical',
          probableCause: 'Possible Theft / Tampering',
          confidence: 89,
          recommendedAction: 'FIELD INSPECTION',
          actionPriority: 'CRITICAL',
          recommendedActionReason: 'Persistent abnormal low consumption (-74.8%) with healthy smart meter communication, verified transformer-level unmetered energy loss (8.7% DT-02 loss), and zero peer drop.',
          evidence: [
            'Consumption is 65% below historical baseline for 3 consecutive billing cycles',
            'Abnormal low load pattern persisted for 3 months with uncharacteristic flatline',
            'Peer residential consumers on DT-02 feeder remained within normal seasonal range (+2%)',
            'Smart meter communication link remained 99.2% healthy with active heartbeats',
            'Transformer DT-02 unexplained distribution loss increased by 1,300 kWh during period'
          ],
          topFactors: [
            { feature: 'Consumption Deviation', impact: 0.42, description: '-74.8% drop vs 12-month moving average' },
            { feature: 'Peer Deviation', impact: 0.28, description: 'Neighbourhood cluster variance exceeds +4.2 std dev' },
            { feature: 'Recent 90-Day Trend', impact: 0.15, description: 'Sustained step-down shift without tariff change' },
            { feature: 'Load Factor Anomaly', impact: 0.09, description: 'Peak hour load factor reduced from 0.62 to 0.11' },
            { feature: 'Communication Status', impact: 0.04, description: 'High data link quality eliminates network failure hypothesis' },
          ]
        },
        meterHealth: {
          status: 'Normal',
          communication: 'Connected',
          missingReadingsPct: 0.8,
          duplicateReadingsPct: 0.1,
          dataQualityPct: 98.9,
          lastPing: '2 mins ago',
        }
      });
      continue;
    }

    // SPECIAL ANOMALY CONSUMERS
    if (id === 'C083') {
      list.push({
        id: 'C083',
        meterId: 'M083',
        transformerId: 'DT-02',
        name: 'Apex Supermarket Store',
        address: '154 Market Avenue, Zone B',
        category: 'Commercial',
        tariff: 'Commercial HT-1',
        sanctionedLoadKW: 25,
        connectionStatus: 'Active',
        currentUsageKWh: 450,
        baselineKWh: 1850,
        deviationPercentage: -75.7,
        prediction: {
          consumerId: 'C083',
          riskScore: 78,
          riskLevel: 'High',
          probableCause: 'Communication Failure',
          confidence: 82,
          recommendedAction: 'COMMUNICATION CHECK',
          actionPriority: 'HIGH',
          recommendedActionReason: 'Modem RF module signal drop resulting in missing packet bursts.',
          evidence: [
            'Packet loss rate exceeds 42% over last 7 days',
            'Meter clock drift detected (+4 mins)',
            'Transformer load balance shows expected consumption'
          ],
          topFactors: [
            { feature: 'Communication Packet Loss', impact: 0.55, description: 'High retry failures on gateway' },
            { feature: 'Consumption Gap', impact: 0.25, description: 'Intermittent telemetry sync' },
            { feature: 'Signal Quality RSSI', impact: 0.15, description: 'Low RF signal -88 dBm' },
          ]
        },
        meterHealth: {
          status: 'Faulty',
          communication: 'Intermittent',
          missingReadingsPct: 42.5,
          duplicateReadingsPct: 3.2,
          dataQualityPct: 54.3,
          lastPing: '45 mins ago',
        }
      });
      continue;
    }

    if (id === 'C034') {
      list.push({
        id: 'C034',
        meterId: 'M034',
        transformerId: 'DT-01',
        name: 'Green Villa Estate',
        address: '88 Oak Avenue, Zone A',
        category: 'Residential',
        tariff: 'Domestic LT-2A',
        sanctionedLoadKW: 8,
        connectionStatus: 'Active',
        currentUsageKWh: 890,
        baselineKWh: 410,
        deviationPercentage: 117.0,
        prediction: {
          consumerId: 'C034',
          riskScore: 64,
          riskLevel: 'Medium',
          probableCause: 'Abnormal Consumption',
          confidence: 75,
          recommendedAction: 'ROUTINE REVIEW',
          actionPriority: 'MEDIUM',
          recommendedActionReason: 'Sudden spike in power consumption (+117%). Possible electric vehicle charging or new machinery.',
          evidence: [
            'Unusual night-time peak load (2 AM - 6 AM)',
            'Load spikes up to 7.8 kW near sanctioned limit',
            'Meter health intact'
          ],
          topFactors: [
            { feature: 'Consumption Spike', impact: 0.48, description: '+117% increase vs baseline' },
            { feature: 'Night Load Ratio', impact: 0.32, description: 'Overnight heavy power drawing' },
          ]
        },
        meterHealth: {
          status: 'Normal',
          communication: 'Connected',
          missingReadingsPct: 0.2,
          duplicateReadingsPct: 0.0,
          dataQualityPct: 99.8,
          lastPing: '1 min ago',
        }
      });
      continue;
    }

    if (id === 'C094') {
      list.push({
        id: 'C094',
        meterId: 'M094',
        transformerId: 'DT-02',
        name: 'Urban Cafe & Bakery',
        address: '310 Commercial Plaza, Zone B',
        category: 'Commercial',
        tariff: 'Commercial LT-3',
        sanctionedLoadKW: 12,
        connectionStatus: 'Active',
        currentUsageKWh: 0,
        baselineKWh: 780,
        deviationPercentage: -100.0,
        prediction: {
          consumerId: 'C094',
          riskScore: 88,
          riskLevel: 'High',
          probableCause: 'Meter Malfunction',
          confidence: 85,
          recommendedAction: 'METER AUDIT',
          actionPriority: 'HIGH',
          recommendedActionReason: 'Zero register counts while voltage phase remains active.',
          evidence: [
            'Zero energy increment recorded despite continuous line voltage (230V)',
            'CT ratio internal error status code 0x4F',
            'Communication online'
          ],
          topFactors: [
            { feature: 'Zero Energy Phase Active', impact: 0.60, description: 'Voltage present, current zero' },
            { feature: 'Meter Internal Diagnostic', impact: 0.30, description: 'CT register fault flag set' },
          ]
        },
        meterHealth: {
          status: 'Tamper Alert',
          communication: 'Connected',
          missingReadingsPct: 1.2,
          duplicateReadingsPct: 0.0,
          dataQualityPct: 98.8,
          lastPing: '5 mins ago',
        }
      });
      continue;
    }

    if (id === 'C012') {
      list.push({
        id: 'C012',
        meterId: 'M012',
        transformerId: 'DT-01',
        name: 'Precision Metal Works',
        address: '501 Industrial Park Way, Zone A',
        category: 'Industrial',
        tariff: 'Industrial HT-2',
        sanctionedLoadKW: 45,
        connectionStatus: 'Active',
        currentUsageKWh: 1250,
        baselineKWh: 3200,
        deviationPercentage: -60.9,
        prediction: {
          consumerId: 'C012',
          riskScore: 72,
          riskLevel: 'Medium',
          probableCause: 'Normal',
          confidence: 80,
          recommendedAction: 'ROUTINE REVIEW',
          actionPriority: 'MEDIUM',
          recommendedActionReason: 'Factory maintenance shutdown scheduled for 2 weeks.',
          evidence: [
            'Planned maintenance window logged with utility',
            'Baseline drop correlated with shift schedule',
            'Substation reactive power balanced'
          ],
          topFactors: [
            { feature: 'Industrial Schedule Correlation', impact: 0.50, description: 'Matches maintenance calendar' },
            { feature: 'Off-peak drop', impact: 0.35, description: 'Consistent low standby load' },
          ]
        },
        meterHealth: {
          status: 'Normal',
          communication: 'Connected',
          missingReadingsPct: 0.4,
          duplicateReadingsPct: 0.0,
          dataQualityPct: 99.6,
          lastPing: '8 mins ago',
        }
      });
      continue;
    }

    const isDT02HighRisk = transformerId === 'DT-02' && (i === 55 || i === 62 || i === 68 || i === 77 || i === 89 || i === 95);
    const isOtherMediumRisk = (i % 17 === 0);

    let riskScore = Math.floor(10 + Math.random() * 20);
    let riskLevel: RiskLevel = 'Low';
    let probableCause: ProbableCause = 'Normal';
    let confidence = 95;
    let recAction: MLPrediction['recommendedAction'] = 'NO ACTION';
    let priority: MLPrediction['actionPriority'] = 'LOW';

    if (isDT02HighRisk) {
      riskScore = 75 + Math.floor(Math.random() * 15);
      riskLevel = riskScore > 85 ? 'Critical' : 'High';
      probableCause = 'Possible Theft / Tampering';
      confidence = 80 + Math.floor(Math.random() * 12);
      recAction = 'FIELD INSPECTION';
      priority = riskLevel === 'Critical' ? 'CRITICAL' : 'HIGH';
    } else if (isOtherMediumRisk) {
      riskScore = 50 + Math.floor(Math.random() * 20);
      riskLevel = 'Medium';
      probableCause = i % 2 === 0 ? 'Abnormal Consumption' : 'Meter Malfunction';
      confidence = 75 + Math.floor(Math.random() * 10);
      recAction = 'ROUTINE REVIEW';
      priority = 'MEDIUM';
    }

    const baseKWh = category === 'Commercial' ? 1200 : category === 'Industrial' ? 3000 : category === 'Agricultural' ? 600 : 350;
    const usageKWh = probableCause === 'Possible Theft / Tampering' ? Math.floor(baseKWh * 0.3) : Math.floor(baseKWh * (0.9 + Math.random() * 0.2));
    const devPct = Math.round(((usageKWh - baseKWh) / baseKWh) * 100);

    const isCommFail = (probableCause as string) === 'Communication Failure';
    const isMeterMal = (probableCause as string) === 'Meter Malfunction';

    list.push({
      id,
      meterId,
      transformerId,
      name: `${category} Consumer ${id}`,
      address,
      category,
      tariff: category === 'Commercial' ? 'Commercial LT-3' : category === 'Industrial' ? 'Industrial HT-1' : category === 'Agricultural' ? 'Agricultural Ag-1' : 'Domestic LT-2A',
      sanctionedLoadKW: category === 'Industrial' ? 30 : category === 'Commercial' ? 15 : 5,
      connectionStatus: 'Active',
      currentUsageKWh: usageKWh,
      baselineKWh: baseKWh,
      deviationPercentage: devPct,
      prediction: {
        consumerId: id,
        riskScore,
        riskLevel,
        probableCause,
        confidence,
        recommendedAction: recAction,
        actionPriority: priority,
        recommendedActionReason: probableCause === 'Normal' ? 'Consumption matches baseline and peer group.' : `Flagged due to ${probableCause.toLowerCase()} indicator.`,
        evidence: probableCause === 'Normal' ? ['Consumption within +/-5% range', 'Communication operational'] : [`Deviates by ${devPct}% from baseline`, 'High risk cluster correlation'],
        topFactors: [
          { feature: 'Consumption Deviation', impact: Math.abs(devPct) / 100, description: `${devPct}% vs baseline` },
          { feature: 'Peer Variance', impact: 0.1, description: 'Cluster correlation score' }
        ]
      },
      meterHealth: {
        status: isMeterMal ? 'Faulty' : 'Normal',
        communication: isCommFail ? 'Disconnected' : 'Connected',
        missingReadingsPct: isCommFail ? 35.0 : 0.4,
        duplicateReadingsPct: 0.0,
        dataQualityPct: isCommFail ? 65.0 : 99.5,
        lastPing: isCommFail ? '3 hours ago' : '3 mins ago',
      }
    });
  }

  return list;
}

export const consumers: Consumer[] = generateConsumers();
export const heroConsumer: Consumer = consumers.find(c => c.id === 'C071') || consumers[0];
