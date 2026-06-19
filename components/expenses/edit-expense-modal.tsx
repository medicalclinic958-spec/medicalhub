// components/expenses/edit-expense-modal.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, FormField, Input, Select, Button, Alert } from "@/components/ui";
import { updateExpenseSchema, UpdateExpenseInput } from "@/lib/validations";

interface ExpenseDetail {
    _id: string;
    title: string;
    category: string;
    amount: number;
    paymentMethod: string;
    vendor?: string;
    receiptUrl?: string;
    date: string;
    description?: string;
    status: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    expense: ExpenseDetail;
    onUpdate: (data: any) => void;
    isPending: boolean;
    error: string;
}

const CATEGORIES = ["salary", "utility", "purchase", "equipment", "maintenance", "other"];
const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "mobile_wallet"];

export function EditExpenseModal({ open, onClose, expense, onUpdate, isPending, error }: Props) {
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UpdateExpenseInput>({
        resolver: zodResolver(updateExpenseSchema),
    });

    const status = watch("status");

    useEffect(() => {
        if (expense) {
            reset({
                title: expense.title,
                category: expense.category as any,
                amount: expense.amount,
                paymentMethod: expense.paymentMethod as any,
                vendor: expense.vendor || "",
                receiptUrl: expense.receiptUrl || "",
                date: expense.date ? new Date(expense.date).toISOString().split("T")[0] : "",
                description: expense.description || "",
                status: expense.status as any,
            });
        }
    }, [expense, reset]);

    return (
        <Modal open={open} onClose={onClose} title="Edit Expense" size="lg">
            {error && <Alert type="error">{error}</Alert>}
            <form onSubmit={handleSubmit((data) => onUpdate(data))} className="space-y-4 mt-2">
                <FormField label="Title" required error={errors.title?.message}>
                    <Input {...register("title")} error={!!errors.title} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Category" required error={errors.category?.message}>
                        <Select {...register("category")} error={!!errors.category}>
                            <option value="">Select</option>
                            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Date" required error={errors.date?.message}>
                        <Input type="date" {...register("date")} error={!!errors.date} />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Amount (PKR)" required error={errors.amount?.message}>
                        <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} error={!!errors.amount} />
                    </FormField>
                    <FormField label="Payment Method" required error={errors.paymentMethod?.message}>
                        <Select {...register("paymentMethod")} error={!!errors.paymentMethod}>
                            <option value="">Select</option>
                            {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</option>)}
                        </Select>
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Vendor / Payee">
                        <Input {...register("vendor")} placeholder="Optional" />
                    </FormField>
                    <FormField label="Receipt URL">
                        <Input {...register("receiptUrl")} placeholder="Optional link" />
                    </FormField>
                </div>
                <FormField label="Description">
                    <textarea {...register("description")} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </FormField>
                <FormField label="Status">
                    <Select {...register("status")}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </Select>
                </FormField>
                {status === "approved" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-700">Approving this expense will lock it from further edits.</p>
                    </div>
                )}
                {status === "rejected" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">Rejected expenses cannot be edited further.</p>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={isPending}>Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
}