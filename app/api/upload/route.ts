import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { uploadFile, UploadFolder } from "@/lib/cloudinary";
import { apiSuccess, apiError } from "@/lib/utils";

const ALLOWED_FOLDERS: UploadFolder[] = [
  "patients/photos",
  "patients/documents",
  "patients/scans",
  "lab/reports",
  "expenses/receipts",
  "clinic/logos",
  "prescriptions",
];

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
    if (file.size > MAX_SIZE_BYTES) return apiError("File exceeds 10MB limit", 400);

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await uploadFile(dataUri, folder, {
      filename: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
    });

    return apiSuccess(result, "File uploaded successfully");
  } catch (err) {
    console.error("Upload error:", err);
    return apiError("Upload failed. Check Cloudinary configuration.", 500);
  }
}
