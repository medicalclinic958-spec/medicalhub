import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Patient } from "@/models/clinical.model";
import { Appointment } from "@/models/clinical.model";
import { Doctor } from "@/models/clinical.model";
import { Invoice } from "@/models/operations.model";
import { LabTest } from "@/models/operations.model";
import { AuditLog } from "@/models/user.model";
import { User } from "@/models/user.model";
import { apiSuccess, apiError, startOfDay, endOfDay, startOfMonth, endOfMonth } from "@/lib/utils";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  await connectDB();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const isSuperAdmin = session.user.isSuperAdmin;
  const perms = session.user.permissions || [];

  // Doctor scoping
  let doctorFilter = {};
  if (!isSuperAdmin && perms.includes("appointments:view")) {
    const { Doctor: DoctorModel } = await import("@/models/clinical.model");
    const doctor = await DoctorModel.findOne({ user: session.user.id }).lean();
    if (doctor) doctorFilter = { doctor: doctor._id };
  }

  const [
    totalPatients,
    todayAppointments,
    totalDoctors,
    pendingBills,
    labPending,
    recentActivities,
    appointmentsByStatus,
    monthlyRevenue,
    totalStaff,
  ] = await Promise.all([
    perms.includes("patients:view") || isSuperAdmin
      ? Patient.countDocuments({ status: "active" })
      : Promise.resolve(null),

    perms.includes("appointments:view") || isSuperAdmin
      ? Appointment.countDocuments({
        ...doctorFilter,
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ["cancelled", "no_show"] },
      })
      : Promise.resolve(null),

    perms.includes("doctors:view") || isSuperAdmin
      ? Doctor.countDocuments({ isAvailable: true })
      : Promise.resolve(null),

    perms.includes("billing:view") || isSuperAdmin
      ? Invoice.countDocuments({ status: { $in: ["pending", "partial", "overdue"] } })
      : Promise.resolve(null),

    perms.includes("lab:view") || isSuperAdmin
      ? LabTest.countDocuments({ status: { $in: ["pending", "sample_collected", "processing"] } })
      : Promise.resolve(null),

    perms.includes("audit_logs:view") || isSuperAdmin
      ? AuditLog.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "firstName lastName")
        .lean()
      : Promise.resolve([]),

    perms.includes("appointments:view") || isSuperAdmin
      ? Appointment.aggregate([
        { $match: doctorFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      : Promise.resolve([]),

    perms.includes("billing:view") || isSuperAdmin
      ? Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: monthEnd },
            status: { $in: ["paid", "partial"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ])
      : Promise.resolve([]),

    perms.includes("staff:view") || isSuperAdmin
      ? User.countDocuments({ status: "active" })
      : Promise.resolve(null),
  ]);

  // Build appointment status map
  const statusMap = (appointmentsByStatus as { _id: string; count: number }[]).reduce(
    (acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    },
    {} as Record<string, number>
  );

  // Revenue chart — last 7 days
  const revenueChart = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);

    const dayRevenue =
      perms.includes("billing:view") || isSuperAdmin
        ? await Invoice.aggregate([
          {
            $match: {
              createdAt: { $gte: dayStart, $lte: dayEnd },
              status: { $in: ["paid", "partial"] },
            },
          },
          { $group: { _id: null, total: { $sum: "$paidAmount" } } },
        ])
        : [];

    revenueChart.push({
      date: d.toISOString().split("T")[0],
      revenue: dayRevenue[0]?.total || 0,
      expenses: 0, // Can be populated from Expense model
    });
  }

  return apiSuccess({
    totalPatients,
    todayAppointments,
    totalDoctors,
    pendingBills,
    labPending,
    totalStaff,
    monthlyRevenue: (monthlyRevenue as { total?: number }[])[0]?.total || 0,
    appointmentsByStatus: statusMap,
    recentActivities: recentActivities as Record<string, unknown>[],
    revenueChart,
  });
}
