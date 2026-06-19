// components/expenses/expense-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, TrendingDown, Pencil, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardBody, Badge, Button, Modal, Alert, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { EditExpenseModal } from "./edit-expense-modal";


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
    approvedBy?: { firstName: string; lastName: string };
    createdBy: { firstName: string; lastName: string };
    createdAt: string;
    updatedAt: string;
}

export function ExpenseDetailClient({ expenseId }: { expenseId: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const qc = useQueryClient();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editError, setEditError] = useState("");

    const isSA = session?.user?.isSuperAdmin;
    const perms = session?.user?.permissions || [];
    const canUpdate = isSA || perms.includes("expenses:update");
    const canDelete = isSA || perms.includes("expenses:delete");
    const canApprove = isSA || perms.includes("expenses:update");

    const { data, isLoading } = useQuery({
        queryKey: ["expense", expenseId],
        queryFn: () => axios.get(`/api/expenses/${expenseId}`).then(r => r.data),
    });

    const expense: ExpenseDetail | null = data?.data || null;

    const approveMutation = useMutation({
        mutationFn: () => axios.put(`/api/expenses/${expenseId}`, { status: "approved" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expense", expenseId] });
            qc.invalidateQueries({ queryKey: ["expenses"] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: () => axios.put(`/api/expenses/${expenseId}`, { status: "rejected" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expense", expenseId] });
            qc.invalidateQueries({ queryKey: ["expenses"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/expenses/${expenseId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expenses"] });
            router.push("/dashboard/expenses");
        },
        onError: (e: unknown) => {
            setDeleteError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (d: any) => axios.put(`/api/expenses/${expenseId}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expense", expenseId] });
            qc.invalidateQueries({ queryKey: ["expenses"] });
            setEditOpen(false);
            setEditError("");
        },
        onError: (e: unknown) => setEditError((e as any)?.response?.data?.error || "Failed"),
    });

    if (isLoading) {
        return (
            <div className="space-y-5">
                <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
                <Card><CardBody><div className="h-64 bg-slate-50 rounded animate-pulse" /></CardBody></Card>
            </div>
        );
    }

    if (!expense) {
        return (
            <div className="space-y-5">
                <Button variant="secondary" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Card><CardBody><p className="text-center text-slate-500 py-12">Expense not found</p></CardBody></Card>
            </div>
        );
    }

    const isPending = expense.status === "pending";

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            <h1 className="text-xl font-bold text-slate-800">{expense.title}</h1>
                            <StatusBadge status={expense.status} />
                        </div>
                        <p className="text-sm text-slate-500 capitalize">{expense.category} • {formatDate(expense.date)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canApprove && isPending && (
                        <>
                            <Button variant="secondary" size="sm" className="!bg-green-600 !text-white hover:!bg-green-700" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
                                <CheckCircle className="w-4 h-4" /> Approve
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => rejectMutation.mutate()} loading={rejectMutation.isPending}>
                                <XCircle className="w-4 h-4" /> Reject
                            </Button>
                        </>
                    )}
                    {canUpdate && isPending && (
                        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="w-4 h-4" /> Edit
                        </Button>
                    )}
                    {canDelete && isPending && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                            <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Expense Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Title</span>
                                <span className="text-sm font-medium text-slate-800">{expense.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Category</span>
                                <Badge variant="outline" className="capitalize">{expense.category}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Amount</span>
                                <span className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Payment Method</span>
                                <span className="text-sm font-medium text-slate-800 capitalize">{expense.paymentMethod?.replace(/_/g, " ")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Date</span>
                                <span className="text-sm font-medium text-slate-800">{formatDate(expense.date)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Vendor / Payee</span>
                                <span className="text-sm font-medium text-slate-800">{expense.vendor || "—"}</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Approval & Record</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Status</span>
                                <StatusBadge status={expense.status} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Created By</span>
                                <span className="text-sm font-medium text-slate-800">{expense.createdBy?.firstName} {expense.createdBy?.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Approved By</span>
                                <span className="text-sm font-medium text-slate-800">
                                    {expense.approvedBy ? `${expense.approvedBy.firstName} ${expense.approvedBy.lastName}` : "—"}
                                </span>
                            </div>
                            {expense.receiptUrl && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">Receipt</span>
                                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View Receipt</a>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                {expense.description && (
                    <Card className="col-span-2">
                        <CardBody>
                            <h3 className="text-sm font-semibold text-slate-800 mb-4">Description</h3>
                            <p className="text-sm text-slate-700">{expense.description}</p>
                        </CardBody>
                    </Card>
                )}

                <Card className="col-span-2">
                    <CardBody>
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Record Information</h3>
                        <div className="flex gap-8">
                            <div>
                                <span className="text-sm text-slate-500">Created</span>
                                <p className="text-sm font-medium text-slate-800">{formatDate(expense.createdAt)}</p>
                            </div>
                            <div>
                                <span className="text-sm text-slate-500">Last Updated</span>
                                <p className="text-sm font-medium text-slate-800">{formatDate(expense.updatedAt)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            <Modal open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }} title="Delete Expense" size="sm">
                <div className="space-y-4 mt-2">
                    {deleteError && <Alert type="error">{deleteError}</Alert>}
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Delete permanently?</p>
                            <p className="text-sm text-red-600">
                                This will permanently delete <strong>{expense.title}</strong>. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}>Cancel</Button>
                        <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                            Delete Permanently
                        </Button>
                    </div>
                </div>
            </Modal>

            <EditExpenseModal
                open={editOpen}
                onClose={() => { setEditOpen(false); setEditError(""); }}
                expense={expense}
                onUpdate={(data: any) => updateMutation.mutate(data)}
                isPending={updateMutation.isPending}
                error={editError}
            />
        </div>
    );
}