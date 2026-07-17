import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import type { PdfCompany } from "@/components/pdf/WorkRecordPdfDocument";

export type EstimateLineForPdf = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type EstimateForPdf = {
  number: string; // pre-formatted, e.g. "EST-0042"
  statusLabel: string;
  customerName: string;
  customerAddress: string | null;
  issued: string; // formatted date
  validTill: string | null; // formatted date
  taxRatePercent: number;
  notes: string | null;
  lines: EstimateLineForPdf[];
  subtotal: number;
  tax: number;
  total: number;
};

export type EstimateLabels = {
  estimate: string;
  quoteFor: string;
  issued: string;
  validTill: string;
  status: string;
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string;
  disclaimer: string;
};

// Matches the invoice PDF's editorial, monochrome system (ink #171717 on
// paper) so a company's paperwork reads as one brand.
const INK = "#171717";
const MUTED = "#737373";
const FAINT = "#a3a3a3";
const HAIR = "#e5e5e5";
const SOFT = "#f5f5f5";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9.5, fontFamily: "Helvetica", color: INK },
  frame: { flexGrow: 1, borderWidth: 1, borderColor: HAIR, borderStyle: "solid", borderRadius: 6, padding: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  monogram: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: INK,
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  monogramText: { fontSize: 15, fontWeight: 700 },
  logo: { height: 40, maxWidth: 130, objectFit: "contain" },
  companyName: { fontSize: 12, fontWeight: 700, letterSpacing: 0.5 },
  companyMeta: { fontSize: 8, color: MUTED, marginTop: 1.5 },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: 4, textAlign: "right" },
  titleMeta: { fontSize: 8.5, color: MUTED, marginTop: 3, textAlign: "right", letterSpacing: 1 },
  rule: { height: 1, backgroundColor: HAIR, marginVertical: 18 },
  metaRow: { flexDirection: "row", gap: 24, marginBottom: 20 },
  metaCol: { flexGrow: 1 },
  eyebrow: { fontSize: 7.5, color: FAINT, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  metaValue: { fontSize: 10 },
  billRow: { flexDirection: "row", justifyContent: "space-between", gap: 20, marginBottom: 22 },
  billTo: { flexGrow: 1, paddingRight: 12 },
  billName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  billMeta: { fontSize: 9, color: MUTED, lineHeight: 1.4 },
  dueBox: { width: 210, backgroundColor: SOFT, borderRadius: 6, padding: 14 },
  dueAmount: { fontSize: 22, fontWeight: 700, marginTop: 2 },
  dueSub: { fontSize: 8, color: MUTED, marginTop: 4 },
  thead: {
    flexDirection: "row",
    backgroundColor: INK,
    color: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  th: { fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.8 },
  trow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: HAIR,
    borderBottomStyle: "solid",
  },
  cDesc: { width: "50%", paddingRight: 8 },
  cRate: { width: "18%", textAlign: "right" },
  cQty: { width: "12%", textAlign: "right" },
  cAmt: { width: "20%", textAlign: "right" },
  cellStrong: { fontWeight: 700 },
  bottom: { flexDirection: "row", justifyContent: "space-between", gap: 24, marginTop: 18 },
  notes: { flexGrow: 1, paddingRight: 12 },
  notesBody: { fontSize: 9, color: MUTED, marginTop: 4, lineHeight: 1.45 },
  totals: { width: 210 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalMuted: { color: MUTED },
  grandBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: INK,
    color: "#ffffff",
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  grandLabel: { fontSize: 8.5, textTransform: "uppercase", letterSpacing: 1 },
  grandValue: { fontSize: 13, fontWeight: 700 },
  pageFoot: { marginTop: "auto", paddingTop: 16 },
  footRule: { height: 1, backgroundColor: HAIR, marginBottom: 10 },
  disclaimer: { fontSize: 7.5, color: FAINT, lineHeight: 1.5 },
  footLine: { fontSize: 8, color: FAINT, textAlign: "center", marginTop: 12, letterSpacing: 0.5 },
});

