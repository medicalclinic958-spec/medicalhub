// components/opd/emr-templates.ts
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { 
  NEXT_PUBLIC_CLINIC_NAME, 
  NEXT_PUBLIC_CLINIC_TAGLINE, 
  NEXT_PUBLIC_CLINIC_ADDRESS, 
  NEXT_PUBLIC_CLINIC_PHONE,
  NEXT_PUBLIC_CLINIC_EMAIL,
  EMR_PRINT_PDF_TEMPLATE_COLORS,
  
} from "@/constants/ClinicDetails";

const CLINIC = {
  name: NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS",
  tagline: NEXT_PUBLIC_CLINIC_TAGLINE || "Hospital Management System",
  address: NEXT_PUBLIC_CLINIC_ADDRESS || "123 Healthcare Avenue, Medical District",
  phone: NEXT_PUBLIC_CLINIC_PHONE || "+92 300 1234567",
};

const COLORS = EMR_PRINT_PDF_TEMPLATE_COLORS || {
  primary: "#0d9488",
  text: "#1a1a1a",
  muted: "#666",
  lightText: "#888",
  border: "#e5e5e5",
  tableHeaderBg: "#f0fdfa",
};

const FONTS = {
  clinicName: 18,
  title: 14,
  sectionLabel: 8,
  value: 10,
  sub: 9,
  tableHeader: 7,
  tableCell: 9,
  footer: 7,
};

