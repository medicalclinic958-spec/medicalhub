// components/lab/lab-report-templates.tsx
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { 
  NEXT_PUBLIC_CLINIC_NAME, 
  NEXT_PUBLIC_CLINIC_TAGLINE, 
  NEXT_PUBLIC_CLINIC_ADDRESS, 
  NEXT_PUBLIC_CLINIC_PHONE,
  LAB_PRINT_PDF_TEMPLATE_COLORS,
} from "@/constants/ClinicDetails";

const CLINIC = {
  name: NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS",
  tagline: NEXT_PUBLIC_CLINIC_TAGLINE || "Hospital Management System",
  address: NEXT_PUBLIC_CLINIC_ADDRESS || "123 Healthcare Avenue, Medical District",
  phone: NEXT_PUBLIC_CLINIC_PHONE || "+92 300 1234567",
};

// ─── Style Configuration ──────────────────────────────────
const COLORS = LAB_PRINT_PDF_TEMPLATE_COLORS || {
  primary: "#0d9488",
  text: "#1a1a1a",
  muted: "#666",
  lightText: "#888",
  border: "#e5e5e5",
  tableHeaderBg: "#f0fdfa",
  abnormalBg: "#fef2f2",
  abnormalText: "#dc2626",
};

const FONTS = {
  clinicName: 14,
  title: 14,
  sectionLabel: 8,
  value: 9,
  tableHeader: 7,
  tableCell: 8.5,
  footer: 7,
};

const SPACING = {
  pagePadding: 35,
  headerMarginBottom: 18,
  sectionMarginBottom: 14,
  blockMarginBottom: 14,
  rowPadding: 5,
  cellPadding: 4,
};

// ─── Shared Helpers ───────────────────────────────────────
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const calculateAge = (dob?: string): string => {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} years`;
};

const formatValue = (value: any) => {
  if (value === true) return "Positive";
  if (value === false) return "Negative";
  return String(value ?? "—");
};

// ─── PDF Styles ───────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: {
    padding: SPACING.pagePadding,
    paddingBottom: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  contentWrapper: { flex: 1, justifyContent: "flex-start" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.headerMarginBottom,
    paddingBottom: 12,
    borderBottom: `2pt solid ${COLORS.primary}`,
  },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 0, justifyContent: "center", alignItems: "center" },
  headerRight: { flex: 1, alignItems: "flex-end" },
  clinicName: { fontSize: FONTS.clinicName, fontWeight: "bold", color: COLORS.primary, marginBottom: 2 },
  clinicSub: { fontSize: 8, color: COLORS.muted, lineHeight: 1.5 },
  logo: { width: 100, height: 100, objectFit: "contain" },
  docTitle: { fontSize: FONTS.title, fontWeight: "bold", color: "#333", marginBottom: 3 },
  docId: { fontSize: 9, color: COLORS.muted },
  sectionLabel: { fontSize: 7, fontWeight: "bold", color: COLORS.lightText, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  value: { fontSize: FONTS.value, color: "#333" },
  subValue: { fontSize: 8, color: COLORS.muted, marginTop: 1 },
  infoGrid: { flexDirection: "row", marginBottom: 16, gap: 16 },
  infoItem: { flex: 1 },
  resultsSection: { marginTop: 8 },
  resultsLabel: { fontSize: 8, fontWeight: "bold", color: COLORS.lightText, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  testBlock: { marginBottom: SPACING.blockMarginBottom },
  testName: { fontSize: 10, fontWeight: "bold", color: COLORS.primary, marginBottom: 5, paddingBottom: 3, borderBottom: `1pt solid ${COLORS.border}` },
  tableHeader: { flexDirection: "row", backgroundColor: COLORS.tableHeaderBg, borderBottom: `1.5pt solid ${COLORS.primary}`, paddingVertical: 5, paddingHorizontal: 5 },
  tableRow: { flexDirection: "row", borderBottom: `1pt solid #f0f0f0`, paddingVertical: 4, paddingHorizontal: 5 },
  tableRowAbnormal: { backgroundColor: COLORS.abnormalBg },
  colParam: { width: "28%" }, colResult: { width: "18%" }, colUnit: { width: "12%" }, colRef: { width: "24%" }, colFlag: { width: "18%" },
  tableHeaderText: { fontSize: FONTS.tableHeader, fontWeight: "bold", color: COLORS.primary, textTransform: "uppercase" },
  tableCell: { fontSize: FONTS.tableCell, color: "#333" },
  tableCellBold: { fontSize: FONTS.tableCell, fontWeight: "bold", color: "#333" },
  tableCellAbnormal: { color: COLORS.abnormalText, fontWeight: "bold" },
  flagNormal: { fontSize: 7, color: "#666" },
  flagAbnormal: { fontSize: 7, color: COLORS.abnormalText, fontWeight: "bold" },
  testNotes: { fontSize: 7, color: COLORS.lightText, marginTop: 4, paddingHorizontal: 5, paddingVertical: 3, backgroundColor: "#f9fafb", borderRadius: 2 },
  spacer: { flex: 1 },
  technicianSection: { marginTop: 12, paddingTop: 8, borderTop: `1pt solid ${COLORS.border}`, marginBottom: 5 },
  technicianRow: { flexDirection: "row", justifyContent: "space-between" },
  signatureText: { fontSize: FONTS.value, color: "#333", fontStyle: "italic" },
  additionalNotesSection: { marginTop: 8 },
  additionalNotesText: { fontSize: 7, color: "#666" },
  footer: { position: "absolute", bottom: 20, left: SPACING.pagePadding, right: SPACING.pagePadding, textAlign: "center", fontSize: FONTS.footer, color: "#aaa", borderTop: `1pt solid ${COLORS.border}`, paddingTop: 6 },
  noResults: { fontSize: 9, color: "#999", textAlign: "center", marginTop: 30 },
});

