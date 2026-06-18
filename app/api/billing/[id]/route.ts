import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Invoice } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "view")) return apiError("Forbidden", 403);
  await connectDB();
  const { id } = await params;
  const invoice = await Invoice.findById(id)
    .populate("patient", "firstName lastName patientId phone email address")
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
  const allowed = ["status", "notes", "dueDate", "discount", "discountType"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) update[key] = body[key]; }
  const invoice = await Invoice.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!invoice) return apiError("Invoice not found", 404);
  await auditLog({ userId: session.user.id, action: "update", module: "billing", description: `Updated invoice ${id}`, resourceId: id, ipAddress: getIpFromHeaders(req.headers) });
  return apiSuccess(invoice, "Invoice updated");
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "delete")) return apiError("Forbidden", 403);
  await connectDB();
  const { id } = await params;
  const invoice = await Invoice.findById(id);
  if (!invoice) return apiError("Invoice not found", 404);
  if (invoice.status === "paid") return apiError("Cannot delete a paid invoice", 400);
  await Invoice.findByIdAndUpdate(id, { status: "cancelled" });
  await auditLog({ userId: session.user.id, action: "delete", module: "billing", description: `Cancelled invoice ${invoice.invoiceNumber}`, resourceId: id, ipAddress: getIpFromHeaders(req.headers) });
  return apiSuccess(null, "Invoice cancelled");
}
