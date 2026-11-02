import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { sendPasswordResetCode } from "@/lib/password-reset-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;

function codeHash(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is not configured.");
  return createHash("sha256").update(`${email}:${code}:${secret}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const input = await request.json().catch(() => ({}));
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({ error: "Password reset email delivery is not configured yet." }, { status: 503 });
    }

    const db = await getDatabase();
    const resets = db.collection("password_resets");
    await resets.createIndex({ email: 1 }, { unique: true, name: "unique_password_reset_email" });
    await resets.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, name: "password_reset_expiry" });

    const now = new Date();
    const existing = await resets.findOne({ email });
    const lastSentAt = existing?.last_sent_at ? new Date(existing.last_sent_at).getTime() : 0;
    if (lastSentAt && now.getTime() - lastSentAt < RESEND_WAIT_MS) {
      return NextResponse.json({
        message: "If an account matches that email, a reset code has been sent.",
        resend_after_seconds: Math.ceil((RESEND_WAIT_MS - (now.getTime() - lastSentAt)) / 1000),
      });
    }

    const user = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(now.getTime() + CODE_LIFETIME_MS);
    await resets.updateOne(
      { email },
      { $set: {
        email,
        account_exists: Boolean(user),
        code_hash: codeHash(email, code),
        attempts: 0,
        last_sent_at: now,
        expires_at: expiresAt,
      }, $unset: { reset_token_hash: "", token_expires_at: "" } },
      { upsert: true },
    );

    if (user) {
      try {
        await sendPasswordResetCode(email, code);
      } catch (error) {
        await resets.updateOne({ email }, { $set: { last_sent_at: new Date(0) } });
        throw error;
      }
    }
    return NextResponse.json({
      message: "If an account matches that email, a reset code has been sent.",
      resend_after_seconds: Math.ceil(RESEND_WAIT_MS / 1000),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_RESET_EMAIL_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Password reset email delivery is not configured yet." }, { status: 503 });
    }
    console.error("Password reset request failed", error);
    return NextResponse.json({ error: "We couldn't send a reset code right now. Please try again." }, { status: 503 });
  }
}