// ─── PDF Template ─────────────────────────────────────────
export function LabReportPdfTemplate({ test, report, logoUrl }: { test: any; report?: any; logoUrl?: string }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.contentWrapper}>
          <View style={pdfStyles.header}>
            <View style={pdfStyles.headerLeft}>
              <Text style={pdfStyles.clinicName}>{CLINIC.name}</Text>
              <Text style={pdfStyles.clinicSub}>{CLINIC.tagline}</Text>
              <Text style={pdfStyles.clinicSub}>{CLINIC.address}</Text>
              <Text style={pdfStyles.clinicSub}>{CLINIC.phone}</Text>
            </View>
            <View style={pdfStyles.headerCenter}>
              {logoUrl ? <Image src={logoUrl} style={pdfStyles.logo} /> : <View style={{ width: 100, height: 100 }} />}
            </View>
            <View style={pdfStyles.headerRight}>
              <Text style={pdfStyles.docTitle}>LABORATORY REPORT</Text>
              <Text style={pdfStyles.docId}>{test.labTestId}</Text>
              <Text style={pdfStyles.docId}>{formatDate(test.createdAt)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", marginBottom: 14, paddingBottom: 10, borderBottom: `1pt solid ${COLORS.border}` }}>
            <View style={{ flex: 1 }}><Text style={pdfStyles.sectionLabel}>Patient</Text><Text style={pdfStyles.value}>{test.patient?.firstName} {test.patient?.lastName}</Text><Text style={pdfStyles.subValue}>{test.patient?.patientId}</Text></View>
            <View style={{ flex: 1 }}><Text style={pdfStyles.sectionLabel}>Requested By</Text><Text style={pdfStyles.value}>{test.requestedBy?.firstName} {test.requestedBy?.lastName}</Text></View>
          </View>
          <View style={pdfStyles.infoGrid}>
            <View style={pdfStyles.infoItem}><Text style={pdfStyles.sectionLabel}>Gender</Text><Text style={pdfStyles.value}>{test.patient?.gender || "—"}</Text></View>
            <View style={pdfStyles.infoItem}><Text style={pdfStyles.sectionLabel}>Age</Text><Text style={pdfStyles.value}>{calculateAge(test.patient?.dateOfBirth)}</Text></View>
            <View style={pdfStyles.infoItem}><Text style={pdfStyles.sectionLabel}>Status</Text><Text style={pdfStyles.value}>{test.status?.replace(/_/g, " ")}</Text></View>
            <View style={pdfStyles.infoItem}><Text style={pdfStyles.sectionLabel}>Collected</Text><Text style={pdfStyles.value}>{formatDate(test.sampleCollectedAt)}</Text></View>
          </View>
          <View style={pdfStyles.resultsSection}>
            <Text style={pdfStyles.resultsLabel}>Test Results</Text>
            {test.results?.length > 0 ? test.results.map((result: any, i: number) => (
              <View key={i} style={pdfStyles.testBlock}>
                <Text style={pdfStyles.testName}>{result.testName}</Text>
                <View style={pdfStyles.tableHeader}>
                  <Text style={[pdfStyles.tableHeaderText, pdfStyles.colParam]}>Parameter</Text>
                  <Text style={[pdfStyles.tableHeaderText, pdfStyles.colResult]}>Result</Text>
                  <Text style={[pdfStyles.tableHeaderText, pdfStyles.colUnit]}>Unit</Text>
                  <Text style={[pdfStyles.tableHeaderText, pdfStyles.colRef]}>Ref Range</Text>
                  <Text style={[pdfStyles.tableHeaderText, pdfStyles.colFlag]}>Flag</Text>
                </View>
                {result.parameterResults?.map((pr: any, j: number) => (
                  <View key={j} style={[pdfStyles.tableRow, pr.isAbnormal && pdfStyles.tableRowAbnormal]}>
                    <Text style={[pdfStyles.tableCellBold, pdfStyles.colParam]}>{pr.parameterName}</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.colResult, pr.isAbnormal && pdfStyles.tableCellAbnormal]}>{formatValue(pr.value)}</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.colUnit]}>{pr.unit || "—"}</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.colRef]}>{pr.referenceRange || "—"}</Text>
                    <Text style={[pdfStyles.colFlag, pr.isAbnormal ? pdfStyles.flagAbnormal : pdfStyles.flagNormal]}>{pr.isAbnormal ? "Abnormal" : "Normal"}</Text>
                  </View>
                ))}
                {result.notes && <Text style={pdfStyles.testNotes}>Notes: {result.notes}</Text>}
              </View>
            )) : <Text style={pdfStyles.noResults}>No results recorded</Text>}
          </View>
          {report && <View style={pdfStyles.spacer} />}
          {report && (
            <View style={pdfStyles.technicianSection}>
              <View style={pdfStyles.technicianRow}>
                <View style={{ flex: 1 }}><Text style={pdfStyles.sectionLabel}>Performed by</Text><Text style={pdfStyles.value}>{report.labTechnician?.name}</Text></View>
                <View style={{ flex: 1, alignItems: "flex-end" }}><Text style={pdfStyles.sectionLabel}>Signature</Text><Text style={pdfStyles.signatureText}>{report.labTechnician?.signature}</Text></View>
              </View>
              {report.additionalNotes && <View style={pdfStyles.additionalNotesSection}><Text style={pdfStyles.sectionLabel}>Additional Notes</Text><Text style={pdfStyles.additionalNotesText}>{report.additionalNotes}</Text></View>}
            </View>
          )}
        </View>
        <Text style={pdfStyles.footer} fixed>Computer-generated laboratory report • {CLINIC.name} • {formatDate(new Date().toISOString())}</Text>
      </Page>
    </Document>
  );
}

