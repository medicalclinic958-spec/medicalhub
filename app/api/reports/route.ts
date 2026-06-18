import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Patient } from "@/models/clinical.model";
import { Appointment } from "@/models/clinical.model";
import { Invoice } from "@/models/operations.model";
import { LabTest } from "@/models/operations.model";
import { Expense } from "@/models/operations.model";
import { apiSuccess, apiError, hasPermission as checkPerm } from "@/lib/utils";
import { hasPermission } from "@/lib/auth/audit";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function hasPermission2(a: string[], b: boolean, c: string, d: string) { return checkPerm(a,b,c,d); }

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "reports", "view")) return apiError("Forbidden", 403);

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") || "summary";
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date();

  if (type === "revenue") {
    const data = await Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: ["paid", "partial"] } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$paidAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return apiSuccess(data);
  }

  if (type === "patients") {
    const data = await Patient.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return apiSuccess(data);
  }

  if (type === "appointments") {
    const data = await Appointment.aggregate([
      { $match: { scheduledDate: { $gte: from, $lte: to } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return apiSuccess(data);
  }

  // Summary report
  const [totalPatients, totalAppointments, totalRevenue, totalExpenses, labTests] = await Promise.all([
    Patient.countDocuments({ status: "active" }),
    Appointment.countDocuments({ scheduledDate: { $gte: from, $lte: to } }),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: ["paid", "partial"] } } },
      { $group: { _id: null, total: { $sum: "$paidAmount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LabTest.countDocuments({ createdAt: { $gte: from, $lte: to } }),
  ]);

  return apiSuccess({
    period: { from, to },
    totalPatients,
    totalAppointments,
    labTests,
    revenue: totalRevenue[0]?.total || 0,
    expenses: totalExpenses[0]?.total || 0,
    profit: (totalRevenue[0]?.total || 0) - (totalExpenses[0]?.total || 0),
  });
}
