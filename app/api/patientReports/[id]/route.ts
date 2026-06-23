// app/api/reports/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Report } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);

    await connectDB();
    const { id } = await params;

    const report = await Report.findById(id)
        .populate("labTest", "labTestId status")
        .populate("createdBy", "firstName lastName")
        .lean();

    if (!report) return apiError("Report not found", 404);
    return apiSuccess(report);
}

export async function PUT(req: NextRequest, { params }: Params) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "update")) return apiError("Forbidden", 403);

    const body = await req.json();
    await connectDB();
    const { id } = await params;

    const update: Record<string, unknown> = {};
    if (body.status) update.status = body.status;
    if (body.additionalNotes !== undefined) update.additionalNotes = body.additionalNotes;
    if (body.reportUrl) update.reportUrl = body.reportUrl;

    const report = await Report.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!report) return apiError("Report not found", 404);

    await auditLog({
        userId: session.user.id,
        action: "update",
        module: "reports",
        description: `Updated report ${report.reportId}`,
        resourceId: id,
        resourceType: "Report",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(report, "Report updated");
}