import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import type { PdfCompany } from "@/components/pdf/WorkRecordPdfDocument";
import type { UtilizationReport } from "@/lib/utilization";

export type UtilizationLabels = {
  title: string;
  range: string; // e.g. "Week of Jan 6" or "January 2026"
  name: string; // "Person" or "Team"
  planned: string;
  logged: string;
  utilization: string;
  grandTotal: string;
  noTeam: string;
  hoursSuffix: string; // "h"
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 40, maxWidth: 110, objectFit: "contain" },
  companyName: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 11, color: "#475569", marginTop: 2 },
  range: { fontSize: 9, color: "#64748b", marginTop: 2 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingVertical: 5,
  },
  headRow: { borderBottomColor: "#94a3b8" },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 1.5,
    borderTopColor: "#334155",
    borderTopStyle: "solid",
    marginTop: 2,
  },
  cName: { width: "46%" },
  cNum: { width: "18%", textAlign: "right" },
  head: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  cell: { fontSize: 10, color: "#0f172a" },
  bold: { fontWeight: 700 },
});

function pct(planned: number, logged: number): string {
  if (planned <= 0) return "—";
  return `${Math.round((logged / planned) * 100)}%`;
}

export function UtilizationReportPdfDocument({
  report,
  company,
  labels,
}: {
  report: UtilizationReport;
  company: PdfCompany;
  labels: UtilizationLabels;
}) {
  const h = (n: number) => `${n}${labels.hoursSuffix}`;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {company.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img
            <Image src={company.logoUrl} style={styles.logo} />
          ) : null}
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.subtitle}>{labels.title}</Text>
            <Text style={styles.range}>{labels.range}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.cName, styles.head]}>{labels.name}</Text>
          <Text style={[styles.cNum, styles.head]}>{labels.planned}</Text>
          <Text style={[styles.cNum, styles.head]}>{labels.logged}</Text>
          <Text style={[styles.cNum, styles.head]}>{labels.utilization}</Text>
        </View>

        {report.rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={[styles.cName, styles.cell]}>
              {row.name === "__none__" ? labels.noTeam : row.name}
            </Text>
            <Text style={[styles.cNum, styles.cell]}>{h(row.plannedHours)}</Text>
            <Text style={[styles.cNum, styles.cell]}>{h(row.loggedHours)}</Text>
            <Text style={[styles.cNum, styles.cell]}>
              {pct(row.plannedHours, row.loggedHours)}
            </Text>
          </View>
        ))}

        <View style={[styles.row, styles.totalRow]}>
          <Text style={[styles.cName, styles.cell, styles.bold]}>{labels.grandTotal}</Text>
          <Text style={[styles.cNum, styles.cell, styles.bold]}>
            {h(report.totals.plannedHours)}
          </Text>
          <Text style={[styles.cNum, styles.cell, styles.bold]}>
            {h(report.totals.loggedHours)}
          </Text>
          <Text style={[styles.cNum, styles.cell, styles.bold]}>
            {pct(report.totals.plannedHours, report.totals.loggedHours)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
