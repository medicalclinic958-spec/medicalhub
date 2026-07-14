// app/api/lab/[id]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { LabCatalog, LabTest } from "@/models/operations.model";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { NotificationService } from "@/services/notification.service";
import { updateLabTestResultsSchema } from "@/lib/validations";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "view")) return apiError("Forbidden", 403);

  await connectDB();
  const { id } = await params;

  const test = await LabTest.findById(id)
    .populate("patient", "firstName lastName patientId age gender dateOfBirth bloodGroup")
    .populate("requestedBy", "firstName lastName")
    .populate("sampleCollectedBy", "firstName lastName")
    .populate("processedBy", "firstName lastName")
    .populate("approvedBy", "firstName lastName")
    .populate("tests.catalogId", "testName testCode category turnaroundTime")
    .populate("invoiceId", "invoiceNumber")
    .lean();

  if (!test) return apiError("Lab test not found", 404);
  return apiSuccess(test);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "update")) return apiError("Forbidden", 403);

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};

  // Tests update — only when pending
  if (body.tests) {
    const current = await LabTest.findById(id);
    if (!current) return apiError("Lab test not found", 404);
    if (current.status !== "pending") return apiError("Can only edit tests when status is pending", 409);

    // Fetch fresh details from catalog
    const catalogIds = body.tests.map((t: { catalogId: string }) => t.catalogId);
    const catalogTests = await LabCatalog?.find({ _id: { $in: catalogIds }, isActive: true }).lean();
    if (catalogTests.length !== catalogIds.length) return apiError("One or more tests not found or inactive", 404);

    const newTests = catalogTests.map(ct => ({
      catalogId: ct._id,
      testName: ct.testName,
      testCode: ct.testCode,
      category: ct.category,
      cost: ct.cost,
    }));
    update.tests = newTests;
    update.totalCost = newTests.reduce((sum, t) => sum + t.cost, 0);
  }

  // ✅ Results — validated + isAbnormal auto-computed from catalog min/max
  if (body.results) {
    const parsedResults = updateLabTestResultsSchema.safeParse({
      results: body.results,
      reportUrl: body.reportUrl,
      notes: body.notes,
    });
    if (!parsedResults.success) return apiError(parsedResults.error.issues[0].message, 422);

    // Fetch catalog parameter definitions for auto abnormal-flagging
    const catalogIds = parsedResults.data.results.map(r => r.catalogId);
    const catalogDocs = await LabCatalog.find({ _id: { $in: catalogIds } }).lean();
    const catalogMap = new Map(catalogDocs.map(c => [c._id.toString(), c]));

    const enrichedResults = parsedResults.data.results.map(r => {
      const catalog = catalogMap.get(r.catalogId);
      const paramDefs = new Map((catalog?.parameters || []).map((p: any) => [p.name, p]));

      const parameterResults = r.parameterResults.map(pr => {
        const def = paramDefs.get(pr.parameterName);
        let isAbnormal = pr.isAbnormal ?? false;

        // Auto-compute only for numeric params with defined min/max, and only if caller didn't explicitly set it
        if (def?.dataType === "number" && (def.minValue !== undefined || def.maxValue !== undefined) && pr.isAbnormal === undefined) {
          const numValue = Number(pr.value);
          if (!Number.isNaN(numValue)) {
            isAbnormal =
              (def.minValue !== undefined && numValue < def.minValue) ||
              (def.maxValue !== undefined && numValue > def.maxValue);
          }
        }

        return {
          ...pr,
          unit: pr.unit ?? def?.unit,
          referenceRange: pr.referenceRange ?? def?.referenceRange,
          isAbnormal,
        };
      });

      return { ...r, parameterResults };
    });

    update.results = enrichedResults;
  }

  // Status
  if (body.status) {
    update.status = body.status;
    if (body.status === "sample_collected") {
      update.sampleCollectedAt = new Date();
      update.sampleCollectedBy = session.user.id;
    }
    if (body.status === "processing") update.processedBy = session.user.id;
    if (body.status === "completed") {
      update.completedAt = new Date();
      if (hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "approve")) {
        update.approvedBy = session.user.id;
      }
    }
  }

  if (body.reportUrl !== undefined) update.reportUrl = body.reportUrl;
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.priority) update.priority = body.priority;
  if (body.isPaid !== undefined) update.isPaid = body.isPaid;
  if (body.totalCost !== undefined) update.totalCost = body.totalCost;

  // ✅ Handle invoiceId when marking as paid
  if (body.isPaid === true && body.invoiceId) {
    update.invoiceId = body.invoiceId;
  }

  const test = await LabTest.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate("patient", "firstName lastName patientId")
    .populate("requestedBy", "firstName lastName")
    .populate("invoiceId", "invoiceNumber")
    .lean();

  if (!test) return apiError("Lab test not found", 404);

  // Notify when lab results are completed
  if (body.status === "completed") {
    const populatedTest = await LabTest.findById(id)
      .populate("requestedBy", "_id")
      .populate("patient", "firstName lastName")
      .lean();

    if (populatedTest?.requestedBy?._id) {
      const patientData = populatedTest.patient as any;
      await NotificationService.create({
        userId: populatedTest.requestedBy._id.toString(),
        type: "lab_result_ready",
        title: "Lab Results Ready",
        message: `Lab results for ${patientData?.firstName} ${patientData?.lastName} (${populatedTest.labTestId}) are ready for review`,
        priority: "medium",
        actionUrl: `/lab/${id}`,
        metadata: { labTestId: populatedTest.labTestId },
      });
    }
  }

  await auditLog({
    userId: session.user.id,
    action: "update",
    module: "lab",
    description: `Updated lab test order ${test.labTestId} — ${body.status ? `status: ${body.status}` : body.tests ? "tests changed" : "details updated"}`,
    resourceId: id,
    resourceType: "LabTest",
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess(test, "Lab test updated");
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "delete")) return apiError("Forbidden", 403);

  await connectDB();
  const { id } = await params;

  const test = await LabTest.findById(id)
    .populate("invoiceId", "invoiceNumber")
    .lean();
  if (!test) return apiError("Lab test not found", 404);

  // Only allow deleting if pending or cancelled
  if (!["pending", "cancelled"].includes(test.status)) {
    return apiError(`Cannot delete — order is in ${test.status} status`, 409);
  }

  const testId = test.labTestId;
  await LabTest.findByIdAndDelete(id);

  await auditLog({
    userId: session.user.id,
    action: "delete",
    module: "lab",
    description: `Deleted lab test order ${testId}`,
    resourceId: id,
    resourceType: "LabTest",
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess(null, "Lab test order deleted", 200);
}