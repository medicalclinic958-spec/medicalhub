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
    const body = await req.json();

    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    const expense = await Expense.findById(id);
    if (!expense) return apiError("Expense not found", 404);

    // Don't allow editing rejected expenses
    if (expense.status === "rejected") {
        return apiError("Cannot edit rejected expense", 409);
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.category !== undefined) update.category = parsed.data.category;
    if (parsed.data.amount !== undefined) update.amount = parsed.data.amount;
    if (parsed.data.paymentMethod !== undefined) update.paymentMethod = parsed.data.paymentMethod;
    if (parsed.data.vendor !== undefined) update.vendor = parsed.data.vendor;
    if (parsed.data.receiptUrl !== undefined) update.receiptUrl = parsed.data.receiptUrl;
    if (parsed.data.date !== undefined) update.date = new Date(parsed.data.date);
    if (parsed.data.description !== undefined) update.description = parsed.data.description;

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

    // Only allow deleting pending expenses
    if (expense.status !== "pending") {
        return apiError(`Cannot delete — expense is ${expense.status}`, 409);
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