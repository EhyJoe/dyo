import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const PROFILE_FIELDS = [
  "full_name",
  "gender",
  "date_of_birth",
  "archdeaconry",
  "church",
  "occupation",
  "educational_qualification",
  "phone",
  "address",
] as const;

function optionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in again to save your profile." }, { status: 401 });

    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "Check your profile details and try again." }, { status: 400 });
    }

    const changes: Record<string, string | null> = {};
    for (const field of PROFILE_FIELDS) {
      if (field in input) changes[field] = optionalText(input[field], field === "address" ? 500 : 160);
    }
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: "There are no profile changes to save." }, { status: 400 });
    }
    if (changes.full_name !== undefined && (!changes.full_name || changes.full_name.length < 2)) {
      return NextResponse.json({ error: "Enter your full name to continue." }, { status: 400 });
    }
    if (changes.gender && !["Male", "Female"].includes(changes.gender)) {
      return NextResponse.json({ error: "Choose a valid gender option." }, { status: 400 });
    }
    if (changes.date_of_birth && Number.isNaN(Date.parse(changes.date_of_birth))) {
      return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
    }

    changes.updated_at = new Date().toISOString();
    const db = await getDatabase();
    const result = await db.collection("profiles").updateOne({ id: userId }, { $set: changes });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "We couldn't find your profile. Please sign in again." }, { status: 404 });
    }

    const profile = await db.collection("profiles").findOne({ id: userId }, { projection: { _id: 0 } });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update API failed", error);
    return NextResponse.json({ error: "We couldn't save your profile right now. Please try again." }, { status: 500 });
  }
}
