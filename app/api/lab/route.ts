// app/api/reports/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Report, LabTest, LabCatalog } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { z } from "zod";
import { createLabTestSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "view")) return apiError("Forbidden", 403);

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const status = sp.get("status") || "";
  const patientId = sp.get("patient") || "";
  const search = sp.get("search") || "";

  const filter: Record<string, unknown> = {};

  // Non-admin users only see tests they requested
  if (!session.user.isSuperAdmin) {
    filter.requestedBy = session.user.id;
  }

  if (status) filter.status = status;
  if (patientId) filter.patient = patientId;

  // Search by patient name or ID
  if (search) {
    const { Patient } = await import("@/models/clinical.model");
    const patientIds = await Patient.find({
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
      ],
    }).distinct("_id");
    filter.patient = { $in: patientIds };
  }

  const [tests, total] = await Promise.all([
    LabTest.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("patient", "firstName lastName patientId")
      .populate("requestedBy", "firstName lastName")
      .populate("sampleCollectedBy", "firstName lastName")
      .populate("processedBy", "firstName lastName")
      .populate("approvedBy", "firstName lastName")
      .lean(),
    LabTest.countDocuments(filter),
  ]);

  return apiSuccess(tests, "Lab tests fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "lab", "create")) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createLabTestSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await connectDB();

  // Fetch tests from catalog to auto-populate details
  const catalogIds = parsed.data.tests.map(t => t.catalogId);
  const catalogTests = await LabCatalog.find({
    _id: { $in: catalogIds },
    isActive: true,
  }).lean();

  if (catalogTests.length !== catalogIds.length) {
    return apiError("One or more tests not found or inactive", 404);
  }

  // Build tests array from catalog data
  const tests = catalogTests.map(ct => ({
    catalogId: ct._id,
    testName: ct.testName,
    testCode: ct.testCode,
    category: ct.category,
    cost: ct.cost,
  }));

  const totalCost = tests.reduce((sum, t) => sum + t.cost, 0);

  const test = await LabTest.create({
    patient: parsed.data.patient,
    appointment: parsed.data.appointment,
    tests,
    priority: parsed.data.priority,
    notes: parsed.data.notes,
    totalCost,
    requestedBy: session.user.id,
  });

  const populated = await LabTest.findById(test._id)
    .populate("patient", "firstName lastName patientId")
    .populate("requestedBy", "firstName lastName")
    .populate("invoiceId", "invoiceNumber")
    .lean();

  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "lab",
    description: `Created lab test order ${test.labTestId}`,
    resourceId: test._id.toString(),
    resourceType: "LabTest",
    ipAddress: getIpFromHeaders(req.headers),
  });

  return apiSuccess(populated, "Lab test order created", 201);
}