// components/billing/invoice-templates.tsx
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { 
  NEXT_PUBLIC_CLINIC_NAME, 
  NEXT_PUBLIC_CLINIC_TAGLINE, 
  NEXT_PUBLIC_CLINIC_ADDRESS, 
  NEXT_PUBLIC_CLINIC_PHONE,
  INVOICE_PRINT_PDF_TEMPLATE_COLORS,
} from "@/constants/ClinicDetails";

const CLINIC = {
  name: NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS",
  tagline: NEXT_PUBLIC_CLINIC_TAGLINE || "Hospital Management System",
  address: NEXT_PUBLIC_CLINIC_ADDRESS || "123 Healthcare Avenue, Medical District",
  phone: NEXT_PUBLIC_CLINIC_PHONE || "+92 300 1234567",
};

const COLORS = INVOICE_PRINT_PDF_TEMPLATE_COLORS || {
  primary: "#0d9488",
  text: "#1a1a1a",
  muted: "#666",
  lightText: "#888",
  border: "#e5e5e5",
  tableHeaderBg: "#f0fdfa",
  paidBg: "#d1fae5",
  paidText: "#065f46",
  pendingBg: "#fef3c7",
  pendingText: "#92400e",
  overdueBg: "#fee2e2",
  overdueText: "#991b1b",
  discountText: "#059669",
  balanceText: "#dc2626",
};

const FONTS = {
  clinicName: 18,
  title: 14,
  sectionLabel: 8,
  value: 9,
  tableHeader: 7,
  tableCell: 8.5,
  totals: 9,
  footer: 7,
};

const SPACING = {
  pagePadding: 35,
  headerMarginBottom: 18,
  sectionMarginBottom: 14,
  tableMarginBottom: 14,
};

