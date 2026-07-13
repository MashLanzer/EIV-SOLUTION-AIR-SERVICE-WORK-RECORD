import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import type { PdfCompany } from "@/components/pdf/WorkRecordPdfDocument";
import type { PayReportRow } from "@/lib/payReport";

export type PayReportLabels = {
  title: string;
  range: string; // e.g. "Jan 1 – Jan 31"
  person: string;
  jobs: string;
  leadPay: string;
  helperPay: string;
  total: string;
  grandTotal: string;
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
  totalRow: { borderBottomWidth: 0, borderTopWidth: 1.5, borderTopColor: "#334155", borderTopStyle: "solid", marginTop: 2 },
  cName: { width: "34%" },
  cNum: { width: "12%", textAlign: "right" },
  cMoney: { width: "18%", textAlign: "right" },
  head: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  cell: { fontSize: 10, color: "#0f172a" },
  bold: { fontWeight: 700 },
});

export function PayReportPdfDocument({
  rows,
  grand,
  company,
  labels,
}: {
  rows: PayReportRow[];
  grand: { jobs: number; leadTotal: number; helperTotal: number; total: number };
  company: PdfCompany;
  labels: PayReportLabels;
}) {
  const cur = company.currency || "$";
  const money = (n: number) => `${cur}${n.toFixed(2)}`;

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
          <Text style={[styles.cName, styles.head]}>{labels.person}</Text>
          <Text style={[styles.cNum, styles.head]}>{labels.jobs}</Text>
          <Text style={[styles.cMoney, styles.head]}>{labels.leadPay}</Text>
          <Text style={[styles.cMoney, styles.head]}>{labels.helperPay}</Text>
          <Text style={[styles.cMoney, styles.head]}>{labels.total}</Text>
        </View>

        {rows.map((row) => (
          <View key={row.name.toLowerCase()} style={styles.row}>
            <Text style={[styles.cName, styles.cell]}>{row.name}</Text>
            <Text style={[styles.cNum, styles.cell]}>{row.jobs}</Text>
            <Text style={[styles.cMoney, styles.cell]}>{money(row.leadTotal)}</Text>
            <Text style={[styles.cMoney, styles.cell]}>{money(row.helperTotal)}</Text>
            <Text style={[styles.cMoney, styles.cell, styles.bold]}>{money(row.total)}</Text>
          </View>
        ))}

        <View style={[styles.row, styles.totalRow]}>
          <Text style={[styles.cName, styles.cell, styles.bold]}>{labels.grandTotal}</Text>
          <Text style={[styles.cNum, styles.cell, styles.bold]}>{grand.jobs}</Text>
          <Text style={[styles.cMoney, styles.cell, styles.bold]}>{money(grand.leadTotal)}</Text>
          <Text style={[styles.cMoney, styles.cell, styles.bold]}>{money(grand.helperTotal)}</Text>
          <Text style={[styles.cMoney, styles.cell, styles.bold]}>{money(grand.total)}</Text>
        </View>
      </Page>
    </Document>
  );
}
