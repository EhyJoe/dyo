import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenHash(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is not configured.");
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const input = await request.json().catch(() => ({}));
    const token = String(input.reset_token ?? "");
    const password = String(input.password ?? "");
    const confirmPassword = String(input.confirm_password ?? "");
    if (token.length < 40) return NextResponse.json({ error: "Request a new password reset code first." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Your new password must be at least 8 characters." }, { status: 400 });
    if (password !== confirmPassword) return NextResponse.json({ error: "The passwords don't match." }, { status: 400 });

    const db = await getDatabase();
    const resets = db.collection("password_resets");
    const record = await resets.findOne({ reset_token_hash: tokenHash(token) });
    if (!record || !record.account_exists || !record.token_expires_at
        || new Date(record.token_expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This password reset has expired. Request a new code." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);
    const userUpdate = await db.collection("users").updateOne(
      { email: record.email },
      { $set: { password_hash: passwordHash, updated_at: new Date().toISOString() } },
    );
    if (!userUpdate.matchedCount) {
      await resets.deleteOne({ _id: record._id });
      return NextResponse.json({ error: "We couldn't find that account. Request a new reset code." }, { status: 400 });
    }
    await resets.deleteOne({ _id: record._id, reset_token_hash: tokenHash(token) });
    return NextResponse.json({ message: "Your password has been changed. You can sign in now." });
  } catch (error) {
    console.error("Password reset completion failed", error);
    return NextResponse.json({ error: "We couldn't update your password right now. Please try again." }, { status: 503 });
  }
}
