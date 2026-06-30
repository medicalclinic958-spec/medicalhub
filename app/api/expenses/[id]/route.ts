// app/api/expenses/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Expense } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { updateExpenseSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "expenses", "view")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const expense = await Expense.findById(id)
        .populate("createdBy", "firstName lastName")
        .populate("approvedBy", "firstName lastName")
        .lean();

    if (!expense) return apiError("Expense not found", 404);
    return apiSuccess(expense);
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "expenses", "update")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    // Get form data with files
    const formData = await req.formData();

    // Build data object for validation
    const data = {
        title: formData.get("title") as string || undefined,
        category: formData.get("category") as string || undefined,
        amount: formData.get("amount") ? parseFloat(formData.get("amount") as string) : undefined,
        paymentMethod: formData.get("paymentMethod") as string || undefined,
        vendor: formData.get("vendor") as string || undefined,
        date: formData.get("date") as string || undefined,
        description: formData.get("description") as string || undefined,
        status: formData.get("status") as string || undefined,
        approvedBy: formData.get("approvedBy") as string || undefined,
    };

    const parsed = updateExpenseSchema.safeParse(data);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    const expense = await Expense.findById(id);
    if (!expense) return apiError("Expense not found", 404);

    // Don't allow editing rejected expenses
    if (expense.status === "rejected") {
        return apiError("Cannot edit rejected expense", 409);
    }

    // Handle file operations
    const files = formData.getAll("files") as File[];
    const removeFiles = formData.get("removeFiles") as string; // JSON array of indexes to remove

    let currentReceipts = expense.receipts || [];

    // Handle file removals
    if (removeFiles) {
        try {
            const indexesToRemove = JSON.parse(removeFiles) as number[];
            const receiptsToRemove = indexesToRemove.map(i => currentReceipts[i]).filter(Boolean);

            if (receiptsToRemove.length > 0) {
                const { deleteMultipleFiles } = await import("@/lib/cloudinary");
                const publicIds = receiptsToRemove.map(r => r.publicId);
                await deleteMultipleFiles(publicIds);
            }

            currentReceipts = currentReceipts.filter((_, i) => !indexesToRemove.includes(i));
        } catch (error) {
            console.error("Error removing files:", error);
            return apiError("Failed to remove files", 500);
        }
    }

    // Upload new files
    if (files && files.length > 0) {
        try {
            const { uploadMultipleFiles } = await import("@/lib/cloudinary");
            const uploadResults = await uploadMultipleFiles(files, "expenses/receipts");
            const newReceipts = uploadResults.map(r => ({
                url: r.url,
                publicId: r.publicId
            }));
            currentReceipts = [...currentReceipts, ...newReceipts];
        } catch (error) {
            console.error("Upload error:", error);
            return apiError("Failed to upload files", 500);
        }
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.category !== undefined) update.category = parsed.data.category;
    if (parsed.data.amount !== undefined) update.amount = parsed.data.amount;
    if (parsed.data.paymentMethod !== undefined) update.paymentMethod = parsed.data.paymentMethod;
    if (parsed.data.vendor !== undefined) update.vendor = parsed.data.vendor;
    if (parsed.data.date !== undefined) update.date = new Date(parsed.data.date);
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    update.receipts = currentReceipts;

    // Status change with approval tracking
    if (parsed.data.status !== undefined) {
        update.status = parsed.data.status;
        if (parsed.data.status === "approved") {
            update.approvedBy = session.user.id;
        }
    }

    if (parsed.data.approvedBy !== undefined) update.approvedBy = parsed.data.approvedBy;

    const updated = await Expense.findByIdAndUpdate(id, update, { new: true })
        .populate("createdBy", "firstName lastName")
        .populate("approvedBy", "firstName lastName")
        .lean();

    if (!updated) return apiError("Expense not found", 404);

    const changes: string[] = [];
    if (update.amount) changes.push(`amount: ${update.amount}`);
    if (update.status) changes.push(`status: ${update.status}`);
    if (update.category) changes.push("category");

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "expenses",
        description: `Updated expense: ${updated.title}${changes.length ? ` (${changes.join(", ")})` : ""}`,
        resourceId: id,
        resourceType: "Expense",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(updated, "Expense updated");
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "expenses", "delete")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const expense = await Expense.findById(id);
    if (!expense) return apiError("Expense not found", 404);

    // Delete all associated files from Cloudinary using stored publicId
    if (expense.receipts && expense.receipts.length > 0) {
        try {
            const { deleteMultipleFiles } = await import("@/lib/cloudinary");
            const publicIds = expense.receipts.map(r => r.publicId);
            await deleteMultipleFiles(publicIds);
        } catch (error) {
            console.error("Error deleting files from Cloudinary:", error);
            // Continue with deletion even if Cloudinary fails
        }
    }

    const expenseTitle = expense.title;
    await Expense.findByIdAndDelete(id);

    await auditLog({
        userId: session.user.id,
        action: "delete",
        module: "expenses",
        description: `Deleted expense: ${expenseTitle}`,
        resourceId: id,
        resourceType: "Expense",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(null, "Expense deleted", 200);
}