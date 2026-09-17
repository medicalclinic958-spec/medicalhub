// components/pharmacy/pharmacy-loans-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { HandCoins, Search } from "lucide-react";
import {
  Card, Table, Th, Td, StatusBadge,
  Button, Modal, FormField, Input, Select, EmptyState,
  Pagination, Badge, Alert,
} from "@/components/ui";
import { addPaymentSchema } from "@/lib/validations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { z } from "zod";

type PaymentInput = z.infer<typeof addPaymentSchema>;

interface LoanInvoice {
  _id: string;
  invoiceNumber: string;
  patient?: { _id: string; firstName: string; lastName: string; patientId: string; phone?: string };
  patientName?: string;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  dueDate?: string;
  createdAt: string;
}

// Pharmacy "loans" are simply pharmacy_sale invoices that were sold on
// credit (unpaid / partially paid) — this view surfaces only those so
// staff can chase and record repayments without digging through Billing.
export function PharmacyLoansClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState("");
  const [activeInvoice, setActiveInvoice] = useState<LoanInvoice | null>(null);

  const perms = session?.user.permissions || [];
  const isSA = session?.user.isSuperAdmin;
  const canUpdate = isSA || perms.includes("billing:update");

  const { data, isLoading } = useQuery({
    queryKey: ["pharmacy-loans", page, search],
    queryFn: () =>
      axios
        .get("/api/invoice", {
          params: { invoiceType: "pharmacy_sale", dueOnly: "true", page, limit: 20, search: search || undefined },
        })
        .then((r) => r.data),
  });

  const loans: LoanInvoice[] = data?.data || [];
  const pagination = data?.pagination;
  const totalOutstanding = loans.reduce((sum, l) => sum + (l.balanceDue || 0), 0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentInput>({ resolver: zodResolver(addPaymentSchema) });

  const paymentMutation = useMutation({
    mutationFn: (d: PaymentInput) =>
      axios.put(`/api/invoice/${activeInvoice?._id}`, {
        payments: [{
          amount: d.amount,
          method: d.method,
          transactionRef: d.transactionRef || undefined,
          receivedBy: session?.user.id,
          notes: d.notes || undefined,
        }],
        paidAmount: (activeInvoice?.paidAmount || 0) + d.amount,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy-loans"] });
      setPayOpen(false);
      setActiveInvoice(null);
      reset();
      setPayError("");
      toast.success("Payment recorded successfully!");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Payment failed";
      setPayError(msg);
      toast.error(msg);
    },
  });

  const openPayment = (loan: LoanInvoice) => {
    setActiveInvoice(loan);
    setPayError("");
    reset();
    setPayOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Pharmacy Loans</h1>
          <p className="text-xs text-gray-500 mt-0.5">Medicine sold on credit — unpaid or partially paid pharmacy invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-gray-400">Open credit sales</p>
          <p className="text-lg font-semibold text-gray-900">{pagination?.total ?? loans.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400">Total outstanding (this page)</p>
          <p className="text-lg font-semibold text-red-500">{formatCurrency(totalOutstanding)}</p>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by patient name, invoice #..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 bg-white placeholder:text-gray-400 text-gray-600 focus:outline-none focus:border-teal-600"
        />
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Invoice #</Th>
              <Th>Patient</Th>
              <Th>Total</Th>
              <Th>Paid</Th>
              <Th>Due</Th>
              <Th>Due Date</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : loans.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="No pharmacy loans"
                    description="No unpaid or partially paid pharmacy sales right now."
                    action={<HandCoins className="w-6 h-6 text-gray-300" />}
                  />
                </td>
              </tr>
            ) : (
              loans.map((l) => (
                <tr key={l._id}>
                  <Td>
                    <Link href={`/billing/${l._id}`} className="font-medium text-teal-700">{l.invoiceNumber}</Link>
                  </Td>
                  <Td>
                    {l.patient ? `${l.patient.firstName} ${l.patient.lastName}` : (l.patientName || "—")}
                  </Td>
                  <Td className="text-gray-600">{formatCurrency(l.total)}</Td>
                  <Td className="text-gray-600">{formatCurrency(l.paidAmount)}</Td>
                  <Td className="font-medium text-red-500">{formatCurrency(l.balanceDue)}</Td>
                  <Td className="text-gray-500">{l.dueDate ? formatDate(l.dueDate) : "—"}</Td>
                  <Td><StatusBadge status={l.status} /></Td>
                  <Td>
                    {canUpdate ? (
                      <Button size="sm" onClick={() => openPayment(l)}>Record Payment</Button>
                    ) : (
                      <Badge variant="outline">View only</Badge>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-300 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Record Payment Modal */}
      <Modal
        open={payOpen}
        onClose={() => { setPayOpen(false); setActiveInvoice(null); reset(); setPayError(""); }}
        title="Record Payment"
        size="sm"
      >
        {payError && <Alert type="error">{payError}</Alert>}
        {activeInvoice && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
            <p className="text-xs text-gray-400">{activeInvoice.invoiceNumber} — Balance due</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(activeInvoice.balanceDue)}</p>
          </div>
        )}
        <form onSubmit={handleSubmit((d) => paymentMutation.mutate(d))} className="space-y-4">
          <FormField label="Amount" required error={errors.amount?.message}>
            <Input
              type="number"
              step="0.01"
              max={activeInvoice?.balanceDue}
              {...register("amount", { valueAsNumber: true })}
              error={!!errors.amount}
              placeholder={activeInvoice ? String(activeInvoice.balanceDue) : ""}
            />
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
          <FormField label="Transaction Reference"><Input {...register("transactionRef")} placeholder="Optional ref / receipt number" /></FormField>
          <FormField label="Notes"><Input {...register("notes")} placeholder="Optional" /></FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <Button type="button" variant="secondary" onClick={() => { setPayOpen(false); setActiveInvoice(null); reset(); }}>Cancel</Button>
            <Button type="submit" loading={paymentMutation.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
