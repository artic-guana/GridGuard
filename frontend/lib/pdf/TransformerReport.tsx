import React from 'react';
import { Document, Page, View, Text, Svg, Rect, Line, G } from '@react-pdf/renderer';
import { styles, colors } from './theme';
import {
  DTScore,
  ConsumerScore,
  formatNumber,
  formatKWh,
  formatPct,
  formatTimestamp,
  priorityCode,
  priorityDescription,
  priorityColor,
  deriveDtEnergy,
} from './helpers';

interface TransformerReportProps {
  dt: DTScore;
  consumers: ConsumerScore[];
}

export const TransformerReport: React.FC<TransformerReportProps> = ({ dt, consumers }) => {
  const timestamp = formatTimestamp();
  const dateFormatted = timestamp.substring(0, 10).replace(/-/g, '');
  const reportId = `RPT-DT-${dt.dt_id}-${dateFormatted}`;

  const energy = deriveDtEnergy(dt);
  const pCode = priorityCode(dt.dt_priority);
  const pDesc = priorityDescription(pCode);
  const pColor = priorityColor(pCode);

  // Filter flagged consumers under this transformer
  const flaggedConsumers = (consumers || [])
    .filter((c) => c.dt_id === dt.dt_id && c.predicted_flag === 1)
    .sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0))
    .slice(0, 25);

  const flaggedRatioPct = formatPct((dt.flagged_ratio ?? 0) * 100);
  const suspicionPct = formatPct((dt.dt_suspicion ?? 0) * 100);
  const lossKWhFormatted = energy.unexplainedLossKWh.toFixed(2);
  const lossPctFormatted = energy.unexplainedLossPct.toFixed(1);

  const explanation = `Transformer ${dt.dt_id} has been flagged with a suspicion score of ${suspicionPct}. ${dt.flagged_count} of ${dt.total_count} connected consumers (${flaggedRatioPct}) were classified as anomalous. The transformer shows an unexplained loss of ${lossKWhFormatted} kWh/day (${lossPctFormatted}% above the technical baseline).`;

  // Cause distribution counts
  const causeCounts: Record<string, number> = {};
  consumers.forEach((c) => {
    if (c.dt_id === dt.dt_id) {
      const cause = c.probable_cause || 'Unclassified';
      causeCounts[cause] = (causeCounts[cause] || 0) + 1;
    }
  });
  const causeEntries = Object.entries(causeCounts).sort((a, b) => b[1] - a[1]);

  // Priority distribution counts
  const priorityCounts: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  consumers.forEach((c) => {
    if (c.dt_id === dt.dt_id) {
      const p = priorityCode(c.priority);
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    }
  });
  const priorityEntries = Object.entries(priorityCounts);

  return (
    <Document title={`Report_DT_${dt.dt_id}_${dateFormatted}`}>
      {/* PAGE 1: COVER + VERDICT */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.headerTitle}>GridGuard</Text>
            <Text style={styles.headerSubtitle}>Distribution Node Intelligence Report</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.headerBadge}>CONFIDENTIAL</Text>
            <Text style={{ fontSize: 7, color: colors.slateMuted, marginTop: 2 }}>Feeder Transformer Audit</Text>
          </View>
        </View>

        {/* Transformer Identity Block */}
        <View style={styles.identityBlock}>
          <View>
            <Text style={styles.identityTitle}>Target Transformer Feeder Node</Text>
            <Text style={styles.identityValueMonospace}>{dt.dt_id}</Text>
            <Text style={{ fontSize: 8, color: colors.slate, marginTop: 2 }}>
              Priority Classification: <Text style={{ fontFamily: 'Helvetica-Bold', color: pColor }}>{pCode} — {pDesc}</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7, color: colors.slate, textTransform: 'uppercase' }}>Report ID</Text>
            <Text style={{ fontFamily: 'Courier-Bold', fontSize: 9, color: colors.navy }}>{reportId}</Text>
            <Text style={{ fontSize: 7, color: colors.slateMuted, marginTop: 2 }}>Generated: {timestamp}</Text>
          </View>
        </View>

        {/* Verdict / Health Card */}
        <View
          style={[
            styles.verdictCard,
            {
              borderColor: pColor,
              backgroundColor: dt.dt_priority === 'P1' ? colors.roseBg : dt.dt_priority === 'P2' ? colors.amberBg : colors.skyBg,
            },
          ]}
        >
          <View style={styles.verdictHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.verdictTitle, { color: pColor }]}>Node Suspicion Score</Text>
              <View style={[styles.pill, { backgroundColor: pColor, marginLeft: 8 }]}>
                <Text style={{ color: colors.white, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{dt.dt_priority} Priority</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Courier-Bold', color: colors.navy }}>
              Suspicion: {suspicionPct}
            </Text>
          </View>

          <View style={styles.verdictGrid}>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Isolation Forest Risk</Text>
              <Text style={styles.verdictMetricValue}>{formatPct((dt.dt_if_risk ?? 0) * 100)}</Text>
            </View>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Max IF Risk</Text>
              <Text style={styles.verdictMetricValue}>{formatPct((dt.dt_if_risk_max ?? 0) * 100)}</Text>
            </View>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Flagged Consumers</Text>
              <Text style={styles.verdictMetricValue}>
                {dt.flagged_count} / {dt.total_count}
              </Text>
            </View>
            <View style={styles.verdictMetric}>
              <Text style={styles.verdictMetricLabel}>Flagged Ratio</Text>
              <Text style={styles.verdictMetricValue}>{flaggedRatioPct}</Text>
            </View>
          </View>
        </View>

        {/* Explanation Paragraph */}
        <View style={styles.explanationBox}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.sky, textTransform: 'uppercase', marginBottom: 4 }}>
            Transformer Feeder Diagnostic Executive Summary
          </Text>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>

        {/* Key Metrics Grid */}
        <Text style={styles.sectionHeader}>Transformer Energy Balance & Loss Breakdown</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>1. Input Energy</Text>
            <Text style={styles.metricValue}>{formatKWh(energy.inputEnergyKWh)}/day</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>2. Consumer Usage</Text>
            <Text style={styles.metricValue}>{formatKWh(energy.consumerUsageKWh)}/day</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>3. Unexplained Loss</Text>
            <Text style={[styles.metricValue, { color: energy.unexplainedLossKWh > 0 ? colors.rose : colors.navy }]}>
              {formatKWh(energy.unexplainedLossKWh)}/day
            </Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>4. Unexplained Loss %</Text>
            <Text style={[styles.metricValue, { color: energy.unexplainedLossPct > 10 ? colors.rose : colors.navy }]}>
              {formatPct(energy.unexplainedLossPct)}
            </Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>5. IF Anomaly Risk</Text>
            <Text style={styles.metricValue}>{formatPct((dt.dt_if_risk ?? 0) * 100)}</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>6. Action Priority</Text>
            <Text style={[styles.metricValue, { color: pColor }]}>{pCode}</Text>
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

      {/* PAGE 2: CONSUMER BREAKDOWN & DISTRIBUTIONS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBandSubsequent}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.white }}>
            GridGuard — Transformer Consumer Inventory & Analytics
          </Text>
          <Text style={{ fontSize: 8, fontFamily: 'Courier', color: colors.slateMuted }}>
            Transformer: {dt.dt_id}
          </Text>
        </View>

        {/* Section: Flagged Consumers Table */}
        <Text style={styles.sectionHeader}>Flagged Consumers Under This Transformer (Top 25)</Text>
        {flaggedConsumers.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCellHeader, { width: '25%' }]}>Consumer ID</Text>
              <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>ML Score</Text>
              <Text style={[styles.tableCellHeader, { width: '25%' }]}>Probable Cause</Text>
              <Text style={[styles.tableCellHeader, { width: '15%', textAlign: 'center' }]}>Priority</Text>
              <Text style={[styles.tableCellHeader, { width: '15%', textAlign: 'right' }]}>Deviation %</Text>
            </View>
            {flaggedConsumers.map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCellMono, { width: '25%', fontFamily: 'Courier-Bold' }]}>{c.CONS_NO}</Text>
                <Text style={[styles.tableCellMono, { width: '20%', textAlign: 'right', color: colors.rose }]}>
                  {formatNumber(c.combined_score, 4)}
                </Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{c.probable_cause || 'Unclassified'}</Text>
                <Text style={[styles.tableCell, { width: '15%', textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>
                  {c.priority || 'P3'}
                </Text>
                <Text
                  style={[
                    styles.tableCellMono,
                    { width: '15%', textAlign: 'right', color: (c.deviation_pct ?? 0) < -20 ? colors.rose : colors.navy },
                  ]}
                >
                  {formatPct(c.deviation_pct)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ padding: 12, backgroundColor: colors.slateLight, borderRadius: 4, marginBottom: 12 }}>
            <Text style={{ fontSize: 8.5, color: colors.slate, fontStyle: 'italic', textAlign: 'center' }}>
              No flagged consumers under this transformer.
            </Text>
          </View>
        )}

        {/* Distributions Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          {/* Cause Distribution Chart */}
          <View style={{ width: '48%' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.slate, textTransform: 'uppercase', marginBottom: 4 }}>
              Probable Cause Distribution
            </Text>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 8, backgroundColor: '#ffffff' }}>
              {causeEntries.length > 0 ? (
                <Svg width={230} height={causeEntries.length * 18 + 10}>
                  {causeEntries.map(([cause, count], idx) => {
                    const maxCount = Math.max(...causeEntries.map((x) => x[1]), 1);
                    const barW = (count / maxCount) * 120;
                    return (
                      <G key={idx}>
                        <Text x={0} y={16 + idx * 18} style={{ fontSize: 7, fontFamily: 'Helvetica' }}>
                          {cause.length > 15 ? cause.substring(0, 15) + '…' : cause}
                        </Text>
                        <Rect x={90} y={8 + idx * 18} width={Math.max(barW, 2)} height={10} fill={colors.sky} rx={1} />
                        <Text x={95 + barW} y={16 + idx * 18} style={{ fontSize: 7, fontFamily: 'Courier-Bold' }}>
                          {count}
                        </Text>
                      </G>
                    );
                  })}
                </Svg>
              ) : (
                <Text style={{ fontSize: 8, color: colors.slate }}>No cause data available.</Text>
              )}
            </View>
          </View>

          {/* Priority Distribution Chart */}
          <View style={{ width: '48%' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.slate, textTransform: 'uppercase', marginBottom: 4 }}>
              Priority Code Distribution
            </Text>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 8, backgroundColor: '#ffffff' }}>
              <Svg width={230} height={priorityEntries.length * 18 + 10}>
                {priorityEntries.map(([p, count], idx) => {
                  const maxCount = Math.max(...priorityEntries.map((x) => x[1]), 1);
                  const barW = (count / maxCount) * 140;
                  const color = priorityColor(p);
                  return (
                    <G key={idx}>
                      <Text x={0} y={16 + idx * 18} style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', fill: color }}>
                        {p}
                      </Text>
                      <Rect x={30} y={8 + idx * 18} width={Math.max(barW, 2)} height={10} fill={color} rx={1} />
                      <Text x={35 + barW} y={16 + idx * 18} style={{ fontSize: 7, fontFamily: 'Courier-Bold' }}>
                        {count}
                      </Text>
                    </G>
                  );
                })}
              </Svg>
            </View>
          </View>
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