// ─── Print HTML Template ──────────────────────────────────
export function generateLabReportPrintHtml(test: any, report?: any, logoUrl?: string): string {
  const resultsHtml = test.results?.map((result: any) => `
    <div class="test-section"><div class="test-name">${result.testName}</div>
    <table class="params-table"><thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Ref Range</th><th>Flag</th></tr></thead>
    <tbody>${result.parameterResults?.map((pr: any) => `<tr class="${pr.isAbnormal ? 'abnormal-row' : ''}"><td><strong>${pr.parameterName}</strong></td><td class="${pr.isAbnormal ? 'abnormal-value' : ''}">${formatValue(pr.value)}</td><td>${pr.unit || "—"}</td><td>${pr.referenceRange || "—"}</td><td>${pr.isAbnormal ? '<span class="flag-abnormal">Abnormal</span>' : '<span class="flag-normal">Normal</span>'}</td></tr>`).join("") || '<tr><td colspan="5">No parameters</td></tr>'}</tbody></table>
    ${result.notes ? `<div class="test-notes"><strong>Notes:</strong> ${result.notes}</div>` : ""}</div>
  `).join("") || '<p class="no-results">No results recorded</p>';

  const technicianHtml = report ? `<div class="technician-bar"><div class="tech-row"><div><span class="tech-label">Performed by</span><span class="tech-value">${report.labTechnician?.name}</span></div><div style="text-align:right;"><span class="tech-label">Signature</span><span class="tech-value" style="font-style:italic;">${report.labTechnician?.signature}</span></div></div>${report.additionalNotes ? `<div class="tech-notes"><span class="tech-label">Additional Notes</span><span class="notes-text">${report.additionalNotes}</span></div>` : ''}</div>` : '';

  return `<!DOCTYPE html><html><head><title>Lab Report - ${test.patient?.firstName} ${test.patient?.lastName}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;font-size:11px;color:${COLORS.text};padding:28px;padding-bottom:100px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{display:flex;align-items:center;margin-bottom:${SPACING.headerMarginBottom}px;padding-bottom:12px;border-bottom:2px solid ${COLORS.primary}}
    .header-left{flex:1}.header-center{flex:0;display:flex;justify-content:center;align-items:center}.header-right{flex:1;text-align:right}
    .clinic-name{font-size:${FONTS.clinicName}px;font-weight:700;color:${COLORS.primary}}.clinic-sub{font-size:8px;color:${COLORS.muted};line-height:1.5}
    .logo{width:100px;height:100px;object-fit:contain}.doc-title{font-size:${FONTS.title}px;font-weight:700;color:#333;margin-bottom:3px}.doc-id{font-size:9px;color:${COLORS.muted}}
    .patient-section{display:flex;gap:30px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid ${COLORS.border}}.patient-col{flex:1}
    .info-grid{display:flex;gap:16px;margin-bottom:16px}.info-item{flex:1}
    .label{font-size:7px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}.value{font-size:${FONTS.value}px;color:#333}.sub{font-size:8px;color:${COLORS.muted};margin-top:1px}
    .results-section{margin-top:8px}.results-label{font-size:8px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
    .test-section{margin-bottom:${SPACING.blockMarginBottom}px}.test-name{font-size:10px;font-weight:700;color:${COLORS.primary};margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid ${COLORS.border}}
    .params-table{width:100%;border-collapse:collapse}.params-table th{text-align:left;font-size:${FONTS.tableHeader}px;font-weight:600;color:${COLORS.primary};text-transform:uppercase;padding:5px 5px;border-bottom:1.5px solid ${COLORS.primary};background:${COLORS.tableHeaderBg}}
    .params-table td{font-size:${FONTS.tableCell}px;color:#333;padding:4px 5px;border-bottom:1px solid #f0f0f0}.abnormal-row{background:${COLORS.abnormalBg}}
    .abnormal-value{color:${COLORS.abnormalText};font-weight:700}.flag-abnormal{font-size:7px;font-weight:600;color:${COLORS.abnormalText}}.flag-normal{font-size:7px;color:#666}
    .test-notes{font-size:7px;color:${COLORS.lightText};margin-top:4px;padding:4px 5px;background:#f9fafb;border-radius:2px}.no-results{font-size:9px;color:#999;text-align:center;padding:30px}
    .technician-bar{position:fixed;bottom:40px;left:28px;right:28px;padding:10px 0;border-top:1px solid ${COLORS.border};border-bottom:1px solid ${COLORS.border};background:#fff}
    .tech-row{display:flex;justify-content:space-between;gap:30px}.tech-label{display:block;font-size:7px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}
    .tech-value{font-size:${FONTS.value}px;color:#333}.tech-notes{margin-top:6px}.notes-text{font-size:8px;color:#666}
    .footer{position:fixed;bottom:0;left:28px;right:28px;text-align:center;font-size:${FONTS.footer}px;color:#aaa;padding-top:6px;padding-bottom:8px;background:#fff}
    @media print{body{padding:18px;padding-bottom:100px}@page{margin:12mm}}
  </style></head><body>
  <div class="header">
    <div class="header-left"><div class="clinic-name">${CLINIC.name}</div><div class="clinic-sub">${CLINIC.tagline}</div><div class="clinic-sub">${CLINIC.address}</div><div class="clinic-sub">${CLINIC.phone}</div></div>
    <div class="header-center">${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}</div>
    <div class="header-right"><div class="doc-title">LABORATORY REPORT</div><div class="doc-id">${test.labTestId}</div><div class="doc-id">${formatDate(test.createdAt)}</div></div>
  </div>
  <div class="patient-section"><div class="patient-col"><div class="label">Patient</div><div class="value">${test.patient?.firstName} ${test.patient?.lastName}</div><div class="sub">${test.patient?.patientId}</div></div><div class="patient-col"><div class="label">Requested By</div><div class="value">${test.requestedBy?.firstName} ${test.requestedBy?.lastName}</div></div></div>
  <div class="info-grid"><div class="info-item"><span class="label">Gender</span><div class="value">${test.patient?.gender || "—"}</div></div><div class="info-item"><span class="label">Age</span><div class="value">${calculateAge(test.patient?.dateOfBirth)}</div></div><div class="info-item"><span class="label">Status</span><div class="value">${test.status?.replace(/_/g, " ")}</div></div><div class="info-item"><span class="label">Collected</span><div class="value">${formatDate(test.sampleCollectedAt)}</div></div></div>
  <div class="results-section"><div class="results-label">Test Results</div>${resultsHtml}</div>
  ${technicianHtml}
  <div class="footer">Computer-generated laboratory report • ${CLINIC.name} • ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}