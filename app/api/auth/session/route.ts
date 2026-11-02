import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 8;

const DEV_ADMIN_ID = "temporary-local-admin";
const DEV_ADMIN_EMAIL = "admin@localhost.test";

function temporaryAdminProfile() {
  return {
    id: DEV_ADMIN_ID,
    email: DEV_ADMIN_EMAIL,
    full_name: "Temporary Local Admin",
    gender: null,
    date_of_birth: null,
    archdeaconry: null,
    church: null,
    occupation: null,
    educational_qualification: null,
    phone: null,
    address: null,
    photo_url: null,
    role: "super_admin",
    managed_archdeaconry: null,
    admin_sections: [],
  };
}

export async function GET() {
  try {
    const id = await getSessionUserId();
    if (!id) return NextResponse.json({ user: null, profile: null });
    if (process.env.NODE_ENV !== "production" && id === DEV_ADMIN_ID) {
      return NextResponse.json({
        user: { id: DEV_ADMIN_ID, email: DEV_ADMIN_EMAIL },
        profile: temporaryAdminProfile(),
      });
    }
    const db = await getDatabase();
    const profile = await db.collection("profiles").findOne({ id }, { projection: { _id: 0 } });
    if (!profile) return NextResponse.json({ user: null, profile: null });
    return NextResponse.json({ user: { id, email: profile.email }, profile });
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json({ user: null, profile: null, error: "We couldn't check your sign-in right now. Please try again." }, { status: 503 });
  }
}
