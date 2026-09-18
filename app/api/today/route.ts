import { NextResponse } from "next/server";
import { getTodayCampaign, readDb, getSeoulToday } from "@/lib/db";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const campaign = getTodayCampaign();
  const db = readDb();
  const today = getSeoulToday();
  const todayTotal = db.globalDrops[today] || 1248920;

  return NextResponse.json({
    campaign,
    todayTotal,
    scoringConfig: DEFAULT_SCORING_CONFIG,
    serverTime: new Date().toISOString(),
  });
}

