// components/lab/lab-report-templates.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const CLINIC_NAME = "ClinicHMS";
const CLINIC_TAGLINE = "Hospital Management System";
const CLINIC_ADDRESS = "123 Healthcare Avenue, Medical District";
const CLINIC_PHONE = "+92 300 1234567";

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
    page: { padding: 35, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "2pt solid #0d9488" },
    headerLeft: { flex: 1 },
    clinicName: { fontSize: 18, fontWeight: "bold", color: "#0d9488", marginBottom: 2 },
    clinicSub: { fontSize: 8, color: "#666", lineHeight: 1.5 },
    headerRight: { alignItems: "flex-end" },
    docTitle: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 3 },
    docId: { fontSize: 9, color: "#666" },
    patientSection: { flexDirection: "row", marginBottom: 14, paddingBottom: 10, borderBottom: "1pt solid #e5e5e5" },
    patientCol: { flex: 1 },
    infoGrid: { flexDirection: "row", marginTop: 0, marginBottom: 16, gap: 16 },
    infoItem: { flex: 1 },
    sectionLabel: { fontSize: 7, fontWeight: "bold", color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
    sectionValue: { fontSize: 9, color: "#333" },
    sectionSub: { fontSize: 8, color: "#666", marginTop: 1 },
    resultsSection: { flex: 1, marginTop: 8 },
    resultsLabel: { fontSize: 8, fontWeight: "bold", color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
    testBlock: { marginBottom: 14 },
    testName: { fontSize: 10, fontWeight: "bold", color: "#0d9488", marginBottom: 5, paddingBottom: 3, borderBottom: "1pt solid #e5e5e5" },
    tableHeader: { flexDirection: "row", backgroundColor: "#f0fdfa", borderBottom: "1.5pt solid #0d9488", paddingVertical: 5, paddingHorizontal: 5 },
    tableRow: { flexDirection: "row", borderBottom: "1pt solid #f0f0f0", paddingVertical: 4, paddingHorizontal: 5 },
    tableRowAbnormal: { backgroundColor: "#fef2f2" },
    colParam: { width: "28%" },
    colResult: { width: "18%" },
    colUnit: { width: "12%" },
    colRef: { width: "24%" },
    colFlag: { width: "18%" },
    tableHeaderText: { fontSize: 7, fontWeight: "bold", color: "#0d9488", textTransform: "uppercase" },
    tableCell: { fontSize: 8.5, color: "#333" },
    tableCellBold: { fontSize: 8.5, color: "#333", fontWeight: "bold" },
    tableCellAbnormal: { color: "#dc2626", fontWeight: "bold" },
    flagNormal: { fontSize: 7, color: "#666" },
    flagAbnormal: { fontSize: 7, color: "#dc2626", fontWeight: "bold" },
    testNotes: { fontSize: 7, color: "#888", marginTop: 4, paddingHorizontal: 5, paddingVertical: 3, backgroundColor: "#f9fafb", borderRadius: 2 },
    technicianSection: { marginTop: 12, paddingTop: 8, borderTop: "1pt solid #e5e5e5" },
    technicianRow: { flexDirection: "row", justifyContent: "space-between" },
    technicianCol: { flex: 1 },
    signatureText: { fontSize: 9, color: "#333", fontStyle: "italic" },
    additionalNotesSection: { marginTop: 8 },
    additionalNotesText: { fontSize: 7, color: "#666" },
    footer: { position: "absolute", bottom: 25, left: 35, right: 35, textAlign: "center", fontSize: 7, color: "#aaa", borderTop: "1pt solid #e5e5e5", paddingTop: 8 },
    noResults: { fontSize: 9, color: "#999", textAlign: "center", marginTop: 30 },
});

