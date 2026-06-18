"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Printer, Plus, CheckCircle, Building2, User } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, StatusBadge,
  Button, Modal, FormField, Input, Select, Alert, Badge, Skeleton,
} from "@/components/ui";
import { addPaymentSchema } from "@/lib/validations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { z } from "zod";

type PaymentInput = z.infer<typeof addPaymentSchema>;

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: string;
  patient?: { firstName: string; lastName: string; patientId: string; phone: string; email?: string; address?: { city?: string; country?: string } };
  doctor?: { firstName: string; lastName: string };
  supplier?: { name: string; phone: string; email?: string };
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
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canUpdate = isSA || perms.includes("billing:update");

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
    },
    onError: (e: unknown) => setPaymentError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Payment failed"),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  if (!inv) return <div><Alert type="error">Invoice not found.</Alert></div>;

  const isPaid = inv.status === "paid";
  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      opd: "OPD/Consultation",
      pharmacy_sale: "Pharmacy Sale",
      pharmacy_purchase: "Pharmacy Purchase",
      lab: "Lab Test",
      procedure: "Procedure",
      other: "Other",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between no-print">
        <Link href="/billing"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> All Invoices</Button></Link>
        <div className="flex gap-2">
          {canUpdate && !isPaid && inv.balanceDue > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          {/* Invoice header */}
          <div className="flex items-start justify-between pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-slate-800">{inv.invoiceNumber}</h1>
                <StatusBadge status={inv.status} />
                <Badge variant="outline">{typeLabel(inv.invoiceType)}</Badge>
              </div>
              <p className="text-sm text-slate-400">Issued: {formatDate(inv.createdAt)}</p>
              {inv.dueDate && <p className="text-sm text-slate-400">Due: {formatDate(inv.dueDate)}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(inv.total)}</p>
              {inv.balanceDue > 0 && <p className="text-sm text-red-500 font-medium">Balance: {formatCurrency(inv.balanceDue)}</p>}
              {isPaid && <p className="text-sm text-emerald-600 font-medium flex items-center gap-1 justify-end"><CheckCircle className="w-3.5 h-3.5" /> Paid in full</p>}
            </div>
          </div>

          {/* Bill To / Supplier / Doctor */}
          <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200">
            <div>
              {inv.invoiceType === "pharmacy_purchase" && inv.supplier ? (
                <>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Supplier</p>
                  <p className="font-semibold text-slate-800 flex items-center gap-1"><Building2 className="w-4 h-4" /> {inv.supplier.name}</p>
                  <p className="text-sm text-slate-500">{inv.supplier.phone}</p>
                  {inv.supplier.email && <p className="text-sm text-slate-500">{inv.supplier.email}</p>}
                </>
              ) : inv.patient ? (
                <>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Bill To</p>
                  <p className="font-semibold text-slate-800">{inv.patient.firstName} {inv.patient.lastName}</p>
                  <p className="text-sm text-slate-500">{inv.patient.patientId}</p>
                  <p className="text-sm text-slate-500">{inv.patient.phone}</p>
                  {inv.patient.email && <p className="text-sm text-slate-500">{inv.patient.email}</p>}
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Bill To</p>
                  <p className="text-sm text-slate-400">Walk-in customer</p>
                </>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Issued By</p>
              <p className="font-medium text-slate-700">{inv.createdBy?.firstName} {inv.createdBy?.lastName}</p>
              {inv.doctor && <p className="text-sm text-slate-500 mt-1">Dr. {inv.doctor.firstName} {inv.doctor.lastName}</p>}
            </div>
          </div>

          {/* Line items */}
          <div className="py-5 border-b border-slate-200">
            <Table>
              <thead>
                <tr><Th>Description</Th><Th>Category</Th><Th>Qty</Th><Th>Unit Price</Th><Th>Total</Th></tr>
              </thead>
              <tbody>
                {inv.items.map((item, i) => (
                  <tr key={i}>
                    <Td>
                      <div>{item.description}</div>
                      {item.medicine?.name && <div className="text-xs text-slate-400">{item.medicine.name}</div>}
                    </Td>
                    <Td><Badge variant="outline" className="capitalize">{item.category}</Badge></Td>
                    <Td>{item.quantity}</Td>
                    <Td>{formatCurrency(item.unitPrice)}</Td>
                    <Td className="font-medium">{formatCurrency(item.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Totals */}
          <div className="py-5 flex justify-end border-b border-slate-200">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(inv.subtotal)}</span></div>
              {inv.discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount {inv.discountType === "percentage" ? `(${inv.discount}%)` : ""}</span>
                  <span>-{formatCurrency(inv.discountType === "percentage" ? inv.subtotal * inv.discount / 100 : inv.discount)}</span>
                </div>
              )}
              {inv.taxAmount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-slate-500">Tax ({inv.taxRate}%)</span><span>{formatCurrency(inv.taxAmount)}</span></div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>Total</span><span>{formatCurrency(inv.total)}</span></div>
              <div className="flex justify-between text-sm text-emerald-600"><span>Amount Paid</span><span>{formatCurrency(inv.paidAmount)}</span></div>
              {inv.balanceDue > 0 && <div className="flex justify-between font-bold text-red-600 border-t border-slate-200 pt-2"><span>Balance Due</span><span>{formatCurrency(inv.balanceDue)}</span></div>}
            </div>
          </div>

          {/* Payment history */}
          {inv.payments?.length > 0 && (
            <div className="py-5">
              <p className="text-sm font-semibold text-slate-600 mb-3">Payment History</p>
              <div className="space-y-2">
                {inv.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-700">{formatCurrency(p.amount)}</span>
                      <Badge variant="outline" className="capitalize">{p.method.replace(/_/g, " ")}</Badge>
                      {p.transactionRef && <span className="text-slate-400 font-mono text-xs">Ref: {p.transactionRef}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>{p.receivedBy?.firstName} {p.receivedBy?.lastName}</span>
                      <span>{formatDate(p.paidAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inv.notes && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Notes</p>
              <p className="text-sm text-slate-600">{inv.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Record Payment Modal */}
      <Modal open={paymentOpen} onClose={() => { setPaymentOpen(false); reset(); setPaymentError(""); }} title="Record Payment">
        {paymentError && <Alert type="error">{paymentError}</Alert>}
        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-slate-500">Balance due</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(inv.balanceDue)}</p>
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
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setPaymentOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={paymentMutation.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}