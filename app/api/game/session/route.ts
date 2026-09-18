import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, writeDb, getTodayCampaign } from "@/lib/db";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: "playerId is required" }, { status: 400 });
    }

    const campaign = getTodayCampaign();
    const sessionId = "sess_" + crypto.randomUUID().replace(/-/g, "");

    // PRD Section 14: Pick jackpot index deterministically for this session (6 ~ 12th valid shake)
    const minIndex = DEFAULT_SCORING_CONFIG.jackpotMinIndex;
    const maxIndex = DEFAULT_SCORING_CONFIG.jackpotMaxIndex;
    const jackpotIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;

    const sessionSecret = "popit_session_sign_salt_2026";
    const signedToken = crypto
      .createHmac("sha256", sessionSecret)
      .update(`${sessionId}:${playerId}:${campaign.id}:${jackpotIndex}`)
      .digest("hex");

    const db = readDb();
    db.sessions[sessionId] = {
      id: sessionId,
      playerId,
      campaignId: campaign.id,
      scoringConfigVersion: DEFAULT_SCORING_CONFIG.version,
      jackpotIndex,
      signedToken,
      startedAt: new Date().toISOString(),
      status: "ACTIVE",
    };
    writeDb(db);

    return NextResponse.json({
      sessionId,
      configVersion: DEFAULT_SCORING_CONFIG.version,
      signedToken,
      // Client needs to know when to trigger visual jackpot matching the server index
      jackpotIndex,
      durationSec: DEFAULT_SCORING_CONFIG.maxDurationSec,
    });
  } catch (err) {
    console.error("Failed to create session", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

