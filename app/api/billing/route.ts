import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Invoice, LabTest } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createInvoiceSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "view")) {
    return apiError("Forbidden", 403);
  }

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const status = sp.get("status") || "";
  const patientId = sp.get("patient") || "";

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (patientId) filter.patient = patientId;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("patient", "firstName lastName patientId phone")
      .populate("createdBy", "firstName lastName")
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return apiSuccess(invoices, "Invoices fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "create")) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await connectDB();

  // Calculate totals
  const items = parsed.data.items.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  let discountAmount = parsed.data.discount || 0;
  if (parsed.data.discountType === "percentage") {
    discountAmount = (subtotal * discountAmount) / 100;
  }
  const taxAmount = parsed.data.tax || 0;
  const total = subtotal - discountAmount + taxAmount;

  // Create invoice
  const invoice = await Invoice.create({
    ...parsed.data,
    items,
    subtotal,
    total,
    balanceDue: total,
    paidAmount: 0,
    createdBy: session.user.id,
  });

  // --- LAB LOGIC: Only mark existing lab orders as paid ---
  if (invoice.invoiceType === "lab" && invoice.status === "paid") {
    const existingOrders = invoice.items.filter(item => item.labOrderId);
    
    if (existingOrders.length > 0) {
      await LabTest.updateMany(
        { _id: { $in: existingOrders.map(i => i.labOrderId) } },
        { 
          isPaid: true, 
          invoiceId: invoice._id 
        }
      );
    }
  }

  const populated = await Invoice.findById(invoice._id)
    .populate("patient", "firstName lastName patientId")
    .lean();

  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "billing",
    description: `Created ${invoice.invoiceType} invoice ${invoice.invoiceNumber} for amount ${total}`,
    resourceId: invoice._id.toString(),
    resourceType: "Invoice",
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess(populated, "Invoice created successfully", 201);
}