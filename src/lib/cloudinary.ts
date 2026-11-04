import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  // Don't throw at import time in case of build/preview, but log for visibility
  console.warn("Cloudinary env vars are missing (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export { cloudinary };

export async function uploadImageToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    publicId?: string;
    overwrite?: boolean;
    resourceType?: "image" | "auto" | "video" | "raw";
    transformation?: Record<string, unknown>[];
    tags?: string[];
  } = {},
): Promise<{ secure_url: string; public_id: string; url: string; width?: number; height?: number; format?: string }> {
  const { folder, publicId, overwrite = true, resourceType = "image", transformation, tags } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite,
        resource_type: resourceType,
        transformation,
        tags,
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve(result as any);
      },
    );
    uploadStream.end(buffer);
  });
}
