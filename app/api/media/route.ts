import { Readable } from "node:stream";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/auth-session";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTION_ACCESS: Record<string, string[]> = {
  programmes: ["programmes"],
  store: ["store"],
  pages: ["pages"],
  leadership: ["leadership"],
  announcements: ["announcements"],
  carousel: ["carousel"],
  gallery: ["gallery"],
  blog: ["blog"],
  tournaments: ["tournaments"],
  archdeaconries: ["archdeaconries"],
};
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024;

function validImage(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (type === "image/webp") return String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  if (type === "image/avif") return String.fromCharCode(...bytes.subarray(4, 12)).includes("ftyp");
  return false;
}

function getCloudinaryFolder(section: string) {
  const s = section.toLowerCase();
  if (s === "store") return "dyo/store";
  if (s === "pages") return "dyo/pages";
  if (s === "leadership") return "dyo/leadership";
  if (s === "announcements") return "dyo/announcements";
  if (s === "carousel") return "dyo/carousel";
  if (s === "gallery") return "dyo/gallery";
  if (s === "blog") return "dyo/blog";
  if (s === "tournaments") return "dyo/tournaments";
  if (s === "archdeaconries") return "dyo/archdeaconries";
  if (s === "programmes") return "dyo/programmes";
  return "dyo/uploads";
}

async function canUpload(section: string) {
  const userId = await getSessionUserId();
  if (!userId) return false;
  const db = await getDatabase();
  const profile = await db.collection("profiles").findOne({ id: userId }, { projection: { role: 1, admin_sections: 1 } });
  if (!profile) return false;
  return (
    profile?.role === "super_admin" ||
    (profile?.role === "archdeaconry_admin" && section === "gallery") ||
    (profile?.role === "archdeaconry_admin" && section === "archdeaconries") ||
    (["admin", "archdeaconry_admin"].includes(profile?.role) &&
      SECTION_ACCESS[section]?.some((item) => profile.admin_sections?.includes(item)) === true)
  );
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    const section = String(data.get("section") ?? "");
    if (!(file instanceof File) || !ACCEPTED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Choose a valid image up to 8 MB." }, { status: 400 });
    }
    if (!(await canUpload(section))) {
      return NextResponse.json({ error: "You cannot upload media for this section." }, { status: 403 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validImage(file.type, bytes.subarray(0, 16))) {
      return NextResponse.json({ error: "The uploaded file is not a valid image." }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      try {
        const result = await uploadImageToCloudinary(bytes, {
          folder: getCloudinaryFolder(section),
          resourceType: "image",
        });
        if (result?.secure_url) {
          return NextResponse.json({ url: result.secure_url });
        }
      } catch (error) {
        console.error("Cloudinary upload failed, falling back to GridFS", error);
      }
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: "site_media" });
    const id = new ObjectId();
    const upload = bucket.openUploadStreamWithId(id, file.name.slice(0, 180), {
      metadata: { contentType: file.type, purpose: "public-site-media" },
    });
    await new Promise<void>((resolve, reject) => {
      Readable.from(bytes).pipe(upload).on("finish", resolve).on("error", reject);
    });
    return NextResponse.json({ url: `/api/media?id=${id.toHexString()}` });
  } catch (error) {
    console.error("Media upload failed", error);
    return NextResponse.json({ error: "We couldn't upload that file. Please try again." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !ObjectId.isValid(id)) return new NextResponse("Not found", { status: 404 });
  try {
    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: "site_media" });
    const file = await db.collection("site_media.files").findOne({ _id: new ObjectId(id) });
    if (!file || file.metadata?.purpose !== "public-site-media") return new NextResponse("Not found", { status: 404 });
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      bucket.openDownloadStream(new ObjectId(id)).on("data", (chunk: Buffer) => chunks.push(chunk)).on("end", resolve).on("error", reject);
    });
    return new NextResponse(Buffer.concat(chunks), {
      headers: {
        "Content-Type": String(file.metadata.contentType ?? "application/octet-stream"),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Media delivery failed", error);
    return new NextResponse("Media unavailable", { status: 503 });
  }
}
