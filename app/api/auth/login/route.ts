import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 8;

// Temporary local-only admin account. Remove this once a real admin account
// has been provisioned in MongoDB. Never enable this path in production.
const DEV_ADMIN_EMAIL = "admin@localhost.test";
const DEV_ADMIN_PASSWORD = "admin123";
const DEV_ADMIN_ID = "temporary-local-admin";

function isTemporaryAdmin(email: string, password: string) {
  return process.env.NODE_ENV !== "production" &&
    email === DEV_ADMIN_EMAIL && password === DEV_ADMIN_PASSWORD;
}

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

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    if (isTemporaryAdmin(email, password)) {
      const response = NextResponse.json({
        user: { id: DEV_ADMIN_ID, email: DEV_ADMIN_EMAIL },
        profile: temporaryAdminProfile(),
      });
      await createSession(DEV_ADMIN_ID, response);
      return response;
    }
    const db = await getDatabase();
    const user = await db.collection("users").findOne({ email });
    if (!user || typeof user.password_hash !== "string" || !(await compare(password, user.password_hash))) {
      return NextResponse.json({ error: "That email and password don't match an account." }, { status: 401 });
    }
    const userId = String(user._id);
    const profile = await db.collection("profiles").findOne({ id: userId }, { projection: { _id: 0 } });
    if (!profile) {
      return NextResponse.json({ error: "We couldn't find your account profile. Please contact the youth office." }, { status: 403 });
    }
    const response = NextResponse.json({ user: { id: userId, email }, profile });
    await createSession(userId, response);
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "We couldn't reach the account service. Check your connection and try again." }, { status: 503 });
  }
}
