import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function digest(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is not configured.");
  return createHash("sha256").update(`${value}:${secret}`).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const input = await request.json().catch(() => ({}));
    const email = String(input.email ?? "").trim().toLowerCase();
    const code = String(input.code ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the email and six-digit code." }, { status: 400 });
    }

    const resets = (await getDatabase()).collection("password_resets");
    const record = await resets.findOne({ email });
    if (!record || !record.account_exists || !record.code_hash || !record.expires_at
        || new Date(record.expires_at).getTime() <= Date.now() || Number(record.attempts ?? 0) >= 5) {
      return NextResponse.json({ error: "We couldn't verify that code. Check it or request a new one." }, { status: 400 });
    }

    const submittedHash = digest(`${email}:${code}`);
    const expectedHash = record.code_hash;
    if (!safeEqual(submittedHash, expectedHash)) {
      await resets.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      return NextResponse.json({ error: "We couldn't verify that code. Check it or request a new one." }, { status: 400 });
    }

    const resetToken = randomBytes(32).toString("base64url");
    const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const result = await resets.updateOne(
      { _id: record._id, code_hash: expectedHash, attempts: { $lt: 5 } },
      { $set: { reset_token_hash: digest(resetToken), token_expires_at: tokenExpiresAt, expires_at: tokenExpiresAt },
        $unset: { code_hash: "" } },
    );
    if (!result.modifiedCount) {
      return NextResponse.json({ error: "We couldn't verify that code. Check it or request a new one." }, { status: 400 });
    }
    return NextResponse.json({ reset_token: resetToken });
  } catch (error) {
    console.error("Password reset code verification failed", error);
    return NextResponse.json({ error: "We couldn't verify that code right now. Please try again." }, { status: 503 });
  }
}
