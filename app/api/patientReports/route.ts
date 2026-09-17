// app/api/patientReports/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Report, LabTest } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders, getMissingLabTestResults } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { z } from "zod";

const createReportSchema = z.object({
    labTestId: z.string().min(1),
    labTechnician: z.object({
        name: z.string().min(1, "Name is required"),
        signature: z.string().min(1, "Signature is required"),
    }),
    additionalNotes: z.string().optional(),
});

// GET — list reports with optional labTest filter
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "view")) return apiError("Forbidden", 403);

    await connectDB();
    const sp = req.nextUrl.searchParams;
    const { page, limit, skip } = getPaginationParams(sp);
    const labTestId = sp.get("labTestId") || sp.get("labTest") || "";

    const filter: Record<string, unknown> = {};
    if (labTestId) filter.labTest = labTestId;

    const [reports, total] = await Promise.all([
        Report.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 })
            .populate("labTest", "labTestId status")
            .populate("createdBy", "firstName lastName")
            .lean(),
        Report.countDocuments(filter),
    ]);

    return apiSuccess(reports, "Reports fetched", 200, buildPagination(total, page, limit));
}

// POST — create report
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);
    if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "create")) return apiError("Forbidden", 403);

    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    await connectDB();

    const labTest = await LabTest.findById(parsed.data.labTestId)
        .populate("patient", "firstName lastName patientId age gender bloodGroup")
        .lean();

    if (!labTest) return apiError("Lab test not found", 404);
    if (!["completed", "delivered"].includes(labTest.status)) {
        return apiError("Report can only be generated for completed or delivered orders", 400);
    }

    const missingResults = getMissingLabTestResults(labTest.tests, labTest.results);

    if (missingResults.length > 0) {
        return apiError(`Missing results for: ${missingResults.map(t => t.testName).join(", ")}`, 400);
    }

    const patient = labTest.patient as unknown as {
        firstName: string; lastName: string; patientId: string;
        age?: number; gender?: string; bloodGroup?: string;
    };
    const age = patient.age != null ? `${patient.age} years` : "-";

    const report = await Report.create({
        labTest: labTest._id,
        patient: {
            name: `${patient.firstName} ${patient.lastName}`,
            patientId: patient.patientId,
            age,
            gender: patient.gender || "",
            bloodGroup: patient.bloodGroup || "",
        },
        tests: labTest.tests,
        results: labTest.results,
        labTechnician: parsed.data.labTechnician,
        additionalNotes: parsed.data.additionalNotes,
        createdBy: session.user.id,
    });

    await auditLog({
        userId: session.user.id,
        action: "create",
        module: "lab",
        description: `Generated patient report ${report.reportId}`,
        resourceId: report._id.toString(),
        resourceType: "Report",
        ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(report, "Report generated successfully", 201);
}