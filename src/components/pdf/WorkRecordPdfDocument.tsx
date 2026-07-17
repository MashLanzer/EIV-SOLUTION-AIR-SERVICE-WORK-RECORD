import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { WorkPhoto, WorkRecord } from "@prisma/client";

import { formatTime } from "@/lib/format";

type RecordWithWorker = WorkRecord & {
  submittedBy?: { name: string } | null;
  // Present only on single-record PDFs; bulk exports skip photos to keep
  // multi-record files small.
  photos?: WorkPhoto[];
};

// The tenant's header block: name plus optional contact/license details set
// in Settings. Only the fields a company fills in are printed.
export type PdfCompany = {
  name: string;
  phone?: string | null;
  address?: string | null;
  license?: string | null;
  logoUrl?: string | null;
  currency?: string;
  // Optional footer line printed at the bottom of each record page (Settings →
  // Documents), e.g. "Thank you for your business".
  footer?: string | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    height: 44,
    maxWidth: 120,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
  },
  companyDetails: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 3,
  },
  formTitle: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  field: {
    width: "50%",
    marginBottom: 8,
    paddingRight: 8,
  },
  fieldLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: "#0f172a",
  },
  notesBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    padding: 8,
    marginBottom: 12,
    minHeight: 60,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  signatureBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    padding: 6,
  },
  signatureImage: {
    height: 70,
    objectFit: "contain",
  },
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
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "-"}</Text>
    </View>
  );
}

// The tenant header on every page: name, an optional detail line (only the
// filled-in fields), then the page's subtitle.
function CompanyHeader({ company, subtitle }: { company: PdfCompany; subtitle: string }) {
  const details = [
    company.phone?.trim(),
    company.address?.trim(),
    company.license?.trim() ? `License ${company.license.trim()}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const textBlock = (
    <View>
      <Text style={styles.companyName}>{company.name}</Text>
      {details ? <Text style={styles.companyDetails}>{details}</Text> : null}
      <Text style={styles.formTitle}>{subtitle}</Text>
    </View>
  );
  return (
    <View style={styles.header}>
      {company.logoUrl ? (
        <View style={styles.headerRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img */}
          <Image src={company.logoUrl} style={styles.logo} />
          {textBlock}
        </View>
      ) : (
        textBlock
      )}
    </View>
  );
}

function RecordPage({ record, company }: { record: RecordWithWorker; company: PdfCompany }) {
  const cur = company.currency || "$";
  return (
    <Page size="LETTER" style={styles.page}>
      <CompanyHeader company={company} subtitle="Installation / Service Work Record" />

      <View style={styles.grid}>
        <Field label="Date" value={formatDate(record.date)} />
        <Field label="Job #" value={record.jobNumber} />
        <Field label="Lead Installer" value={record.leadInstallerName} />
        <Field label="Helper" value={record.helperName ?? ""} />
        <Field label="Customer Name" value={record.customerName} />
        <Field label="Customer Address" value={record.customerAddress} />
        <Field label="Arrival Time" value={formatTime(record.arrivalTime)} />
        <Field label="Departure Time" value={formatTime(record.departureTime)} />
        <Field label="Type of Work" value={record.typeOfWork} />
        <Field
          label="Lead Installer Pay"
          value={`${cur}${record.leadInstallerPay.toFixed(2)}`}
        />
        <Field
          label="Helper Pay"
          value={record.helperPay ? `${cur}${record.helperPay.toFixed(2)}` : ""}
        />
      </View>

      <Text style={styles.fieldLabel}>Work Performed / Notes</Text>
      <View style={styles.notesBox}>
        <Text style={styles.fieldValue}>{record.workPerformedNotes}</Text>
      </View>

      <View style={styles.signatureRow}>
        <View style={styles.signatureBox}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img */}
          <Image src={record.customerSignature} style={styles.signatureImage} />
          <Text style={styles.signatureCaption}>Customer Signature</Text>
        </View>
        <View style={styles.signatureBox}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img */}
          <Image src={record.installerSignature} style={styles.signatureImage} />
          <Text style={styles.signatureCaption}>Installer Signature</Text>
        </View>
      </View>

      {company.footer?.trim() ? (
        <Text style={styles.footer} fixed>
          {company.footer.trim()}
        </Text>
      ) : null}
    </Page>
  );
}

function PhotosPage({ record, company }: { record: RecordWithWorker; company: PdfCompany }) {
  return (
    <Page size="LETTER" style={styles.page}>
      <CompanyHeader company={company} subtitle={`Job #${record.jobNumber} — Photos`} />
      <View style={photoStyles.grid}>
        {(record.photos ?? []).map((photo) => (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img
          <Image key={photo.id} src={photo.dataUrl} style={photoStyles.photo} />
        ))}
      </View>
    </Page>
  );
}

const photoStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photo: {
    width: "48%",
    height: 240,
    objectFit: "contain",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
  },
});

export function WorkRecordPdfDocument({
  records,
  company,
}: {
  records: RecordWithWorker[];
  // The company (tenant) header shown on each page - each org brands its own
  // records; "AeroTrack" is the product, not what goes on the paperwork.
  company: PdfCompany;
}) {
  return (
    <Document>
      {records.map((record) => (
        <RecordPage key={record.id} record={record} company={company} />
      ))}
      {records
        .filter((record) => (record.photos?.length ?? 0) > 0)
        .map((record) => (
          <PhotosPage key={`${record.id}-photos`} record={record} company={company} />
        ))}
    </Document>
  );
}
