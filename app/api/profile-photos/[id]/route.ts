import { GridFSBucket, ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  try {
    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: "profile_photos" });
    const fileId = new ObjectId(id);
    const file = await db.collection("profile_photos.files").findOne({ _id: fileId });
    const storedType = file?.metadata && typeof file.metadata === "object" ? file.metadata.contentType : null;
    const contentType = typeof storedType === "string" && ALLOWED_TYPES.has(storedType)
      ? storedType
      : null;
    if (!file || !contentType) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

    const stream = bucket.openDownloadStream(fileId);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Profile photo read failed", error);
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
}
