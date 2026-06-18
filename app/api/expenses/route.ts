import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Expense } from "@/models/operations.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { createExpenseSchema } from "@/lib/validations";
import { auditLog, hasPermission } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "expenses", "view")) return apiError("Forbidden", 403);
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const category = sp.get("category") || "";
  const from = sp.get("from"); const to = sp.get("to");
  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string,unknown>).$gte = new Date(from);
    if (to) (filter.date as Record<string,unknown>).$lte = new Date(to);
  }
  const [expenses, total, totals] = await Promise.all([
    Expense.find(filter).skip(skip).limit(limit).sort({ date: -1 }).populate("createdBy", "firstName lastName").lean(),
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
  await auditLog({ userId: session.user.id, action: "create", module: "expenses", description: `Added expense: ${expense.title} - ${expense.amount}`, resourceId: expense._id.toString(), ipAddress: getIpFromHeaders(req.headers) });
  return apiSuccess(expense, "Expense recorded", 201);
}
