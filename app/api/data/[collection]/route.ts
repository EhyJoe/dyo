import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { data: null, error: "We couldn't complete that request. Please try again." },
    { status: 503 },
  );
}
