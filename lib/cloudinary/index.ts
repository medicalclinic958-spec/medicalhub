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
 * Upload a file (base64 or URL) to Cloudinary
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
 * Delete a file from Cloudinary by public ID
 */
export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
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