function formatCurrency(amount: number): string {
  return `PKR ${amount?.toLocaleString()}`;
}

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
  statusBadge: { fontSize: 8, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusPaid: { backgroundColor: COLORS.paidBg, color: COLORS.paidText },
  statusPending: { backgroundColor: COLORS.pendingBg, color: COLORS.pendingText },
  statusOverdue: { backgroundColor: COLORS.overdueBg, color: COLORS.overdueText },
  section: { flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sectionMarginBottom, paddingBottom: 10, borderBottom: `1pt solid ${COLORS.border}` },
  sectionLabel: { fontSize: FONTS.sectionLabel, fontWeight: "bold", color: COLORS.lightText, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  value: { fontSize: FONTS.value, color: "#333" },
  subValue: { fontSize: 8, color: COLORS.muted, marginTop: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: COLORS.tableHeaderBg, borderBottom: `1.5pt solid ${COLORS.primary}`, paddingVertical: 5, paddingHorizontal: 5 },
  tableRow: { flexDirection: "row", borderBottom: `1pt solid #f0f0f0`, paddingVertical: 4, paddingHorizontal: 5 },
  colDesc: { width: "36%" }, colCat: { width: "16%" }, colQty: { width: "12%", textAlign: "right" }, colPrice: { width: "18%", textAlign: "right" }, colTotal: { width: "18%", textAlign: "right" },
  tableHeaderText: { fontSize: FONTS.tableHeader, fontWeight: "bold", color: COLORS.primary, textTransform: "uppercase" },
  tableCell: { fontSize: FONTS.tableCell, color: "#333" },
  tableCellBold: { fontSize: FONTS.tableCell, fontWeight: "bold", color: "#333" },
  medicineName: { fontSize: 7, color: "#999", marginTop: 1 },
  totalsWrapper: { alignItems: "flex-end", marginTop: 8 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 200, paddingVertical: 2 },
  totalsLabel: { fontSize: FONTS.totals, color: COLORS.muted },
  totalsValue: { fontSize: FONTS.totals, color: "#333" },
  totalsTotal: { fontSize: FONTS.totals, fontWeight: "bold", color: "#333", borderTop: `1pt solid #333`, paddingTop: 4, marginTop: 2 },
  totalsBalance: { fontSize: FONTS.totals, fontWeight: "bold", color: COLORS.balanceText, borderTop: `1pt solid ${COLORS.balanceText}`, paddingTop: 4, marginTop: 2 },
  paymentsSection: { marginTop: 8 },
  paymentsTitle: { fontSize: FONTS.sectionLabel, fontWeight: "bold", color: COLORS.muted, marginBottom: 4 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  paymentText: { fontSize: 8, color: "#333" },
  paymentDate: { fontSize: 8, color: "#999" },
  notesSection: { marginTop: 8 },
  footer: { position: "absolute", bottom: 20, left: SPACING.pagePadding, right: SPACING.pagePadding, textAlign: "center", fontSize: FONTS.footer, color: "#aaa", borderTop: `1pt solid ${COLORS.border}`, paddingTop: 6 },
});

export function InvoicePdfTemplate({ invoice, logoUrl }: { invoice: any; logoUrl?: string }) {
  const discountAmount = invoice.discountType === "percentage" ? invoice.subtotal * invoice.discount / 100 : invoice.discount;
  const statusStyle = invoice.status === "paid" ? pdfStyles.statusPaid : invoice.status === "overdue" ? pdfStyles.statusOverdue : pdfStyles.statusPending;

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
            {logoUrl ? <View style={pdfStyles.headerCenter}><Image src={logoUrl} style={pdfStyles.logo} /></View> : <View style={{ width: 20 }} />}
            <View style={pdfStyles.headerRight}>
              <Text style={pdfStyles.docTitle}>INVOICE</Text>
              <Text style={pdfStyles.docId}>{invoice.invoiceNumber}</Text>
              <Text style={[pdfStyles.statusBadge, statusStyle]}>{invoice.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <View style={{ flex: 1 }}>
              <Text style={pdfStyles.sectionLabel}>Bill To</Text>
              {invoice.patient ? (
                <>
                  <Text style={pdfStyles.value}>{invoice.patient.firstName} {invoice.patient.lastName}</Text>
                  <Text style={pdfStyles.subValue}>{invoice.patient.patientId}</Text>
                  <Text style={pdfStyles.subValue}>{invoice.patient.phone}</Text>
                  {invoice.patient.email && <Text style={pdfStyles.subValue}>{invoice.patient.email}</Text>}
                </>
              ) : <Text style={pdfStyles.value}>{invoice.patientName || "Walk-in Customer"}</Text>}
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={pdfStyles.sectionLabel}>Date Issued</Text>
              <Text style={pdfStyles.value}>{formatDate(invoice.createdAt)}</Text>
              {invoice.dueDate && <><Text style={[pdfStyles.sectionLabel, { marginTop: 8 }]}>Due Date</Text><Text style={pdfStyles.value}>{formatDate(invoice.dueDate)}</Text></>}
              {invoice.doctor && <><Text style={[pdfStyles.sectionLabel, { marginTop: 8 }]}>Doctor</Text><Text style={pdfStyles.value}>Dr. {invoice.doctor.firstName} {invoice.doctor.lastName}</Text></>}
            </View>
          </View>

          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.tableHeaderText, pdfStyles.colDesc]}>Description</Text>
            <Text style={[pdfStyles.tableHeaderText, pdfStyles.colCat]}>Category</Text>
            <Text style={[pdfStyles.tableHeaderText, pdfStyles.colQty]}>Qty</Text>
            <Text style={[pdfStyles.tableHeaderText, pdfStyles.colPrice]}>Unit Price</Text>
            <Text style={[pdfStyles.tableHeaderText, pdfStyles.colTotal]}>Total</Text>
          </View>
          {invoice.items.map((item: any, i: number) => (
            <View key={i} style={pdfStyles.tableRow}>
              <View style={pdfStyles.colDesc}><Text style={pdfStyles.tableCellBold}>{item.description}</Text>{item.medicine?.name && <Text style={pdfStyles.medicineName}>{item.medicine.name}</Text>}</View>
              <Text style={[pdfStyles.tableCell, pdfStyles.colCat]}>{item.category}</Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.colQty]}>{item.quantity}</Text>
              <Text style={[pdfStyles.tableCell, pdfStyles.colPrice]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[pdfStyles.tableCellBold, pdfStyles.colTotal]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}

          <View style={pdfStyles.totalsWrapper}>
            <View style={pdfStyles.totalsRow}><Text style={pdfStyles.totalsLabel}>Subtotal</Text><Text style={pdfStyles.totalsValue}>{formatCurrency(invoice.subtotal)}</Text></View>
            {invoice.discount > 0 && <View style={pdfStyles.totalsRow}><Text style={[pdfStyles.totalsLabel, { color: COLORS.discountText }]}>Discount {invoice.discountType === "percentage" ? `(${invoice.discount}%)` : ""}</Text><Text style={[pdfStyles.totalsValue, { color: COLORS.discountText }]}>-{formatCurrency(discountAmount)}</Text></View>}
            {invoice.taxAmount > 0 && <View style={pdfStyles.totalsRow}><Text style={pdfStyles.totalsLabel}>Tax ({invoice.taxRate}%)</Text><Text style={pdfStyles.totalsValue}>{formatCurrency(invoice.taxAmount)}</Text></View>}
            <View style={[pdfStyles.totalsRow, pdfStyles.totalsTotal]}><Text style={{ fontWeight: "bold" }}>Total</Text><Text style={{ fontWeight: "bold" }}>{formatCurrency(invoice.total)}</Text></View>
            <View style={pdfStyles.totalsRow}><Text style={[pdfStyles.totalsLabel, { color: COLORS.discountText }]}>Amount Paid</Text><Text style={[pdfStyles.totalsValue, { color: COLORS.discountText }]}>{formatCurrency(invoice.paidAmount)}</Text></View>
            {invoice.balanceDue > 0 && <View style={[pdfStyles.totalsRow, pdfStyles.totalsBalance]}><Text style={{ fontWeight: "bold", color: COLORS.balanceText }}>Balance Due</Text><Text style={{ fontWeight: "bold", color: COLORS.balanceText }}>{formatCurrency(invoice.balanceDue)}</Text></View>}
          </View>

          {invoice.payments?.length > 0 && (
            <View style={pdfStyles.paymentsSection}>
              <Text style={pdfStyles.paymentsTitle}>Payment History</Text>
              {invoice.payments.map((p: any, i: number) => (
                <View key={i} style={pdfStyles.paymentRow}>
                  <Text style={pdfStyles.paymentText}><Text style={{ fontWeight: "bold" }}>{formatCurrency(p.amount)}</Text> — {p.method.replace(/_/g, " ")}{p.transactionRef ? ` (Ref: ${p.transactionRef})` : ""}</Text>
                  <Text style={pdfStyles.paymentDate}>{formatDate(p.paidAt)}</Text>
                </View>
              ))}
            </View>
          )}

          {invoice.notes && <View style={pdfStyles.notesSection}><Text style={pdfStyles.sectionLabel}>Notes</Text><Text style={pdfStyles.subValue}>{invoice.notes}</Text></View>}
        </View>

        <Text style={pdfStyles.footer} fixed>Thank you for choosing {CLINIC.name} • This is a computer-generated invoice</Text>
      </Page>
    </Document>
  );
}

