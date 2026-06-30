import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type UploadFolder =
  | "patients/photos"
  | "patients/documents"
  | "patients/scans"
  | "lab/reports"
  | "expenses/receipts"
  | "clinic/logos"
  | "prescriptions";

export interface UploadResult {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
}

/**
 * Upload a single file (base64 or URL) to Cloudinary
 */
export async function uploadFile(
  file: string, // base64 data URI or URL
  folder: UploadFolder,
  options?: {
    filename?: string;
    maxSizeMB?: number;
  }
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(file, {
    folder: `clinichms/${folder}`,
    resource_type: "auto",
    use_filename: !!options?.filename,
    public_id: options?.filename,
    overwrite: false,
    transformation:
      folder === "patients/photos"
        ? [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }]
        : folder === "expenses/receipts"
          ? [{ quality: "auto", fetch_format: "auto" }]
          : undefined,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
  };
}

/**
 * Upload multiple files to Cloudinary
 */
export async function uploadMultipleFiles(
  files: File[],
  folder: UploadFolder,
  options?: {
    maxSizeMB?: number;
  }
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    // Validate file size (default 5MB)
    const maxSize = (options?.maxSizeMB || 5) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File ${file.name} exceeds ${maxSize / 1024 / 1024}MB limit`);
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = Buffer.from(bytes).toString("base64");
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload with filename
    const result = await uploadFile(dataURI, folder, {
      filename: file.name.split(".")[0],
    });

    results.push(result);
  }

  return results;
}

/**
 * Delete a single file from Cloudinary by public ID
 */
export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Delete multiple files from Cloudinary by public IDs
 */
export async function deleteMultipleFiles(publicIds: string[]): Promise<void> {
  for (const publicId of publicIds) {
    try {
      await deleteFile(publicId);
    } catch (error) {
      console.error(`Failed to delete ${publicId}:`, error);
      // Continue with other files
    }
  }
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicIdFromUrl(url: string): string {
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  const publicId = filename.split(".")[0];
  // Get the folder path (everything after /upload/)
  const uploadIndex = parts.indexOf("upload");
  if (uploadIndex === -1) return publicId;
  const folderPath = parts.slice(uploadIndex + 1, parts.length - 1).join("/");
  return `${folderPath}/${publicId}`;
}

/**
 * Generate a signed URL for temporary access
 */
export function getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
  return cloudinary.url(publicId, {
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    secure: true,
  });
}

export default cloudinary;