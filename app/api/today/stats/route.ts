import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { campaignId } = await req.json();
    if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

    const db = readDb();
    db.ctaClicks[campaignId] = (db.ctaClicks[campaignId] || 0) + 1;
    writeDb(db);

    return NextResponse.json({ success: true, count: db.ctaClicks[campaignId] });
  } catch (err) {
    console.error("Failed to track CTA click", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