const SPACING = {
  pagePadding: 35,
  headerMarginBottom: 18,
  sectionMarginBottom: 14,
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const pdfStyles = StyleSheet.create({
  page: { padding: SPACING.pagePadding, paddingBottom: 60, fontSize: 10, fontFamily: "Helvetica", color: COLORS.text },
  contentWrapper: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.headerMarginBottom, paddingBottom: 12, borderBottom: `2pt solid ${COLORS.primary}` },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 0, marginHorizontal: 20, justifyContent: "center", alignItems: "center" },
  headerRight: { flex: 1, alignItems: "flex-end" },
  clinicName: { fontSize: FONTS.clinicName, fontWeight: "bold", color: COLORS.primary, marginBottom: 2 },
  clinicSub: { fontSize: 8, color: COLORS.muted, lineHeight: 1.5 },
  logo: { width: 100, height: 100, objectFit: "contain" },
  docTitle: { fontSize: FONTS.title, fontWeight: "bold", color: "#333", marginBottom: 3 },
  docId: { fontSize: 9, color: COLORS.muted },
  // Section for 2-column layouts (Patient/Doctor)
  sectionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sectionMarginBottom, paddingBottom: 10, borderBottom: `1pt solid ${COLORS.border}` },
  sectionCol: { flex: 1 },
  sectionColRight: { flex: 1, alignItems: "flex-end" },
  // Section for single-column layouts (Vitals, Diagnosis, etc.)
  sectionBlock: { marginBottom: SPACING.sectionMarginBottom, paddingBottom: 10, borderBottom: `1pt solid ${COLORS.border}` },
  sectionBlockLast: { marginBottom: SPACING.sectionMarginBottom, paddingBottom: 0, borderBottom: "none" },
  sectionLabel: { fontSize: FONTS.sectionLabel, fontWeight: "bold", color: COLORS.lightText, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  value: { fontSize: FONTS.value, color: "#333", fontWeight: "bold" },
  subValue: { fontSize: FONTS.sub, color: COLORS.muted, marginTop: 1 },
  textBlock: { fontSize: 9, color: "#333", lineHeight: 1.4 },
  // Badges
  badge: { fontSize: 7, fontWeight: "bold", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  badgePrimary: { backgroundColor: "#dbeafe", color: "#1e40af" },
  badgeSecondary: { backgroundColor: "#f3f4f6", color: "#374151" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  badgeGap: { marginRight: 4, marginBottom: 2 },
  // Vitals
  vitalsRow: { flexDirection: "row", marginBottom: 4 },
  vitalItem: { width: "33%", marginBottom: 6 },
  vitalLabel: { fontSize: 7, color: COLORS.lightText, textTransform: "uppercase", marginBottom: 1 },
  vitalValue: { fontSize: 9, color: "#333", fontWeight: "bold" },
  // Diagnosis
  diagRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  diagType: { fontSize: 7, fontWeight: "bold", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, marginRight: 6 },
  diagDesc: { fontSize: 9, color: "#333", flex: 1 },
  diagIcd: { fontSize: 8, color: COLORS.lightText },
  // Prescriptions table
  tableHeader: { flexDirection: "row", backgroundColor: COLORS.tableHeaderBg, borderBottom: `1.5pt solid ${COLORS.primary}`, paddingVertical: 5, paddingHorizontal: 5 },
  tableRow: { flexDirection: "row", borderBottom: `1pt solid #f0f0f0`, paddingVertical: 4, paddingHorizontal: 5 },
  colMed: { width: "20%" }, colStr: { width: "10%" }, colDos: { width: "12%" }, colFrq: { width: "12%" }, colDur: { width: "10%" }, colRte: { width: "10%" }, colQty: { width: "8%" }, colIns: { width: "18%" },
  tableHeaderText: { fontSize: FONTS.tableHeader, fontWeight: "bold", color: COLORS.primary, textTransform: "uppercase" },
  tableCell: { fontSize: FONTS.tableCell, color: "#333" },
  tableCellBold: { fontSize: FONTS.tableCell, fontWeight: "bold", color: COLORS.primary },
  footer: { position: "absolute", bottom: 20, left: SPACING.pagePadding, right: SPACING.pagePadding, textAlign: "center", fontSize: FONTS.footer, color: "#aaa", borderTop: `1pt solid ${COLORS.border}`, paddingTop: 6 },
});

export function EMRPdfTemplate({ record, logoUrl }: { record: any; logoUrl?: string }) {
  const r = record;
  const allMedicines: any[] = [];
  r.prescriptions?.forEach((rx: any) => { rx.medicines?.forEach((m: any) => allMedicines.push(m)); });

  const vitalEntries = Object.entries(r.vitals || {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  const vitalLabels: Record<string, string> = { temperature: "Temp", bloodPressureSystolic: "BP Sys", bloodPressureDiastolic: "BP Dia", heartRate: "HR", respiratoryRate: "RR", oxygenSaturation: "O2", weight: "Wt", height: "Ht", bloodSugar: "BS" };
  const vitalUnits: Record<string, string> = { temperature: "°C", heartRate: "bpm", respiratoryRate: "/min", oxygenSaturation: "%", weight: "kg", height: "cm", bloodSugar: "mg/dL" };

  // Build vitals rows (3 per row)
  const vitalsRows: any[][] = [];
  for (let i = 0; i < vitalEntries.length; i += 3) {
    vitalsRows.push(vitalEntries.slice(i, i + 3));
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.contentWrapper}>
          {/* Header */}
          <View style={pdfStyles.header}>
            <View style={pdfStyles.headerLeft}>
              <Text style={pdfStyles.clinicName}>{CLINIC.name}</Text>
              <Text style={pdfStyles.clinicSub}>{CLINIC.tagline}</Text>
              <Text style={pdfStyles.clinicSub}>{CLINIC.address}</Text>
              <Text style={pdfStyles.clinicSub}>{CLINIC.phone}</Text>
            </View>
            {logoUrl ? <View style={pdfStyles.headerCenter}><Image src={logoUrl} style={pdfStyles.logo} /></View> : <View style={{ width: 20 }} />}
            <View style={pdfStyles.headerRight}>
              <Text style={pdfStyles.docTitle}>MEDICAL RECORD</Text>
              <Text style={pdfStyles.docId}>Visit: {formatDate(r.visitDate)}</Text>
              {r.followUpDate && <Text style={pdfStyles.docId}>Follow-up: {formatDate(r.followUpDate)}</Text>}
            </View>
          </View>

          {/* Patient & Doctor */}
          <View style={pdfStyles.sectionRow}>
            <View style={pdfStyles.sectionCol}>
              <Text style={pdfStyles.sectionLabel}>Patient</Text>
              <Text style={pdfStyles.value}>{r.patient?.firstName} {r.patient?.lastName}</Text>
              <Text style={pdfStyles.subValue}>{r.patient?.patientId}</Text>
              <Text style={pdfStyles.subValue}>{r.patient?.phone}</Text>
            </View>
            <View style={pdfStyles.sectionColRight}>
              <Text style={pdfStyles.sectionLabel}>Doctor</Text>
              <Text style={pdfStyles.value}>Dr. {r.doctor?.user?.firstName} {r.doctor?.user?.lastName}</Text>
              <Text style={pdfStyles.subValue}>{r.doctor?.user?.email}</Text>
            </View>
          </View>

          {/* Chief Complaint & Symptoms */}
          <View style={pdfStyles.sectionBlock}>
            <Text style={pdfStyles.sectionLabel}>Chief Complaint</Text>
            <Text style={pdfStyles.textBlock}>{r.chiefComplaint}</Text>
            {r.symptoms?.length > 0 && (
              <View style={pdfStyles.badgeRow}>
                {r.symptoms.map((s: string, i: number) => (
                  <Text key={i} style={[pdfStyles.badge, pdfStyles.badgeSecondary, pdfStyles.badgeGap]}>{s}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Vitals */}
          {vitalEntries.length > 0 && (
            <View style={pdfStyles.sectionBlock}>
              <Text style={pdfStyles.sectionLabel}>Vitals</Text>
              {vitalsRows.map((row, ri) => (
                <View key={ri} style={pdfStyles.vitalsRow}>
                  {row.map(([k, v]) => (
                    <View key={k} style={pdfStyles.vitalItem}>
                      <Text style={pdfStyles.vitalLabel}>{vitalLabels[k] || k}</Text>
                      <Text style={pdfStyles.vitalValue}>{String(v)} {vitalUnits[k] || ""}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Diagnosis */}
          {r.diagnosis?.length > 0 && (
            <View style={pdfStyles.sectionBlock}>
              <Text style={pdfStyles.sectionLabel}>Diagnosis</Text>
              {r.diagnosis.map((d: any, i: number) => (
                <View key={i} style={pdfStyles.diagRow}>
                  <Text style={[pdfStyles.diagType, d.type === "primary" ? pdfStyles.badgePrimary : pdfStyles.badgeSecondary]}>{d.type}</Text>
                  <Text style={pdfStyles.diagDesc}>{d.description}</Text>
                  {d.icdCode && <Text style={pdfStyles.diagIcd}>ICD: {d.icdCode}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Treatment Plan */}
          {r.treatmentPlan && (
            <View style={pdfStyles.sectionBlock}>
              <Text style={pdfStyles.sectionLabel}>Treatment Plan</Text>
              <Text style={pdfStyles.textBlock}>{r.treatmentPlan}</Text>
            </View>
          )}

          {/* Prescriptions */}
          {allMedicines.length > 0 && (
            <View style={pdfStyles.sectionBlock}>
              <Text style={pdfStyles.sectionLabel}>Prescriptions</Text>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colMed]}>Medicine</Text>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colStr]}>Strength</Text>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colDos]}>Dosage</Text>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colFrq]}>Frequency</Text>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colDur]}>Duration</Text>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colRte]}>Route</Text>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colQty]}>Qty</Text>
                <Text style={[pdfStyles.tableHeaderText, pdfStyles.colIns]}>Instructions</Text>
              </View>
              {allMedicines.map((m: any, i: number) => (
                <View key={i} style={pdfStyles.tableRow}>
                  <Text style={[pdfStyles.tableCellBold, pdfStyles.colMed]}>{m.medicineName || "—"}</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.colStr]}>{m.strength || "—"}</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.colDos]}>{m.dosage || "—"}</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.colFrq]}>{m.frequency || "—"}</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.colDur]}>{m.duration || "—"}</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.colRte]}>{m.route || "—"}</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.colQty]}>{m.quantity || "—"}</Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.colIns]}>{m.instructions || "—"}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Notes */}
          {r.notes && (
            <View style={pdfStyles.sectionBlockLast}>
              <Text style={pdfStyles.sectionLabel}>Notes</Text>
              <Text style={pdfStyles.textBlock}>{r.notes}</Text>
            </View>
          )}
        </View>

        <Text style={pdfStyles.footer} fixed>Computer-generated medical record • {CLINIC.name} • {formatDate(new Date().toISOString())}</Text>
      </Page>
    </Document>
  );
}

