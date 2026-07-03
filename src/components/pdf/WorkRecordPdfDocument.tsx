import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { WorkRecord } from "@prisma/client";

import { formatTime } from "@/lib/format";

type RecordWithWorker = WorkRecord & { submittedBy?: { name: string } };

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
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

function RecordPage({ record }: { record: RecordWithWorker }) {
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>EIV Solution Air</Text>
        <Text style={styles.formTitle}>Installation / Service Work Record</Text>
      </View>

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
          value={`$${record.leadInstallerPay.toFixed(2)}`}
        />
        <Field
          label="Helper Pay"
          value={record.helperPay ? `$${record.helperPay.toFixed(2)}` : ""}
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
    </Page>
  );
}

export function WorkRecordPdfDocument({
  records,
}: {
  records: RecordWithWorker[];
}) {
  return (
    <Document>
      {records.map((record) => (
        <RecordPage key={record.id} record={record} />
      ))}
    </Document>
  );
}
