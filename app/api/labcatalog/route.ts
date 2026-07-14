// app/api/labcatalog/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { LabCatalog } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createLabCatalogSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "labcatalog", "view")) {
        return apiError("Forbidden", 403);
    }

    await connectDB();
    const sp = req.nextUrl.searchParams;
    const { page, limit, skip } = getPaginationParams(sp);
    const search = sp.get("search") || "";
    const category = sp.get("category") || "";
    const isActive = sp.get("isActive");

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (isActive !== null && isActive !== "") filter.isActive = isActive === "true";

    if (search) {
        filter.$or = [
            { testName: { $regex: search, $options: "i" } },
            { testCode: { $regex: search, $options: "i" } },
        ];
    }

    const [tests, total] = await Promise.all([
        LabCatalog.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ category: 1, testName: 1 })
            .lean(),
        LabCatalog.countDocuments(filter),
    ]);

    return apiSuccess(tests, "Lab catalog fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "labcatalog", "create")) {
        return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const parsed = createLabCatalogSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    await connectDB();

    // Check for duplicate testCode
    const existing = await LabCatalog.findOne({ testCode: parsed.data.testCode.toUpperCase() });
    if (existing) return apiError("Test code already exists", 409);

    // Check for duplicate parameter names within the same test
    const paramNames = (parsed.data.parameters || []).map(p => p.name.trim().toLowerCase());
    if (new Set(paramNames).size !== paramNames.length) {
        return apiError("Duplicate parameter names are not allowed", 422);
    }

    const test = await LabCatalog.create({
        ...parsed.data,
        testCode: parsed.data.testCode.toUpperCase(),
        parameters: parsed.data.parameters || [], // ✅ array default, was {}
    });

    await auditLog({
        userId: session.user.id,
        action: "create",
        module: "labcatalog",
        description: `Created lab test ${test.testCode} - ${test.testName}`,
        resourceId: test._id.toString(),
        resourceType: "LabCatalog",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(test, "Lab test created successfully", 201);
}