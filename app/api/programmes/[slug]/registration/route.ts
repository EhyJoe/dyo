import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";
import { sendProgrammeRegistrationEmail } from "@/lib/transactional-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGISTRATION_FIELDS = {
  id: 1, programme_id: 1, user_id: 1, full_name: 1, payment_status: 1,
  amount_naira: 1, answers: 1, attending_card_url: 1, pass_card_unlocked: 1,
  created_at: 1,
};

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to view your registration." }, { status: 401 });
  try {
    const { slug } = await context.params;
    const db = await getDatabase();
    const programme = await db.collection("programmes").findOne({ slug, is_published: true }, { projection: { id: 1 } });
    if (!programme) return NextResponse.json({ registration: null }, { status: 200 });
    const registration = await db.collection("programme_registrations").findOne(
      { programme_id: programme.id, user_id: userId }, { projection: REGISTRATION_FIELDS },
    );
    return NextResponse.json({ registration });
  } catch (error) {
    console.error("Programme registration lookup failed", error);
    return NextResponse.json({ error: "We couldn't load your registration." }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to register." }, { status: 401 });
  try {
    const { slug } = await context.params;
    const body = await request.json().catch(() => ({}));
    const db = await getDatabase();
    const [programme, profile] = await Promise.all([
      db.collection("programmes").findOne({ slug, is_published: true }),
      db.collection("profiles").findOne({ id: userId }),
    ]);
    if (!programme || !profile) return NextResponse.json({ error: "This programme is unavailable." }, { status: 404 });
    if (!profile.photo_url) return NextResponse.json({ error: "Upload a profile photo before registering for this programme." }, { status: 400 });
    if (programme.registration_closes_at && new Date(programme.registration_closes_at) < new Date()) {
      return NextResponse.json({ error: "Registration for this programme is closed." }, { status: 409 });
    }

    const existing = await db.collection("programme_registrations").findOne(
      { programme_id: programme.id, user_id: userId }, { projection: REGISTRATION_FIELDS },
    );
    if (existing) return NextResponse.json({ error: "You're already registered for this one.", registration: existing }, { status: 409 });

    const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? body.answers as Record<string, unknown> : {};
    const missing = (Array.isArray(programme.extra_fields) ? programme.extra_fields : [])
      .filter((field: { key?: string; label?: string; required?: boolean }) => field.required && !String(answers[field.key ?? ""] ?? "").trim())
      .map((field: { label?: string }) => field.label ?? "a required field");
    if (missing.length) return NextResponse.json({ error: `Complete: ${missing.join(", ")}.` }, { status: 400 });

    if (Number(programme.capacity) > 0) {
      const count = await db.collection("programme_registrations").countDocuments({ programme_id: programme.id });
      if (count >= Number(programme.capacity)) return NextResponse.json({ error: "This programme is full." }, { status: 409 });
    }

    const fee = Math.max(0, Number(programme.fee_naira) || 0);
    const registration = {
      id: randomUUID(), programme_id: programme.id, user_id: userId,
      full_name: profile.full_name ?? "", gender: profile.gender ?? null,
      phone: profile.phone ?? null, email: profile.email ?? null,
      archdeaconry: profile.archdeaconry ?? null, church: profile.church ?? null,
      photo_url: profile.photo_url ?? null, answers, amount_naira: fee,
      payment_status: fee > 0 ? "pending" : "not_required",
      pass_card_unlocked: false, created_at: new Date().toISOString(),
    };
    await db.collection("programme_registrations").insertOne(registration);
    if (profile.email) {
      try {
        await sendProgrammeRegistrationEmail(String(profile.email), String(profile.full_name ?? ""), String(programme.title ?? ""));
      } catch (error) {
        // A mail delivery issue must not undo a successfully stored registration.
        console.error("Programme registration confirmation email could not be sent", error);
      }
    }
    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error("Programme registration failed", error);
    return NextResponse.json({ error: "We couldn't save your registration. Please try again." }, { status: 503 });
  }
}
