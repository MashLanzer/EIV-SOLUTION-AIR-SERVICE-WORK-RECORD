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

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { height: 44, maxWidth: 120, objectFit: "contain" },
  companyName: { fontSize: 18, fontWeight: 700 },
  companyDetails: { fontSize: 9, color: "#64748b", marginTop: 3 },
  subtitle: { fontSize: 11, color: "#475569", marginTop: 2 },
  jobNumber: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#0f172a" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  field: { width: "50%", marginBottom: 8, paddingRight: 8 },
  fieldLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { fontSize: 10, color: "#0f172a" },
  notesBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    padding: 8,
    marginBottom: 12,
    minHeight: 50,
  },
  signatureBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    padding: 6,
    marginTop: 12,
  },
  signatureImage: { height: 70, objectFit: "contain" },
  signatureCaption: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderTopStyle: "solid",
    paddingTop: 4,
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  photo: {
    width: "31%",
    height: 110,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
  },
  footer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
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
  const details = [
    company.phone?.trim(),
    company.address?.trim(),
  ]
    .filter(Boolean)
    .join("  ·  ");
  const performedBy = [record.leadInstallerName, record.helperName]
    .filter(Boolean)
    .join(", ");
  const photos = record.photos ?? [];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {company.logoUrl ? (
            <View style={styles.headerRow}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img */}
              <Image src={company.logoUrl} style={styles.logo} />
              <View>
                <Text style={styles.companyName}>{company.name}</Text>
                {details ? <Text style={styles.companyDetails}>{details}</Text> : null}
                <Text style={styles.subtitle}>{labels.title}</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.companyName}>{company.name}</Text>
              {details ? <Text style={styles.companyDetails}>{details}</Text> : null}
              <Text style={styles.subtitle}>{labels.title}</Text>
            </View>
          )}
        </View>

        <Text style={styles.jobNumber}>
          {labels.job} #{record.jobNumber}
        </Text>

        <View style={styles.grid}>
          <Field label={labels.date} value={dateStr} />
          <Field label={labels.customer} value={record.customerName} />
          <Field label={labels.address} value={record.customerAddress} />
          <Field label={labels.typeOfWork} value={record.typeOfWork} />
          <Field label={labels.time} value={`${record.arrivalTime} - ${record.departureTime}`} />
          <Field label={labels.performedBy} value={performedBy} />
        </View>

        {record.workPerformedNotes ? (
          <>
            <Text style={styles.fieldLabel}>{labels.workPerformed}</Text>
            <View style={styles.notesBox}>
              <Text style={styles.fieldValue}>{record.workPerformedNotes}</Text>
            </View>
          </>
        ) : null}

        {photos.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>{labels.photos}</Text>
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img
                <Image key={p.id} src={p.dataUrl} style={styles.photo} />
              ))}
            </View>
          </>
        ) : null}

        {record.customerSignature ? (
          <View style={styles.signatureBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img */}
            <Image src={record.customerSignature} style={styles.signatureImage} />
            <Text style={styles.signatureCaption}>{labels.customerSignature}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}
