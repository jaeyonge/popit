import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, writeDb, getSeoulToday } from "@/lib/db";
import { verifyAndScoreSession, DEFAULT_SCORING_CONFIG, ReversalEvent } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();
    const { reversals, signedToken, playerId, visibilityHidden } = body as {
      reversals: ReversalEvent[];
      signedToken: string;
      playerId: string;
      visibilityHidden?: boolean;
    };

    const db = readDb();
    const session = db.sessions[sessionId];

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json({ error: "Session already submitted or invalidated" }, { status: 400 });
    }

    // Verify token
    const sessionSecret = "popit_session_sign_salt_2026";
    const expectedToken = crypto
      .createHmac("sha256", sessionSecret)
      .update(`${sessionId}:${session.playerId}:${session.campaignId}:${session.jackpotIndex}`)
      .digest("hex");

    if (signedToken !== expectedToken || session.playerId !== playerId) {
      session.status = "INVALIDATED";
      writeDb(db);
      return NextResponse.json({ error: "Token signature mismatch" }, { status: 403 });
    }

    // PRD Section 35: Visibility Handling (hidden tab disqualification)
    if (visibilityHidden) {
      session.status = "INVALIDATED";
      writeDb(db);
      return NextResponse.json({
        verified: false,
        score: 0,
        reason: "화면을 벗어나 기록이 저장되지 않았어요.",
      });
    }

    // Re-verify & deterministic score recalculation
    const verification = verifyAndScoreSession(reversals || [], session.jackpotIndex, DEFAULT_SCORING_CONFIG);

    session.status = "COMPLETED";
    session.submittedAt = new Date().toISOString();

    const today = getSeoulToday();
    const resultRecord = {
      sessionId,
      playerId,
      campaignId: session.campaignId,
      score: verification.score,
      validCount: verification.validCount,
      goodCount: verification.goodCount,
      perfectCount: verification.perfectCount,
      feverCount: verification.feverCount,
      jackpotCount: verification.jackpotCount,
      verified: verification.verified,
      unverifiedReason: verification.reason,
      submittedAt: new Date().toISOString(),
    };
    db.results.push(resultRecord);

    // If verified, update today total drops & leaderboard
    if (verification.verified && verification.score > 0) {
      db.globalDrops[today] = (db.globalDrops[today] || 0) + verification.score;

      if (!db.leaderboards[today]) {
        db.leaderboards[today] = [];
      }

      const player = db.players[playerId];
      const nickname = player?.nickname || "익명의 쉐이커";

      const existingEntryIndex = db.leaderboards[today].findIndex((e) => e.playerId === playerId);
      if (existingEntryIndex >= 0) {
        if (verification.score > db.leaderboards[today][existingEntryIndex].bestScore) {
          db.leaderboards[today][existingEntryIndex].bestScore = verification.score;
          db.leaderboards[today][existingEntryIndex].achievedAt = new Date().toISOString();
        }
      } else {
        db.leaderboards[today].push({
          campaignId: session.campaignId,
          playerId,
          nickname,
          bestScore: verification.score,
          achievedAt: new Date().toISOString(),
        });
      }

      // Sort leaderboard descending by score, then ascending by achievedAt
      db.leaderboards[today].sort((a, b) => {
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime();
      });
    }

    writeDb(db);

    // Compute player's rank today (PRD Section 30: Ties handling)
    const todayEntries = db.leaderboards[today] || [];
    let myRank = -1;
    let myBestScore = verification.score;

    const myEntry = todayEntries.find((e) => e.playerId === playerId);
    if (myEntry) {
      myBestScore = myEntry.bestScore;
      // Dense / Standard competition rank calculation (동일 점수는 동일 순위)
      let currentRank = 1;
      for (let i = 0; i < todayEntries.length; i++) {
        if (i > 0 && todayEntries[i].bestScore < todayEntries[i - 1].bestScore) {
          currentRank = i + 1;
        }
        if (todayEntries[i].playerId === playerId) {
          myRank = currentRank;
          break;
        }
      }
    }

    return NextResponse.json({
      verified: verification.verified,
      score: verification.score,
      myBestScore,
      myRank,
      totalDropsToday: db.globalDrops[today],
      stats: {
        validCount: verification.validCount,
        goodCount: verification.goodCount,
        perfectCount: verification.perfectCount,
        feverCount: verification.feverCount,
        jackpotCount: verification.jackpotCount,
      },
      reason: verification.reason,
    });
  } catch (err) {
    console.error("Failed to submit score", err);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}

