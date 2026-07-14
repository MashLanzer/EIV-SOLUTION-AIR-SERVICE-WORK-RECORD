import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import type { PdfCompany } from "@/components/pdf/WorkRecordPdfDocument";

export type InvoiceLineForPdf = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceForPdf = {
  number: string; // pre-formatted, e.g. "INV-0042"
  statusLabel: string;
  customerName: string;
  customerAddress: string | null;
  issued: string; // formatted date
  due: string | null; // formatted date
  taxRatePercent: number;
  notes: string | null;
  lines: InvoiceLineForPdf[];
  subtotal: number;
  tax: number;
  total: number;
};

export type InvoiceLabels = {
  invoice: string;
  billTo: string;
  issued: string;
  due: string;
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  header: { marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 40, maxWidth: 110, objectFit: "contain" },
  companyName: { fontSize: 15, fontWeight: 700 },
  companyMeta: { fontSize: 8, color: "#64748b", marginTop: 2 },
  invoiceTitle: { fontSize: 18, fontWeight: 700, textAlign: "right" },
  invoiceMeta: { fontSize: 9, color: "#64748b", marginTop: 2, textAlign: "right" },
  billRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  label: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  strong: { fontWeight: 700 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingVertical: 5,
  },
  headRow: { borderBottomColor: "#94a3b8" },
  cDesc: { width: "52%" },
  cNum: { width: "16%", textAlign: "right" },
  head: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  totals: { marginTop: 10, marginLeft: "auto", width: "45%" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1.5, borderTopColor: "#334155", borderTopStyle: "solid", marginTop: 2, paddingTop: 5 },
  notes: { marginTop: 18 },
  notesBody: { fontSize: 9, color: "#334155", marginTop: 3 },
});

export function InvoicePdfDocument({
  invoice,
  company,
  labels,
}: {
  invoice: InvoiceForPdf;
  company: PdfCompany;
  labels: InvoiceLabels;
}) {
  const cur = company.currency || "$";
  const money = (n: number) => `${cur}${n.toFixed(2)}`;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {company.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img
              <Image src={company.logoUrl} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.companyName}>{company.name}</Text>
              {company.address ? <Text style={styles.companyMeta}>{company.address}</Text> : null}
              {company.phone ? <Text style={styles.companyMeta}>{company.phone}</Text> : null}
              {company.license ? <Text style={styles.companyMeta}>{company.license}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{invoice.number}</Text>
            <Text style={styles.invoiceMeta}>{invoice.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.billRow}>
          <View>
            <Text style={styles.label}>{labels.billTo}</Text>
            <Text style={styles.strong}>{invoice.customerName}</Text>
            {invoice.customerAddress ? <Text>{invoice.customerAddress}</Text> : null}
          </View>
          <View>
            <Text style={{ textAlign: "right" }}>
              {labels.issued}: {invoice.issued}
            </Text>
            {invoice.due ? (
              <Text style={{ textAlign: "right" }}>
                {labels.due}: {invoice.due}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Line items */}
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.cDesc, styles.head]}>{labels.description}</Text>
          <Text style={[styles.cNum, styles.head]}>{labels.qty}</Text>
          <Text style={[styles.cNum, styles.head]}>{labels.unitPrice}</Text>
          <Text style={[styles.cNum, styles.head]}>{labels.amount}</Text>
        </View>
        {invoice.lines.map((li, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cDesc}>{li.description}</Text>
            <Text style={styles.cNum}>{li.quantity}</Text>
            <Text style={styles.cNum}>{money(li.unitPrice)}</Text>
            <Text style={styles.cNum}>{money(li.quantity * li.unitPrice)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={{ color: "#64748b" }}>{labels.subtotal}</Text>
            <Text>{money(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={{ color: "#64748b" }}>
              {labels.tax} ({invoice.taxRatePercent}%)
            </Text>
            <Text>{money(invoice.tax)}</Text>
          </View>
          <View style={[styles.totalLine, styles.grand]}>
            <Text style={styles.strong}>{labels.total}</Text>
            <Text style={styles.strong}>{money(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={styles.notes}>
            <Text style={styles.label}>{labels.notes}</Text>
            <Text style={styles.notesBody}>{invoice.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
