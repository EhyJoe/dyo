import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 8;

export async function GET() {
  try {
    const id = await getSessionUserId();
    if (!id) return NextResponse.json({ user: null, profile: null });
    const db = await getDatabase();
    const profile = await db.collection("profiles").findOne({ id }, { projection: { _id: 0 } });
    if (!profile) return NextResponse.json({ user: null, profile: null });
    return NextResponse.json({ user: { id, email: profile.email }, profile });
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json({ user: null, profile: null, error: "We couldn't check your sign-in right now. Please try again." }, { status: 503 });
  }
}
