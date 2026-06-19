import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Expense } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createExpenseSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { NotificationService } from "@/services/notification.service";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "expenses", "view")) return apiError("Forbidden", 403);
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const category = sp.get("category") || "";
  const status = sp.get("status") || "";
  const search = sp.get("search") || "";
  const from = sp.get("from");
  const to = sp.get("to");
  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: "i" };
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, unknown>).$gte = new Date(from);
    if (to) (filter.date as Record<string, unknown>).$lte = new Date(to);
  }
  const [expenses, total, totals] = await Promise.all([
    Expense.find(filter).skip(skip).limit(limit).sort({ date: -1 }).populate("createdBy", "firstName lastName").populate("approvedBy", "firstName lastName").lean(),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);
  return apiSuccess({ expenses, totalAmount: totals[0]?.total || 0 }, "Expenses fetched", 200, buildPagination(total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "expenses", "create")) return apiError("Forbidden", 403);
  const body = await req.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  await connectDB();
  const expense = await Expense.create({ ...parsed.data, date: new Date(parsed.data.date), createdBy: session.user.id });
  await auditLog({ userId: session.user.id, action: "create", module: "expenses", description: `Added expense: ${expense.title} - PKR ${expense.amount}`, resourceId: expense._id.toString(), ipAddress: getIpFromHeaders(req.headers) });

  // Notify admins about new expense pending approval
  const { User } = await import("@/models/user.model");
  const approvers = await User.find({
    $or: [
      { isSuperAdmin: true },
      { permissions: { $in: ["expenses:update"] } }
    ]
  }).select("_id").lean();

  const userIds = approvers.map(u => u._id.toString());
  if (userIds.length > 0) {
    await NotificationService.createBulk(userIds, {
      type: "pending_payment",
      title: "Expense Pending Approval",
      message: `New expense: ${expense.title} - ${formatCurrency(expense.amount)} requires approval`,
      priority: "medium",
      actionUrl: `/expenses/${expense._id}`,
      metadata: { expenseId: expense._id.toString() },
    });
  }

  return apiSuccess(expense, "Expense recorded", 201);
}