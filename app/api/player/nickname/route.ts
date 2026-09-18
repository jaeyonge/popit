import { NextResponse } from "next/server";
import { readDb, writeDb, getSeoulToday } from "@/lib/db";

export const dynamic = "force-dynamic";

const PROFANITY_LIST = [
  "admin", "운영자", "관리자", "시발", "병신", "개새", "fuck", "shit", "bitch", "nigger", "sex", "섹스", "자지", "보지"
];

export async function PUT(req: Request) {
  try {
    const { playerId, nickname } = await req.json();

    if (!playerId) {
      return NextResponse.json({ error: "playerId is required" }, { status: 400 });
    }

    const trimmed = (nickname || "").trim();

    // PRD Section 26: 2~12 characters, profanity filter, duplicates allowed
    if (trimmed.length < 2 || trimmed.length > 12) {
      return NextResponse.json(
        { error: "닉네임은 2자 이상 12자 이하로 입력해주세요." },
        { status: 400 }
      );
    }

    // Check forbidden words
    const lower = trimmed.toLowerCase();
    const hasForbidden = PROFANITY_LIST.some((word) => lower.includes(word));
    if (hasForbidden) {
      return NextResponse.json(
        { error: "사용할 수 없는 단어가 포함되어 있습니다." },
        { status: 400 }
      );
    }

    const db = readDb();
    if (!db.players[playerId]) {
      db.players[playerId] = {
        id: playerId,
        nickname: trimmed,
        createdAt: new Date().toISOString(),
      };
    } else {
      db.players[playerId].nickname = trimmed;
    }

    // Update player's nickname on today's leaderboard if exists
    const today = getSeoulToday();
    if (db.leaderboards[today]) {
      const entry = db.leaderboards[today].find((e) => e.playerId === playerId);
      if (entry) {
        entry.nickname = trimmed;
      }
    }

    writeDb(db);

    return NextResponse.json({
      success: true,
      playerId,
      nickname: trimmed,
    });
  } catch (err) {
    console.error("Failed to update nickname", err);
    return NextResponse.json({ error: "Failed to update nickname" }, { status: 500 });
  }
}

