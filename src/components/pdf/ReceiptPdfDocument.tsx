import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { WorkPhoto, WorkRecord } from "@prisma/client";

import type { PdfCompany } from "@/components/pdf/WorkRecordPdfDocument";

// The customer-facing labels, passed in so the PDF matches the viewer's
// language (the receipt page is bilingual). A subset of the `receipt` dict.
export type ReceiptLabels = {
  title: string;
  job: string;
  date: string;
  customer: string;
  address: string;
  typeOfWork: string;
  time: string;
  performedBy: string;
  workPerformed: string;
  photos: string;
  customerSignature: string;
  footer: string;
};

type ReceiptRecord = WorkRecord & { photos?: WorkPhoto[] };

// Monochrome to match the app (ink on paper), styled to read as one system
// with the invoice PDF: a wordmark title + monogram, eyebrow labels, hairline
// rules and a quiet footer.
const INK = "#171717";
const MUTED = "#737373";
const FAINT = "#a3a3a3";
const HAIR = "#e5e5e5";

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
  title: { fontSize: 22, fontWeight: 700, letterSpacing: 5, textAlign: "right" },
  titleMeta: { fontSize: 8.5, color: MUTED, marginTop: 3, textAlign: "right", letterSpacing: 1 },
  rule: { height: 1, backgroundColor: HAIR, marginVertical: 18 },
  eyebrow: { fontSize: 7.5, color: FAINT, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  // Client + meta
  topRow: { flexDirection: "row", justifyContent: "space-between", gap: 20, marginBottom: 20 },
  clientName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  clientMeta: { fontSize: 9, color: MUTED, lineHeight: 1.4 },
  metaRight: { textAlign: "right" },
  metaValue: { fontSize: 10 },
  // Details grid
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  field: { width: "50%", marginBottom: 12, paddingRight: 10 },
  fieldValue: { fontSize: 10 },
  // Notes
  block: { marginBottom: 16 },
  notesBody: { fontSize: 9.5, color: "#404040", marginTop: 4, lineHeight: 1.45 },
  // Photos
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  photo: {
    width: "31.5%",
    height: 100,
    objectFit: "cover",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: HAIR,
    borderStyle: "solid",
  },
  // Signature
  signatureBox: { width: "48%", marginTop: 4 },
  signatureImage: { height: 60, objectFit: "contain" },
  signatureCaption: {
    fontSize: 8,
    color: MUTED,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: HAIR,
    borderTopStyle: "solid",
    paddingTop: 4,
  },
  // Footer
  pageFoot: { marginTop: "auto", paddingTop: 16 },
  footRule: { height: 1, backgroundColor: HAIR, marginBottom: 10 },
  thanks: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  footLine: { fontSize: 8, color: FAINT, letterSpacing: 0.5 },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "-"}</Text>
    </View>
  );
}

// A customer-facing receipt: the same details as the on-screen receipt (no pay
// or installer signature), rendered as a branded, printable PDF.
export function ReceiptPdfDocument({
  record,
  company,
  labels,
  locale,
}: {
  record: ReceiptRecord;
  company: PdfCompany;
  labels: ReceiptLabels;
  locale: string;
}) {
  const dateStr = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(record.date);
  const performedBy = [record.leadInstallerName, record.helperName].filter(Boolean).join(", ");
  const photos = record.photos ?? [];
  const initial = (company.name?.trim()?.[0] ?? "A").toUpperCase();

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.frame}>
          {/* Header */}
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
                    {company.phone ? <Text style={styles.companyMeta}>{company.phone}</Text> : null}
                    {company.address ? <Text style={styles.companyMeta}>{company.address}</Text> : null}
                    {company.license ? <Text style={styles.companyMeta}>{company.license}</Text> : null}
                  </View>
                </>
              )}
            </View>
            <View>
              <Text style={styles.title}>{labels.title.toUpperCase()}</Text>
              <Text style={styles.titleMeta}>
                {labels.job} #{record.jobNumber}
              </Text>
            </View>
          </View>

          <View style={styles.rule} />

          {/* Client + date */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.eyebrow}>{labels.customer}</Text>
              <Text style={styles.clientName}>{record.customerName}</Text>
              {record.customerAddress ? (
                <Text style={styles.clientMeta}>{record.customerAddress}</Text>
              ) : null}
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.eyebrow}>{labels.date}</Text>
              <Text style={styles.metaValue}>{dateStr}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.grid}>
            <Field label={labels.typeOfWork} value={record.typeOfWork} />
            <Field label={labels.time} value={`${record.arrivalTime} - ${record.departureTime}`} />
            <Field label={labels.performedBy} value={performedBy} />
          </View>

          {record.workPerformedNotes ? (
            <View style={styles.block}>
              <Text style={styles.eyebrow}>{labels.workPerformed}</Text>
              <Text style={styles.notesBody}>{record.workPerformedNotes}</Text>
            </View>
          ) : null}

          {photos.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.eyebrow}>{labels.photos}</Text>
              <View style={styles.photoGrid}>
                {photos.map((p) => (
                  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is not an HTML img
                  <Image key={p.id} src={p.dataUrl} style={styles.photo} />
                ))}
              </View>
            </View>
          ) : null}

          {record.customerSignature ? (
            <View style={styles.signatureBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is not an HTML img */}
              <Image src={record.customerSignature} style={styles.signatureImage} />
              <Text style={styles.signatureCaption}>{labels.customerSignature}</Text>
            </View>
          ) : null}

          {/* Footer */}
          <View style={styles.pageFoot}>
            <View style={styles.footRule} />
            <Text style={styles.thanks}>{labels.footer}</Text>
            <Text style={styles.footLine}>
              {[company.name, company.phone, company.address].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
