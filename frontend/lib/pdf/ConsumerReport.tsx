import React from 'react';
import { Document, Page, View, Text, Svg, Rect, Line, G } from '@react-pdf/renderer';
import { styles, colors } from './theme';
import {
  ConsumerDetail,
  formatNumber,
  formatKWh,
  formatPct,
  formatTimestamp,
  safe,
  priorityCode,
  priorityDescription,
  priorityColor,
  riskColor,
  deriveBehaviour,
  deriveBehaviourDescription,
  deriveExplanation,
  deriveSuggestedTeam,
  deriveSla,
  deriveStatus,
} from './helpers';

interface ConsumerReportProps {
  detail: ConsumerDetail;
  features?: Record<string, unknown>;
}

export const ConsumerReport: React.FC<ConsumerReportProps> = ({ detail, features: extraFeatures }) => {
  const score = detail.score || {
    CONS_NO: detail.CONS_NO,
    xgb_score: 0,
    combined_score: 0,
    predicted_flag: 0,
    risk_level: 'Normal',
  };

  const featMap = (extraFeatures || detail.features || {}) as Record<string, unknown>;

  const timestamp = formatTimestamp();
  const dateFormatted = timestamp.substring(0, 10).replace(/-/g, '');
  const reportId = `RPT-${score.CONS_NO}-${dateFormatted}`;

  const topFeatures = score.supporting_features ? score.supporting_features.slice(0, 8) : [];
  const behaviourPattern = deriveBehaviour(featMap);
  const behaviourDesc = deriveBehaviourDescription(behaviourPattern);
  const explanation = deriveExplanation(score, featMap);

  const priorityCde = priorityCode(score.priority);
  const priorityDesc = priorityDescription(priorityCde);
  const pColor = priorityColor(priorityCde);
  const rColor = riskColor(score.risk_level);

  const suggestedTeam = deriveSuggestedTeam(score.priority);
  const suggestedSla = deriveSla(score.priority);
  const currentStatus = deriveStatus(score.probable_cause);

  // Grouped telemetry feature subsets
  const categoryStats = [
    { key: 'mean_consumption', label: 'Mean Consumption', value: formatKWh(featMap.mean_consumption) },
    { key: 'median_consumption', label: 'Median Consumption', value: formatKWh(featMap.median_consumption) },
    { key: 'std_consumption', label: 'Std Dev Consumption', value: formatNumber(featMap.std_consumption, 4) },
    { key: 'min_consumption', label: 'Min Consumption', value: formatKWh(featMap.min_consumption) },
    { key: 'max_consumption', label: 'Max Consumption', value: formatKWh(featMap.max_consumption) },
    { key: 'coefficient_of_variation', label: 'Coeff of Variation', value: formatNumber(featMap.coefficient_of_variation, 4) },
  ];

  const categoryRolling = [
    { key: '7_day_mean', label: '7-Day Mean', value: formatKWh(featMap['7_day_mean']) },
    { key: '30_day_mean', label: '30-Day Mean', value: formatKWh(featMap['30_day_mean']) },
    { key: '90_day_mean', label: '90-Day Mean', value: formatKWh(featMap['90_day_mean']) },
    { key: 'recent_30_day_mean', label: 'Recent 30-Day Mean', value: formatKWh(featMap.recent_30_day_mean) },
    { key: 'recent_vs_historical', label: 'Recent vs Historical Ratio', value: formatNumber(featMap.recent_vs_historical, 4) },
    { key: 'consumption_trend', label: 'Consumption Trend', value: formatNumber(featMap.consumption_trend, 4) },
  ];

  const categoryQuality = [
    { key: 'missing_count', label: 'Missing Readings Count', value: safe(featMap.missing_count) },
    { key: 'missing_percentage', label: 'Missing Percentage', value: formatPct(Number(featMap.missing_percentage ?? 0) * 100) },
    { key: 'missing_zscore', label: 'Missing Z-Score', value: formatNumber(featMap.missing_zscore, 4) },
    { key: 'zero_count', label: 'Zero Readings Count', value: safe(featMap.zero_count) },
    { key: 'zero_percentage', label: 'Zero Percentage', value: formatPct(Number(featMap.zero_percentage ?? 0) * 100) },
    { key: 'zero_zscore', label: 'Zero Z-Score', value: formatNumber(featMap.zero_zscore, 4) },
    { key: 'max_zero_streak', label: 'Max Zero Streak (Days)', value: safe(featMap.max_zero_streak) },
    { key: 'max_missing_streak', label: 'Max Missing Streak (Days)', value: safe(featMap.max_missing_streak) },
  ];

  const categoryAnomaly = [
    { key: 'drop_ratio', label: 'Drop Ratio', value: formatNumber(featMap.drop_ratio, 4) },
    { key: 'recovery_ratio', label: 'Recovery Ratio', value: formatNumber(featMap.recovery_ratio, 4) },
    { key: 'deviation_pct', label: 'Deviation %', value: formatPct(featMap.deviation_pct ?? score.deviation_pct) },
    { key: 'detection_days', label: 'Detection Window (Days)', value: safe(featMap.detection_days) },
    { key: 'seasonal_amplitude', label: 'Seasonal Amplitude', value: formatNumber(featMap.seasonal_amplitude, 4) },
    { key: 'seasonal_residual', label: 'Seasonal Residual', value: formatNumber(featMap.seasonal_residual, 4) },
    { key: 'peer_zscore', label: 'Peer Group Z-Score', value: formatNumber(featMap.peer_zscore, 4) },
    { key: 'skewness', label: 'Distribution Skewness', value: formatNumber(featMap.skewness, 4) },
  ];

  const lifecycleRows = [
    { stage: 'Opened', desc: 'Alert logged in telemetry monitor' },
    { stage: 'Investigating', desc: 'Assigned to analytical team for review' },
    { stage: 'Inspection Scheduled', desc: 'Field crew dispatched for site audit' },
    { stage: 'Requires Review', desc: 'Pending senior engineer validation' },
    { stage: 'Resolved', desc: 'Verification complete / meter normalized' },
  ];

  return (
    <Document title={`Report_${score.CONS_NO}_${dateFormatted}`}>
      {/* PAGE 1: COVER + VERDICT */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.headerTitle}>GridGuard</Text>
            <Text style={styles.headerSubtitle}>Utility Intelligence & Theft Analytics</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.headerBadge}>CONFIDENTIAL</Text>
            <Text style={{ fontSize: 7, color: colors.slateMuted, marginTop: 2 }}>Inspection Diagnostic Report</Text>
          </View>
        </View>

        {/* Consumer Identity Block */}
        <View style={styles.identityBlock}>
          <View>
            <Text style={styles.identityTitle}>Target Consumer Endpoint</Text>
            <Text style={styles.identityValueMonospace}>{score.CONS_NO}</Text>
            <Text style={{ fontSize: 8, color: colors.slate, marginTop: 2 }}>
              Transformer Node (DT): <Text style={{ fontFamily: 'Courier-Bold', color: colors.navy }}>{score.dt_id || 'Unassigned'}</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7, color: colors.slate, textTransform: 'uppercase' }}>Report ID</Text>
            <Text style={{ fontFamily: 'Courier-Bold', fontSize: 9, color: colors.navy }}>{reportId}</Text>
            <Text style={{ fontSize: 7, color: colors.slateMuted, marginTop: 2 }}>Generated: {timestamp}</Text>
          </View>
        </View>

        {/* Verdict Card */}
        <View style={[styles.verdictCard, { borderColor: rColor, backgroundColor: score.risk_level === 'High' ? colors.roseBg : score.risk_level === 'Medium' ? colors.amberBg : score.risk_level === 'Low' ? colors.skyBg : colors.emeraldBg }]}>
          <View style={styles.verdictHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.verdictTitle, { color: rColor }]}>Classification Verdict</Text>
              <View style={[styles.pill, { backgroundColor: rColor, marginLeft: 8 }]}>
                <Text style={{ color: colors.white, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{score.risk_level} Risk</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: pColor, marginLeft: 6 }]}>
                <Text style={{ color: colors.white, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{priorityCde}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: score.predicted_flag === 1 ? colors.rose : colors.emerald }}>
              {score.predicted_flag === 1 ? 'FLAGGED ANOMALY' : 'NORMAL PATTERN'}
            </Text>
          </View>

          <View style={styles.verdictGrid}>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Combined Score</Text>
              <Text style={styles.verdictMetricValue}>{formatNumber(score.combined_score, 4)}</Text>
            </View>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Raw XGB Score</Text>
              <Text style={styles.verdictMetricValue}>{formatNumber(score.xgb_score, 4)}</Text>
            </View>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Probable Cause</Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.navy, textAlign: 'center' }}>
                {score.probable_cause || 'Unclassified'}
              </Text>
            </View>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Cause Confidence</Text>
              <Text style={styles.verdictMetricValue}>
                {score.cause_confidence !== undefined ? formatPct(score.cause_confidence * 100) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Explanation Box */}
        <View style={styles.explanationBox}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.sky, textTransform: 'uppercase', marginBottom: 4 }}>
            Diagnostic Assessment Executive Summary
          </Text>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>

        {/* Key Metrics Grid */}
        <Text style={styles.sectionHeader}>Key Consumption Baseline & Anomaly Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>1. Historical Mean</Text>
            <Text style={styles.metricValue}>{formatKWh(score.historical_mean)}</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>2. Current Mean</Text>
            <Text style={styles.metricValue}>{formatKWh(score.current_mean)}</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>3. Deviation %</Text>
            <Text style={[styles.metricValue, { color: (score.deviation_pct ?? 0) < -20 ? colors.rose : colors.navy }]}>
              {formatPct(score.deviation_pct)}
            </Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>4. Combined ML Score</Text>
            <Text style={styles.metricValue}>{formatNumber(score.combined_score, 4)}</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>5. Cause Confidence</Text>
            <Text style={styles.metricValue}>
              {score.cause_confidence !== undefined ? formatPct(score.cause_confidence * 100) : '—'}
            </Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>6. Detection Window</Text>
            <Text style={styles.metricValue}>{safe(featMap.detection_days, '—')} Days</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{reportId} | GridGuard Intelligence</Text>
          <Text style={styles.footerText}>Generated: {timestamp}</Text>
          <Text
            style={styles.footerPageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* PAGE 2: EVIDENCE + SHAP */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBandSubsequent}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.white }}>
            GridGuard — Consumer Evidence & Telemetry Breakdown
          </Text>
          <Text style={{ fontSize: 8, fontFamily: 'Courier', color: colors.slateMuted }}>
            Consumer: {score.CONS_NO}
          </Text>
        </View>

        <Text style={styles.sectionHeader}>Why This Consumer Was Flagged</Text>

        {/* Subsection A: Behavioural pattern */}
        <View style={{ backgroundColor: colors.slateLight, padding: 8, borderRadius: 4, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.navy }}>
              Behavioural Pattern: <Text style={{ color: colors.sky }}>{behaviourPattern.toUpperCase()}</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: colors.slateDark, marginTop: 2 }}>{behaviourDesc}</Text>
        </View>

        {/* Subsection B: SHAP Chart */}
        <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.slate, textTransform: 'uppercase', marginBottom: 4 }}>
          SHAP Feature Contributions (Model Explainability)
        </Text>
        {topFeatures.length > 0 ? (
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 8, marginBottom: 10, backgroundColor: '#ffffff' }}>
            <Svg width={500} height={topFeatures.length * 20 + 25}>
              <Line x1={250} y1={10} x2={250} y2={topFeatures.length * 20 + 15} stroke="#94a3b8" strokeWidth={0.5} />
              {topFeatures.map((f, i) => {
                const maxAbsShap = Math.max(...topFeatures.map((x) => Math.abs(x.shap)), 0.0001);
                const scale = 170 / maxAbsShap;
                const barWidth = Math.abs(f.shap) * scale;
                const barX = f.shap > 0 ? 250 : 250 - barWidth;
                const barColor = f.shap > 0 ? colors.rose : colors.teal;
                const featureNameTruncated = f.feature.length > 24 ? f.feature.substring(0, 24) + '…' : f.feature;
                const textVal = f.shap > 0 ? `+${f.shap.toFixed(4)}` : f.shap.toFixed(4);

                return (
                  <G key={i}>
                    <Text x={5} y={22 + i * 20} style={{ fontSize: 7.5, fontFamily: 'Helvetica' }}>
                      {featureNameTruncated}
                    </Text>
                    <Rect x={barX} y={14 + i * 20} width={Math.max(barWidth, 1)} height={10} fill={barColor} rx={1} />
                    <Text
                      x={f.shap > 0 ? 255 + barWidth : Math.max(10, 245 - barWidth - 35)}
                      y={22 + i * 20}
                      style={{ fontSize: 7, fontFamily: 'Courier', fill: colors.navy }}
                    >
                      {textVal}
                    </Text>
                  </G>
                );
              })}
            </Svg>
          </View>
        ) : (
          <View style={{ padding: 10, backgroundColor: colors.slateLight, borderRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 8, color: colors.slate, fontStyle: 'italic' }}>
              No SHAP evidence available for this consumer.
            </Text>
          </View>
        )}

        {/* Subsection C: Supporting feature table */}
        {topFeatures.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { width: '40%' }]}>Feature Name</Text>
              <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Measured Value</Text>
              <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>SHAP Value</Text>
              <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Direction</Text>
            </View>
            {topFeatures.map((f, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '40%' }]}>{f.feature}</Text>
                <Text style={[styles.tableCellMono, { width: '20%', textAlign: 'right' }]}>{formatNumber(f.value, 4)}</Text>
                <Text
                  style={[
                    styles.tableCellMono,
                    { width: '20%', textAlign: 'right', color: f.shap > 0 ? colors.rose : colors.emerald },
                  ]}
                >
                  {f.shap > 0 ? `+${f.shap.toFixed(4)}` : f.shap.toFixed(4)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      width: '20%',
                      textAlign: 'right',
                      fontFamily: 'Helvetica-Bold',
                      color: f.shap > 0 ? colors.rose : colors.teal,
                    },
                  ]}
                >
                  {f.shap > 0 ? '↑ theft' : '↓ theft'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Subsection D: Feature Snapshot */}
        <Text style={styles.sectionHeader}>Comprehensive Telemetry Feature Snapshot</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          {/* Table 1: Consumption statistics */}
          <View style={[styles.table, { width: '48%', marginBottom: 6 }]}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { width: '60%' }]}>1. Consumption Stats</Text>
              <Text style={[styles.tableCellHeader, { width: '40%', textAlign: 'right' }]}>Value</Text>
            </View>
            {categoryStats.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '60%' }]}>{item.label}</Text>
                <Text style={[styles.tableCellMono, { width: '40%', textAlign: 'right' }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Table 2: Rolling windows */}
          <View style={[styles.table, { width: '48%', marginBottom: 6 }]}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { width: '60%' }]}>2. Rolling Windows</Text>
              <Text style={[styles.tableCellHeader, { width: '40%', textAlign: 'right' }]}>Value</Text>
            </View>
            {categoryRolling.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '60%' }]}>{item.label}</Text>
                <Text style={[styles.tableCellMono, { width: '40%', textAlign: 'right' }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Table 3: Data Quality */}
          <View style={[styles.table, { width: '48%', marginBottom: 0 }]}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { width: '60%' }]}>3. Data Quality</Text>
              <Text style={[styles.tableCellHeader, { width: '40%', textAlign: 'right' }]}>Value</Text>
            </View>
            {categoryQuality.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '60%' }]}>{item.label}</Text>
                <Text style={[styles.tableCellMono, { width: '40%', textAlign: 'right' }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Table 4: Anomaly Signals */}
          <View style={[styles.table, { width: '48%', marginBottom: 0 }]}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { width: '60%' }]}>4. Anomaly Signals</Text>
              <Text style={[styles.tableCellHeader, { width: '40%', textAlign: 'right' }]}>Value</Text>
            </View>
            {categoryAnomaly.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '60%' }]}>{item.label}</Text>
                <Text style={[styles.tableCellMono, { width: '40%', textAlign: 'right' }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{reportId} | GridGuard Intelligence</Text>
          <Text style={styles.footerText}>Generated: {timestamp}</Text>
          <Text
            style={styles.footerPageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* PAGE 3: ACTION + AUDIT */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBandSubsequent}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.white }}>
            GridGuard — Action Directives & Lifecycle Audit
          </Text>
          <Text style={{ fontSize: 8, fontFamily: 'Courier', color: colors.slateMuted }}>
            Consumer: {score.CONS_NO}
          </Text>
        </View>

        {/* Section: Recommended Inspection */}
        <Text style={styles.sectionHeader}>Recommended Inspection Protocol</Text>
        <View style={{ backgroundColor: colors.skyBg, borderWidth: 1, borderColor: colors.sky, borderRadius: 4, padding: 10, marginBottom: 14 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.sky, marginBottom: 4 }}>
            Action Directive Summary
          </Text>
          <Text style={{ fontSize: 8.5, color: colors.textDark, lineHeight: 1.4, marginBottom: 8 }}>
            {score.recommended_action ||
              'Perform on-site physical inspection of meter enclosure, terminal seals, and current transformer connections. Verify neutral link connectivity and audit recent consumption logs.'}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#bae6fd', paddingTop: 6 }}>
            <View>
              <Text style={{ fontSize: 7, color: colors.slate }}>Action Priority</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: pColor }}>
                {priorityCde} — {priorityDesc}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 7, color: colors.slate }}>Assigned Dispatch Team</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.navy }}>{suggestedTeam}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 7, color: colors.slate }}>Target Resolution SLA</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.navy }}>{suggestedSla}</Text>
            </View>
          </View>
        </View>

        {/* Section: Case Lifecycle */}
        <Text style={styles.sectionHeader}>Case Lifecycle Status</Text>
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.tableCellHeader, { width: '30%' }]}>Lifecycle Stage</Text>
            <Text style={[styles.tableCellHeader, { width: '50%' }]}>Description</Text>
            <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Current State</Text>
          </View>
          {lifecycleRows.map((row, idx) => {
            const isSelected = row.stage === currentStatus;
            return (
              <View key={idx} style={isSelected ? styles.tableRowSelected : styles.tableRow}>
                <Text
                  style={[
                    styles.tableCell,
                    { width: '30%', fontFamily: isSelected ? 'Helvetica-Bold' : 'Helvetica', color: isSelected ? colors.sky : colors.textMain },
                  ]}
                >
                  {row.stage}
                </Text>
                <Text style={[styles.tableCell, { width: '50%', color: isSelected ? colors.navy : colors.textMuted }]}>
                  {row.desc}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      width: '20%',
                      textAlign: 'right',
                      fontFamily: 'Helvetica-Bold',
                      color: isSelected ? colors.sky : colors.slateMuted,
                    },
                  ]}
                >
                  {isSelected ? '● ACTIVE' : '○'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Section: Audit Footer */}
        <Text style={styles.sectionHeader}>System Audit Trail & Verification Disclaimer</Text>
        <View style={styles.auditBox}>
          <Text style={styles.auditTitle}>System Generated Audit Record</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <View>
              <Text style={styles.auditText}>Report Reference: {reportId}</Text>
              <Text style={styles.auditText}>Generation Time: {timestamp}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.auditText}>Model Identifier: xgboost-v2.0.3</Text>
              <Text style={styles.auditText}>Classification Threshold: 0.50 Combined Score</Text>
            </View>
          </View>
          <Text style={[styles.auditText, { fontFamily: 'Helvetica-Oblique', marginTop: 4, color: colors.slateDark }]}>
            Notice: This report is auto-generated based on machine learning telemetry inference. Field verification is required before any formal enforcement action, disconnections, or administrative penalties are imposed.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{reportId} | GridGuard Intelligence</Text>
          <Text style={styles.footerText}>Generated: {timestamp}</Text>
          <Text
            style={styles.footerPageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};
