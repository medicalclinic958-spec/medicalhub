// app/api/invoice/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Invoice, Medicine } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createInvoiceSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { NotificationService } from "@/services/notification.service";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "view")) return apiError("Forbidden", 403);
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const { page, limit, skip } = getPaginationParams(sp);
    const search = sp.get("search") || "";
    const invoiceType = sp.get("invoiceType") || "";
    const status = sp.get("status") || "";
    const patientId = sp.get("patient") || "";
    const dateFrom = sp.get("dateFrom") || "";
    const dateTo = sp.get("dateTo") || "";

    const filter: Record<string, unknown> = {};
    if (invoiceType) filter.invoiceType = invoiceType;
    if (status) filter.status = status;
    if (patientId) filter.patient = patientId;
    if (search) filter.$or = [{ invoiceNumber: { $regex: search, $options: "i" } }];
    if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) (filter.createdAt as Record<string, unknown>).$gte = new Date(dateFrom);
        if (dateTo) (filter.createdAt as Record<string, unknown>).$lte = new Date(dateTo);
    }

    const [invoices, total] = await Promise.all([
        Invoice.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("patient", "firstName lastName patientId")
            .populate("doctor", "firstName lastName")
            .populate("supplier", "name")
            .populate("appointment", "appointmentId")
            .populate("createdBy", "firstName lastName")
            .lean(),
        Invoice.countDocuments(filter),
    ]);

    return apiSuccess(invoices, "Invoices fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "create")) return apiError("Forbidden", 403);

    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    await connectDB();

    // Clean empty string fields to prevent ObjectId cast errors
    const cleanData = { ...parsed.data };
    if (cleanData.patient === "" || cleanData.patient === null) delete cleanData.patient;
    if (cleanData.supplier === "" || cleanData.supplier === null) delete cleanData.supplier;
    if (cleanData.doctor === "" || cleanData.doctor === null) delete cleanData.doctor;
    if (cleanData.appointment === "" || cleanData.appointment === null) delete cleanData.appointment;

    const invoiceData = {
        ...cleanData,
        createdBy: session.user.id,
        balanceDue: cleanData.total - (cleanData.paidAmount || 0),
    };

    const invoice = await Invoice.create(invoiceData);

    if (invoiceData.items) {
        for (const item of invoiceData.items) {
            if (item.medicine && item.category === "medicine") {
                await Medicine.findByIdAndUpdate(item.medicine, {
                    $inc: { currentStock: -item.quantity }
                });
            }
        }
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
        .populate("patient", "firstName lastName patientId")
        .populate("doctor", "firstName lastName")
        .populate("supplier", "name")
        .populate("createdBy", "firstName lastName")
        .lean();

    await auditLog({
        userId: session.user.id,
        action: "create",
        module: "billing",
        description: `Created invoice: ${invoice.invoiceNumber} (${invoice.invoiceType})`,
        resourceId: invoice._id.toString(),
        resourceType: "Invoice",
        ipAddress: getIpFromHeaders(req.headers),
    });

    if (invoice.invoiceType === "pharmacy_purchase") {
        const { User } = await import("@/models/user.model");
        const adminUsers = await User.find({
            $or: [
                { isSuperAdmin: true },
                { permissions: { $in: ["billing:view"] } }
            ]
        }).select("_id").lean();

        const userIds = adminUsers.map(u => u._id.toString());
        if (userIds.length > 0) {
            await NotificationService.createBulk(userIds, {
                type: "pending_payment",
                title: "New Purchase Invoice",
                message: `Purchase invoice ${invoice.invoiceNumber} created for ${formatCurrency(invoice.total)}`,
                priority: "medium",
                actionUrl: `/billing/${invoice._id}`,
                metadata: { invoiceId: invoice._id.toString() },
            });
        }
    }

    return apiSuccess(populatedInvoice, "Invoice created", 201);
}