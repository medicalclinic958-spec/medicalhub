// components/appointments/appointment-templates.ts
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { 
  NEXT_PUBLIC_CLINIC_NAME, 
  NEXT_PUBLIC_CLINIC_TAGLINE, 
  NEXT_PUBLIC_CLINIC_ADDRESS, 
  NEXT_PUBLIC_CLINIC_PHONE,
  APPOINTMENT_PRINT_PDF_TEMPLATE_COLORS,
} from "@/constants/ClinicDetails";

const CLINIC = {
  name: NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS",
  tagline: NEXT_PUBLIC_CLINIC_TAGLINE || "Hospital Management System",
  address: NEXT_PUBLIC_CLINIC_ADDRESS || "123 Healthcare Avenue, Medical District",
  phone: NEXT_PUBLIC_CLINIC_PHONE || "+92 300 1234567",
};

const COLORS = APPOINTMENT_PRINT_PDF_TEMPLATE_COLORS || {
  primary: "#0d9488",
  text: "#1a1a1a",
  muted: "#666",
  lightText: "#888",
  border: "#e5e5e5",
  scheduledBg: "#dbeafe",
  scheduledText: "#1e40af",
  completedBg: "#d1fae5",
  completedText: "#065f46",
  cancelledBg: "#fee2e2",
  cancelledText: "#991b1b",
  checkedInBg: "#fef3c7",
  checkedInText: "#92400e",
  noShowBg: "#f3f4f6",
  noShowText: "#374151",
};

const FONTS = {
  clinicName: 18,
  title: 14,
  sectionLabel: 8,
  value: 10,
  sub: 9,
  footer: 8,
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

// ─── PDF Styles ───────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: { padding: SPACING.pagePadding, paddingBottom: 50, fontSize: 10, fontFamily: "Helvetica", color: COLORS.text },
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
  statusBadge: { fontSize: 8, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  section: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sectionMarginBottom, paddingBottom: 10, borderBottom: `1pt solid ${COLORS.border}` },
  sectionLabel: { fontSize: FONTS.sectionLabel, fontWeight: "bold", color: COLORS.lightText, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  value: { fontSize: FONTS.value, color: "#333", fontWeight: "bold" },
  subValue: { fontSize: 8, color: COLORS.muted, marginTop: 1 },
  textBlock: { fontSize: 9, color: "#333", lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 20, left: SPACING.pagePadding, right: SPACING.pagePadding, textAlign: "center", fontSize: 7, color: "#aaa", borderTop: `1pt solid ${COLORS.border}`, paddingTop: 6 },
});

