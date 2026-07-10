// components/expenses/edit-expense-modal.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, FormField, Input, Select, Button, Alert } from "@/components/ui";
import { updateExpenseSchema, UpdateExpenseInput } from "@/lib/validations";
import { X, Image as ImageIcon, Download, Eye } from "lucide-react";

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
const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "mobile_wallet", "insurance"];

export function EditExpenseModal({ open, onClose, expense, onUpdate, isPending, error }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [filesToRemove, setFilesToRemove] = useState<number[]>([]);
    const [uploadError, setUploadError] = useState("");

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
                date: expense.date ? new Date(expense.date).toISOString().split("T")[0] : "",
                description: expense.description || "",
                status: expense.status as any,
            });
            setSelectedFiles([]);
            setFilePreviews([]);
            setFilesToRemove([]);
            setUploadError("");
        }
    }, [expense, reset]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        const validFiles = files.filter(file => {
            const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
            const maxSize = 5 * 1024 * 1024;

            if (!validTypes.includes(file.type)) {
                setUploadError(`Invalid file type: "${file.name}". Only images and PDFs are allowed.`);
                return false;
            }
            if (file.size > maxSize) {
                setUploadError(`File too large: "${file.name}". Maximum 5MB allowed.`);
                return false;
            }
            return true;
        });

        if (validFiles.length !== files.length) {
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (validFiles.length === 0) return;

        setSelectedFiles(prev => [...prev, ...validFiles]);

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setFilePreviews(prev => [...prev, e.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeNewFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setFilePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const markForRemoval = (index: number) => {
        setFilesToRemove(prev => [...prev, index]);
    };

    const unmarkForRemoval = (index: number) => {
        setFilesToRemove(prev => prev.filter(i => i !== index));
    };

    const handleSubmitForm = (data: UpdateExpenseInput) => {
        const formData = new FormData();

        if (data.title) formData.append("title", data.title);
        if (data.category) formData.append("category", data.category);
        if (data.amount) formData.append("amount", data.amount.toString());
        if (data.paymentMethod) formData.append("paymentMethod", data.paymentMethod);
        if (data.vendor) formData.append("vendor", data.vendor);
        if (data.date) formData.append("date", data.date);
        if (data.description) formData.append("description", data.description);
        if (data.status) formData.append("status", data.status);

        if (filesToRemove.length > 0) {
            formData.append("removeFiles", JSON.stringify(filesToRemove));
        }

        selectedFiles.forEach(file => formData.append("files", file));

        onUpdate(formData);
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

    const existingFiles = expense.receipts || [];

    return (
        <Modal open={open} onClose={onClose} title="Edit Expense" size="lg">
            {(error || uploadError) && <Alert type="error">{error || uploadError}</Alert>}
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4 mt-2">
                <FormField label="Title" required error={errors.title?.message}>
                    <Input {...register("title")} error={!!errors.title} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <FormField label="Vendor / Payee">
                    <Input {...register("vendor")} placeholder="Optional" />
                </FormField>

                <FormField label="Description">
                    <textarea
                        {...register("description")}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs resize-none focus:outline-none focus:border-teal-600 text-gray-700 placeholder:text-gray-400"
                    />
                </FormField>

                {/* Existing Files */}
                {existingFiles.length > 0 && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                            Current Receipts ({existingFiles.length})
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {existingFiles.map((receipt, index) => {
                                const isMarkedForRemoval = filesToRemove.includes(index);
                                return (
                                    <div key={index} className="relative">
                                        <div className={`w-24 rounded-lg border-2 overflow-hidden bg-gray-50 ${isMarkedForRemoval ? 'border-red-400 opacity-50' : 'border-gray-300'}`}>
                                            <div className="w-24 h-24">
                                                {getFileType(receipt.url) === "image" ? (
                                                    <img src={receipt.url} alt={`Receipt ${index + 1}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                                        <span className="text-xs text-gray-400 text-center break-all">
                                                            {getFileName(receipt.url).slice(0, 15)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-center gap-0.5 bg-gray-100 border-t border-gray-300 py-1">
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(receipt.url, "_blank")}
                                                    className="p-1 rounded bg-teal-600 text-white cursor-pointer"
                                                    title="View"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const link = document.createElement("a");
                                                        link.href = receipt.url;
                                                        link.target = "_blank";
                                                        link.download = getFileName(receipt.url);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                    className="p-1 rounded bg-gray-600 text-white cursor-pointer"
                                                    title="Download"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => isMarkedForRemoval ? unmarkForRemoval(index) : markForRemoval(index)}
                                                    className={`p-1 rounded cursor-pointer ${isMarkedForRemoval ? 'bg-teal-600 text-white' : 'bg-red-500 text-white'}`}
                                                    title={isMarkedForRemoval ? "Undo remove" : "Remove"}
                                                >
                                                    {isMarkedForRemoval ? (
                                                        <span className="text-[10px] font-bold px-0.5">↩</span>
                                                    ) : (
                                                        <X className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        {isMarkedForRemoval && (
                                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                                Remove
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {filesToRemove.length > 0 && (
                            <p className="text-xs text-red-500 mt-2">
                                {filesToRemove.length} file(s) marked for removal
                            </p>
                        )}
                    </div>
                )}

                {/* Add New Files */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                        Add New Receipts / Attachments
                    </label>
                    <div className="flex items-center gap-3">
                        <label className="cursor-pointer">
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-600">Add Files</span>
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
                        <span className="text-xs text-gray-400">Images or PDF (max 5MB each)</span>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-3">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="relative w-20">
                                    <div className="w-20 h-20 rounded-lg border border-gray-300 overflow-hidden bg-gray-50">
                                        {file.type.startsWith("image/") ? (
                                            <img src={filePreviews[index]} alt={file.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs p-2 text-center">
                                                {file.name.split(".").pop()?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeNewFile(index)}
                                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full cursor-pointer"
                                        title="Remove"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    <p className="text-xs text-gray-400 truncate w-20 text-center mt-1">{file.name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <FormField label="Status">
                    <Select {...register("status")}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </Select>
                </FormField>

                {status === "approved" && (
                    <Alert type="success">Approving this expense will lock it from further edits.</Alert>
                )}
                {status === "rejected" && (
                    <Alert type="error">Rejected expenses cannot be edited further.</Alert>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={isPending}>Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
}