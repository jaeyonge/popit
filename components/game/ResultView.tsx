"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { DailyCampaign } from "@/lib/db";
import { RotateCcw, Trophy, ExternalLink, Sparkles, Award } from "lucide-react";

interface ResultViewProps {
  campaign: DailyCampaign;
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
  onRetry: () => void;
  onOpenLeaderboard: () => void;
}

export default function ResultView({
  campaign,
  score,
  myBestScore,
  myRank,
  verified,
  stats,
  onRetry,
  onOpenLeaderboard,
}: ResultViewProps) {
  const isNewBest = score > 0 && score >= myBestScore;
  const diffToBest = Math.max(0, myBestScore - score);

  useEffect(() => {
    // Fire festive celebratory confetti on result screen
    try {
      confetti({
        particleCount: isNewBest ? 80 : 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7928CA", "#FF0080", "#FFDF00", "#38BDF8"],
      });
    } catch (e) {
      // ignore
    }
  }, [isNewBest]);

  const handleCtaClick = async () => {
    try {
      fetch("/api/today/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-between p-6 text-white select-none">
      <div className="w-full max-w-sm pt-4 text-center">
        {/* New Best Badge (PRD Section 24) */}
        {isNewBest ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-1 text-xs font-black tracking-wider text-black uppercase shadow-lg shadow-yellow-500/20 animate-bounce-short">
            <Sparkles size={14} />
            NEW BEST!
          </div>
        ) : (
          <div className="text-xs font-bold tracking-widest text-purple-300 uppercase">
            GAME OVER
          </div>
        )}

        {/* Big Score (PRD Section 24) */}
        <div className="mt-4">
          <div className="text-8xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(121,40,202,0.4)]">
            {score}
          </div>
          <div className="mt-1 text-sm font-extrabold tracking-widest text-purple-300 uppercase">
            {campaign.dropItemName} POPPED!
          </div>
        </div>

        {/* Stats Grid: Rank & Best (PRD Section 24, 25) */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              TODAY RANK
            </span>
            <div className="mt-1 flex items-center gap-1 text-2xl font-black text-yellow-300">
              <Award size={20} className="text-yellow-400" />
              <span>#{myRank > 0 ? myRank.toLocaleString() : "-"}</span>
            </div>
          </div>

          <div className="flex flex-col items-center rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              MY BEST
            </span>
            <div className="mt-1 text-2xl font-black text-white">
              {myBestScore}
            </div>
          </div>
        </div>

        {/* Detailed Shake Performance Stats */}
        <div className="mt-3 flex items-center justify-around rounded-xl bg-black/20 p-3 text-xs text-gray-300 border border-white/5">
          <div>
            <span className="text-gray-400">PERFECT</span>
            <div className="font-bold text-yellow-400">{stats.perfectCount}</div>
          </div>
          <div className="h-6 w-[1px] bg-white/10" />
          <div>
            <span className="text-gray-400">GOOD</span>
            <div className="font-bold text-cyan-400">{stats.goodCount}</div>
          </div>
          <div className="h-6 w-[1px] bg-white/10" />
          <div>
            <span className="text-gray-400">FEVER</span>
            <div className="font-bold text-orange-400">{stats.feverCount}</div>
          </div>
          <div className="h-6 w-[1px] bg-white/10" />
          <div>
            <span className="text-gray-400">JACKPOT</span>
            <div className="font-bold text-yellow-300">+{stats.jackpotCount * 5}</div>
          </div>
        </div>

        {/* Retry Motivation (PRD Section 25) */}
        {!isNewBest && diffToBest > 0 && (
          <p className="mt-4 text-xs font-semibold text-purple-200">
            {diffToBest}개만 더 꺼내면 최고 기록 달성!
          </p>
        )}
      </div>

      {/* Action Buttons & Sponsor CTA (PRD Section 25, 39) */}
      <div className="w-full max-w-sm flex flex-col gap-3 pb-6">
        {/* Main Retry CTA (PRD Section 25, 39: Primary action) */}
        <button
          onClick={onRetry}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 py-4 text-base font-black tracking-wide text-white shadow-lg shadow-purple-900/40 transition active:scale-95"
        >
          <RotateCcw size={20} />
          다시 POP!
        </button>

        {/* View Leaderboard Button */}
        <button
          onClick={onOpenLeaderboard}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
        >
          <Trophy size={18} className="text-yellow-400" />
          오늘의 리더보드 확인
        </button>

        {/* Sponsor Secondary CTA (PRD Section 39: Result Screen placement) */}
        {campaign.ctaUrl && (
          <a
            href={campaign.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCtaClick}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/40 py-2.5 text-xs font-medium text-gray-300 hover:text-white transition"
          >
            <span>{campaign.ctaLabel || "오늘의 주인공 알아보기"}</span>
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