// ─── PDF Template ─────────────────────────────────────────
export function AppointmentPdfTemplate({ appointment, logoUrl }: { appointment: any; logoUrl?: string }) {
  const a = appointment;
  const statusColors: Record<string, { bg: string; text: string }> = {
    scheduled: { bg: COLORS.scheduledBg, text: COLORS.scheduledText },
    completed: { bg: COLORS.completedBg, text: COLORS.completedText },
    cancelled: { bg: COLORS.cancelledBg, text: COLORS.cancelledText },
    checked_in: { bg: COLORS.checkedInBg, text: COLORS.checkedInText },
    in_consultation: { bg: COLORS.checkedInBg, text: COLORS.checkedInText },
    no_show: { bg: COLORS.noShowBg, text: COLORS.noShowText },
  };
  const sc = statusColors[a.status] || statusColors.scheduled;

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
            {logoUrl ? (
              <View style={pdfStyles.headerCenter}><Image src={logoUrl} style={pdfStyles.logo} /></View>
            ) : <View style={{ width: 20 }} />}
            <View style={pdfStyles.headerRight}>
              <Text style={pdfStyles.docTitle}>APPOINTMENT SLIP</Text>
              <Text style={pdfStyles.docId}>{a.appointmentId}</Text>
              <Text style={[pdfStyles.statusBadge, { backgroundColor: sc.bg, color: sc.text }]}>{a.status.replace(/_/g, " ").toUpperCase()}</Text>
            </View>
          </View>

          {/* Patient & Doctor */}
          <View style={pdfStyles.section}>
            <View style={{ flex: 1 }}>
              <Text style={pdfStyles.sectionLabel}>Patient</Text>
              <Text style={pdfStyles.value}>{a.patient?.firstName} {a.patient?.lastName}</Text>
              <Text style={pdfStyles.subValue}>{a.patient?.patientId}</Text>
              <Text style={pdfStyles.subValue}>{a.patient?.phone}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={pdfStyles.sectionLabel}>Doctor</Text>
              <Text style={pdfStyles.value}>Dr. {a.doctor?.user?.firstName} {a.doctor?.user?.lastName}</Text>
              <Text style={pdfStyles.subValue}>{a.doctor?.doctorId}</Text>
            </View>
          </View>

          {/* Date & Time / Type */}
          <View style={pdfStyles.section}>
            <View style={{ flex: 1 }}>
              <Text style={pdfStyles.sectionLabel}>Date & Time</Text>
              <Text style={pdfStyles.value}>{formatDate(a.scheduledDate)}</Text>
              <Text style={pdfStyles.subValue}>{a.scheduledTime} ({a.duration} min)</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={pdfStyles.sectionLabel}>Type</Text>
              <Text style={pdfStyles.value}>{a.type?.replace(/_/g, " ")}</Text>
              {a.department && <Text style={pdfStyles.subValue}>{a.department.name}</Text>}
            </View>
          </View>

          {/* Chief Complaint */}
          {a.chiefComplaint && (
            <View style={pdfStyles.section}>
              <View style={{ flex: 1 }}>
                <Text style={pdfStyles.sectionLabel}>Chief Complaint</Text>
                <Text style={pdfStyles.textBlock}>{a.chiefComplaint}</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {a.notes && (
            <View style={pdfStyles.section}>
              <View style={{ flex: 1 }}>
                <Text style={pdfStyles.sectionLabel}>Notes</Text>
                <Text style={pdfStyles.textBlock}>{a.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <Text style={pdfStyles.footer} fixed>
          This is a computer-generated appointment slip • {CLINIC.name}
        </Text>
      </Page>
    </Document>
  );
}

// ─── Print HTML Template ──────────────────────────────────
export function generateAppointmentPrintHtml(appointment: any, logoUrl?: string): string {
  const a = appointment;
  const statusColors: Record<string, { bg: string; text: string }> = {
    scheduled: { bg: COLORS.scheduledBg, text: COLORS.scheduledText },
    completed: { bg: COLORS.completedBg, text: COLORS.completedText },
    cancelled: { bg: COLORS.cancelledBg, text: COLORS.cancelledText },
    checked_in: { bg: COLORS.checkedInBg, text: COLORS.checkedInText },
    in_consultation: { bg: COLORS.checkedInBg, text: COLORS.checkedInText },
    no_show: { bg: COLORS.noShowBg, text: COLORS.noShowText },
  };
  const sc = statusColors[a.status] || statusColors.scheduled;
  const logoSvg = logoUrl ? `<div class="header-center"><img src="${logoUrl}" class="logo" /></div>` : "";

  return `<!DOCTYPE html><html><head><title>${a.appointmentId} - ${CLINIC.name}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;font-size:12px;color:${COLORS.text};padding:25px;padding-bottom:50px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid ${COLORS.primary}}
    .header-left{flex:1}.header-center{flex:0;margin:0 20px;display:flex;justify-content:center;align-items:center}.header-right{flex:1;text-align:right}
    .clinic-name{font-size:${FONTS.clinicName}px;font-weight:700;color:${COLORS.primary}}.clinic-sub{font-size:9px;color:${COLORS.muted};line-height:1.5}
    .logo{width:100px;height:100px;object-fit:contain}.doc-title{font-size:${FONTS.title}px;font-weight:700;color:#333;text-align:right}.doc-id{font-size:10px;color:${COLORS.muted};text-align:right}
    .status-badge{display:inline-block;font-size:9px;font-weight:600;padding:2px 8px;border-radius:4px;margin-top:4px;background:${sc.bg};color:${sc.text}}
    .section{display:flex;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid ${COLORS.border}}
    .label{font-size:${FONTS.sectionLabel}px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
    .value{font-size:${FONTS.value}px;color:#333;font-weight:500}.sub{font-size:${FONTS.sub}px;color:${COLORS.muted}}
    .footer{position:fixed;bottom:0;left:25px;right:25px;text-align:center;font-size:${FONTS.footer}px;color:#aaa;border-top:1px solid ${COLORS.border};padding-top:8px;padding-bottom:8px;background:#fff}
    @media print{body{padding:15px;padding-bottom:50px}}
  </style></head><body>
  <div class="header">
    <div class="header-left"><div class="clinic-name">${CLINIC.name}</div><div class="clinic-sub">${CLINIC.tagline}</div><div class="clinic-details">${CLINIC.address}<br/>${CLINIC.phone}</div></div>
    ${logoSvg}
    <div class="header-right"><div class="doc-title">APPOINTMENT SLIP</div><div class="doc-id">${a.appointmentId}</div><div class="status-badge">${a.status.replace(/_/g, " ").toUpperCase()}</div></div>
  </div>
  <div class="section">
    <div><div class="label">Patient</div><div class="value">${a.patient?.firstName} ${a.patient?.lastName}</div><div class="sub">${a.patient?.patientId}</div><div class="sub">${a.patient?.phone}</div></div>
    <div style="text-align:right;"><div class="label">Doctor</div><div class="value">Dr. ${a.doctor?.user?.firstName} ${a.doctor?.user?.lastName}</div><div class="sub">${a.doctor?.doctorId}</div></div>
  </div>
  <div class="section">
    <div><div class="label">Date & Time</div><div class="value">${formatDate(a.scheduledDate)}</div><div class="sub">${a.scheduledTime} (${a.duration} min)</div></div>
    <div style="text-align:right;"><div class="label">Type</div><div class="value">${a.type?.replace(/_/g, " ")}</div>${a.department ? `<div class="sub">${a.department.name}</div>` : ''}</div>
  </div>
  ${a.chiefComplaint ? `<div class="section"><div class="label">Chief Complaint</div><div style="font-size:10px;color:#333;">${a.chiefComplaint}</div></div>` : ''}
  ${a.notes ? `<div class="section"><div class="label">Notes</div><div style="font-size:10px;color:#333;">${a.notes}</div></div>` : ''}
  <div class="footer">This is a computer-generated appointment slip • ${CLINIC.name}</div>
  </body></html>`;
}