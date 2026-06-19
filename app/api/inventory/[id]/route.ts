// app/api/inventory/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { InventoryItem } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { z } from "zod";

const updateInventorySchema = z.object({
    name: z.string().min(1).optional(),
    category: z.enum(["equipment", "supply", "consumable"]).optional(),
    sku: z.string().optional(),
    currentQuantity: z.number().min(0).optional(),
    minQuantity: z.number().min(0).optional(),
    unit: z.string().min(1).optional(),
    unitCost: z.number().min(0).optional(),
    location: z.string().optional(),
    supplier: z.string().optional(),
    isActive: z.boolean().optional(),
});

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "inventory", "view")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const item = await InventoryItem.findById(id)
        .populate("supplier", "name phone email")
        .lean();

    if (!item) return apiError("Inventory item not found", 404);
    return apiSuccess(item);
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "inventory", "update")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const parsed = updateInventorySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    const item = await InventoryItem.findById(id);
    if (!item) return apiError("Inventory item not found", 404);

    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.category !== undefined) update.category = parsed.data.category;
    if (parsed.data.sku !== undefined) {
        if (parsed.data.sku === "" || parsed.data.sku === null) {
            update.$unset = { sku: "" };
        } else {
            update.sku = parsed.data.sku;
        }
    }
    if (parsed.data.currentQuantity !== undefined) update.currentQuantity = parsed.data.currentQuantity;
    if (parsed.data.minQuantity !== undefined) update.minQuantity = parsed.data.minQuantity;
    if (parsed.data.unit !== undefined) update.unit = parsed.data.unit;
    if (parsed.data.unitCost !== undefined) update.unitCost = parsed.data.unitCost;
    if (parsed.data.location !== undefined) update.location = parsed.data.location;
    if (parsed.data.supplier !== undefined) update.supplier = parsed.data.supplier || null;
    if (parsed.data.isActive !== undefined) update.isActive = parsed.data.isActive;

    const updated = await InventoryItem.findByIdAndUpdate(id, update, { new: true })
        .populate("supplier", "name phone email")
        .lean();

    if (!updated) return apiError("Inventory item not found", 404);

    const changes: string[] = [];
    if (update.name) changes.push("name");
    if (update.currentQuantity !== undefined) changes.push(`qty: ${item.currentQuantity} → ${update.currentQuantity}`);
    if (update.isActive !== undefined) changes.push(`status: ${update.isActive ? "active" : "inactive"}`);

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "inventory",
        description: `Updated inventory: ${updated.name}${changes.length ? ` (${changes.join(", ")})` : ""}`,
        resourceId: id,
        resourceType: "InventoryItem",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(updated, "Inventory item updated");
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "inventory", "delete")) return apiError("Forbidden", 403);

    await connectDB();
    const { id } = await params;

    const item = await InventoryItem.findById(id);
    if (!item) return apiError("Inventory item not found", 404);

    const itemName = item.name;
    await InventoryItem.findByIdAndDelete(id);

    await auditLog({
        userId: session.user.id,
        action: "delete",
        module: "inventory",
        description: `Deleted inventory: ${itemName}`,
        resourceId: id,
        resourceType: "InventoryItem",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(null, "Inventory item deleted", 200);
}