// app/api/pharmacy/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Medicine } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { updateMedicineSchema } from "@/lib/validations";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "view")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const medicine = await Medicine.findById(id)
        .populate("supplier", "name contactPerson phone email")
        .lean();

    if (!medicine) return apiError("Medicine not found", 404);
    return apiSuccess(medicine);
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "update")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const parsed = updateMedicineSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    const medicine = await Medicine.findById(id);
    if (!medicine) return apiError("Medicine not found", 404);

    // Build update object from parsed data
    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.genericName !== undefined) update.genericName = parsed.data.genericName;
    if (parsed.data.category !== undefined) update.category = parsed.data.category;
    if (parsed.data.manufacturer !== undefined) update.manufacturer = parsed.data.manufacturer;
    if (parsed.data.unit !== undefined) update.unit = parsed.data.unit;
    if (parsed.data.currentStock !== undefined) update.currentStock = parsed.data.currentStock;
    if (parsed.data.minStockLevel !== undefined) update.minStockLevel = parsed.data.minStockLevel;
    if (parsed.data.unitCost !== undefined) update.unitCost = parsed.data.unitCost;
    if (parsed.data.sellingPrice !== undefined) update.sellingPrice = parsed.data.sellingPrice;
    if (parsed.data.batchNumber !== undefined) update.batchNumber = parsed.data.batchNumber;
    if (parsed.data.expiryDate !== undefined) update.expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null;
    if (parsed.data.supplier !== undefined) update.supplier = parsed.data.supplier || null;
    if (parsed.data.storageCondition !== undefined) update.storageCondition = parsed.data.storageCondition;
    if (parsed.data.storageLocation !== undefined) update.storageLocation = parsed.data.storageLocation;
    if (parsed.data.isActive !== undefined) update.isActive = parsed.data.isActive;

    const updated = await Medicine.findByIdAndUpdate(id, update, { new: true })
        .populate("supplier", "name contactPerson phone email")
        .lean();

    if (!updated) return apiError("Medicine not found", 404);

    // Track changes for audit
    const changes: string[] = [];
    if (update.name) changes.push("name");
    if (update.currentStock !== undefined) changes.push(`stock: ${medicine.currentStock} → ${update.currentStock}`);
    if (update.sellingPrice !== undefined) changes.push(`price: ${medicine.sellingPrice} → ${update.sellingPrice}`);
    if (update.isActive !== undefined) changes.push(`status: ${update.isActive ? "active" : "inactive"}`);
    if (update.expiryDate !== undefined) changes.push("expiry date");
    if (update.storageCondition !== undefined) changes.push("storage condition");
    if (update.storageLocation !== undefined) changes.push("storage location");

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "pharmacy",
        description: `Updated medicine: ${updated.name}${changes.length ? ` (${changes.join(", ")})` : ""}`,
        resourceId: id,
        resourceType: "Medicine",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(updated, "Medicine updated");
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "pharmacy", "delete")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const medicine = await Medicine.findById(id);
    if (!medicine) return apiError("Medicine not found", 404);

    const medicineName = medicine.name;
    await Medicine.findByIdAndDelete(id);

    await auditLog({
        userId: session.user.id,
        action: "delete",
        module: "pharmacy",
        description: `Deleted medicine: ${medicineName}`,
        resourceId: id,
        resourceType: "Medicine",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(null, "Medicine deleted", 200);
}