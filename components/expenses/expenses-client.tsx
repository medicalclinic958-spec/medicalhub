"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Plus, TrendingDown } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, Button, Modal,
  FormField, Input, Select, EmptyState, Pagination, Badge, Alert, StatCard,
} from "@/components/ui";
import { createExpenseSchema, CreateExpenseInput } from "@/lib/validations";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Expense {
  _id: string; title: string; category: string; amount: number;
  paymentMethod: string; vendor?: string; date: string;
  createdBy: { firstName: string; lastName: string };
}

export function ExpensesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("expenses:create");

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page, category, from, to],
    queryFn: () => axios.get("/api/expenses", { params: { page, limit: 25, category, from, to } }).then(r => r.data),
  });

  const expenses: Expense[] = data?.data?.expenses || [];
  const totalAmount: number = data?.data?.totalAmount || 0;
  const pagination = data?.pagination;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0] },
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateExpenseInput) => axios.post("/api/expenses", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setCreateOpen(false); reset(); setCreateError(""); },
    onError: (e: unknown) => setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"),
  });

  const CATEGORIES = ["salary", "utility", "purchase", "equipment", "maintenance", "other"];
  const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "mobile_wallet"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-500">Track all operational expenses</p>
        </div>
        {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Expense</Button>}
      </div>

      <StatCard title="Total Expenses (Period)" value={formatCurrency(totalAmount)} icon={TrendingDown} color="red" loading={isLoading} />

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3">
            <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="w-36">
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </Select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr><Th>Title</Th><Th>Category</Th><Th>Amount</Th><Th>Method</Th><Th>Vendor</Th><Th>Date</Th><Th>Added By</Th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
            ) : expenses.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="No expenses found" action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Expense</Button> : undefined} /></td></tr>
            ) : expenses.map(e => (
              <tr key={e._id} className="hover:bg-slate-50">
                <Td><div className="font-medium text-slate-800">{e.title}</div></Td>
                <Td><Badge variant="outline" className="capitalize">{e.category}</Badge></Td>
                <Td><span className="font-semibold text-red-600">{formatCurrency(e.amount)}</span></Td>
                <Td className="capitalize text-slate-500">{e.paymentMethod?.replace(/_/g, " ")}</Td>
                <Td className="text-slate-400">{e.vendor || "—"}</Td>
                <Td className="text-slate-400">{formatDate(e.date)}</Td>
                <Td className="text-slate-400">{e.createdBy?.firstName} {e.createdBy?.lastName}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Add Expense">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4 mt-2">
          <FormField label="Title" required error={errors.title?.message}><Input {...register("title")} error={!!errors.title} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required error={errors.category?.message}>
              <Select {...register("category")} error={!!errors.category}>
                <option value="">Select</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Date" required error={errors.date?.message}><Input type="date" {...register("date")} error={!!errors.date} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount (PKR)" required error={errors.amount?.message}><Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} error={!!errors.amount} /></FormField>
            <FormField label="Payment Method" required error={errors.paymentMethod?.message}>
              <Select {...register("paymentMethod")} error={!!errors.paymentMethod}>
                <option value="">Select</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Vendor / Payee" error={errors.vendor?.message}><Input {...register("vendor")} placeholder="Optional" /></FormField>
          <FormField label="Description" error={errors.description?.message}>
            <textarea {...register("description")} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Record Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
