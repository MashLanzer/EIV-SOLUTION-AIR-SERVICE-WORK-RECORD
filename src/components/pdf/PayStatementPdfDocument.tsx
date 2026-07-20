import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import type { PdfCompany } from "@/components/pdf/WorkRecordPdfDocument";

export type PayStatementRow = {
  date: string; // pre-formatted
  jobNumber: string;
  customer: string;
  hours: string; // pre-formatted, e.g. "6.5"
  pay: number;
};

export type PayStatementLabels = {
  title: string; // "Pay statement"
  worker: string; // "For {name}" (already interpolated)
  range: string; // period range, e.g. "Jul 2026"
  approvedNote: string; // "Approved records only."
  colDate: string;
  colJob: string;
  colCustomer: string;
  colHours: string;
  colPay: string;
  total: string; // "Total"
  empty: string; // shown when there are no records
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 40, maxWidth: 110, objectFit: "contain" },
  companyName: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 11, color: "#475569", marginTop: 2 },
  meta: { fontSize: 9, color: "#64748b", marginTop: 2 },
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
  cDate: { width: "18%" },
  cJob: { width: "16%" },
  cCust: { width: "34%" },
  cHours: { width: "14%", textAlign: "right" },
  cPay: { width: "18%", textAlign: "right" },
  head: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  cell: { fontSize: 10, color: "#0f172a" },
  bold: { fontWeight: 700 },
  empty: { marginTop: 16, fontSize: 11, color: "#64748b" },
});

export function PayStatementPdfDocument({
  rows,
  totals,
  company,
  labels,
}: {
  rows: PayStatementRow[];
  totals: { hours: string; pay: number };
  company: PdfCompany;
  labels: PayStatementLabels;
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
            <Text style={styles.meta}>
              {labels.worker} · {labels.range}
            </Text>
            <Text style={styles.meta}>{labels.approvedNote}</Text>
          </View>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>{labels.empty}</Text>
        ) : (
          <>
            <View style={[styles.row, styles.headRow]}>
              <Text style={[styles.cDate, styles.head]}>{labels.colDate}</Text>
              <Text style={[styles.cJob, styles.head]}>{labels.colJob}</Text>
              <Text style={[styles.cCust, styles.head]}>{labels.colCustomer}</Text>
              <Text style={[styles.cHours, styles.head]}>{labels.colHours}</Text>
              <Text style={[styles.cPay, styles.head]}>{labels.colPay}</Text>
            </View>

            {rows.map((row, i) => (
              <View key={i} style={styles.row}>
                <Text style={[styles.cDate, styles.cell]}>{row.date}</Text>
                <Text style={[styles.cJob, styles.cell]}>{row.jobNumber}</Text>
                <Text style={[styles.cCust, styles.cell]}>{row.customer}</Text>
                <Text style={[styles.cHours, styles.cell]}>{row.hours}</Text>
                <Text style={[styles.cPay, styles.cell, styles.bold]}>{money(row.pay)}</Text>
              </View>
            ))}

            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.cDate, styles.cell, styles.bold]}>{labels.total}</Text>
              <Text style={[styles.cJob, styles.cell]} />
              <Text style={[styles.cCust, styles.cell]} />
              <Text style={[styles.cHours, styles.cell, styles.bold]}>{totals.hours}</Text>
              <Text style={[styles.cPay, styles.cell, styles.bold]}>{money(totals.pay)}</Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}
