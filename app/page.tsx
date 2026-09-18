"use client";

import { useEffect, useState } from "react";
import ShakeGame from "@/components/game/ShakeGame";
import ResultView from "@/components/game/ResultView";
import LeaderboardModal from "@/components/leaderboard/LeaderboardModal";
import NicknameModal from "@/components/leaderboard/NicknameModal";
import RulesModal from "@/components/game/RulesModal";
import { DailyCampaign } from "@/lib/db";

export default function Home() {
  const [campaign, setCampaign] = useState<DailyCampaign | null>(null);
  const [todayTotal, setTodayTotal] = useState<number>(1248920);
  const [playerId, setPlayerId] = useState<string>("");
  const [myNickname, setMyNickname] = useState<string>("");
  const [view, setView] = useState<"GAME" | "RESULT">("GAME");

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isNicknameOpen, setIsNicknameOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

  // Result state
  const [lastGameResult, setLastGameResult] = useState<{
    score: number;
    myBestScore: number;
    myRank: number;
    verified: boolean;
    stats: {
      validCount: number;
      goodCount: number;
      perfectCount: number;
      feverCount: number;
      jackpotCount: number;
    };
    reason?: string;
  } | null>(null);

  // Initialize player ID & fetch today's campaign
  useEffect(() => {
    // 1. Anonymous Player ID from localStorage (PRD Section 27)
    let pid = localStorage.getItem("popit_player_id");
    if (!pid) {
      pid = "player_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("popit_player_id", pid);
    }
    setPlayerId(pid);

    const savedNick = localStorage.getItem("popit_nickname");
    if (savedNick) {
      setMyNickname(savedNick);
    }

    // 2. Fetch today's campaign
    fetch("/api/today")
      .then((res) => res.json())
      .then((data) => {
        if (data.campaign) setCampaign(data.campaign);
        if (data.todayTotal) setTodayTotal(data.todayTotal);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleGameComplete = (result: {
    score: number;
    myBestScore: number;
    myRank: number;
    verified: boolean;
    stats: {
      validCount: number;
      goodCount: number;
      perfectCount: number;
      feverCount: number;
      jackpotCount: number;
    };
    reason?: string;
  }) => {
    setLastGameResult(result);
    setView("RESULT");

    // Prompt nickname registration on first recorded score if not yet set
    const savedNick = localStorage.getItem("popit_nickname");
    if (!savedNick && result.score > 0) {
      setTimeout(() => {
        setIsNicknameOpen(true);
      }, 1000);
    }
  };

  const handleNicknameSaved = (nickname: string) => {
    setMyNickname(nickname);
    localStorage.setItem("popit_nickname", nickname);
  };

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0e15] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <span className="text-xs font-bold text-gray-400">오늘의 사물을 준비하고 있어요...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#141029] via-[#090a13] to-[#06070d] flex justify-center">
      <div className="w-full max-w-md relative flex flex-col">
        {view === "GAME" ? (
          <ShakeGame
            campaign={campaign}
            todayTotal={todayTotal}
            playerId={playerId}
            onGameComplete={handleGameComplete}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenRules={() => setIsRulesOpen(true)}
          />
        ) : (
          lastGameResult && (
            <ResultView
              campaign={campaign}
              score={lastGameResult.score}
              myBestScore={lastGameResult.myBestScore}
              myRank={lastGameResult.myRank}
              verified={lastGameResult.verified}
              stats={lastGameResult.stats}
              onRetry={() => setView("GAME")}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            />
          )
        )}

        {/* Modals */}
        <LeaderboardModal
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
          playerId={playerId}
          myNickname={myNickname}
          onOpenNicknameModal={() => {
            setIsLeaderboardOpen(false);
            setIsNicknameOpen(true);
          }}
        />

        <NicknameModal
          isOpen={isNicknameOpen}
          onClose={() => setIsNicknameOpen(false)}
          playerId={playerId}
          currentNickname={myNickname}
          onSuccess={handleNicknameSaved}
        />

        <RulesModal
          isOpen={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
        />
      </div>
    </main>
  );
}