export function generateInvoicePrintHtml(invoice: any, logoUrl?: string): string {
  const discountAmount = invoice.discountType === "percentage" ? invoice.subtotal * invoice.discount / 100 : invoice.discount;
  const statusBadge = invoice.status === "paid" ? `<span class="status-badge status-paid">PAID</span>` : invoice.status === "overdue" ? `<span class="status-badge status-overdue">OVERDUE</span>` : `<span class="status-badge status-pending">${invoice.status.toUpperCase()}</span>`;
  const billToHtml = invoice.patient ? `<div class="value">${invoice.patient.firstName} ${invoice.patient.lastName}</div><div class="sub">${invoice.patient.patientId}</div><div class="sub">${invoice.patient.phone}</div>${invoice.patient.email ? `<div class="sub">${invoice.patient.email}</div>` : ''}` : invoice.patientName ? `<div class="value">${invoice.patientName}</div><div class="sub">Walk-in Patient</div>` : `<div class="value">Walk-in Customer</div>`;
  const itemsHtml = invoice.items.map((item: any) => `<tr><td>${item.description}${item.medicine?.name ? `<br/><span class="medicine-name">${item.medicine.name}</span>` : ''}</td><td><span class="category-badge">${item.category}</span></td><td class="right">${item.quantity}</td><td class="right">${formatCurrency(item.unitPrice)}</td><td class="right font-medium">${formatCurrency(item.total)}</td></tr>`).join("");
  const paymentsHtml = invoice.payments?.length > 0 ? `<div class="payments-section"><div class="payments-title">Payment History</div>${invoice.payments.map((p: any) => `<div class="payment-row"><span><strong>${formatCurrency(p.amount)}</strong> — ${p.method.replace(/_/g, " ")}${p.transactionRef ? ` (Ref: ${p.transactionRef})` : ''}</span><span class="muted">${formatDate(p.paidAt)}</span></div>`).join("")}</div>` : "";
  const logoSvg = logoUrl ? `<div class="header-center"><img src="${logoUrl}" class="logo" /></div>` : "";

  return `<!DOCTYPE html><html><head><title>${invoice.invoiceNumber} - ${CLINIC.name}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:12px;color:${COLORS.text};background:#fff;padding:30px;padding-bottom:60px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid ${COLORS.primary}}
    .header-left{flex:1}.header-center{flex:0;margin:0 20px;display:flex;justify-content:center;align-items:center}.header-right{flex:1;text-align:right}
    .clinic-name{font-size:20px;font-weight:700;color:${COLORS.primary}}.clinic-sub{font-size:9px;color:${COLORS.muted};margin-bottom:4px}.clinic-details{font-size:9px;color:${COLORS.muted};line-height:1.5}
    .logo{width:100px;height:100px;object-fit:contain}.invoice-title{font-size:16px;font-weight:700;color:#333;text-align:right}.invoice-number{font-size:11px;color:${COLORS.muted};text-align:right}
    .section{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid ${COLORS.border}}
    .label{font-size:9px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.value{font-size:11px;color:#333;font-weight:500}.sub{font-size:10px;color:${COLORS.muted}}
    .status-badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;margin-top:4px}
    .status-paid{background:${COLORS.paidBg};color:${COLORS.paidText}}.status-pending{background:${COLORS.pendingBg};color:${COLORS.pendingText}}.status-overdue{background:${COLORS.overdueBg};color:${COLORS.overdueText}}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{text-align:left;font-size:9px;font-weight:600;color:${COLORS.lightText};text-transform:uppercase;letter-spacing:1px;padding:8px 6px;border-bottom:2px solid ${COLORS.border}}th.right{text-align:right}
    td{padding:6px 6px;border-bottom:1px solid #f0f0f0;font-size:10px;color:#333}td.right{text-align:right}.font-medium{font-weight:500}
    .medicine-name{font-size:9px;color:#999}.category-badge{background:#f5f5f5;padding:1px 6px;border-radius:3px;font-size:9px}
    .totals{width:280px;margin-left:auto}.totals-row{display:flex;justify-content:space-between;font-size:10px;padding:3px 0}
    .totals-row.total{font-size:13px;font-weight:700;border-top:2px solid #333;padding-top:6px;margin-top:4px}
    .totals-row.balance{font-size:13px;font-weight:700;color:${COLORS.balanceText};border-top:2px solid ${COLORS.balanceText};padding-top:6px;margin-top:4px}
    .totals-label{color:${COLORS.muted}}.totals-value{color:#333}
    .payments-section{margin-top:16px}.payments-title{font-size:10px;font-weight:600;color:${COLORS.muted};margin-bottom:8px}
    .payment-row{display:flex;justify-content:space-between;font-size:10px;padding:4px 0;border-bottom:1px solid #f0f0f0}.muted{color:#999}
    .footer{position:fixed;bottom:0;left:30px;right:30px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid ${COLORS.border};padding-top:10px;padding-bottom:10px;background:#fff}
    @media print{body{padding:20px;padding-bottom:60px}@page{margin:15mm}}
  </style></head><body>
  <div class="header"><div class="header-left"><div class="clinic-name">${CLINIC.name}</div><div class="clinic-sub">${CLINIC.tagline}</div><div class="clinic-details">${CLINIC.address}<br/>${CLINIC.phone}</div></div>${logoSvg}<div class="header-right"><div class="invoice-title">INVOICE</div><div class="invoice-number">${invoice.invoiceNumber}</div>${statusBadge}</div></div>
  <div class="section"><div><div class="label">Bill To</div>${billToHtml}</div><div style="text-align:right;"><div class="label">Date Issued</div><div class="value">${formatDate(invoice.createdAt)}</div>${invoice.dueDate ? `<div class="label" style="margin-top:8px;">Due Date</div><div class="value">${formatDate(invoice.dueDate)}</div>` : ''}${invoice.doctor ? `<div class="label" style="margin-top:8px;">Doctor</div><div class="value">Dr. ${invoice.doctor.firstName} ${invoice.doctor.lastName}</div>` : ''}</div></div>
  <table><thead><tr><th>Description</th><th>Category</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
  <div class="totals"><div class="totals-row"><span class="totals-label">Subtotal</span><span class="totals-value">${formatCurrency(invoice.subtotal)}</span></div>${invoice.discount > 0 ? `<div class="totals-row"><span class="totals-label">Discount ${invoice.discountType === "percentage" ? `(${invoice.discount}%)` : ''}</span><span class="totals-value" style="color:${COLORS.discountText};">-${formatCurrency(discountAmount)}</span></div>` : ''}${invoice.taxAmount > 0 ? `<div class="totals-row"><span class="totals-label">Tax (${invoice.taxRate}%)</span><span class="totals-value">${formatCurrency(invoice.taxAmount)}</span></div>` : ''}<div class="totals-row total"><span>Total</span><span>${formatCurrency(invoice.total)}</span></div><div class="totals-row"><span class="totals-label">Amount Paid</span><span class="totals-value" style="color:${COLORS.discountText};">${formatCurrency(invoice.paidAmount)}</span></div>${invoice.balanceDue > 0 ? `<div class="totals-row balance"><span>Balance Due</span><span>${formatCurrency(invoice.balanceDue)}</span></div>` : ''}</div>
  ${paymentsHtml}
  ${invoice.notes ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #f0f0f0;"><div class="label">Notes</div><div style="font-size:10px;color:#666;">${invoice.notes}</div></div>` : ''}
  <div class="footer">Thank you for choosing ${CLINIC.name} • This is a computer-generated invoice</div>
  </body></html>`;
}