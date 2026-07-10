import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface ReportPhoto {
  id: string;
  url: string;
  takenAt: Date;
  takenByName: string | null;
  tags: string[];
}

export interface ReportGroup {
  title: string;
  photos: ReportPhoto[];
}

export interface PhotoReportData {
  orgName: string;
  projectName: string;
  projectAddress: string | null;
  generatedAt: Date;
  groups: ReportGroup[];
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
    paddingBottom: 8,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 700,
  },
  reportTitle: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  projectName: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 10,
  },
  meta: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 8,
    color: "#0f172a",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "50%",
    padding: 4,
  },
  photo: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 4,
  },
  caption: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 3,
  },
  tags: {
    fontSize: 8,
    color: "#0f172a",
    marginTop: 1,
  },
  empty: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 20,
  },
});

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(date);
}

function PhotoCell({ photo }: { photo: ReportPhoto }) {
  return (
    <View style={styles.cell} wrap={false}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img */}
      <Image src={photo.url} style={styles.photo} />
      <Text style={styles.caption}>
        {photo.takenByName ? `${photo.takenByName} · ` : ""}
        {formatDateTime(photo.takenAt)}
      </Text>
      {photo.tags.length > 0 && (
        <Text style={styles.tags}>{photo.tags.map((t) => `#${t}`).join("  ")}</Text>
      )}
    </View>
  );
}

export function PhotoReportPdfDocument({ data }: { data: PhotoReportData }) {
  const totalPhotos = data.groups.reduce((n, g) => n + g.photos.length, 0);
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{data.orgName}</Text>
          <Text style={styles.reportTitle}>Photo Report</Text>
          <Text style={styles.projectName}>{data.projectName}</Text>
          {data.projectAddress ? <Text style={styles.meta}>{data.projectAddress}</Text> : null}
          <Text style={styles.meta}>
            Generated {formatDate(data.generatedAt)} · {totalPhotos} photo
            {totalPhotos === 1 ? "" : "s"}
          </Text>
        </View>

        {totalPhotos === 0 ? (
          <Text style={styles.empty}>This project has no photos yet.</Text>
        ) : (
          data.groups
            .filter((group) => group.photos.length > 0)
            .map((group) => (
              <View key={group.title} wrap>
                <Text style={styles.sectionTitle}>
                  {group.title} ({group.photos.length})
                </Text>
                <View style={styles.grid}>
                  {group.photos.map((photo) => (
                    <PhotoCell key={photo.id} photo={photo} />
                  ))}
                </View>
              </View>
            ))
        )}
      </Page>
    </Document>
  );
}