// ─── Print HTML Template ──────────────────────────────────
export function generateEMRPrintHtml(record: any, logoUrl?: string): string {
  const r = record;
  const allMedicines: any[] = [];
  r.prescriptions?.forEach((rx: any) => { rx.medicines?.forEach((m: any) => allMedicines.push(m)); });

  const vitalsHtml = Object.entries(r.vitals || {}).filter(([, v]) => v).map(([k, v]) => {
    const labels: Record<string, string> = { temperature: "Temp", bloodPressureSystolic: "BP Sys", bloodPressureDiastolic: "BP Dia", heartRate: "HR", respiratoryRate: "RR", oxygenSaturation: "O2", weight: "Wt", height: "Ht", bloodSugar: "BS" };
    const units: Record<string, string> = { temperature: "°C", heartRate: "bpm", respiratoryRate: "/min", oxygenSaturation: "%", weight: "kg", height: "cm", bloodSugar: "mg/dL" };
    return `<div class="vital"><span class="vital-label">${labels[k] || k}</span><span class="vital-value">${v} ${units[k] || ""}</span></div>`;
  }).join("");

  const logoSvg = logoUrl ? `<div class="header-center"><img src="${logoUrl}" class="logo" /></div>` : "";

  return `<!DOCTYPE html><html><head><title>EMR - ${r.patient?.firstName} ${r.patient?.lastName}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;font-size:11px;color:${COLORS.text};padding:25px;padding-bottom:50px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid ${COLORS.primary}}
    .header-left{flex:1}.header-center{flex:0;margin:0 20px;display:flex;justify-content:center;align-items:center}.header-right{flex:1;text-align:right}
    .clinic-name{font-size:${FONTS.clinicName}px;font-weight:700;color:${COLORS.primary}}.clinic-sub{font-size:9px;color:${COLORS.muted};line-height:1.5}
    .logo{width:100px;height:100px;object-fit:contain}.doc-title{font-size:${FONTS.title}px;font-weight:700;color:#333;text-align:right}.doc-sub{font-size:9px;color:${COLORS.muted};text-align:right}
    .section{margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid ${COLORS.border}}.section-last{margin-bottom:14px;padding-bottom:0;border-bottom:none}
    .label{font-size:8px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}.value{font-size:10px;color:#333}
    .grid-2{display:flex;gap:30px}.grid-2>div{flex:1}
    .vitals-grid{display:flex;flex-wrap:wrap;gap:6px 16px}.vital{min-width:55px}.vital-label{display:block;font-size:7px;color:${COLORS.lightText};text-transform:uppercase}.vital-value{display:block;font-size:10px;font-weight:500;color:#333}
    .badge{display:inline-block;font-size:8px;font-weight:600;padding:1px 6px;border-radius:3px}.badge-primary{background:#dbeafe;color:#1e40af}.badge-secondary{background:#f3f4f6;color:#374151}
    .diag-row{display:flex;align-items:center;gap:6px;padding:3px 0}
    .rx-table{width:100%;border-collapse:collapse;margin-top:6px}.rx-table th{text-align:left;font-size:7px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:.5px;padding:5px 6px;border-bottom:2px solid ${COLORS.primary};background:${COLORS.tableHeaderBg}}
    .rx-table td{font-size:9px;color:#333;padding:5px 6px;border-bottom:1px solid #f0f0f0;vertical-align:top}.rx-table td:first-child{font-weight:600;color:${COLORS.primary}}.rx-table tr:last-child td{border-bottom:none}
    .footer{position:fixed;bottom:0;left:25px;right:25px;text-align:center;font-size:8px;color:#aaa;border-top:1px solid ${COLORS.border};padding-top:8px;padding-bottom:8px;background:#fff}
    @media print{body{padding:15px;padding-bottom:50px}}
  </style></head><body>
  <div class="header">
    <div class="header-left"><div class="clinic-name">${CLINIC.name}</div><div class="clinic-sub">${CLINIC.tagline}</div><div class="clinic-details">${CLINIC.address}<br/>${CLINIC.phone}</div></div>
    ${logoSvg}
    <div class="header-right"><div class="doc-title">MEDICAL RECORD</div><div class="doc-sub">Visit: ${formatDate(r.visitDate)}</div>${r.followUpDate ? `<div class="doc-sub">Follow-up: ${formatDate(r.followUpDate)}</div>` : ""}</div>
  </div>
  <div class="section"><div class="grid-2"><div><div class="label">Patient</div><div class="value">${r.patient?.firstName} ${r.patient?.lastName}</div><div style="font-size:9px;color:#666;">${r.patient?.patientId}</div><div style="font-size:9px;color:#666;">${r.patient?.phone}</div></div><div><div class="label">Doctor</div><div class="value">Dr. ${r.doctor?.user?.firstName} ${r.doctor?.user?.lastName}</div><div style="font-size:9px;color:#666;">${r.doctor?.user?.email}</div></div></div></div>
  <div class="section"><div class="label">Chief Complaint</div><div class="value">${r.chiefComplaint}</div>${r.symptoms?.length > 0 ? `<div style="margin-top:6px;"><div class="label">Symptoms</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;">${r.symptoms.map((s: string) => `<span class="badge badge-secondary">${s}</span>`).join("")}</div></div>` : ""}</div>
  ${vitalsHtml ? `<div class="section"><div class="label">Vitals</div><div class="vitals-grid">${vitalsHtml}</div></div>` : ""}
  ${r.diagnosis?.length > 0 ? `<div class="section"><div class="label">Diagnosis</div>${r.diagnosis.map((d: any) => `<div class="diag-row"><span class="badge ${d.type==='primary'?'badge-primary':'badge-secondary'}">${d.type}</span><span style="font-size:10px;color:#333;">${d.description}</span>${d.icdCode?`<span style="font-size:9px;color:#888;">ICD: ${d.icdCode}</span>`:""}</div>`).join("")}</div>` : ""}
  ${r.treatmentPlan ? `<div class="section"><div class="label">Treatment Plan</div><div class="value" style="white-space:pre-wrap;">${r.treatmentPlan}</div></div>` : ""}
  ${allMedicines.length > 0 ? `<div class="section"><div class="label">Prescriptions</div><table class="rx-table"><thead><tr><th>Medicine</th><th>Strength</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Route</th><th>Qty</th><th>Instructions</th></tr></thead><tbody>${allMedicines.map((m: any) => `<tr><td>${m.medicineName || "—"}</td><td>${m.strength || "—"}</td><td>${m.dosage || "—"}</td><td>${m.frequency || "—"}</td><td>${m.duration || "—"}</td><td>${m.route || "—"}</td><td>${m.quantity || "—"}</td><td>${m.instructions || "—"}</td></tr>`).join("")}</tbody></table></div>` : ""}
  ${r.notes ? `<div class="section-last"><div class="label">Notes</div><div class="value" style="white-space:pre-wrap;">${r.notes}</div></div>` : ""}
  <div class="footer">Computer-generated medical record • ${CLINIC.name} • ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}