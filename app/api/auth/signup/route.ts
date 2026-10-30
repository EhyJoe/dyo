import { Readable } from "node:stream";
import { hash } from "bcryptjs";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function validImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (type === "image/webp") return String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  if (type === "image/avif") return String.fromCharCode(...bytes.subarray(4, 12)).includes("ftyp") && /avi[fs]/.test(String.fromCharCode(...bytes.subarray(8, 16)));
  return false;
}

async function savePhoto(db: Awaited<ReturnType<typeof getDatabase>>, file: File) {
  if (!PHOTO_TYPES.has(file.type) || file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    throw new Error("PHOTO_INVALID");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImageSignature(file.type, bytes.subarray(0, 16))) throw new Error("PHOTO_INVALID");

  const bucket = new GridFSBucket(db, { bucketName: "profile_photos" });
  const id = new ObjectId();
  const upload = bucket.openUploadStreamWithId(id, "profile-photo", {
    metadata: { purpose: "profile-photo", contentType: file.type },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.from(bytes).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return `/api/profile-photos/${id.toHexString()}`;
}

export async function POST(request: Request) {
  let uploadedPhotoUrl: string | null = null;
  let createdUserId: string | null = null;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let input: Record<string, unknown>;
    let photoFile: File | null = null;
    if (contentType.includes("multipart/form-data")) {
      const data = await request.formData();
      const fields = data.get("fields");
      if (typeof fields !== "string") return NextResponse.json({ error: "Signup details are missing." }, { status: 400 });
      try {
        const parsed = JSON.parse(fields);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return NextResponse.json({ error: "Signup details are invalid." }, { status: 400 });
        }
        input = parsed;
      } catch {
        return NextResponse.json({ error: "Signup details are invalid." }, { status: 400 });
      }
      const photo = data.get("photo");
      if (photo instanceof File && photo.size > 0) photoFile = photo;
    } else {
      input = await request.json();
    }
    const fullName = String(input.full_name ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return NextResponse.json({ error: "Enter a valid name, email and password (8 characters minimum)." }, { status: 400 });
    }

    const db = await getDatabase();
    const users = db.collection("users");
    await users.createIndex({ email: 1 }, { unique: true, name: "unique_user_email" });
    if (await users.findOne({ email }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: "That email already has an account. Sign in instead." }, { status: 409 });
    }

    const profileId = new ObjectId();
    createdUserId = profileId.toHexString();
    const now = new Date().toISOString();
    const passwordHash = await hash(password, 12);
    await users.insertOne({ _id: profileId, email, password_hash: passwordHash, created_at: now, updated_at: now });
    try {
      if (photoFile) uploadedPhotoUrl = await savePhoto(db, photoFile);
      await db.collection("profiles").insertOne({
        _id: profileId,
        id: profileId.toHexString(),
        email,
        full_name: fullName,
        gender: input.gender || null,
        date_of_birth: input.date_of_birth || null,
        archdeaconry: input.archdeaconry || null,
        church: String(input.church ?? "").trim() || null,
        occupation: String(input.occupation ?? "").trim() || null,
        educational_qualification: String(input.educational_qualification ?? "").trim() || null,
        address: String(input.address ?? "").trim() || null,
        photo_url: uploadedPhotoUrl,
        role: "member",
        managed_archdeaconry: null,
        admin_sections: [],
        created_at: now,
        updated_at: now,
      });
    } catch (error) {
      await users.deleteOne({ _id: profileId });
      if (uploadedPhotoUrl) {
        const photoId = uploadedPhotoUrl.split("/").pop();
        if (photoId && ObjectId.isValid(photoId)) {
          await new GridFSBucket(db, { bucketName: "profile_photos" }).delete(new ObjectId(photoId)).catch(() => undefined);
        }
      }
      throw error;
    }

    return NextResponse.json({ user: { id: profileId.toHexString(), email } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PHOTO_INVALID") {
      return NextResponse.json({ error: "Choose a valid JPG, PNG, WebP or AVIF image up to 5 MB." }, { status: 400 });
    }
    console.error("Signup failed", error);
    const message = "We couldn't create your account right now. Please try again later.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
