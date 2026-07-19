import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import { developerReportSchema } from "@/lib/validations";
import { sendDeveloperReport } from "@/services/developer-report.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  if (
    !hasPermission(
      session.user.permissions,
      session.user.isSuperAdmin,
      "developer_reports",
      "create"
    )
  ) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = developerReportSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  try {
    await sendDeveloperReport({
      title: parsed.data.title,
      message: parsed.data.message,
      severity: parsed.data.severity,
      source: parsed.data.source,
      meta: {
        reportedBy: session.user.fullName || session.user.email,
        reportedByEmail: session.user.email,
        reportedByRole: session.user.role,
        reportedById: session.user.id,
        page: parsed.data.page,
        ipAddress: getIpFromHeaders(req.headers),
      },
    });

    await auditLog({
      userId: session.user.id,
      action: "create",
      module: "developer_reports",
      description: `Sent developer report: ${parsed.data.title}`,
      ipAddress: getIpFromHeaders(req.headers),
      status: "success",
    });

    return apiSuccess(null, "Report sent to developers successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send report";

    await auditLog({
      userId: session.user.id,
      action: "create",
      module: "developer_reports",
      description: `Failed to send developer report: ${parsed.data.title}`,
      ipAddress: getIpFromHeaders(req.headers),
      status: "failure",
    });

    return apiError(message, 502);
  }
}
