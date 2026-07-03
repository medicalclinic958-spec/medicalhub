"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, TrendingDown, Eye, X, Image as ImageIcon } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, Button, Modal,
  FormField, Input, Select, EmptyState, Pagination, Badge, Alert, StatCard, StatusBadge,
} from "@/components/ui";
import { createExpenseSchema, CreateExpenseInput } from "@/lib/validations";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Expense {
  _id: string; title: string; category: string; amount: number;
  paymentMethod: string; vendor?: string; date: string; status: string;
  receiptUrls?: string[];
  createdBy: { firstName: string; lastName: string };
}

export function ExpensesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("expenses:create");

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page, category, status, from, to],
    queryFn: () => axios.get("/api/expenses", { params: { page, limit: 25, category, status, from, to } }).then(r => r.data),
  });

  const expenses: Expense[] = data?.data?.expenses || [];
  const totalAmount: number = data?.data?.totalAmount || 0;
  const pagination = data?.pagination;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0] },
  });

  const createMutation = useMutation({
    mutationFn: async (d: CreateExpenseInput) => {
      const formData = new FormData();
      formData.append("title", d.title);
      formData.append("category", d.category);
      formData.append("amount", d.amount.toString());
      formData.append("paymentMethod", d.paymentMethod);
      if (d.vendor) formData.append("vendor", d.vendor);
      formData.append("date", d.date);
      if (d.description) formData.append("description", d.description);
      selectedFiles.forEach(file => formData.append("files", file));

      return axios.post("/api/expenses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setCreateOpen(false);
      reset();
      setSelectedFiles([]);
      setFilePreviews([]);
      setCreateError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (e: unknown) => {
      setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create expense");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (!validTypes.includes(file.type)) {
        setCreateError(`Invalid file type: ${file.name}. Only images and PDFs allowed`);
        return false;
      }
      if (file.size > maxSize) {
        setCreateError(`File too large: ${file.name}. Max 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length !== files.length) {
      // Error already set above
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Create previews for images
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow selecting same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const CATEGORIES = ["salary", "utility", "purchase", "equipment", "maintenance", "other"];
  const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "mobile_wallet", "insurance"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-500">Track all operational expenses</p>
        </div>
        {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Expense</Button>}
      </div>

      <StatCard title="Total Expenses (Period)" value={formatCurrency(totalAmount)} icon={TrendingDown} loading={isLoading} />

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="w-36">
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </Select>
            <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-36">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr><Th>Title</Th><Th>Category</Th><Th>Amount</Th><Th>Method</Th><Th>Vendor</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
            ) : expenses.length === 0 ? (
              <tr><td colSpan={8}><EmptyState title="No expenses found" action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Expense</Button> : undefined} /></td></tr>
            ) : expenses.map(e => (
              <tr key={e._id} className="hover:bg-slate-50">
                <Td><div className="font-medium text-slate-800">{e.title}</div></Td>
                <Td><Badge variant="outline" className="capitalize">{e.category}</Badge></Td>
                <Td><span className="font-semibold text-red-600">{formatCurrency(e.amount)}</span></Td>
                <Td className="capitalize text-slate-500">{e.paymentMethod?.replace(/_/g, " ")}</Td>
                <Td className="text-slate-400">{e.vendor || "—"}</Td>
                <Td><StatusBadge status={e.status} /></Td>
                <Td className="text-slate-400">{formatDate(e.date)}</Td>
                <Td>
                  <button onClick={() => router.push(`/expenses/${e._id}`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </Td>
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

      <Modal open={createOpen} onClose={() => {
        setCreateOpen(false);
        reset();
        setSelectedFiles([]);
        setFilePreviews([]);
        setCreateError("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }} title="Add Expense" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4 mt-2">
          <FormField label="Title" required error={errors.title?.message}>
            <Input {...register("title")} error={!!errors.title} placeholder="e.g. Office electricity bill" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required error={errors.category?.message}>
              <Select {...register("category")} error={!!errors.category}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Date" required error={errors.date?.message}>
              <Input type="date" {...register("date")} error={!!errors.date} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount (PKR)" required error={errors.amount?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
                error={!!errors.amount}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Payment Method" required error={errors.paymentMethod?.message}>
              <Select {...register("paymentMethod")} error={!!errors.paymentMethod}>
                <option value="">Select method</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</option>)}
              </Select>
            </FormField>
          </div>

          <FormField label="Vendor / Payee" error={errors.vendor?.message}>
            <Input {...register("vendor")} placeholder="Optional vendor name" />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <textarea
              {...register("description")}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </FormField>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Receipts / Attachments
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Add Files</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-400">Images or PDF (max 5MB each)</span>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative w-20">
                    <div className="w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                      {file.type.startsWith("image/") ? (
                        <img
                          src={filePreviews[index]}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs p-2 text-center">
                          {file.name.split(".").pop()?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 active:bg-red-700 transition-colors shadow-sm"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-slate-400 truncate w-20 text-center mt-1">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                reset();
                setSelectedFiles([]);
                setFilePreviews([]);
                setCreateError("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending}
            >
              Record Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}