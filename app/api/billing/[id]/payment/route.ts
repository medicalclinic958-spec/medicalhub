import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Invoice } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { addPaymentSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "view")) {
    return apiError("Forbidden", 403);
  }
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

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "billing", "update")) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = addPaymentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await connectDB();
  const { id } = await params;

  const invoice = await Invoice.findById(id);
  if (!invoice) return apiError("Invoice not found", 404);
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return apiError("Cannot add payment to this invoice", 400);
  }

  const newPaidAmount = invoice.paidAmount + parsed.data.amount;
  if (newPaidAmount > invoice.total) {
    return apiError(`Payment exceeds balance due (${invoice.balanceDue})`, 400);
  }

  let newStatus = invoice.status;
  if (newPaidAmount >= invoice.total) {
    newStatus = "paid";
  } else if (newPaidAmount > 0) {
    newStatus = "partial";
  }

  const updated = await Invoice.findByIdAndUpdate(
    id,
    {
      $push: {
        payments: {
          ...parsed.data,
          paidAt: new Date(),
          receivedBy: session.user.id,
        },
      },
      paidAmount: newPaidAmount,
      balanceDue: invoice.total - newPaidAmount,
      status: newStatus,
    },
    { new: true }
  )
    .populate("patient", "firstName lastName patientId")
    .lean();

  await auditLog({
    userId: session.user.id,
    action: "update",
    module: "billing",
    description: `Payment of ${parsed.data.amount} added to invoice ${invoice.invoiceNumber}`,
    resourceId: id,
    resourceType: "Invoice",
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess(updated, "Payment recorded successfully");
}