export function EstimatePdfDocument({
  estimate,
  company,
  labels,
}: {
  estimate: EstimateForPdf;
  company: PdfCompany;
  labels: EstimateLabels;
}) {
  const cur = company.currency || "$";
  const money = (n: number) => `${cur}${n.toFixed(2)}`;
  const initial = (company.name?.trim()?.[0] ?? "A").toUpperCase();

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.header}>
            <View style={styles.brand}>
              {company.logoUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is not an HTML img
                <Image src={company.logoUrl} style={styles.logo} />
              ) : (
                <>
                  <View style={styles.monogram}>
                    <Text style={styles.monogramText}>{initial}</Text>
                  </View>
                  <View>
                    <Text style={styles.companyName}>{company.name}</Text>
                    {company.address ? <Text style={styles.companyMeta}>{company.address}</Text> : null}
                    {company.phone ? <Text style={styles.companyMeta}>{company.phone}</Text> : null}
                    {company.license ? <Text style={styles.companyMeta}>{company.license}</Text> : null}
                  </View>
                </>
              )}
            </View>
            <View>
              <Text style={styles.title}>{labels.estimate.toUpperCase()}</Text>
              <Text style={styles.titleMeta}>{estimate.number}</Text>
            </View>
          </View>

          <View style={styles.rule} />

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.eyebrow}>{labels.issued}</Text>
              <Text style={styles.metaValue}>{estimate.issued}</Text>
            </View>
            {estimate.validTill ? (
              <View style={styles.metaCol}>
                <Text style={styles.eyebrow}>{labels.validTill}</Text>
                <Text style={styles.metaValue}>{estimate.validTill}</Text>
              </View>
            ) : null}
            <View style={styles.metaCol}>
              <Text style={styles.eyebrow}>{labels.status}</Text>
              <Text style={styles.metaValue}>{estimate.statusLabel}</Text>
            </View>
          </View>

          <View style={styles.billRow}>
            <View style={styles.billTo}>
              <Text style={styles.eyebrow}>{labels.quoteFor}</Text>
              <Text style={styles.billName}>{estimate.customerName}</Text>
              {estimate.customerAddress ? (
                <Text style={styles.billMeta}>{estimate.customerAddress}</Text>
              ) : null}
            </View>
            <View style={styles.dueBox}>
              <Text style={styles.eyebrow}>{labels.total}</Text>
              <Text style={styles.dueAmount}>{money(estimate.total)}</Text>
              {estimate.validTill ? (
                <Text style={styles.dueSub}>
                  {labels.validTill}: {estimate.validTill}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.thead}>
            <Text style={[styles.cDesc, styles.th]}>{labels.description}</Text>
            <Text style={[styles.cRate, styles.th]}>{labels.unitPrice}</Text>
            <Text style={[styles.cQty, styles.th]}>{labels.qty}</Text>
            <Text style={[styles.cAmt, styles.th]}>{labels.amount}</Text>
          </View>
          {estimate.lines.map((li, i) => (
            <View key={i} style={styles.trow}>
              <Text style={styles.cDesc}>{li.description}</Text>
              <Text style={styles.cRate}>{money(li.unitPrice)}</Text>
              <Text style={styles.cQty}>{li.quantity}</Text>
              <Text style={[styles.cAmt, styles.cellStrong]}>{money(li.quantity * li.unitPrice)}</Text>
            </View>
          ))}

          <View style={styles.bottom}>
            <View style={styles.notes}>
              {estimate.notes ? (
                <>
                  <Text style={styles.eyebrow}>{labels.notes}</Text>
                  <Text style={styles.notesBody}>{estimate.notes}</Text>
                </>
              ) : null}
            </View>
            <View style={styles.totals}>
              <View style={styles.totalLine}>
                <Text style={styles.totalMuted}>{labels.subtotal}</Text>
                <Text>{money(estimate.subtotal)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.totalMuted}>
                  {labels.tax} ({estimate.taxRatePercent}%)
                </Text>
                <Text>{money(estimate.tax)}</Text>
              </View>
              <View style={styles.grandBar}>
                <Text style={styles.grandLabel}>{labels.total}</Text>
                <Text style={styles.grandValue}>{money(estimate.total)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.pageFoot}>
            <View style={styles.footRule} />
            <Text style={styles.disclaimer}>{labels.disclaimer}</Text>
            <Text style={styles.footLine}>
              {[company.name, company.phone, company.address].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
