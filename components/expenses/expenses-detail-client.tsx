// components/expenses/expense-detail-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, TrendingDown, Pencil, Trash2, CheckCircle, XCircle, Download, Image as ImageIcon, File, Eye } from "lucide-react";
import { Card, CardBody, Badge, Button, Modal, Alert, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { EditExpenseModal } from "./edit-expense-modal";

interface ExpenseDetail {
    _id: string;
    title: string;
    category: string;
    amount: number;
    paymentMethod: string;
    vendor?: string;
    receipts?: Array<{ url: string; publicId: string }>;
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
            toast.success("Expense approved!");
        },
        onError: () => toast.error("Failed to approve expense."),
    });

    const rejectMutation = useMutation({
        mutationFn: () => axios.put(`/api/expenses/${expenseId}`, { status: "rejected" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expense", expenseId] });
            qc.invalidateQueries({ queryKey: ["expenses"] });
            toast.success("Expense rejected.");
        },
        onError: () => toast.error("Failed to reject expense."),
    });

    const deleteMutation = useMutation({
        mutationFn: () => axios.delete(`/api/expenses/${expenseId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expenses"] });
            toast.success("Expense deleted successfully!");
            router.push("/expenses");
        },
        onError: (e: unknown) => {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to delete";
            setDeleteError(msg);
            toast.error(msg);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (d: any) => axios.put(`/api/expenses/${expenseId}`, d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["expense", expenseId] });
            qc.invalidateQueries({ queryKey: ["expenses"] });
            setEditOpen(false);
            setEditError("");
            toast.success("Expense updated successfully!");
        },
        onError: (e: unknown) => {
            const msg = (e as any)?.response?.data?.error || "Failed";
            setEditError(msg);
            toast.error(msg);
        },
    });

    const handleDownload = (url: string, filename?: string) => {
        if (!filename) {
            const parts = url.split("/");
            filename = parts[parts.length - 1] || "receipt";
        }
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getFileType = (url: string) => {
        const extension = url.split(".").pop()?.toLowerCase() || "";
        if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "image";
        if (["pdf"].includes(extension)) return "pdf";
        return "file";
    };

    const getFileName = (url: string) => {
        const parts = url.split("/");
        return parts[parts.length - 1] || "receipt";
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-100 rounded w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}><CardBody><div className="h-40 bg-gray-50 rounded" /></CardBody></Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!expense) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <Card>
                    <CardBody>
                        <p className="text-center text-gray-400 py-12 text-xs">Expense not found</p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    const isPending = expense.status === "pending";

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-pointer shrink-0 mt-0.5"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
                            <h1 className="text-lg font-semibold text-gray-900 truncate">{expense.title}</h1>
                            <StatusBadge status={expense.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{expense.category} • {formatDate(expense.date)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {canApprove && isPending && (
                        <>
                            <Button size="sm" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => rejectMutation.mutate()} loading={rejectMutation.isPending}>
                                <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                        </>
                    )}
                    {canUpdate && (
                        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expense Details */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Expense Details</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Title" value={expense.title} />
                            <Row label="Category">
                                <Badge variant="outline" className="capitalize">{expense.category}</Badge>
                            </Row>
                            <Row label="Amount">
                                <span className="text-lg font-bold text-red-500">{formatCurrency(expense.amount)}</span>
                            </Row>
                            <Row label="Payment Method">
                                <span className="capitalize">{expense.paymentMethod?.replace(/_/g, " ")}</span>
                            </Row>
                            <Row label="Date" value={formatDate(expense.date)} />
                            <Row label="Vendor / Payee" value={expense.vendor || "—"} />
                        </div>
                    </CardBody>
                </Card>

                {/* Approval & Record */}
                <Card>
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-gray-400" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Approval & Record</h3>
                        </div>
                        <div className="space-y-2.5">
                            <Row label="Status">
                                <StatusBadge status={expense.status} />
                            </Row>
                            <Row label="Created By" value={`${expense.createdBy?.firstName} ${expense.createdBy?.lastName}`} />
                            <Row label="Approved By">
                                {expense.approvedBy ? (
                                    <span>{expense.approvedBy.firstName} {expense.approvedBy.lastName}</span>
                                ) : (
                                    <span className="text-gray-300">—</span>
                                )}
                            </Row>
                        </div>
                    </CardBody>
                </Card>

                {/* Receipts */}
                {expense.receipts && expense.receipts.length > 0 && (
                    <Card className="sm:col-span-2">
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-gray-400" />
                                </div>
                                <h3 className="text-xs font-semibold text-gray-900">
                                    Receipts & Attachments ({expense.receipts.length})
                                </h3>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {expense.receipts.map((receipt, index) => (
                                    <div key={index} className="w-32 rounded-lg border border-gray-300 overflow-hidden bg-gray-50">
                                        <div className="w-32 h-32">
                                            {getFileType(receipt.url) === "image" ? (
                                                <img
                                                    src={receipt.url}
                                                    alt={`Receipt ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                                    <File className="w-6 h-6 text-red-400" />
                                                    <span className="text-xs text-gray-400 mt-2 text-center break-all">
                                                        {getFileName(receipt.url).slice(0, 15)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center gap-1 bg-gray-100 border-t border-gray-300 py-1.5">
                                            <button
                                                onClick={() => window.open(receipt.url, "_blank")}
                                                className="p-1.5 rounded bg-teal-600 text-white cursor-pointer"
                                                title="View"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(receipt.url, `${expense.title}-receipt-${index + 1}`)}
                                                className="p-1.5 rounded bg-gray-600 text-white cursor-pointer"
                                                title="Download"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Description */}
                {expense.description && (
                    <Card className="sm:col-span-2">
                        <CardBody>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Pencil className="w-4 h-4 text-gray-400" />
                                </div>
                                <h3 className="text-xs font-semibold text-gray-900">Description</h3>
                            </div>
                            <p className="text-xs text-gray-600">{expense.description}</p>
                        </CardBody>
                    </Card>
                )}

                {/* Record Info */}
                <Card className="sm:col-span-2">
                    <CardBody>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-gray-400" />
                            </div>
                            <h3 className="text-xs font-semibold text-gray-900">Record Information</h3>
                        </div>
                        <div className="flex gap-6 sm:gap-10">
                            <div>
                                <p className="text-xs text-gray-400">Created</p>
                                <p className="text-xs text-gray-700 mt-0.5">{formatDate(expense.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Last Updated</p>
                                <p className="text-xs text-gray-700 mt-0.5">{formatDate(expense.updatedAt)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Delete Modal */}
            <Modal
                open={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}
                title="Delete Expense"
                size="sm"
            >
                <div className="space-y-4 mt-2">
                    {deleteError && <Alert type="error">{deleteError}</Alert>}
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-red-800">Delete permanently?</p>
                            <p className="text-xs text-red-600 mt-0.5">
                                This will permanently delete <strong>{expense.title}</strong>. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                        <Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeleteError(""); }}>
                            Cancel
                        </Button>
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

// --- Reusable row component ---
function Row({ label, value, children }: {
    label: string;
    value?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 shrink-0">{label}</span>
            {children ? (
                <span className="text-xs text-right">{children}</span>
            ) : (
                <span className="text-xs text-gray-700 text-right truncate">{value}</span>
            )}
        </div>
    );
}