import { NextResponse } from "next/server";
import { getDatabase, isMongoConfigured } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { status: "not_configured", database: "mongodb" },
      { status: 503 },
    );
  }

  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ok", database: "mongodb" });
  } catch (error) {
    console.error("MongoDB health check failed", error);
    return NextResponse.json({ status: "unavailable", database: "mongodb" }, { status: 503 });
  }
}
