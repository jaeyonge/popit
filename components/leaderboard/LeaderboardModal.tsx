"use client";

import { useEffect, useState } from "react";
import { X, Trophy, UserCheck, Edit3 } from "lucide-react";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  myNickname: string;
  onOpenNicknameModal: () => void;
}

interface RankedEntry {
  rank: number;
  playerId: string;
  nickname: string;
  bestScore: number;
  achievedAt: string;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  playerId,
  myNickname,
  onOpenNicknameModal,
}: LeaderboardModalProps) {
  const [top100, setTop100] = useState<RankedEntry[]>([]);
  const [myRank, setMyRank] = useState<RankedEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaderboard/today?playerId=${playerId}`);
      const data = await res.json();
      setTop100(data.top100 || []);
      setMyRank(data.myRank || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, playerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[88vh] w-full max-w-md flex-col rounded-3xl bg-[#141622] border border-white/10 shadow-2xl text-white overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-400" size={22} />
            <div>
              <h2 className="text-base font-black tracking-wide">TODAY&apos;S TOP 100</h2>
              <p className="text-[11px] text-gray-400">매일 00:00(KST) 초기화</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top 100 List (PRD Section 28, 30: Ties handling) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              불러오는 중...
            </div>
          ) : top100.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              오늘 첫 주인공이 되어보세요!
            </div>
          ) : (
            top100.map((item, idx) => {
              const isMe = item.playerId === playerId;
              const isTop3 = item.rank <= 3;

              return (
                <div
                  key={`${item.playerId}-${idx}`}
                  className={`flex items-center justify-between rounded-2xl p-3.5 border transition ${
                    isMe
                      ? "bg-purple-900/30 border-purple-500/50 shadow-md shadow-purple-900/20"
                      : "bg-white/5 border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                        item.rank === 1
                          ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/30"
                          : item.rank === 2
                          ? "bg-gray-200 text-black"
                          : item.rank === 3
                          ? "bg-amber-600 text-white"
                          : "bg-white/10 text-gray-300"
                      }`}
                    >
                      {item.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <span className={isMe ? "text-purple-300" : "text-white"}>
                          {item.nickname}
                        </span>
                        {isMe && (
                          <span className="rounded bg-purple-500/30 px-1 py-0.5 text-[10px] text-purple-300">
                            나
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-base font-black font-mono">
                    <span className="text-yellow-400">{item.bestScore}</span>
                    <span className="text-xs text-gray-400 font-sans">개</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky My Rank Bar (PRD Section 29) */}
        <div className="border-t border-white/10 bg-[#0c0d14] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-600/30 px-3 py-1.5 text-center border border-purple-500/30">
                <span className="text-[10px] font-bold text-gray-400 block">MY RANK</span>
                <span className="text-sm font-black text-yellow-300">
                  {myRank ? `#${myRank.rank}` : "-"}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{myNickname || "닉네임 없음"}</span>
                  <button
                    onClick={onOpenNicknameModal}
                    className="text-gray-400 hover:text-white transition"
                    title="닉네임 변경"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
                <span className="text-xs text-gray-400">
                  내 최고 기록: <strong className="text-white">{myRank ? myRank.bestScore : 0}개</strong>
                </span>
              </div>
            </div>

            <button
              onClick={onOpenNicknameModal}
              className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              닉네임 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

