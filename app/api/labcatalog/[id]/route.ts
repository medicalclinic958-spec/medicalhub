// app/api/labcatalog/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { LabCatalog } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { updateLabCatalogSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params {
    params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "labcatalog", "view")) {
        return apiError("Forbidden", 403);
    }

    await connectDB();
    const { id } = await params;

    const test = await LabCatalog.findById(id).lean();
    if (!test) return apiError("Lab test not found", 404);

    return apiSuccess(test, "Lab test fetched", 200);
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "labcatalog", "update")) {
        return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const parsed = updateLabCatalogSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    await connectDB();
    const { id } = await params;

    // If testCode is being updated, check for duplicates
    if (parsed.data.testCode) {
        const duplicate = await LabCatalog.findOne({
            testCode: parsed.data.testCode.toUpperCase(),
            _id: { $ne: id },
        });
        if (duplicate) return apiError("Test code already exists", 409);
    }

    // ✅ If parameters are being updated, check for duplicate parameter names
    if (parsed.data.parameters !== undefined) {
        const paramNames = parsed.data.parameters.map(p => p.name.trim().toLowerCase());
        if (new Set(paramNames).size !== paramNames.length) {
            return apiError("Duplicate parameter names are not allowed", 422);
        }
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.testCode) {
        updateData.testCode = parsed.data.testCode.toUpperCase();
    }

    // ✅ Ensure parameters is handled properly (array now, not object)
    if (parsed.data.parameters !== undefined) {
        updateData.parameters = parsed.data.parameters;
    }

    const test = await LabCatalog.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    }).lean();

    if (!test) return apiError("Lab test not found", 404);

    // Determine what changed for audit description
    const changedFields = Object.keys(parsed.data);
    let auditDesc = `Updated lab test ${test.testCode} - ${test.testName}`;
    if (changedFields.includes("isActive")) {
        auditDesc = `${parsed.data.isActive ? "Activated" : "Deactivated"} lab test ${test.testCode} - ${test.testName}`;
    }

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "labcatalog",
        description: auditDesc,
        resourceId: id,
        resourceType: "LabCatalog",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(test, "Lab test updated successfully", 200);
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "labcatalog", "delete")) {
        return apiError("Forbidden", 403);
    }

    await connectDB();
    const { id } = await params;

    const test = await LabCatalog.findById(id);
    if (!test) return apiError("Lab test not found", 404);

    // Check if test is used in any existing lab orders
    const { LabTest } = await import("@/models/operations.model");
    const inUse = await LabTest.findOne({
        "tests.catalogId": id,
        status: { $nin: ["completed", "delivered", "cancelled"] },
    });

    if (inUse) {
        return apiError("Cannot delete — test is referenced in active lab orders. Deactivate it instead.", 409);
    }

    // Hard delete
    await LabCatalog.findByIdAndDelete(id);

    await auditLog({
        userId: session.user.id,
        action: "delete",
        module: "labcatalog",
        description: `Deleted lab test ${test.testCode} - ${test.testName}`,
        resourceId: id,
        resourceType: "LabCatalog",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(null, "Lab test deleted permanently", 200);
}