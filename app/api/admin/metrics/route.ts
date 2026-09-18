import { NextResponse } from "next/server";
import { readDb, getSeoulToday } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDb();
  const today = getSeoulToday();

  // Calculate sponsor reporting metrics (PRD Section 46)
  const allResults = db.results || [];
  const verifiedResults = allResults.filter((r) => r.verified);
  const suspiciousResults = allResults.filter((r) => !r.verified);

  const uniquePlayers = new Set(allResults.map((r) => r.playerId)).size;
  const totalPlays = allResults.length;
  const averagePlaysPerPlayer = uniquePlayers > 0 ? (totalPlays / uniquePlayers).toFixed(1) : "0.0";
  const completionRate = totalPlays > 0 ? ((verifiedResults.length / totalPlays) * 100).toFixed(1) + "%" : "100%";

  const totalDrops = verifiedResults.reduce((acc, curr) => acc + curr.score, 0);
  const totalPerfectShakes = verifiedResults.reduce((acc, curr) => acc + curr.perfectCount, 0);

  const ctaClicks = Object.values(db.ctaClicks || {}).reduce((a, b) => a + b, 0);
  const ctaCtr = totalPlays > 0 ? ((ctaClicks / totalPlays) * 100).toFixed(2) + "%" : "0.00%";

  return NextResponse.json({
    metrics: {
      uniquePlayers,
      totalPlays,
      averagePlaysPerPlayer,
      completionRate,
      totalDrops: (db.globalDrops[today] || 0) + totalDrops,
      totalPerfectShakes,
      ctaClicks,
      ctaCtr,
    },
    suspiciousRuns: suspiciousResults.slice(-20).reverse(),
    campaignCount: db.campaigns.length,
    todayParticipants: (db.leaderboards[today] || []).length,
  });
}

