// components/billing/invoice-detail-client.tsx
"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Printer, Plus, CheckCircle, User, Trash2 } from "lucide-react";
import {
  Card, CardBody, StatusBadge,
  Button, Modal, FormField, Input, Select, Alert, Badge, Skeleton,
} from "@/components/ui";
import { addPaymentSchema } from "@/lib/validations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PaymentInput = z.infer<typeof addPaymentSchema>;

const CLINIC_NAME = "ClinicHMS";
const CLINIC_TAGLINE = "Hospital Management System";
const CLINIC_ADDRESS = "123 Healthcare Avenue, Medical District";
const CLINIC_PHONE = "+92 300 1234567";
const CLINIC_EMAIL = "info@clinichms.com";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: string;
  patient?: { firstName: string; lastName: string; patientId: string; phone: string; email?: string; address?: { city?: string; country?: string } };
  patientName?: string;
  doctor?: { firstName: string; lastName: string };
  items: { description: string; category: string; quantity: number; unitPrice: number; total: number; medicine?: { name: string } }[];
  subtotal: number;
  discount: number;
  discountType: string;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  payments: { amount: number; method: string; paidAt: string; receivedBy: { firstName: string; lastName: string }; transactionRef?: string }[];
  notes?: string;
  dueDate?: string;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
}

