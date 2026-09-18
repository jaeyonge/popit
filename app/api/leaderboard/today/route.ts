import { NextResponse } from "next/server";
import { readDb, getSeoulToday } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId") || "";

    const db = readDb();
    const today = getSeoulToday();
    const entries = db.leaderboards[today] || [];

    // Calculate ranks with standard tie handling (PRD Section 30)
    // 1위 - 128, 2위 - 126, 2위 - 126, 4위 - 125
    interface RankedItem {
      rank: number;
      playerId: string;
      nickname: string;
      bestScore: number;
      achievedAt: string;
    }

    const rankedList: RankedItem[] = [];
    let currentRank = 1;

    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].bestScore < entries[i - 1].bestScore) {
        currentRank = i + 1;
      }
      rankedList.push({
        rank: currentRank,
        playerId: entries[i].playerId,
        nickname: entries[i].nickname,
        bestScore: entries[i].bestScore,
        achievedAt: entries[i].achievedAt,
      });
    }

    // Top 100
    const top100 = rankedList.slice(0, 100);

    // My rank (even if outside top 100)
    const myRankItem = rankedList.find((r) => r.playerId === playerId) || null;

    return NextResponse.json({
      date: today,
      top100,
      myRank: myRankItem,
      totalParticipants: rankedList.length,
    });
  } catch (err) {
    console.error("Failed to fetch leaderboard", err);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

