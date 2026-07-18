import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Permission } from "@/models/user.model";
import { apiSuccess, apiError } from "@/lib/utils";
import { auditLog, DEFAULT_PERMISSIONS } from "@/lib/auth/audit";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  await connectDB();

  const permissions = await Permission.find({}).sort({ module: 1, action: 1 }).lean();

  // Group by module for easier frontend consumption
  const grouped = permissions.reduce(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    },
    {} as Record<string, typeof permissions>
  );

  return apiSuccess({ permissions, grouped });
}

// Seed permissions — only for Super Admin, run once
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.isSuperAdmin) return apiError("Forbidden", 403);

  await connectDB();

  const results = await Promise.allSettled(
    DEFAULT_PERMISSIONS.map((p) =>
      Permission.findOneAndUpdate(
        { module: p.module, action: p.action },
        p,
        { upsert: true, new: true }
      )
    )
  );

  const created = results.filter((r) => r.status === "fulfilled").length;

  await auditLog({
    userId: session.user.id,
    action: "create",
    module: "roles",
    description: `Seeded ${created} default permissions`,
    status: "success",
  });

  return apiSuccess({ seeded: created }, `Seeded ${created} permissions`);
}
