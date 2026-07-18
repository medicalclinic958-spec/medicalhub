import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Notification } from "@/models/user.model";
import { apiSuccess, apiError, getPaginationParams, buildPagination, getIpFromHeaders } from "@/lib/utils";
import { auditLog } from "@/lib/auth/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const unreadOnly = sp.get("unread") === "true";
  const filter: Record<string, unknown> = { user: session.user.id };
  if (unreadOnly) filter.isRead = false;
  const [notifications, total] = await Promise.all([
    Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
    Notification.countDocuments(filter),
  ]);
  return apiSuccess(notifications, "Notifications fetched", 200, buildPagination(total, page, limit));
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  await connectDB();
  const body = await req.json();
  if (body.markAllRead) {
    await Notification.updateMany({ user: session.user.id, isRead: false }, { isRead: true });
    await auditLog({
      userId: session.user.id,
      action: "update",
      module: "system",
      description: "Marked all notifications as read",
      ipAddress: getIpFromHeaders(req.headers),
    });
    return apiSuccess(null, "All notifications marked as read");
  }
  if (body.id) {
    await Notification.findOneAndUpdate({ _id: body.id, user: session.user.id }, { isRead: true });
    await auditLog({
      userId: session.user.id,
      action: "update",
      module: "system",
      description: `Marked notification as read: ${body.id}`,
      resourceId: body.id,
      resourceType: "Notification",
      ipAddress: getIpFromHeaders(req.headers),
    });
    return apiSuccess(null, "Notification marked as read");
  }
  return apiError("Invalid request", 400);
}
