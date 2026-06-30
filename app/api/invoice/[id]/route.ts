// app/api/invoice/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Invoice, Medicine } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { updateInvoiceSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "view")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findById(id)
        .populate("patient", "firstName lastName patientId")
        .populate("doctor", "firstName lastName")
        .populate("appointment", "appointmentId scheduledDate scheduledTime consultationFee")
        .populate("items.medicine", "name genericName unit")
        .populate("createdBy", "firstName lastName")
        .populate("payments.receivedBy", "firstName lastName")
        .lean();

    if (!invoice) return apiError("Invoice not found", 404);
    return apiSuccess(invoice);
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "update")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    const invoice = await Invoice.findById(id);
    if (!invoice) return apiError("Invoice not found", 404);

    if (["paid", "cancelled", "refunded"].includes(invoice.status)) {
        return apiError(`Cannot edit — invoice is ${invoice.status}`, 409);
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.items !== undefined) update.items = parsed.data.items;
    if (parsed.data.subtotal !== undefined) update.subtotal = parsed.data.subtotal;
    if (parsed.data.discount !== undefined) update.discount = parsed.data.discount;
    if (parsed.data.discountType !== undefined) update.discountType = parsed.data.discountType;
    if (parsed.data.taxRate !== undefined) update.taxRate = parsed.data.taxRate;
    if (parsed.data.taxAmount !== undefined) update.taxAmount = parsed.data.taxAmount;
    if (parsed.data.total !== undefined) update.total = parsed.data.total;
    if (parsed.data.dueDate !== undefined) update.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

    // Handle payment addition with manual balance/status calculation
    if (parsed.data.payments && parsed.data.payments.length > 0) {
        const newPayments = parsed.data.payments.map(p => ({
            ...p,
            paidAt: new Date(),
        }));
        update.$push = { payments: { $each: newPayments } };

        // Calculate new paid amount
        const additionalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const newPaidAmount = (invoice.paidAmount || 0) + additionalPaid;
        update.paidAmount = newPaidAmount;

        // Use provided total or existing total
        const currentTotal = parsed.data.total !== undefined ? parsed.data.total : invoice.total;
        const newBalance = currentTotal - newPaidAmount;
        update.balanceDue = newBalance;

        // Auto-update status
        if (newBalance <= 0 && currentTotal > 0) {
            update.status = "paid";
        } else if (newPaidAmount > 0 && newBalance > 0) {
            update.status = "partial";
        }
    }

    // Handle manual status override
    if (parsed.data.status !== undefined && !update.status) {
        update.status = parsed.data.status;
    }

    const updated = await Invoice.findByIdAndUpdate(id, update, { new: true })
        .populate("patient", "firstName lastName patientId")
        .populate("doctor", "firstName lastName")
        .populate("items.medicine", "name genericName unit")
        .populate("createdBy", "firstName lastName")
        .populate("payments.receivedBy", "firstName lastName")
        .lean();

    if (!updated) return apiError("Invoice not found", 404);

    const changes: string[] = [];
    if (update.items) changes.push("items updated");
    if (update.total) changes.push(`total: ${update.total}`);
    if (update.status) changes.push(`status: ${update.status}`);
    if (parsed.data.payments) changes.push("payment added");

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "billing",
        description: `Updated invoice: ${updated.invoiceNumber}${changes.length ? ` (${changes.join(", ")})` : ""}`,
        resourceId: id,
        resourceType: "Invoice",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(updated, "Invoice updated");
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "delete")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findById(id);
    if (!invoice) return apiError("Invoice not found", 404);

    // RESTORE STOCK FOR MEDICINE ITEMS BEFORE DELETING
    if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
            // Only restore stock for medicine items
            if (item.medicine && item.category === "medicine") {
                await Medicine.findByIdAndUpdate(item.medicine, {
                    $inc: { currentStock: item.quantity } // Add back the quantity
                });
            }
        }
    }

    const invoiceNumber = invoice.invoiceNumber;
    await Invoice.findByIdAndDelete(id);

    await auditLog({
        userId: session.user.id,
        action: "delete",
        module: "billing",
        description: `Deleted invoice: ${invoiceNumber} (stock restored for medicine items)`,
        resourceId: id,
        resourceType: "Invoice",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(null, "Invoice deleted successfully with stock restored", 200);
}