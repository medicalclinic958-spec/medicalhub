// app/api/suppliers/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Supplier } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { updateSupplierSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "view")) return apiError("Forbidden", 403);
    await connectDB();
    const { id } = await params;
    const supplier = await Supplier.findById(id).lean();
    if (!supplier) return apiError("Supplier not found", 404);
    return apiSuccess(supplier);
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "update")) return apiError("Forbidden", 403);
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSupplierSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
    const supplier = await Supplier.findById(id);
    if (!supplier) return apiError("Supplier not found", 404);
    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.type !== undefined) update.type = parsed.data.type;
    if (parsed.data.contactPerson !== undefined) update.contactPerson = parsed.data.contactPerson;
    if (parsed.data.phone !== undefined) update.phone = parsed.data.phone;
    if (parsed.data.alternatePhone !== undefined) update.alternatePhone = parsed.data.alternatePhone;
    if (parsed.data.email !== undefined) update.email = parsed.data.email;
    if (parsed.data.address !== undefined) update.address = parsed.data.address;
    if (parsed.data.taxId !== undefined) update.taxId = parsed.data.taxId;
    if (parsed.data.licenseNumber !== undefined) update.licenseNumber = parsed.data.licenseNumber;
    if (parsed.data.website !== undefined) update.website = parsed.data.website;
    if (parsed.data.paymentTerms !== undefined) update.paymentTerms = parsed.data.paymentTerms;
    if (parsed.data.bankName !== undefined) update.bankName = parsed.data.bankName;
    if (parsed.data.accountNumber !== undefined) update.accountNumber = parsed.data.accountNumber;
    if (parsed.data.categories !== undefined) update.categories = parsed.data.categories;
    if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;
    if (parsed.data.isActive !== undefined) update.isActive = parsed.data.isActive;
    const updated = await Supplier.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) return apiError("Supplier not found", 404);
    const changes: string[] = [];
    if (update.name) changes.push("name");
    if (update.phone) changes.push("phone");
    if (update.isActive !== undefined) changes.push(`status: ${update.isActive ? "active" : "inactive"}`);
    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "pharmacy",
        description: `Updated supplier: ${updated.name}${changes.length ? ` (${changes.join(", ")})` : ""}`,
        resourceId: id,
        resourceType: "Supplier",
        ipAddress: getIpFromHeaders(req.headers),
    });
    return apiSuccess(updated, "Supplier updated");
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "delete")) return apiError("Forbidden", 403);
    await connectDB();
    const { id } = await params;
    const supplier = await Supplier.findById(id);
    if (!supplier) return apiError("Supplier not found", 404);
    await Supplier.findByIdAndDelete(id);
    await auditLog({
        userId: session.user.id,
        action: "delete",
        module: "pharmacy",
        description: `Deleted supplier: ${supplier.name}`,
        resourceId: id,
        resourceType: "Supplier",
        ipAddress: getIpFromHeaders(req.headers),
    });
    return apiSuccess(null, "Supplier deleted", 200);
}