export function InvoiceDetailClient({ invoiceId }: { invoiceId: string }) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canUpdate = isSA || perms.includes("billing:update");
  const canDelete = isSA || perms.includes("billing:delete");

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => axios.get(`/api/invoice/${invoiceId}`).then(r => r.data),
  });

  const inv: Invoice | undefined = data?.data;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentInput>({
    resolver: zodResolver(addPaymentSchema),
  });

  const paymentMutation = useMutation({
    mutationFn: (d: PaymentInput) => axios.put(`/api/invoice/${invoiceId}`, {
      payments: [{
        amount: d.amount,
        method: d.method,
        transactionRef: d.transactionRef || undefined,
        receivedBy: session?.user.id,
        notes: d.notes || undefined,
      }],
      paidAmount: (inv?.paidAmount || 0) + d.amount,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setPaymentOpen(false);
      reset();
      setPaymentError("");
      toast.success("Payment recorded successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Payment failed";
      setPaymentError(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => axios.delete(`/api/invoice/${invoiceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted successfully!");
      router.push("/billing");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete";
      setDeleteError(msg);
      toast.error(msg);
    },
  });

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the invoice.");
      return;
    }

    const printContent = printRef.current?.innerHTML || "";
    const discountAmount = inv!.discountType === "percentage"
      ? inv!.subtotal * inv!.discount / 100
      : inv!.discount;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${inv!.invoiceNumber} - ${CLINIC_NAME}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 12px; 
            color: #1a1a1a;
            background: #fff;
            padding: 30px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0d9488; }
          .clinic-name { font-size: 20px; font-weight: 700; color: #0d9488; }
          .clinic-tagline { font-size: 10px; color: #666; margin-bottom: 4px; }
          .clinic-details { font-size: 10px; color: #666; line-height: 1.5; }
          .invoice-title { font-size: 16px; font-weight: 700; color: #333; text-align: right; }
          .invoice-number { font-size: 11px; color: #666; text-align: right; }
          .section { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5; }
          .section-label { font-size: 9px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .section-value { font-size: 11px; color: #333; font-weight: 500; }
          .section-sub { font-size: 10px; color: #666; }
          .status-paid { display: inline-block; background: #d1fae5; color: #065f46; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
          .status-pending { display: inline-block; background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
          .status-overdue { display: inline-block; background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; font-size: 9px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; padding: 8px 6px; border-bottom: 2px solid #e5e5e5; }
          th.right { text-align: right; }
          td { padding: 6px 6px; border-bottom: 1px solid #f0f0f0; font-size: 10px; color: #333; }
          td.right { text-align: right; }
          .totals { width: 280px; margin-left: auto; }
          .totals-row { display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; }
          .totals-row.total { font-size: 13px; font-weight: 700; border-top: 2px solid #333; padding-top: 6px; margin-top: 4px; }
          .totals-row.balance { font-size: 13px; font-weight: 700; color: #dc2626; border-top: 2px solid #dc2626; padding-top: 6px; margin-top: 4px; }
          .totals-label { color: #666; }
          .totals-value { color: #333; }
          .payments-section { margin-top: 16px; }
          .payments-title { font-size: 10px; font-weight: 600; color: #666; margin-bottom: 8px; }
          .payment-row { display: flex; justify-content: space-between; font-size: 10px; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
          .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 9px; color: #aaa; }
          @media print {
            body { padding: 20px; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div>
            <div class="clinic-name">${CLINIC_NAME}</div>
            <div class="clinic-tagline">${CLINIC_TAGLINE}</div>
            <div class="clinic-details">
              ${CLINIC_ADDRESS}<br/>
              ${CLINIC_PHONE} • ${CLINIC_EMAIL}
            </div>
          </div>
          <div>
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${inv!.invoiceNumber}</div>
            <div style="margin-top: 4px;">
              ${inv!.status === "paid" ? '<span class="status-paid">PAID</span>' : ''}
              ${inv!.status === "pending" || inv!.status === "partial" ? '<span class="status-pending">' + inv!.status.toUpperCase() + '</span>' : ''}
              ${inv!.status === "overdue" ? '<span class="status-overdue">OVERDUE</span>' : ''}
            </div>
          </div>
        </div>

        <!-- Bill To / Dates -->
        <div class="section">
          <div>
            <div class="section-label">Bill To</div>
            ${inv!.patient ? `
              <div class="section-value">${inv!.patient.firstName} ${inv!.patient.lastName}</div>
              <div class="section-sub">${inv!.patient.patientId}</div>
              <div class="section-sub">${inv!.patient.phone}</div>
              ${inv!.patient.email ? `<div class="section-sub">${inv!.patient.email}</div>` : ''}
            ` : inv!.patientName ? `
              <div class="section-value">${inv!.patientName}</div>
              <div class="section-sub">Walk-in Patient</div>
            ` : `
              <div class="section-value">Walk-in Customer</div>
            `}
          </div>
          <div style="text-align: right;">
            <div class="section-label">Date Issued</div>
            <div class="section-value">${formatDate(inv!.createdAt)}</div>
            ${inv!.dueDate ? `
              <div class="section-label" style="margin-top: 8px;">Due Date</div>
              <div class="section-value">${formatDate(inv!.dueDate)}</div>
            ` : ''}
            ${inv!.doctor ? `
              <div class="section-label" style="margin-top: 8px;">Doctor</div>
              <div class="section-value">Dr. ${inv!.doctor.firstName} ${inv!.doctor.lastName}</div>
            ` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv!.items.map(item => `
              <tr>
                <td>${item.description}${item.medicine?.name ? `<br/><span style="font-size:9px;color:#999;">${item.medicine.name}</span>` : ''}</td>
                <td><span style="background:#f5f5f5;padding:1px 6px;border-radius:3px;font-size:9px;">${item.category}</span></td>
                <td class="right">${item.quantity}</td>
                <td class="right">${formatCurrency(item.unitPrice)}</td>
                <td class="right" style="font-weight:500;">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="totals-row">
            <span class="totals-label">Subtotal</span>
            <span class="totals-value">${formatCurrency(inv!.subtotal)}</span>
          </div>
          ${inv!.discount > 0 ? `
          <div class="totals-row">
            <span class="totals-label">Discount ${inv!.discountType === "percentage" ? `(${inv!.discount}%)` : ''}</span>
            <span class="totals-value" style="color:#059669;">-${formatCurrency(discountAmount)}</span>
          </div>
          ` : ''}
          ${inv!.taxAmount > 0 ? `
          <div class="totals-row">
            <span class="totals-label">Tax (${inv!.taxRate}%)</span>
            <span class="totals-value">${formatCurrency(inv!.taxAmount)}</span>
          </div>
          ` : ''}
          <div class="totals-row total">
            <span>Total</span>
            <span>${formatCurrency(inv!.total)}</span>
          </div>
          <div class="totals-row">
            <span class="totals-label">Amount Paid</span>
            <span class="totals-value" style="color:#059669;">${formatCurrency(inv!.paidAmount)}</span>
          </div>
          ${inv!.balanceDue > 0 ? `
          <div class="totals-row balance">
            <span>Balance Due</span>
            <span>${formatCurrency(inv!.balanceDue)}</span>
          </div>
          ` : ''}
        </div>

        <!-- Payments -->
        ${inv!.payments?.length > 0 ? `
        <div class="payments-section">
          <div class="payments-title">Payment History</div>
          ${inv!.payments.map(p => `
          <div class="payment-row">
            <span><strong>${formatCurrency(p.amount)}</strong> — ${p.method.replace(/_/g, " ")} ${p.transactionRef ? `(Ref: ${p.transactionRef})` : ''}</span>
            <span style="color:#999;">${formatDate(p.paidAt)}</span>
          </div>
          `).join('')}
        </div>
        ` : ''}

        ${inv!.notes ? `
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #f0f0f0;">
          <div class="section-label">Notes</div>
          <div style="font-size:10px;color:#666;">${inv!.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
          Thank you for choosing ${CLINIC_NAME} <br> This is a computer-generated invoice
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Alert type="error">Invoice not found.</Alert>
      </div>
    );
  }

  const isPaid = inv.status === "paid";
  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      opd: "OPD Consultation",
      pharmacy_sale: "Pharmacy Sale",
      lab: "Lab Test",
      procedure: "Procedure",
      other: "Other",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{inv.invoiceNumber}</h1>
            <p className="text-xs text-gray-500">{typeLabel(inv.invoiceType)} • {formatDate(inv.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canUpdate && !isPaid && inv.balanceDue > 0 && (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          {canDelete && (
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      <div ref={printRef}>
        <Card>
          <CardBody>
            {/* Status Bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <StatusBadge status={inv.status} />
                <Badge variant="outline">{typeLabel(inv.invoiceType)}</Badge>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                {inv.balanceDue > 0 ? (
                  <p className="text-xs text-red-500 font-medium">Balance: {formatCurrency(inv.balanceDue)}</p>
                ) : isPaid ? (
                  <p className="text-xs text-teal-600 font-medium flex items-center gap-1 justify-end">
                    <CheckCircle className="w-3 h-3" /> Paid in full
                  </p>
                ) : null}
              </div>
            </div>

            {/* Bill To & Issued By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bill To</p>
                {inv.patient ? (
                  <>
                    <p className="text-xs font-semibold text-gray-900">{inv.patient.firstName} {inv.patient.lastName}</p>
                    <p className="text-xs text-gray-500">{inv.patient.patientId}</p>
                    <p className="text-xs text-gray-500">{inv.patient.phone}</p>
                    {inv.patient.email && <p className="text-xs text-gray-500">{inv.patient.email}</p>}
                  </>
                ) : inv.patientName ? (
                  <>
                    <p className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                      <User className="w-3 h-3" /> {inv.patientName}
                    </p>
                    <p className="text-xs text-gray-400">Walk-in patient</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Walk-in customer</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Issued By</p>
                <p className="text-xs text-gray-700">{inv.createdBy?.firstName} {inv.createdBy?.lastName}</p>
                {inv.doctor && (
                  <p className="text-xs text-gray-500 mt-0.5">Dr. {inv.doctor.firstName} {inv.doctor.lastName}</p>
                )}
                {inv.dueDate && (
                  <p className="text-xs text-gray-400 mt-0.5">Due: {formatDate(inv.dueDate)}</p>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 mb-2 px-2">
                <div className="col-span-5 text-xs font-semibold text-gray-400 uppercase">Description</div>
                <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase">Category</div>
                <div className="col-span-1 text-xs font-semibold text-gray-400 uppercase text-right">Qty</div>
                <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase text-right">Unit Price</div>
                <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase text-right">Total</div>
              </div>
              <div className="space-y-1">
                {inv.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="sm:col-span-5">
                      <span className="text-xs font-medium text-gray-900">{item.description}</span>
                      {item.medicine?.name && <span className="text-xs text-gray-400 block">{item.medicine.name}</span>}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded">{item.category}</span>
                    </div>
                    <div className="sm:col-span-1 sm:text-right">
                      <span className="text-xs text-gray-600">{item.quantity}</span>
                    </div>
                    <div className="sm:col-span-2 sm:text-right">
                      <span className="text-xs text-gray-600">{formatCurrency(item.unitPrice)}</span>
                    </div>
                    <div className="sm:col-span-2 sm:text-right">
                      <span className="text-xs font-semibold text-gray-700">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-4 pb-4 border-b border-gray-200">
              <div className="w-full sm:w-56 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-gray-700">{formatCurrency(inv.subtotal)}</span>
                </div>
                {inv.discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-teal-600">Discount {inv.discountType === "percentage" ? `(${inv.discount}%)` : ""}</span>
                    <span className="text-teal-600">
                      -{formatCurrency(inv.discountType === "percentage" ? inv.subtotal * inv.discount / 100 : inv.discount)}
                    </span>
                  </div>
                )}
                {inv.taxAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Tax ({inv.taxRate}%)</span>
                    <span className="text-gray-700">{formatCurrency(inv.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-sm border-t border-gray-300 pt-1.5 mt-1">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(inv.total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-teal-600">Amount Paid</span>
                  <span className="text-teal-600">{formatCurrency(inv.paidAmount)}</span>
                </div>
                {inv.balanceDue > 0 && (
                  <div className="flex justify-between font-semibold text-sm text-red-500 border-t border-red-200 pt-1.5 mt-1">
                    <span>Balance Due</span>
                    <span>{formatCurrency(inv.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            {inv.payments?.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Payment History</p>
                <div className="space-y-1">
                  {inv.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{formatCurrency(p.amount)}</span>
                        <span className="text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded capitalize">
                          {p.method.replace(/_/g, " ")}
                        </span>
                        {p.transactionRef && (
                          <span className="text-xs text-gray-400">Ref: {p.transactionRef}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(p.paidAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {inv.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-xs text-gray-600">{inv.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal open={paymentOpen} onClose={() => { setPaymentOpen(false); reset(); setPaymentError(""); }} title="Record Payment" size="sm">
        {paymentError && <Alert type="error">{paymentError}</Alert>}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
          <p className="text-xs text-gray-400">Balance due</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(inv.balanceDue)}</p>
        </div>
        <form onSubmit={handleSubmit(d => paymentMutation.mutate(d))} className="space-y-4">
          <FormField label="Amount" required error={errors.amount?.message}>
            <Input type="number" step="0.01" max={inv.balanceDue} {...register("amount", { valueAsNumber: true })} error={!!errors.amount} placeholder={String(inv.balanceDue)} />
          </FormField>
          <FormField label="Payment Method" required error={errors.method?.message}>
            <Select {...register("method")} error={!!errors.method}>
              <option value="">Select method</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_wallet">Mobile Wallet</option>
              <option value="insurance">Insurance</option>
            </Select>
          </FormField>
          <FormField label="Transaction Reference">
            <Input {...register("transactionRef")} placeholder="Optional ref / receipt number" />
          </FormField>
          <FormField label="Notes">
            <Input {...register("notes")} placeholder="Optional" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setPaymentOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={paymentMutation.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }} title="Delete Invoice" size="sm">
        <div className="space-y-4 mt-2">
          {deleteError && <Alert type="error">{deleteError}</Alert>}
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-800">Delete permanently?</p>
              <p className="text-xs text-red-600 mt-0.5">
                This will permanently delete invoice <strong>{inv.invoiceNumber}</strong>. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}>Cancel</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}