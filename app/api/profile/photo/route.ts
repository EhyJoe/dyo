import { Readable } from "node:stream";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (type === "image/webp") return String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  if (type === "image/avif") return String.fromCharCode(...bytes.subarray(4, 12)).includes("ftyp") && /avi[fs]/.test(String.fromCharCode(...bytes.subarray(8, 16)));
  return false;
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in again to update your photo." }, { status: 401 });

    const form = await request.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File) || !PHOTO_TYPES.has(photo.type) || photo.size === 0 || photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Choose a valid JPG, PNG, WebP or AVIF image under 5 MB." }, { status: 400 });
    }
    const bytes = Buffer.from(await photo.arrayBuffer());
    if (!hasValidSignature(photo.type, bytes.subarray(0, 16))) {
      return NextResponse.json({ error: "That image couldn't be opened. Choose another photo." }, { status: 400 });
    }

    const db = await getDatabase();
    const profiles = db.collection("profiles");
    const existing = await profiles.findOne({ id: userId }, { projection: { _id: 1 } });
    if (!existing) return NextResponse.json({ error: "We couldn't find your profile. Please sign in again." }, { status: 404 });

    const bucket = new GridFSBucket(db, { bucketName: "profile_photos" });
    const photoId = new ObjectId();
    const upload = bucket.openUploadStreamWithId(photoId, "profile-photo", {
      metadata: { purpose: "profile-photo", contentType: photo.type, owner_id: userId },
    });
    await new Promise<void>((resolve, reject) => {
      Readable.from(bytes).pipe(upload).on("finish", resolve).on("error", reject);
    });

    const photoUrl = `/api/profile-photos/${photoId.toHexString()}`;
    await profiles.updateOne({ id: userId }, { $set: { photo_url: photoUrl, updated_at: new Date().toISOString() } });
    return NextResponse.json({ photo_url: photoUrl });
  } catch (error) {
    console.error("Profile photo update API failed", error);
    return NextResponse.json({ error: "We couldn't update your profile photo right now. Please try again." }, { status: 500 });
  }
}
