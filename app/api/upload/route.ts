import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { uploadFile, UploadFolder } from "@/lib/cloudinary";
import { apiSuccess, apiError, getIpFromHeaders } from "@/lib/utils";
import { auditLog, hasPermission } from "@/lib/auth/audit";
import type { PermissionAction, PermissionModule } from "@/types";

const ALLOWED_FOLDERS: UploadFolder[] = [
  "patients/photos",
  "patients/documents",
  "patients/scans",
  "lab/reports",
  "expenses/receipts",
  "clinic/logos",
  "prescriptions",
];

const FOLDER_PERMISSIONS: Record<UploadFolder, { module: PermissionModule; actions: PermissionAction[] }> = {
  "patients/photos": { module: "patients", actions: ["create", "update"] },
  "patients/documents": { module: "patients", actions: ["create", "update"] },
  "patients/scans": { module: "patients", actions: ["create", "update"] },
  "lab/reports": { module: "lab", actions: ["create", "update"] },
  "expenses/receipts": { module: "expenses", actions: ["create", "update"] },
  "clinic/logos": { module: "settings", actions: ["update"] },
  prescriptions: { module: "prescriptions", actions: ["create", "update"] },
};

function canUploadToFolder(
  permissions: string[],
  isSuperAdmin: boolean,
  folder: UploadFolder
) {
  const rule = FOLDER_PERMISSIONS[folder];
  return rule.actions.some((action) => hasPermission(permissions, isSuperAdmin, rule.module, action));
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as UploadFolder) || "patients/documents";

    if (!file) return apiError("No file provided", 400);
    if (!ALLOWED_FOLDERS.includes(folder)) return apiError("Invalid upload folder", 400);
    if (!canUploadToFolder(session.user.permissions, session.user.isSuperAdmin, folder)) {
      return apiError("Forbidden", 403);
    }
    if (file.size > MAX_SIZE_BYTES) return apiError("File exceeds 10MB limit", 400);

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const result = await uploadFile(dataUri, folder, { filename });

    const moduleByFolder: Partial<Record<UploadFolder, string>> = {
      "patients/photos": "patients",
      "patients/documents": "patients",
      "patients/scans": "patients",
      "lab/reports": "lab",
      "expenses/receipts": "expenses",
      "clinic/logos": "settings",
      prescriptions: "prescriptions",
    };

    await auditLog({
      userId: session.user.id,
      action: "create",
      module: moduleByFolder[folder] || "system",
      description: `Uploaded file to ${folder}: ${file.name}`,
      resourceId: result.publicId,
      resourceType: "File",
      ipAddress: getIpFromHeaders(req.headers),
    });

    return apiSuccess(result, "File uploaded successfully");
  } catch (err) {
    console.error("Upload error:", err);
    return apiError("Upload failed. Check Cloudinary configuration.", 500);
  }
}
