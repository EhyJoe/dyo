import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to redeem a pass voucher." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const programmeId = typeof body.programmeId === "string" ? body.programmeId : "";
    if (!code || !programmeId) return NextResponse.json({ error: "Enter a voucher code." }, { status: 400 });

    const db = await getDatabase();
    const [programme, registration] = await Promise.all([
      db.collection("programmes").findOne({ id: programmeId, is_published: true }, { projection: { id: 1, attending_tag_url: 1 } }),
      db.collection("programme_registrations").findOne({ programme_id: programmeId, user_id: userId }, { projection: { id: 1, pass_card_unlocked: 1 } }),
    ]);
    if (!programme || !registration) return NextResponse.json({ error: "Register for this programme before redeeming a pass voucher." }, { status: 403 });
    if (!programme.attending_tag_url) return NextResponse.json({ error: "The programme pass card is not available yet." }, { status: 409 });
    if (registration.pass_card_unlocked) return NextResponse.json({ ok: true, alreadyUnlocked: true });

    const usedAt = new Date().toISOString();
    const voucher = await db.collection("vouchers").findOneAndUpdate(
      { code, programme_id: programmeId, purpose: "programme_pass", used: false },
      { $set: { used: true, used_by: userId, registration_id: registration.id, used_at: usedAt } },
      { returnDocument: "after" },
    );
    const redeemed = voucher && "value" in voucher ? voucher.value : voucher;
    if (!redeemed) return NextResponse.json({ error: "That voucher is invalid, already used, or for another programme." }, { status: 400 });

    const update = await db.collection("programme_registrations").updateOne(
      { id: registration.id, user_id: userId },
      { $set: { pass_card_unlocked: true, pass_card_voucher_id: redeemed.id, pass_card_unlocked_at: usedAt } },
    );
    if (!update.matchedCount) {
      await db.collection("vouchers").updateOne({ id: redeemed.id, used_by: userId }, {
        $set: { used: false }, $unset: { used_by: "", registration_id: "", used_at: "" },
      });
      return NextResponse.json({ error: "We couldn't unlock the pass card. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Programme pass voucher redemption failed", error);
    return NextResponse.json({ error: "We couldn't check that voucher. Please try again." }, { status: 503 });
  }
}