// ─── PDF Template Component ───────────────────────────────
export function LabReportPdfTemplate({ test, report }: { test: any; report?: any }) {
    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                {/* Header */}
                <View style={pdfStyles.header}>
                    <View style={pdfStyles.headerLeft}>
                        <Text style={pdfStyles.clinicName}>{CLINIC_NAME}</Text>
                        <Text style={pdfStyles.clinicSub}>{CLINIC_TAGLINE}</Text>
                        <Text style={pdfStyles.clinicSub}>{CLINIC_ADDRESS}</Text>
                        <Text style={pdfStyles.clinicSub}>{CLINIC_PHONE}</Text>
                    </View>
                    <View style={pdfStyles.headerRight}>
                        <Text style={pdfStyles.docTitle}>LABORATORY REPORT</Text>
                        <Text style={pdfStyles.docId}>{test.labTestId}</Text>
                        <Text style={pdfStyles.docId}>{formatDate(test.createdAt)}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={pdfStyles.patientSection}>
                    <View style={pdfStyles.patientCol}>
                        <Text style={pdfStyles.sectionLabel}>Patient</Text>
                        <Text style={pdfStyles.sectionValue}>{test.patient?.firstName} {test.patient?.lastName}</Text>
                        <Text style={pdfStyles.sectionSub}>{test.patient?.patientId}</Text>
                    </View>
                    <View style={pdfStyles.patientCol}>
                        <Text style={pdfStyles.sectionLabel}>Requested By</Text>
                        <Text style={pdfStyles.sectionValue}>{test.requestedBy?.firstName} {test.requestedBy?.lastName}</Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={pdfStyles.infoGrid}>
                    <View style={pdfStyles.infoItem}>
                        <Text style={pdfStyles.sectionLabel}>Gender</Text>
                        <Text style={pdfStyles.sectionValue}>{test.patient?.gender || "—"}</Text>
                    </View>
                    <View style={pdfStyles.infoItem}>
                        <Text style={pdfStyles.sectionLabel}>Age</Text>
                        <Text style={pdfStyles.sectionValue}>{calculateAge(test.patient?.dateOfBirth)}</Text>
                    </View>
                    <View style={pdfStyles.infoItem}>
                        <Text style={pdfStyles.sectionLabel}>Status</Text>
                        <Text style={pdfStyles.sectionValue}>{test.status?.replace(/_/g, " ")}</Text>
                    </View>
                    <View style={pdfStyles.infoItem}>
                        <Text style={pdfStyles.sectionLabel}>Collected</Text>
                        <Text style={pdfStyles.sectionValue}>{formatDate(test.sampleCollectedAt)}</Text>
                    </View>
                </View>

                {/* Results */}
                <View style={pdfStyles.resultsSection}>
                    <Text style={pdfStyles.resultsLabel}>Test Results</Text>
                    {test.results?.length > 0 ? (
                        test.results.map((result: any, i: number) => (
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
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colResult, pr.isAbnormal && pdfStyles.tableCellAbnormal]}>
                                            {formatValue(pr.value)}
                                        </Text>
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colUnit]}>{pr.unit || "—"}</Text>
                                        <Text style={[pdfStyles.tableCell, pdfStyles.colRef]}>{pr.referenceRange || "—"}</Text>
                                        <Text style={[pdfStyles.colFlag, pr.isAbnormal ? pdfStyles.flagAbnormal : pdfStyles.flagNormal]}>
                                            {pr.isAbnormal ? "Abnormal" : "Normal"}
                                        </Text>
                                    </View>
                                ))}
                                {result.notes && (
                                    <Text style={pdfStyles.testNotes}>Notes: {result.notes}</Text>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={pdfStyles.noResults}>No results recorded</Text>
                    )}
                </View>

                {/* Technician / Signature */}
                {report && (
                    <View style={pdfStyles.technicianSection}>
                        <View style={pdfStyles.technicianRow}>
                            <View style={pdfStyles.technicianCol}>
                                <Text style={pdfStyles.sectionLabel}>Performed by</Text>
                                <Text style={pdfStyles.sectionValue}>{report.labTechnician?.name}</Text>
                            </View>
                            <View style={[pdfStyles.technicianCol, { alignItems: "flex-end" }]}>
                                <Text style={pdfStyles.sectionLabel}>Signature</Text>
                                <Text style={pdfStyles.signatureText}>{report.labTechnician?.signature}</Text>
                            </View>
                        </View>
                        {report.additionalNotes && (
                            <View style={pdfStyles.additionalNotesSection}>
                                <Text style={pdfStyles.sectionLabel}>Additional Notes</Text>
                                <Text style={pdfStyles.additionalNotesText}>{report.additionalNotes}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Footer */}
                <Text style={pdfStyles.footer} fixed>
                    Computer-generated laboratory report • {CLINIC_NAME} • {formatDate(new Date().toISOString())}
                </Text>
            </Page>
        </Document>
    );
}

// ─── Print HTML Template ──────────────────────────────────
export function generateLabReportPrintHtml(test: any, report?: any): string {
    const resultsHtml = test.results?.map((result: any) => `
        <div class="test-section">
            <div class="test-name">${result.testName}</div>
            <table class="params-table">
                <thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Ref Range</th><th>Flag</th></tr></thead>
                <tbody>${result.parameterResults?.map((pr: any) => `
                    <tr class="${pr.isAbnormal ? 'abnormal-row' : ''}">
                        <td><strong>${pr.parameterName}</strong></td>
                        <td class="${pr.isAbnormal ? 'abnormal-value' : ''}">${formatValue(pr.value)}</td>
                        <td>${pr.unit || "—"}</td>
                        <td>${pr.referenceRange || "—"}</td>
                        <td>${pr.isAbnormal ? '<span class="flag-abnormal">Abnormal</span>' : '<span class="flag-normal">Normal</span>'}</td>
                    </tr>`).join("") || '<tr><td colspan="5">No parameters</td></tr>'}</tbody>
            </table>
            ${result.notes ? `<div class="test-notes"><strong>Notes:</strong> ${result.notes}</div>` : ""}
        </div>
    `).join("") || '<p class="no-results">No results recorded</p>';

    const technicianHtml = report ? `
    <div class="technician-bar">
        <div class="tech-row">
            <div>
                <span class="tech-label">Performed by</span>
                <span class="tech-value">${report.labTechnician?.name}</span>
            </div>
            <div style="text-align:right;">
                <span class="tech-label">Signature</span>
                <span class="tech-value" style="font-style:italic;">${report.labTechnician?.signature}</span>
            </div>
        </div>
        ${report.additionalNotes ? `
        <div class="tech-notes">
            <span class="tech-label">Additional Notes</span>
            <span class="notes-text">${report.additionalNotes}</span>
        </div>` : ''}
    </div>` : '';

    return `<!DOCTYPE html><html><head><title>Lab Report - ${test.patient?.firstName} ${test.patient?.lastName}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',system-ui,sans-serif;font-size:11px;color:#1a1a1a;padding:28px;padding-bottom:90px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .header{display:flex;justify-content:space-between;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #0d9488}
        .clinic-name{font-size:18px;font-weight:700;color:#0d9488}.clinic-sub{font-size:8px;color:#666;line-height:1.5}
        .doc-title{font-size:14px;font-weight:700;color:#333;text-align:right}.doc-id{font-size:9px;color:#666;text-align:right}
        .patient-section{display:flex;gap:30px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5e5e5}
        .patient-col{flex:1}.info-grid{display:flex;gap:16px;margin-bottom:16px}
        .info-item{flex:1}.label{font-size:7px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}
        .value{font-size:9px;color:#333}.sub{font-size:8px;color:#666;margin-top:1px}
        .results-section{margin-top:8px}.results-label{font-size:8px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
        .test-section{margin-bottom:14px}.test-name{font-size:10px;font-weight:700;color:#0d9488;margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid #e5e5e5}
        .params-table{width:100%;border-collapse:collapse}.params-table th{text-align:left;font-size:7px;font-weight:600;color:#0d9488;text-transform:uppercase;padding:5px 5px;border-bottom:1.5px solid #0d9488;background:#f0fdfa}
        .params-table td{font-size:8.5px;color:#333;padding:4px 5px;border-bottom:1px solid #f0f0f0}.abnormal-row{background:#fef2f2}
        .abnormal-value{color:#dc2626;font-weight:700}.flag-abnormal{font-size:7px;font-weight:600;color:#dc2626}.flag-normal{font-size:7px;color:#666}
        .test-notes{font-size:7px;color:#888;margin-top:4px;padding:4px 5px;background:#f9fafb;border-radius:2px}.no-results{font-size:9px;color:#999;text-align:center;padding:30px}
        .technician-bar{position:fixed;bottom:40px;left:28px;right:28px;padding:10px 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;background:#fff}
        .tech-row{display:flex;justify-content:space-between;gap:30px}
        .tech-label{display:block;font-size:7px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}
        .tech-value{font-size:9px;color:#333}
        .tech-notes{margin-top:6px}
        .notes-text{font-size:8px;color:#666}
        .footer{position:fixed;bottom:0;left:28px;right:28px;text-align:center;font-size:7px;color:#aaa;padding-top:6px;padding-bottom:8px;background:#fff}
        @media print{body{padding:18px;padding-bottom:90px}@page{margin:12mm}}
    </style></head><body>
    <div class="header"><div><div class="clinic-name">${CLINIC_NAME}</div><div class="clinic-sub">${CLINIC_TAGLINE}</div><div class="clinic-sub">${CLINIC_ADDRESS}</div><div class="clinic-sub">${CLINIC_PHONE}</div></div><div><div class="doc-title">LABORATORY REPORT</div><div class="doc-id">${test.labTestId}</div><div class="doc-id">${formatDate(test.createdAt)}</div></div></div>
    <div class="patient-section"><div class="patient-col"><div class="label">Patient</div><div class="value">${test.patient?.firstName} ${test.patient?.lastName}</div><div class="sub">${test.patient?.patientId}</div></div><div class="patient-col"><div class="label">Requested By</div><div class="value">${test.requestedBy?.firstName} ${test.requestedBy?.lastName}</div></div></div>
    <div class="info-grid"><div class="info-item"><span class="label">Gender</span><div class="value">${test.patient?.gender || "—"}</div></div><div class="info-item"><span class="label">Age</span><div class="value">${calculateAge(test.patient?.dateOfBirth)}</div></div><div class="info-item"><span class="label">Status</span><div class="value">${test.status?.replace(/_/g, " ")}</div></div><div class="info-item"><span class="label">Collected</span><div class="value">${formatDate(test.sampleCollectedAt)}</div></div></div>
    <div class="results-section"><div class="results-label">Test Results</div>${resultsHtml}</div>
    ${technicianHtml}
    <div class="footer">Computer-generated laboratory report • ${CLINIC_NAME} • ${formatDate(new Date().toISOString())}</div>
    </body></html>`;
}